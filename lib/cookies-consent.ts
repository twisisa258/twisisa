// Escolha de cookies de estatísticas (Google Analytics). Fica só neste aparelho (localStorage).
// Sem escolha = recusado: o Google Analytics só guarda cookies depois de o aluno aceitar (consentimento «analytics_storage»).
export const CHAVE_COOKIES = 'tw:cookies:v1'
export const EVENTO_ABRIR_COOKIES = 'tw:cookies:abrir'
export type EscolhaCookies = 'aceite' | 'recusado'

export function lerEscolhaCookies(): EscolhaCookies | null {
  try {
    const valor = window.localStorage.getItem(CHAVE_COOKIES)
    return valor === 'aceite' || valor === 'recusado' ? valor : null
  } catch {
    return null
  }
}

export function guardarEscolhaCookies(escolha: EscolhaCookies) {
  try {
    window.localStorage.setItem(CHAVE_COOKIES, escolha)
  } catch {
    // Sem armazenamento (modo privado): a pergunta volta na próxima visita.
  }
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  gtag?.('consent', 'update', { analytics_storage: escolha === 'aceite' ? 'granted' : 'denied' })
}
