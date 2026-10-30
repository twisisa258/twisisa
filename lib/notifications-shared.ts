// Apresentação das notificações (pura, sem acesso à base de dados).

const KINDS: Record<string, string> = {
  'boas-vindas': 'Boas-vindas',
  promo: 'Novidade',
  system: 'Aviso',
}

export function kindLabel(kind: string) {
  return KINDS[kind] ?? 'Aviso'
}

/** Primeira linha do texto, para a lista (a mensagem inteira só aparece ao abrir). */
export function previewOf(body: string) {
  return body.replace(/\s+/g, ' ').trim()
}

/** Só imagens https. */
export function safeImage(url: string | null | undefined) {
  return url && /^https:\/\//i.test(url) ? url : null
}

/** Só caminhos internos («/biblioteca») ou ligações https. */
export function safeAction(href: string | null | undefined) {
  if (!href) return null
  if (href.startsWith('/') && !href.startsWith('//')) return href
  return /^https:\/\//i.test(href) ? href : null
}
