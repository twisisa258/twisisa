import { WEEK_DAYS_GOAL, formatLeft, plural, streakNeed } from '@/lib/desafios-regras'
import type { DesafiosSnapshot } from '@/lib/desafios'

// Avisos e lembretes do aluno: cartões dinâmicos calculados a partir dos desafios (sem guardar nada).
// Ordem = prioridade. Cada aviso diz o que está a acontecer e dá uma ação.

export type AvisoTone = 'urgent' | 'warning' | 'info' | 'success'
export type AvisoIcon = 'flame' | 'clock' | 'target' | 'book' | 'alert' | 'check' | 'calendar'
export type Aviso = { id: string; tone: AvisoTone; icon: AvisoIcon; title: string; text: string; href: string; cta: string }

const PRACTICE = '/aluno/simulador'

export function buildAvisos(s: DesafiosSnapshot): Aviso[] {
  const avisos: Aviso[] = []
  const goal = s.goal
  const left = Math.max(0, goal - s.todayAnswered)
  const keep = Math.max(0, streakNeed(goal) - s.todayAnswered)
  const hoursLeft = s.secondsLeft / 3600

  if (s.streak.current > 0 && !s.streak.todayCounted) {
    avisos.push({
      id: 'streak-risk',
      tone: hoursLeft <= 6 ? 'urgent' : 'warning',
      icon: 'flame',
      title: 'Sequência em risco',
      text: `Faltam ${plural(keep, 'questão', 'questões')} hoje para manteres ${plural(s.streak.current, 'dia seguido', 'dias seguidos')}. O dia acaba em ${formatLeft(s.secondsLeft)}.`,
      href: PRACTICE,
      cta: 'Praticar agora',
    })
  }

  const lost = s.streak.lost
  const lostRecently = lost && s.daysSinceActive !== null && s.daysSinceActive <= 14
  if (s.streak.current === 0 && lostRecently && lost) {
    avisos.push({
      id: 'streak-lost',
      tone: 'warning',
      icon: 'flame',
      title: 'Perdeste a sequência',
      text: `Chegaste a ${plural(lost.length, 'dia seguido', 'dias seguidos')}, e isso conta. Hoje ${plural(streakNeed(goal), 'questão chega', 'questões chegam')} para recomeçar.`,
      href: PRACTICE,
      cta: 'Recomeçar',
    })
  } else if (s.daysSinceActive === null) {
    avisos.push({ id: 'first', tone: 'info', icon: 'target', title: 'Ainda não praticaste', text: `Faz as primeiras ${goal} questões. Leva poucos minutos.`, href: PRACTICE, cta: 'Começar' })
  } else if (s.daysSinceActive >= 2) {
    avisos.push({ id: 'inactive', tone: 'warning', icon: 'clock', title: `Há ${plural(s.daysSinceActive, 'dia', 'dias')} sem praticar`, text: `O teu ritmo está a cair. Faz as ${goal} questões de hoje.`, href: PRACTICE, cta: 'Praticar' })
  }

  if (s.admission && !s.course) {
    avisos.push({ id: 'course', tone: 'info', icon: 'target', title: 'Escolhe o teu curso', text: 'Sem curso, não sabemos que provas tens de fazer. Escolhe um, ou faz o teste vocacional.', href: '/aluno/perfil#percurso', cta: 'Escolher curso' })
  }

  if (s.weak) {
    avisos.push({ id: 'weak', tone: 'warning', icon: 'alert', title: `${s.weak.name}: ${s.weak.accuracy}% de acertos`, text: 'É a tua disciplina mais fraca. Treina hoje.', href: `${PRACTICE}?d=${encodeURIComponent(s.weak.id)}`, cta: 'Treinar' })
  }

  const dias = s.weekly.find((mission) => mission.id === 'w-dias')
  if (dias && dias.status === 'em_curso' && s.weekday >= 4) {
    const need = WEEK_DAYS_GOAL - s.weekGoalDays
    avisos.push({ id: 'week', tone: 'warning', icon: 'calendar', title: 'A semana está a acabar', text: `Faltam ${plural(s.weekDaysLeft, 'dia', 'dias')} e ainda precisas de ${plural(need, 'dia', 'dias')} com a meta cumprida.`, href: PRACTICE, cta: 'Praticar' })
  }

  if (s.errorCount >= 5) {
    avisos.push({ id: 'errors', tone: 'info', icon: 'book', title: `${plural(s.errorCount, 'erro', 'erros')} por rever`, text: 'Quem não revê os erros repete-os no exame.', href: PRACTICE, cta: 'Rever erros' })
  }

  if (s.streak.todayMet) {
    avisos.push({ id: 'done', tone: 'success', icon: 'check', title: 'Meta de hoje cumprida', text: `Sequência: ${plural(s.streak.current, 'dia', 'dias')}. Amanhã a meta volta a ser ${goal} questões.`, href: '/aluno/desafios', cta: 'Ver desafios' })
  } else if (s.streak.current === 0 && s.todayAnswered > 0) {
    avisos.push({ id: 'daily', tone: 'info', icon: 'target', title: 'Meta de hoje', text: `${s.todayAnswered} de ${goal} questões. Faltam ${left}.`, href: PRACTICE, cta: 'Continuar' })
  }
  return avisos
}
