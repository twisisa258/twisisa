'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import type { PoolClient } from 'pg'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { notifyAdmin } from '@/lib/admin-notify'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { parseCsv } from '@/lib/csv'
import { classificarTemas } from '@/lib/classificar-temas'
import { COLUNAS_OBRIGATORIAS_SESSAO, analisarLinha, semAcentos, type ContextoImportacao } from '@/lib/importacao-sessao'
import { isUniqueViolation } from '@/lib/pg-errors'
import { optionsProblem, subjectHasScope } from '@/lib/questions'
import { normalizarVariante } from '@/lib/regras'
import { ORDEM_RAZOES, resumoImportacao, type Razao, type TotaisImportacao } from '@/lib/revisao'
import { nextOrder } from '@/lib/reorder'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim()

// Valida o que foi escolhido nos passos (instituição, disciplina, variante, nível): nunca se confia no que vem do navegador.
async function validarSessao(client: Pick<PoolClient, 'query'>, onde: string, subjectId: string, variant: string, nivel: string) {
  if (!['facil', 'media', 'dificil'].includes(nivel)) throw new AppError('Escolhe o nível das questões.')
  let track: string
  let institutionId: string | null = null
  let comVariantes = false
  if (onde === '10' || onde === '12') {
    track = onde
  } else {
    const institution = await client.query('SELECT has_variants FROM institutions WHERE id = $1 AND active = true', [onde])
    if (!institution.rowCount) throw new AppError('A instituição não existe ou está inativa.')
    track = 'admissao'
    institutionId = onde
    comVariantes = institution.rows[0].has_variants === true
  }
  const subject = await client.query('SELECT 1 FROM library_subjects WHERE id = $1 AND core = true AND active = true', [subjectId])
  if (!subject.rowCount) throw new AppError('Só existem as 10 disciplinas gerais.')
  if (!(await subjectHasScope(subjectId, track, institutionId))) throw new AppError('Essa disciplina não existe nesta instituição ou classe.')
  const variantes = await client.query('SELECT name FROM subject_variants WHERE subject_id = $1 AND active = true', [subjectId])
  let variante: string | null = null
  if (variant) {
    if (!comVariantes) throw new AppError('Só a UEM tem variantes.')
    const nome = normalizarVariante(variant)
    if (!nome || !variantes.rows.some((row) => row.name === nome)) throw new AppError('Essa variante não existe nesta disciplina.')
    variante = nome
  }
  return { track, institutionId, comVariantes, subjectTemVariantes: (variantes.rowCount ?? 0) > 0, variante, variantes: variantes.rows.map((row) => row.name as string) }
}

// Cria um tema sem sair da criação de questões. Se já existir um com o mesmo nome, devolve esse.
export async function criarTemaRapido(subjectId: string, nome: string): Promise<{ ok: true; id: string; name: string } | { ok: false; message: string }> {
  try {
    const admin = await requireAdmin()
    const name = String(nome ?? '').replace(/\s+/g, ' ').trim()
    if (name.length < 2 || name.length > 120) throw new AppError('O nome do tema deve ter entre 2 e 120 caracteres.')
    const subject = await pool.query('SELECT 1 FROM library_subjects WHERE id = $1 AND core = true AND active = true', [String(subjectId)])
    if (!subject.rowCount) throw new AppError('Essa disciplina não existe.')
    const existing = await pool.query('SELECT id, name FROM topics WHERE subject_id = $1 AND lower(name) = lower($2) LIMIT 1', [subjectId, name])
    if (existing.rowCount) return { ok: true, id: existing.rows[0].id as string, name: existing.rows[0].name as string }
    const id = `topic-${randomUUID()}`
    try {
      await pool.query('INSERT INTO topics (id, subject_id, name, sort_order) VALUES ($1, $2, $3, $4)', [id, subjectId, name, await nextOrder(pool, 'topics', 'subject_id', subjectId)])
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError('Já existe um tema com esse nome.')
      throw error
    }
    await logAdminAction(admin, 'topic.create', 'topic', id, { name })
    revalidatePath('/admin/temas')
    return { ok: true, id, name }
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[ADMIN QUESTOES] criar tema rápido', error)
    return { ok: false, message: 'Não foi possível criar o tema. Tenta novamente.' }
  }
}

// Importação por sessão: a instituição, a disciplina, a variante e o nível vêm dos passos; o CSV só traz as questões.
// Uma linha impossível de ler (sem enunciado, sem resposta) não entra. Uma linha a que falta ano, tema ou variante entra
// como rascunho e fica na área de Revisão. No fim, o admin recebe um aviso com o resumo.
export async function importarQuestoesSessao(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const file = formData.get('csv')
    if (!(file instanceof File) || file.size === 0) throw new AppError('Escolhe um ficheiro CSV.')
    if (file.size > 2 * 1024 * 1024) throw new AppError('O CSV não pode ultrapassar 2 MB.')

    let linhas: string[][]
    try {
      linhas = parseCsv((await file.text()).replace(/^\uFEFF/, ''))
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : 'CSV inválido.')
    }
    if (linhas.length < 2) throw new AppError('O CSV não contém questões.')
    if (linhas.length > 501) throw new AppError('Importa no máximo 500 questões por ficheiro.')
    const cabecalho = linhas[0].map((coluna) => coluna.trim().toLowerCase())
    const faltam = COLUNAS_OBRIGATORIAS_SESSAO.filter((coluna) => !cabecalho.includes(coluna))
    if (faltam.length) throw new AppError(`Faltam colunas obrigatórias: ${faltam.join(', ')}. Descarrega o modelo.`)

    const sessao = await validarSessao(pool, text(formData, 'onde'), text(formData, 'subjectId'), text(formData, 'variant'), text(formData, 'nivel'))
    const subjectId = text(formData, 'subjectId')
    const nivel = text(formData, 'nivel')

    const temas = new Map<string, string>()
    for (const row of (await pool.query('SELECT id, name FROM topics WHERE subject_id = $1 AND active = true', [subjectId])).rows) temas.set(semAcentos(row.name as string), row.id as string)
    const variantes = new Map<string, string>()
    for (const nome of sessao.variantes) variantes.set(semAcentos(nome), nome)
    const contexto: ContextoImportacao = { temas, variantes, instituicaoTemVariantes: sessao.comVariantes, disciplinaTemVariantes: sessao.subjectTemVariantes, varianteSessao: sessao.variante }

    const rejeitadas: { linha: number; motivo: string }[] = []
    const totais: TotaisImportacao = { lidas: linhas.length - 1, importadas: 0, rejeitadas: 0, emRevisao: 0, porRazao: {}, temaDesconhecido: 0, varianteDesconhecida: 0 }

    const novas: string[] = []
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      for (let i = 1; i < linhas.length; i += 1) {
        const registo: Record<string, string> = {}
        cabecalho.forEach((coluna, indice) => { registo[coluna] = linhas[i][indice] ?? '' })
        if (Object.values(registo).every((valor) => !valor.trim())) { totais.lidas -= 1; continue }
        const analise = analisarLinha(registo, contexto)
        if (!analise.ok) { rejeitadas.push({ linha: i + 1, motivo: analise.motivo }); continue }
        const problema = optionsProblem(analise.opcoes.map((opcao) => ({ ...opcao, isFixed: false })))
        if (problema) { rejeitadas.push({ linha: i + 1, motivo: problema }); continue }

        const id = `question-${randomUUID()}`
        await client.query(
          `INSERT INTO questions (id, statement, explanation, track, institution_id, subject_id, topic_id, variant, difficulty, exam_year, origin_label, origin, answer_source, status, created_by, updated_by, review_note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'admin', 'sugestao', 'rascunho', $12, $12, $13)`,
          [id, analise.enunciado, analise.explicacao, sessao.track, sessao.institutionId, subjectId, analise.topicId, analise.variant, nivel, analise.year, analise.originLabel, admin.id, analise.notas.length ? `Linha ${i + 1}: ${analise.notas.join('; ')}` : null],
        )
        for (let posicao = 0; posicao < analise.opcoes.length; posicao += 1) {
          await client.query('INSERT INTO question_options (id, question_id, position, body, is_correct, is_fixed) VALUES ($1, $2, $3, $4, $5, false)', [`option-${randomUUID()}`, id, posicao, analise.opcoes[posicao].body, analise.opcoes[posicao].isCorrect])
        }
        // As razões vêm da base de dados (inclui «possível duplicada»), por isso contam-se depois de guardar.
        const razoes = (await client.query("UPDATE questions SET review_reasons = COALESCE(question_review_reasons(id), '{}') WHERE id = $1 RETURNING review_reasons", [id])).rows[0].review_reasons as string[]
        totais.importadas += 1
        if (!analise.topicId) novas.push(id)
        if (razoes.length) totais.emRevisao += 1
        for (const razao of razoes) if ((ORDEM_RAZOES as string[]).includes(razao)) totais.porRazao[razao as Razao] = (totais.porRazao[razao as Razao] ?? 0) + 1
        if (analise.temaDesconhecido) totais.temaDesconhecido += 1
        if (analise.varianteDesconhecida) totais.varianteDesconhecida += 1
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    totais.rejeitadas = rejeitadas.length
    // O Jonas dá tema, em segundo plano, às questões que chegaram sem tema.
    if (novas.length) after(() => classificarTemas({ ids: novas, limite: 60 }).catch((error) => console.error('[TEMAS] após importação', error)))

    const resumo = resumoImportacao(totais)
    await logAdminAction(admin, 'question.csv_import', 'question', null, { count: totais.importadas, emRevisao: totais.emRevisao, rejeitadas: totais.rejeitadas }, { notify: false })
    await notifyAdmin(admin.id, {
      kind: 'question.csv_import',
      level: resumo.nivel,
      title: resumo.titulo,
      body: `${resumo.corpo}${rejeitadas.length ? ` Rejeitadas: ${rejeitadas.slice(0, 5).map((item) => `linha ${item.linha} (${item.motivo})`).join('; ')}${rejeitadas.length > 5 ? '…' : ''}.` : ''}`,
      link: totais.emRevisao > 0 ? '/admin/revisao' : '/admin/questoes',
      data: { ...totais, rejeitadasDetalhe: rejeitadas.slice(0, 50) },
    })
    revalidatePath('/admin/questoes')
    revalidatePath('/admin/revisao')
    if (totais.importadas === 0) throw new AppError(`${resumo.corpo}${rejeitadas.length ? ` Exemplo: linha ${rejeitadas[0].linha}: ${rejeitadas[0].motivo}.` : ''}`)
    return `${resumo.titulo}. ${resumo.corpo}`
  }, 'Não foi possível importar o CSV. Confirma o formato e tenta novamente.')
}
