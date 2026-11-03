#!/data/data/com.termux/files/usr/bin/bash
# Twisisa: corrige o web-push. Corre na raiz do projecto (onde está o package.json).
set -e

[ -f package.json ] && [ -f lib/push.ts ] && [ -f components/aluno/push-toggle.tsx ] && [ -f app/api/push/teste/route.ts ] || {
  echo "Corre este script na raiz do projecto twisisa."
  exit 1
}

cat > lib/push.ts <<'EOF'
import 'server-only'

import { randomBytes, randomUUID } from 'node:crypto'
import webpush from 'web-push'
import { pool } from '@/lib/db'
import { siteBaseUrl } from '@/lib/email'

// Web push: o aluno liga no telemóvel (/aluno/lembretes) e o servidor envia com as chaves VAPID.
// Variáveis: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e, opcional, VAPID_SUBJECT (mailto: ou https:).

export type PushPayload = { title: string; body: string; url: string }
export type PushReport = { total: number; ok: number; removed: number; statuses: number[] }

let configured = false
let configError: string | null = null

function vapidSubject() {
  const given = process.env.VAPID_SUBJECT?.trim()
  if (given) return given
  const replyTo = process.env.EMAIL_REPLY_TO?.trim()
  return replyTo ? `mailto:${replyTo}` : siteBaseUrl()
}

export function pushConfigured() {
  if (configured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!publicKey || !privateKey) {
    configError = 'Chaves VAPID em falta no servidor.'
    return false
  }
  try {
    webpush.setVapidDetails(vapidSubject(), publicKey, privateKey)
    configured = true
    configError = null
    return true
  } catch (error) {
    configError = error instanceof Error ? error.message : 'Chaves VAPID inválidas.'
    console.error('[PUSH] configuração inválida:', configError)
    return false
  }
}

export function pushConfigError() {
  return configError
}

/** Envia a todos os aparelhos do aluno e devolve o detalhe. Aparelhos mortos (404/410) são apagados. */
export async function pushToUserReport(userId: string, payload: PushPayload): Promise<PushReport> {
  const report: PushReport = { total: 0, ok: 0, removed: 0, statuses: [] }
  if (!pushConfigured()) return report
  const subs = (await pool.query(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, [userId])).rows as { id: string; endpoint: string; p256dh: string; auth: string }[]
  report.total = subs.length
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 })
      await pool.query(`UPDATE push_subscriptions SET last_ok_at = now(), failures = 0 WHERE id = $1`, [sub.id])
      report.ok++
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode
      if (typeof status === 'number') report.statuses.push(status)
      if (status === 404 || status === 410) {
        await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id])
        report.removed++
      } else if (status === 401 || status === 403) {
        // Chaves VAPID que o serviço de push não aceita: problema de configuração, não do aparelho. Não apagar.
        console.error('[PUSH] chaves recusadas pelo serviço de push', status, (error as { body?: string })?.body ?? '')
      } else {
        console.error('[PUSH] falha', status ?? error)
        await pool.query(`UPDATE push_subscriptions SET failures = failures + 1 WHERE id = $1`, [sub.id])
        await pool.query(`DELETE FROM push_subscriptions WHERE id = $1 AND failures >= 5`, [sub.id])
      }
    }
  }
  return report
}

/** Envia a todos os aparelhos do aluno. Devolve quantos receberam. */
export async function pushToUser(userId: string, payload: PushPayload): Promise<number> {
  return (await pushToUserReport(userId, payload)).ok
}

export async function saveSubscription(userId: string, input: { endpoint: string; p256dh: string; auth: string; userAgent: string | null }) {
  await pool.query(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = $2, p256dh = $4, auth = $5, user_agent = $6, failures = 0`,
    [randomUUID(), userId, input.endpoint, input.p256dh, input.auth, input.userAgent],
  )
  await pool.query(
    `INSERT INTO notification_prefs (user_id, email_enabled, push_enabled, categories, unsubscribe_token) VALUES ($1, false, true, $2::jsonb, $3)
     ON CONFLICT (user_id) DO UPDATE SET push_enabled = true, categories = notification_prefs.categories || '{"study": true}'::jsonb, updated_at = now()`,
    [userId, JSON.stringify({ study: true, summary: true, promo: false }), randomBytes(24).toString('hex')],
  )
}

export async function removeSubscription(userId: string, endpoint: string) {
  await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [userId, endpoint])
  await pool.query(
    `UPDATE notification_prefs SET push_enabled = EXISTS (SELECT 1 FROM push_subscriptions WHERE user_id = $1), updated_at = now() WHERE user_id = $1`,
    [userId],
  )
}
EOF

cat > app/api/push/teste/route.ts <<'EOF'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pushConfigError, pushConfigured, pushToUserReport } from '@/lib/push'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'A tua sessão expirou. Inicia sessão outra vez.' }, { status: 401 })
  if (!pushConfigured()) return NextResponse.json({ error: `As notificações não estão configuradas no servidor. ${pushConfigError() ?? ''}`.trim() }, { status: 503 })
  const report = await pushToUserReport(session.user.id, { title: 'Twisisa', body: 'Está a funcionar. Os lembretes de estudo chegam assim.', url: '/aluno/lembretes' })
  if (report.ok > 0) return NextResponse.json({ ok: true, sent: report.ok })
  if (report.total === 0) return NextResponse.json({ error: 'Este aparelho não está registado no servidor. Desliga e liga outra vez.' }, { status: 502 })
  if (report.statuses.some((s) => s === 401 || s === 403)) return NextResponse.json({ error: 'O serviço de notificações recusou as chaves do servidor. Confirma que VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY são do mesmo par, faz novo deploy, desliga e liga outra vez neste aparelho.' }, { status: 502 })
  if (report.removed > 0) return NextResponse.json({ error: 'O registo deste aparelho tinha expirado e foi apagado. Desliga e liga outra vez.' }, { status: 502 })
  return NextResponse.json({ error: `Não foi possível enviar para este aparelho (código ${report.statuses.join(', ') || 'desconhecido'}). Desliga e liga outra vez.` }, { status: 502 })
}
EOF

cat > components/aluno/push-toggle.tsx <<'EOF'
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

type Estado = 'a-ver' | 'sem-suporte' | 'instalar' | 'sem-chave' | 'bloqueado' | 'desligado' | 'ligado'

function chaveParaBytes(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

// Um registo antigo, criado com outra chave VAPID, é recusado pelo serviço de push (403) sem avisar o aluno.
function mesmaChave(sub: PushSubscription, chave: string) {
  const atual = sub.options?.applicationServerKey
  if (!atual) return true
  const a = new Uint8Array(atual)
  const b = chaveParaBytes(chave)
  return a.length === b.length && a.every((valor, i) => valor === b[i])
}

async function registo() {
  return (await navigator.serviceWorker.getRegistration('/sw.js')) ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/' }))
}

// Notificações no telemóvel. Cada estado diz ao aluno o que fazer; nada falha em silêncio.
export function PushToggle({ publicKey }: { publicKey: string }) {
  const chave = publicKey.trim()
  const [estado, setEstado] = useState<Estado>('a-ver')
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const ver = useCallback(async () => {
    const suporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const instalada = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!suporta) return setEstado(ios && !instalada ? 'instalar' : 'sem-suporte')
    if (!chave) return setEstado('sem-chave')
    if (Notification.permission === 'denied') return setEstado('bloqueado')
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = await reg?.pushManager.getSubscription()
    if (sub && !mesmaChave(sub, chave)) {
      // Registo feito com outra chave: apaga-o para o aluno poder ligar de novo com a chave actual.
      await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined)
      await sub.unsubscribe().catch(() => undefined)
      setAviso('As notificações deste aparelho tinham de ser renovadas. Toca em «Ligar».')
      return setEstado('desligado')
    }
    setEstado(sub && Notification.permission === 'granted' ? 'ligado' : 'desligado')
  }, [chave])

  useEffect(() => { void ver().catch(() => setEstado('sem-suporte')) }, [ver])

  async function ligar() {
    setOcupado(true)
    setAviso(null)
    try {
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'bloqueado' : 'desligado')
        return
      }
      const reg = await registo()
      await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (sub && !mesmaChave(sub, chave)) {
        await sub.unsubscribe().catch(() => undefined)
        sub = null
      }
      sub = sub ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave) }))
      const resposta = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) })
      if (!resposta.ok) {
        await sub.unsubscribe().catch(() => undefined)
        throw new Error((await resposta.json().catch(() => null))?.error ?? 'Não foi possível guardar.')
      }
      setEstado('ligado')
    } catch (erro) {
      setAviso(erro instanceof Error && erro.message ? erro.message : 'Não foi possível ligar as notificações. Tenta outra vez.')
    } finally {
      setOcupado(false)
    }
  }

  async function desligar() {
    setOcupado(true)
    setAviso(null)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
        await sub.unsubscribe()
      }
      setEstado('desligado')
    } catch {
      setAviso('Não foi possível desligar. Tenta outra vez.')
    } finally {
      setOcupado(false)
    }
  }

  async function testar() {
    setOcupado(true)
    setAviso(null)
    const resposta = await fetch('/api/push/teste', { method: 'POST' }).catch(() => null)
    const dados = await resposta?.json().catch(() => null)
    setAviso(resposta?.ok ? 'Enviada. Deve chegar em segundos. Se não chegar, vê se as notificações do navegador estão permitidas nas definições do telemóvel.' : (dados?.error ?? 'Sem ligação. Tenta outra vez.'))
    setOcupado(false)
  }

  const textos: Partial<Record<Estado, string>> = {
    'sem-suporte': 'Este navegador não permite notificações. Experimenta no Chrome do Android.',
    instalar: 'No iPhone, instala primeiro a Twisisa: toca em Partilhar e depois em «Adicionar ao ecrã principal». Abre-a a partir do ícone e volta aqui.',
    'sem-chave': 'As notificações ainda não estão configuradas no servidor.',
    bloqueado: 'As notificações estão bloqueadas para este site. Permite-as nas definições do navegador (ícone junto ao endereço) e recarrega a página.',
  }
  const ligado = estado === 'ligado'
  const Icon = ligado ? Bell : BellOff

  return (
    <div className="max-w-[520px] rounded-2xl border border-linha bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${ligado ? 'bg-sucesso-suave text-sucesso-texto' : 'bg-fundo text-texto-2'}`}><Icon size={19} aria-hidden /></span>
          <span>
            <span className="block text-[15px] font-semibold">Notificações no telemóvel</span>
            <span className="block text-[13px] text-texto-2">{ligado ? 'Ligadas neste aparelho.' : 'Um aviso curto no ecrã, sem abrires o e-mail.'}</span>
          </span>
        </div>
        {(estado === 'desligado' || ligado) && (
          <button type="button" disabled={ocupado} onClick={() => void (ligado ? desligar() : ligar())} className={`btn shrink-0 ${ligado ? 'btn-secundario' : 'btn-primario'}`}>{ocupado ? 'A trabalhar…' : ligado ? 'Desligar' : 'Ligar'}</button>
        )}
      </div>
      {textos[estado] && <p role="status" className="mt-3 rounded-xl bg-aviso-suave px-3 py-2 text-[13px] text-aviso-texto">{textos[estado]}</p>}
      {ligado && <button type="button" disabled={ocupado} onClick={() => void testar()} className="btn btn-terciario mt-3">Enviar uma notificação de teste</button>}
      {aviso && <p role="status" className="mt-3 text-[13px] text-texto-2">{aviso}</p>}
    </div>
  )
}
EOF

echo "Ficheiros recriados. A verificar o build..."
npm run build

git add lib/push.ts app/api/push/teste/route.ts components/aluno/push-toggle.tsx
git commit -m "fix(push): chaves VAPID desencontradas, subject robusto e erros claros no teste"
git push
echo "Concluido."
