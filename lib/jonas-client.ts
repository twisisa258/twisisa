// Leitura de respostas em fluxo no navegador. Sem dependências: serve o chat e a explicação do Simulador.

export class JonasRequestError extends Error {
  readonly status: number
  /** Cabeçalhos da resposta de erro (o servidor indica a conversa criada, para a repetição a poder reaproveitar). */
  readonly headers: Headers | null
  constructor(message: string, status: number, headers: Headers | null = null) {
    super(message)
    this.status = status
    this.headers = headers
  }
}

/** Lê o corpo como texto, chamando `onText` com o texto acumulado a cada pedaço. */
export async function readTextStream(response: Response, onText: (text: string) => void): Promise<string> {
  if (!response.body) {
    const text = await response.text()
    onText(text)
    return text
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onText(text)
  }
  text += decoder.decode()
  onText(text)
  return text
}

/** POST com resposta em fluxo. Erros do servidor (JSON `{ error }`) viram `JonasRequestError` com a mensagem pronta para o aluno. */
export async function postStream(url: string, body: unknown, onText: (text: string) => void, signal?: AbortSignal): Promise<{ text: string; headers: Headers }> {
  let response: Response
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal, credentials: 'same-origin' })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new JonasRequestError('Sem ligação. Verifica a internet e tenta de novo.', 0)
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new JonasRequestError(data?.error ?? 'O Jonas não conseguiu responder. Tenta de novo.', response.status, response.headers)
  }
  const text = await readTextStream(response, onText)
  return { text, headers: response.headers }
}
