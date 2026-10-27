'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { slimImage, type PlayImage } from '@/lib/simulator-shared'

/** Imagem de questão: espaço reservado (sem saltos), versão leve, toque para ampliar, texto alternativo e «Tentar de novo» se falhar. */
export function QuestionImage({ image, priority = false, zoomable = true }: { image: PlayImage; priority?: boolean; zoomable?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [zoom, setZoom] = useState(false)
  const ratio = image.width && image.height ? `${image.width} / ${image.height}` : undefined

  if (failed) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d5dacd] bg-[#f8f8f5] p-4 text-center text-sm text-[#68736a]">
        <p>{image.alt}</p>
        <button type="button" onClick={() => { setFailed(false); setAttempt((n) => n + 1) }} className="mt-2 font-semibold text-[#1d4d41] hover:underline">Tentar de novo</button>
      </div>
    )
  }
  const src = slimImage(image.url)
  return (
    <figure>
      <button type="button" disabled={!zoomable} onClick={() => setZoom(true)} className="block w-full overflow-hidden rounded-2xl border border-[#e3e5dc] bg-white" style={{ aspectRatio: ratio }} aria-label={zoomable ? `Ampliar: ${image.alt}` : image.alt}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={attempt} src={src} alt={image.alt} width={image.width ?? undefined} height={image.height ?? undefined} loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} className="h-full w-full object-contain" />
      </button>
      {image.caption && <figcaption className="mt-1.5 text-center text-xs text-[#7d857e]">{image.caption}</figcaption>}
      {zoom && (
        <div role="dialog" aria-modal="true" aria-label="Imagem ampliada" className="fixed inset-0 z-[70] flex flex-col bg-black/90" onClick={() => setZoom(false)}>
          <button type="button" aria-label="Fechar" className="m-3 ml-auto flex size-11 items-center justify-center rounded-full bg-white/15 text-white"><X size={22} aria-hidden /></button>
          <div className="min-h-0 flex-1 overflow-auto p-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={image.alt} className="mx-auto max-h-full min-w-[640px] max-w-none rounded-lg bg-white object-contain sm:min-w-0 sm:max-w-full" />
          </div>
        </div>
      )}
    </figure>
  )
}
