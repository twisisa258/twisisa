// Como a navegação do admin se agrupa. Só endereços (sem ícones), para se poder testar.
// Uma secção nova em lib/admin-sections.ts que não esteja aqui aparece sozinha num grupo «Outros»: nada desaparece do menu.
// Cada grupo com título tem uma página própria (/admin/grupo/<id>) que lista as suas secções.

export type GrupoAdmin = { id: string; titulo: string | null; descricao?: string; hrefs: string[]; fechado?: boolean }

export const GRUPOS_ADMIN: GrupoAdmin[] = [
  { id: 'painel', titulo: null, hrefs: ['/admin'] },
  // O caminho de um exame, por ordem: carregar o PDF → o Jonas lê → rever o que falta → publicar no banco.
  { id: 'fluxo', titulo: 'Fluxo de conteúdo', descricao: 'O caminho de um exame: carregar, importar, rever e publicar.', hrefs: ['/admin/materiais', '/admin/importar', '/admin/revisao', '/admin/questoes'] },
  { id: 'publicacao', titulo: 'Publicação', descricao: 'O que os alunos leem fora do Simulador.', hrefs: ['/admin/temas-principais', '/admin/blog', '/admin/anuncios'] },
  { id: 'catalogo', titulo: 'Catálogo', descricao: 'As instituições, os cursos, as disciplinas e a classificação.', fechado: true, hrefs: ['/admin/instituicoes', '/admin/cursos', '/admin/disciplinas', '/admin/temas', '/admin/variantes', '/admin/classificacao', '/admin/modulos'] },
  { id: 'qualidade', titulo: 'Qualidade', descricao: 'O que os alunos reportam e o que acontece na administração.', hrefs: ['/admin/reportes', '/admin/notificacoes'] },
  { id: 'sistema', titulo: 'Sistema', descricao: 'O Jonas e quem tem acesso.', hrefs: ['/admin/jonas', '/admin/equipa'] },
]

export function grupoPorId(id: string): GrupoAdmin | undefined {
  return GRUPOS_ADMIN.find((grupo) => grupo.id === id && grupo.titulo)
}

export function grupoDaSecao(href: string): GrupoAdmin | undefined {
  return GRUPOS_ADMIN.find((grupo) => grupo.hrefs.includes(href))
}

/** Endereços que estão em mais do que um grupo (não devia haver nenhum). */
export function hrefsRepetidos(grupos: GrupoAdmin[] = GRUPOS_ADMIN): string[] {
  const vistos = new Set<string>()
  const repetidos = new Set<string>()
  for (const grupo of grupos) for (const href of grupo.hrefs) (vistos.has(href) ? repetidos : vistos).add(href)
  return [...repetidos]
}
