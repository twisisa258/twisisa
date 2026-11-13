import { grupoDaSecao, grupoPorId } from '@/lib/admin-grupos'

export type Migalha = { label: string; href?: string }

const EXTRA: Record<string, string> = { nova: 'Nova', novo: 'Novo', importar: 'Importar', editar: 'Editar' }

/**
 * O caminho da página atual no topo do admin: «Fluxo de conteúdo › Banco de questões › Nova».
 * Só a última migalha não é ligação. Páginas que não conhece ficam com «Administração».
 */
export function migalhasDe(pathname: string, secoes: { href: string; label: string }[]): Migalha[] {
  const limpo = pathname.replace(/\/+$/, '') || '/admin'
  if (limpo === '/admin') return [{ label: 'Painel' }]

  const grupo = /^\/admin\/grupo\/([^/]+)$/.exec(limpo)
  if (grupo) {
    const alvo = grupoPorId(grupo[1])
    return [{ label: 'Administração', href: '/admin' }, { label: alvo?.titulo ?? 'Grupo' }]
  }

  const secao = [...secoes].sort((a, b) => b.href.length - a.href.length).find((item) => limpo === item.href || limpo.startsWith(`${item.href}/`))
  if (!secao) return [{ label: 'Administração', href: '/admin' }]

  const migalhas: Migalha[] = []
  const dono = grupoDaSecao(secao.href)
  if (dono?.titulo) migalhas.push({ label: dono.titulo, href: `/admin/grupo/${dono.id}` })
  const resto = limpo.slice(secao.href.length).split('/').filter(Boolean)
  migalhas.push(resto.length > 0 ? { label: secao.label, href: secao.href } : { label: secao.label })
  if (resto.length > 0) migalhas.push({ label: EXTRA[resto[0]] ?? 'Detalhe' })
  return migalhas
}
