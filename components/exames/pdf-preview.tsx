'use client'

import { Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

const FIRST_PAGES = 2

// Pré-visualização do exame na própria página: desenha as folhas do PDF uma a seguir à outra (funciona no telemóvel, onde um PDF
// dentro de uma moldura não aparece). Mostra as primeiras folhas; as restantes vêm com um toque. O ficheiro é lido só quando a página abre.
export function PdfPreview({ src, title, downloadHref }: { src: string; title: string; downloadHref: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [failed, setFailed] = useState(false)
  const [shown, setShown] = useState(FIRST_PAGES)
  const [current, setCurrent] = useState(1)

  useEffect(() => {
    let cancelled = false
    let loaded: PDFDocumentProxy | null = null
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const response = await fetch(src)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = new Uint8Array(await response.arrayBuffer())
        const pdf = await pdfjs.getDocument({ data }).promise
        if (cancelled) {
          void pdf.destroy()
          return
        }
        loaded = pdf
        setDoc(pdf)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      if (loaded) void loaded.destroy()
    }
  }, [src])

  if (failed) {
    return (
      <div className="tw6-vw tw6-msg" role="region" aria-label={title}>
        <p>Não foi possível mostrar o exame aqui.</p>
        <a href={downloadHref} className="tw-btn"><Download size={17} aria-hidden /> Descarregar PDF</a>
      </div>
    )
  }

  const total = doc?.numPages ?? 0
  const rest = total - shown
  return (
    <div className="tw6-vw" role="region" aria-label={title}>
      {!doc && <div className="tw6-sheet tw6-wait" aria-busy="true">A carregar o exame…</div>}
      {doc && Array.from({ length: Math.min(shown, total) }, (_, index) => <PdfPage key={index + 1} doc={doc} n={index + 1} onSeen={setCurrent} />)}
      {doc && rest > 0 && (
        <button type="button" className="tw-btn ol tw6-rest" onClick={() => setShown(total)}>
          Ver {rest === 1 ? 'a última página' : `as restantes ${rest} páginas`}
        </button>
      )}
      {doc && total > 1 && <div className="tw6-pg" aria-live="polite">{current} / {total}</div>}
    </div>
  )
}

// Uma folha. Reserva o tamanho certo logo (a página não «salta») e só desenha quando está perto do ecrã.
function PdfPage({ doc, n, onSeen }: { doc: PDFDocumentProxy; n: number; onSeen: (n: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ratio, setRatio] = useState(1.414)
  const [near, setNear] = useState(false)

  useEffect(() => {
    let alive = true
    doc.getPage(n).then((page) => {
      if (!alive) return
      const view = page.getViewport({ scale: 1 })
      setRatio(view.height / view.width)
    }).catch(() => {})
    return () => { alive = false }
  }, [doc, n])

  useEffect(() => {
    const el = box.current
    if (!el || !('IntersectionObserver' in window)) { setNear(true); return }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect() }
    }, { rootMargin: '700px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = box.current
    if (!el || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onSeen(n)
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [n, onSeen])

  useEffect(() => {
    if (!near) return
    let alive = true
    let task: RenderTask | null = null
    ;(async () => {
      const page = await doc.getPage(n)
      const el = canvas.current
      const wrap = box.current
      if (!alive || !el || !wrap) return
      const base = page.getViewport({ scale: 1 })
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const viewport = page.getViewport({ scale: (wrap.clientWidth / base.width) * dpr })
      el.width = Math.floor(viewport.width)
      el.height = Math.floor(viewport.height)
      const context = el.getContext('2d')
      if (!context) return
      task = page.render({ canvasContext: context, viewport })
      await task.promise
    })().catch(() => {})
    return () => {
      alive = false
      task?.cancel()
    }
  }, [near, doc, n])

  return (
    <div ref={box} className="tw6-sheet" style={{ aspectRatio: `1 / ${ratio}` }}>
      <canvas ref={canvas} role="img" aria-label={`Página ${n}`} />
    </div>
  )
}
