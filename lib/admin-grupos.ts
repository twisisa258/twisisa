// Como a navegação do admin se agrupa. Só endereços (sem ícones), para se poder testar.
// Uma secção nova em lib/admin-sections.ts que não esteja aqui aparece sozinha num grupo «Outros»: nada desaparece do menu.

export type GrupoAdmin = { id: string; titulo: string | null; hrefs: string[]; fechado?: boolean }

export const GRUPOS_ADMIN: GrupoAdmin[] = [
  { id: 'painel', titulo: null, hrefs: ['/admin'] },
  // O caminho de um exame, por ordem: carregar o PDF → o Jonas lê → rever o que falta → publicar no banco.
  { id: 'fluxo', titulo: 'Fluxo de conteúdo', hrefs: ['/admin/materiais', '/admin/importar', '/admin/revisao', '/admin/questoes'] },
  { id: 'publicacao', titulo: 'Publicação', hrefs: ['/admin/temas-principais', '/admin/blog', '/admin/anuncios'] },
  { id: 'catalogo', titulo: 'Catálogo', fechado: true, hrefs: ['/admin/instituicoes', '/admin/cursos', '/admin/disciplinas', '/admin/temas', '/admin/variantes', '/admin/classificacao', '/admin/modulos'] },
  { id: 'qualidade', titulo: 'Qualidade', hrefs: ['/admin/reportes', '/admin/notificacoes'] },
  { id: 'sistema', titulo: 'Sistema', hrefs: ['/admin/jonas', '/admin/equipa'] },
]

/** Endereços que estão em mais do que um grupo (não devia haver nenhum). */
export function hrefsRepetidos(grupos: GrupoAdmin[] = GRUPOS_ADMIN): string[] {
  const vistos = new Set<string>()
  const repetidos = new Set<string>()
  for (const grupo of grupos) for (const href of grupo.hrefs) (vistos.has(href) ? repetidos : vistos).add(href)
  return [...repetidos]
}
