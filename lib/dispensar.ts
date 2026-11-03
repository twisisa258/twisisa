// «Fechar» cartões e avisos no telemóvel do aluno. Fica guardado só neste aparelho (localStorage).
// days = nº de dias até voltar a aparecer; sem days, não volta a aparecer.
const PREFIXO = 'tw:fechado:'

export function foiFechado(id: string): boolean {
  try {
    const valor = window.localStorage.getItem(PREFIXO + id)
    if (valor === null) return false
    const ate = Number(valor)
    if (ate > 0 && ate < Date.now()) {
      window.localStorage.removeItem(PREFIXO + id)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function fechar(id: string, days?: number) {
  try {
    window.localStorage.setItem(PREFIXO + id, String(days ? Date.now() + days * 86_400_000 : 0))
  } catch {
    // Sem armazenamento (modo privado): o cartão volta na próxima visita, nada mais.
  }
}

/** Data local AAAA-MM-DD, para avisos que só valem por um dia. */
export function hoje() {
  return new Date().toLocaleDateString('sv-SE')
}

/**
 * No máximo uma janela (modal) por dia, por aparelho. Quem chamar primeiro leva o dia; os outros ficam para amanhã.
 * Ordem na página: notificações, instalar a app, novidade.
 */
export function reservarModalHoje(): boolean {
  try {
    const chave = PREFIXO + 'modal-dia'
    if (window.localStorage.getItem(chave) === hoje()) return false
    window.localStorage.setItem(chave, hoje())
    return true
  } catch {
    return true
  }
}
