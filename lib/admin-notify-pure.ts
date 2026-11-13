// Texto das notificações do admin. Puro (sem base de dados).
export type NivelAviso = 'info' | 'sucesso' | 'aviso' | 'erro'
export type AvisoNovo = { kind: string; level: NivelAviso; title: string; body?: string | null; link?: string | null; data?: Record<string, unknown> }

const ENTIDADES: Record<string, { nome: string; fem: boolean; link: string }> = {
  institution: { nome: 'Instituição', fem: true, link: '/admin/instituicoes' },
  subject: { nome: 'Disciplina', fem: true, link: '/admin/disciplinas' },
  topic: { nome: 'Tema', fem: false, link: '/admin/temas' },
  variant: { nome: 'Variante', fem: true, link: '/admin/variantes' },
  question: { nome: 'Questão', fem: true, link: '/admin/questoes' },
  course: { nome: 'Curso', fem: false, link: '/admin/cursos' },
  material: { nome: 'Material', fem: false, link: '/admin/materiais' },
  module: { nome: 'Módulo', fem: false, link: '/admin/modulos' },
  blog_post: { nome: 'Artigo', fem: false, link: '/admin/blog' },
  announcement: { nome: 'Anúncio', fem: false, link: '/admin/anuncios' },
  question_report: { nome: 'Reporte', fem: false, link: '/admin/reportes' },
  staff_invite: { nome: 'Convite', fem: false, link: '/admin/equipa' },
  staff_role: { nome: 'Acesso', fem: false, link: '/admin/equipa' },
  key_topic: { nome: 'Tema principal', fem: false, link: '/admin/temas-principais' },
  jonas: { nome: 'Jonas', fem: false, link: '/admin/jonas' },
}

const VERBOS: Record<string, string> = {
  create: 'criad', update: 'alterad', delete: 'eliminad', activate: 'activad', archive: 'arquivad', hide: 'ocultad', show: 'mostrad',
  publicada: 'publicad', publish: 'publicad', duplicate: 'duplicad', review: 'revist', unreview: 'marcad', invite: 'convidad', revoke: 'revogad', remove: 'removid',
  resolvido: 'resolvid', save: 'guardad', generate: 'gerad',
}

/** «subject.archive» + «subject» → «Disciplina arquivada». O que não se conhece fica com o nome da ação. */
export function descreverAcao(action: string, entity: string, entityId: string | null, detail?: Record<string, unknown> | null): AvisoNovo {
  const meta = ENTIDADES[entity]
  const verbo = VERBOS[action.split('.')[1] ?? '']
  const nome = [detail?.name, detail?.shortName, detail?.title].find((valor) => typeof valor === 'string' && valor) as string | undefined
  const base = meta && verbo ? `${meta.nome} ${verbo}${meta.fem ? 'a' : 'o'}` : `Ação: ${action}`
  const perigosa = /\.(delete|archive|hide|remove|revoke)$/.test(action)
  return {
    kind: action,
    level: perigosa ? 'aviso' : 'info',
    title: nome ? `${base}: ${nome}` : base,
    body: null,
    link: meta?.link ?? null,
    data: entityId ? { entity, entityId } : { entity },
  }
}
