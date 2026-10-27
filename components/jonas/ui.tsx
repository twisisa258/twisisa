'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

/** Avatar do Jonas: círculo verde com a inicial. */
export function JonasAvatar({ size = 28 }: { size?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }} className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4a8a76] to-[#1d4d41] font-semibold text-white shadow-[0_1px_2px_rgba(20,50,40,0.2)]">
      J
    </span>
  )
}

/** Três pontos a pulsar enquanto o Jonas ainda não escreveu nada. */
export function TypingDots() {
  return (
    <span role="status" aria-label="O Jonas está a escrever" className="inline-flex items-center gap-1 py-2">
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ animationDelay: `${i * 150}ms` }} className="size-1.5 animate-bounce rounded-full bg-[#7fa394]" />
      ))}
    </span>
  )
}

export function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setCopied(false), 1600)
        } catch {
          // sem permissão da área de transferência: nada a fazer
        }
      }}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-[#68716a] transition-colors hover:bg-[#eef1e9] hover:text-[#1d4d41] ${className}`}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}
