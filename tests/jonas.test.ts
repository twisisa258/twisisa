import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { parseInline, parseMarkdown, plainFromMarkdown, splitCells } from '../lib/jonas-markdown'
import { buildChatSystem, buildExplainSystem, describeQuestion, explainConversation, explainUserText, EXPLAIN_LABELS, titleFromMessage, type ExplainQuestion } from '../lib/jonas-prompts'
import { filterConversations, groupConversations } from '../lib/jonas-shared'
import { DEFAULT_GROQ_MODELS, GroqError, groqModels, openGroqStream, readSseDeltas, resetModelMemory } from '../lib/groq'
import { streamReply, studentMessage } from '../lib/jonas-stream'
import { readTextStream } from '../lib/jonas-client'

// ───────────── Formatação (negrito, listas, KaTeX) ─────────────

test('negrito e fórmulas na linha', () => {
  const [p] = parseMarkdown('**Passo 1:** resolve $x^2 - 5x + 6 = 0$.')
  assert.equal(p.t, 'p')
  const nodes = (p as { c: { t: string }[] }).c
  assert.deepEqual(nodes.map((n) => n.t), ['bold', 'text', 'math', 'text'])
})

test('cifrões de dinheiro não viram fórmula; \\$ escapa', () => {
  assert.deepEqual(parseInline('custa $5 e $10'), [{ t: 'text', v: 'custa $5 e $10' }])
  assert.deepEqual(parseInline('um \\$ solto'), [{ t: 'text', v: 'um $ solto' }])
})

test('marcas por fechar ficam como texto (resposta em curso)', () => {
  assert.deepEqual(parseInline('**aberto $x'), [{ t: 'text', v: '**aberto $x' }])
  assert.equal(parseMarkdown('$$\\frac{a}{b}')[0].t, 'p')
})

test('\\( \\) e \\[ \\] passam a $ e $$', () => {
  const blocks = parseMarkdown('\\[ x = \\frac{1}{2} \\] e \\(y\\)')
  assert.equal(blocks[0].t, 'math')
  assert.equal((blocks[1] as { c: { t: string }[] }).c[1].t, 'math')
})

test('listas numeradas com fórmula em bloco e sublistas', () => {
  const [ol] = parseMarkdown('1. Calcula:\n   $$\\Delta = b^2 - 4ac$$\n2. Aplica\n   - a\n   - b')
  assert.equal(ol.t, 'ol')
  const items = (ol as { items: { children: { t: string }[] }[] }).items
  assert.equal(items.length, 2)
  assert.equal(items[0].children[0].t, 'math')
  assert.equal(items[1].children[0].t, 'ul')
})

test('tabelas não partem as barras dentro de fórmulas', () => {
  assert.deepEqual(splitCells('| a | $|x|$ |'), ['a', '$|x|$'])
  const [table] = parseMarkdown('| a | $|x|$ |\n|---|---|\n| 1 | 2 |')
  assert.equal(table.t, 'table')
})

test('nunca devolve HTML: o texto fica como texto', () => {
  const [p] = parseMarkdown('<img src=x onerror=alert(1)> **ok**')
  assert.equal(p.t, 'p')
  assert.equal((p as { c: { t: string; v?: string }[] }).c[0].t, 'text')
})

test('títulos curtos a partir da primeira mensagem', () => {
  assert.equal(titleFromMessage('   '), 'Nova conversa')
  const t = titleFromMessage('Explica-me **a equação** do 2.º grau com $x^2$ por favor, passo a passo e com um exemplo bem detalhado')
  assert.ok(t.length <= 60 && t.endsWith('…') && !t.includes('*') && !t.includes('$'))
  assert.equal(plainFromMarkdown('**a** $b$'), 'a b')
})

// ───────────── Instruções ─────────────

const question: ExplainQuestion = {
  subject: 'Matemática', variant: 'Matemática I', topic: 'Equações', statement: 'Resolve $x^2-5x+6=0$', statementImages: ['parábola'],
  options: [
    { text: 'x=1', imageAlt: null, isCorrect: false, chosen: true },
    { text: 'x=2 ou x=3', imageAlt: null, isCorrect: true, chosen: false },
  ],
  officialExplanation: 'Factoriza (x-2)(x-3).',
}

test('as letras seguem a ordem que o aluno viu', () => {
  const d = describeQuestion(question)
  assert.equal(d.correctLetter, 'B')
  assert.equal(d.chosenLetter, 'A')
  assert.equal(d.wasCorrect, false)
  const system = buildExplainSystem(question, { trackLabel: '12ª classe' })
  assert.match(system, /Opção correta \(confirmada pela equipa\): B/)
  assert.match(system, /<questao>[\s\S]*<\/questao>/)
})

test('o último pedido leva a instrução completa e o histórico é limitado', () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `m${i}` }))
  const messages = explainConversation(question, history, 'passo', '')
  assert.equal(messages.length, 11)
  assert.match(messages[messages.length - 1].content, /O aluno errou/)
  assert.equal(explainUserText('devagar', ''), EXPLAIN_LABELS.devagar)
  assert.equal(explainUserText('pergunta', '  porquê? '), 'porquê?')
})

test('o chat leva o contexto de estudo e a regra de âmbito', () => {
  const system = buildChatSystem({ trackLabel: '10ª classe', subject: 'Física', recentTitles: ['Leis de Newton'] })
  assert.match(system, /10ª classe/)
  assert.match(system, /Disciplina desta conversa: Física/)
  assert.match(system, /Leis de Newton/)
  assert.match(system, /Só posso ajudar com os teus estudos/)
})

// ───────────── Histórico ─────────────

test('conversas agrupadas por data e pesquisa sem acentos', () => {
  const now = new Date(2026, 9, 27, 15, 0)
  const day = (back: number) => new Date(2026, 9, 27 - back, 10, 0).toISOString()
  const items = [
    { id: 'a', title: 'Equação do 2.º grau', updatedAt: day(0) },
    { id: 'b', title: 'Ontem', updatedAt: day(1) },
    { id: 'c', title: 'Semana', updatedAt: day(4) },
    { id: 'd', title: 'Mês', updatedAt: day(20) },
    { id: 'e', title: 'Antiga', updatedAt: day(90) },
  ]
  assert.deepEqual(groupConversations(items, now).map((g) => g.label), ['Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias', 'Mais antigas'])
  assert.deepEqual(filterConversations(items, 'equacao').map((i) => i.id), ['a'])
  assert.equal(filterConversations(items, '  ').length, 5)
})

// ───────────── Groq (servidor falso) ─────────────

function sse(deltas: string[]) {
  return deltas.map((d) => `data: ${JSON.stringify({ choices: [{ delta: { content: d } }] })}\n\n`).join('') + 'data: [DONE]\n\n'
}

async function withServer(handler: http.RequestListener, run: (url: string) => Promise<void>) {
  resetModelMemory()
  const server = http.createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const previous = { key: process.env.GROQ_API_KEY, base: process.env.GROQ_BASE_URL }
  process.env.GROQ_API_KEY = 'chave-de-teste'
  process.env.GROQ_BASE_URL = url
  try {
    await run(url)
  } finally {
    process.env.GROQ_API_KEY = previous.key
    process.env.GROQ_BASE_URL = previous.base
    if (previous.key === undefined) delete process.env.GROQ_API_KEY
    if (previous.base === undefined) delete process.env.GROQ_BASE_URL
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
}

test('lê pedaços SSE partidos a meio de uma linha', async () => {
  const text = sse(['Olá ', 'mundo', ' $x^2$'])
  const bytes = new TextEncoder().encode(text)
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7))
      controller.close()
    },
  })
  let out = ''
  for await (const delta of readSseDeltas(stream)) out += delta
  assert.equal(out, 'Olá mundo $x^2$')
})

test('envia o pedido certo à Groq e devolve o texto em fluxo', async () => {
  let received: { auth?: string; body?: { model: string; stream: boolean; messages: { role: string }[] } } = {}
  await withServer(
    (request, response) => {
      let raw = ''
      request.on('data', (chunk) => (raw += chunk))
      request.on('end', () => {
        received = { auth: request.headers.authorization, body: JSON.parse(raw) }
        response.writeHead(200, { 'Content-Type': 'text/event-stream' })
        response.write(sse(['Passo ', '1']))
        response.end()
      })
    },
    async () => {
      let out = ''
      for await (const delta of await openGroqStream({ messages: [{ role: 'user', content: 'oi' }] })) out += delta
      assert.equal(out, 'Passo 1')
      assert.equal(received.auth, 'Bearer chave-de-teste')
      assert.equal(received.body?.stream, true)
      assert.ok(received.body?.model)
    },
  )
})

test('erros da Groq viram mensagens certas para o aluno', async () => {
  await withServer(
    (_request, response) => {
      response.writeHead(429, { 'Content-Type': 'application/json' })
      response.end('{"error":{"message":"rate"}}')
    },
    async () => {
      await assert.rejects(openGroqStream({ messages: [] }), (error: unknown) => error instanceof GroqError && error.kind === 'busy')
      const res = await streamReply({ messages: [], signal: new AbortController().signal, onComplete: async () => undefined })
      assert.equal(res.status, 429)
      assert.match(((await res.json()) as { error: string }).error, /muitos pedidos/)
    },
  )
  const saved = process.env.GROQ_API_KEY
  delete process.env.GROQ_API_KEY
  await assert.rejects(openGroqStream({ messages: [] }), (error: unknown) => error instanceof GroqError && error.kind === 'config')
  const { status, message } = studentMessage(new GroqError('config', 503, 'x'))
  assert.equal(status, 503)
  assert.doesNotMatch(message, /GROQ|chave/i)
  if (saved !== undefined) process.env.GROQ_API_KEY = saved
})

test('streamReply entrega o texto e guarda a resposta completa uma só vez', async () => {
  await withServer(
    (_request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/event-stream' })
      response.write(sse(['**Resposta:** ', 'B']))
      response.end()
    },
    async () => {
      const saved: string[] = []
      const res = await streamReply({ messages: [], signal: new AbortController().signal, headers: { 'X-Conversation-Id': 'c1' }, onComplete: async (text) => void saved.push(text) })
      assert.equal(res.headers.get('X-Conversation-Id'), 'c1')
      const seen: string[] = []
      const full = await readTextStream(res, (t) => seen.push(t))
      assert.equal(full, '**Resposta:** B')
      assert.deepEqual(saved, ['**Resposta:** B'])
      assert.ok(seen.length >= 1)
    },
  )
})

test('se o aluno cancela a meio, o que já chegou fica guardado', async () => {
  await withServer(
    (_request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/event-stream' })
      response.write(sse(['Primeira parte. ']).replace('data: [DONE]\n\n', ''))
      // não termina: o aluno cancela
    },
    async () => {
      const saved: string[] = []
      const res = await streamReply({ messages: [], signal: new AbortController().signal, onComplete: async (text) => void saved.push(text) })
      const reader = (res.body as ReadableStream<Uint8Array>).getReader()
      const first = await reader.read()
      assert.match(new TextDecoder().decode(first.value), /Primeira parte/)
      await reader.cancel()
      assert.deepEqual(saved, ['Primeira parte. '])
    },
  )
})

// ───────────── Escolha do modelo ─────────────

test('por omissão tenta gpt-oss primeiro; GROQ_MODEL aceita vários nomes', () => {
  const saved = process.env.GROQ_MODEL
  delete process.env.GROQ_MODEL
  assert.deepEqual(groqModels(), DEFAULT_GROQ_MODELS)
  assert.equal(DEFAULT_GROQ_MODELS[0], 'openai/gpt-oss-120b')
  process.env.GROQ_MODEL = ' a/um , b/dois ,, '
  assert.deepEqual(groqModels(), ['a/um', 'b/dois'])
  if (saved === undefined) delete process.env.GROQ_MODEL
  else process.env.GROQ_MODEL = saved
})

test('se um modelo não existe na conta, passa ao seguinte sem o aluno notar', async () => {
  const tried: string[] = []
  const saved = process.env.GROQ_MODEL
  process.env.GROQ_MODEL = 'nao/existe,openai/gpt-oss-20b'
  await withServer(
    (request, response) => {
      let raw = ''
      request.on('data', (chunk) => (raw += chunk))
      request.on('end', () => {
        const body = JSON.parse(raw) as { model: string; reasoning_effort?: string; max_completion_tokens: number }
        tried.push(body.model)
        if (body.model === 'nao/existe') {
          response.writeHead(404, { 'Content-Type': 'application/json' })
          return response.end('{"error":{"message":"model not found"}}')
        }
        assert.equal(body.reasoning_effort, 'low')
        assert.ok(body.max_completion_tokens > 1800)
        response.writeHead(200, { 'Content-Type': 'text/event-stream' })
        response.end(sse(['ok']))
      })
    },
    async () => {
      let out = ''
      for await (const delta of await openGroqStream({ messages: [] })) out += delta
      assert.equal(out, 'ok')
      assert.deepEqual(tried, ['nao/existe', 'openai/gpt-oss-20b'])
      // O modelo que falhou fica de castigo: o pedido seguinte nem lhe toca.
      for await (const delta of await openGroqStream({ messages: [] })) void delta
      assert.deepEqual(tried, ['nao/existe', 'openai/gpt-oss-20b', 'openai/gpt-oss-20b'])
    },
  )
  if (saved === undefined) delete process.env.GROQ_MODEL
  else process.env.GROQ_MODEL = saved
})

test('modelos que não são gpt-oss não recebem reasoning_effort', async () => {
  const saved = process.env.GROQ_MODEL
  process.env.GROQ_MODEL = 'llama-3.1-8b-instant'
  let body: Record<string, unknown> = {}
  await withServer(
    (request, response) => {
      let raw = ''
      request.on('data', (chunk) => (raw += chunk))
      request.on('end', () => {
        body = JSON.parse(raw)
        response.writeHead(200, { 'Content-Type': 'text/event-stream' })
        response.end(sse(['x']))
      })
    },
    async () => {
      for await (const delta of await openGroqStream({ messages: [] })) void delta
      assert.equal('reasoning_effort' in body, false)
      assert.equal(body.max_completion_tokens, 1800)
    },
  )
  if (saved === undefined) delete process.env.GROQ_MODEL
  else process.env.GROQ_MODEL = saved
})

test('chave recusada (401) pára logo, sem tentar outros modelos', async () => {
  let calls = 0
  await withServer(
    (_request, response) => {
      calls += 1
      response.writeHead(401, { 'Content-Type': 'application/json' })
      response.end('{"error":{"message":"invalid api key"}}')
    },
    async () => {
      await assert.rejects(openGroqStream({ messages: [] }), (error: unknown) => error instanceof GroqError && error.status === 401)
      assert.equal(calls, 1)
    },
  )
})

test('limite cheio num modelo: usa o seguinte; se todos estão cheios, avisa «muitos pedidos»', async () => {
  const saved = process.env.GROQ_MODEL
  process.env.GROQ_MODEL = 'cheio/um,livre/dois'
  await withServer(
    (request, response) => {
      let raw = ''
      request.on('data', (chunk) => (raw += chunk))
      request.on('end', () => {
        if ((JSON.parse(raw) as { model: string }).model === 'cheio/um') {
          response.writeHead(429)
          return response.end('{}')
        }
        response.writeHead(200, { 'Content-Type': 'text/event-stream' })
        response.end(sse(['livre']))
      })
    },
    async () => {
      let out = ''
      for await (const delta of await openGroqStream({ messages: [] })) out += delta
      assert.equal(out, 'livre')
    },
  )
  process.env.GROQ_MODEL = 'cheio/um,cheio/dois'
  await withServer(
    (_request, response) => {
      response.writeHead(429)
      response.end('{}')
    },
    async () => {
      await assert.rejects(openGroqStream({ messages: [] }), (error: unknown) => error instanceof GroqError && error.kind === 'busy')
    },
  )
  if (saved === undefined) delete process.env.GROQ_MODEL
  else process.env.GROQ_MODEL = saved
})
