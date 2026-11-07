'use client'

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bold, CircleAlert, Heading2, Heading3, ImagePlus, Link2, List, Quote, Sigma, Table, X } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { BlogBody } from '@/components/blog/blog-body'
import { checkBlogSlugAction, saveBlogPostAction, setBlogStatusAction, type SaveBlogResult } from '@/app/admin/blog/actions'
import { parseBlogMarkdown } from '@/lib/blog-markdown'
import { BLOG_STATUS_LABEL, BLOG_TRACK_LABEL, BLOG_TRACKS, LIMITS, SLUG_PATTERN, slugFromTitle, type BlogInput, type BlogStatus } from '@/lib/blog-pure'

type Subject = { id: string; name: string }
type Topic = { id: string; subjectId: string; name: string }
type Props = { post: { id: string; status: BlogStatus; fields: BlogInput } | null; subjects: Subject[]; topics: Topic[] }

const EMPTY: BlogInput = { title: '', slug: '', excerpt: '', body: '', coverUrl: '', coverAlt: '', track: '', subjectId: '', themeId: '', tags: '' }
const MAX_IMAGE_KB = 3072
const control = 'mt-1.5 block min-h-[48px] w-full rounded-xl border border-linha bg-white px-3.5 py-3 text-[16px] leading-6 text-texto outline-none focus:border-marca focus:ring-2 focus:ring-marca/20'
const toolButton = 'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-texto hover:bg-marca-suave focus-visible:outline-2 focus-visible:outline-marca disabled:opacity-40'
const sectionTitle = 'text-[13px] font-semibold uppercase tracking-[0.08em] text-texto-2'

const cleanSlug = (value: string) => value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-')

// Carrega a imagem directamente para o Cloudinary (pasta «blog») com o mesmo pedido assinado do resto da administração.
async function uploadImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_KB * 1024) throw new Error(`O ficheiro tem ${(file.size / 1024).toFixed(0)} KB. O limite é ${MAX_IMAGE_KB} KB.`)
  const signResponse = await fetch('/api/admin/cloudinary-sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pasta: 'blog' }) })
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
  const result = (await response.json()) as { secure_url?: string; error?: { message?: string } }
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message ?? 'O Cloudinary recusou o ficheiro.')
  return result.secure_url
}

export function BlogEditor({ post, subjects, topics }: Props) {
  const router = useRouter()
  const feedback = useFeedback()
  const uid = useId()
  const [fields, setFields] = useState<BlogInput>(post?.fields ?? EMPTY)
  const [id, setId] = useState<string | null>(post?.id ?? null)
  const [status, setStatus] = useState<BlogStatus>(post?.status ?? 'draft')
  const [saved, setSaved] = useState(() => JSON.stringify(post?.fields ?? EMPTY))
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [slugTouched, setSlugTouched] = useState(Boolean(post))
  const [slugTaken, setSlugTaken] = useState(false)
  const [tab, setTab] = useState<'escrever' | 'previa'>('escrever')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState<'capa' | 'corpo' | null>(null)
  const [uploadError, setUploadError] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const bodyImageRef = useRef<HTMLInputElement>(null)
  const coverImageRef = useRef<HTMLInputElement>(null)
  const fieldsRef = useRef(fields)
  const idRef = useRef(id)
  // Conteúdo que o servidor recusou: o auto-guardar não repete o mesmo pedido até haver outra alteração.
  const failedRef = useRef<string | null>(null)
  fieldsRef.current = fields
  idRef.current = id

  const snapshot = JSON.stringify(fields)
  const dirty = snapshot !== saved
  const deferredBody = useDeferredValue(fields.body)
  const blocks = useMemo(() => parseBlogMarkdown(deferredBody), [deferredBody])
  const themes = topics.filter((topic) => topic.subjectId === fields.subjectId)
  const set = <K extends keyof BlogInput>(key: K, value: BlogInput[K]) => setFields((current) => ({ ...current, [key]: value }))

  // ───── Gravar ─────
  async function persist(intent: 'save' | 'publish' | 'autosave'): Promise<SaveBlogResult | null> {
    const current = { ...fieldsRef.current, slug: fieldsRef.current.slug.replace(/^-+|-+$/g, '') }
    const sent = JSON.stringify(fieldsRef.current)
    setSaveState('saving')
    try {
      const result = await saveBlogPostAction({ id: idRef.current, intent, fields: current })
      if (result.ok) {
        idRef.current = result.id
        setId(result.id)
        setStatus(result.status)
        setSaved(sent)
        failedRef.current = null
        setSavedAt(new Date())
        setSaveState('idle')
        setSaveError('')
        // O endereço do browser passa a ser o do artigo, para recarregar ou voltar atrás retomar o mesmo rascunho.
        if (window.location.pathname.endsWith('/novo')) window.history.replaceState(null, '', `/admin/blog/${result.id}`)
        // O servidor gera o endereço a partir do título quando está vazio.
        if (!fieldsRef.current.slug) setFields((now) => ({ ...now, slug: result.slug }))
      } else {
        failedRef.current = sent
        setSaveState('error')
        setSaveError(result.message)
      }
      return result
    } catch {
      failedRef.current = sent
      setSaveState('error')
      setSaveError('Sem ligação. Verifica a internet e tenta de novo.')
      return null
    }
  }
  const persistRef = useRef(persist)
  persistRef.current = persist

  // Auto-guardar: só rascunhos, 1,5 s depois da última alteração e só com um título válido.
  useEffect(() => {
    if (status === 'published' || !dirty || saveState === 'saving' || fields.title.trim().length < LIMITS.titleMin || failedRef.current === snapshot) return
    const timer = setTimeout(() => { void persistRef.current('autosave') }, 1500)
    return () => clearTimeout(timer)
  }, [snapshot, status, dirty, saveState, fields.title])

  // Aviso ao sair com alterações por guardar (fechar o separador, recarregar ou tocar numa ligação).
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!link || link.getAttribute('target') === '_blank' || (link.getAttribute('href') ?? '').startsWith('#')) return
      if (!window.confirm('Tens alterações por guardar. Sair mesmo assim?')) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); document.removeEventListener('click', onClick, true) }
  }, [dirty])

  // Retomar de onde ficou: posição do cursor e do texto guardadas neste aparelho.
  const cursorKey = post ? `twisisa:blog:cursor:${post.id}` : null
  useEffect(() => {
    if (!cursorKey || !bodyRef.current) return
    try {
      const raw = window.localStorage.getItem(cursorKey)
      if (!raw) return
      const { pos, top } = JSON.parse(raw) as { pos: number; top: number }
      const area = bodyRef.current
      if (Number.isInteger(pos) && pos <= area.value.length) area.setSelectionRange(pos, pos)
      if (Number.isFinite(top)) area.scrollTop = top
    } catch { /* sem armazenamento: segue sem retomar */ }
  }, [cursorKey])
  function rememberCursor() {
    const key = cursorKey ?? (idRef.current ? `twisisa:blog:cursor:${idRef.current}` : null)
    const area = bodyRef.current
    if (!key || !area) return
    try { window.localStorage.setItem(key, JSON.stringify({ pos: area.selectionStart, top: area.scrollTop })) } catch { /* ignorar */ }
  }

  // Endereço livre? Pergunta ao servidor enquanto escreves.
  useEffect(() => {
    const slug = fields.slug.replace(/^-+|-+$/g, '')
    if (slug.length < LIMITS.slugMin || !SLUG_PATTERN.test(slug)) { setSlugTaken(false); return }
    const timer = setTimeout(() => { checkBlogSlugAction(slug, idRef.current).then((result) => setSlugTaken(result.taken), () => setSlugTaken(false)) }, 500)
    return () => clearTimeout(timer)
  }, [fields.slug])

  // ───── Barra de formatação ─────
  function apply(next: string, from: number, to: number) {
    set('body', next)
    requestAnimationFrame(() => { const area = bodyRef.current; if (area) { area.focus(); area.setSelectionRange(from, to) } })
  }
  function wrap(before: string, after: string, placeholder: string) {
    const area = bodyRef.current
    if (!area) return
    const { selectionStart: start, selectionEnd: end } = area
    const selected = fields.body.slice(start, end) || placeholder
    apply(fields.body.slice(0, start) + before + selected + after + fields.body.slice(end), start + before.length, start + before.length + selected.length)
  }
  function prefixLines(prefix: (index: number) => string, strip?: RegExp) {
    const area = bodyRef.current
    if (!area) return
    const value = fields.body
    const from = value.lastIndexOf('\n', area.selectionStart - 1) + 1
    const found = value.indexOf('\n', area.selectionEnd)
    const to = found === -1 ? value.length : found
    const lines = value.slice(from, to).split('\n').map((line, index) => prefix(index) + (strip ? line.replace(strip, '') : line))
    const block = lines.join('\n')
    apply(value.slice(0, from) + block + value.slice(to), from, from + block.length)
  }
  function insertBlock(text: string, selectFrom: number, selectLength: number) {
    const area = bodyRef.current
    if (!area) return
    const { selectionStart: start, selectionEnd: end } = area
    const value = fields.body
    const lead = start === 0 || value.slice(0, start).endsWith('\n\n') ? '' : value.slice(0, start).endsWith('\n') ? '\n' : '\n\n'
    const trail = value.slice(end).startsWith('\n\n') || end === value.length ? '' : value.slice(end).startsWith('\n') ? '\n' : '\n\n'
    const next = value.slice(0, start) + lead + text + trail + value.slice(end)
    const at = start + lead.length + selectFrom
    apply(next, at, at + selectLength)
  }
  async function onBodyImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading('corpo')
    setUploadError('')
    try {
      const url = await uploadImage(file)
      const alt = 'Descreve a imagem'
      insertBlock(`![${alt}](${url})`, 2, alt.length)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Falha no carregamento.')
    } finally { setUploading(null) }
  }
  async function onCoverImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading('capa')
    setUploadError('')
    try { set('coverUrl', await uploadImage(file)) } catch (error) { setUploadError(error instanceof Error ? error.message : 'Falha no carregamento.') } finally { setUploading(null) }
  }

  // ───── Botões ─────
  async function save(intent: 'save' | 'publish') {
    if (busy) return
    setBusy(true)
    const result = await persist(intent)
    setBusy(false)
    if (!result) return feedback.error('Sem ligação. Verifica a internet e tenta de novo.')
    if (!result.ok) return feedback.error(result.message)
    feedback.success(result.message)
    router.refresh()
  }
  async function preview() {
    if (busy) return
    setBusy(true)
    const result = await persist('save')
    setBusy(false)
    if (!result || !result.ok) return feedback.error(result?.ok === false ? result.message : 'Sem ligação. Verifica a internet e tenta de novo.')
    router.push(`/blog/pre-visualizar/${result.id}`)
  }
  async function unpublish() {
    if (!id || busy) return
    setBusy(true)
    try {
      const data = new FormData()
      data.set('id', id)
      data.set('status', 'draft')
      const result = await setBlogStatusAction(data)
      if (result.ok) { setStatus('draft'); feedback.success(result.message ?? 'Artigo despublicado.'); router.refresh() } else feedback.error(result.message)
    } catch { feedback.error('Sem ligação. Verifica a internet e tenta de novo.') } finally { setBusy(false) }
  }

  const published = status === 'published'
  const statusText = saveState === 'saving' ? 'A guardar…' : saveState === 'error' ? `Não guardado: ${saveError}` : dirty ? 'Alterações por guardar' : savedAt ? `Guardado às ${savedAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maputo' })}` : id ? 'Tudo guardado' : ''

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link href="/admin/blog" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-marca hover:underline">← Todos os artigos</Link>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-[clamp(1.5rem,1.3rem+1vw,2rem)] font-semibold tracking-[-0.03em]">{id ? 'Editar artigo' : 'Novo artigo'}</h1>
        <span className="text-[13px] font-semibold text-texto-2">{BLOG_STATUS_LABEL[status]}</span>
      </div>
      <p role="status" aria-live="polite" className={`mt-1 flex min-h-6 items-center gap-1.5 text-[14px] ${saveState === 'error' ? 'text-erro-texto' : 'text-texto-2'}`}>
        {saveState === 'error' && <CircleAlert size={15} aria-hidden="true" />}{statusText}
      </p>

      {/* 1. Conteúdo */}
      <section aria-labelledby={`${uid}-conteudo`} className="mt-6">
        <h2 id={`${uid}-conteudo`} className={sectionTitle}>Conteúdo</h2>
        <label className="mt-4 block text-[15px] font-medium">Título
          <input value={fields.title} maxLength={LIMITS.titleMax} onChange={(event) => { const title = event.target.value; setFields((current) => ({ ...current, title, slug: !slugTouched && status !== 'published' ? slugFromTitle(title) : current.slug })) }} className={control} placeholder="Como organizar o estudo para os exames" autoComplete="off" />
        </label>
        <label className="mt-4 block text-[15px] font-medium">Endereço
          <input value={fields.slug} maxLength={LIMITS.slugMax} onChange={(event) => { setSlugTouched(true); set('slug', cleanSlug(event.target.value)) }} onBlur={() => set('slug', fields.slug.replace(/^-+|-+$/g, ''))} aria-describedby={`${uid}-slug`} className={control} placeholder="como-organizar-o-estudo" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <span id={`${uid}-slug`} className={`mt-1.5 block text-[13px] font-normal leading-5 ${slugTaken ? 'text-erro-texto' : 'text-texto-2'}`}>
            {slugTaken ? 'Este endereço já está em uso. Escolhe outro.' : published && post && fields.slug !== post.fields.slug ? 'Mudar o endereço de um artigo publicado parte as ligações antigas.' : `twisisa.com/blog/${fields.slug || '…'}`}
          </span>
        </label>
        <label className="mt-4 block text-[15px] font-medium">Resumo
          <textarea value={fields.excerpt} maxLength={LIMITS.excerptMax} rows={3} onChange={(event) => set('excerpt', event.target.value)} aria-describedby={`${uid}-resumo`} className={control} placeholder="Uma ou duas frases. É a descrição que aparece no Google." />
          <span id={`${uid}-resumo`} className="mt-1.5 block text-right text-[13px] font-normal text-texto-2" aria-live="polite">{fields.excerpt.length}/{LIMITS.excerptMax}</span>
        </label>

        <div className="mt-4">
          <span className="text-[15px] font-medium">Texto <span className="font-normal text-texto-2">(Markdown)</span></span>
          <div role="tablist" aria-label="Escrever ou pré-visualizar" className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-marca-suave p-1 lg:hidden">
            {(['escrever', 'previa'] as const).map((item) => (
              <button key={item} type="button" role="tab" id={`${uid}-tab-${item}`} aria-selected={tab === item} aria-controls={`${uid}-painel-${item}`} onClick={() => setTab(item)} className={`min-h-11 rounded-lg text-[15px] font-semibold ${tab === item ? 'bg-white text-marca' : 'text-texto-2'}`}>
                {item === 'escrever' ? 'Escrever' : 'Pré-visualizar'}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-5 lg:grid-cols-2">
            <div id={`${uid}-painel-escrever`} role="tabpanel" aria-labelledby={`${uid}-tab-escrever`} className={`${tab === 'escrever' ? '' : 'hidden'} min-w-0 lg:block`}>
              <div role="toolbar" aria-label="Formatação" className="flex gap-0.5 overflow-x-auto border-b border-linha pb-1">
                <button type="button" className={toolButton} aria-label="Negrito" title="Negrito" onClick={() => wrap('**', '**', 'texto')}><Bold size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Título (h2)" title="Título" onClick={() => prefixLines(() => '## ', /^#{1,6}\s+/)}><Heading2 size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Subtítulo (h3)" title="Subtítulo" onClick={() => prefixLines(() => '### ', /^#{1,6}\s+/)}><Heading3 size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Lista" title="Lista" onClick={() => prefixLines(() => '- ')}><List size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Citação" title="Citação" onClick={() => prefixLines(() => '> ')}><Quote size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Ligação" title="Ligação" onClick={() => wrap('[', '](https://)', 'texto da ligação')}><Link2 size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Imagem" title="Imagem" disabled={uploading !== null} onClick={() => bodyImageRef.current?.click()}><ImagePlus size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Fórmula" title="Fórmula" onClick={() => wrap('$', '$', 'x^2')}><Sigma size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Tabela" title="Tabela" onClick={() => insertBlock('| Coluna 1 | Coluna 2 |\n|---|---|\n| a | b |', 2, 8)}><Table size={18} aria-hidden="true" /></button>
                <input ref={bodyImageRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={onBodyImage} className="sr-only" tabIndex={-1} aria-hidden="true" />
              </div>
              {uploading === 'corpo' && <p className="mt-2 text-[14px] text-texto-2" role="status">A carregar a imagem…</p>}
              <textarea ref={bodyRef} value={fields.body} maxLength={LIMITS.bodyMax} onChange={(event) => set('body', event.target.value)} onBlur={rememberCursor} aria-label="Texto do artigo em Markdown" className={`${control} mt-2 min-h-[22rem] resize-y font-mono text-[16px] leading-7 lg:min-h-[32rem]`} placeholder={'## Primeiro título\n\nEscreve aqui. Usa a barra de cima para formatar.'} spellCheck />
              <p className="mt-1.5 text-[13px] leading-5 text-texto-2">Fórmulas: <code>$x^2$</code> na linha e <code>$$\frac{'{a}{b}'}$$</code> em bloco. Imagem sozinha numa linha. O título do artigo é o título principal: usa ## e ### lá dentro.</p>
            </div>
            <div id={`${uid}-painel-previa`} role="tabpanel" aria-labelledby={`${uid}-tab-previa`} className={`${tab === 'previa' ? '' : 'hidden'} min-w-0 lg:block`}>
              <div className="rounded-xl border border-linha px-4 py-5 lg:min-h-[32rem]">
                {fields.body.trim() ? <BlogBody blocks={blocks} /> : <p className="text-[15px] text-texto-2">A pré-visualização aparece aqui à medida que escreves.</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Capa */}
      <section aria-labelledby={`${uid}-capa`} className="mt-10 border-t border-linha pt-6">
        <h2 id={`${uid}-capa`} className={sectionTitle}>Capa</h2>
        {fields.coverUrl && (
          <div className="mt-4 aspect-video w-full max-w-md overflow-hidden rounded-md bg-linha/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fields.coverUrl} alt={fields.coverAlt || 'Capa do artigo'} className="size-full object-cover" />
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-secundario" disabled={uploading !== null} onClick={() => coverImageRef.current?.click()}>{uploading === 'capa' ? 'A carregar…' : fields.coverUrl ? 'Trocar capa' : 'Carregar capa'}</button>
          {fields.coverUrl && <button type="button" className="btn btn-terciario" onClick={() => { set('coverUrl', ''); set('coverAlt', '') }}><X size={16} aria-hidden="true" />Remover</button>}
          <input ref={coverImageRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={onCoverImage} className="sr-only" tabIndex={-1} aria-hidden="true" />
        </div>
        <p className="mt-2 text-[13px] text-texto-2">PNG, JPG ou WebP, até 3 MB. Melhor em 16:9 (1600×900).</p>
        {uploadError && <p role="alert" className="mt-2 text-[14px] text-erro-texto">{uploadError}</p>}
        {fields.coverUrl && (
          <label className="mt-4 block text-[15px] font-medium">Texto alternativo da capa
            <input value={fields.coverAlt} maxLength={LIMITS.altMax} onChange={(event) => set('coverAlt', event.target.value)} className={control} placeholder="Estudantes a resolver exercícios de Matemática" />
            <span className="mt-1.5 block text-[13px] font-normal text-texto-2">Obrigatório: descreve a imagem para quem não a vê.</span>
          </label>
        )}
      </section>

      {/* 3. Classificação */}
      <section aria-labelledby={`${uid}-classificacao`} className="mt-10 border-t border-linha pt-6">
        <h2 id={`${uid}-classificacao`} className={sectionTitle}>Classificação</h2>
        <label className="mt-4 block text-[15px] font-medium">Percurso
          <select value={fields.track} onChange={(event) => set('track', event.target.value)} className={control}>
            <option value="">Geral (todos os percursos)</option>
            {BLOG_TRACKS.map((track) => <option key={track} value={track}>{BLOG_TRACK_LABEL[track]}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-[15px] font-medium">Disciplina
          <select value={fields.subjectId} onChange={(event) => setFields((current) => ({ ...current, subjectId: event.target.value, themeId: '' }))} className={control}>
            <option value="">Sem disciplina</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-[15px] font-medium">Tema
          <select value={fields.themeId} disabled={!fields.subjectId || themes.length === 0} onChange={(event) => set('themeId', event.target.value)} className={`${control} disabled:opacity-60`}>
            <option value="">{!fields.subjectId ? 'Escolhe primeiro a disciplina' : themes.length === 0 ? 'Esta disciplina ainda não tem temas' : 'Sem tema'}</option>
            {themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
          </select>
          <span className="mt-1.5 block text-[13px] font-normal text-texto-2">O botão «Praticar este tema» do artigo leva o aluno ao Simulador neste tema.</span>
        </label>
        <label className="mt-4 block text-[15px] font-medium">Etiquetas
          <input value={fields.tags} onChange={(event) => set('tags', event.target.value)} className={control} placeholder="exame, método de estudo, 12ª classe" autoCapitalize="none" />
          <span className="mt-1.5 block text-[13px] font-normal text-texto-2">Separadas por vírgula. No máximo {LIMITS.tagsMax}.</span>
        </label>
      </section>

      {/* 4. Publicação */}
      <section aria-labelledby={`${uid}-publicacao`} className="mt-10 border-t border-linha pt-6 pb-10">
        <h2 id={`${uid}-publicacao`} className={sectionTitle}>Publicação</h2>
        <p className="mt-3 text-[15px] leading-6 text-texto-2">
          {published ? 'Este artigo está publicado. As alterações ficam visíveis assim que guardares.' : 'Os rascunhos são guardados sozinhos. Só a equipa os vê, na pré-visualização.'}
        </p>
        <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
          {published ? (
            <>
              <button type="button" className="btn btn-primario btn-grande" disabled={busy} onClick={() => save('save')}>Guardar alterações</button>
              <button type="button" className="btn btn-secundario btn-grande" disabled={busy} onClick={unpublish}>Despublicar</button>
              <Link href={`/blog/${fields.slug}`} className="btn btn-terciario btn-grande">Ver no site</Link>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primario btn-grande" disabled={busy} onClick={() => save('publish')}>Publicar</button>
              <button type="button" className="btn btn-secundario btn-grande" disabled={busy || fields.title.trim().length < LIMITS.titleMin} onClick={() => save('save')}>Guardar rascunho</button>
              <button type="button" className="btn btn-terciario btn-grande" disabled={busy || fields.title.trim().length < LIMITS.titleMin} onClick={preview}>Pré-visualizar</button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
