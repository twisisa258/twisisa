'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, FolderOpen, RotateCcw, Trash2, Upload } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Seletor } from '@/components/ui/seletor'
import { finishUpload, findExistingMaterials, publishMaterials, type PublishItem } from '@/app/admin/materiais/actions'
import { inferFromPath, titleFromFilename, type Inferred } from '@/lib/material-inference'

// Carregamento de vários materiais de uma vez.
//  1. Escolhe ficheiros (ou uma pasta inteira).
//  2. Define uma vez o que vale para todos (categoria, disciplina, instituição, ano…). O que não definires é detetado
//     pelo nome do ficheiro e pelas pastas.
//  3. Corrige o que for preciso: seleciona linhas e aplica um valor a todas de uma vez.
//  4. Publica: os ficheiros vão directamente ao Cloudinary (3 de cada vez) e são registados em remessas.
// Quem decide a classificação de cada material: valor escolhido para ele > valor para todos > deteção automática.

export type Catalog = {
  categories: { slug: string; name: string }[]
  subjects: { id: string; name: string }[]
  levels: { id: string; name: string }[]
  institutions: { shortName: string; name: string }[]
  years: number[]
}

type FieldKey = 'category' | 'subject' | 'level' | 'institution' | 'year' | 'course'
export type Fields = Record<FieldKey, string>
type Status = 'pendente' | 'a_enviar' | 'a_publicar' | 'publicado' | 'erro' | 'existe'

type Row = {
  key: string
  file: File
  path: string
  title: string
  overrides: Partial<Fields>
  inferred: Inferred
  selected: boolean
  status: Status
  progress: number
  message: string
  allowDuplicate: boolean
}

type SignData = { cloudName: string; apiKey: string; signature: string; timestamp: string | number; folder: string; use_filename: string; unique_filename: string }

const MAX_MB = 10
const EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp'])
const ACCEPT = [...EXTENSIONS].map((ext) => `.${ext}`).join(',')
const CONCURRENCY = 3
const BATCH = 20
const SIGN_TTL_MS = 30 * 60 * 1000
const EMPTY: Fields = { category: '', subject: '', level: '', institution: '', year: '', course: '' }

const input = 'h-10 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 text-sm outline-none transition-colors focus:border-marca focus:ring-2 focus:ring-marca/10 disabled:opacity-60'
const btn = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40'
const btnSolid = `${btn} bg-marca text-white hover:bg-marca-escura`
const btnLine = `${btn} border border-[#c9d7cd] bg-white text-marca hover:bg-[#f1f4ef]`

const extensionOf = (name: string) => name.toLowerCase().split('.').pop() ?? ''
const rowKey = (file: File, path: string) => `${path}|${file.size}|${file.lastModified}`

type Lookups = { category: Map<string, string>; subject: Map<string, string>; level: Map<string, string>; institution: Map<string, string> }

function effective(row: Row, key: FieldKey, defaults: Fields, detect: boolean): { value: string; detected: boolean } {
  const own = row.overrides[key]
  if (own) return { value: own, detected: false }
  if (defaults[key]) return { value: defaults[key], detected: false }
  const guess = detect && key !== 'course' ? row.inferred[key] : undefined
  return guess ? { value: guess, detected: true } : { value: '', detected: false }
}

function FieldInputs({ values, onChange, catalog, blank, disabled }: { values: Fields; onChange: (key: FieldKey, value: string) => void; catalog: Catalog; blank: string; disabled?: boolean }) {
  const select = (key: FieldKey, label: string, options: { value: string; label: string }[]) => (
    <Seletor rotulo={label} valor={values[key]} onChange={(valor) => onChange(key, valor)} opcoes={options} vazio={blank} desativado={disabled} />
  )
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {select('category', 'Categoria', catalog.categories.map((c) => ({ value: c.slug, label: c.name })))}
      {select('subject', 'Disciplina', catalog.subjects.map((s) => ({ value: s.id, label: s.name })))}
      {select('level', 'Classe / nível', catalog.levels.map((l) => ({ value: l.id, label: l.name })))}
      {select('institution', 'Instituição', catalog.institutions.map((i) => ({ value: i.shortName, label: `${i.shortName} · ${i.name}` })))}
      {select('year', 'Ano', catalog.years.map((y) => ({ value: String(y), label: String(y) })))}
      <label className="grid gap-1 text-xs font-semibold text-[#526057]">
        Curso
        <input value={values.course} onChange={(event) => onChange('course', event.target.value)} maxLength={180} disabled={disabled} placeholder={blank} className={input} />
      </label>
    </div>
  )
}

type RowProps = {
  row: Row
  defaults: Fields
  detect: boolean
  lookups: Lookups
  locked: boolean
  onSelect: (key: string, checked: boolean) => void
  onTitle: (key: string, title: string) => void
  onRetry: (key: string) => void
  onAllowDuplicate: (key: string) => void
}

const RowItem = memo(function RowItem({ row, defaults, detect, lookups, locked, onSelect, onTitle, onRetry, onAllowDuplicate }: RowProps) {
  const chips: { text: string; detected: boolean; missing?: boolean }[] = []
  const category = effective(row, 'category', defaults, detect)
  const add = (key: FieldKey, map: Map<string, string>) => {
    const { value, detected } = effective(row, key, defaults, detect)
    if (value) chips.push({ text: map.get(value) ?? value, detected })
  }
  chips.push(category.value ? { text: lookups.category.get(category.value) ?? category.value, detected: category.detected } : { text: 'Sem categoria', detected: false, missing: true })
  add('subject', lookups.subject)
  add('level', lookups.level)
  add('institution', lookups.institution)
  const year = effective(row, 'year', defaults, detect)
  if (year.value) chips.push({ text: year.value, detected: year.detected })

  const busy = row.status === 'a_enviar' || row.status === 'a_publicar'
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 [contain-intrinsic-size:auto_64px] [content-visibility:auto] sm:px-5">
      <input type="checkbox" checked={row.selected} disabled={locked || row.status === 'publicado'} onChange={(event) => onSelect(row.key, event.target.checked)} aria-label={`Selecionar ${row.file.name}`} className="size-4 shrink-0 accent-marca" />
      <div className="min-w-0 flex-1 basis-60">
        <input
          value={row.title}
          onChange={(event) => onTitle(row.key, event.target.value)}
          disabled={locked || row.status === 'publicado'}
          maxLength={180}
          aria-label={`Título de ${row.file.name}`}
          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none hover:border-[#dfe3d9] focus:border-marca focus:bg-white disabled:opacity-70"
        />
        <p className="truncate px-2 text-xs text-texto-2" title={row.path}>{row.path} · {(row.file.size / 1048576).toFixed(1)} MB</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {chips.map((chip, index) => (
          <span key={index} title={chip.detected ? 'Detetado pelo nome ou pasta' : undefined} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip.missing ? 'bg-[#fbeeee] text-erro-texto' : chip.detected ? 'border border-dashed border-[#b9c8bd] bg-white text-[#526057]' : 'bg-[#e6f0e9] text-marca'}`}>{chip.text}</span>
        ))}
      </div>
      <div className="flex w-32 shrink-0 items-center justify-end gap-1.5 text-xs" aria-live="polite">
        {row.status === 'a_enviar' && <><Spinner className="size-3.5 text-marca" /><span className="text-[#526057]">{row.progress}%</span></>}
        {row.status === 'a_publicar' && <><Spinner className="size-3.5 text-marca" /><span className="text-[#526057]">A publicar</span></>}
        {row.status === 'publicado' && <span className="inline-flex items-center gap-1 font-semibold text-marca"><Check size={14} aria-hidden="true" />Publicado</span>}
        {row.status === 'erro' && (
          <span className="flex flex-col items-end gap-0.5 text-right">
            <span className="font-medium text-erro-texto">{row.message || 'Falhou'}</span>
            {row.file.size <= MAX_MB * 1048576 && <button type="button" onClick={() => onRetry(row.key)} disabled={locked} className="inline-flex items-center gap-1 font-semibold text-marca underline disabled:opacity-40"><RotateCcw size={12} aria-hidden="true" />Repetir</button>}
          </span>
        )}
        {row.status === 'existe' && (
          <span className="flex flex-col items-end gap-0.5 text-right">
            <span className="font-medium text-aviso-texto">Já existe</span>
            <button type="button" onClick={() => onAllowDuplicate(row.key)} disabled={locked} className="font-semibold text-marca underline disabled:opacity-40">Enviar mesmo assim</button>
          </span>
        )}
        {!busy && row.status === 'pendente' && <span className="text-texto-2">Por enviar</span>}
      </div>
    </li>
  )
})

type Filter = 'todos' | 'incompletos' | 'erros' | 'existem'

// Percorre pastas arrastadas para dentro do ecrã (guarda o caminho de cada ficheiro, para detetar a classificação).
async function walk(entry: FileSystemEntry, prefix: string, out: { file: File; path: string }[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File | null>((resolve) => (entry as FileSystemFileEntry).file(resolve, () => resolve(null)))
    if (file) out.push({ file, path: `${prefix}${entry.name}` })
    return
  }
  if (!entry.isDirectory) return
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])))
    if (batch.length === 0) break
    for (const child of batch) await walk(child, `${prefix}${entry.name}/`, out)
  }
}

export function MaterialBulk({ catalog, initialDefaults, contexto }: { catalog: Catalog; initialDefaults?: Fields; contexto?: React.ReactNode }) {
  const [rows, setRows] = useState<Row[]>([])
  const [defaults, setDefaults] = useState<Fields>(initialDefaults ?? EMPTY)
  const [detect, setDetect] = useState(true)
  const [apply, setApply] = useState<Fields>(EMPTY)
  const [filter, setFilter] = useState<Filter>('todos')
  const [query, setQuery] = useState('')
  const [running, setRunning] = useState(false)
  const [checking, setChecking] = useState(false)
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)

  const rowsRef = useRef<Row[]>([])
  const defaultsRef = useRef(defaults)
  const detectRef = useRef(detect)
  const stopRef = useRef(false)
  const runningRef = useRef(false)
  const xhrs = useRef(new Set<XMLHttpRequest>())
  const urlsRef = useRef(new Map<string, string>())
  const runKeysRef = useRef(new Set<string>())
  const signRef = useRef<{ promise: Promise<SignData>; at: number } | null>(null)
  const filesInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  useEffect(() => { rowsRef.current = rows }, [rows])
  useEffect(() => { defaultsRef.current = defaults }, [defaults])
  useEffect(() => { detectRef.current = detect }, [detect])

  // Aviso ao sair a meio do envio.
  useEffect(() => {
    if (!running) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [running])

  const lookups = useMemo<Lookups>(() => ({
    category: new Map(catalog.categories.map((c) => [c.slug, c.name])),
    subject: new Map(catalog.subjects.map((s) => [s.id, s.name])),
    level: new Map(catalog.levels.map((l) => [l.id, l.name])),
    institution: new Map(catalog.institutions.map((i) => [i.shortName, i.shortName])),
  }), [catalog])

  const patch = useCallback((key: string, change: Partial<Row>) => {
    setRows((previous) => {
      const next = previous.map((row) => (row.key === key ? { ...row, ...change } : row))
      rowsRef.current = next
      return next
    })
  }, [])

  const patchMany = useCallback((keys: Set<string>, change: (row: Row) => Partial<Row>) => {
    setRows((previous) => {
      const next = previous.map((row) => (keys.has(row.key) ? { ...row, ...change(row) } : row))
      rowsRef.current = next
      return next
    })
  }, [])

  // ---------- Adicionar ficheiros ----------
  async function addFiles(list: { file: File; path: string }[]) {
    if (running) return
    const known = new Set(rowsRef.current.map((row) => row.key))
    const fresh: Row[] = []
    let ignored = 0
    for (const { file, path } of list) {
      if (!EXTENSIONS.has(extensionOf(file.name))) { ignored++; continue }
      const key = rowKey(file, path)
      if (known.has(key)) continue
      known.add(key)
      const tooBig = file.size > MAX_MB * 1048576
      fresh.push({
        key, file, path, title: titleFromFilename(file.name), overrides: {}, inferred: inferFromPath(path, catalog), selected: false,
        status: tooBig ? 'erro' : 'pendente', progress: 0, allowDuplicate: false,
        message: tooBig ? `${(file.size / 1048576).toFixed(1)} MB: o limite é ${MAX_MB} MB` : '',
      })
    }
    setNotice(ignored > 0 ? `${ignored} ${ignored === 1 ? 'ficheiro ignorado' : 'ficheiros ignorados'} (tipo não suportado).` : '')
    if (fresh.length === 0) return
    setRows((previous) => { const next = [...previous, ...fresh]; rowsRef.current = next; return next })

    // Marca o que já existe na biblioteca (mesmo nome de ficheiro).
    setChecking(true)
    try {
      const names = [...new Set(fresh.filter((row) => row.status === 'pendente').map((row) => row.file.name))]
      const existing = new Set<string>()
      for (let i = 0; i < names.length; i += 200) {
        const result = await findExistingMaterials(names.slice(i, i + 200))
        if (!result.ok) { setNotice(result.message); break }
        result.names.forEach((name) => existing.add(name))
      }
      if (existing.size > 0) {
        const keys = new Set(fresh.filter((row) => existing.has(row.file.name)).map((row) => row.key))
        patchMany(keys, (row) => (row.status === 'pendente' && !row.allowDuplicate ? { status: 'existe', message: '' } : {}))
      }
    } catch {
      setNotice('Não foi possível verificar duplicados.')
    } finally {
      setChecking(false)
    }
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).map((file) => ({ file, path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name }))
    event.target.value = ''
    void addFiles(files)
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragging(false)
    // As entradas têm de ser lidas já, dentro do evento: depois deixam de estar disponíveis.
    const entries = Array.from(event.dataTransfer.items ?? []).map((item) => item.webkitGetAsEntry?.() ?? null)
    if (entries.some(Boolean)) {
      void (async () => {
        const found: { file: File; path: string }[] = []
        for (const entry of entries) if (entry) await walk(entry, '', found)
        await addFiles(found)
      })()
    } else {
      void addFiles(Array.from(event.dataTransfer.files).map((file) => ({ file, path: file.name })))
    }
  }

  // ---------- Seleção e edição ----------
  const onSelect = useCallback((key: string, checked: boolean) => patch(key, { selected: checked }), [patch])
  const onTitle = useCallback((key: string, title: string) => patch(key, { title }), [patch])
  const onRetry = useCallback((key: string) => patch(key, { status: 'pendente', message: '' }), [patch])
  const onAllowDuplicate = useCallback((key: string) => patch(key, { status: 'pendente', allowDuplicate: true }), [patch])

  const counts = useMemo(() => {
    let ready = 0, incomplete = 0, done = 0, errors = 0, exist = 0, selected = 0
    for (const row of rows) {
      if (row.selected) selected++
      if (row.status === 'publicado') done++
      else if (row.status === 'erro') errors++
      else if (row.status === 'existe') exist++
      else if (row.status === 'pendente') (effective(row, 'category', defaults, detect).value ? ready++ : incomplete++)
    }
    return { ready, incomplete, done, errors, exist, selected }
  }, [rows, defaults, detect])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (needle && !row.title.toLowerCase().includes(needle) && !row.path.toLowerCase().includes(needle)) return false
      if (filter === 'incompletos') return row.status === 'pendente' && !effective(row, 'category', defaults, detect).value
      if (filter === 'erros') return row.status === 'erro'
      if (filter === 'existem') return row.status === 'existe'
      return true
    })
  }, [rows, query, filter, defaults, detect])

  const allVisibleSelected = visible.length > 0 && visible.every((row) => row.selected || row.status === 'publicado')

  function toggleVisible(checked: boolean) {
    patchMany(new Set(visible.filter((row) => row.status !== 'publicado').map((row) => row.key)), () => ({ selected: checked }))
  }

  function applyToSelected() {
    const keys = new Set(rows.filter((row) => row.selected).map((row) => row.key))
    const changes = (Object.keys(apply) as FieldKey[]).filter((key) => apply[key].trim())
    if (keys.size === 0 || changes.length === 0) return
    patchMany(keys, (row) => ({ overrides: { ...row.overrides, ...Object.fromEntries(changes.map((key) => [key, apply[key].trim()])) } }))
    setApply(EMPTY)
  }

  const clearOverrides = () => patchMany(new Set(rows.filter((row) => row.selected).map((row) => row.key)), () => ({ overrides: {} }))
  const removeSelected = () => {
    setRows((previous) => { const next = previous.filter((row) => !row.selected || row.status === 'a_enviar' || row.status === 'a_publicar'); rowsRef.current = next; return next })
  }
  const clearAll = () => { setRows([]); rowsRef.current = []; setNotice('') }

  // ---------- Envio ----------
  function getSign(): Promise<SignData> {
    const cached = signRef.current
    if (cached && Date.now() - cached.at < SIGN_TTL_MS) return cached.promise
    const promise = fetch('/api/admin/cloudinary-sign', { method: 'POST' }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível preparar o carregamento.')
      return data as SignData
    })
    signRef.current = { promise, at: Date.now() }
    promise.catch(() => { if (signRef.current?.promise === promise) signRef.current = null })
    return promise
  }

  function uploadFile(row: Row, sign: SignData): Promise<string> {
    return new Promise((resolve, reject) => {
      const body = new FormData()
      body.append('file', row.file)
      body.append('api_key', sign.apiKey)
      body.append('timestamp', String(sign.timestamp))
      body.append('signature', sign.signature)
      body.append('folder', sign.folder)
      body.append('use_filename', sign.use_filename)
      body.append('unique_filename', sign.unique_filename)
      const xhr = new XMLHttpRequest()
      xhrs.current.add(xhr)
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`)
      let last = -1
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const percent = Math.round((event.loaded / event.total) * 100)
        if (percent !== last && (percent - last >= 5 || percent === 100)) { last = percent; patch(row.key, { progress: percent }) }
      }
      xhr.onload = () => {
        xhrs.current.delete(xhr)
        let data: { secure_url?: string; error?: { message?: string } } | null = null
        try { data = JSON.parse(xhr.responseText) } catch { data = null }
        if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url) resolve(data.secure_url)
        else reject(new Error(data?.error?.message ?? 'O Cloudinary recusou o ficheiro.'))
      }
      xhr.onerror = () => { xhrs.current.delete(xhr); reject(new Error('Sem ligação ao Cloudinary.')) }
      xhr.onabort = () => { xhrs.current.delete(xhr); reject(new Error('stopped')) }
      xhr.send(body)
    })
  }

  function toItem(row: Row): PublishItem {
    const d = defaultsRef.current
    const on = detectRef.current
    const value = (key: FieldKey) => effective(row, key, d, on).value
    return {
      key: row.key, title: row.title.trim() || titleFromFilename(row.file.name), description: '', category: value('category'), subject: value('subject'), level: value('level'),
      institution: value('institution'), course: value('course'), year: value('year'), fileUrl: urlsRef.current.get(row.key) ?? '', fileName: row.file.name, fileSize: row.file.size,
    }
  }

  async function publishBatch(items: PublishItem[]) {
    const keys = new Set(items.map((item) => item.key))
    patchMany(keys, () => ({ status: 'a_publicar' as Status }))
    try {
      const response = await publishMaterials(items)
      if (!response.ok) {
        patchMany(keys, () => ({ status: 'erro' as Status, message: response.message }))
        return
      }
      const byKey = new Map(response.results.map((result) => [result.key, result]))
      patchMany(keys, (row) => {
        const result = byKey.get(row.key)
        return result?.ok ? { status: 'publicado' as Status, selected: false, message: '' } : { status: 'erro' as Status, message: result?.message ?? 'Não foi possível publicar.' }
      })
    } catch {
      patchMany(keys, () => ({ status: 'erro' as Status, message: 'Falha de ligação. Repete.' }))
    }
  }

  async function start() {
    if (runningRef.current || checking) return
    const queue = rowsRef.current
      .filter((row) => row.status === 'pendente' && effective(row, 'category', defaultsRef.current, detectRef.current).value)
      .map((row) => row.key)
    if (queue.length === 0) return
    runningRef.current = true
    stopRef.current = false
    setRunning(true)
    runKeysRef.current = new Set(queue)
    setNotice('')

    const buffer: PublishItem[] = []
    let chain: Promise<void> = Promise.resolve()
    const flush = (force: boolean) => {
      while (buffer.length >= BATCH || (force && buffer.length > 0)) {
        const items = buffer.splice(0, BATCH)
        chain = chain.then(() => publishBatch(items))
      }
    }

    const worker = async () => {
      while (!stopRef.current) {
        const key = queue.shift()
        if (!key) return
        const row = rowsRef.current.find((item) => item.key === key)
        if (!row) continue
        try {
          if (!urlsRef.current.has(key)) {
            patch(key, { status: 'a_enviar', progress: 0, message: '' })
            const sign = await getSign()
            urlsRef.current.set(key, await uploadFile(row, sign))
            patch(key, { progress: 100 })
          }
          buffer.push(toItem(row))
          patch(key, { status: 'a_publicar' })
          flush(false)
        } catch (error) {
          const stopped = error instanceof Error && error.message === 'stopped'
          patch(key, stopped ? { status: 'pendente', progress: 0 } : { status: 'erro', message: error instanceof Error ? error.message : 'Falha no envio.' })
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    flush(true)
    await chain
    runningRef.current = false
    setRunning(false)
    void finishUpload()
  }

  function stop() {
    stopRef.current = true
    xhrs.current.forEach((xhr) => xhr.abort())
  }

  const retryErrors = () => patchMany(new Set(rowsRef.current.filter((row) => row.status === 'erro' && row.file.size <= MAX_MB * 1048576).map((row) => row.key)), () => ({ status: 'pendente' as Status, message: '' }))

  const finished = counts.done + counts.errors
  const runSize = runKeysRef.current.size
  const runDone = running ? rows.filter((row) => runKeysRef.current.has(row.key) && (row.status === 'publicado' || row.status === 'erro')).length : 0
  const pct = runSize > 0 ? Math.min(100, Math.round((runDone / runSize) * 100)) : 0

  // ---------- Ecrã ----------
  if (rows.length === 0) {
    return (
      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${dragging ? 'border-marca bg-[#eef3ee]' : 'border-[#c9d7cd] bg-white'}`}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[#e6f0e9] text-marca"><Upload size={26} aria-hidden="true" /></span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Arrasta os documentos para aqui</h2>
          <p className="mt-1 max-w-md text-sm text-[#5f6d63]">Podes escolher vários ficheiros, ou uma pasta inteira. Depois classificas tudo de uma vez, sem repetir.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => filesInput.current?.click()} className={btnSolid}><Upload size={16} aria-hidden="true" />Escolher ficheiros</button>
          <button type="button" onClick={() => folderInput.current?.click()} className={btnLine}><FolderOpen size={16} aria-hidden="true" />Escolher pasta</button>
        </div>
        <p className="text-xs text-texto-2">PDF, Word, PowerPoint, Excel ou imagem. Até {MAX_MB} MB cada. Se as pastas tiverem o nome da disciplina, do ano ou da instituição, detetamo-los.</p>
        {notice && <p role="status" className="text-sm text-aviso-texto">{notice}</p>}
        <input ref={filesInput} type="file" multiple accept={ACCEPT} onChange={onPick} className="sr-only" tabIndex={-1} />
        <input ref={folderInput} type="file" multiple onChange={onPick} className="sr-only" tabIndex={-1} {...({ webkitdirectory: '' } as Record<string, string>)} />
      </div>
    )
  }

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'todos', label: 'Todos', count: rows.length },
    { id: 'incompletos', label: 'Sem categoria', count: counts.incomplete },
    { id: 'erros', label: 'Com erro', count: counts.errors },
    { id: 'existem', label: 'Já existem', count: counts.exist },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      {contexto}
      <section hidden={Boolean(initialDefaults)} className="rounded-2xl border border-linha bg-white p-4 sm:p-5" aria-label="Para todos">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Para todos os documentos</h2>
            <p className="text-xs text-texto-2">Define uma vez. O que deixares em branco é detetado pelo nome e pelas pastas.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-[#526057]"><input type="checkbox" checked={detect} onChange={(event) => setDetect(event.target.checked)} className="size-4 accent-marca" />Detetar pelo nome e pasta</label>
        </div>
        <FieldInputs values={defaults} onChange={(key, value) => setDefaults((previous) => ({ ...previous, [key]: value }))} catalog={catalog} blank="Não definir" disabled={running} />
      </section>

      <section className="flex min-h-[18rem] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-linha bg-white" aria-label="Documentos">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0e9] px-4 py-3 sm:px-5">
          <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleVisible(event.target.checked)} disabled={running || visible.length === 0} aria-label="Selecionar todos os visíveis" className="size-4 accent-marca" />
          <div role="group" aria-label="Filtro" className="flex flex-wrap gap-1">
            {filters.filter((item) => item.id === 'todos' || item.count > 0).map((item) => (
              <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === item.id ? 'bg-marca text-white' : 'bg-[#eef0ea] text-[#526057] hover:bg-[#e3e7de]'}`}>{item.label} {item.count}</button>
            ))}
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Procurar" aria-label="Procurar na lista" className={`${input} ml-auto h-9 max-w-48`} />
          <button type="button" onClick={() => filesInput.current?.click()} disabled={running} className={`${btnLine} min-h-9 px-3 text-xs`}>Adicionar mais</button>
          <button type="button" onClick={() => folderInput.current?.click()} disabled={running} className={`${btnLine} min-h-9 px-3 text-xs`}><FolderOpen size={14} aria-hidden="true" />Pasta</button>
          <input ref={filesInput} type="file" multiple accept={ACCEPT} onChange={onPick} className="sr-only" tabIndex={-1} />
          <input ref={folderInput} type="file" multiple onChange={onPick} className="sr-only" tabIndex={-1} {...({ webkitdirectory: '' } as Record<string, string>)} />
        </div>

        {counts.selected > 0 && !running && (
          <div className="border-b border-[#edf0e9] bg-[#f6f9f6] px-4 py-3 sm:px-5">
            <p className="mb-2 text-xs font-semibold text-marca">{counts.selected} {counts.selected === 1 ? 'selecionado' : 'selecionados'}: aplica um valor a todos de uma vez</p>
            <FieldInputs values={apply} onChange={(key, value) => setApply((previous) => ({ ...previous, [key]: value }))} catalog={catalog} blank="Não alterar" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={applyToSelected} disabled={!Object.values(apply).some((value) => value.trim())} className={`${btnSolid} min-h-9 px-4 text-xs`}>Aplicar aos selecionados</button>
              <button type="button" onClick={clearOverrides} className={`${btnLine} min-h-9 px-3 text-xs`}>Repor classificação</button>
              <button type="button" onClick={removeSelected} className={`${btnLine} min-h-9 px-3 text-xs text-erro-texto`}><Trash2 size={13} aria-hidden="true" />Tirar da lista</button>
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          <p className="m-6 text-center text-sm text-texto-2">Nenhum documento neste filtro.</p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto">
            {visible.map((row) => <RowItem key={row.key} row={row} defaults={defaults} detect={detect} lookups={lookups} locked={running} onSelect={onSelect} onTitle={onTitle} onRetry={onRetry} onAllowDuplicate={onAllowDuplicate} />)}
          </ul>
        )}
      </section>

      <footer className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d5e5da] bg-white/95 px-4 py-3 shadow-[0_-6px_24px_-16px_rgba(20,50,40,0.35)] backdrop-blur sm:px-5">
        <div className="min-w-0 flex-1 basis-56" aria-live="polite">
          {running ? (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#e6f0e9]"><div className="h-full rounded-full bg-marca transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
              <p className="mt-1.5 text-xs text-[#526057]">A publicar: {runDone} de {runSize}{counts.errors > 0 ? `, ${counts.errors} com erro` : ''}. Não feches esta página.</p>
            </>
          ) : (
            <p className="text-sm text-[#526057]">
              {counts.done > 0 && <span className="font-semibold text-marca">{counts.done} publicados. </span>}
              {counts.ready > 0 ? `${counts.ready} prontos a publicar` : counts.done > 0 && counts.errors === 0 && counts.incomplete === 0 ? 'Tudo publicado.' : 'Nada pronto a publicar'}
              {counts.incomplete > 0 && <span className="text-erro-texto"> · {counts.incomplete} sem categoria</span>}
              {counts.errors > 0 && <span className="text-erro-texto"> · {counts.errors} com erro</span>}
              {checking && <span> · a verificar duplicados…</span>}
            </p>
          )}
          {notice && !running && <p role="status" className="mt-0.5 text-xs text-aviso-texto">{notice}</p>}
        </div>
        {!running && counts.errors > 0 && <button type="button" onClick={retryErrors} className={btnLine}><RotateCcw size={15} aria-hidden="true" />Repetir erros</button>}
        {!running && finished > 0 && counts.ready === 0 && <Link href="/admin/materiais" className={btnLine}>Ver materiais</Link>}
        {!running && <button type="button" onClick={clearAll} className={btnLine}>Limpar lista</button>}
        {running ? (
          <button type="button" onClick={stop} className={btnLine}>Parar</button>
        ) : (
          <button type="button" onClick={start} disabled={counts.ready === 0 || checking} className={btnSolid}>{counts.ready > 0 ? `Publicar ${counts.ready} ${counts.ready === 1 ? 'material' : 'materiais'}` : 'Publicar'}</button>
        )}
      </footer>
    </div>
  )
}
