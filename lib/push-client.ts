// Notificações no telemóvel, lado do navegador. Usado pelo modal de permissão e pelo interruptor do perfil.

export type ResultadoPush = { ok: true } | { ok: false; motivo: 'sem-suporte' | 'sem-chave' | 'negado' | 'bloqueado' | 'erro'; mensagem: string }

export function chaveParaBytes(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

// Um registo antigo, criado com outra chave VAPID, é recusado pelo serviço de push sem avisar.
function mesmaChave(sub: PushSubscription, chave: string) {
  const atual = sub.options?.applicationServerKey
  if (!atual) return true
  const a = new Uint8Array(atual)
  const b = chaveParaBytes(chave)
  return a.length === b.length && a.every((valor, i) => valor === b[i])
}

export function suportaPush() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function instaladaComoApp() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

async function registo() {
  return (await navigator.serviceWorker.getRegistration('/sw.js')) ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/' }))
}

/** Há registo válido neste aparelho? (só leitura) */
export async function pushLigado(chave: string) {
  if (!suportaPush() || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  const sub = await reg?.pushManager.getSubscription()
  return Boolean(sub && (!chave || mesmaChave(sub, chave)))
}

/** Pede a permissão (tem de vir de um toque do aluno) e regista este aparelho. */
export async function ativarPush(chave: string): Promise<ResultadoPush> {
  if (!suportaPush()) return { ok: false, motivo: 'sem-suporte', mensagem: 'Este navegador não permite notificações.' }
  if (!chave) return { ok: false, motivo: 'sem-chave', mensagem: 'As notificações ainda não estão configuradas no servidor.' }
  try {
    const permissao = await Notification.requestPermission()
    if (permissao === 'denied') return { ok: false, motivo: 'bloqueado', mensagem: 'As notificações estão bloqueadas para este site nas definições do navegador.' }
    if (permissao !== 'granted') return { ok: false, motivo: 'negado', mensagem: 'Não permitiste as notificações.' }
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
      return { ok: false, motivo: 'erro', mensagem: (await resposta.json().catch(() => null))?.error ?? 'Não foi possível guardar.' }
    }
    return { ok: true }
  } catch {
    return { ok: false, motivo: 'erro', mensagem: 'Não foi possível ligar as notificações. Tenta outra vez.' }
  }
}

/** Retira o registo deste aparelho (o servidor apaga os outros ao desligar os lembretes). */
export async function desativarPush() {
  if (!suportaPush()) return
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined)
  await sub.unsubscribe().catch(() => undefined)
}
