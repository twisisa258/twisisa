'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

const MAX_KB = 1024
const ACCEPT = '.png,.jpg,.jpeg,.webp'

type UploadResult = { secure_url?: string; error?: { message?: string } }

// Carrega o logótipo directamente para o Cloudinary (pasta "logotipos") e guarda o URL no campo `logoUrl`.
export function LogoUpload({ defaultUrl = '', fallbackText = '' }: { defaultUrl?: string; fallbackText?: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef(0)
  const [url, setUrl] = useState(defaultUrl)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    requestRef.current += 1
    const requestId = requestRef.current
    setMessage('')
    if (!file) return
    if (file.size > MAX_KB * 1024) {
      setMessage(`O ficheiro tem ${(file.size / 1024).toFixed(0)} KB. O limite é ${MAX_KB} KB.`)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const signResponse = await fetch('/api/admin/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pasta: 'logotipos' }),
      })
      const sign = await signResponse.json()
      if (!signResponse.ok) throw new Error(sign.error ?? 'Não foi possível preparar o carregamento.')

      const body = new FormData()
      body.append('file', file)
      body.append('api_key', sign.apiKey)
      body.append('timestamp', String(sign.timestamp))
      body.append('signature', sign.signature)
      body.append('folder', sign.folder)
      body.append('use_filename', sign.use_filename)
      body.append('unique_filename', sign.unique_filename)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: 'POST', body })
      const result = (await response.json()) as UploadResult
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message ?? 'O Cloudinary recusou o ficheiro.')
      if (requestId !== requestRef.current) return
      setUrl(result.secure_url)
    } catch (error) {
      if (requestId !== requestRef.current) return
      setMessage(error instanceof Error ? error.message : 'Falha no carregamento.')
    } finally {
      if (requestId === requestRef.current) setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="text-sm font-medium">
      <span>Logótipo <span className="font-normal text-[#737c75]">(PNG, JPG ou WebP, até 1 MB)</span></span>
      <input type="hidden" name="logoUrl" value={url} />
      <div className="mt-1 flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#dfe3d9] bg-[#f3f4ef] text-[10px] font-bold text-[#1d4d41]">
          {url ? <img src={url} alt="" className="size-full object-contain" /> : fallbackText || <ImagePlus size={18} aria-hidden="true" />}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#dfe3d9] bg-white px-3.5 text-sm font-semibold text-[#1d4d41] hover:bg-[#f1f4ef]">
            {uploading ? 'A carregar…' : url ? 'Trocar' : 'Carregar'}
            <input ref={fileRef} type="file" accept={ACCEPT} onChange={onChange} disabled={uploading} className="sr-only" />
          </label>
          {url && !uploading && (
            <button type="button" onClick={() => setUrl('')} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-[#526057] hover:bg-[#f1f4ef]">
              <X size={15} aria-hidden="true" />Remover
            </button>
          )}
        </div>
      </div>
      {message && <p role="alert" className="mt-2 text-xs font-normal text-[#9a3030]">{message}</p>}
    </div>
  )
}
