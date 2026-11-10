#!/usr/bin/env bash
# Exames v2 (proposta aprovada): página da disciplina com título de identidade, separadores com números (Exames · Temas · Cursos),
# exame mais recente em destaque, pesquisa de cursos com barras e «Outras disciplinas».
# Antes do login: cabeçalho e rodapé públicos. Depois do login: menu do aluno (barra lateral no computador, gaveta no telemóvel).
# Corre na raiz do projeto:  mv aplicar-exames-v2.sh ~/twisisa && cd ~/twisisa && bash aplicar-exames-v2.sh
set -e
[ -f components/site/site-frame.tsx ] && [ -f components/exames/public-shell.tsx ] && [ -f components/student-nav.tsx ] && [ -f app/globals.css ] && [ -f "app/exames/[inst]/[disc]/page.tsx" ] || { echo "Corre este script na raiz do projeto (~/twisisa)."; exit 1; }
grep -q 'twisisa-exames-6' app/globals.css || { echo "Falta a base das páginas de exames (aplicar-exames.sh). Corre-o primeiro."; exit 1; }

mkdir -p components/exames lib tests "app/exames/[inst]/[disc]"

cat > "lib/exames-ui.ts" <<'TWISISA_EX2_EOF'
// Pequenas regras puras da página de disciplina (testadas em tests/exames-ui.test.ts).

const HUES = [215, 152, 28, 338, 268, 190, 92, 8] as const

/** Uma cor de identidade por disciplina: sempre a mesma para o mesmo endereço. */
export function subjectHue(slug: string): number {
  let hash = 0
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return HUES[hash % HUES.length]
}

/** «Exame de admissão de Matemática UEM 2023 (I)» → «2023 (I)». Sem ano no título, usa o ano da base ou o título inteiro. */
export function examLabel(heading: string, institutionShort: string, year: number | null): string {
  const marker = `${institutionShort} `
  const at = heading.indexOf(marker)
  const rest = at >= 0 ? heading.slice(at + marker.length).trim() : ''
  if (rest) return rest
  return year ? String(year) : heading.replace(/^Exame de admissão de /, '')
}

/** «Praticar Português»; nomes compridos ficam só «Praticar» (o botão não quebra o texto). */
export function practiceLabel(subjectName: string): string {
  return subjectName.length <= 14 ? `Praticar ${subjectName}` : 'Praticar'
}

export type CourseGroup = { unit: string; names: string[] }

/** Cursos agrupados pela faculdade ou escola (os maiores grupos primeiro; sem unidade vão para o fim). */
export function groupCourses(courses: { name: string; unit: string | null }[]): CourseGroup[] {
  const others = 'Outros cursos'
  const map = new Map<string, string[]>()
  for (const course of courses) {
    const unit = course.unit?.trim() || others
    map.set(unit, [...(map.get(unit) ?? []), course.name])
  }
  return [...map.entries()]
    .map(([unit, names]) => ({ unit, names }))
    .sort((x, y) => (x.unit === others ? 1 : y.unit === others ? -1 : y.names.length - x.names.length || x.unit.localeCompare(y.unit)))
}

/** Texto sem acentos e em minúsculas, para a pesquisa de cursos. */
export function plain(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Cursos que contêm a pesquisa no nome do curso ou da faculdade. */
export function searchCourses(groups: CourseGroup[], query: string): { name: string; unit: string }[] {
  const q = plain(query.trim())
  if (!q) return []
  const found: { name: string; unit: string }[] = []
  for (const group of groups) {
    for (const name of group.names) {
      if (plain(name).includes(q) || plain(group.unit).includes(q)) found.push({ name, unit: group.unit })
    }
  }
  return found
}
TWISISA_EX2_EOF

cat > "tests/exames-ui.test.ts" <<'TWISISA_EX2_EOF'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { examLabel, groupCourses, practiceLabel, searchCourses, subjectHue } from '../lib/exames-ui'

test('cor da disciplina: estável e dentro do círculo de cores', () => {
  assert.equal(subjectHue('portugues'), subjectHue('portugues'))
  for (const slug of ['matematica', 'fisica', 'quimica', 'biologia', 'ingles', '']) {
    const hue = subjectHue(slug)
    assert.ok(hue >= 0 && hue < 360)
  }
})

test('etiqueta do exame sem o prefixo repetido', () => {
  assert.equal(examLabel('Exame de admissão de Matemática UEM 2023 (I)', 'UEM', 2023), '2023 (I)')
  assert.equal(examLabel('Exame de admissão de Física UEM 2022', 'UEM', 2022), '2022')
  assert.equal(examLabel('Prova antiga de Química', 'UEM', 2019), '2019')
  assert.equal(examLabel('Exame de admissão de Química', 'UEM', null), 'Química')
})

test('botão de praticar: nomes compridos ficam só «Praticar»', () => {
  assert.equal(practiceLabel('Português'), 'Praticar Português')
  assert.equal(practiceLabel('Geografia e História de Moçambique'), 'Praticar')
})

test('cursos: grupos por faculdade e pesquisa sem acentos', () => {
  const groups = groupCourses([
    { name: 'Direito', unit: 'Faculdade de Direito' },
    { name: 'Biologia', unit: 'Faculdade de Ciências' },
    { name: 'Química', unit: 'Faculdade de Ciências' },
    { name: 'Curso solto', unit: null },
  ])
  assert.deepEqual(groups.map((g) => g.unit), ['Faculdade de Ciências', 'Faculdade de Direito', 'Outros cursos'])
  assert.deepEqual(searchCourses(groups, 'quimica'), [{ name: 'Química', unit: 'Faculdade de Ciências' }])
  assert.equal(searchCourses(groups, 'ciencias').length, 2)
  assert.equal(searchCourses(groups, '   ').length, 0)
})
TWISISA_EX2_EOF

cat > "components/exames/aluno-chrome.tsx" <<'TWISISA_EX2_EOF'
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, Menu, X } from 'lucide-react'
import { Avatar } from '@/components/aluno/avatar'
import { SignOutButton } from '@/components/sign-out-button'
import { ThemeToggle } from '@/components/site/theme-toggle'
import { MAIN, PERSONAL, SAVED } from '@/components/student-nav'
import { useSession } from '@/lib/auth-client'

// Depois do login, as páginas públicas de exames ganham o menu do aluno (barra lateral no computador, gaveta no telemóvel).
// Antes do login nada disto aparece: o CSS só mostra este bloco quando <html data-shell="aluno">.
// O aviso fica guardado neste aparelho (HINT) para a página já abrir no sítio certo, sem «piscar»; a sessão confirma logo a seguir.
export const SHELL_HINT = 'tw-aluno'

type Item = (typeof MAIN)[number] | (typeof SAVED)[number] | (typeof PERSONAL)[number]

function isActive(path: string, item: Item) {
  return 'exact' in item && item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`)
}

function Group({ label, items, path, onNavigate }: { label: string; items: readonly Item[]; path: string; onNavigate?: () => void }) {
  return (
    <>
      <p>{label}</p>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={isActive(path, item) ? 'page' : undefined}>
            <Icon size={17} aria-hidden />{item.label}
          </Link>
        )
      })}
    </>
  )
}

function Groups({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <nav className="ex2-nav" aria-label="Menu do aluno">
      <Group label="Estudar" items={MAIN} path={path} onNavigate={onNavigate} />
      <Group label="Guardado" items={SAVED} path={path} onNavigate={onNavigate} />
      <Group label="A minha conta" items={PERSONAL} path={path} onNavigate={onNavigate} />
    </nav>
  )
}

export function AlunoChrome() {
  const path = usePathname() ?? ''
  const { data, isPending } = useSession()
  const [open, setOpen] = useState(false)
  const user = data?.user
  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] || 'Eu'

  useEffect(() => {
    if (isPending) return
    document.documentElement.dataset.shell = user ? 'aluno' : 'publico'
    try {
      if (user) window.localStorage.setItem(SHELL_HINT, '1')
      else window.localStorage.removeItem(SHELL_HINT)
    } catch { /* sem armazenamento: vale só nesta visita */ }
  }, [isPending, user])

  useEffect(() => { setOpen(false) }, [path])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <>
      <aside className="ex2-side" aria-label="Menu do aluno">
        <Link href="/aluno" className="tw-brand ex2-sb"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-6 w-auto" />Twisisa</Link>
        <Groups path={path} />
        <div className="ex2-me">
          <Link href="/aluno/perfil" className="ex2-who"><Avatar name={firstName} image={user?.image ?? null} size={30} /><span>{firstName}</span></Link>
          <SignOutButton />
        </div>
      </aside>

      <header className="ex2-hd">
        <div className="ex2-bar">
          <button type="button" className="tw6-ic ex2-menu" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={18} aria-hidden /></button>
          <Link href="/aluno" className="tw-brand ex2-brand" aria-label="Twisisa, painel"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} priority className="h-6 w-auto" />Twisisa</Link>
          <span className="ex2-sp" />
          <ThemeToggle />
          <Link href="/aluno/notificacoes" className="tw6-ic" aria-label="Notificações"><Bell size={18} aria-hidden /></Link>
          <Link href="/aluno/perfil" aria-label="O meu perfil" className="ex2-av"><Avatar name={firstName} image={user?.image ?? null} size={32} /></Link>
        </div>
      </header>

      {open && (
        <div className="ex2-dr" role="dialog" aria-modal="true" aria-label="Menu do aluno">
          <button type="button" className="ex2-ov" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div className="ex2-pn">
            <div className="ex2-pt">
              <Link href="/aluno" onClick={() => setOpen(false)} className="tw-brand"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-6 w-auto" />Twisisa</Link>
              <button type="button" className="tw6-ic" aria-label="Fechar menu" onClick={() => setOpen(false)}><X size={18} aria-hidden /></button>
            </div>
            <Groups path={path} onNavigate={() => setOpen(false)} />
            <div className="ex2-me">
              <Link href="/aluno/perfil" className="ex2-who" onClick={() => setOpen(false)}><Avatar name={firstName} image={user?.image ?? null} size={30} /><span>{firstName}</span></Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
TWISISA_EX2_EOF

cat > "components/exames/public-shell.tsx" <<'TWISISA_EX2_EOF'
import Link from 'next/link'
import { AlunoChrome } from '@/components/exames/aluno-chrome'
import { SiteFrame } from '@/components/site/site-frame'

// Corre antes de a página aparecer: aplica o modo claro/escuro guardado e, se este aparelho já tem um aluno com sessão, a moldura do aluno (evita o «piscar»).
const SHELL_SCRIPT = "try{var d=document.documentElement,t=localStorage.getItem('tw-tema');if(t==='dark'||t==='light')d.dataset.theme=t;if(localStorage.getItem('tw-aluno')==='1')d.dataset.shell='aluno'}catch(e){}"

// Moldura das páginas de exames. Antes do login: cabeçalho e rodapé públicos. Depois do login: o menu do aluno (barra lateral no computador, gaveta no telemóvel).
// As duas versões vêm no mesmo HTML e o CSS escolhe uma, por isso a página continua estática e indexável.
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SHELL_SCRIPT }} />
      <SiteFrame themed>
        <AlunoChrome />
        <div className="ex2-wrap">
          <main id="conteudo" className="tw5">{children}</main>
        </div>
      </SiteFrame>
    </>
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
TWISISA_EX2_EOF

cat > "components/exames/disciplina-tabs.tsx" <<'TWISISA_EX2_EOF'
'use client'

import { useCallback, useEffect, useState } from 'react'

export type DisciplinaTab = { id: string; label: string; count: number; panel: React.ReactNode }

// Separadores com números (Exames · Temas · Cursos). Todos os painéis vêm no HTML do servidor (o Google lê tudo); só um fica visível.
// O endereço #temas ou #cursos abre o separador certo.
export function DisciplinaTabs({ tabs, label }: { tabs: DisciplinaTab[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')

  const fromHash = useCallback(() => {
    const id = window.location.hash.replace('#', '')
    if (tabs.some((tab) => tab.id === id)) setActive(id)
  }, [tabs])

  useEffect(() => {
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [fromHash])

  function choose(id: string) {
    setActive(id)
    try { window.history.replaceState(null, '', `#${id}`) } catch { /* sem histórico: o separador muda na mesma */ }
  }

  function onKey(event: React.KeyboardEvent, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    choose(next.id)
    document.getElementById(`ex2-tab-${next.id}`)?.focus()
  }

  if (tabs.length === 0) return null
  return (
    <>
      {tabs.length > 1 && (
        <div className="ex2-tabs">
          <div className="ex2-tl" role="tablist" aria-label={label} style={{ '--n': tabs.length } as React.CSSProperties}>
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                id={`ex2-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active === tab.id}
                aria-controls={`ex2-panel-${tab.id}`}
                tabIndex={active === tab.id ? 0 : -1}
                onClick={() => choose(tab.id)}
                onKeyDown={(event) => onKey(event, index)}
              >
                <b>{tab.count}</b><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {tabs.map((tab) => (
        <section key={tab.id} id={`ex2-panel-${tab.id}`} role={tabs.length > 1 ? 'tabpanel' : undefined} aria-labelledby={tabs.length > 1 ? `ex2-tab-${tab.id}` : undefined} className="ex2-panel" hidden={tabs.length > 1 && active !== tab.id}>
          {tab.panel}
        </section>
      ))}
    </>
  )
}
TWISISA_EX2_EOF

cat > "components/exames/cursos-panel.tsx" <<'TWISISA_EX2_EOF'
'use client'

import { useId, useState } from 'react'
import { Search } from 'lucide-react'
import { searchCourses, type CourseGroup } from '@/lib/exames-ui'

// Cursos que pedem a disciplina: pesquisa por curso ou faculdade, e uma barra por faculdade proporcional ao número de cursos.
export function CursosPanel({ subject, groups }: { subject: string; groups: CourseGroup[] }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const total = groups.reduce((sum, group) => sum + group.names.length, 0)
  const max = Math.max(1, ...groups.map((group) => group.names.length))
  const found = searchCourses(groups, query)
  const searching = query.trim() !== ''
  const single = groups.length === 1

  let hint = single ? `${total} ${total === 1 ? 'curso pede' : 'cursos pedem'} ${subject}.` : `${total} cursos em ${groups.length} faculdades. Toca numa para ver os cursos.`
  if (searching) hint = found.length > 0 ? `Sim, ${found.length === 1 ? '1 curso pede' : `${found.length} cursos pedem`} ${subject}.` : ''

  return (
    <>
      <div className="ex2-q">
        <label htmlFor={id} className="ex2-sr">Procurar curso</label>
        <Search size={18} aria-hidden />
        <input id={id} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`O teu curso pede ${subject}?`} autoComplete="off" />
      </div>
      <p className="ex2-hint" aria-live="polite">{hint}</p>

      {searching ? (
        found.length > 0 ? (
          <div className="ex2-res">
            {found.map((item) => <div key={`${item.unit}-${item.name}`}>{item.name}{item.unit !== 'Outros cursos' && <small>{item.unit}</small>}</div>)}
          </div>
        ) : (
          <div className="ex2-vz">Nenhum curso com esse nome pede {subject}. Confirma o nome ou tenta outra palavra.</div>
        )
      ) : single ? (
        <div className="ex2-cl ex2-solo">{groups[0].names.map((name) => <span key={name}>{name}</span>)}</div>
      ) : (
        <div className="ex2-fu">
          {groups.map((group) => (
            <details key={group.unit}>
              <summary>
                <span className="nm">{group.unit}</span>
                <span className="ct">{group.names.length}</span>
                <span className="br" aria-hidden="true"><i style={{ '--w': `${Math.round((group.names.length / max) * 100)}%` } as React.CSSProperties} /></span>
              </summary>
              <div className="ex2-cl">{group.names.map((name) => <span key={name}>{name}</span>)}</div>
            </details>
          ))}
        </div>
      )}
    </>
  )
}
TWISISA_EX2_EOF

cat > "app/exames/[inst]/[disc]/page.tsx" <<'TWISISA_EX2_EOF'
import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { CursosPanel } from '@/components/exames/cursos-panel'
import { DisciplinaTabs, type DisciplinaTab } from '@/components/exames/disciplina-tabs'
import { FaqList } from '@/components/exames/faq'
import { PublicShell } from '@/components/exames/public-shell'
import { faqJsonLd, faqSubject } from '@/lib/exames-pure'
import { examLabel, groupCourses, practiceLabel, subjectHue } from '@/lib/exames-ui'
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

const SHOWN_YEARS = 3

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

  const label = (exam: { heading: string; year: number | null }) => examLabel(exam.heading, institution.shortName, exam.year)
  const [latest, ...older] = exams
  const tabs: DisciplinaTab[] = []

  if (latest) {
    tabs.push({
      id: 'exames',
      label: 'Exames',
      count: exams.length,
      panel: (
        <>
          <h2 className="ex2-sr">Exames anteriores de {subject.name} {institution.shortName}</h2>
          <div className="ex2-feat">
            <div className="t">
              <span className="ex2-tag">Mais recente</span>
              <p className="ex2-year">{label(latest)}</p>
              <p className="ex2-fs">Exame de admissão de {subject.name} {institution.shortName}</p>
              <Link href={`${base}/${latest.id}`} className="tw-btn sm" title={latest.heading} aria-label={`Ler ${latest.heading}`}>Ler exame</Link>
            </div>
            <div className="ex2-paper" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
          </div>
          {older.length > 0 && (
            <>
              <ul className="ex2-yl">
                {older.slice(0, SHOWN_YEARS).map((exam) => <li key={exam.id}><YearRow href={`${base}/${exam.id}`} heading={exam.heading} text={label(exam)} /></li>)}
              </ul>
              {older.length > SHOWN_YEARS && (
                <details className="ex2-more">
                  <summary>Ver mais {older.length - SHOWN_YEARS}</summary>
                  <ul className="ex2-yl">
                    {older.slice(SHOWN_YEARS).map((exam) => <li key={exam.id}><YearRow href={`${base}/${exam.id}`} heading={exam.heading} text={label(exam)} /></li>)}
                  </ul>
                </details>
              )}
            </>
          )}
        </>
      ),
    })
  }

  if (topics.length > 0) {
    tabs.push({
      id: 'temas',
      label: 'Temas',
      count: topics.length,
      panel: (
        <>
          <h2 className="ex2-sr">Temas principais do exame de {subject.name} {institution.shortName}</h2>
          <div className="ex2-tm">
            {topics.map((topic, index) => (
              <details key={topic.position} open={index === 0}>
                <summary><span className="nn">{topic.position}</span>{topic.title}</summary>
                <p>{topic.summary}</p>
                {topic.tips && <div className="dc">Dica: {topic.tips}</div>}
              </details>
            ))}
          </div>
        </>
      ),
    })
  }

  if (courses.length > 0) {
    tabs.push({
      id: 'cursos',
      label: 'Cursos',
      count: courses.length,
      panel: (
        <>
          <h2 className="ex2-sr">Cursos da {institution.shortName} que pedem {subject.name}</h2>
          <CursosPanel subject={subject.name} groups={groups} />
        </>
      ),
    })
  }

  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Link href={`/exames/${institution.slug}`} className="ex2-back"><ChevronLeft size={16} aria-hidden />{institution.shortName}</Link>

      <header className="ex2-ti">
        <div className="ex2-tile" style={{ '--hue': subjectHue(subject.slug) } as CSSProperties} aria-hidden="true">{subject.name.trim().slice(0, 1).toUpperCase()}</div>
        <div>
          <h1 className="ex2-h1">{subject.name}</h1>
          <p className="ex2-sub">{institution.shortName} · Exame de admissão</p>
        </div>
      </header>

      <div className="ex2-acts">
        <Link href="/sign-up" className="tw-btn ex2-main ex2-pub">{practiceLabel(subject.name)}</Link>
        <Link href="/aluno/simulador" className="tw-btn ex2-main ex2-al">{practiceLabel(subject.name)}</Link>
        {topics.length > 0 && <a href={`${base}/temas.pdf`} className="tw-btn ol" aria-label="Temas em PDF"><Download size={17} aria-hidden />PDF</a>}
      </div>

      <DisciplinaTabs tabs={tabs} label={`${subject.name} ${institution.shortName}`} />

      {otherSubjects.length > 0 && (
        <section className="ex2-oth" aria-labelledby="outras">
          <h2 id="outras">Outras disciplinas</h2>
          <ul className="ex2-chips">
            {otherSubjects.map((item) => <li key={item.id}><Link href={`/exames/${institution.slug}/${item.slug}`}>{item.name}</Link></li>)}
          </ul>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}

function YearRow({ href, heading, text }: { href: string; heading: string; text: string }) {
  return (
    <Link href={href} className="ex2-yr" title={heading} aria-label={heading}>
      <b>{text}</b><span>Exame de admissão</span><ChevronRight size={16} aria-hidden />
    </Link>
  )
}
TWISISA_EX2_EOF

# O menu do aluno e esta moldura usam a mesma lista de ligações: passa a ser exportada.
node - <<'TWISISA_EX2_NODE'
const fs = require('fs')
let nav = fs.readFileSync('components/student-nav.tsx', 'utf8')
for (const name of ['MAIN', 'SAVED', 'PERSONAL']) {
  if (nav.includes('export const ' + name + ' = [')) continue
  if (!nav.includes('\nconst ' + name + ' = [')) { console.error('Não encontrei a lista ' + name + ' em components/student-nav.tsx'); process.exit(1) }
  nav = nav.replace('\nconst ' + name + ' = [', '\nexport const ' + name + ' = [')
}
fs.writeFileSync('components/student-nav.tsx', nav)

if (fs.existsSync('State.md')) {
  let state = fs.readFileSync('State.md', 'utf8')
  if (!state.includes('## Exames v2')) {
    state = state.replace('\n## Pendentes, por prioridade', `
## Exames v2 (10/11/2026), FEITO, FALTA TESTE
- Página da disciplina (\`/exames/<universidade>/<disciplina>\`): título com cor da disciplina, separadores com números (Exames, Temas, Cursos; só aparecem os que têm conteúdo, \`#temas\` e \`#cursos\` abrem o separador), exame mais recente em destaque, pesquisa de cursos com barras por faculdade e «Outras disciplinas». Perguntas frequentes mantidas (os dados estruturados exigem o texto visível). Regras puras em \`lib/exames-ui.ts\` (teste em \`tests/exames-ui.test.ts\`).
- Antes e depois do login nas páginas públicas de exames e no simulado público (\`components/exames/public-shell.tsx\`): o servidor envia as duas versões e o CSS escolhe por \`html[data-shell]\`. Sem sessão: cabeçalho e rodapé públicos. Com sessão: barra lateral no computador (a partir de 900 px) e gaveta no telemóvel, com as mesmas ligações do menu do aluno (\`components/exames/aluno-chrome.tsx\`). As páginas continuam estáticas (sem ler a sessão no servidor); o aparelho guarda um aviso (\`tw-aluno\`) para abrir já na versão certa e a sessão confirma. Por confirmar num telemóvel: o primeiro acesso depois de entrar (sem aviso guardado) mostra por instantes a versão pública.
\n## Pendentes, por prioridade`)
    fs.writeFileSync('State.md', state)
  }
}
TWISISA_EX2_NODE

# Estilos (uma só vez).
if ! grep -q 'twisisa-exames-v2' app/globals.css; then
cat >> app/globals.css <<'TWISISA_EX2_EOF'

/* [twisisa-exames-v2] disciplina: título com identidade, separadores com números, exame em destaque. Antes do login (cabeçalho público) e depois (menu do aluno). */
.ex2-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* antes / depois do login: o servidor envia as duas versões e o CSS escolhe (html[data-shell] vem do aparelho e da sessão) */
.tw-th .ex2-side,.tw-th .ex2-hd{display:none}
html[data-shell="aluno"] .tw-th .ex2-pub{display:none!important}
html:not([data-shell="aluno"]) .tw-th .ex2-al{display:none!important}
html[data-shell="aluno"] .tw-th .tw-head,html[data-shell="aluno"] .tw-th .tw-foot{display:none}
html[data-shell="aluno"] .tw-th .ex2-hd{display:block}
.tw-th .ex2-hd{position:fixed;top:0;left:0;right:0;z-index:40;padding-top:env(safe-area-inset-top,0px);background:var(--hd);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--ln)}
.ex2-bar{max-width:880px;height:52px;margin:0 auto;padding:0 16px;display:flex;align-items:center;gap:8px}
.ex2-sp{flex:1}
.ex2-av{display:inline-flex;margin-left:2px}
.ex2-wrap{min-width:0}
.tw-th .ex2-side{position:fixed;top:0;bottom:0;left:0;z-index:45;width:232px;flex-direction:column;padding:calc(18px + env(safe-area-inset-top,0px)) 14px 14px;background:var(--sf);border-right:1px solid var(--ln);overflow-y:auto}
.ex2-sb{padding:4px 8px 16px}
.ex2-nav{display:flex;flex-direction:column;gap:2px;flex:1}
.ex2-nav p{margin:14px 10px 4px;font-size:.78rem;font-weight:700;color:var(--mu)}
.ex2-nav p:first-child{margin-top:0}
.ex2-nav a{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;font-weight:600;font-size:.92rem;color:var(--mu)}
.ex2-nav a[aria-current=page]{background:var(--g);color:var(--on)}
@media (hover:hover) and (pointer:fine){.ex2-nav a:not([aria-current=page]):hover{background:var(--gs);color:var(--g)}}
.ex2-me{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--ln)}
.ex2-who{display:flex;align-items:center;gap:8px;min-width:0;font-weight:600;font-size:.85rem}
.ex2-who span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (min-width:900px){
  html[data-shell="aluno"] .tw-th .ex2-side{display:flex}
  html[data-shell="aluno"] .tw-th .ex2-hd{left:232px}
  html[data-shell="aluno"] .tw-th .ex2-wrap{margin-left:232px}
  html[data-shell="aluno"] .tw-th .ex2-menu,html[data-shell="aluno"] .tw-th .ex2-brand{display:none}
}
/* gaveta do telemóvel */
.ex2-dr{position:fixed;inset:0;z-index:60}
.ex2-ov{position:absolute;inset:0;border:0;background:rgba(8,16,12,.5)}
.ex2-pn{position:relative;display:flex;flex-direction:column;width:min(86vw,320px);height:100%;padding:calc(14px + env(safe-area-inset-top,0px)) 14px calc(14px + env(safe-area-inset-bottom,0px));background:var(--sf);border-right:1px solid var(--ln);overflow-y:auto}
.ex2-pt{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px;padding:0 4px 0 8px}
@media (min-width:900px){.ex2-dr{display:none}}

/* voltar e título com identidade */
.tw-th .ex2-back{display:inline-flex;align-items:center;gap:6px;padding:6px 0;color:var(--mu);font-weight:600;font-size:.9rem}
@media (hover:hover) and (pointer:fine){.tw-th .ex2-back:hover{color:var(--g)}}
.ex2-ti{display:flex;align-items:center;gap:14px;margin-top:8px}
.ex2-tile{--tb:hsl(var(--hue) 70% 93%);--tt:hsl(var(--hue) 60% 34%);flex:none;width:52px;height:52px;border-radius:12px;background:var(--tb);color:var(--tt);display:grid;place-items:center;font:800 1.5rem 'Manrope',system-ui,sans-serif}
@media (prefers-color-scheme:dark){html:not([data-theme="light"]) .ex2-tile{--tb:hsl(var(--hue) 35% 20%);--tt:hsl(var(--hue) 70% 76%)}}
html[data-theme="dark"] .ex2-tile{--tb:hsl(var(--hue) 35% 20%);--tt:hsl(var(--hue) 70% 76%)}
.tw-th .ex2-h1{margin:0;font:800 clamp(1.7rem,6vw,2.2rem)/1.05 'Manrope',system-ui,sans-serif;letter-spacing:-.045em}
.tw-th .ex2-sub{margin:3px 0 0;color:var(--mu);font-weight:600;font-size:.9rem}
.ex2-acts{display:flex;gap:8px;margin-top:16px}
.ex2-acts .tw-btn{white-space:nowrap}
.ex2-acts .ex2-main{flex:1;min-width:0}

/* separadores = números + navegação */
.ex2-tabs{position:sticky;top:calc(52px + env(safe-area-inset-top,0px));z-index:20;margin-top:6px;padding:14px 0 10px;background:var(--bg)}
.ex2-tl{display:grid;grid-template-columns:repeat(var(--n,3),1fr);gap:6px;padding:4px;border:1px solid var(--ln);border-radius:10px;background:var(--sf)}
.ex2-tl button{display:grid;justify-items:center;padding:8px 4px;border:0;border-radius:7px;background:transparent;color:var(--mu);cursor:pointer}
.ex2-tl b{font:800 1.3rem/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.03em;color:var(--ink);font-variant-numeric:tabular-nums}
.ex2-tl span{font-size:.78rem;font-weight:600}
.ex2-tl button[aria-selected="true"]{background:var(--g)}
.ex2-tl button[aria-selected="true"] b,.ex2-tl button[aria-selected="true"] span{color:var(--on)}
.ex2-panel[hidden]{display:none}
.ex2-acts+.ex2-panel{margin-top:18px}

/* exames: o mais recente em destaque, o resto em lista compacta */
.ex2-feat{display:flex;align-items:center;gap:14px;padding:16px;border:1px solid var(--g);border-radius:10px;background:var(--gs)}
.ex2-feat .t{flex:1;min-width:0}
.ex2-tag{display:inline-block;padding:2px 8px;border-radius:5px;background:var(--g);color:var(--on);font-size:.75rem;font-weight:700}
.ex2-year{margin:6px 0 0;font:800 1.6rem/1 'Manrope',system-ui,sans-serif;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.ex2-fs{margin:4px 0 10px;color:var(--mu);font-size:.88rem;font-weight:500}
.ex2-paper{flex:none;width:64px;aspect-ratio:1/1.35;display:grid;align-content:start;gap:5px;padding:9px 8px;border-radius:3px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2)}
.ex2-paper i{height:3px;border-radius:2px;background:#d3d7d2}
.ex2-paper i:nth-child(3n){width:70%}
.ex2-yl{list-style:none;margin:8px 0 0;padding:0;border:1px solid var(--ln);border-radius:10px;background:var(--sf);overflow:hidden}
.ex2-yl li+li{border-top:1px solid var(--ln)}
.ex2-yr{display:flex;align-items:center;gap:14px;padding:13px 14px;color:var(--ink)}
.ex2-yr b{width:78px;flex:none;font:800 1.05rem 'Manrope',system-ui,sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap}
.ex2-yr span{flex:1;min-width:0;color:var(--mu);font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ex2-yr svg{flex:none;color:var(--mu)}
@media (hover:hover) and (pointer:fine){.ex2-yr:hover{background:var(--gs)}}
.ex2-more{margin-top:10px}
.ex2-more>summary{display:flex;align-items:center;justify-content:center;height:42px;border:1px solid var(--ln);border-radius:8px;font-weight:700;font-size:.92rem;cursor:pointer;list-style:none}
.ex2-more>summary::-webkit-details-marker{display:none}
.ex2-more[open]>summary{display:none}
.ex2-more[open]>.ex2-yl{margin-top:0}

/* temas */
.ex2-tm{border:1px solid var(--ln);border-radius:10px;background:var(--sf);overflow:hidden}
.ex2-tm details+details{border-top:1px solid var(--ln)}
.ex2-tm summary{display:flex;align-items:center;gap:12px;padding:13px 14px;font-weight:600;cursor:pointer;list-style:none}
.ex2-tm summary::-webkit-details-marker{display:none}
.ex2-tm summary::after{content:"+";margin-left:auto;color:var(--mu);font-size:1.25rem;line-height:1;transition:rotate .2s}
.ex2-tm details[open]>summary::after{rotate:45deg}
.ex2-tm .nn{flex:none;width:26px;height:26px;display:grid;place-items:center;border-radius:7px;background:var(--gs);color:var(--g);font-weight:800;font-size:.82rem}
.ex2-tm p{margin:0;padding:0 14px 14px 52px;max-width:62ch;color:var(--mu);font-size:.93rem;line-height:1.55;white-space:pre-line}
.ex2-tm .dc{margin:-4px 14px 14px 52px;padding:8px 10px;border-radius:6px;background:var(--gs);color:var(--ink);font-weight:600;font-size:.88rem}

/* cursos */
.ex2-q{position:relative}
.ex2-q svg{position:absolute;left:12px;top:50%;translate:0 -50%;color:var(--mu);pointer-events:none}
.ex2-q input{width:100%;height:46px;padding:0 14px 0 40px;border:1px solid var(--ln);border-radius:8px;background:var(--sf);color:var(--ink);font:500 1rem 'DM Sans',system-ui,sans-serif;outline:none}
.ex2-q input:focus{border-color:var(--g);box-shadow:0 0 0 3px var(--gs)}
.ex2-hint{margin:10px 2px 6px;color:var(--mu);font-size:.88rem;min-height:1.3em}
.ex2-fu{border:1px solid var(--ln);border-radius:10px;background:var(--sf);overflow:hidden}
.ex2-fu details+details{border-top:1px solid var(--ln)}
.ex2-fu summary{display:grid;grid-template-columns:1fr auto;gap:7px 10px;padding:12px 14px;cursor:pointer;list-style:none}
.ex2-fu summary::-webkit-details-marker{display:none}
.ex2-fu .nm{font-weight:600;font-size:.94rem;line-height:1.3}
.ex2-fu .ct{font-weight:800;color:var(--g);font-variant-numeric:tabular-nums}
.ex2-fu .br{grid-column:1/-1;height:5px;border-radius:3px;background:var(--gs)}
.ex2-fu .br i{display:block;height:100%;border-radius:3px;background:var(--g);width:var(--w)}
.ex2-cl{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 14px}
.ex2-cl span{padding:5px 10px;border-radius:6px;background:var(--bg);border:1px solid var(--ln);font-size:.86rem;font-weight:600}
.ex2-solo{padding:0}
.ex2-res{border:1px solid var(--ln);border-radius:10px;background:var(--sf)}
.ex2-res div{display:flex;justify-content:space-between;gap:10px;padding:12px 14px;font-weight:600}
.ex2-res div+div{border-top:1px solid var(--ln)}
.ex2-res small{color:var(--mu);font-weight:500;text-align:right}
.ex2-vz{padding:18px;border:1px dashed var(--ln);border-radius:10px;color:var(--mu);font-weight:600}

/* outras disciplinas */
.ex2-oth{margin-top:26px}
.ex2-oth h2{margin:0 0 8px;font-size:.9rem;font-weight:700;color:var(--mu);letter-spacing:0}
.ex2-chips{list-style:none;display:flex;gap:8px;margin:0 -16px;padding:0 16px 2px;overflow-x:auto;scrollbar-width:none}
.ex2-chips::-webkit-scrollbar{display:none}
.ex2-chips li{flex:none}
.ex2-chips a{display:inline-flex;align-items:center;height:34px;padding:0 12px;border:1px solid var(--ln);border-radius:6px;background:var(--sf);font-weight:700;font-size:.9rem;white-space:nowrap}
@media (hover:hover) and (pointer:fine){.ex2-chips a:hover{border-color:var(--g);color:var(--g)}}
@media (prefers-reduced-motion:reduce){.ex2-tm summary::after{transition:none}}
TWISISA_EX2_EOF
fi

echo "Exames v2 aplicado."

# Verificação (só se as dependências estão instaladas): tipos e o teste novo.
if [ -d node_modules ]; then
  npx tsc --noEmit
  node --import ./tests/register.mjs --test tests/exames-ui.test.ts
  echo "Tipos e testes: OK."
fi
