'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, FileText, X } from 'lucide-react'

const MAX_MB = 10
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp'

type Phase = 'idle' | 'uploading' | 'done' | 'error'
type UploadResult = { secure_url?: string; error?: { message?: string } }

export function MaterialUpload({ inputClassName }: { inputClassName: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const requestRef = useRef(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')

  // Impede a submissão do formulário enquanto o documento não estiver carregado.
  useEffect(() => {
    const input = fileRef.current
    if (!input) return
    const text =
      phase === 'done'
        ? ''
        : phase === 'uploading'
          ? 'Aguarda o fim do carregamento do documento.'
          : phase === 'error'
            ? 'O carregamento falhou. Escolhe o documento outra vez.'
            : 'Carrega o documento antes de publicar.'
    input.setCustomValidity(text)
  }, [phase])

  function reset() {
    requestRef.current += 1
    xhrRef.current?.abort()
    if (fileRef.current) fileRef.current.value = ''
    setPhase('idle')
    setProgress(0)
    setMessage('')
    setFileUrl('')
    setFileName('')
  }

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    requestRef.current += 1
    const requestId = requestRef.current
    xhrRef.current?.abort()
    setFileUrl('')
    setFileName('')
    setMessage('')
    if (!file) {
      setPhase('idle')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setPhase('error')
      setMessage(`O ficheiro tem ${(file.size / 1048576).toFixed(1)} MB. O limite é ${MAX_MB} MB.`)
      return
    }

    setPhase('uploading')
    setProgress(0)
    try {
      const signResponse = await fetch('/api/admin/cloudinary-sign', { method: 'POST' })
      const sign = await signResponse.json()
      if (!signResponse.ok) throw new Error(sign.error ?? 'Não foi possível preparar o carregamento.')
      if (requestId !== requestRef.current) return

      const body = new FormData()
      body.append('file', file)
      body.append('api_key', sign.apiKey)
      body.append('timestamp', String(sign.timestamp))
      body.append('signature', sign.signature)
      body.append('folder', sign.folder)
      body.append('use_filename', sign.use_filename)
      body.append('unique_filename', sign.unique_filename)

      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`)
        xhr.upload.onprogress = (progressEvent) => {
          if (progressEvent.lengthComputable && requestId === requestRef.current) {
            setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100))
          }
        }
        xhr.onload = () => {
          let data: UploadResult | null = null
          try {
            data = JSON.parse(xhr.responseText) as UploadResult
          } catch {
            data = null
          }
          if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url) resolve(data)
          else reject(new Error(data?.error?.message ?? 'O Cloudinary recusou o ficheiro.'))
        }
        xhr.onerror = () => reject(new Error('Sem ligação ao Cloudinary. Verifica a internet e tenta outra vez.'))
        xhr.onabort = () => reject(new Error('Carregamento cancelado.'))
        xhr.send(body)
      })

      if (requestId !== requestRef.current) return
      setFileUrl(result.secure_url ?? '')
      setFileName(file.name)
      setPhase('done')
    } catch (error) {
      if (requestId !== requestRef.current) return
      setPhase('error')
      setMessage(error instanceof Error ? error.message : 'Falha no carregamento.')
    }
  }

  return (
    <div className="grid gap-3">
      <div>
        <label htmlFor="material-file" className="text-sm font-medium">Documento *</label>
        <input
          ref={fileRef}
          id="material-file"
          type="file"
          required
          accept={ACCEPT}
          onChange={onChange}
          className={`${inputClassName} file:mr-3 file:rounded-lg file:border-0 file:bg-[#e6f0e9] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#1d4d41]`}
        />
        <span className="mt-1 block text-xs font-normal text-[#737c75]">
          PDF, Word, PowerPoint, Excel ou imagem. Máximo {MAX_MB} MB.
        </span>
      </div>

      {phase === 'uploading' && (
        <div role="status" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-[#e6f0e9]">
            <div className="h-full rounded-full bg-[#1d4d41] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-[#737c75]">A carregar… {progress}%</p>
        </div>
      )}

      {phase === 'error' && (
        <p role="alert" className="flex items-start justify-between gap-3 rounded-xl bg-[#fbeeee] px-4 py-3 text-sm text-[#9a3030]">
          <span>{message}</span>
          <button type="button" onClick={reset} aria-label="Limpar" className="shrink-0"><X size={16} /></button>
        </p>
      )}

      {phase === 'done' && (
        <div className="rounded-xl border border-[#dbe8df] bg-[#f3f8f4] p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-[#1d4d41]">
            <Check size={16} /> Documento carregado
            <button type="button" onClick={reset} className="ml-auto text-xs font-semibold underline">Trocar</button>
          </p>
          <label className="mt-3 block text-sm font-medium">
            <span className="flex items-center gap-2"><FileText size={15} /> Nome do ficheiro *</span>
            <input
              name="fileName"
              required
              maxLength={240}
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              className={inputClassName}
            />
          </label>
          <input type="hidden" name="fileUrl" value={fileUrl} />
        </div>
      )}
    </div>
  )
}
