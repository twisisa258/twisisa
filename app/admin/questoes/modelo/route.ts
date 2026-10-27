import { getAdminUser } from '@/lib/admin'
import { listInstitutions } from '@/lib/institutions'
import { listSubjects } from '@/lib/subjects'
import { listTopics } from '@/lib/classification'
import { buildQuestionTemplate, type TemplateHints } from '@/lib/question-csv-template'

export const dynamic = 'force-dynamic'

const isMaths = (name: string) => /matem/i.test(name)

// Modelo de importação com 3 linhas de exemplo marcadas «[EXEMPLO]» (a importação recusa-as).
// Os exemplos usam disciplinas, temas e instituições que existem mesmo neste projecto; se a base não responder, usa nomes de substituição.
async function loadHints(): Promise<TemplateHints> {
  try {
    const [subjects, topics, institutions] = await Promise.all([listSubjects(), listTopics(), listInstitutions()])
    const active = subjects.filter((subject) => subject.active)
    const best = (list: typeof active) => list.find((subject) => isMaths(subject.name)) ?? list[0]
    const topicOf = (subjectId: string) => topics.find((topic) => topic.active && topic.subjectId === subjectId)?.name

    const pick = (track: '10' | '12') => {
      const subject = best(active.filter((item) => item.scopes.some((scope) => scope.key === track)))
      return subject ? { subject: subject.name, topic: topicOf(subject.id) } : undefined
    }

    let admissao: TemplateHints['admissao']
    for (const institution of institutions.filter((item) => item.active)) {
      const subject = best(active.filter((item) => item.scopes.some((scope) => scope.key === `inst:${institution.id}`)))
      if (subject) {
        admissao = { subject: subject.name, topic: topicOf(subject.id), institution: institution.shortName }
        break
      }
    }
    return { classe10: pick('10'), classe12: pick('12'), admissao }
  } catch (error) {
    console.error('[ADMIN QUESTOES] modelo CSV: a usar nomes de substituição', error)
    return {}
  }
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return new Response('Não encontrado', { status: 404 })
  return new Response(`\uFEFF${buildQuestionTemplate(await loadHints())}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-importacao-questoes.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
