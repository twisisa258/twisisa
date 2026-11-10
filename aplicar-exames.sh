#!/usr/bin/env bash
# Páginas de exames: cabeçalho fixo, modo claro/escuro, bordas finas, só o essencial à vista e pré-visualização do PDF na página do exame.
# Corre na raiz do projeto:  mv aplicar-exames.sh ~/twisisa && cd ~/twisisa && bash aplicar-exames.sh
set -e
[ -f components/site/site-header.tsx ] && [ -f components/exames/public-shell.tsx ] && [ -f app/globals.css ] && [ -f app/exames/page.tsx ] || { echo "Corre este script na raiz do projeto (~/twisisa)."; exit 1; }

# 1) Biblioteca que desenha as folhas do PDF (versão fixa) e o ficheiro de apoio, servido pelo próprio site.
if ! grep -q '"pdfjs-dist"' package.json; then
  npm install --save-exact pdfjs-dist@4.10.38
fi
[ -f node_modules/pdfjs-dist/build/pdf.worker.min.mjs ] || { echo "pdfjs-dist não ficou instalado. Corre: npm install --save-exact pdfjs-dist@4.10.38"; exit 1; }
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs

# 2) Ligeiras alterações a ficheiros existentes (falha com aviso se o ficheiro já for diferente do esperado).
node - <<'TWISISA_EX6_NODE'
const fs = require('fs')
function patch(file, steps) {
  let text = fs.readFileSync(file, 'utf8')
  for (const [from, to, done] of steps) {
    if (text.includes(done)) continue
    if (!text.includes(from)) { console.error(`Não encontrei o trecho esperado em ${file}:\n${from}`); process.exit(1) }
    text = text.replace(from, to)
  }
  fs.writeFileSync(file, text)
}
patch('components/site/site-frame.tsx', [
  ['export async function SiteFrame({ children }: { children: React.ReactNode }) {', 'export async function SiteFrame({ children, themed = false }: { children: React.ReactNode; themed?: boolean }) {', 'themed = false'],
  ['<div className="tw min-h-screen">', '<div className={`tw min-h-screen${themed ? \' tw-th\' : \'\'}`}>', 'tw-th'],
  ['<SiteHeader />', '<SiteHeader themed={themed} />', 'themed={themed}'],
])
patch('components/site/site-header.tsx', [
  ["import { useSession } from '@/lib/auth-client'", "import { useSession } from '@/lib/auth-client'\nimport { ThemeToggle } from '@/components/site/theme-toggle'", 'ThemeToggle }'],
  ['export function SiteHeader() {', 'export function SiteHeader({ themed = false }: { themed?: boolean }) {', 'themed = false'],
  ['          {!signedIn && <span className="hidden md:block">', '          {themed && <ThemeToggle />}\n          {!signedIn && <span className="hidden md:block">', '{themed && <ThemeToggle />}'],
])
patch('app/layout.tsx', [['<html lang="pt-MZ">', '<html lang="pt-MZ" suppressHydrationWarning>', 'suppressHydrationWarning']])
TWISISA_EX6_NODE

mkdir -p components/exames components/site "app/exames/[inst]/[disc]/[id]"
cat > "components/site/theme-toggle.tsx" <<'TWISISA_EX6_EOF'
'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const KEY = 'tw-tema'

// Modo claro / escuro das páginas de exames. Segue o sistema até a pessoa escolher; a escolha fica guardada neste aparelho.
export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    setDark(root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  function toggle() {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setDark(!dark)
    try { window.localStorage.setItem(KEY, next) } catch { /* sem armazenamento: vale só nesta visita */ }
  }

  return (
    <button type="button" className="tw6-ic" onClick={toggle} aria-label={dark ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}>
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
TWISISA_EX6_EOF
cat > "components/exames/public-shell.tsx" <<'TWISISA_EX6_EOF'
import Link from 'next/link'
import { SiteFrame } from '@/components/site/site-frame'

// Aplica o modo guardado antes de a página aparecer (evita o «piscar» de claro para escuro).
const THEME_SCRIPT = "try{var t=localStorage.getItem('tw-tema');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}"

// Moldura das páginas de exames: cabeçalho fixo e rodapé da página inicial, com modo claro/escuro, e o conteúdo ao centro.
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <SiteFrame themed>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <main id="conteudo" className="tw5">{children}</main>
    </SiteFrame>
  )
}

// Voltar: uma ligação discreta para o nível de cima (a última ligação do caminho) e o caminho completo ao lado, no computador.
export function Crumbs({ items }: { items: { name: string; href?: string }[] }) {
  const parents = items.filter((item) => item.href)
  const back = parents[parents.length - 1]
  return (
    <div className="tw5-back">
      {back?.href && <Link href={back.href} className="tw-btn ol sm">← {back.name}</Link>}
      <nav aria-label="Caminho">
        {items.map((item, index) => (
          <span key={`${item.name}-${index}`}>
            {index > 0 && <i aria-hidden="true">/</i>}
            {item.href ? <Link href={item.href}>{item.name}</Link> : <b aria-current="page">{item.name}</b>}
          </span>
        ))}
      </nav>
    </div>
  )
}
TWISISA_EX6_EOF
cat > "components/exames/exam-row.tsx" <<'TWISISA_EX6_EOF'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { examPath } from '@/lib/exames-pure'
import type { ExamListItem } from '@/lib/exames'

/** «2023 (I)»: o ano e, se o exame tiver, a variante (I, II…). */
export function examYearLabel(exam: { heading: string; year: number | null }) {
  const variant = /\((IV|III|II|I)\)$/.exec(exam.heading)?.[1]
  if (!exam.year) return variant ? `(${variant})` : ''
  return variant ? `${exam.year} (${variant})` : String(exam.year)
}

// Uma linha da lista de exames: disciplina, universidade e ano. O título completo (pensado para o Google) fica no título da ligação.
export function ExamRow({ exam }: { exam: ExamListItem }) {
  return (
    <Link href={examPath(exam)} className="tw5-row" title={exam.heading} aria-label={exam.heading}>
      <b>{exam.subjectName}</b>
      <span>{exam.institutionShort}</span>
      <em>{examYearLabel(exam)}</em>
      <ChevronRight size={16} aria-hidden />
    </Link>
  )
}
TWISISA_EX6_EOF
cat > "components/exames/pdf-preview.tsx" <<'TWISISA_EX6_EOF'
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
TWISISA_EX6_EOF
cat > "app/exames/page.tsx" <<'TWISISA_EX6_EOF'
import Link from 'next/link'
import { Search, Target } from 'lucide-react'
import { ExamRow } from '@/components/exames/exam-row'
import { FaqList } from '@/components/exames/faq'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { faqHub, faqJsonLd } from '@/lib/exames-pure'
import { findExams, listOtherCategories, listPublicInstitutions } from '@/lib/exames'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

export const metadata = pageMetadata({
  title: 'Exames de admissão em Moçambique: ler, baixar e praticar | Twisisa',
  description: 'Exames de admissão anteriores da UEM, UP e de outras universidades moçambicanas. Lê sem conta, descarrega o PDF, vê os temas a estudar e treina com questões reais.',
  path: '/exames',
})

export default async function ExamesPage() {
  const [institutions, recent, others] = await Promise.all([
    listPublicInstitutions().catch(() => []),
    findExams({ limit: 6 }).catch(() => ({ items: [], total: 0 })),
    listOtherCategories().catch(() => []),
  ])
  const faq = faqHub(institutions.map((item) => item.shortName))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/exames#pagina`,
        url: `${SITE_URL}/exames`,
        name: 'Exames de admissão em Moçambique',
        inLanguage: 'pt-MZ',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: { '@type': 'ItemList', itemListElement: institutions.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}/exames/${item.slug}`, name: `Exames de admissão ${item.shortName}` })) },
      },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames', path: '/exames' }]),
      faqJsonLd(faq),
    ],
  }

  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames' }]} />

      <section className="tw5-top">
        <h1 className="tw5-h1">Exames</h1>
        <form role="search" action="/exames/pesquisa" method="get" className="tw5-search">
          <div>
            <label htmlFor="exames-q" className="sr-only">Pesquisar exames</label>
            <input id="exames-q" name="q" type="search" maxLength={80} autoComplete="off" placeholder="Ex.: Matemática UEM 2023" />
          </div>
          <button type="submit" className="tw-btn"><Search size={18} aria-hidden /> Pesquisar</button>
        </form>
      </section>

      <nav aria-label="Universidades">
        {institutions.length === 0 ? (
          <p className="tw5-vazio" style={{ marginTop: 20 }}>Ainda sem exames publicados.</p>
        ) : (
          <ul className="tw5-chips sc" style={{ marginTop: 18 }}>
            {institutions.map((item) => (
              <li key={item.id}>
                <Link href={`/exames/${item.slug}`} title={item.name}>{item.shortName}<small>{item.exams}</small></Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {recent.items.length > 0 && (
        <section className="tw5-sec" aria-labelledby="recentes">
          <div className="tw6-lh"><h2 id="recentes" className="tw5-h2">Mais recentes</h2><span>{recent.total}</span></div>
          <ul className="tw5-rows">
            {recent.items.map((exam) => <li key={exam.id}><ExamRow exam={exam} /></li>)}
          </ul>
          {recent.total > recent.items.length && <Link href="/exames/pesquisa" className="tw-btn ol tw6-wide">Ver os {recent.total} exames</Link>}
        </section>
      )}

      {others.length > 0 && (
        <section className="tw5-sec" aria-labelledby="outros">
          <div className="tw6-lh"><h2 id="outros" className="tw5-h2">Outros materiais</h2></div>
          <ul className="tw5-chips" style={{ marginTop: 10 }}>
            {others.map((item) => <li key={item.slug}><Link href={`/biblioteca/${item.slug}`}>{item.name}<small>{item.total}</small></Link></li>)}
          </ul>
        </section>
      )}

      <div className="tw6-tr">
        <b>Treina o que leste</b>
        <Link href="/simulado" className="tw-btn sm"><Target size={16} aria-hidden /> Simulador</Link>
      </div>

      <FaqList items={faq} />
    </PublicShell>
  )
}
TWISISA_EX6_EOF
cat > "app/exames/[inst]/[disc]/page.tsx" <<'TWISISA_EX6_EOF'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { FaqList } from '@/components/exames/faq'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { faqJsonLd, faqSubject } from '@/lib/exames-pure'
import { getSubjectPage, listPublicSubjects } from '@/lib/exames'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ inst: string; disc: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { inst, disc } = await params
  const page = await getSubjectPage(inst, disc).catch(() => null)
  if (!page) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  const { institution, subject, topics, exams } = page
  return pageMetadata({
    title: `Exame de admissão de ${subject.name} ${institution.shortName}: temas e exames anteriores | Twisisa`,
    description: `Exame de admissão de ${subject.name} na ${institution.shortName}: ${topics.length > 0 ? `os ${topics.length} temas principais a estudar` : 'o que estudar'}${exams.length > 0 ? `, ${exams.length} ${exams.length === 1 ? 'exame anterior' : 'exames anteriores'} para ler` : ''} e prática com questões reais.`,
    path: `/exames/${institution.slug}/${subject.slug}`,
  })
}

const SHOWN_EXAMS = 4

// «Matemática UEM 2023 (I)»: o título sem o prefixo, que já se percebe pela página. O título completo fica na ligação (Google e leitores de ecrã).
function ExamLine({ base, exam }: { base: string; exam: { id: string; heading: string } }) {
  return (
    <Link href={`${base}/${exam.id}`} className="tw5-row" title={exam.heading} aria-label={exam.heading}>
      <b>{exam.heading.replace(/^Exame de admissão de /, '')}</b>
      <ChevronRight size={16} aria-hidden />
    </Link>
  )
}

// Cursos agrupados pela faculdade/unidade (os maiores grupos primeiro; sem unidade vão para o fim).
function groupCourses(courses: { name: string; unit: string | null }[]) {
  const map = new Map<string, string[]>()
  for (const course of courses) {
    const unit = course.unit?.trim() || 'Outros cursos'
    map.set(unit, [...(map.get(unit) ?? []), course.name])
  }
  return [...map.entries()]
    .map(([unit, names]) => ({ unit, names }))
    .sort((x, y) => (x.unit === 'Outros cursos' ? 1 : y.unit === 'Outros cursos' ? -1 : y.names.length - x.names.length || x.unit.localeCompare(y.unit)))
}

export default async function SubjectExamPage({ params }: Props) {
  const { inst, disc } = await params
  const page = await getSubjectPage(inst, disc).catch(() => null)
  if (!page) notFound()
  const { institution, subject, topics, exams, courses } = page
  const base = `/exames/${institution.slug}/${subject.slug}`
  const otherSubjects = (await listPublicSubjects(institution).catch(() => [])).filter((item) => item.slug !== subject.slug)
  const groups = groupCourses(courses)
  const faq = faqSubject({ subject: subject.name, institution: institution.shortName, topics: topics.map((topic) => topic.title), examYears: exams.map((exam) => exam.year), examCount: exams.length })
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        url: `${SITE_URL}${base}`,
        name: `Exame de admissão de ${subject.name} ${institution.shortName}`,
        inLanguage: 'pt-MZ',
        about: { '@type': 'Thing', name: `Exame de admissão de ${subject.name}` },
        mainEntity: { '@type': 'ItemList', itemListElement: topics.map((topic) => ({ '@type': 'ListItem', position: topic.position, name: topic.title })) },
      },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames', path: '/exames' }, { name: institution.shortName, path: `/exames/${institution.slug}` }, { name: subject.name, path: base }]),
      faqJsonLd(faq),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: institution.shortName, href: `/exames/${institution.slug}` }, { name: subject.name }]} />
      <section className="tw5-top">
        <h1 className="tw5-h1">{subject.name} {institution.shortName}</h1>
        <p className="tw5-sub">Exame de admissão</p>
        <div className="tw5-actions">
          <Link href="/sign-up" className="tw-btn"><ArrowRight size={17} aria-hidden /> Praticar</Link>
          {topics.length > 0 && <a href={`${base}/temas.pdf`} className="tw-btn ol"><Download size={17} aria-hidden /> Temas em PDF</a>}
        </div>
      </section>

      {exams.length > 0 && (
        <section className="tw5-sec" aria-labelledby="exames">
          <div className="tw6-lh"><h2 id="exames" className="tw5-h2">Exames anteriores</h2><span>{exams.length}</span></div>
          <ul className="tw5-rows">
            {exams.slice(0, SHOWN_EXAMS).map((exam) => <li key={exam.id}><ExamLine base={base} exam={exam} /></li>)}
          </ul>
          {exams.length > SHOWN_EXAMS && (
            <details className="tw6-more">
              <summary>Ver mais {exams.length - SHOWN_EXAMS}</summary>
              <ul className="tw5-rows">
                {exams.slice(SHOWN_EXAMS).map((exam) => <li key={exam.id}><ExamLine base={base} exam={exam} /></li>)}
              </ul>
            </details>
          )}
        </section>
      )}

      {topics.length > 0 && (
        <section className="tw5-sec" aria-labelledby="temas">
          <div className="tw6-lh"><h2 id="temas" className="tw5-h2">Temas principais</h2><span>{topics.length}</span></div>
          <div className="tw5-faq" style={{ marginTop: 8 }}>
            {topics.map((topic) => (
              <details key={topic.position}>
                <summary><i className="n">{topic.position}</i>{topic.title}<b aria-hidden="true">+</b></summary>
                <p>{topic.summary}</p>
                {topic.tips && <p className="dica">Dica: {topic.tips}</p>}
              </details>
            ))}
          </div>
        </section>
      )}

      {courses.length > 0 && (
        <section className="tw5-sec" aria-labelledby="cursos">
          <div className="tw6-lh"><h2 id="cursos" className="tw5-h2">Cursos que pedem {subject.name}</h2><span>{courses.length}</span></div>
          {groups.length === 1 ? (
            <ul className="tw6-cur" style={{ marginTop: 10 }}>{groups[0].names.map((name) => <li key={name}>{name}</li>)}</ul>
          ) : (
            <div className="tw5-faq" style={{ marginTop: 8 }}>
              {groups.map((group) => (
                <details key={group.unit}>
                  <summary>{group.unit}<small>{group.names.length}</small><b aria-hidden="true">+</b></summary>
                  <ul className="tw6-cur">{group.names.map((name) => <li key={name}>{name}</li>)}</ul>
                </details>
              ))}
            </div>
          )}
        </section>
      )}

      {otherSubjects.length > 0 && (
        <section className="tw5-sec" aria-labelledby="outras">
          <div className="tw6-lh"><h2 id="outras" className="tw5-h2">Outras disciplinas</h2></div>
          <ul className="tw5-chips sc" style={{ marginTop: 10 }}>
            {otherSubjects.map((item) => <li key={item.id}><Link href={`/exames/${institution.slug}/${item.slug}`}>{item.name}</Link></li>)}
          </ul>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}
TWISISA_EX6_EOF
cat > "app/exames/[inst]/[disc]/[id]/page.tsx" <<'TWISISA_EX6_EOF'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download } from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { examYearLabel } from '@/components/exames/exam-row'
import { PdfPreview } from '@/components/exames/pdf-preview'
import { FaqList } from '@/components/exames/faq'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { examPath, faqExam, faqJsonLd } from '@/lib/exames-pure'
import { findExams, getPublicExam } from '@/lib/exames'
import { OG_IMAGE, SITE_LOCALE, SITE_NAME, SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ inst: string; disc: string; id: string }> }

async function load(params: Props['params']) {
  const { inst, disc, id } = await params
  if (!/^[\w-]{1,100}$/.test(id)) return null
  const exam = await getPublicExam(id).catch(() => null)
  // O endereço tem de bater com o documento: evita páginas duplicadas.
  if (!exam || exam.institution.slug !== inst || exam.subject.slug !== disc) return null
  return exam
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const exam = await load(params)
  if (!exam) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  const path = `/exames/${exam.institution.slug}/${exam.subject.slug}/${exam.id}`
  const description = `${exam.heading}: lê o exame em PDF, sem conta. Estuda os temas principais e pratica com questões reais da ${exam.institution.shortName} no Twisisa.`
  return {
    title: `${exam.heading} | ${SITE_NAME}`,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: { type: 'article', locale: SITE_LOCALE, siteName: SITE_NAME, url: path, title: exam.heading, description, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: exam.heading, description, images: [OG_IMAGE.url] },
  }
}

export default async function ExamPage({ params }: Props) {
  const exam = await load(params)
  if (!exam) notFound()
  const subjectPath = `/exames/${exam.institution.slug}/${exam.subject.slug}`
  const path = `${subjectPath}/${exam.id}`
  // Outros anos da mesma disciplina e universidade (inclui este): liga as páginas entre si e ajuda quem procura outro ano.
  const sameSubject = (await findExams({ institutionId: exam.institution.id, subjectId: exam.subject.id, limit: 12 }).catch(() => ({ items: [], total: 0 }))).items
  const faq = faqExam({ heading: exam.heading, subject: exam.subject.name, institution: exam.institution.shortName })
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        name: exam.heading,
        url: `${SITE_URL}${path}`,
        inLanguage: 'pt-MZ',
        learningResourceType: 'Exame de admissão',
        about: { '@type': 'Thing', name: exam.subject.name },
        provider: { '@type': 'CollegeOrUniversity', name: exam.institution.name },
        ...(exam.year ? { datePublished: String(exam.year) } : {}),
        isAccessibleForFree: true,
      },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames', path: '/exames' }, { name: exam.institution.shortName, path: `/exames/${exam.institution.slug}` }, { name: exam.subject.name, path: subjectPath }, { name: exam.heading, path }]),
      faqJsonLd(faq),
    ],
  }
  const viewer = `/api/publico/exames/${exam.id}`
  const download = `/api/biblioteca/${exam.id}/ficheiro?baixar=1`
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: exam.institution.shortName, href: `/exames/${exam.institution.slug}` }, { name: exam.subject.name, href: subjectPath }, { name: exam.heading }]} />
      <section className="tw5-top">
        <h1 className="tw5-h1">{exam.heading}</h1>
        <div className="tw5-actions">
          <a href={download} className="tw-btn"><Download size={17} aria-hidden /> Descarregar PDF</a>
        </div>
      </section>

      {/* O exame aparece aqui, folha a folha, sem tocar em nenhum botão. */}
      <PdfPreview src={viewer} title={exam.heading} downloadHref={download} />

      {sameSubject.length > 1 && (
        <section className="tw5-sec" aria-labelledby="outros">
          <div className="tw6-lh"><h2 id="outros" className="tw5-h2">Outros anos</h2></div>
          <ul className="tw5-chips sc" style={{ marginTop: 10 }}>
            {sameSubject.map((item) => (
              <li key={item.id}>
                {item.id === exam.id
                  ? <span aria-current="page">{examYearLabel(item) || item.title}</span>
                  : <Link href={examPath(item)} title={item.heading}>{examYearLabel(item) || item.title}</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="tw6-tr">
        <b>Pratica {exam.subject.name}</b>
        <Link href="/sign-up" className="tw-btn sm">Criar conta</Link>
      </div>

      <FaqList items={faq} />
    </PublicShell>
  )
}
TWISISA_EX6_EOF

# 3) Estilos (acrescentados ao fim; só valem dentro das páginas de exames)
if ! grep -q "twisisa-exames-6" app/globals.css; then
cat >> app/globals.css <<'TWISISA_EX6_EOF'

/* [twisisa-exames-6] páginas de exames: cabeçalho fixo, modo claro/escuro, bordas finas e só o essencial à vista (tudo sob .tw-th) */
.tw-th{--sf:#fff;--on:#fff;--hd:rgba(251,251,249,.9);--vw:#eceee9}
@media (prefers-color-scheme:dark){html:not([data-theme="light"]) .tw.tw-th{--g:#3fb883;--gd:#9fe3c2;--gs:#16281f;--ink:#e8efea;--mu:#93a39a;--ln:#24312b;--bg:#0d1512;--sf:#131d19;--on:#07150f;--hd:rgba(13,21,18,.9);--vw:#080e0b;color-scheme:dark}}
html[data-theme="dark"] .tw.tw-th{--g:#3fb883;--gd:#9fe3c2;--gs:#16281f;--ink:#e8efea;--mu:#93a39a;--ln:#24312b;--bg:#0d1512;--sf:#131d19;--on:#07150f;--hd:rgba(13,21,18,.9);--vw:#080e0b;color-scheme:dark}
.tw-th .tw5-skip{background:var(--sf)}

/* cabeçalho fixo */
.tw-th .tw-head{position:fixed;top:0;left:0;right:0;padding-top:env(safe-area-inset-top,0px);background:var(--hd)}
.tw-th .tw-bar{height:52px}
.tw-th .tw-brand{font-size:1.05rem;letter-spacing:-.03em}
.tw-th .tw-nav{gap:4px;font-size:.92rem}
.tw-th .tw-nav a{padding:6px 10px;border-radius:6px;font-weight:600;color:var(--mu)}
.tw-th .tw-nav a::after{display:none}
.tw-th .tw-nav a[aria-current=page]{color:var(--g);background:var(--gs)}
.tw-th .tw-mob a{padding:11px 0;font-size:1rem;font-weight:600}
.tw-th .tw-burger,.tw6-ic{width:36px;height:36px;display:grid;place-items:center;padding:0;border:1px solid var(--ln);border-radius:8px;background:transparent;color:var(--ink);font-size:1rem;cursor:pointer}
.tw-th .tw5{max-width:880px;padding-top:calc(52px + env(safe-area-inset-top,0px) + 18px)}
@media (min-width:900px){.tw-th .tw5{padding-top:calc(52px + env(safe-area-inset-top,0px) + 30px)}}
html:has(.tw-th){scroll-padding-top:calc(60px + env(safe-area-inset-top,0px))}

/* botões */
.tw-th .tw-btn{height:40px;padding:0 16px;border-radius:8px;border:1px solid transparent;color:var(--on);font-size:.92rem}
.tw-th .tw-btn.sm{height:36px;padding:0 14px}
.tw-th .tw-btn.lg{height:44px;padding:0 20px;font-size:.95rem}
.tw-th .tw-btn.ol{background:transparent;color:var(--ink);border-color:var(--ln)}
@media (hover:hover) and (pointer:fine){.tw-th .tw-btn:hover{transform:none;box-shadow:none;opacity:.92}.tw-th .tw-btn.ol:hover{opacity:1;background:transparent;border-color:var(--g);color:var(--g)}}
.tw-th .tw5-actions .tw-btn{height:40px;padding:0 16px;font-size:.92rem}
.tw-th .tw5-actions{margin-top:14px;gap:8px}
.tw6-wide{display:flex;width:100%;margin-top:12px}

/* voltar: ligação discreta */
.tw-th .tw5-back{margin-bottom:6px;gap:8px 18px}
.tw-th .tw5-back .tw-btn{height:auto;padding:6px 0;border:0;background:transparent;color:var(--mu);font-weight:600;font-size:.9rem}
@media (hover:hover) and (pointer:fine){.tw-th .tw5-back .tw-btn.ol:hover{color:var(--g);border:0}}

/* títulos e pesquisa */
.tw-th .tw5-top{animation:none}
.tw-th .tw5-h1{font-size:clamp(1.6rem,6vw,2.3rem);line-height:1.12;letter-spacing:-.04em}
.tw-th .tw5-h1 em{color:inherit}
.tw-th .tw5-sub{margin:4px 0 0;font-size:.9rem;font-weight:600;color:var(--mu)}
.tw-th .tw5-sec{margin-top:28px}
.tw-th .tw5-h2{margin:0;font-size:1.05rem;letter-spacing:-.02em}
.tw6-lh{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.tw6-lh span{color:var(--mu);font-size:.85rem;font-weight:600}
.tw-th .tw5-search{margin-top:28px;gap:8px}
.tw-th .tw5-search input{height:46px;padding:0 14px;border:1px solid var(--ln);border-radius:8px;background:var(--sf);color:var(--ink);font-weight:500}
.tw-th .tw5-search input::placeholder{color:var(--mu)}
.tw-th .tw5-search input:focus{border-color:var(--g);box-shadow:0 0 0 3px var(--gs)}
.tw-th .tw5-search .tw-btn{height:46px;padding:0 16px}

/* listas */
.tw-th .tw5-rows{margin-top:6px;border-bottom:0;border-top:1px solid var(--ln)}
.tw-th .tw5-row{gap:12px;padding:13px 2px;border-top:0;border-bottom:1px solid var(--ln)}
.tw-th .tw5-row b{min-width:0;font-size:1rem;font-weight:700;letter-spacing:-.015em;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tw-th .tw5-row span,.tw-th .tw5-row em{font-size:.85rem;font-weight:600;color:var(--mu);white-space:nowrap}
.tw-th .tw5-row em{font-weight:700;font-variant-numeric:tabular-nums}
.tw-th .tw5-row svg{flex:none;color:var(--mu)}
@media (hover:hover) and (pointer:fine){.tw-th .tw5-row:hover{background:var(--gs)}}
.tw6-more{margin-top:12px}
.tw6-more>summary{display:flex;align-items:center;justify-content:center;height:42px;border:1px solid var(--ln);border-radius:8px;font-weight:700;font-size:.92rem;cursor:pointer;list-style:none}
.tw6-more>summary::-webkit-details-marker{display:none}
.tw6-more[open]>summary{display:none}
.tw6-more[open]{margin-top:0}
.tw6-more[open]>.tw5-rows{margin-top:0;border-top:0}

/* chips (rolam de lado no telemóvel) */
.tw-th .tw5-chips{gap:8px}
.tw-th .tw5-chips a,.tw-th .tw5-chips span{height:34px;padding:0 12px;border:1px solid var(--ln);border-radius:6px;background:var(--sf);color:var(--ink);font-size:.9rem;font-weight:700;gap:0}
.tw-th .tw5-chips small{margin-left:6px;color:var(--mu);font-size:.8rem;font-weight:600}
.tw-th .tw5-chips [aria-current]{background:var(--g);border-color:var(--g);color:var(--on)}
@media (hover:hover) and (pointer:fine){.tw-th .tw5-chips a:hover{background:var(--sf);border-color:var(--g);color:var(--g)}}
.tw-th .tw5-chips.sc{flex-wrap:nowrap;overflow-x:auto;margin-inline:-20px;padding:0 20px 2px;scrollbar-width:none}
.tw-th .tw5-chips.sc::-webkit-scrollbar{display:none}
.tw-th .tw5-chips.sc li{flex:none}

/* cartões das disciplinas (página da universidade): linhas compactas */
.tw-th .tw5-tiles{gap:8px}
.tw-th .tw5-tile{flex-direction:row;align-items:center;gap:10px;height:auto;padding:12px 14px;border:1px solid var(--ln);border-radius:8px;background:var(--sf)}
.tw-th .tw5-tile b{flex:1;font-size:1rem;letter-spacing:-.015em}
.tw-th .tw5-tile small{display:none}
.tw-th .tw5-tile span{margin:0;padding:0;font-size:.85rem;font-weight:600;color:var(--mu)}
@media (hover:hover) and (pointer:fine){.tw-th .tw5-tile:hover{transform:none;border-color:var(--g)}}

/* perguntas, temas e cursos: fechados, abrem ao toque */
.tw-th .tw5-faq details{padding:0;border-top:1px solid var(--ln)}
.tw-th .tw5-faq details:last-child{border-bottom:1px solid var(--ln)}
.tw-th .tw5-faq summary{align-items:center;gap:10px;padding:13px 2px;font:700 1rem/1.3 'DM Sans',system-ui,sans-serif;letter-spacing:0}
.tw-th .tw5-faq summary b{font-size:1.3rem}
.tw-th .tw5-faq summary .n{flex:none;width:22px;font-style:normal;font-weight:800;color:var(--g);font-variant-numeric:tabular-nums}
.tw-th .tw5-faq summary small{margin-left:auto;color:var(--mu);font-size:.85rem;font-weight:600}
.tw-th .tw5-faq p{margin:0 0 14px;max-width:62ch;font-size:.95rem;line-height:1.55;color:var(--mu)}
.tw-th .tw5-faq .dica{margin:-4px 0 14px;font-weight:600;font-size:.9rem;color:var(--ink)}
.tw6-cur{list-style:none;columns:2;column-gap:20px;margin:0 0 14px;padding:0;color:var(--mu);font-size:.92rem}
.tw6-cur li{break-inside:avoid;padding:3px 0}
@media (min-width:600px){.tw6-cur{columns:3}}
.tw-th .tw5-vazio{padding:20px;border:1px dashed var(--ln);border-radius:8px;color:var(--mu)}
.tw-th .tw5-pager{margin-top:24px}

/* linha de convite ao simulador (no lugar da faixa verde) */
.tw6-tr{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:28px;padding:12px 14px;border:1px solid var(--ln);border-radius:8px;background:var(--sf)}
.tw6-tr b{font:800 1rem 'Manrope',system-ui,sans-serif;letter-spacing:-.02em}

/* pré-visualização do exame: as folhas do PDF, uma a seguir à outra */
.tw6-vw{display:grid;justify-items:center;gap:12px;margin-top:16px;padding:12px;border-radius:8px;background:var(--vw)}
.tw6-sheet{position:relative;width:100%;max-width:720px;border-radius:2px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18);overflow:hidden}
.tw6-sheet canvas{display:block;width:100%;height:100%}
.tw6-wait{display:grid;place-items:center;min-height:55vh;color:#5d6b64;font-weight:600}
.tw6-rest{width:100%;max-width:720px;background:var(--sf)}
.tw6-pg{position:sticky;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:5;padding:6px 12px;border-radius:99px;background:var(--ink);color:var(--bg);font-size:.8rem;font-weight:700;font-variant-numeric:tabular-nums;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.tw6-msg{gap:14px;padding:24px 16px;text-align:center}
.tw6-msg p{margin:0;color:var(--mu);font-weight:600}
TWISISA_EX6_EOF
fi

echo "Páginas de exames atualizadas."

# 4) Git
if [ -d .git ]; then
  git add app components public package.json package-lock.json
  git commit -m "Exames: cabeçalho fixo, modo claro/escuro, bordas finas, pré-visualização do PDF e listas só com o essencial"
  git push origin main
fi
