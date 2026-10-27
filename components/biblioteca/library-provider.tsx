'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { parseCloudinaryUrl, previewPageUrl } from '@/lib/cloudinary-file'
import type { LibraryItem } from '@/lib/library-shared'
import { useFeedback } from '@/components/feedback-provider'
import { toggleFavorite } from '@/app/biblioteca/(catalogo)/actions'

type LibraryApi = {
  isSaved: (id: string) => boolean
  savingId: string | null
  toggleSaved: (item: LibraryItem) => void
  open: (item: LibraryItem) => void
}

const LibraryContext = createContext<LibraryApi | null>(null)

export function useLibrary() {
  const context = useContext(LibraryContext)
  if (!context) throw new Error('useLibrary tem de ser usado dentro de <LibraryProvider>.')
  return context
}

// Partilha entre todos os cartões da página: guardados, janela de pré-visualização e download.
export function LibraryProvider({ savedIds, children }: { savedIds: string[]; children: React.ReactNode }) {
  const feedback = useFeedback()
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>(() => Object.fromEntries(savedIds.map((id) => [id, true])))
  const [savingId, setSavingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<LibraryItem | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Guardar/remover: o ícone muda logo; se o servidor recusar, volta ao estado anterior e o motivo vai para o modal.
  const toggleSaved = useCallback(
    async (item: LibraryItem) => {
      if (savingId) return
      const next = !savedMap[item.id]
      setSavingId(item.id)
      setSavedMap((current) => ({ ...current, [item.id]: next }))
      try {
        const result = await toggleFavorite(item.id)
        if (result.ok) {
          setSavedMap((current) => ({ ...current, [item.id]: result.saved }))
        } else {
          setSavedMap((current) => ({ ...current, [item.id]: !next }))
          feedback.error(result.message, 'Não foi possível guardar')
        }
      } catch {
        setSavedMap((current) => ({ ...current, [item.id]: !next }))
        feedback.error('Sem ligação ao servidor. Verifica a internet e tenta outra vez.', 'Não foi possível guardar')
      } finally {
        setSavingId(null)
      }
    },
    [feedback, savedMap, savingId],
  )

  // Descarrega pelo servidor; se algo falhar, mostra a razão no modal em vez de abrir uma página de texto.
  const download = useCallback(
    async (item: LibraryItem) => {
      if (downloadingId) return
      setDownloadingId(item.id)
      try {
        const response = await fetch(`/api/biblioteca/${item.id}/ficheiro?baixar=1`)
        if (!response.ok) {
          const reason = (await response.text().catch(() => '')).trim()
          feedback.error(reason && reason.length < 200 ? reason : 'Não foi possível baixar o documento. Tenta outra vez.', 'Download falhou')
          return
        }
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = item.fileName || item.title
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 10000)
      } catch {
        feedback.error('Sem ligação ao servidor. Verifica a internet e tenta outra vez.', 'Download falhou')
      } finally {
        setDownloadingId(null)
      }
    },
    [downloadingId, feedback],
  )

  const api = useMemo<LibraryApi>(
    () => ({
      isSaved: (id) => !!savedMap[id],
      savingId,
      toggleSaved: (item) => void toggleSaved(item),
      open: (item) => setPreview(item),
    }),
    [savedMap, savingId, toggleSaved],
  )

  return (
    <LibraryContext.Provider value={api}>
      {children}
      {preview && <MaterialDialog item={preview} onClose={() => setPreview(null)} onDownload={() => void download(preview)} downloading={downloadingId === preview.id} />}
    </LibraryContext.Provider>
  )
}

function MaterialDialog({ item, onClose, onDownload, downloading }: { item: LibraryItem; onClose: () => void; onDownload: () => void; downloading: boolean }) {
  const isPdf = parseCloudinaryUrl(item.fileUrl)?.extension === 'pdf'
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState<number | null>(isPdf ? null : 1)
  const [loading, setLoading] = useState(item.canPreview)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const src = item.canPreview ? previewPageUrl(item.fileUrl, page) : null
  const meta = [item.institution, item.subject, item.level, item.year ? String(item.year) : ''].filter(Boolean).join(' · ')

  function goTo(next: number) {
    setLoading(true)
    setPage(next)
  }

  function onError() {
    // Uma página acima do total não existe: volta à anterior e marca-a como a última.
    if (page > 1) {
      setLastPage(page - 1)
      setPage(page - 1)
      return
    }
    setLoading(false)
    setFailed(true)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Pré-visualização de ${item.title}`} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label="Fechar pré-visualização" onClick={onClose} className="absolute inset-0 cursor-default bg-[#10231e]/50" />
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#202923]">{item.title}</h2>
            {meta && <p className="mt-0.5 truncate text-xs text-[#788178]">{meta}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 rounded-full p-2 text-[#526057] hover:bg-[#f3f5f1]"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f5f1] p-3">
          {!item.canPreview || failed ? (
            <p className="px-4 py-16 text-center text-sm text-[#68736a]">Não há pré-visualização para este documento. Podes baixá-lo.</p>
          ) : (
            <>
              {loading && <div className="h-80 animate-pulse rounded-xl bg-[#e4e8e1]" aria-label="A carregar pré-visualização" />}
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt={`Página ${page} de ${item.title}`}
                  onLoad={() => setLoading(false)}
                  onError={onError}
                  className={`mx-auto w-full rounded-xl bg-white shadow-sm ${loading ? 'hidden' : ''}`}
                />
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          {isPdf && item.canPreview && !failed ? (
            <div className="flex items-center gap-1 text-xs text-[#68736a]">
              <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Página anterior" className="rounded-full p-2 hover:bg-[#f3f5f1] disabled:opacity-30"><ChevronLeft size={18} /></button>
              <span className="min-w-14 text-center">Página {page}</span>
              <button type="button" onClick={() => goTo(page + 1)} disabled={lastPage !== null && page >= lastPage} aria-label="Página seguinte" className="rounded-full p-2 hover:bg-[#f3f5f1] disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
          ) : <span />}
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-[#2a6a57] to-[#1d4d41] px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Download size={16} /> {downloading ? 'A baixar…' : 'Baixar'}
          </button>
        </div>
      </div>
    </div>
  )
}
