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
