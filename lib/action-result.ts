// Resultado das acções de servidor. Em produção o Next.js esconde a mensagem de qualquer erro
// lançado por uma acção ("An error occurred in the Server Components render"), por isso as acções
// devolvem o resultado em vez de lançar, e a interface mostra-o no modal de feedback.

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string }

// Erro com mensagem própria para o utilizador. Qualquer outro erro é registado e substituído pela mensagem genérica.
export class AppError extends Error {}

export async function runAction(task: () => Promise<string | void>, fallback: string): Promise<ActionResult> {
  try {
    const message = await task()
    return message ? { ok: true, message } : { ok: true }
  } catch (error) {
    // redirect() e notFound() do Next.js lançam erros de controlo que têm de seguir o seu caminho.
    const digest = error && typeof error === 'object' ? (error as { digest?: unknown }).digest : undefined
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw error
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[ACTION]', fallback, error)
    return { ok: false, message: fallback }
  }
}
