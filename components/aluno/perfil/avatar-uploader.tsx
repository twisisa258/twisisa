'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { avatarUrl } from '@/lib/perfil'
import { saveAvatar } from '@/app/aluno/perfil/actions'

const MAX_SIDE = 640
const MAX_INPUT_MB = 12

// Reduz a foto no próprio aparelho (as fotos de telemóvel têm vários MB) antes de a enviar.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível preparar a foto.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível preparar a foto.'))), 'image/jpeg', 0.86))
}

// Foto de perfil. Estados: a carregar a imagem (pulso), a enviar (círculo com spinner) e erro (mensagem).
export function AvatarUploader({ name, image }: { name: string; image: string | null }) {
  const feedback = useFeedback()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(image)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const src = preview ?? avatarUrl(url, 192)

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file || busy) return
    if (!file.type.startsWith('image/')) return feedback.error('Escolhe uma imagem (JPG, PNG ou WebP).')
    if (file.size > MAX_INPUT_MB * 1024 * 1024) return feedback.error(`A foto é demasiado grande. O limite é ${MAX_INPUT_MB} MB.`)

    const local = URL.createObjectURL(file)
    setPreview(local)
    setBusy(true)
    try {
      const blob = await shrink(file)
      const signResponse = await fetch('/api/aluno/cloudinary-sign', { method: 'POST' })
      const sign = await signResponse.json()
      if (!signResponse.ok) throw new Error(sign.error ?? 'Não foi possível preparar o envio.')

      const body = new FormData()
      body.append('file', blob, 'foto.jpg')
      for (const key of ['api_key', 'timestamp', 'signature', 'folder', 'public_id', 'overwrite', 'invalidate', 'allowed_formats']) {
        body.append(key, String(key === 'api_key' ? sign.apiKey : sign[key]))
      }
      const response = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: 'POST', body })
      const result = (await response.json()) as { secure_url?: string }
      if (!response.ok || !result.secure_url) throw new Error('O envio da foto falhou. Tenta outra vez.')

      const saved = await saveAvatar(result.secure_url)
      if (!saved.ok) throw new Error(saved.message)
      setLoaded(false)
      setUrl(result.secure_url)
      router.refresh()
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : 'Não foi possível enviar a foto.')
    } finally {
      URL.revokeObjectURL(local)
      setPreview(null)
      setBusy(false)
    }
  }

  async function remove() {
    if (busy) return
    setBusy(true)
    const result = await saveAvatar('').catch(() => null)
    if (result?.ok) {
      setUrl(null)
      router.refresh()
    } else {
      feedback.error(result?.message ?? 'Não foi possível remover a foto.')
    }
    setBusy(false)
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <label className="relative block size-20 cursor-pointer rounded-full sm:size-24" aria-label="Alterar foto de perfil">
        <span className={`relative flex size-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#e1ece5] to-[#cfe0d5] text-2xl font-semibold text-[#1d4d41] ${src && !loaded && !preview ? 'animate-pulse motion-reduce:animate-none' : ''}`}>
          {src ? (
            <img src={src} alt="" onLoad={() => setLoaded(true)} className={`size-full object-cover transition-opacity duration-300 ${loaded || preview ? 'opacity-100' : 'opacity-0'}`} />
          ) : (
            name.trim().slice(0, 1).toUpperCase()
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-[#1d4d41]" role="status" aria-label="A enviar a foto">
              <Spinner className="size-6" />
            </span>
          )}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full border-2 border-[#f8f8f5] bg-[#1d4d41] text-white" aria-hidden="true">
          <Camera size={14} />
        </span>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} disabled={busy} className="sr-only" />
      </label>
      {url && !busy && (
        <button type="button" onClick={remove} className="text-[11px] font-semibold text-[#737c75] hover:text-[#1d4d41]">
          Remover
        </button>
      )}
    </div>
  )
}
