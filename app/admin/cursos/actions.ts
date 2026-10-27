'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { isUniqueViolation } from '@/lib/pg-errors'
import { MAX_OPTIONS, MAX_PAPERS, isPeriod, isVariant, type Period } from '@/lib/courses'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function refresh() {
  revalidatePath('/admin/cursos')
}

type ParsedOption = { period: Period; papers: { subjectId: string; variant: string; weight: number }[] }

// Lê as opções do formulário: opt{i}_period e opt{i}_p{j}_subject / _variant / _weight. Blocos sem período e linhas sem disciplina ignoram-se.
function parseOptions(formData: FormData): ParsedOption[] {
  const options: ParsedOption[] = []
  for (let i = 0; i < MAX_OPTIONS; i++) {
    const period = text(formData, `opt${i}_period`)
    const papers: ParsedOption['papers'] = []
    for (let j = 0; j < MAX_PAPERS; j++) {
      const subjectId = text(formData, `opt${i}_p${j}_subject`)
      if (!subjectId) continue
      const variant = text(formData, `opt${i}_p${j}_variant`)
      const weight = Number(text(formData, `opt${i}_p${j}_weight`))
      if (!isVariant(variant)) throw new AppError(`Opção ${i + 1}: variante inválida.`)
      if (!Number.isInteger(weight) || weight < 1 || weight > 100) throw new AppError(`Opção ${i + 1}: o peso de cada prova é um número inteiro entre 1 e 100.`)
      papers.push({ subjectId, variant, weight })
    }
    if (!period && papers.length === 0) continue
    if (!isPeriod(period)) throw new AppError(`Opção ${i + 1}: escolhe o período (laboral ou pós-laboral).`)
    if (papers.length === 0) throw new AppError(`Opção ${i + 1}: junta pelo menos uma prova.`)
    if (new Set(papers.map((p) => `${p.subjectId}|${p.variant}`)).size !== papers.length) throw new AppError(`Opção ${i + 1}: a mesma prova aparece duas vezes.`)
    const total = papers.reduce((sum, p) => sum + p.weight, 0)
    if (total !== 100) throw new AppError(`Opção ${i + 1}: os pesos somam ${total}%; têm de somar 100%.`)
    options.push({ period, papers })
  }
  if (options.length === 0) throw new AppError('Junta pelo menos uma opção de exame.')
  return options
}

export async function saveCourse(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const institutionId = text(formData, 'institution_id')
    const name = text(formData, 'name').replace(/\s+/g, ' ')
    const unit = text(formData, 'unit').replace(/\s+/g, ' ')
    const campus = text(formData, 'campus').replace(/\s+/g, ' ')
    if (!institutionId) throw new AppError('Escolhe a instituição.')
    if (name.length < 2 || name.length > 120) throw new AppError('O nome do curso deve ter entre 2 e 120 caracteres.')
    if (unit.length > 120 || campus.length > 80) throw new AppError('Faculdade/escola ou local demasiado longos.')
    const options = parseOptions(formData)

    const client = await pool.connect()
    let courseId = id
    try {
      await client.query('BEGIN')
      const inst = await client.query('SELECT 1 FROM institutions WHERE id = $1', [institutionId])
      if (!inst.rowCount) throw new AppError('Essa instituição já não existe.')
      const subjectIds = [...new Set(options.flatMap((o) => o.papers.map((p) => p.subjectId)))]
      const subjects = await client.query('SELECT id FROM library_subjects WHERE id = ANY($1::text[])', [subjectIds])
      if (subjects.rowCount !== subjectIds.length) throw new AppError('Uma das disciplinas escolhidas já não existe.')

      if (id) {
        const updated = await client.query(
          'UPDATE courses SET institution_id = $2, name = $3, unit = $4, campus = $5, updated_at = now() WHERE id = $1 RETURNING id',
          [id, institutionId, name, unit || null, campus || null],
        )
        if (!updated.rowCount) throw new AppError('Esse curso já não existe.')
        // Nunca perder opções em silêncio: o formulário só mostra MAX_OPTIONS.
        const current = await client.query('SELECT count(*)::int AS n FROM course_exam_options WHERE course_id = $1', [id])
        if (current.rows[0].n > MAX_OPTIONS) throw new AppError(`Este curso tem ${current.rows[0].n} opções de exame e o formulário só edita ${MAX_OPTIONS}.`)
        await client.query('DELETE FROM course_exam_options WHERE course_id = $1', [id])
      } else {
        courseId = `course-${randomUUID()}`
        await client.query('INSERT INTO courses (id, institution_id, name, unit, campus) VALUES ($1, $2, $3, $4, $5)', [courseId, institutionId, name, unit || null, campus || null])
      }

      for (const [index, option] of options.entries()) {
        const optionId = `opt-${randomUUID()}`
        await client.query('INSERT INTO course_exam_options (id, course_id, period, sort_order) VALUES ($1, $2, $3, $4)', [optionId, courseId, option.period, index])
        for (const paper of option.papers) {
          // A prova (disciplina + variante) é da instituição; cria-se na primeira vez que é usada.
          const found = await client.query(
            `INSERT INTO exam_papers (id, institution_id, subject_id, variant) VALUES ($1, $2, $3, $4)
             ON CONFLICT (institution_id, subject_id, variant) DO UPDATE SET variant = EXCLUDED.variant RETURNING id`,
            [`paper-${randomUUID()}`, institutionId, paper.subjectId, paper.variant],
          )
          await client.query('INSERT INTO course_exam_option_papers (option_id, paper_id, weight) VALUES ($1, $2, $3)', [optionId, found.rows[0].id, paper.weight])
        }
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      if (isUniqueViolation(error)) throw new AppError('Já existe um curso com esse nome nessa instituição.')
      throw error
    } finally {
      client.release()
    }

    await logAdminAction(admin, id ? 'course.update' : 'course.create', 'course', courseId, { name, options: options.length })
    refresh()
    return id ? 'Curso actualizado.' : 'Curso criado.'
  }, 'Não foi possível guardar o curso. Tenta outra vez.')
}

export async function setCourseActive(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const active = text(formData, 'active') === 'true'
    if (!id) throw new AppError('Curso inválido.')
    const updated = await pool.query('UPDATE courses SET active = $2, updated_at = now() WHERE id = $1 RETURNING name', [id, active])
    if (!updated.rowCount) throw new AppError('Esse curso já não existe.')
    await logAdminAction(admin, active ? 'course.activate' : 'course.archive', 'course', id, { name: updated.rows[0].name })
    refresh()
    return active ? 'Curso activado.' : 'Curso arquivado.'
  }, 'Não foi possível alterar o estado do curso. Tenta outra vez.')
}

export async function deleteCourse(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    if (!id) throw new AppError('Curso inválido.')
    const removed = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING name', [id])
    if (!removed.rowCount) throw new AppError('Esse curso já não existe.')
    await logAdminAction(admin, 'course.delete', 'course', id, { name: removed.rows[0].name })
    refresh()
    return 'Curso eliminado.'
  }, 'Não foi possível eliminar o curso. Tenta outra vez.')
}
