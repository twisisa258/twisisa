import { pool } from '@/lib/db'
import { maputoDay, toIsoDate } from '@/lib/identity'
import { addDays, computeStreak, weekStart } from '@/lib/study-calc'

// Dias de estudo (só servidor). Um dia civil em Maputo conta se o estudante respondeu a uma questão,
// abriu ou descarregou um material, ou enviou uma mensagem ao Jonas (docs/IDENTIDADE-ONBOARDING-RETENCAO.md, secção 4).

export type StudyKind = 'question' | 'material' | 'jonas'

const COLUMN: Record<StudyKind, 'questions' | 'materials' | 'jonas_messages'> = { question: 'questions', material: 'materials', jonas: 'jonas_messages' }

/**
 * Regista uma actividade de estudo no dia de hoje (fuso de Maputo). Nunca lança: se falhar, regista o erro e a acção
 * do estudante continua (o registo é um extra, não pode derrubar a resposta).
 */
export async function recordStudy(userId: string, kind: StudyKind): Promise<void> {
  const column = COLUMN[kind]
  try {
    await pool.query(
      `INSERT INTO study_days (user_id, day, ${column}) VALUES ($1, $2::date, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET ${column} = study_days.${column} + 1`,
      [userId, toIsoDate(maputoDay())],
    )
  } catch (error) {
    console.error('[ACTIVIDADE] Não foi possível registar o dia de estudo', error)
  }
}

export type StudyStats = {
  /** Questões respondidas hoje. */
  today: number
  /** Questões respondidas esta semana (segunda a domingo). */
  week: number
  /** Dias seguidos com estudo. */
  streak: number
  /** Último dia com estudo («2026-10-30») ou null. */
  lastDay: string | null
}

/** Tudo calculado a partir de `study_days`: não há número guardado que possa dessincronizar. */
export async function getStudyStats(userId: string, now: Date = new Date()): Promise<StudyStats> {
  const today = maputoDay(now)
  const monday = weekStart(today)
  // 400 dias bastam para a sequência mais longa que mostramos.
  const since = toIsoDate(addDays(today, -400))
  const result = await pool.query<{ day: string; questions: number }>(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day, questions FROM study_days WHERE user_id = $1 AND day >= $2::date ORDER BY day DESC`,
    [userId, since],
  )
  const days = result.rows.map((row) => row.day)
  const todayIso = toIsoDate(today)
  const mondayIso = toIsoDate(monday)
  return {
    today: result.rows.find((row) => row.day === todayIso)?.questions ?? 0,
    week: result.rows.filter((row) => row.day >= mondayIso && row.day <= todayIso).reduce((sum, row) => sum + row.questions, 0),
    streak: computeStreak(days, today),
    lastDay: days[0] ?? null,
  }
}
