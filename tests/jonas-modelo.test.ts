import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { MAX_ADMIN_MODELS, isReasoningEffort, isValidModelName, normalizeModelList, openGroqStream, resetModelMemory, testGroqModel } from '../lib/groq'

test('nomes de modelo: aceita os da Groq e recusa lixo', () => {
  for (const ok of ['openai/gpt-oss-120b', 'llama-3.1-8b-instant', 'meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3-32b']) assert.equal(isValidModelName(ok), true, ok)
  for (const bad of ['', ' ', 'a b', '-começa-mal', 'x;rm -rf', 'a'.repeat(101), '<script>']) assert.equal(isValidModelName(bad), false, bad)
})

test('normalizeModelList: tira vazios, repetidos e inválidos, e limita o tamanho', () => {
  assert.deepEqual(normalizeModelList([' a/um ', '', 'a/um', 'b/dois', 'nao vale', 'c/tres', 'd/quatro']), ['a/um', 'b/dois', 'c/tres'])
  assert.equal(MAX_ADMIN_MODELS, 3)
  assert.deepEqual(normalizeModelList([1, null, undefined, {}]), [])
})

test('esforço de raciocínio: só low, medium e high', () => {
  assert.equal(isReasoningEffort('medium'), true)
  assert.equal(isReasoningEffort('extreme'), false)
  assert.equal(isReasoningEffort(undefined), false)
})

// Servidor falso que guarda os pedidos recebidos.
async function withServer(handler: (body: Record<string, unknown>, res: http.ServerResponse) => void, run: (url: string) => Promise<void>) {
  const server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => handler(raw ? (JSON.parse(raw) as Record<string, unknown>) : {}, res))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const previous = { key: process.env.GROQ_API_KEY, base: process.env.GROQ_BASE_URL, model: process.env.GROQ_MODEL }
  process.env.GROQ_API_KEY = 'chave-de-teste'
  process.env.GROQ_BASE_URL = url
  resetModelMemory()
  try {
    await run(url)
  } finally {
    server.close()
    for (const [name, value] of [['GROQ_API_KEY', previous.key], ['GROQ_BASE_URL', previous.base], ['GROQ_MODEL', previous.model]] as const) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
}

test('os modelos e o esforço do painel têm prioridade sobre GROQ_MODEL', async () => {
  const seen: Record<string, unknown>[] = []
  await withServer(
    (body, res) => {
      seen.push(body)
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.end('data: {"choices":[{"delta":{"content":"ola"}}]}\n\ndata: [DONE]\n\n')
    },
    async () => {
      process.env.GROQ_MODEL = 'env/modelo'
      let out = ''
      for await (const delta of await openGroqStream({ messages: [{ role: 'user', content: 'oi' }], models: ['openai/gpt-oss-20b'], reasoningEffort: 'high' })) out += delta
      assert.equal(out, 'ola')
      assert.equal(seen[0].model, 'openai/gpt-oss-20b')
      assert.equal(seen[0].reasoning_effort, 'high')
      assert.equal(seen[0].max_completion_tokens, 1800 + 4000)
    },
  )
})

test('sem modelos do painel, continua a valer GROQ_MODEL', async () => {
  const seen: Record<string, unknown>[] = []
  await withServer(
    (body, res) => {
      seen.push(body)
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.end('data: {"choices":[{"delta":{"content":"x"}}]}\n\ndata: [DONE]\n\n')
    },
    async () => {
      process.env.GROQ_MODEL = 'env/modelo'
      for await (const delta of await openGroqStream({ messages: [] })) void delta
      assert.equal(seen[0].model, 'env/modelo')
      assert.equal('reasoning_effort' in seen[0], false)
    },
  )
})

test('testGroqModel: sucesso, chave recusada e chave em falta (sem expor a chave)', async () => {
  await withServer(
    (body, res) => {
      if (body.model === 'bom/modelo') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{"choices":[{"message":{"content":"ok"}}]}')
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end('{"error":{"message":"chave-de-teste invalida"}}')
      }
    },
    async () => {
      const good = await testGroqModel('bom/modelo')
      assert.equal(good.ok, true)
      const refused = await testGroqModel('mau/modelo')
      assert.equal(refused.ok, false)
      assert.ok(!refused.message.includes('chave-de-teste'))
      delete process.env.GROQ_API_KEY
      const missing = await testGroqModel('bom/modelo')
      assert.equal(missing.ok, false)
      assert.match(missing.message, /GROQ_API_KEY/)
    },
  )
})
