#!/usr/bin/env bash
# twisisa-ux-fase4.sh — Twisisa, fase 4: o teste «Descobre o teu curso» (antes «Teste vocacional»), de ponta a ponta.
#
#   Base de dados (migração 0021): 30 perguntas (modelo RIASEC), perfil dos 90 cursos da UEM (RASCUNHO por rever),
#   tentativas e respostas. Nada de terceiros: os dados ficam no Twisisa.
#   Servidor: respostas guardadas uma a uma; o resultado é calculado AQUI a partir das respostas guardadas
#   (o browser nunca envia pontuações). Mostra até 5 cursos com afinidade de pelo menos 30%.
#   Ecrãs: entrada, uma pergunta por ecrã (guardar/retomar/voltar atrás), «Terminaste» e resultado, com «Refazer».
#   Início (/aluno): getOrientacao passa a ler dados reais: «Continuar» a meio, cursos no cartão quando concluído.
#
# O módulo continua com ready: false de propósito: só deves ligá-lo depois de correr a migração e testar o fluxo.
# Requer as fases 1 e 3. Corre na raiz do projecto:  bash twisisa-ux-fase4.sh
# Seguro: se faltar um pré-requisito, aborta sem escrever nada. Idempotente. Backups em .ux-backup-<data>-fase4/.
set -euo pipefail

if [ ! -f package.json ] || [ ! -d app ] || [ ! -d components ] || [ ! -d lib ] || [ ! -d database/migrations ]; then
  echo "ERRO: corre este script na raiz do projecto twisisa (onde está o package.json)." >&2
  exit 1
fi
command -v node >/dev/null 2>&1 || { echo "ERRO: node não encontrado." >&2; exit 1; }

missing=0
for f in components/ui/spinner.tsx lib/orientacao.ts lib/aluno-inicio.ts lib/simulator-scope.ts lib/simulator.ts lib/exam-modules.ts \
         components/student-feature-shell.tsx components/feedback-provider.tsx components/skeletons/skeleton.tsx components/skeletons/student-shell.tsx; do
  if [ ! -f "$f" ]; then echo "ERRO: falta $f (aplica primeiro as fases 1 e 3)." >&2; missing=1; fi
done
[ "$missing" -eq 0 ] || exit 1
if ls database/migrations/0021_* >/dev/null 2>&1 && [ ! -f database/migrations/0021_orientacao.sql ]; then
  echo "ERRO: já existe outra migração 0021_*. Renomeia a deste script (0021_orientacao.sql) para o próximo número livre." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/$(dirname "lib/orientacao-shared.ts")"
cat > "$TMP/lib/orientacao-shared.ts" <<'PYFILE_END'
// Parte do teste de orientação segura para o browser (sem base de dados): dimensões, respostas e cálculo.
// O cálculo corre SEMPRE no servidor (lib/orientacao.ts). O browser só envia a resposta a cada pergunta, nunca pontuações.
// Modelo RIASEC (Holland): R prático, I investigação, A criatividade, S ajudar pessoas, E liderar, C organização.

export const DIMENSIONS = ['R', 'I', 'A', 'S', 'E', 'C'] as const
export type Dimension = (typeof DIMENSIONS)[number]

export const DIMENSION_LABEL: Record<Dimension, string> = {
  R: 'trabalho prático',
  I: 'investigação',
  A: 'criatividade',
  S: 'ajudar pessoas',
  E: 'liderar',
  C: 'organização',
}

export const ANSWER_OPTIONS = [
  { value: 2, label: 'Gosto' },
  { value: 1, label: 'Mais ou menos' },
  { value: 0, label: 'Não gosto' },
] as const

export const MINUTES_ESTIMATE = 4

export type CourseProfile = { courseId: string; name: string; unit: string | null; institution: string; weights: Record<Dimension, number> }
export type ScoredCourse = { courseId: string; name: string; unit: string | null; institution: string; percent: number; reasons: Dimension[] }
export type OrientacaoResult = { version: 1; scores: Record<Dimension, number>; flat: boolean; courses: ScoredCourse[] }

const MAX_PER_UNIT = 2 // no máximo 2 cursos da mesma faculdade/unidade nos primeiros lugares, para haver variedade
const FLAT_SPREAD = 20 // diferença mínima (em pontos) entre a dimensão mais e menos forte
const MIN_PERCENT = 30 // abaixo disto o curso não é sugerido: melhor mostrar menos de 5 do que encher a lista com cursos que não combinam

const zero = (): Record<Dimension, number> => ({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })

/**
 * Cada pergunta vale 0, 1 ou 2. O nível de cada dimensão é a média das suas respostas (0 a 1).
 * A afinidade com um curso é a média dos níveis do aluno, pesada pelo que o curso pede: se o curso pede só «investigação»,
 * a afinidade é o nível de investigação do aluno. Nunca passa de 100 e não depende dos outros cursos.
 */
export function computeOrientacao(answers: { dimension: Dimension; value: number }[], profiles: CourseProfile[], top = 5): OrientacaoResult {
  const sums = zero()
  const counts = zero()
  for (const answer of answers) {
    sums[answer.dimension] += answer.value
    counts[answer.dimension] += 1
  }
  const level = zero()
  const scores = zero()
  for (const d of DIMENSIONS) {
    level[d] = counts[d] > 0 ? sums[d] / (2 * counts[d]) : 0
    scores[d] = Math.round(level[d] * 100)
  }
  const values = DIMENSIONS.map((d) => scores[d])
  const flat = Math.max(...values) - Math.min(...values) < FLAT_SPREAD

  type Scored = CourseProfile & { affinity: number; reasons: Dimension[] }
  const scored: Scored[] = []
  for (const profile of profiles) {
    const total = DIMENSIONS.reduce((sum, d) => sum + Math.max(0, profile.weights[d]), 0)
    if (total <= 0) continue
    let affinity = 0
    const parts: { d: Dimension; v: number }[] = []
    for (const d of DIMENSIONS) {
      const share = Math.max(0, profile.weights[d]) / total
      affinity += share * level[d]
      // «Porque gostas de»: só dimensões que o curso pede e em que o aluno disse gostar (nível de 50% ou mais).
      if (share > 0 && level[d] >= 0.5) parts.push({ d, v: share * level[d] })
    }
    parts.sort((a, b) => b.v - a.v)
    scored.push({ ...profile, affinity, reasons: parts.slice(0, 2).map((part) => part.d) })
  }
  scored.sort((a, b) => b.affinity - a.affinity || a.name.localeCompare(b.name, 'pt'))
  const eligible = scored.filter((c) => Math.round(c.affinity * 100) >= MIN_PERCENT)

  const picked: Scored[] = []
  const perUnit = new Map<string, number>()
  const unitKey = (c: Scored) => `${c.institution}|${c.unit ?? c.name}`
  for (const course of eligible) {
    if (picked.length >= top) break
    const key = unitKey(course)
    if ((perUnit.get(key) ?? 0) >= MAX_PER_UNIT) continue
    picked.push(course)
    perUnit.set(key, (perUnit.get(key) ?? 0) + 1)
  }
  for (const course of eligible) {
    if (picked.length >= top) break
    if (!picked.includes(course)) picked.push(course)
  }
  picked.sort((a, b) => b.affinity - a.affinity || a.name.localeCompare(b.name, 'pt'))

  return {
    version: 1,
    scores,
    flat,
    courses: picked.map((c) => ({ courseId: c.courseId, name: c.name, unit: c.unit, institution: c.institution, percent: Math.round(c.affinity * 100), reasons: c.reasons })),
  }
}
PYFILE_END
mkdir -p "$TMP/$(dirname "lib/orientacao.ts")"
cat > "$TMP/lib/orientacao.ts" <<'PYFILE_END'
import { randomUUID } from 'node:crypto'
import { AppError } from '@/lib/action-result'
import { pool } from '@/lib/db'
import type { StudentScope } from '@/lib/simulator'
import { DIMENSIONS, computeOrientacao, type CourseProfile, type Dimension, type OrientacaoResult } from '@/lib/orientacao-shared'

// Orientação de curso («Descobre o teu curso»), só servidor. O nome que o aluno vê vem do módulo em lib/exam-modules.ts
// (chave interna 'teste-vocacional', que não muda para não mexer nos dados da administração).
// As respostas são guardadas uma a uma; o resultado é calculado AQUI, a partir das respostas guardadas, nunca de pontuações enviadas pelo browser.

export type OrientacaoCurso = { name: string; institution: string | null; percent: number }

export type OrientacaoEstado =
  | { status: 'nunca' }
  | { status: 'em_curso'; answered: number; total: number }
  | { status: 'concluido'; finishedAt: Date; courses: OrientacaoCurso[] }

export const ORIENTACAO_MODULE_KEY = 'teste-vocacional' as const
export const ORIENTACAO_HREF = '/aluno/descobrir-curso'
export const ORIENTACAO_RESULT_HREF = '/aluno/descobrir-curso/resultado'

async function questionCount(): Promise<number> {
  const result = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM orientation_questions WHERE active`)
  return result.rows[0]?.n ?? 0
}
export const getOrientacaoTotal = questionCount

async function openAttemptId(userId: string): Promise<string | null> {
  const result = await pool.query<{ id: string }>(`SELECT id FROM orientation_attempts WHERE user_id = $1 AND status = 'em_curso' LIMIT 1`, [userId])
  return result.rows[0]?.id ?? null
}

/** Devolve a tentativa em curso ou cria uma nova (uma só em curso por aluno: recarregar volta ao mesmo ponto). */
export async function startOrientacaoAttempt(userId: string): Promise<string> {
  const existing = await openAttemptId(userId)
  if (existing) return existing
  if ((await questionCount()) === 0) throw new AppError('O teste ainda não tem perguntas.')
  const id = randomUUID()
  try {
    await pool.query(`INSERT INTO orientation_attempts (id, user_id) VALUES ($1, $2)`, [id, userId])
    return id
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      const again = await openAttemptId(userId)
      if (again) return again
    }
    throw error
  }
}

export type OrientacaoPlay = { attemptId: string; questions: { id: string; body: string }[]; answers: Record<string, number> }

/** O que o browser recebe: só o texto das perguntas e as respostas já dadas (nunca a dimensão nem os pesos dos cursos). */
export async function loadOrientacaoPlay(userId: string): Promise<OrientacaoPlay | null> {
  const attemptId = await openAttemptId(userId)
  if (!attemptId) return null
  const [questions, answers] = await Promise.all([
    pool.query(`SELECT id, body FROM orientation_questions WHERE active ORDER BY position`),
    pool.query(`SELECT question_id, value FROM orientation_answers WHERE attempt_id = $1`, [attemptId]),
  ])
  const given: Record<string, number> = {}
  for (const row of answers.rows) given[row.question_id as string] = row.value as number
  return { attemptId, questions: questions.rows.map((row) => ({ id: row.id as string, body: row.body as string })), answers: given }
}

export async function saveOrientacaoAnswer(userId: string, attemptId: string, questionId: string, value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 2) throw new AppError('Resposta inválida.')
  const owned = await pool.query(`SELECT 1 FROM orientation_attempts WHERE id = $1 AND user_id = $2 AND status = 'em_curso'`, [attemptId, userId])
  if (owned.rowCount === 0) throw new AppError('Este teste já foi terminado. Abre-o de novo.')
  const question = await pool.query(`SELECT 1 FROM orientation_questions WHERE id = $1 AND active`, [questionId])
  if (question.rowCount === 0) throw new AppError('Pergunta inválida.')
  await pool.query(
    `INSERT INTO orientation_answers (attempt_id, question_id, value) VALUES ($1, $2, $3)
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET value = EXCLUDED.value, answered_at = now()`,
    [attemptId, questionId, value],
  )
}

/** Calcula o resultado no servidor a partir das respostas guardadas e fecha a tentativa. */
export async function finishOrientacao(scope: StudentScope, attemptId: string) {
  const attempt = await pool.query(`SELECT status FROM orientation_attempts WHERE id = $1 AND user_id = $2`, [attemptId, scope.userId])
  if (!attempt.rows[0]) throw new AppError('Teste não encontrado.')
  if (attempt.rows[0].status !== 'em_curso') return

  const [answers, total, profiles] = await Promise.all([
    pool.query(`SELECT q.dimension, a.value FROM orientation_answers a JOIN orientation_questions q ON q.id = a.question_id WHERE a.attempt_id = $1 AND q.active`, [attemptId]),
    questionCount(),
    pool.query(
      `SELECT c.id, c.name, c.unit, i.short_name AS institution, p.r, p.i, p.a, p.s, p.e, p.c
       FROM orientation_course_profiles p
       JOIN courses c ON c.id = p.course_id AND c.active
       JOIN institutions i ON i.id = c.institution_id AND i.active
       WHERE ($1::text IS NULL OR c.institution_id = $1)`,
      [scope.track === 'admissao' ? scope.institutionId : null],
    ),
  ])
  if (answers.rows.length < total) throw new AppError('Faltam respostas. Volta atrás e responde a todas as perguntas.')

  const list: CourseProfile[] = profiles.rows.map((row) => ({
    courseId: row.id as string,
    name: row.name as string,
    unit: (row.unit as string | null) ?? null,
    institution: row.institution as string,
    weights: { R: row.r, I: row.i, A: row.a, S: row.s, E: row.e, C: row.c } as Record<Dimension, number>,
  }))
  const result = computeOrientacao(
    answers.rows.map((row) => ({ dimension: row.dimension as Dimension, value: row.value as number })),
    list,
  )
  await pool.query(`UPDATE orientation_attempts SET status = 'concluido', finished_at = now(), result = $2::jsonb WHERE id = $1 AND status = 'em_curso'`, [attemptId, JSON.stringify(result)])
}

export async function getLatestResult(userId: string): Promise<{ finishedAt: Date; result: OrientacaoResult } | null> {
  const row = (await pool.query(`SELECT finished_at, result FROM orientation_attempts WHERE user_id = $1 AND status = 'concluido' ORDER BY finished_at DESC LIMIT 1`, [userId])).rows[0]
  const result = row?.result as OrientacaoResult | undefined
  if (!row || !result || result.version !== 1 || !Array.isArray(result.courses) || !DIMENSIONS.every((d) => typeof result.scores?.[d] === 'number')) return null
  return { finishedAt: new Date(row.finished_at), result }
}

/** Estado do aluno, para o Início (/aluno): a meio, concluído ou nunca feito. */
export async function getOrientacao(userId: string): Promise<OrientacaoEstado> {
  const open = await openAttemptId(userId)
  if (open) {
    const [answered, total] = await Promise.all([pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM orientation_answers WHERE attempt_id = $1`, [open]), questionCount()])
    return { status: 'em_curso', answered: Math.min(answered.rows[0]?.n ?? 0, total), total }
  }
  const latest = await getLatestResult(userId)
  if (latest) {
    return { status: 'concluido', finishedAt: latest.finishedAt, courses: latest.result.courses.map((c) => ({ name: c.name, institution: c.institution, percent: c.percent })) }
  }
  return { status: 'nunca' }
}
PYFILE_END
mkdir -p "$TMP/$(dirname "app/aluno/descobrir-curso/actions.ts")"
cat > "$TMP/app/aluno/descobrir-curso/actions.ts" <<'PYFILE_END'
'use server'

import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { AppError } from '@/lib/action-result'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { getVisibleModules } from '@/lib/exam-modules'
import { ORIENTACAO_MODULE_KEY, finishOrientacao, saveOrientacaoAnswer, startOrientacaoAttempt } from '@/lib/orientacao'
import { isTrack } from '@/lib/percurso'
import type { StudentScope } from '@/lib/simulator'

// As ações devolvem o resultado em vez de lançar (em produção o Next.js esconde as mensagens de erro lançadas).
type Result<T> = { ok: true; data: T } | { ok: false; message: string }

async function run<T>(fallback: string, task: (scope: StudentScope) => Promise<T>): Promise<Result<T>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { ok: false, message: 'Entra na tua conta para continuar.' }
    const [profile] = await db.select({ track: studentProfiles.track, institutionId: studentProfiles.institutionId }).from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)).limit(1)
    if (!isTrack(profile?.track)) return { ok: false, message: 'Escolhe primeiro o teu percurso.' }
    const modules = await getVisibleModules(profile.track)
    if (!modules.some((item) => item.key === ORIENTACAO_MODULE_KEY && item.status === 'active')) return { ok: false, message: 'Este teste ainda não está disponível.' }
    return { ok: true, data: await task({ userId: session.user.id, track: profile.track, institutionId: profile.institutionId ?? null }) }
  } catch (error) {
    const digest = error && typeof error === 'object' ? (error as { digest?: unknown }).digest : undefined
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw error
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[ORIENTAÇÃO]', fallback, error)
    return { ok: false, message: fallback }
  }
}

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 100

export async function iniciarOrientacao() {
  return run('Não foi possível começar. Tenta de novo.', async (scope) => ({ id: await startOrientacaoAttempt(scope.userId) }))
}

export async function guardarResposta(input: { attemptId: string; questionId: string; value: number }) {
  return run('Não foi possível guardar a resposta. Tenta de novo.', async (scope) => {
    if (!isId(input?.attemptId) || !isId(input?.questionId)) throw new AppError('Resposta inválida.')
    await saveOrientacaoAnswer(scope.userId, input.attemptId, input.questionId, input.value)
    return { saved: true }
  })
}

export async function terminarOrientacao(input: { attemptId: string }) {
  return run('Não foi possível ver o resultado. Tenta de novo.', async (scope) => {
    if (!isId(input?.attemptId)) throw new AppError('Teste inválido.')
    await finishOrientacao(scope, input.attemptId)
    return { done: true }
  })
}
PYFILE_END
mkdir -p "$TMP/$(dirname "app/aluno/descobrir-curso/page.tsx")"
cat > "$TMP/app/aluno/descobrir-curso/page.tsx" <<'PYFILE_END'
import { redirect } from 'next/navigation'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { OrientacaoPlayer } from '@/components/orientacao/orientacao-player'
import { OrientacaoStartButton } from '@/components/orientacao/orientacao-buttons'
import { getVisibleModules } from '@/lib/exam-modules'
import { ORIENTACAO_MODULE_KEY, ORIENTACAO_RESULT_HREF, getLatestResult, getOrientacaoTotal, loadOrientacaoPlay } from '@/lib/orientacao'
import { MINUTES_ESTIMATE } from '@/lib/orientacao-shared'
import { requireSimulatorScope } from '@/lib/simulator-scope'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Descobre o teu curso | Twisisa' }

// Entrada do teste: com um teste a meio, abre-o onde ficou; com resultado, vai ao resultado; senão, apresenta-o e deixa começar.
export default async function DescobrirCursoPage() {
  const { scope, firstName } = await requireSimulatorScope()
  const modules = await getVisibleModules(scope.track)
  const entry = modules.find((item) => item.key === ORIENTACAO_MODULE_KEY)
  if (!entry || entry.status !== 'active') redirect('/aluno')

  const play = await loadOrientacaoPlay(scope.userId)
  if (play && play.questions.length > 0) return <OrientacaoPlayer attemptId={play.attemptId} questions={play.questions} initial={play.answers} />
  if (await getLatestResult(scope.userId)) redirect(ORIENTACAO_RESULT_HREF)

  const total = await getOrientacaoTotal()
  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Orientação" title={entry.label} hideTitle>
      <div className="max-w-[520px]">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#202321]">{entry.label}</h1>
        {total === 0 ? (
          <p className="mt-3 text-[15px] leading-6 text-[#5f6962]">O teste ainda não tem perguntas. Volta mais tarde.</p>
        ) : (
          <>
            <p className="mt-3 text-[15px] leading-6 text-[#5f6962]">Diz do que gostas e vê cursos que combinam contigo.</p>
            <p className="mt-3 text-[13px] text-[#6b756e]">
              {total} perguntas · cerca de {MINUTES_ESTIMATE} minutos
            </p>
            <div className="mt-6">
              <OrientacaoStartButton label="Começar" />
            </div>
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
PYFILE_END
mkdir -p "$TMP/$(dirname "app/aluno/descobrir-curso/resultado/page.tsx")"
cat > "$TMP/app/aluno/descobrir-curso/resultado/page.tsx" <<'PYFILE_END'
import { redirect } from 'next/navigation'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { OrientacaoStartButton } from '@/components/orientacao/orientacao-buttons'
import { getVisibleModules } from '@/lib/exam-modules'
import { ORIENTACAO_HREF, ORIENTACAO_MODULE_KEY, getLatestResult } from '@/lib/orientacao'
import { DIMENSION_LABEL } from '@/lib/orientacao-shared'
import { requireSimulatorScope } from '@/lib/simulator-scope'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Os teus cursos | Twisisa' }

const card = 'rounded-2xl bg-gradient-to-br from-white to-[#f4f6f1] shadow-[0_1px_2px_rgba(20,50,40,0.05)]'

const joinLabels = (list: string[]) => (list.length <= 1 ? (list[0] ?? '') : `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`)

export default async function ResultadoPage() {
  const { scope, firstName } = await requireSimulatorScope()
  const modules = await getVisibleModules(scope.track)
  const entry = modules.find((item) => item.key === ORIENTACAO_MODULE_KEY)
  if (!entry || entry.status !== 'active') redirect('/aluno')

  const latest = await getLatestResult(scope.userId)
  if (!latest) redirect(ORIENTACAO_HREF)
  const { courses, flat } = latest.result

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Orientação" title="Os teus cursos" hideTitle>
      <div className="max-w-[560px]">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#202321]">Os teus cursos</h1>

        {courses.length === 0 ? (
          <p className="mt-3 text-[15px] leading-6 text-[#5f6962]">As tuas respostas não apontam para nenhum curso com clareza. Tenta de novo quando quiseres.</p>
        ) : (
          <>
            <p className="mt-3 text-[13px] leading-5 text-[#6b756e]">A afinidade mostra o quanto o curso combina com o que disseste que gostas. Não garante a entrada.</p>
            {flat && <p className="mt-2 text-[13px] leading-5 text-[#6b756e]">As tuas respostas foram muito parecidas, por isso as diferenças entre os cursos são pequenas.</p>}
            <ol className="mt-5 space-y-3">
              {courses.map((course) => (
                <li key={course.courseId} className={`${card} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold leading-5 text-[#202321]">{course.name}</p>
                      <p className="mt-1 text-[12.5px] leading-4 text-[#6b756e]">{[course.unit, course.institution].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="flex-none text-right">
                      <p className="text-[20px] font-semibold leading-6 text-[#1d4d41]">{course.percent}%</p>
                      <p className="text-[11px] text-[#6b756e]">afinidade</p>
                    </div>
                  </div>
                  {course.reasons.length > 0 && <p className="mt-3 text-[13px] text-[#39433e]">Porque gostas de {joinLabels(course.reasons.map((d) => DIMENSION_LABEL[d]))}.</p>}
                </li>
              ))}
            </ol>
          </>
        )}

        <div className="mt-6">
          <OrientacaoStartButton label="Refazer o teste" variant="secondary" />
        </div>
      </div>
    </StudentFeatureShell>
  )
}
PYFILE_END
mkdir -p "$TMP/$(dirname "app/aluno/descobrir-curso/loading.tsx")"
cat > "$TMP/app/aluno/descobrir-curso/loading.tsx" <<'PYFILE_END'
import { Skeleton } from '@/components/skeletons/skeleton'
import { StudentShellSkeleton } from '@/components/skeletons/student-shell'

export default function Loading() {
  return (
    <StudentShellSkeleton>
      <div className="max-w-[520px] space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-12 w-full rounded-full sm:w-40" />
      </div>
    </StudentShellSkeleton>
  )
}
PYFILE_END
mkdir -p "$TMP/$(dirname "components/orientacao/orientacao-player.tsx")"
cat > "$TMP/components/orientacao/orientacao-player.tsx" <<'PYFILE_END'
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Check, X } from 'lucide-react'
import { guardarResposta, terminarOrientacao } from '@/app/aluno/descobrir-curso/actions'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { ANSWER_OPTIONS } from '@/lib/orientacao-shared'
import { cn } from '@/lib/utils'

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4d41]'

// Uma pergunta por ecrã, três respostas. Cada resposta é guardada no servidor ao tocar: fechar o separador não perde nada
// e o Início mostra «Continuar». Voltar atrás mantém as respostas e deixa mudar.
export function OrientacaoPlayer({ attemptId, questions, initial }: { attemptId: string; questions: { id: string; body: string }[]; initial: Record<string, number> }) {
  const router = useRouter()
  const feedback = useFeedback()
  const total = questions.length
  const [answers, setAnswers] = useState<Record<string, number>>(initial)
  const firstOpen = questions.findIndex((question) => answers[question.id] === undefined)
  // `total` é o passo final («Terminaste»): só se chega lá com todas as perguntas respondidas.
  const [index, setIndex] = useState(firstOpen === -1 ? total : firstOpen)
  const [saving, setSaving] = useState<number | null>(null)
  const [finishing, setFinishing] = useState(false)

  const answered = questions.filter((question) => answers[question.id] !== undefined).length
  const question = questions[index]
  const busy = saving !== null || finishing

  async function pick(value: number) {
    if (!question || busy) return
    setSaving(value)
    const result = await guardarResposta({ attemptId, questionId: question.id, value })
    setSaving(null)
    if (!result.ok) {
      feedback.error(result.message, 'Resposta não guardada')
      return
    }
    const next = { ...answers, [question.id]: value }
    setAnswers(next)
    // Em frente: a próxima pergunta; depois da última (e se todas estão respondidas) o passo final.
    if (index < total - 1) setIndex(index + 1)
    else if (questions.every((item) => next[item.id] !== undefined)) setIndex(total)
  }

  async function finish() {
    if (busy) return
    setFinishing(true)
    const result = await terminarOrientacao({ attemptId })
    if (!result.ok) {
      setFinishing(false)
      feedback.error(result.message, 'Não foi possível terminar')
      return
    }
    router.push('/aluno/descobrir-curso/resultado')
  }

  return (
    <main className="fixed inset-0 flex flex-col bg-[#f8f8f5] text-[#202321]">
      <header className="flex-none px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-[560px] items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0 || busy}
            aria-label="Pergunta anterior"
            className={cn('flex size-11 flex-none items-center justify-center rounded-full text-[#39433e] disabled:opacity-30', focusRing)}
          >
            <ArrowLeft size={20} aria-hidden />
          </button>
          <p className="flex-1 text-center text-[13px] font-medium text-[#5f6962]" aria-live="polite">
            {index < total ? `${index + 1} de ${total}` : 'Terminaste'}
          </p>
          <Link href="/aluno" aria-label="Sair. Podes continuar mais tarde" className={cn('flex size-11 flex-none items-center justify-center rounded-full text-[#39433e]', focusRing)}>
            <X size={20} aria-hidden />
          </Link>
        </div>
        <div role="progressbar" aria-label="Respondidas" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} className="mx-auto mt-1 h-[6px] w-full max-w-[560px] overflow-hidden rounded-[3px] bg-[#e3e9df]">
          <div className="h-full rounded-[3px] bg-[#1d4d41] transition-[width]" style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-center px-4 py-6">
          {question ? (
            <>
              <p className="text-[14px] text-[#6b756e]">Gostas de…</p>
              <h1 className="mt-2 text-[24px] font-semibold leading-[1.25] tracking-[-0.02em]">{question.body}</h1>
              <div className="mt-8 flex flex-col gap-3" role="group" aria-label="Resposta">
                {ANSWER_OPTIONS.map((option) => {
                  const selected = answers[question.id] === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => pick(option.value)}
                      disabled={busy}
                      aria-pressed={selected}
                      className={cn(
                        'flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl px-5 text-left text-[16px] font-semibold transition active:scale-[0.99] disabled:opacity-70',
                        selected ? 'bg-[#1d4d41] text-white' : 'bg-white text-[#202321] shadow-[0_1px_2px_rgba(20,50,40,0.08)] ring-1 ring-[#1d4d41]/10',
                        focusRing,
                      )}
                    >
                      {option.label}
                      {saving === option.value ? <Spinner /> : selected ? <Check size={18} aria-hidden /> : null}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#d6e6dc] text-[#1d4d41]">
                <Check size={26} aria-hidden />
              </span>
              <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.02em]">Terminaste</h1>
              <p className="mt-2 text-[15px] text-[#5f6962]">Vê os cursos que combinam contigo.</p>
              <button
                type="button"
                onClick={finish}
                disabled={busy}
                aria-busy={finishing}
                className={cn('mt-8 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#1d4d41] px-6 text-[16px] font-semibold text-white disabled:opacity-70', focusRing)}
              >
                {finishing ? (
                  <>
                    <Spinner />A calcular…
                  </>
                ) : (
                  'Ver os meus cursos'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-none pb-[max(0.75rem,env(safe-area-inset-bottom))]" />
    </main>
  )
}
PYFILE_END
mkdir -p "$TMP/$(dirname "components/orientacao/orientacao-buttons.tsx")"
cat > "$TMP/components/orientacao/orientacao-buttons.tsx" <<'PYFILE_END'
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { iniciarOrientacao } from '@/app/aluno/descobrir-curso/actions'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const base = 'inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold no-underline disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4d41] sm:w-auto'
const styles = {
  primary: 'bg-[#1d4d41] text-white',
  secondary: 'bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]',
}

/** «Começar» (primeira vez) e «Refazer»: abrem uma tentativa nova no servidor e levam ao teste. */
export function OrientacaoStartButton({ label, variant = 'primary' }: { label: string; variant?: keyof typeof styles }) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, setPending] = useState(false)

  async function start() {
    if (pending) return
    setPending(true)
    const result = await iniciarOrientacao()
    if (!result.ok) {
      setPending(false)
      feedback.error(result.message, 'Não foi possível começar')
      return
    }
    router.push('/aluno/descobrir-curso')
    router.refresh()
  }

  return (
    <button type="button" onClick={start} disabled={pending} aria-busy={pending} className={cn(base, styles[variant])}>
      {pending ? (
        <>
          <Spinner />A preparar…
        </>
      ) : (
        label
      )}
    </button>
  )
}
PYFILE_END
mkdir -p "$TMP/$(dirname "database/migrations/0021_orientacao.sql")"
cat > "$TMP/database/migrations/0021_orientacao.sql" <<'PYFILE_END'
-- Orientação de curso («Descobre o teu curso»). Modelo RIASEC (Holland): R prático, I investigação, A criatividade,
-- S ajudar pessoas, E liderar, C organização.
-- orientation_questions: perguntas (cada uma pertence a uma dimensão; o aluno nunca vê a dimensão).
-- orientation_course_profiles: o que cada curso pede, de 0 a 5 por dimensão. RASCUNHO: `reviewed = false` até um orientador/docente rever.
-- orientation_attempts / orientation_answers: o teste de cada aluno. O resultado fica guardado (instantâneo) na tentativa concluída.
-- Os dados pessoais do aluno não saem do Twisisa: nada é enviado a terceiros. Apagar a conta apaga as tentativas e respostas (ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS orientation_questions (
  id text PRIMARY KEY,
  position integer NOT NULL UNIQUE,
  dimension text NOT NULL CHECK (dimension IN ('R', 'I', 'A', 'S', 'E', 'C')),
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS orientation_course_profiles (
  course_id text PRIMARY KEY REFERENCES courses(id) ON DELETE CASCADE,
  r smallint NOT NULL DEFAULT 0 CHECK (r BETWEEN 0 AND 5),
  i smallint NOT NULL DEFAULT 0 CHECK (i BETWEEN 0 AND 5),
  a smallint NOT NULL DEFAULT 0 CHECK (a BETWEEN 0 AND 5),
  s smallint NOT NULL DEFAULT 0 CHECK (s BETWEEN 0 AND 5),
  e smallint NOT NULL DEFAULT 0 CHECK (e BETWEEN 0 AND 5),
  c smallint NOT NULL DEFAULT 0 CHECK (c BETWEEN 0 AND 5),
  reviewed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (r + i + a + s + e + c > 0)
);

CREATE TABLE IF NOT EXISTS orientation_attempts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'em_curso' CHECK (status IN ('em_curso', 'concluido')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  result jsonb
);
CREATE INDEX IF NOT EXISTS orientation_attempts_user_idx ON orientation_attempts(user_id, started_at DESC);
-- Um teste em curso por aluno: recarregar volta ao mesmo ponto.
CREATE UNIQUE INDEX IF NOT EXISTS orientation_attempts_one_open_idx ON orientation_attempts(user_id) WHERE status = 'em_curso';

CREATE TABLE IF NOT EXISTS orientation_answers (
  attempt_id text NOT NULL REFERENCES orientation_attempts(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES orientation_questions(id) ON DELETE RESTRICT,
  value smallint NOT NULL CHECK (value BETWEEN 0 AND 2),
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id)
);

-- Perguntas (30: 5 por dimensão, intercaladas). Só cria o que ainda não existe.
INSERT INTO orientation_questions (id, position, dimension, body) VALUES
  ('oq-01', 1, 'R', 'Reparar um aparelho avariado ou montar coisas com as mãos.'),
  ('oq-02', 2, 'I', 'Fazer experiências para descobrir como as coisas funcionam.'),
  ('oq-03', 3, 'A', 'Desenhar, pintar ou criar coisas novas.'),
  ('oq-04', 4, 'S', 'Ajudar pessoas com os seus problemas.'),
  ('oq-05', 5, 'E', 'Liderar um grupo para atingir um objectivo.'),
  ('oq-06', 6, 'C', 'Organizar documentos, ficheiros ou listas com cuidado.'),
  ('oq-07', 7, 'R', 'Trabalhar ao ar livre, a cuidar de plantas ou animais.'),
  ('oq-08', 8, 'I', 'Resolver problemas difíceis de matemática.'),
  ('oq-09', 9, 'A', 'Escrever histórias, poemas ou canções.'),
  ('oq-10', 10, 'S', 'Explicar uma matéria a colegas que não a percebem.'),
  ('oq-11', 11, 'E', 'Convencer pessoas a aceitar uma ideia ou a comprar algo.'),
  ('oq-12', 12, 'C', 'Seguir regras e procedimentos claros.'),
  ('oq-13', 13, 'R', 'Usar ferramentas ou máquinas.'),
  ('oq-14', 14, 'I', 'Ler sobre ciência, a natureza ou o corpo humano.'),
  ('oq-15', 15, 'A', 'Cantar, tocar um instrumento ou dançar.'),
  ('oq-16', 16, 'S', 'Cuidar de crianças ou de pessoas doentes.'),
  ('oq-17', 17, 'E', 'Abrir o meu próprio negócio.'),
  ('oq-18', 18, 'C', 'Fazer contas e controlar o dinheiro de um orçamento.'),
  ('oq-19', 19, 'R', 'Construir ou arranjar uma casa, um muro ou uma instalação eléctrica.'),
  ('oq-20', 20, 'I', 'Descobrir a causa de um problema, passo a passo.'),
  ('oq-21', 21, 'A', 'Fazer teatro ou falar para um público.'),
  ('oq-22', 22, 'S', 'Trabalhar em equipa com muita gente.'),
  ('oq-23', 23, 'E', 'Tomar decisões e assumir riscos.'),
  ('oq-24', 24, 'C', 'Manter tudo arrumado e dentro dos prazos.'),
  ('oq-25', 25, 'R', 'Fazer trabalho físico em vez de estar sentado o dia todo.'),
  ('oq-26', 26, 'I', 'Analisar números para encontrar padrões.'),
  ('oq-27', 27, 'A', 'Ter ideias originais, sem seguir regras fixas.'),
  ('oq-28', 28, 'S', 'Ouvir as pessoas e aconselhá-las.'),
  ('oq-29', 29, 'E', 'Organizar eventos ou campanhas.'),
  ('oq-30', 30, 'C', 'Registar dados no computador sem enganos.')
ON CONFLICT DO NOTHING;

-- Perfil dos cursos da UEM 2026 (rascunho por rever). Só cria o que ainda não existe: não altera o que já foi editado.
WITH v(course_id, r, i, a, s, e, c) AS (VALUES
  ('course-uem-agro-economia-e-extensao-agraria', 3, 2, 0, 3, 3, 0),
  ('course-uem-engenharia-agronomica', 4, 4, 0, 0, 1, 0),
  ('course-uem-engenharia-florestal', 5, 4, 0, 0, 0, 0),
  ('course-uem-arquitectura-e-planeamento-fisico', 3, 3, 5, 0, 0, 0),
  ('course-uem-biologia-aplicada', 3, 5, 0, 0, 0, 0),
  ('course-uem-biologia-e-saude', 0, 5, 0, 3, 0, 0),
  ('course-uem-biologia-marinha-aquatica-e-costeira', 3, 5, 0, 0, 0, 0),
  ('course-uem-ecologia-e-conservacao-da-biodiversidade-terrestre', 3, 5, 0, 0, 0, 0),
  ('course-uem-geo-ciencias-de-petroleo-e-gas', 4, 5, 0, 0, 0, 0),
  ('course-uem-geo-fisica-aplicada', 3, 5, 0, 0, 0, 1),
  ('course-uem-geologia-urbana-e-ambiental', 4, 5, 0, 0, 0, 0),
  ('course-uem-hidrogeologia-e-recursos-hidricos', 4, 5, 0, 0, 0, 0),
  ('course-uem-geologia-e-pesquisa-mineral', 4, 5, 0, 0, 0, 0),
  ('course-uem-quimica-ambiental', 3, 5, 0, 0, 0, 0),
  ('course-uem-quimica-industrial', 4, 5, 0, 0, 0, 1),
  ('course-uem-ciencias-de-informacao-geografica', 2, 5, 0, 0, 0, 3),
  ('course-uem-estatistica', 0, 5, 0, 0, 0, 4),
  ('course-uem-informatica', 2, 5, 0, 0, 0, 3),
  ('course-uem-matematica', 0, 5, 0, 0, 0, 3),
  ('course-uem-fisica', 3, 5, 0, 0, 0, 0),
  ('course-uem-meteorologia', 2, 5, 0, 0, 0, 2),
  ('course-uem-direito', 0, 3, 0, 3, 4, 3),
  ('course-uem-economia', 0, 4, 0, 0, 4, 4),
  ('course-uem-gestao', 0, 0, 0, 2, 5, 4),
  ('course-uem-contabilidade-e-financas', 0, 2, 0, 0, 3, 5),
  ('course-uem-lingua-de-sinais-de-mocambique', 0, 2, 2, 5, 0, 0),
  ('course-uem-organizacao-e-gestao-da-educacao', 0, 0, 0, 4, 4, 3),
  ('course-uem-desenvolvimento-e-educacao-de-infancia', 0, 0, 3, 5, 0, 0),
  ('course-uem-educacao-ambiental', 2, 3, 0, 5, 0, 0),
  ('course-uem-psicologia-das-organizacoes', 0, 3, 0, 5, 3, 0),
  ('course-uem-psicologia-escolar-e-das-necessidades-educativas-especiais', 0, 4, 0, 5, 0, 0),
  ('course-uem-engenharia-do-ambiente', 4, 4, 0, 0, 0, 0),
  ('course-uem-engenharia-civil', 5, 4, 0, 0, 0, 2),
  ('course-uem-engenharia-electrica', 5, 4, 0, 0, 0, 0),
  ('course-uem-engenharia-electronica', 4, 5, 0, 0, 0, 0),
  ('course-uem-engenharia-informatica', 3, 5, 0, 0, 0, 3),
  ('course-uem-engenharia-mecanica', 5, 4, 0, 0, 0, 0),
  ('course-uem-engenharia-quimica', 4, 5, 0, 0, 0, 0),
  ('course-uem-engenharia-de-petroleo-e-gas-natural', 5, 5, 0, 0, 0, 0),
  ('course-uem-engenharia-de-telecomunicacoes', 4, 5, 0, 0, 0, 0),
  ('course-uem-engenharia-e-gestao-industrial', 3, 4, 0, 0, 3, 3),
  ('course-uem-filosofia', 0, 5, 3, 2, 0, 0),
  ('course-uem-ensino-de-filosofia', 0, 4, 2, 5, 0, 0),
  ('course-uem-administracao-publica', 0, 0, 0, 3, 4, 4),
  ('course-uem-ciencia-politica', 0, 4, 0, 3, 4, 0),
  ('course-uem-ensino-de-portugues', 0, 2, 4, 5, 0, 0),
  ('course-uem-historia', 0, 5, 3, 2, 0, 0),
  ('course-uem-linguistica', 0, 5, 3, 0, 0, 2),
  ('course-uem-literatura-mocambicana', 0, 3, 5, 2, 0, 0),
  ('course-uem-sociologia', 0, 5, 0, 4, 0, 0),
  ('course-uem-antropologia', 0, 5, 2, 4, 0, 0),
  ('course-uem-arqueologia-e-gestao-do-patrimonio-cultural', 3, 5, 2, 0, 0, 0),
  ('course-uem-geografia', 3, 4, 0, 2, 0, 0),
  ('course-uem-ensino-de-frances', 0, 2, 3, 5, 0, 0),
  ('course-uem-traducao-portugues-frances', 0, 3, 4, 0, 0, 3),
  ('course-uem-ensino-de-ingles', 0, 2, 3, 5, 0, 0),
  ('course-uem-traducao-portugues-ingles', 0, 3, 4, 0, 0, 3),
  ('course-uem-lingua-cultura-e-literatura-chinesa', 0, 4, 4, 2, 0, 0),
  ('course-uem-ensino-de-linguas-bantu', 0, 3, 3, 5, 0, 0),
  ('course-uem-medicina', 2, 5, 0, 5, 0, 0),
  ('course-uem-ciencia-e-tecnologia-de-alimentos', 4, 5, 0, 0, 0, 2),
  ('course-uem-ciencia-e-tecnologia-animal', 5, 4, 0, 0, 0, 0),
  ('course-uem-medicina-veterinaria', 4, 5, 0, 3, 0, 0),
  ('course-uem-arquivistica', 0, 3, 0, 0, 0, 5),
  ('course-uem-biblioteconomia', 0, 2, 0, 3, 0, 5),
  ('course-uem-jornalismo', 0, 2, 4, 3, 3, 0),
  ('course-uem-marketing-e-relacoes-publicas', 0, 0, 3, 3, 5, 0),
  ('course-uem-musica', 0, 0, 5, 2, 0, 0),
  ('course-uem-teatro', 0, 0, 5, 3, 2, 0),
  ('course-uem-ciencias-do-desporto', 4, 2, 0, 4, 0, 0),
  ('course-uem-oceanografia', 4, 5, 0, 0, 0, 0),
  ('course-uem-biologia-marinha', 4, 5, 0, 0, 0, 0),
  ('course-uem-quimica-marinha', 4, 5, 0, 0, 0, 0),
  ('course-uem-geologia-marinha', 4, 5, 0, 0, 0, 0),
  ('course-uem-comunicacao-e-extensao-rural', 3, 0, 0, 5, 2, 0),
  ('course-uem-economia-agraria', 2, 4, 0, 0, 4, 3),
  ('course-uem-agro-processamento', 5, 3, 0, 0, 0, 2),
  ('course-uem-engenharia-rural', 5, 4, 0, 0, 0, 0),
  ('course-uem-producao-animal', 5, 3, 0, 0, 0, 0),
  ('course-uem-producao-pesqueira', 5, 3, 0, 0, 2, 0),
  ('course-uem-producao-agricola', 5, 3, 0, 0, 2, 0),
  ('course-uem-gestao-hoteleira', 0, 0, 0, 4, 4, 3),
  ('course-uem-animacao-turistica', 0, 0, 4, 4, 3, 0),
  ('course-uem-informacao-turistica', 0, 0, 0, 5, 2, 3),
  ('course-uem-ecoturismo-e-conservacao-da-natureza', 4, 3, 0, 3, 2, 0),
  ('course-uem-financas', 0, 2, 0, 0, 4, 5),
  ('course-uem-gestao-de-empresas', 0, 0, 0, 2, 5, 4),
  ('course-uem-gestao-comercial', 0, 0, 0, 3, 5, 3),
  ('course-uem-agro-negocios', 3, 0, 0, 0, 4, 3),
  ('course-uem-agricultura-comercial', 4, 0, 0, 0, 4, 2)
)
INSERT INTO orientation_course_profiles (course_id, r, i, a, s, e, c)
SELECT v.course_id, v.r, v.i, v.a, v.s, v.e, v.c FROM v JOIN courses ON courses.id = v.course_id
ON CONFLICT DO NOTHING;
PYFILE_END

NEW_DIR="$TMP" node - <<'NODE'
const fs = require('fs')
const path = require('path')

const FILES = ["lib/orientacao-shared.ts", "lib/orientacao.ts", "app/aluno/descobrir-curso/actions.ts", "app/aluno/descobrir-curso/page.tsx", "app/aluno/descobrir-curso/resultado/page.tsx", "app/aluno/descobrir-curso/loading.tsx", "components/orientacao/orientacao-player.tsx", "components/orientacao/orientacao-buttons.tsx", "database/migrations/0021_orientacao.sql"]
const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
const backupDir = `.ux-backup-${stamp}-fase4`

let created = 0
let updated = 0
for (const rel of FILES) {
  const content = fs.readFileSync(path.join(process.env.NEW_DIR, rel), 'utf8')
  if (fs.existsSync(rel)) {
    if (fs.readFileSync(rel, 'utf8') === content) continue
    const target = path.join(backupDir, rel)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(rel, target)
    updated += 1
    console.log(`  ~ ${rel}`)
  } else {
    created += 1
    console.log(`  + ${rel}`)
  }
  fs.mkdirSync(path.dirname(rel), { recursive: true })
  fs.writeFileSync(rel, content)
}
if (created === 0 && updated === 0) console.log('Nada a fazer: a fase 4 já estava aplicada.')
else console.log(`\nFeito: ${created} ficheiro(s) novo(s), ${updated} atualizado(s).${updated ? ` Backups em ${backupDir}/` : ''}`)
NODE

echo
if [ -d node_modules ] && [ -x node_modules/.bin/tsc ]; then
  echo "A verificar tipos (tsc --noEmit)..."
  if node_modules/.bin/tsc --noEmit; then
    echo "Tipos: OK."
  else
    echo "AVISO: o tsc encontrou erros. Vê acima; os backups estão em .ux-backup-*-fase4/." >&2
  fi
else
  echo "Sem node_modules: verifica os tipos tu com:  pnpm exec tsc --noEmit"
fi

cat <<'FIM'

Para experimentar (por esta ordem):
  1. pnpm migrate                       (cria as tabelas e carrega as 30 perguntas e os 90 perfis)
  2. pnpm exec tsc --noEmit
  3. Ligar o módulo para testar:        sed -i "/key: 'teste-vocacional'/ s/ready: false/ready: true/" lib/exam-modules.ts
  4. Admin > Módulos: pôr «Descobre o teu curso» em «Ativo» no percurso de teste. O cartão aparece no /aluno.
  5. Fazer o teste até ao fim; ver o resultado; fechar a meio e ver o «Continuar» no /aluno.

Falta fazer (não incluído):
  - REVER OS PERFIS DOS CURSOS: os 90 perfis são um rascunho meu (reviewed = false). Um orientador ou docente deve confirmá-los
    antes de mostrares a alunos reais. Não há ecrã de admin para editar perguntas nem perfis (hoje só por SQL).
  - Só há cursos da UEM. Outras instituições precisam dos seus perfis (tabela orientation_course_profiles).
  - Próximo passo no resultado: não há página de requisitos de admissão do aluno para ligar; só «Refazer».
  - Política de privacidade (S-03): acrescentar que o teste guarda as respostas e o resultado, por quanto tempo, e como se apaga.
  - Nunca foi executado contra uma base de dados nem visto no browser: testei o cálculo isolado e a aplicação dos ficheiros.
FIM
