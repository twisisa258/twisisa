#!/usr/bin/env bash
# twisisa-ux-fase3.sh — Twisisa, UX fase 3: Início (/aluno) ligado ao Simulador e preparado para a orientação de curso.
#
#   1. «Continuar» passa a ser um só cartão, por esta ordem: orientação de curso a meio > sessão do Simulador a meio
#      (a mesma lista que o Início do Simulador mostra) > último material aberto.
#   2. «Progresso por disciplina»: acertos por disciplina, dos mesmos dados do Simulador.
#   3. «Erros»: quantas questões há para rever, com o mesmo número do Simulador.
#   4. «Descobre o teu curso» (antes «Teste vocacional»): cartão com botão «Começar».
#      Só aparece se o admin deixar o módulo visível («Em breve» ou «Ativo»); com «Em breve» não tem botão.
#      Já trata os três estados: nunca feito, a meio (fica no «Continuar») e concluído (cursos e %).
#   Estados vazios sem inventar nada: sem dados, cada cartão diz isso mesmo.
#
# NÃO inclui o teste em si (perguntas, cálculo, resultado). A única função a ligar é getOrientacao em lib/orientacao.ts,
# que hoje devolve «nunca feito». Quando o teste existir: (a) implementar getOrientacao, (b) criar a rota de ORIENTACAO_HREF,
# (c) pôr ready: true no módulo em lib/exam-modules.ts.
#
# Requer a fase 2 aplicada. Corre na raiz do projecto:  bash twisisa-ux-fase3.sh
# Seguro: se um ponto de edição não for encontrado, aborta sem escrever nada. Idempotente. Backups em .ux-backup-<data>-fase3/.
set -euo pipefail

if [ ! -f package.json ] || [ ! -d app ] || [ ! -d components ] || [ ! -d lib ]; then
  echo "ERRO: corre este script na raiz do projecto twisisa (onde está o package.json)." >&2
  exit 1
fi
command -v node >/dev/null 2>&1 || { echo "ERRO: node não encontrado." >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/lib" "$TMP/components/aluno"

# ───────────────────────── lib/orientacao.ts ─────────────────────────
cat > "$TMP/lib/orientacao.ts" <<'EOF'
// Orientação de curso («Descobre o teu curso»). O nome que o aluno vê vem do módulo em lib/exam-modules.ts
// (chave interna 'teste-vocacional', que não muda para não mexer nos dados da administração).

export type OrientacaoCurso = { name: string; institution: string | null; percent: number }

export type OrientacaoEstado =
  | { status: 'nunca' }
  | { status: 'em_curso'; answered: number; total: number }
  | { status: 'concluido'; finishedAt: Date; courses: OrientacaoCurso[] }

export const ORIENTACAO_MODULE_KEY = 'teste-vocacional' as const
// Rotas a criar quando o teste existir. Só são usadas com o módulo «Ativo», e o servidor só deixa ativá-lo com ready: true.
export const ORIENTACAO_HREF = '/aluno/descobrir-curso'
export const ORIENTACAO_RESULT_HREF = '/aluno/descobrir-curso/resultado'

/**
 * PONTO ÚNICO DE LIGAÇÃO. Hoje o teste não existe, por isso ninguém o fez: devolve sempre «nunca».
 * Quando houver dados, é só aqui que muda: devolver 'em_curso' (respondidas e total) ou 'concluido' (cursos já ordenados,
 * com a percentagem calculada no servidor). O Início e o cartão «Continuar» já mostram cada estado.
 */
export async function getOrientacao(userId: string): Promise<OrientacaoEstado> {
  void userId
  return { status: 'nunca' }
}
EOF

# ───────────────────────── lib/aluno-inicio.ts ─────────────────────────
cat > "$TMP/lib/aluno-inicio.ts" <<'EOF'
import { pool } from '@/lib/db'
import { getVisibleModules } from '@/lib/exam-modules'
import { getOrientacao, ORIENTACAO_HREF, ORIENTACAO_MODULE_KEY, ORIENTACAO_RESULT_HREF, type OrientacaoEstado } from '@/lib/orientacao'
import { getSimulatorHub, type StudentScope } from '@/lib/simulator'
import { MODE_META, SLUG_BY_MODE, type AttemptMode } from '@/lib/simulator-shared'

// Dados do Início (/aluno) que vêm do Simulador e da orientação de curso (só servidor).
// Usa a mesma função do Início do Simulador (getSimulatorHub): os números nunca podem divergir entre as duas páginas.

export type SubjectProgress = { id: string; name: string; answered: number; correct: number }

export type ResumeItem =
  | { kind: 'orientacao'; title: string; answered: number; total: number; href: string }
  | { kind: 'sessao'; title: string; answered: number; total: number; href: string }
  | { kind: 'material'; title: string; at: Date; href: string }

export type OrientacaoCardData = {
  label: string
  description: string
  status: 'active' | 'soon'
  estado: OrientacaoEstado
  href: string
  resultHref: string
}

export type InicioAluno = {
  resume: ResumeItem | null
  practice: { subjects: SubjectProgress[]; showErrors: boolean; errorCount: number; errorsHref: string } | null
  orientacao: OrientacaoCardData | null
}

// Mesma definição de «respondida» e «certa» que o Simulador usa nas estatísticas (is_correct preenchido).
async function getSubjectProgress(userId: string): Promise<SubjectProgress[]> {
  const result = await pool.query(
    `SELECT s.id, s.name,
            count(*) FILTER (WHERE i.is_correct IS NOT NULL)::int AS answered,
            count(*) FILTER (WHERE i.is_correct)::int AS correct
     FROM attempt_items i
     JOIN attempts a ON a.id = i.attempt_id
     JOIN questions q ON q.id = i.question_id
     JOIN library_subjects s ON s.id = q.subject_id
     WHERE a.user_id = $1
     GROUP BY s.id, s.name
     HAVING count(*) FILTER (WHERE i.is_correct IS NOT NULL) > 0
     ORDER BY answered DESC, s.name`,
    [userId],
  )
  return result.rows.map((row) => ({ id: row.id as string, name: row.name as string, answered: row.answered as number, correct: row.correct as number }))
}

export async function getInicioAluno(scope: StudentScope): Promise<InicioAluno> {
  const [modules, hub, subjects, estado] = await Promise.all([
    getVisibleModules(scope.track),
    getSimulatorHub(scope),
    getSubjectProgress(scope.userId),
    getOrientacao(scope.userId),
  ])

  const isActive = (key: string) => modules.some((item) => item.key === key && item.status === 'active')
  const enabled = (Object.keys(MODE_META) as AttemptMode[]).filter((mode) => isActive(MODE_META[mode].moduleKey))
  // Mesma regra do Início do Simulador: sem questões ou sem modos ativos, não há nada a mostrar.
  const hasSimulator = hub.totalQuestions > 0 && enabled.length > 0

  const orientacaoModule = modules.find((item) => item.key === ORIENTACAO_MODULE_KEY)
  const orientacaoVisible = orientacaoModule && (orientacaoModule.status === 'active' || orientacaoModule.status === 'soon')

  // «Continuar»: primeiro a orientação a meio, depois a sessão do Simulador mais recente (as mesmas que o Simulador lista).
  let resume: ResumeItem | null = null
  if (orientacaoModule?.status === 'active' && estado.status === 'em_curso') {
    resume = { kind: 'orientacao', title: orientacaoModule.label, answered: estado.answered, total: estado.total, href: ORIENTACAO_HREF }
  }
  if (!resume) {
    const open = hub.open.find((item) => enabled.includes(item.mode))
    if (open) {
      resume = {
        kind: 'sessao',
        title: `${MODE_META[open.mode].label}${open.subject ? ` · ${open.subject}` : ''}`,
        answered: open.answered,
        total: open.total,
        href: `/aluno/simulador/sessao/${open.id}`,
      }
    }
  }

  // Com uma só disciplina respondida, «Rever erros» vai direto à revisão dessa disciplina; com várias, ao Simulador, onde se escolhe.
  const errorsHref = subjects.length === 1 ? `/aluno/simulador/${SLUG_BY_MODE.revisao}?d=${encodeURIComponent(subjects[0].id)}` : '/aluno/simulador'

  return {
    resume,
    practice: hasSimulator ? { subjects, showErrors: enabled.includes('revisao'), errorCount: hub.errorCount, errorsHref } : null,
    orientacao:
      orientacaoModule && orientacaoVisible
        ? {
            label: orientacaoModule.label,
            description: orientacaoModule.description,
            status: orientacaoModule.status === 'active' ? 'active' : 'soon',
            estado,
            href: ORIENTACAO_HREF,
            resultHref: ORIENTACAO_RESULT_HREF,
          }
        : null,
  }
}
EOF

# ───────────────────────── components/aluno/inicio-cards.tsx ─────────────────────────
cat > "$TMP/components/aluno/inicio-cards.tsx" <<'EOF'
import Link from 'next/link'
import { ArrowRight, ClipboardCheck, Compass } from 'lucide-react'
import { Ic } from '@/components/aluno/icons'
import type { OrientacaoCardData, ResumeItem, SubjectProgress } from '@/lib/aluno-inicio'
import { relativeTime } from '@/lib/relative-time'
import { percent } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'

// Cartões do Início (/aluno). Só mostram o que existe: sem dados, dizem que ainda não há (nunca um zero ou um exemplo inventado).

const soft = 'shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)]'
const card = cn('overflow-hidden rounded-[18px] bg-gradient-to-br from-white to-[#f6f8f3]', soft)
const sectionLabel = 'mb-[8px] ml-[4px] text-[11px] font-bold uppercase tracking-[0.12em] text-[#202321]'
const secondaryButton =
  'inline-flex h-[44px] items-center justify-center gap-[8px] rounded-[22px] bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] px-[18px] text-[14px] font-semibold text-[#1d4d41] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4d41]'

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-[16px] py-[14px]">
      <p className="text-[14px] font-medium text-[#202321]">{title}</p>
      <p className="mt-[2px] text-[12px] text-[#6b756e]">{text}</p>
    </div>
  )
}

/** Um só «Continuar»: orientação a meio, sessão do Simulador a meio ou o último material. */
export function ContinuarCard({ resume }: { resume: ResumeItem }) {
  const material = resume.kind === 'material'
  const Icon = resume.kind === 'orientacao' ? Compass : ClipboardCheck
  const pct = resume.kind === 'material' ? 0 : percent(resume.answered, resume.total)
  const unit = resume.kind === 'orientacao' ? 'perguntas' : 'questões'
  const buttonClass = 'mt-[14px] flex h-[48px] items-center justify-center gap-[8px] rounded-[24px] bg-white text-[15px] font-semibold text-[#1d4d41] no-underline'

  return (
    <section aria-label="Continuar" className={cn('rounded-[20px] bg-gradient-to-br from-[#2f7260] via-[#1d4d41] to-[#12362d] p-[16px] text-white', soft)}>
      <div className="flex items-center gap-[12px]">
        <span className="flex size-[44px] flex-none items-center justify-center rounded-[14px] bg-white/[0.16] text-white">
          {material ? <Ic name="file" /> : <Icon size={20} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-white/70">CONTINUAR</p>
          <p className="mt-[2px] truncate text-[16px] font-semibold">{resume.title}</p>
          <p className="mt-[2px] text-[12px] text-white/70">
            {resume.kind === 'material' ? relativeTime(resume.at) : `${resume.answered} de ${resume.total} ${unit}`}
          </p>
        </div>
      </div>
      {resume.kind !== 'material' && (
        <div role="progressbar" aria-label="Progresso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-[12px] h-[6px] overflow-hidden rounded-[3px] bg-white/[0.2]">
          <div className="h-full rounded-[3px] bg-white" style={{ width: `${pct}%` }} />
        </div>
      )}
      {resume.kind === 'material' ? (
        <a href={resume.href} target="_blank" rel="noopener" className={buttonClass}>
          Abrir <Ic name="up" size={16} />
        </a>
      ) : (
        <Link href={resume.href} className={buttonClass}>
          Continuar <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </section>
  )
}

/** Acertos por disciplina (as 5 com mais respostas). */
export function ProgressoPorDisciplina({ subjects }: { subjects: SubjectProgress[] }) {
  return (
    <section aria-label="Progresso por disciplina">
      <h2 className={sectionLabel}>Progresso por disciplina</h2>
      <div className={card}>
        {subjects.length === 0 ? (
          <Empty title="Ainda sem respostas" text="Responde a questões no Simulador e o teu progresso aparece aqui." />
        ) : (
          <ul>
            {subjects.map((subject, index) => {
              const pct = percent(subject.correct, subject.answered)
              return (
                <li key={subject.id} className={cn('px-[16px] py-[12px]', index > 0 && 'border-t border-black/[0.05]')}>
                  <div className="flex items-baseline justify-between gap-[12px]">
                    <p className="min-w-0 truncate text-[14px] font-medium text-[#202321]">{subject.name}</p>
                    <p className="flex-none text-[14px] font-semibold text-[#1d4d41]">{pct}%</p>
                  </div>
                  <div aria-hidden="true" className="mt-[8px] h-[6px] overflow-hidden rounded-[3px] bg-[#e3e9df]">
                    <div className="h-full rounded-[3px] bg-gradient-to-r from-[#4a8a76] to-[#1d4d41]" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-[6px] text-[12px] text-[#6b756e]">
                    {subject.correct} de {subject.answered} {subject.answered === 1 ? 'certa' : 'certas'}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Questões erradas por rever (o mesmo número do Início do Simulador). */
export function ErrosCard({ count, href }: { count: number; href: string }) {
  return (
    <section aria-label="Erros">
      <h2 className={sectionLabel}>Erros</h2>
      <div className={card}>
        {count === 0 ? (
          <Empty title="Ainda não tens erros para rever" text="As questões que errares aparecem aqui para refazeres." />
        ) : (
          <div className="flex items-center gap-[12px] px-[16px] py-[14px]">
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-semibold text-[#202321]">{count}</p>
              <p className="text-[12px] text-[#6b756e]">{count === 1 ? 'questão para rever' : 'questões para rever'}</p>
            </div>
            <Link href={href} className={secondaryButton}>
              Rever erros
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Orientação de curso. Nunca feito: «Começar» (ou «Em breve», sem botão, se o módulo ainda não está ativo).
 * A meio: não aparece aqui, porque o «Continuar» já o mostra. Concluído: os cursos e a percentagem.
 */
export function DescobreCursoCard({ data }: { data: OrientacaoCardData }) {
  const { estado } = data
  if (estado.status === 'em_curso') return null
  const done = estado.status === 'concluido'

  return (
    <section aria-label={data.label}>
      <div className={cn(card, 'p-[16px]')}>
        <div className="flex items-start gap-[12px]">
          <span className="flex size-[40px] flex-none items-center justify-center rounded-[12px] bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]">
            <Compass size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[8px]">
              <h2 className="text-[16px] font-semibold text-[#202321]">{data.label}</h2>
              {!done && data.status === 'soon' && (
                <span className="rounded-full bg-[#f4eddb] px-[8px] py-[2px] text-[10px] font-semibold text-[#805f19]">Em breve</span>
              )}
            </div>
            {!done && <p className="mt-[2px] text-[13px] leading-[18px] text-[#6b756e]">{data.description}</p>}
          </div>
        </div>

        {estado.status === 'concluido' ? (
          <>
            <ul className="mt-[12px] divide-y divide-black/[0.05]">
              {estado.courses.slice(0, 3).map((course) => (
                <li key={`${course.name}-${course.institution ?? ''}`} className="flex items-center justify-between gap-[12px] py-[10px]">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[#202321]">{course.name}</span>
                    {course.institution && <span className="block truncate text-[12px] text-[#6b756e]">{course.institution}</span>}
                  </span>
                  <span aria-label={`${course.percent}% de afinidade`} className="flex-none text-[14px] font-semibold text-[#1d4d41]">
                    {course.percent}%
                  </span>
                </li>
              ))}
            </ul>
            <Link href={data.resultHref} className={cn(secondaryButton, 'mt-[12px] w-full')}>
              Ver resultado completo
            </Link>
          </>
        ) : (
          data.status === 'active' && (
            <Link href={data.href} className={cn(secondaryButton, 'mt-[12px] w-full')}>
              Começar
            </Link>
          )
        )}
      </div>
    </section>
  )
}
EOF

NEW_DIR="$TMP" node - <<'NODE'
const fs = require('fs')
const path = require('path')

const PAGE = 'app/aluno/(painel)/page.tsx'
const MODULES = 'lib/exam-modules.ts'
const NEW = [
  ['lib/orientacao.ts', process.env.NEW_DIR + '/lib/orientacao.ts'],
  ['lib/aluno-inicio.ts', process.env.NEW_DIR + '/lib/aluno-inicio.ts'],
  ['components/aluno/inicio-cards.tsx', process.env.NEW_DIR + '/components/aluno/inicio-cards.tsx'],
]

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
const backupDir = `.ux-backup-${stamp}-fase3`

const errors = []
const count = (t, part) => (part === '' ? 0 : t.split(part).length - 1)
const plan = []

for (const file of [PAGE, MODULES, 'lib/simulator.ts', 'lib/simulator-shared.ts', 'components/aluno/icons.tsx', 'lib/relative-time.ts']) {
  if (!fs.existsSync(file)) errors.push(`${file}: ficheiro não existe`)
}
if (errors.length) fail()

// ───────── lib/exam-modules.ts: novo nome (a chave interna não muda) ─────────
{
  const original = fs.readFileSync(MODULES, 'utf8')
  const oldLine = "{ key: 'teste-vocacional', label: 'Teste vocacional', description: 'Sugere cursos pelo perfil do aluno.', phase: 9, ready: false },"
  const newLine = "{ key: 'teste-vocacional', label: 'Descobre o teu curso', description: 'Responde a perguntas curtas e vê cursos que combinam contigo.', phase: 9, ready: false },"
  if (original.includes(newLine)) {
    // já aplicado
  } else if (count(original, oldLine) === 1) {
    plan.push({ file: MODULES, text: original.replace(oldLine, () => newLine) })
  } else {
    errors.push(`${MODULES}: linha do módulo «Teste vocacional» não encontrada (${count(original, oldLine)} vezes)`)
  }
}

// ───────── página /aluno ─────────
{
  const original = fs.readFileSync(PAGE, 'utf8')
  let text = original

  if (!text.includes('<ContinuarCard')) {
    const GUARD = '{(!savedItems.ok || savedItems.value.length > 0) && ('
    if (!text.includes(GUARD)) errors.push(`${PAGE}: falta a fase 2 (secção «Guardados» condicional). Aplica primeiro twisisa-ux-fase2.sh`)

    // 1 · imports
    const importAnchor = "import { Ic } from '@/components/aluno/icons'"
    if (count(text, importAnchor) !== 1) errors.push(`${PAGE}: import de Ic não encontrado`)
    else {
      text = text.replace(
        importAnchor,
        () =>
          `${importAnchor}\nimport { ContinuarCard, DescobreCursoCard, ErrosCard, ProgressoPorDisciplina } from '@/components/aluno/inicio-cards'\nimport { getInicioAluno, type ResumeItem } from '@/lib/aluno-inicio'`,
      )
    }

    // 2 · pedido do Início do Simulador, em paralelo com o resto
    const overviewAnchor = '  const { progress, unread, downloads, saved, recent, savedItems, institution, simulador } = await getAlunoOverview({'
    if (count(text, overviewAnchor) !== 1) errors.push(`${PAGE}: chamada a getAlunoOverview não encontrada`)
    else {
      text = text.replace(
        overviewAnchor,
        () =>
          [
            '  // O Início do Simulador e a orientação de curso correm ao mesmo tempo que o resto; se falharem, essas secções não aparecem (nunca um zero inventado).',
            '  const inicioPromise = track',
            '    ? getInicioAluno({ userId: session.user.id, track, institutionId: profile?.institutionId ?? null }).then(',
            '        (value) => ({ ok: true as const, value }),',
            '        (error: unknown) => {',
            "          console.error('[ALUNO] início', error)",
            '          return { ok: false as const }',
            '        },',
            '      )',
            '    : Promise.resolve(null)',
            overviewAnchor,
          ].join('\n'),
      )
    }

    // 3 · «Continuar» único
    const lastAnchor = '  const last = recent.ok ? recent.value[0] : undefined'
    if (count(text, lastAnchor) !== 1) errors.push(`${PAGE}: linha de «last» não encontrada`)
    else {
      text = text.replace(
        lastAnchor,
        () =>
          [
            lastAnchor,
            '  const inicio = await inicioPromise',
            '  // Ordem: orientação a meio, sessão do Simulador a meio, último material aberto.',
            '  const resume: ResumeItem | null =',
            "    (inicio?.ok ? inicio.value.resume : null) ?? (last ? { kind: 'material', title: last.title, at: last.at, href: fileHref(last.id) } : null)",
          ].join('\n'),
      )
    }

    // 4 · o antigo cartão «Continuar» (só materiais) dá lugar ao ContinuarCard
    const startMarker = '{last && ('
    const s = text.indexOf(startMarker)
    if (s === -1) errors.push(`${PAGE}: bloco {last && ( não encontrado`)
    else {
      const endMarker = '</section>\n              )}'
      const e = text.indexOf(endMarker, s)
      if (e === -1) errors.push(`${PAGE}: fim do bloco «Continuar» não encontrado`)
      else {
        text = text.slice(0, s) + '{resume && <ContinuarCard resume={resume} />}' + text.slice(e + endMarker.length)
      }
    }

    // 5 · novos cartões antes de «Guardados»
    if (text.includes(GUARD)) {
      const block = [
        '{inicio?.ok && inicio.value.practice && (',
        '                <>',
        '                  <ProgressoPorDisciplina subjects={inicio.value.practice.subjects.slice(0, 5)} />',
        '                  {inicio.value.practice.showErrors && <ErrosCard count={inicio.value.practice.errorCount} href={inicio.value.practice.errorsHref} />}',
        '                </>',
        '              )}',
        '              {inicio?.ok && inicio.value.orientacao && <DescobreCursoCard data={inicio.value.orientacao} />}',
        '              ' + GUARD,
      ].join('\n')
      text = text.replace(GUARD, () => block)
    }
  }

  if (text !== original) plan.push({ file: PAGE, text })
}

if (errors.length) fail()

// ───────── escrever (backup dos existentes; novos ficheiros) ─────────
let created = 0
for (const [rel, source] of NEW) {
  const content = fs.readFileSync(source, 'utf8')
  if (fs.existsSync(rel)) {
    if (fs.readFileSync(rel, 'utf8') === content) continue
    const target = path.join(backupDir, rel)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(rel, target)
  }
  fs.mkdirSync(path.dirname(rel), { recursive: true })
  fs.writeFileSync(rel, content)
  created += 1
  console.log(`  + ${rel}`)
}
for (const item of plan) {
  const target = path.join(backupDir, item.file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(item.file, target)
  fs.writeFileSync(item.file, item.text)
  console.log(`  ~ ${item.file}`)
}
if (created === 0 && plan.length === 0) console.log('Nada a fazer: a fase 3 já estava aplicada.')
else console.log(`\nFeito: ${created} ficheiro(s) novo(s)/atualizado(s), ${plan.length} alterado(s). Backups em ${backupDir}/ (só dos que já existiam).`)

function fail() {
  console.error('\nABORTADO. Nada foi escrito:\n')
  for (const message of errors) console.error('  - ' + message)
  process.exit(1)
}
NODE

echo
if [ -d node_modules ] && [ -x node_modules/.bin/tsc ]; then
  echo "A verificar tipos (tsc --noEmit)..."
  if node_modules/.bin/tsc --noEmit; then
    echo "Tipos: OK."
  else
    echo "AVISO: o tsc encontrou erros. Vê acima; os backups estão em .ux-backup-*-fase3/." >&2
  fi
else
  echo "Sem node_modules: verifica os tipos tu com:  pnpm exec tsc --noEmit"
fi

cat <<'FIM'

Para veres o cartão «Descobre o teu curso»: no Admin, Módulos, põe «Teste vocacional» (agora «Descobre o teu curso») em «Em breve»
para o percurso do aluno. Por omissão está «Oculto», e com «Oculto» o cartão não aparece.

Falta fazer (não incluído):
  - O teste em si: perguntas, cálculo no servidor, resultado, guardar/retomar. Ligação: getOrientacao em lib/orientacao.ts,
    rota ORIENTACAO_HREF, e ready: true em lib/exam-modules.ts.
  - O estado «concluído» do cartão está escrito mas ainda não foi visto com dados reais (só existirá com o teste feito).
  - Explicação da % de afinidade e aviso de que não é garantia: vai no ecrã de resultado, não aqui.
FIM
