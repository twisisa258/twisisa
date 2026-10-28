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
