// Google Analytics 4. O ID vem de NEXT_PUBLIC_GA_ID (formato G-XXXXXXXXXX).
// Sem ID, ou fora de produção, nada é carregado nem enviado.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() ?? ''

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

// Eventos recomendados pelo GA4 usados no site:
// sign_up, login, begin_checkout, purchase.
export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || !GA_ID || process.env.NODE_ENV !== 'production') return
  window.dataLayer = window.dataLayer || []
  // O gtag.js só reconhece objectos `arguments` na dataLayer, por isso a função auxiliar.
  function gtag(_command: string, _name: string, _params: Record<string, unknown>) {
    window.dataLayer!.push(arguments)
  }
  gtag('event', event, params)
}
