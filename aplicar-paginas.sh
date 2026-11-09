#!/usr/bin/env bash
# Página inicial + páginas secundárias (exames, simulador, blog, planos), navegação comum e botão Voltar.
# Corre na raiz do projeto:  cd ~/twisisa && bash aplicar-paginas.sh
set -e
[ -f components/home-page.tsx ] && [ -f app/globals.css ] && [ -f app/page.tsx ] || { echo "Corre este script na raiz do projeto (~/twisisa)."; exit 1; }
[ -f public/images/estudantes-estudo.jpg ] || { echo "Falta public/images/estudantes-estudo.jpg"; exit 1; }
mkdir -p "app/blog"
cat > "app/blog/page.tsx" <<'TWISISA_F1_EOF'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { BlogShell } from '@/components/blog/blog-shell'
import { Crumbs } from '@/components/exames/public-shell'
import { categoryLabel } from '@/components/blog/article-view'
import { JsonLd } from '@/components/json-ld'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'
import { Segmentado } from '@/components/ui/segmentado'
import { listBlogSubjects, listPublished, type BlogSummary } from '@/lib/blog'
import { BLOG_TRACKS, blogPath, blogSubjectPath, dataCurta, isBlogTrack } from '@/lib/blog-pure'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

type Params = Promise<Record<string, string | string[] | undefined>>
const one = (value: string | string[] | undefined) => ((Array.isArray(value) ? value[0] : value) ?? '').trim()
const DESCRIPTION = 'Guias de estudo, explicações por tema e dicas de exame e de admissão para estudantes moçambicanos. Lê, pratica e prepara-te com exames anteriores.'
const TITLE = 'Blog de estudos: guias, explicações e dicas de exame | Twisisa'

function read(raw: Record<string, string | string[] | undefined>) {
  const percurso = one(raw.percurso)
  return {
    q: one(raw.q).slice(0, 100),
    percurso: isBlogTrack(percurso) ? percurso : '',
    disciplina: one(raw.disciplina).slice(0, 120),
    etiqueta: one(raw.etiqueta).slice(0, 24),
    pagina: Math.max(1, parseInt(one(raw.pagina), 10) || 1),
  }
}

// Pesquisa e filtros: noindex e canonical para /blog. Páginas seguintes da lista simples: indexáveis, com canonical próprio.
export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const f = read(await searchParams)
  const filtered = Boolean(f.q || f.percurso || f.disciplina || f.etiqueta)
  if (filtered) return { ...pageMetadata({ title: 'Blog | Twisisa', description: DESCRIPTION, path: '/blog', index: false }), alternates: { canonical: `${SITE_URL}/blog` } }
  const base = pageMetadata({ title: f.pagina > 1 ? `Blog de estudos, página ${f.pagina} | Twisisa` : TITLE, description: DESCRIPTION, path: f.pagina > 1 ? `/blog?pagina=${f.pagina}` : '/blog' })
  return { ...base, alternates: { canonical: `${SITE_URL}${f.pagina > 1 ? `/blog?pagina=${f.pagina}` : '/blog'}`, types: { 'application/rss+xml': `${SITE_URL}/blog/feed.xml` } } }
}

function Meta({ post }: { post: BlogSummary }) {
  return (
    <p className="mt-2 text-[14px] text-texto-2">
      {post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{dataCurta(post.publishedAt)}</time>} · {post.readingMinutes} min de leitura
    </p>
  )
}

export default async function BlogPage({ searchParams }: { searchParams: Params }) {
  const f = read(await searchParams)
  const [result, subjects] = await Promise.all([
    listPublished({ q: f.q, track: f.percurso, subjectId: f.disciplina, tag: f.etiqueta, page: f.pagina }),
    listBlogSubjects(),
  ])
  const filtered = Boolean(f.q || f.percurso || f.disciplina || f.etiqueta)
  const url = (over: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries({ q: f.q, percurso: f.percurso, disciplina: f.disciplina, etiqueta: f.etiqueta, ...over })) if (value) query.set(key, String(value))
    const text = query.toString()
    return text ? `/blog?${text}` : '/blog'
  }
  const items = result.ok ? result.data.items : []
  const page = result.ok ? result.data.page : 1
  const pages = result.ok ? result.data.pages : 1
  const featured = page === 1 ? items[0] : undefined
  const rest = featured ? items.slice(1) : items

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/blog#pagina`,
        url: `${SITE_URL}/blog`,
        name: 'Blog Twisisa',
        description: DESCRIPTION,
        inLanguage: 'pt-MZ',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: { '@type': 'ItemList', itemListElement: items.map((post, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}${blogPath(post.slug)}`, name: post.title })) },
      },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Blog', path: '/blog' }]),
    ],
  }

  return (
    <BlogShell>
      <JsonLd data={jsonLd} />
      <main id="conteudo" className="mx-auto w-full max-w-[720px] px-5 pt-6">
        <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Blog' }]} />
        <h1 className="text-[clamp(1.75rem,1.4rem+1.8vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.035em]">Blog</h1>
        <p className="mt-3 max-w-[48ch] text-[17px] leading-7 text-texto-2">Guias, explicações por tema e dicas de exame e de admissão.</p>

        <form role="search" method="get" action="/blog" className="mt-8">
          {f.percurso && <input type="hidden" name="percurso" value={f.percurso} />}
          {f.etiqueta && <input type="hidden" name="etiqueta" value={f.etiqueta} />}
          <label htmlFor="blog-q" className="sr-only">Pesquisar artigos</label>
          <div className="flex items-end gap-3">
            <input id="blog-q" name="q" type="search" defaultValue={f.q} maxLength={100} placeholder="Pesquisar artigos" autoComplete="off" className="min-h-12 min-w-0 flex-1 rounded-none border-0 border-b border-texto/30 bg-transparent text-[16px] outline-none placeholder:text-texto-2 focus:border-marca" />
            <button type="submit" className="btn btn-secundario shrink-0">Pesquisar</button>
          </div>
          {subjects.length > 0 && (
            <>
              <label htmlFor="blog-d" className="sr-only">Disciplina</label>
              <select id="blog-d" name="disciplina" defaultValue={f.disciplina} className="mt-3 min-h-12 w-full rounded-none border-0 border-b border-texto/30 bg-transparent text-[16px] outline-none focus:border-marca">
                <option value="">Todas as disciplinas</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </>
          )}
        </form>

        {subjects.length > 0 && (
          <nav aria-label="Disciplinas" className="mt-5 flex flex-wrap gap-2">
            {subjects.map((subject) => <Link key={subject.id} href={blogSubjectPath(subject.name)} className="inline-flex min-h-9 items-center rounded-full border border-linha px-3.5 text-[14px] font-semibold text-texto no-underline hover:border-marca hover:text-marca">{subject.name}</Link>)}
          </nav>
        )}

        <div className="mt-5">
          <Segmentado label="Percurso" items={[{ href: url({ percurso: undefined, pagina: undefined }), label: 'Todos', active: !f.percurso }, ...BLOG_TRACKS.map((track) => ({ href: url({ percurso: track, pagina: undefined }), label: track === 'admissao' ? 'Admissão' : `${track}ª`, active: f.percurso === track }))]} />
        </div>

        {!result.ok ? (
          <div className="mt-10"><ErrorState title="Não foi possível carregar os artigos" description="Verifica a ligação e tenta de novo." /></div>
        ) : items.length === 0 ? (
          <div className="mt-10">
            {f.q
              ? <EmptyState title="Nada encontrado" description={`Não há artigos para «${f.q}». Tenta outras palavras.`} actionLabel="Limpar pesquisa" actionHref="/blog" />
              : filtered
                ? <EmptyState title="Sem artigos neste filtro" description="Ainda não escrevemos sobre isto. Vê todos os artigos." actionLabel="Ver todos" actionHref="/blog" />
                : <EmptyState title="Ainda sem artigos" description="Estamos a preparar os primeiros guias. Enquanto isso, pratica no Simulador." actionLabel="Abrir o Simulador" actionHref="/aluno/simulador" />}
          </div>
        ) : (
          <>
            {featured && (
              <article className="mt-10 border-t border-linha pt-8">
                {featured.coverUrl && (
                  <Link href={blogPath(featured.slug)} tabIndex={-1} aria-hidden="true" className="relative mb-5 block aspect-video overflow-hidden rounded-md bg-linha/40">
                    <Image src={featured.coverUrl} alt="" fill priority sizes="(min-width: 760px) 680px, 100vw" className="object-cover" />
                  </Link>
                )}
                {categoryLabel(featured) && <p className="text-[13px] font-semibold text-marca">{categoryLabel(featured)}</p>}
                <h2 className="mt-1 text-[clamp(1.5rem,1.25rem+1.2vw,2rem)] font-semibold leading-[1.2] tracking-[-0.03em]"><Link href={blogPath(featured.slug)} className="hover:text-marca">{featured.title}</Link></h2>
                <p className="mt-3 text-[17px] leading-7 text-texto-2">{featured.excerpt}</p>
                <Meta post={featured} />
              </article>
            )}
            <div className={featured ? '' : 'mt-10'}>
              {rest.map((post) => (
                <article key={post.id} className="flex items-start gap-4 border-t border-linha py-6">
                  <div className="min-w-0 flex-1">
                    {categoryLabel(post) && <p className="text-[13px] font-semibold text-marca">{categoryLabel(post)}</p>}
                    <h2 className="mt-1 text-[20px] font-semibold leading-[1.3] tracking-[-0.02em]"><Link href={blogPath(post.slug)} className="hover:text-marca">{post.title}</Link></h2>
                    <p className="mt-2 line-clamp-2 text-[16px] leading-6 text-texto-2">{post.excerpt}</p>
                    <Meta post={post} />
                  </div>
                  {post.coverUrl && (
                    <Link href={blogPath(post.slug)} tabIndex={-1} aria-hidden="true" className="relative block size-[88px] shrink-0 overflow-hidden rounded-md bg-linha/40">
                      <Image src={post.coverUrl} alt="" fill sizes="88px" className="object-cover" />
                    </Link>
                  )}
                </article>
              ))}
            </div>
            {pages > 1 && (
              <nav aria-label="Paginação" className="mt-4 flex items-center justify-between gap-3 border-t border-linha pt-6">
                {page > 1 ? <Link href={url({ pagina: page - 1 > 1 ? page - 1 : undefined })} rel="prev" className="btn btn-secundario btn-grande">Anterior</Link> : <span />}
                <span className="text-[14px] text-texto-2">Página {page} de {pages}</span>
                {page < pages ? <Link href={url({ pagina: page + 1 })} rel="next" className="btn btn-secundario btn-grande">Seguinte</Link> : <span />}
              </nav>
            )}
          </>
        )}
      </main>
    </BlogShell>
  )
}
TWISISA_F1_EOF

mkdir -p "app/exames/[inst]/[disc]/[id]"
cat > "app/exames/[inst]/[disc]/[id]/page.tsx" <<'TWISISA_F2_EOF'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, ExternalLink } from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { ExamRow } from '@/components/exames/exam-row'
import { FaqList } from '@/components/exames/faq'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { faqExam, faqJsonLd, yearPath } from '@/lib/exames-pure'
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
  // Outros exames da mesma disciplina e universidade: liga as páginas entre si (e ajuda quem procura outro ano).
  const siblings = (await findExams({ institutionId: exam.institution.id, subjectId: exam.subject.id, limit: 9 }).catch(() => ({ items: [], total: 0 }))).items.filter((item) => item.id !== exam.id).slice(0, 8)
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
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: exam.institution.shortName, href: `/exames/${exam.institution.slug}` }, { name: exam.subject.name, href: subjectPath }, { name: exam.heading }]} />
      <section className="tw5-top">
        <h1 className="tw5-h1">{exam.heading}</h1>
        <div className="tw5-actions">
          <a href={`/api/biblioteca/${exam.id}/ficheiro?baixar=1`} className="tw-btn lg"><Download size={18} aria-hidden /> Descarregar o PDF</a>
          <a href={viewer} target="_blank" rel="noopener" className="tw-btn lg ol"><ExternalLink size={18} aria-hidden /> Abrir numa aba</a>
        </div>
        {exam.year && <ul className="tw5-chips" style={{ marginTop: 22 }}><li><Link href={yearPath(exam.institution.slug, exam.year)}>Todos os exames {exam.institution.shortName} {exam.year}</Link></li></ul>}
      </section>

      {/* O exame já aparece aqui, sem ser preciso tocar em nenhum botão. */}
      <iframe src={`${viewer}#toolbar=0&navpanes=0`} title={exam.heading} className="tw5-view" loading="lazy" />

      <div className="tw5-band">
        <h2>Pratica {exam.subject.name}.</h2>
        <div className="tw-cta"><Link href="/sign-up" className="tw-btn lg wh">Criar conta grátis</Link></div>
      </div>

      {siblings.length > 0 && (
        <section className="tw5-sec" aria-labelledby="outros">
          <h2 id="outros" className="tw5-h2">Outros exames de {exam.subject.name}</h2>
          <ul className="tw5-rows">
            {siblings.map((item) => <li key={item.id}><ExamRow exam={item} /></li>)}
          </ul>
          <div className="tw5-actions"><Link href={subjectPath} className="tw-btn ol">Temas de {exam.subject.name}</Link></div>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}
TWISISA_F2_EOF

mkdir -p "app/exames/[inst]/[disc]"
cat > "app/exames/[inst]/[disc]/page.tsx" <<'TWISISA_F3_EOF'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { FaqList } from '@/components/exames/faq'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
import { faqJsonLd, faqSubject, yearPath } from '@/lib/exames-pure'
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

export default async function SubjectExamPage({ params }: Props) {
  const { inst, disc } = await params
  const page = await getSubjectPage(inst, disc).catch(() => null)
  if (!page) notFound()
  const { institution, subject, topics, exams, courses } = page
  const base = `/exames/${institution.slug}/${subject.slug}`
  const otherSubjects = (await listPublicSubjects(institution).catch(() => [])).filter((item) => item.slug !== subject.slug)
  const years = [...new Set(exams.map((exam) => exam.year).filter((year): year is number => year !== null))].sort((a, b) => b - a)
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
        <h1 className="tw5-h1">{subject.name} <em>{institution.shortName}.</em></h1>
        <p className="tw5-sub">Exame de admissão</p>
        <div className="tw5-actions">
          <Link href="/sign-up" className="tw-btn lg"><ArrowRight size={18} aria-hidden /> Praticar</Link>
          {topics.length > 0 && <a href={`${base}/temas.pdf`} className="tw-btn lg ol"><Download size={18} aria-hidden /> Temas em PDF</a>}
        </div>
      </section>

      {topics.length > 0 && (
        <section className="tw5-sec" aria-labelledby="temas">
          <h2 id="temas" className="tw5-h2">{topics.length} temas principais</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {topics.map((topic) => (
              <Reveal as="li" key={topic.position} className="tw5-topic">
                <h3><i>{topic.position}</i>{topic.title}</h3>
                <p>{topic.summary}</p>
                {topic.tips && <p className="dica">Dica: {topic.tips}</p>}
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      {exams.length > 0 && (
        <section className="tw5-sec" aria-labelledby="exames">
          <h2 id="exames" className="tw5-h2">Exames anteriores</h2>
          <ul className="tw5-rows">
            {exams.map((exam) => (
              <li key={exam.id}>
                <Link href={`${base}/${exam.id}`} className="tw5-row"><b>{exam.heading}</b>{exam.year && <em>{exam.year}</em>}<u>Ler</u></Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {courses.length > 0 && (
        <section className="tw5-sec" aria-labelledby="cursos">
          <h2 id="cursos" className="tw5-h2">Cursos que pedem {subject.name}</h2>
          <ul className="tw5-chips">
            {courses.map((course) => <li key={course.name}><span>{course.name}</span></li>)}
          </ul>
        </section>
      )}

      {years.length > 0 && (
        <section className="tw5-sec">
          <h2 className="tw5-h2">Por ano</h2>
          <ul className="tw5-chips">
            {years.map((year) => <li key={year}><Link href={yearPath(institution.slug, year)}>{year}</Link></li>)}
          </ul>
        </section>
      )}

      {otherSubjects.length > 0 && (
        <section className="tw5-sec">
          <h2 className="tw5-h2">Outras disciplinas</h2>
          <ul className="tw5-chips">
            {otherSubjects.map((item) => <li key={item.id}><Link href={`/exames/${institution.slug}/${item.slug}`}>{item.name}</Link></li>)}
          </ul>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}
TWISISA_F3_EOF

mkdir -p "app/exames/[inst]/ano/[ano]"
cat > "app/exames/[inst]/ano/[ano]/page.tsx" <<'TWISISA_F4_EOF'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExamRow } from '@/components/exames/exam-row'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { examPath, isYear, yearPath } from '@/lib/exames-pure'
import { getYearPage } from '@/lib/exames'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ inst: string; ano: string }> }

async function load(params: Props['params']) {
  const { inst, ano } = await params
  if (!isYear(ano)) return null
  return getYearPage(inst, Number(ano)).catch(() => null)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load(params)
  if (!page) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  const { institution, year, exams } = page
  return pageMetadata({
    title: `Exames de admissão ${institution.shortName} ${year}: ${exams.length === 1 ? '1 exame' : `${exams.length} exames`} para ler | Twisisa`,
    description: `Exames de admissão da ${institution.shortName} de ${year}: ${[...new Set(exams.map((exam) => exam.subjectName))].slice(0, 4).join(', ')}. Lê sem conta e descarrega o PDF com uma conta gratuita.`,
    path: yearPath(institution.slug, year),
  })
}

export default async function YearExamsPage({ params }: Props) {
  const page = await load(params)
  if (!page) notFound()
  const { institution, year, exams, years } = page
  const path = yearPath(institution.slug, year)
  const bySubject = new Map<string, typeof exams>()
  for (const exam of exams) bySubject.set(exam.subjectName, [...(bySubject.get(exam.subjectName) ?? []), exam])
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', url: `${SITE_URL}${path}`, name: `Exames de admissão ${institution.shortName} ${year}`, inLanguage: 'pt-MZ', isPartOf: { '@id': `${SITE_URL}/#website` }, mainEntity: { '@type': 'ItemList', itemListElement: exams.map((exam, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}${examPath(exam)}`, name: exam.heading })) } },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames', path: '/exames' }, { name: institution.shortName, path: `/exames/${institution.slug}` }, { name: String(year), path }]),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: institution.shortName, href: `/exames/${institution.slug}` }, { name: String(year) }]} />
      <section className="tw5-top">
        <h1 className="tw5-h1">{institution.shortName} <em>{year}.</em></h1>
        <p className="tw5-sub">{exams.length} {exams.length === 1 ? 'exame' : 'exames'}</p>
      </section>

      {[...bySubject.entries()].map(([subject, list]) => (
        <section key={subject} className="tw5-sec">
          <h2 className="tw5-h2">{subject}</h2>
          <ul className="tw5-rows">
            {list.map((exam) => <li key={exam.id}><ExamRow exam={exam} /></li>)}
          </ul>
        </section>
      ))}

      {years.length > 1 && (
        <section className="tw5-sec">
          <h2 className="tw5-h2">Outros anos</h2>
          <ul className="tw5-chips">
            {years.filter((item) => item.year !== year).map((item) => <li key={item.year}><Link href={yearPath(institution.slug, item.year)}>{item.year} · {item.count}</Link></li>)}
          </ul>
        </section>
      )}
    </PublicShell>
  )
}
TWISISA_F4_EOF

mkdir -p "app/exames/[inst]"
cat > "app/exames/[inst]/page.tsx" <<'TWISISA_F5_EOF'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Target } from 'lucide-react'
import { notFound } from 'next/navigation'
import { ExamRow } from '@/components/exames/exam-row'
import { FaqList } from '@/components/exames/faq'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
import { faqInstitution, faqJsonLd, yearPath } from '@/lib/exames-pure'
import { findExams, getPublicInstitution, listExamYears, listPublicSubjects } from '@/lib/exames'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ inst: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const institution = await getPublicInstitution((await params).inst).catch(() => null)
  if (!institution) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  return pageMetadata({
    title: `Exames de admissão ${institution.shortName}: disciplinas, anos e temas | Twisisa`,
    description: `Exames de admissão da ${institution.name} (${institution.shortName}): lê os exames anteriores sem conta, vê os temas principais de cada disciplina e treina com questões reais.`,
    path: `/exames/${institution.slug}`,
  })
}

export default async function InstitutionExamsPage({ params }: Props) {
  const { inst } = await params
  const institution = await getPublicInstitution(inst).catch(() => null)
  if (!institution) notFound()
  const [subjects, years, recent] = await Promise.all([
    listPublicSubjects(institution).catch(() => []),
    listExamYears(institution.id).catch(() => []),
    findExams({ institutionId: institution.id, limit: 8 }).catch(() => ({ items: [], total: 0 })),
  ])
  const base = `/exames/${institution.slug}`
  const faq = faqInstitution(institution, subjects.map((item) => item.name), years.map((item) => item.year))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', url: `${SITE_URL}${base}`, name: `Exames de admissão ${institution.shortName}`, inLanguage: 'pt-MZ', isPartOf: { '@id': `${SITE_URL}/#website` }, mainEntity: { '@type': 'ItemList', itemListElement: subjects.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}${base}/${item.slug}`, name: `Exame de admissão de ${item.name} ${institution.shortName}` })) } },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames', path: '/exames' }, { name: institution.shortName, path: base }]),
      faqJsonLd(faq),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: institution.shortName }]} />
      <section className="tw5-top">
        <h1 className="tw5-h1">Exames <em>{institution.shortName}.</em></h1>
        <p className="tw5-sub">{institution.name}</p>
        <div className="tw5-actions">
          <Link href="/sign-up" className="tw-btn lg"><ArrowRight size={18} aria-hidden /> Praticar</Link>
          <Link href="/simulado" className="tw-btn lg ol"><Target size={18} aria-hidden /> Ver o simulador</Link>
        </div>
      </section>

      {subjects.length > 0 && (
        <section className="tw5-sec" aria-labelledby="disciplinas">
          <h2 id="disciplinas" className="tw5-h2">Disciplinas</h2>
          <ul className="tw5-tiles">
            {subjects.map((item, index) => (
              <Reveal as="li" key={item.id} delay={Math.min(index, 5) * 0.06}>
                <Link href={`${base}/${item.slug}`} className="tw5-tile">
                  <b>{item.name}</b>
                  <span>{item.topics > 0 ? `${item.topics} temas` : 'Exames'}{item.exams > 0 ? ` · ${item.exams} ${item.exams === 1 ? 'exame' : 'exames'}` : ''} →</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {years.length > 0 && (
        <section className="tw5-sec">
          <h2 className="tw5-h2">Por ano</h2>
          <ul className="tw5-chips">
            {years.map((item) => <li key={item.year}><Link href={yearPath(institution.slug, item.year)}>{item.year} · {item.count}</Link></li>)}
          </ul>
        </section>
      )}

      {recent.items.length > 0 && (
        <section className="tw5-sec" aria-labelledby="recentes">
          <h2 id="recentes" className="tw5-h2">Mais recentes</h2>
          <ul className="tw5-rows">
            {recent.items.map((exam) => <li key={exam.id}><ExamRow exam={exam} /></li>)}
          </ul>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}
TWISISA_F5_EOF

mkdir -p "app/exames"
cat > "app/exames/page.tsx" <<'TWISISA_F6_EOF'
import Link from 'next/link'
import { Search, Target } from 'lucide-react'
import { ExamRow } from '@/components/exames/exam-row'
import { FaqList } from '@/components/exames/faq'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
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
    findExams({ limit: 8 }).catch(() => ({ items: [], total: 0 })),
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
        <h1 className="tw5-h1">Exames de <em>admissão.</em></h1>
        <form role="search" action="/exames/pesquisa" method="get" className="tw5-search">
          <div>
            <label htmlFor="exames-q" className="sr-only">Pesquisar exames</label>
            <input id="exames-q" name="q" type="search" maxLength={80} autoComplete="off" placeholder="Ex.: Matemática UEM 2023" />
          </div>
          <button type="submit" className="tw-btn"><Search size={18} aria-hidden /> Pesquisar</button>
        </form>
      </section>

      <section className="tw5-sec" aria-labelledby="universidades">
        <h2 id="universidades" className="tw5-h2">Universidades</h2>
        {institutions.length === 0 ? (
          <p className="tw5-vazio">Ainda sem exames publicados.</p>
        ) : (
          <ul className="tw5-tiles">
            {institutions.map((item, index) => (
              <Reveal as="li" key={item.id} delay={Math.min(index, 5) * 0.06}>
                <Link href={`/exames/${item.slug}`} className="tw5-tile">
                  <b>{item.shortName}</b>
                  <small>{item.name}</small>
                  <span>{item.exams} {item.exams === 1 ? 'exame' : 'exames'} →</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        )}
      </section>

      {recent.items.length > 0 && (
        <section className="tw5-sec" aria-labelledby="recentes">
          <h2 id="recentes" className="tw5-h2">Mais recentes</h2>
          <ul className="tw5-rows">
            {recent.items.map((exam) => <li key={exam.id}><ExamRow exam={exam} /></li>)}
          </ul>
          {recent.total > recent.items.length && <div className="tw5-actions"><Link href="/exames/pesquisa" className="tw-btn ol">Ver os {recent.total} exames</Link></div>}
        </section>
      )}

      {others.length > 0 && (
        <section className="tw5-sec" aria-labelledby="outros">
          <h2 id="outros" className="tw5-h2">Outros materiais</h2>
          <ul className="tw5-chips">
            {others.map((item) => <li key={item.slug}><Link href={`/biblioteca/${item.slug}`}>{item.name} · {item.total}</Link></li>)}
          </ul>
        </section>
      )}

      <div className="tw5-band">
        <h2>Treina o que leste.</h2>
        <div className="tw-cta"><Link href="/simulado" className="tw-btn lg wh"><Target size={18} aria-hidden /> Ver o simulador</Link></div>
      </div>

      <FaqList items={faq} />
    </PublicShell>
  )
}
TWISISA_F6_EOF

mkdir -p "app/exames/pesquisa"
cat > "app/exames/pesquisa/page.tsx" <<'TWISISA_F7_EOF'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { ExamRow } from '@/components/exames/exam-row'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { findExams } from '@/lib/exames'
import { pageMetadata } from '@/lib/seo'

const PAGE_SIZE = 24

type Search = Promise<Record<string, string | string[] | undefined>>
const one = (value: string | string[] | undefined) => ((Array.isArray(value) ? value[0] : value) ?? '').trim()

// Resultados de pesquisa não se indexam (o Google indexa as páginas de cada exame); os links continuam a ser seguidos.
export const metadata = pageMetadata({ title: 'Pesquisar exames | Twisisa', description: 'Pesquisa exames de admissão por universidade, disciplina e ano.', path: '/exames/pesquisa', index: false })

export default async function PesquisaExamesPage({ searchParams }: { searchParams: Search }) {
  const raw = await searchParams
  const q = one(raw.q).replace(/\s+/g, ' ').slice(0, 80)
  const page = Math.min(Math.max(1, parseInt(one(raw.pagina), 10) || 1), 500)
  const { items, total } = await findExams({ q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }).catch(() => ({ items: [], total: 0 }))
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const link = (n: number) => `/exames/pesquisa?${new URLSearchParams({ ...(q ? { q } : {}), ...(n > 1 ? { pagina: String(n) } : {}) }).toString()}`

  return (
    <PublicShell>
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: 'Pesquisa' }]} />
      <section className="tw5-top">
        <h1 className="tw5-h1">{q ? <>«{q}»</> : <>Todos os <em>exames.</em></>}</h1>
        <form role="search" action="/exames/pesquisa" method="get" className="tw5-search">
          <div>
            <label htmlFor="pesq-q" className="sr-only">Pesquisar exames</label>
            <input id="pesq-q" name="q" type="search" defaultValue={q} maxLength={80} autoComplete="off" placeholder="Ex.: Matemática UEM 2023" />
          </div>
          <button type="submit" className="tw-btn"><Search size={18} aria-hidden /> Pesquisar</button>
        </form>
        <p className="tw5-sub">{total === 0 ? 'Nenhum exame encontrado.' : `${total} ${total === 1 ? 'exame' : 'exames'}`}</p>
      </section>

      {items.length === 0 ? (
        <div className="tw5-sec tw5-vazio">
          <p style={{ margin: 0 }}>Tenta só a disciplina, a universidade ou o ano.</p>
          <div className="tw5-actions"><Link href="/exames" className="tw-btn">Ver as universidades</Link></div>
        </div>
      ) : (
        <ul className="tw5-rows" style={{ marginTop: 34 }}>
          {items.map((exam) => <li key={exam.id}><ExamRow exam={exam} /></li>)}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Paginação" className="tw5-pager">
          {page > 1 ? <Link href={link(page - 1)} rel="prev" className="tw-btn ol">← Anterior</Link> : <span />}
          <span>{page} / {pages}</span>
          {page < pages ? <Link href={link(page + 1)} rel="next" className="tw-btn">Seguinte →</Link> : <span />}
        </nav>
      )}
    </PublicShell>
  )
}
TWISISA_F7_EOF

mkdir -p "app/planos"
cat > "app/planos/page.tsx" <<'TWISISA_F8_EOF'
import { Check } from 'lucide-react'
import { Crumbs } from '@/components/exames/public-shell'
import { SiteFrame } from '@/components/site/site-frame'
import { PLANO } from '@/lib/plano'

export const metadata = { title: 'Planos' }

const benefits = [
  'Simulados premium e desafios semanais',
  'Materiais avançados organizados por disciplina',
  'Histórico de progresso e resultados',
]

export default function PlanosPage() {
  return (
    <SiteFrame>
    <main id="conteudo" className="px-5 py-10 text-texto sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Planos' }]} />

        <div className="grid items-center gap-12 lg:grid-cols-[1fr_400px] lg:gap-20">

          {/* Apresentação */}
          <section className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-marca">
              {PLANO.nome}
            </p>

            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Mais foco para cada etapa.
            </h1>

            <p className="mt-5 max-w-md text-base leading-8 text-texto-2 sm:text-lg">
              Desbloqueia ferramentas para praticar melhor e acompanha a tua evolução.
            </p>
          </section>

          {/* Plano */}
          <section className="w-full rounded-[28px] border border-linha bg-white p-7 shadow-sm sm:p-9">

            <div className="border-b border-linha pb-7">
              <h2 className="text-xl font-semibold">
                Plano mensal
              </h2>

              <p className="mt-2 text-sm text-texto-2">
                Pagamento por meios locais.
              </p>

              <div className="mt-7 flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight">
                  {PLANO.precoMt}
                </span>

                <span className="text-lg font-medium">
                  MT
                </span>

                <span className="text-sm text-texto-2">
                  /mês
                </span>
              </div>
            </div>

            <ul className="mt-7 space-y-5">
              {benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3 text-[15px] leading-6"
                >
                  <Check
                    size={19}
                    strokeWidth={2.5}
                    className="mt-0.5 shrink-0 text-marca"
                    aria-hidden="true"
                  />

                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 rounded-xl bg-marca-suave px-4 py-4 text-sm leading-6 text-marca">
              O pagamento por meios locais estará disponível em breve.
            </p>

          </section>
        </div>

      </div>
    </main>
    </SiteFrame>
  )
}
TWISISA_F8_EOF

mkdir -p "app/simulado"
cat > "app/simulado/page.tsx" <<'TWISISA_F9_EOF'
import Link from 'next/link'
import { BookOpen, Target } from 'lucide-react'
import { FaqList } from '@/components/exames/faq'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
import { faqJsonLd, faqSimulado } from '@/lib/exames-pure'
import { listPublicInstitutions } from '@/lib/exames'
import { MODE_META, POINTS_MAX, POINTS_MIN } from '@/lib/simulator-shared'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

export const metadata = pageMetadata({
  title: 'Simulado de exame de admissão online: pratica e vê a tua nota | Twisisa',
  description: 'Testa-te para o exame de admissão com questões de exames anteriores: prática com correção, modo rápido a contar o tempo e revisão dos erros. Nota de 0 a 20.',
  path: '/simulado',
})

const MODES = [{ mode: MODE_META.pratica }, { mode: MODE_META.rapido }, { mode: MODE_META.revisao }] as const

export default async function SimuladoPage() {
  const institutions = await listPublicInstitutions().catch(() => [])
  const faq = faqSimulado()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${SITE_URL}/simulado#pagina`, url: `${SITE_URL}/simulado`, name: 'Simulado de exame de admissão online', inLanguage: 'pt-MZ', isPartOf: { '@id': `${SITE_URL}/#website` } },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Simulado', path: '/simulado' }]),
      faqJsonLd(faq),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Simulador' }]} />

      <section className="tw5-top">
        <h1 className="tw5-h1">Treina como no <em>exame.</em></h1>
        <p className="tw5-sub">Questões reais, correção na hora, nota de 0 a 20.</p>
        <div className="tw5-actions">
          <Link href="/aluno/simulador" className="tw-btn lg"><Target size={18} aria-hidden /> Começar a treinar</Link>
          <Link href="/exames" className="tw-btn lg ol"><BookOpen size={18} aria-hidden /> Ver exames</Link>
        </div>
      </section>

      <section className="tw5-sec" aria-labelledby="modos">
        <h2 id="modos" className="tw5-h2">Três formas de treinar</h2>
        <div className="tw4-modes" style={{ padding: 0 }}>
          <ul style={{ marginTop: 0 }}>
            {MODES.map(({ mode }, index) => (
              <Reveal as="li" key={mode.label} delay={index * 0.07}>
                <b>{mode.label}</b><span>{mode.tagline}</span><em>{mode.meta}</em>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="tw5-sec" aria-labelledby="pontos">
        <h2 id="pontos" className="tw5-h2">Pontos e nota</h2>
        <ul className="tw5-rows">
          <li className="tw5-row"><b>Cada questão certa</b><em>{POINTS_MIN} a {POINTS_MAX} pontos</em></li>
          <li className="tw5-row"><b>Dica pedida</b><em>−25 % dos pontos</em></li>
          <li className="tw5-row"><b>Nota</b><em>20 × ganhos ÷ possíveis</em></li>
        </ul>
      </section>

      {institutions.length > 0 && (
        <section className="tw5-sec">
          <h2 className="tw5-h2">Escolhe a universidade</h2>
          <ul className="tw5-chips">
            {institutions.map((item) => <li key={item.id}><Link href={`/exames/${item.slug}`}>{item.shortName}</Link></li>)}
          </ul>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}
TWISISA_F9_EOF

mkdir -p "components/blog"
cat > "components/blog/article-view.tsx" <<'TWISISA_F10_EOF'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpenCheck } from 'lucide-react'
import { BlogBody } from '@/components/blog/blog-body'
import { Crumbs } from '@/components/exames/public-shell'
import { Toc } from '@/components/blog/toc'
import { ShareButton } from '@/components/blog/share-button'
import { parseBlogMarkdown, showToc, tableOfContents } from '@/lib/blog-markdown'
import { BLOG_TRACK_LABEL, blogPath, blogSubjectPath, blogTagPath, dataCurta, dataLonga, practiceLink } from '@/lib/blog-pure'
import { SITE_URL } from '@/lib/seo'
import type { BlogPost, BlogSummary } from '@/lib/blog'

export const categoryLabel = (post: Pick<BlogSummary, 'subjectName' | 'themeName' | 'track'>) =>
  [post.subjectName, post.themeName ?? (post.track ? BLOG_TRACK_LABEL[post.track] : null)].filter(Boolean).join(' · ')

// O artigo (cabeçalho, capa, corpo, praticar, relacionados, partilhar). Serve /blog/[slug] e a pré-visualização da equipa.
export function ArticleView({ post, related }: { post: BlogPost; related: BlogSummary[] }) {
  const blocks = parseBlogMarkdown(post.body)
  const toc = tableOfContents(blocks)
  const practice = practiceLink(post)
  const label = categoryLabel(post)
  const when = post.publishedAt ?? post.updatedAt
  return (
    <>
      <div className="mx-auto max-w-[680px]"><Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Blog', href: '/blog' }, { name: post.title }]} /></div>
      <article>
        <header className="mx-auto max-w-[680px]">
          {label && (
            <p className="text-[13px] font-semibold text-marca">
              {post.subjectName ? <Link href={blogSubjectPath(post.subjectName)} className="no-underline hover:underline">{post.subjectName}</Link> : null}
              {post.subjectName && (post.themeName || post.track) ? ' · ' : ''}
              {post.themeName ?? (post.track ? BLOG_TRACK_LABEL[post.track] : '')}
            </p>
          )}
          <h1 className="mt-2 text-[clamp(1.75rem,1.4rem+1.8vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.035em] text-balance">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-[18px] leading-7 text-texto-2">{post.excerpt}</p>}
          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-texto-2">
            <span>{post.authorName ?? 'Equipa Twisisa'}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={when.toISOString()}>{dataLonga(when)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min de leitura</span>
          </p>
        </header>

        {post.coverUrl && (
          <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-md bg-linha/40">
            <Image src={post.coverUrl} alt={post.coverAlt ?? ''} fill priority sizes="(min-width: 800px) 760px, 100vw" className="object-cover" />
          </div>
        )}

        <div className="mx-auto mt-8 max-w-[680px]">
          {showToc(toc) && <Toc items={toc} />}
          <div className={showToc(toc) ? 'mt-8' : ''}><BlogBody blocks={blocks} /></div>
        </div>
      </article>

      <div className="mx-auto mt-14 max-w-[680px]">
        <section aria-labelledby="praticar" className="border-t border-linha pt-8">
          <h2 id="praticar" className="text-[clamp(1.375rem,1.2rem+0.9vw,1.75rem)] font-semibold leading-[1.25] tracking-[-0.03em]">Agora pratica</h2>
          <p className="mt-2 text-[16px] leading-7 text-texto-2">Ler ajuda. Resolver questões é que fixa a matéria.</p>
          <Link href={practice.href} className="btn btn-primario btn-grande mt-5 w-full sm:w-auto">{practice.label}</Link>
          <p className="mt-4 text-[15px] leading-6 text-texto-2">Prepara-te também com os <Link href="/exames" className="font-semibold text-marca underline-offset-4 hover:underline">exames de admissão de anos anteriores</Link>.</p>
          {post.tags.length > 0 && (
            <ul aria-label="Etiquetas" className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => <li key={tag}><Link href={blogTagPath(tag)} className="inline-flex min-h-9 items-center rounded-full border border-linha px-3 text-[13px] text-texto-2 no-underline hover:border-marca hover:text-marca">#{tag}</Link></li>)}
            </ul>
          )}
        </section>

        {related.length > 0 && (
          <nav aria-labelledby="relacionados" className="mt-12 border-t border-linha pt-8">
            <h2 id="relacionados" className="flex items-center gap-2 text-[15px] font-semibold text-ajuda"><BookOpenCheck size={18} aria-hidden="true" />Matéria relacionada</h2>
            <ul className="mt-2 divide-y divide-linha">
              {related.map((item) => (
                <li key={item.id}>
                  <Link href={blogPath(item.slug)} className="block py-4 hover:text-marca">
                    <span className="block text-[18px] font-semibold leading-6 tracking-[-0.01em]">{item.title}</span>
                    <span className="mt-1 block text-[14px] text-texto-2">{item.publishedAt ? dataCurta(item.publishedAt) : ''} · {item.readingMinutes} min de leitura</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-10 border-t border-linha pt-4">
          <ShareButton url={`${SITE_URL}${blogPath(post.slug)}`} title={post.title} />
        </div>
      </div>
    </>
  )
}
TWISISA_F10_EOF

mkdir -p "components/blog"
cat > "components/blog/topic-listing.tsx" <<'TWISISA_F11_EOF'
import Image from 'next/image'
import Link from 'next/link'
import { BlogShell } from '@/components/blog/blog-shell'
import { categoryLabel } from '@/components/blog/article-view'
import { Crumbs } from '@/components/exames/public-shell'
import { JsonLd } from '@/components/json-ld'
import { Reveal } from '@/components/ui/reveal'
import type { BlogSummary } from '@/lib/blog'
import { blogPath, dataCurta } from '@/lib/blog-pure'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

// Página de tema do blog (por disciplina ou por etiqueta): lista indexável de artigos, com paginação e ligação aos exames.
export function TopicListing({ title, intro, path, items, total, page, pages, crumbName, practiceHref }: { title: string; intro: string; path: string; items: BlogSummary[]; total: number; page: number; pages: number; crumbName: string; practiceHref?: string }) {
  const link = (n: number) => (n > 1 ? `${path}?pagina=${n}` : path)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', url: `${SITE_URL}${path}`, name: title, description: intro, inLanguage: 'pt-MZ', isPartOf: { '@id': `${SITE_URL}/#website` }, mainEntity: { '@type': 'ItemList', itemListElement: items.map((post, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}${blogPath(post.slug)}`, name: post.title })) } },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Blog', path: '/blog' }, { name: crumbName, path }]),
    ],
  }
  return (
    <BlogShell>
      <JsonLd data={jsonLd} />
      <main id="conteudo" className="mx-auto w-full max-w-[720px] px-5 pt-6">
        <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Blog', href: '/blog' }, { name: crumbName }]} />
        <section className="rv-hero">
          <h1 className="text-[clamp(1.75rem,1.4rem+1.8vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.035em]">{title}</h1>
          <p className="mt-3 max-w-[52ch] text-[17px] leading-7 text-texto-2">{intro}</p>
          <p className="mt-4 flex flex-wrap gap-2">
            {practiceHref && <Link href={practiceHref} className="btn btn-primario">Praticar no Simulador</Link>}
            <Link href="/exames" className="btn btn-secundario">Ver exames anteriores</Link>
          </p>
        </section>
        <p className="mt-8 text-[14px] text-texto-2">{total} {total === 1 ? 'artigo' : 'artigos'}</p>
        <div className="mt-2">
          {items.map((post, index) => (
            <Reveal as="article" key={post.id} delay={Math.min(index, 4) * 0.05} className="flex items-start gap-4 border-t border-linha py-6">
              <div className="min-w-0 flex-1">
                {categoryLabel(post) && <p className="text-[13px] font-semibold text-marca">{categoryLabel(post)}</p>}
                <h2 className="mt-1 text-[20px] font-semibold leading-[1.3] tracking-[-0.02em]"><Link href={blogPath(post.slug)} className="hover:text-marca">{post.title}</Link></h2>
                <p className="mt-2 line-clamp-2 text-[16px] leading-6 text-texto-2">{post.excerpt}</p>
                <p className="mt-2 text-[14px] text-texto-2">{post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{dataCurta(post.publishedAt)}</time>} · {post.readingMinutes} min de leitura</p>
              </div>
              {post.coverUrl && (
                <Link href={blogPath(post.slug)} tabIndex={-1} aria-hidden="true" className="relative block size-[88px] shrink-0 overflow-hidden rounded-md bg-linha/40">
                  <Image src={post.coverUrl} alt="" fill sizes="88px" className="object-cover" />
                </Link>
              )}
            </Reveal>
          ))}
        </div>
        {pages > 1 && (
          <nav aria-label="Paginação" className="mt-4 flex items-center justify-between gap-3 border-t border-linha pt-6">
            {page > 1 ? <Link href={link(page - 1)} rel="prev" className="btn btn-secundario btn-grande">Anterior</Link> : <span />}
            <span className="text-[14px] text-texto-2">Página {page} de {pages}</span>
            {page < pages ? <Link href={link(page + 1)} rel="next" className="btn btn-secundario btn-grande">Seguinte</Link> : <span />}
          </nav>
        )}
      </main>
    </BlogShell>
  )
}
TWISISA_F11_EOF

mkdir -p "components/exames"
cat > "components/exames/exam-row.tsx" <<'TWISISA_F12_EOF'
import Link from 'next/link'
import { examPath } from '@/lib/exames-pure'
import type { ExamListItem } from '@/lib/exames'

// Uma linha da lista de exames: título (pensado para o Google), ano e botão «Ler».
export function ExamRow({ exam }: { exam: ExamListItem }) {
  return (
    <Link href={examPath(exam)} className="tw5-row">
      <b>{exam.heading}</b>
      {exam.year && <em>{exam.year}</em>}
      <u>Ler</u>
    </Link>
  )
}
TWISISA_F12_EOF

mkdir -p "components/exames"
cat > "components/exames/faq.tsx" <<'TWISISA_F13_EOF'
import type { Faq } from '@/lib/exames-pure'

// Perguntas frequentes visíveis na página (o mesmo texto vai para os dados estruturados FAQPage).
export function FaqList({ items, title = 'Perguntas' }: { items: Faq[]; title?: string }) {
  if (items.length === 0) return null
  return (
    <section className="tw5-sec tw5-faq" aria-labelledby="faq">
      <h2 id="faq" className="tw5-h2">{title}</h2>
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}<b aria-hidden="true">+</b></summary>
          <p>{item.a}</p>
        </details>
      ))}
    </section>
  )
}
TWISISA_F13_EOF

mkdir -p "components/exames"
cat > "components/exames/public-shell.tsx" <<'TWISISA_F14_EOF'
import Link from 'next/link'
import { SiteFrame } from '@/components/site/site-frame'

// Moldura das páginas secundárias de exames: cabeçalho e rodapé da página inicial e o conteúdo ao centro.
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <SiteFrame>
      <main id="conteudo" className="tw5">{children}</main>
    </SiteFrame>
  )
}

// Voltar: um botão claro para o nível de cima (a última ligação do caminho) e o caminho completo ao lado, no computador.
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
TWISISA_F14_EOF

mkdir -p "components"
cat > "components/home-page.tsx" <<'TWISISA_F15_EOF'
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, History, ListChecks, MessageCircle, Star, Target, Trophy, Compass } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MODE_META } from '@/lib/simulator-shared'
// Artigos reais do blog (últimos publicados), enviados por app/page.tsx. Sem artigos, a secção do blog não aparece.
export type HomePost = { slug: string; category: string; title: string; description: string }
// Universidades com exames públicos (enviadas por app/page.tsx): ligações diretas a /exames/<universidade>.
export type HomeInstitution = { slug: string; shortName: string; name: string; exams: number }
// Números reais da plataforma (de app/page.tsx). O que for 0 não aparece.
export type HomeStats = { questoes: number }

// Problema → promessa, par a par. Cada promessa leva ao sítio da plataforma que a cumpre.
const pares = [
  { problema: <>Decoras e <b>esqueces</b>.</>, promessa: <>Percebes a <b>lógica</b>.</>, href: '/jonas', rotulo: 'Falar com o Jonas' },
  { problema: <>Não sabes o que <b>vai sair</b>.</>, promessa: <>Vês o que <b>costuma sair</b>.</>, href: '/exames', rotulo: 'Ver exames' },
  { problema: <>Treinas <b>às cegas</b>.</>, promessa: <>Sabes a tua <b>nota</b>.</>, href: '/aluno/simulador', rotulo: 'Fazer um simulado' },
  { problema: <>Repetes o que <b>já sabes</b>.</>, promessa: <>Refazes só o que <b>erraste</b>.</>, href: '/aluno/simulador', rotulo: 'Revisar erros' },
]

const perguntas = [
  { q: 'Preciso de conta para ver os exames?', a: 'Não. Lês qualquer exame sem conta. Para descarregar o PDF e treinar no simulador, cria uma conta gratuita.' },
  { q: 'Quanto custa?', a: 'Criar conta é grátis. O plano Plus é opcional e está na página de planos.' },
  { q: 'Funciona no telemóvel?', a: 'Sim. Abre no navegador do telemóvel, sem instalar nada.' },
  { q: 'Como é calculada a nota?', a: 'De 0 a 20: 20 × pontos ganhos ÷ pontos possíveis. As questões mais difíceis valem mais.' },
  { q: 'Posso treinar só os meus erros?', a: 'Sim. O modo «Revisar erros» repete só as questões que erraste, até as dominares.' },
  { q: 'Como me ajuda o Jonas?', a: 'Explica a matéria passo a passo e tira dúvidas, como um explicador que responde a qualquer hora.' },
  { q: 'Que universidades tenho?', a: 'As que aparecem na página de exames. Vamos acrescentando mais e mais anos.' },
]

const funcoes = [
  { Icon: BookOpen, t: 'Exames por universidade', d: 'Por disciplina e por ano' },
  { Icon: ListChecks, t: 'Temas principais', d: 'O que mais sai em cada disciplina' },
  { Icon: Target, t: 'Simulador com nota', d: 'Correção a cada resposta, nota de 0 a 20' },
  { Icon: MessageCircle, t: 'Jonas', d: 'Explica passo a passo' },
  { Icon: Trophy, t: 'Desafios e ranking', d: 'Metas diárias e a classificação da semana' },
  { Icon: History, t: 'Histórico', d: 'Vê a tua evolução simulado a simulado' },
  { Icon: Star, t: 'Favoritos', d: 'Guarda exames para estudar depois' },
  { Icon: Compass, t: 'Descobre o teu curso', d: 'Um teste para quem ainda não escolheu' },
]

const percursos = [
  { t: '10ª classe', cor: 'g', itens: ['Questões por disciplina', 'Explicações do Jonas', 'Revisão dos teus erros'] },
  { t: '12ª classe', cor: 'k', itens: ['Exames da classe', 'Modo rápido, ao ritmo do exame', 'Preparação para a admissão'] },
  { t: 'Admissão', cor: 'o', itens: ['Exames de anos anteriores', 'Temas que mais saem', 'Simulado com nota de 0 a 20'] },
]

export default function Page({ signedIn = false, posts = [], institutions = [], stats = { questoes: 0 } }: { signedIn?: boolean; posts?: HomePost[]; institutions?: HomeInstitution[]; stats?: HomeStats }) {
  const totalExames = institutions.reduce((sum, item) => sum + item.exams, 0)
  const numeros = [
    { n: totalExames, rotulo: 'exames' },
    { n: stats.questoes, rotulo: 'questões' },
    { n: institutions.length, rotulo: institutions.length === 1 ? 'universidade' : 'universidades' },
  ].filter((item) => item.n > 0)
  const [menu, setMenu] = useState(false)
  const cta = signedIn ? '/aluno' : '/sign-up'

  // Entrada ao fazer scroll. O servidor envia tudo visível; só depois de carregar é que o que está abaixo do ecrã
  // fica escondido (.tw-js) e aparece uma vez (.tw-in). O que já está visível ao abrir não anima.
  useEffect(() => {
    const root = document.querySelector('.tw')
    const els = Array.from(document.querySelectorAll('.tw-rv'))
    if (!root || !('IntersectionObserver' in window)) return
    const rest = els.filter((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) { el.classList.add('tw-in'); return false }
      return true
    })
    root.classList.add('tw-js')
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('tw-in'); io.unobserve(entry.target) } }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' })
    rest.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <main className="tw min-h-screen" id="inicio">
      <header className="tw-head">
        <div className="tw-w tw-bar">
          <Link href="/" className="tw-brand" aria-label="Twisisa, início">
            <Image src="/images/twisisa-mark.png" alt="" width={44} height={24} priority className="h-6 w-auto" />Twisisa
          </Link>
          <nav className="tw-nav" aria-label="Navegação principal">
            <Link href="/exames">Exames</Link><Link href="/simulado">Simulador</Link>
            <Link href="/jonas">Jonas</Link><Link href="/blog">Blog</Link>
          </nav>
          <div className="flex items-center gap-2">
            {!signedIn && <span className="hidden md:block"><Link href="/sign-in" className="tw-btn ol sm">Entrar</Link></span>}
            <Link href={cta} className="tw-btn sm">{signedIn ? 'Painel' : 'Criar conta'}</Link>
            <button className="tw-menu tw-burger" onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu}>{menu ? '✕' : '☰'}</button>
          </div>
        </div>
        {menu && <nav className="tw-mob tw-menu" aria-label="Menu móvel" onClick={() => setMenu(false)}>
          <Link href="/exames">Exames</Link><Link href="/simulado">Simulador</Link>
          <Link href="/jonas">Jonas</Link><Link href="/blog">Blog</Link><Link href="/planos">Planos</Link>{!signedIn && <Link href="/sign-in">Entrar</Link>}
        </nav>}
      </header>

      {/* APRESENTAÇÃO: o que é, numa frase, com a imagem em círculo e as três áreas à volta */}
      <section className="tw2-hero"><div className="tw-w">
        <div className="tw2-photo">
          <div className="tw2-img"><Image src="/images/estudantes-estudo.jpg" alt="Estudantes a estudar juntos" fill priority sizes="(min-width: 820px) 460px, 76vw" /></div>
          <Link href="/exames" className="tw2-pill p1">Exames</Link>
          <Link href="/aluno/simulador" className="tw2-pill p2">Simulador</Link>
          <Link href="/jonas" className="tw2-pill p3">Jonas</Link>
        </div>
        <div className="tw2-copy">
          <h1>Percebe. <em>Não decores.</em></h1>
          <p className="tw2-lead">Exames, simulador e explicador. Num só lugar.</p>
          <div className="tw-cta">
            <Link href={cta} className="tw-btn lg">{signedIn ? 'Ir ao painel' : 'Começar a estudar'} <ArrowRight size={18} aria-hidden /></Link>
            <Link href="/exames" className="tw-btn lg ol"><BookOpen size={18} aria-hidden /> Ver exames</Link>
          </div>
        </div>
      </div></section>

      {/* NÚMEROS REAIS: só aparecem se existirem */}
      {numeros.length > 0 && <section className="tw3-nums"><div className="tw-w">
        {numeros.map((item, n) => <div key={item.rotulo} className="tw-rv" style={{ ['--d' as string]: `${[0, 0.06, 0.1][n]}s` }}><b>{item.n}</b><span>{item.rotulo}</span></div>)}
      </div></section>}

      {/* PROBLEMAS */}
      <section className="tw2-dark"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Estudar assim não funciona.</h2>
        <ol className="tw2-list">
          {pares.map((p, n) => <li key={n} className="tw2-row tw-rv" style={{ ['--d' as string]: `${[0, 0.06, 0.1, 0.13][n]}s` }}><i>0{n + 1}</i><span>{p.problema}</span></li>)}
        </ol>
      </div></section>

      {/* PROMESSAS */}
      <section className="tw2-sun"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Com o Twisisa.</h2>
        <ol className="tw2-list">
          {pares.map((p, n) => <li key={n} className="tw2-row tw-rv" style={{ ['--d' as string]: `${[0, 0.06, 0.1, 0.13][n]}s` }}><i>0{n + 1}</i><span>{p.promessa}</span><Link href={p.href} className="tw-btn dk">{p.rotulo}</Link></li>)}
        </ol>
      </div></section>

      {/* POR DENTRO: a plataforma a funcionar */}
      <section className="tw3-in"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Vê por dentro.</h2>

        <div className="tw3-feat">
          <div className="tw3-txt tw-rv"><i>Exames</i><h3>Lê. Descarrega. Estuda.</h3><Link href="/exames" className="tw-btn">Ver exames</Link></div>
          <div className="tw3-mock tw-rv" style={{ ['--d' as string]: '.08s' }} aria-hidden="true">
            <div className="tw3-top"><span>UEM</span><span>UP</span><span>ISCTEM</span></div>
            <div className="tw3-li"><b>Matemática</b><em>2024</em><u>Ler</u></div>
            <div className="tw3-li"><b>Física</b><em>2023</em><u>Ler</u></div>
            <div className="tw3-li"><b>Química</b><em>2023</em><u>Ler</u></div>
            <div className="tw3-li"><b>Biologia</b><em>2022</em><u>Ler</u></div>
          </div>
        </div>

        <div className="tw3-feat rev">
          <div className="tw3-txt tw-rv"><i>Simulador</i><h3>Responde. Corrige. Evolui.</h3><Link href="/aluno/simulador" className="tw-btn">Fazer um simulado</Link></div>
          <div className="tw3-mock tw-rv" style={{ ['--d' as string]: '.08s' }} aria-hidden="true">
            <p className="tw3-q">Quanto vale x, se 2x + 6 = 14?</p>
            <div className="tw3-op">A · 2</div><div className="tw3-op ok">B · 4 ✓</div><div className="tw3-op">C · 6</div><div className="tw3-op">D · 8</div>
            <div className="tw3-nota"><span>A tua nota</span><b>16<small>/20</small></b></div>
          </div>
        </div>

        <div className="tw3-feat">
          <div className="tw3-txt tw-rv"><i>Jonas</i><h3>Pergunta. Percebe.</h3><Link href="/jonas" className="tw-btn">Falar com o Jonas</Link></div>
          <div className="tw3-mock tw-rv" style={{ ['--d' as string]: '.08s' }} aria-hidden="true">
            <div className="tw3-b me">Não percebo como resolver 2x + 6 = 14.</div>
            <div className="tw3-b ai"><strong>Jonas</strong>Passa o 6 para o outro lado: 2x = 8. Agora divide por 2: x = 4.</div>
            <div className="tw3-b me">Já percebi!</div>
          </div>
        </div>
      </div></section>

      {/* TRÊS FORMAS DE TREINAR: os modos reais do simulador */}
      <section className="tw4-modes"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Três formas de treinar.</h2>
        <ul>{(['pratica', 'rapido', 'revisao'] as const).map((m, n) => <li key={m} className="tw-rv" style={{ ['--d' as string]: `${[0, 0.06, 0.1][n]}s` }}>
          <b>{MODE_META[m].label}</b><span>{MODE_META[m].tagline}</span><em>{MODE_META[m].meta}</em>
        </li>)}</ul>
      </div></section>

      {/* TUDO NUM SÓ LUGAR */}
      <section className="tw4-all"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Tudo num só lugar.</h2>
        <ul>{funcoes.map(({ Icon, t, d }, n) => <li key={t} className="tw-rv" style={{ ['--d' as string]: `${[0, 0.05, 0.09, 0.12][n % 4]}s` }}>
          <span className="ic"><Icon size={22} aria-hidden /></span><div><b>{t}</b><span>{d}</span></div>
        </li>)}</ul>
      </div></section>

      {/* PARA QUEM É */}
      <section className="tw4-for"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Para quem é.</h2>
        <div>{percursos.map((p, n) => <Link key={p.t} href={cta} className={`tw-rv ${p.cor}`} style={{ ['--d' as string]: `${[0, 0.06, 0.1][n]}s` }}>
          <h3>{p.t}</h3><ul>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul><span className="go">Começar →</span>
        </Link>)}</div>
      </div></section>

      {/* DESCOBRE O CURSO */}
      <section className="tw4-find"><div className="tw-w tw-rv">
        <h2>Ainda não sabes que curso escolher?</h2>
        <Link href="/aluno/descobrir-curso" className="tw-btn lg wh">Fazer o teste</Link>
      </div></section>

      {/* COMO FUNCIONA */}
      <section className="tw3-how"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Começar é rápido.</h2>
        <ol>
          <li className="tw-rv"><b>1</b><span>Cria a conta</span></li>
          <li className="tw-rv" style={{ ['--d' as string]: '.07s' }}><b>2</b><span>Escolhe o teu percurso</span></li>
          <li className="tw-rv" style={{ ['--d' as string]: '.12s' }}><b>3</b><span>Treina e vê a tua nota</span></li>
        </ol>
        <div className="tw-cta tw-rv"><Link href={cta} className="tw-btn lg">{signedIn ? 'Ir ao painel' : 'Criar conta grátis'}</Link></div>
      </div></section>

      {/* PERGUNTAS */}
      <section className="tw3-faq"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Perguntas.</h2>
        <div className="tw-rv">{perguntas.map((p) => <details key={p.q}><summary>{p.q}<b aria-hidden="true">+</b></summary><p>{p.a}</p></details>)}</div>
      </div></section>

      {/* UNIVERSIDADES E BLOG: ligações reais; sem conteúdo a secção não aparece */}
      {(institutions.length > 0 || posts.length > 0) && <section className="tw-sec"><div className="tw-w">
        {institutions.length > 0 && <>
          <h2 className="tw-h2 tw-rv">Exames por universidade</h2>
          <div className="tw-chips tw-rv" style={{ justifyContent: 'center', marginTop: 28 }}>{institutions.map((i) => <Link key={i.slug} href={`/exames/${i.slug}`}>{i.shortName}</Link>)}</div>
        </>}
        {posts.length > 0 && <div className="tw2-blog tw-rv" style={{ marginTop: institutions.length > 0 ? 64 : 0 }}>
          <h2>Ler 3 minutos ajuda.</h2>
          {posts.map((a) => <Link href={`/blog/${a.slug}`} key={a.slug}><span>{a.title}</span><b aria-hidden="true">→</b></Link>)}
        </div>}
      </div></section>}

      {/* FECHO */}
      <section className="tw2-close"><div className="tw-w">
        <h2 className="tw-rv">Começa a perceber.</h2>
        <div className="tw-cta tw-rv" style={{ ['--d' as string]: '.08s' }}><Link href={cta} className="tw-btn lg wh">{signedIn ? 'Ir ao painel' : 'Criar conta'} <ArrowRight size={18} aria-hidden /></Link></div>
      </div></section>

      <footer className="tw-foot"><div className="tw-w">
        <div className="tw-ft">
          <div><Link href="/" className="tw-brand"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-6 w-auto" />Twisisa</Link></div>
          <div><h4>Explorar</h4><Link href="/exames">Exames</Link><Link href="/simulado">Simulador</Link><Link href="/blog">Blog</Link></div>
          <div><h4>Plataforma</h4><Link href="/jonas">Jonas</Link><Link href="/planos">Planos</Link><Link href={cta}>{signedIn ? 'Painel' : 'Criar conta'}</Link></div>
          <div><h4>Legal</h4><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link></div>
        </div>
        <div className="tw-bot"><span>© {new Date().getFullYear()} Twisisa</span><span>Feito em Moçambique</span></div>
      </div></footer>
    </main>
  )
}
TWISISA_F15_EOF

mkdir -p "components/site"
cat > "components/site/site-frame.tsx" <<'TWISISA_F16_EOF'
import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader } from '@/components/site/site-header'
import { listPublicInstitutions } from '@/lib/exames'

// Moldura de todas as páginas públicas secundárias (exames, simulado, blog, planos): o mesmo cabeçalho e rodapé da página inicial.
// Sem sessão no servidor: o botão de conta resolve-se no navegador, por isso as páginas podem ser estáticas (rápidas e indexáveis).
export async function SiteFrame({ children }: { children: React.ReactNode }) {
  const institutions = await listPublicInstitutions().catch(() => [])
  return (
    <div className="tw min-h-screen">
      <a href="#conteudo" className="tw5-skip">Saltar para o conteúdo</a>
      <SiteHeader />
      {children}
      <footer className="tw-foot"><div className="tw-w">
        <div className="tw-ft">
          <div><Link href="/" className="tw-brand"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-6 w-auto" />Twisisa</Link></div>
          <div><h4>Explorar</h4><Link href="/">Início</Link><Link href="/exames">Exames</Link><Link href="/simulado">Simulador</Link><Link href="/blog">Blog</Link></div>
          {institutions.length > 0 && <div><h4>Universidades</h4>{institutions.slice(0, 6).map((item) => <Link key={item.id} href={`/exames/${item.slug}`}>{item.shortName}</Link>)}</div>}
          <div><h4>Plataforma</h4><Link href="/jonas">Jonas</Link><Link href="/planos">Planos</Link><Link href="/sign-up">Criar conta</Link></div>
          <div><h4>Legal</h4><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link></div>
        </div>
        <div className="tw-bot"><span>© {new Date().getFullYear()} Twisisa</span><span>Feito em Moçambique</span></div>
      </div></footer>
    </div>
  )
}
TWISISA_F16_EOF

mkdir -p "components/site"
cat > "components/site/site-header.tsx" <<'TWISISA_F17_EOF'
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSession } from '@/lib/auth-client'

// O mesmo cabeçalho da página inicial, em todas as páginas públicas: logo (volta ao início), quatro ligações e conta.
const NAV = [
  { href: '/exames', label: 'Exames' },
  { href: '/simulado', label: 'Simulador' },
  { href: '/jonas', label: 'Jonas' },
  { href: '/blog', label: 'Blog' },
] as const

export function SiteHeader() {
  const path = usePathname() ?? ''
  const [menu, setMenu] = useState(false)
  const { data, isPending } = useSession()
  const signedIn = Boolean(data?.user)
  const on = (href: string) => (path === href || path.startsWith(`${href}/`) ? 'page' : undefined)
  return (
    <header className="tw-head">
      <div className="tw-w tw-bar">
        <Link href="/" className="tw-brand" aria-label="Twisisa, início">
          <Image src="/images/twisisa-mark.png" alt="" width={44} height={24} priority className="h-6 w-auto" />Twisisa
        </Link>
        <nav className="tw-nav" aria-label="Navegação principal">
          {NAV.map((item) => <Link key={item.href} href={item.href} aria-current={on(item.href)}>{item.label}</Link>)}
        </nav>
        <div className={`flex items-center gap-2 ${isPending ? 'invisible' : ''}`}>
          {!signedIn && <span className="hidden md:block"><Link href="/sign-in" className="tw-btn ol sm">Entrar</Link></span>}
          <Link href={signedIn ? '/aluno' : '/sign-up'} className="tw-btn sm">{signedIn ? 'Painel' : 'Criar conta'}</Link>
          <button className="tw-menu tw-burger" onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu}>{menu ? '✕' : '☰'}</button>
        </div>
      </div>
      {menu && (
        <nav className="tw-mob tw-menu" aria-label="Menu móvel" onClick={() => setMenu(false)}>
          <Link href="/">Início</Link>
          {NAV.map((item) => <Link key={item.href} href={item.href} aria-current={on(item.href)}>{item.label}</Link>)}
          <Link href="/planos">Planos</Link>
          {!signedIn && <Link href="/sign-in">Entrar</Link>}
        </nav>
      )}
    </header>
  )
}
TWISISA_F17_EOF

mkdir -p "app"
cat > "app/page.tsx" <<'TWISISA_F18_EOF'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import HomePage from '@/components/home-page'
import { listLatest } from '@/lib/blog'
import { listPublicInstitutions } from '@/lib/exames'
import { countPublishedQuestions } from '@/lib/home-stats'
import { BLOG_TRACK_LABEL } from '@/lib/blog-pure'
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...pageMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: '/' }),
  title: { absolute: SITE_TITLE },
}

export default async function Page() {
  // A página inicial mostra «Painel» a quem já iniciou sessão. Se a verificação falhar, mostra-se como a um visitante.
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  // Últimos artigos reais do blog; se a leitura falhar ou não houver artigos, a secção não aparece.
  const latest = await listLatest(3)
  // Universidades com exames públicos: ligações da página inicial para /exames/<universidade>.
  const institutions = (await listPublicInstitutions().catch(() => [])).map((item) => ({ slug: item.slug, shortName: item.shortName, name: item.name, exams: item.exams }))
  const questoes = await countPublishedQuestions()
  const posts = latest.map((post) => ({ slug: post.slug, category: post.subjectName ?? (post.track ? BLOG_TRACK_LABEL[post.track] : 'Artigo'), title: post.title, description: post.excerpt }))
  return <HomePage signedIn={Boolean(session?.user)} posts={posts} institutions={institutions} stats={{ questoes }} />
}
TWISISA_F18_EOF

mkdir -p "lib"
cat > "lib/home-stats.ts" <<'TWISISA_F19_EOF'
import { pool } from '@/lib/db'

/** Questões publicadas no simulador (número real mostrado na página inicial). Em caso de falha devolve 0 e o número não aparece. */
export async function countPublishedQuestions(): Promise<number> {
  try {
    const result = await pool.query(`SELECT count(*)::int AS n FROM questions WHERE status = 'publicada'`)
    return (result.rows[0]?.n as number) ?? 0
  } catch (error) {
    console.error('[HOME] questões', error)
    return 0
  }
}
TWISISA_F19_EOF

sed -i '/\/\* \[twisisa-home\]/,$d' app/globals.css

cat >> app/globals.css <<'TWISISA_CSS1_EOF'

/* [twisisa-home] movimento e botões da página inicial (skills de design engineering) */
.tw-btn{border:2px solid transparent;transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .2s ease,background-color .2s ease,border-color .2s ease,color .2s ease}
.tw-btn:hover{transform:none;box-shadow:none}
.tw-btn.sm{padding:9px 18px;font-size:.88rem}
.tw-btn.lg{font-size:1.02rem}
.tw-btn.ol{background:#fff;color:var(--g);border-color:var(--g)}
@media (hover:hover) and (pointer:fine){.tw-btn:hover{transform:translateY(-2px);box-shadow:0 12px 26px -12px var(--g)}.tw-btn.ol:hover{background:var(--g);color:#fff}.tw-btn.wh:hover{box-shadow:0 12px 26px -12px #000}}
.tw-btn:active{transform:scale(.97)}
.tw a:focus-visible,.tw button:focus-visible{outline:3px solid var(--g);outline-offset:3px;border-radius:10px}
.tw-nav{gap:26px;font-size:.95rem;font-weight:700;color:var(--ink)}
.tw-nav a{position:relative;padding:8px 2px;transition:color .2s ease}
.tw-nav a::after{content:"";position:absolute;left:0;right:0;bottom:2px;height:2px;border-radius:2px;background:var(--g);transform:scaleX(0);transform-origin:left;transition:transform .2s cubic-bezier(.23,1,.32,1)}
@media (hover:hover) and (pointer:fine){.tw-nav a:hover::after{transform:scaleX(1)}}
.tw-burger{padding:10px 12px;font-size:1.15rem;font-weight:700;color:var(--g);border-radius:12px;transition:background-color .2s ease,transform .16s cubic-bezier(.23,1,.32,1)}
.tw-burger:active{transform:scale(.95);background:var(--gs)}
.tw-mob{opacity:1;transform:none;transition:opacity .2s cubic-bezier(.23,1,.32,1),transform .2s cubic-bezier(.23,1,.32,1)}
@starting-style{.tw-mob{opacity:0;transform:translateY(-8px)}}
.tw-mob a{padding:14px 0;font-size:1.05rem;font-weight:700}
@keyframes tw-hero-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.tw-hero h1{animation:tw-hero-in .6s cubic-bezier(.23,1,.32,1) both}
.tw-hero .tw-cta{animation:tw-hero-in .5s cubic-bezier(.23,1,.32,1) .09s both}
.tw-pn h3{font:800 1.5rem 'Manrope',sans-serif;letter-spacing:-.04em;text-transform:none;color:var(--ink);margin-bottom:18px}
.tw-pn.ok h3{color:var(--g)}
@keyframes tw-forget{0%,25%{opacity:1}75%,100%{opacity:.1}}
.tw-pn:not(.tw-in) *{animation-play-state:paused}
.tw-step b{font:800 1rem 'Manrope',sans-serif;color:var(--g);letter-spacing:.1em}
.tw-step h3{margin-top:8px;font-size:1.3rem}
.tw-chips a{padding:10px 16px;border-radius:99px;font-size:.92rem;font-weight:700;background:var(--gs);color:var(--g);transition:transform .16s cubic-bezier(.23,1,.32,1),background-color .2s ease,color .2s ease}
@media (hover:hover) and (pointer:fine){.tw-chips a:hover{background:var(--g);color:#fff}}
.tw-chips a:active{transform:scale(.96)}
.tw-art a{transition:transform .2s cubic-bezier(.23,1,.32,1),border-color .2s ease}
.tw-art a:hover{transform:none;border-color:var(--ln)}
@media (hover:hover) and (pointer:fine){.tw-art a:hover{transform:translateY(-3px);border-color:var(--g)}}
.tw-art a:active{transform:scale(.98)}
.tw-rv{opacity:1;transform:none;transition:none}
.tw-js .tw-rv{opacity:0;transform:translateY(16px);transition:opacity .5s cubic-bezier(.23,1,.32,1),transform .5s cubic-bezier(.23,1,.32,1);transition-delay:var(--d,0s)}
.tw-js .tw-rv.tw-in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.tw-js .tw-rv{transform:none;transition:opacity .3s ease}.tw-hero h1,.tw-hero .tw-cta{animation:none}}
TWISISA_CSS1_EOF
cat >> app/globals.css <<'TWISISA_CSS2_EOF'

/* [twisisa-home-2] apresentação com imagem em círculo, problemas (escuro) e promessas (amarelo) */
.tw{--am:#ffcf33;--co:#ff6b4a;--dk:#0a1a14}
.tw-btn.dk{background:var(--ink);color:#fff}
@media (hover:hover) and (pointer:fine){.tw-btn.dk:hover{background:var(--gd)}}

.tw2-hero{padding:40px 0 64px}
.tw2-hero .tw-w{display:grid;gap:44px;align-items:center}
.tw2-copy{display:grid;justify-items:start;align-content:start}
.tw2-hero h1{margin:0;font-size:clamp(2.9rem,12vw,5rem);line-height:1;font-weight:800;animation:tw-hero-in .6s cubic-bezier(.23,1,.32,1) both}
.tw2-hero h1 em{display:block;font-style:normal;color:var(--g);white-space:nowrap}
.tw2-lead{margin:22px 0 0;font-size:clamp(1.15rem,3.4vw,1.45rem);font-weight:700;color:var(--ink);animation:tw-hero-in .5s cubic-bezier(.23,1,.32,1) .06s both}
.tw2-copy .tw-cta{justify-content:flex-start;animation:tw-hero-in .5s cubic-bezier(.23,1,.32,1) .12s both}
@keyframes tw2-pop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
.tw2-photo{position:relative;width:min(76vw,460px);aspect-ratio:1;margin-inline:auto}
.tw2-img{position:absolute;inset:0;border-radius:50%;overflow:hidden;border:8px solid #fff;box-shadow:0 30px 70px -30px rgba(7,59,39,.6);animation:tw2-pop .7s cubic-bezier(.23,1,.32,1) .1s both}
.tw2-img img{object-fit:cover;object-position:46% 38%}
.tw2-photo::before{content:"";position:absolute;inset:-16px;border-radius:50%;border:3px solid var(--am);animation:tw2-pop .7s cubic-bezier(.23,1,.32,1) .18s both}
.tw2-pill{position:absolute;display:inline-flex;align-items:center;padding:12px 20px;border-radius:99px;background:#fff;color:var(--ink);font-weight:800;font-size:.98rem;border:2px solid var(--ink);box-shadow:0 12px 26px -14px rgba(0,0,0,.5);transition:transform .16s cubic-bezier(.23,1,.32,1),background-color .2s ease,color .2s ease;animation:tw-hero-in .5s cubic-bezier(.23,1,.32,1) both}
.tw2-pill.p1{top:6%;left:-4%;animation-delay:.3s}
.tw2-pill.p2{top:46%;right:-6%;animation-delay:.38s}
.tw2-pill.p3{bottom:6%;left:2%;animation-delay:.45s}
@media (hover:hover) and (pointer:fine){.tw2-pill:hover{background:var(--g);border-color:var(--g);color:#fff;transform:translateY(-2px)}}
.tw2-pill:active{transform:scale(.96)}

.tw2-dark{background:var(--dk);color:#fff;padding:80px 0}
.tw2-sun{background:var(--am);color:var(--ink);padding:80px 0}
.tw2-h{margin:0;font:800 clamp(1.9rem,6vw,3.1rem)/1.08 'Manrope',system-ui,sans-serif;letter-spacing:-.045em}
.tw2-dark .tw2-h{color:#fff}
.tw2-list{list-style:none;margin:36px 0 0;padding:0}
.tw2-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 18px;padding:22px 0;border-top:2px solid rgba(255,255,255,.16);font:800 clamp(1.55rem,5.4vw,2.7rem)/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.045em}
.tw2-row i{font:800 1rem 'Manrope',sans-serif;font-style:normal;letter-spacing:.06em;min-width:2.2ch}
.tw2-row span{flex:1 1 14ch}
.tw2-dark .tw2-row i,.tw2-dark .tw2-row b{color:var(--co)}
.tw2-dark .tw2-row b{font-weight:800}
.tw2-sun .tw2-row{border-top-color:rgba(13,31,23,.22)}
.tw2-sun .tw2-row i{color:var(--gd)}
.tw2-sun .tw2-row b{font-weight:800;box-shadow:inset 0 -.32em 0 rgba(255,255,255,.7)}
.tw2-row .tw-btn{font:700 .95rem 'DM Sans',system-ui,sans-serif;letter-spacing:0}
.tw2-sun .tw-btn{margin-top:6px}
@media (min-width:820px){
  .tw2-hero{padding:84px 0 110px}
  .tw2-hero .tw-w{grid-template-columns:1.05fr .95fr;gap:64px}
  .tw2-dark,.tw2-sun{padding:110px 0}
  .tw2-row{flex-wrap:nowrap;align-items:center}
  .tw2-sun .tw-btn{margin-top:0;margin-left:auto}
}

.tw2-blog h2{font:800 clamp(1.5rem,4.5vw,2.1rem)/1.1 'Manrope',sans-serif;letter-spacing:-.04em;margin-bottom:8px}
.tw2-blog a{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 0;border-top:1px solid var(--ln);font-weight:700;font-size:1.05rem;color:var(--ink);transition:color .2s ease}
.tw2-blog a b{color:var(--g);font-size:1.3rem;transition:transform .2s cubic-bezier(.23,1,.32,1)}
@media (hover:hover) and (pointer:fine){.tw2-blog a:hover{color:var(--g)}.tw2-blog a:hover b{transform:translateX(4px)}}
.tw2-blog a:active{color:var(--g)}

.tw2-close{padding:96px 0;text-align:center;background:var(--g);color:#fff}
.tw2-close h2{font:800 clamp(2rem,7vw,3.6rem)/1.05 'Manrope',sans-serif;letter-spacing:-.045em;color:#fff}
@media (prefers-reduced-motion:reduce){.tw2-hero h1,.tw2-lead,.tw2-copy .tw-cta,.tw2-img,.tw2-photo::before,.tw2-pill{animation:none}}
TWISISA_CSS2_EOF
cat >> app/globals.css <<'TWISISA_CSS3_EOF'

/* [twisisa-home-3] números, plataforma por dentro, passos e perguntas */
.tw3-nums{background:var(--g);color:#fff;padding:34px 0}
.tw3-nums .tw-w{display:flex;flex-wrap:wrap;justify-content:space-around;gap:22px;text-align:center}
.tw3-nums b{display:block;font:800 clamp(2.4rem,9vw,3.6rem)/1 'Manrope',system-ui,sans-serif;letter-spacing:-.05em}
.tw3-nums span{font-weight:800;font-size:1.05rem;color:var(--am)}
.tw3-in{padding:84px 0;background:#eaf4ee}
.tw3-feat{display:grid;gap:30px;align-items:center;margin-top:52px}
.tw3-txt i{font-style:normal;font-weight:800;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;color:var(--g)}
.tw3-txt h3{margin:10px 0 22px;font:800 clamp(1.8rem,5.5vw,2.6rem)/1.06 'Manrope',system-ui,sans-serif;letter-spacing:-.045em}
.tw3-mock{background:#fff;border:2px solid var(--ink);border-radius:24px;padding:22px;box-shadow:9px 9px 0 var(--am)}
.tw3-top{display:flex;gap:8px;margin-bottom:8px}
.tw3-top span{padding:7px 15px;border-radius:99px;font-weight:800;font-size:.85rem;background:var(--gs);color:var(--g)}
.tw3-top span:first-child{background:var(--g);color:#fff}
.tw3-li{display:flex;align-items:center;gap:12px;padding:15px 0;border-top:1px solid var(--ln)}
.tw3-li b{flex:1;font-weight:800;font-size:1.05rem}
.tw3-li em{font-style:normal;font-weight:800;color:var(--g)}
.tw3-li u{text-decoration:none;padding:7px 15px;border-radius:99px;background:var(--g);color:#fff;font-weight:800;font-size:.85rem}
.tw3-q{margin:0 0 14px;font:800 1.25rem/1.3 'Manrope',system-ui,sans-serif;letter-spacing:-.03em}
.tw3-op{padding:13px 16px;margin-top:8px;border:2px solid var(--ln);border-radius:14px;font-weight:700}
.tw3-op.ok{border-color:var(--g);background:var(--gs);color:var(--gd)}
.tw3-nota{display:flex;align-items:baseline;justify-content:space-between;margin-top:18px;padding:16px 20px;border-radius:16px;background:var(--ink);color:#fff}
.tw3-nota span{font-weight:700}
.tw3-nota b{font:800 2.6rem/1 'Manrope',system-ui,sans-serif;color:var(--am);letter-spacing:-.04em}
.tw3-nota small{font-size:1.1rem;color:#fff;font-weight:700}
.tw3-b{max-width:90%;margin-top:10px;padding:13px 16px;border-radius:18px;font-weight:600;line-height:1.45}
.tw3-b.me{margin-left:auto;background:var(--g);color:#fff;border-bottom-right-radius:6px}
.tw3-b.ai{background:var(--am);color:var(--ink);border-bottom-left-radius:6px}
.tw3-b strong{display:block;margin-bottom:4px;font-weight:800}
.tw3-how{padding:84px 0;text-align:center}
.tw3-how ol{list-style:none;margin:44px 0 36px;padding:0;display:grid;gap:22px}
.tw3-how li{display:flex;flex-direction:column;align-items:center;gap:14px}
.tw3-how li b{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:var(--ink);color:#fff;font:800 1.6rem 'Manrope',system-ui,sans-serif}
.tw3-how li span{font:800 1.3rem/1.2 'Manrope',system-ui,sans-serif;letter-spacing:-.03em}
.tw3-how .tw-cta{justify-content:center}
.tw3-faq{padding:24px 0 84px}
.tw3-faq details{border-top:2px solid var(--ink);padding:20px 0}
.tw3-faq details:last-child{border-bottom:2px solid var(--ink)}
.tw3-faq summary{display:flex;justify-content:space-between;gap:16px;cursor:pointer;list-style:none;font:800 1.2rem/1.3 'Manrope',system-ui,sans-serif;letter-spacing:-.03em}
.tw3-faq summary::-webkit-details-marker{display:none}
.tw3-faq summary b{color:var(--g);font-size:1.7rem;line-height:1;transition:transform .2s cubic-bezier(.23,1,.32,1)}
.tw3-faq details[open] summary b{transform:rotate(45deg)}
.tw3-faq p{margin:12px 0 0;font-size:1.05rem;line-height:1.6;color:var(--ink)}
@media (min-width:820px){
  .tw3-in,.tw3-how{padding:110px 0}
  .tw3-feat{grid-template-columns:1fr 1fr;gap:72px;margin-top:84px}
  .tw3-feat.rev .tw3-txt{order:2}
  .tw3-how ol{grid-template-columns:repeat(3,1fr);gap:28px}
}
TWISISA_CSS3_EOF
cat >> app/globals.css <<'TWISISA_CSS4_EOF'

/* [twisisa-home-4] imagem primeiro, botões na mesma linha, cores suaves e mais conteúdo */
.tw{--am:#e8c872}
.tw2-hero .tw-w{grid-template-columns:1fr}
.tw2-copy .tw-cta{flex-wrap:nowrap;gap:10px;width:100%}
.tw2-copy .tw-btn.lg{flex:1 1 0;min-width:0;padding:15px 12px;font-size:.98rem;white-space:nowrap}
.tw2-photo::before{border:3px solid #b9d9c7}
.tw2-sun{background:#f2ede1}
.tw2-sun .tw2-row{border-top-color:rgba(13,31,23,.18)}
.tw2-sun .tw2-row b{box-shadow:inset 0 -.32em 0 #cfe5d8}
.tw3-nums span{color:#e3f3ea}
.tw3-mock{box-shadow:9px 9px 0 #cfe5d8}
.tw3-b.ai{background:#e3f1e8;color:var(--ink)}
.tw3-nota b{color:#f0d78c}
.tw4-modes{padding:84px 0 24px}
.tw4-modes ul{list-style:none;margin:32px 0 0;padding:0}
.tw4-modes li{display:grid;gap:6px;padding:22px 0;border-top:2px solid var(--ink)}
.tw4-modes li:last-child{border-bottom:2px solid var(--ink)}
.tw4-modes li b{font:800 clamp(1.5rem,5vw,2rem)/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.04em}
.tw4-modes li span{font-weight:600;font-size:1.05rem;line-height:1.45}
.tw4-modes li em{justify-self:start;font-style:normal;font-weight:800;font-size:.88rem;padding:6px 14px;border-radius:99px;background:var(--gs);color:var(--g)}
.tw4-all{padding:72px 0}
.tw4-all ul{list-style:none;margin:36px 0 0;padding:0;display:grid;gap:26px 40px}
.tw4-all li{display:flex;align-items:flex-start;gap:16px}
.tw4-all .ic{display:grid;place-items:center;flex:none;width:48px;height:48px;border-radius:14px;background:var(--g);color:#fff}
.tw4-all li b{display:block;font:800 1.15rem/1.25 'Manrope',system-ui,sans-serif;letter-spacing:-.02em}
.tw4-all li div span{display:block;margin-top:3px;font-weight:600;line-height:1.45}
.tw4-for{padding:24px 0 84px}
.tw4-for>.tw-w>div{display:grid;gap:18px;margin-top:32px}
.tw4-for a{display:block;padding:26px 24px;border-radius:22px;border:2px solid var(--ink);background:#fff;border-top-width:10px;transition:transform .2s cubic-bezier(.23,1,.32,1)}
.tw4-for a.g{border-top-color:var(--g)}.tw4-for a.k{border-top-color:var(--ink)}.tw4-for a.o{border-top-color:var(--am)}
.tw4-for h3{margin:0 0 14px;font:800 1.6rem/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.04em}
.tw4-for ul{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px}
.tw4-for li{font-weight:600;padding-left:22px;position:relative}
.tw4-for li::before{content:"✓";position:absolute;left:0;color:var(--g);font-weight:800}
.tw4-for .go{font-weight:800;color:var(--g)}
@media (hover:hover) and (pointer:fine){.tw4-for a:hover{transform:translateY(-3px)}}
.tw4-for a:active{transform:scale(.98)}
.tw4-find{padding:64px 0;background:var(--dk);color:#fff;text-align:center}
.tw4-find .tw-w{display:grid;justify-items:center;gap:24px}
.tw4-find h2{margin:0;font:800 clamp(1.7rem,5.5vw,2.6rem)/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.045em;max-width:20ch}
@media (min-width:820px){
  .tw2-hero .tw-w{grid-template-columns:.95fr 1.05fr}
  .tw2-copy .tw-cta{width:auto}
  .tw2-copy .tw-btn.lg{flex:0 0 auto;padding:16px 32px}
  .tw4-modes{padding:110px 0 30px}
  .tw4-modes li{grid-template-columns:.7fr 1.5fr auto;align-items:center;gap:28px}
  .tw4-all{padding:96px 0}
  .tw4-all ul{grid-template-columns:1fr 1fr}
  .tw4-for>.tw-w>div{grid-template-columns:repeat(3,1fr)}
}
TWISISA_CSS4_EOF
cat >> app/globals.css <<'TWISISA_CSS5_EOF'

/* [twisisa-home-5] páginas secundárias no mesmo estilo da página inicial */
.tw{--color-texto-2:#34453b}
.tw-nav a[aria-current=page]{color:var(--g)}
.tw-nav a[aria-current=page]::after{transform:scaleX(1)}
.tw-mob a[aria-current=page]{color:var(--g)}
.tw5-skip{position:absolute;left:-9999px;top:8px;z-index:60;padding:10px 16px;border-radius:10px;background:#fff;color:var(--g);font-weight:800}
.tw5-skip:focus{left:16px}
.tw5{max-width:1040px;margin:0 auto;padding:26px 20px 24px}
.tw5-back{display:flex;align-items:center;flex-wrap:wrap;gap:12px 18px;margin-bottom:30px}
.tw5-back nav{display:none;align-items:center;gap:8px;font-weight:700;font-size:.92rem}
.tw5-back nav a{color:var(--g)}
.tw5-back nav i{font-style:normal;color:var(--ink);opacity:.4}
.tw5-back nav b{font-weight:800;color:var(--ink)}
.tw5-h1{margin:0;font:800 clamp(2.2rem,7.5vw,4rem)/1.02 'Manrope',system-ui,sans-serif;letter-spacing:-.05em}
.tw5-h1 em{font-style:normal;color:var(--g)}
.tw5-sub{margin:14px 0 0;font-weight:700;font-size:1.15rem;color:var(--ink)}
.tw5-top{animation:tw-hero-in .55s cubic-bezier(.23,1,.32,1) both}
.tw5-sec{margin-top:60px}
.tw5-h2{margin:0 0 20px;font:800 clamp(1.5rem,4.8vw,2.2rem)/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.045em}
.tw5-search{display:flex;gap:10px;margin-top:26px;max-width:640px}
.tw5-search div{flex:1;min-width:0}
.tw5-search input{width:100%;height:56px;padding:0 22px;border:2px solid var(--ink);border-radius:99px;background:#fff;color:var(--ink);font:600 1rem 'DM Sans',system-ui,sans-serif;outline:none;transition:border-color .2s ease,box-shadow .2s ease}
.tw5-search input::placeholder{color:#4f6157}
.tw5-search input:focus{border-color:var(--g);box-shadow:0 0 0 4px var(--gs)}
.tw5-search .tw-btn{height:56px;padding:0 26px}
.tw5-tiles{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.tw5-tile{display:flex;flex-direction:column;gap:6px;height:100%;padding:22px;border:2px solid var(--ink);border-top:8px solid var(--g);border-radius:20px;background:#fff;color:var(--ink);transition:transform .2s cubic-bezier(.23,1,.32,1)}
.tw5-tile b{font:800 1.6rem/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.04em}
.tw5-tile small{font-weight:600;font-size:.95rem;line-height:1.4}
.tw5-tile span{margin-top:auto;padding-top:10px;font-weight:800;color:var(--g)}
@media (hover:hover) and (pointer:fine){.tw5-tile:hover{transform:translateY(-3px)}}
.tw5-tile:active{transform:scale(.98)}
.tw5-rows{list-style:none;margin:0;padding:0;border-bottom:2px solid var(--ink)}
.tw5-row{display:flex;align-items:center;gap:14px;padding:18px 6px;border-top:2px solid var(--ink);color:var(--ink);transition:background-color .2s ease}
.tw5-row b{flex:1;font:800 1.1rem/1.25 'Manrope',system-ui,sans-serif;letter-spacing:-.02em}
.tw5-row em{font-style:normal;font-weight:800;color:var(--g)}
.tw5-row u{text-decoration:none;padding:8px 18px;border-radius:99px;background:var(--g);color:#fff;font-weight:800;font-size:.88rem;transition:transform .16s cubic-bezier(.23,1,.32,1)}
@media (hover:hover) and (pointer:fine){.tw5-row:hover{background:var(--gs)}}
.tw5-row:active u{transform:scale(.95)}
.tw5-chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px}
.tw5-chips a,.tw5-chips span{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:99px;background:var(--gs);color:var(--g);font-weight:800;font-size:.95rem;transition:transform .16s cubic-bezier(.23,1,.32,1),background-color .2s ease,color .2s ease}
.tw5-chips span{color:var(--ink)}
@media (hover:hover) and (pointer:fine){.tw5-chips a:hover{background:var(--g);color:#fff}}
.tw5-chips a:active{transform:scale(.96)}
.tw5-actions{display:flex;gap:10px;margin-top:26px}
.tw5-actions .tw-btn{flex:1 1 0;min-width:0;white-space:nowrap}
@media (max-width:480px){.tw5-actions .tw-btn{padding:0 14px;height:50px;font-size:.88rem}.tw5-actions .tw-btn svg{width:16px;height:16px;flex:none}}
@media (min-width:480px){.tw5-actions .tw-btn{flex:0 0 auto}}
.tw5-topic{padding:24px 0;border-top:2px solid var(--ink)}
.tw5-topic:last-child{border-bottom:2px solid var(--ink)}
.tw5-topic h3{margin:0;font:800 1.35rem/1.2 'Manrope',system-ui,sans-serif;letter-spacing:-.03em}
.tw5-topic h3 i{font-style:normal;color:var(--g);margin-right:8px}
.tw5-topic p{margin:10px 0 0;font-size:1.02rem;line-height:1.65;white-space:pre-line}
.tw5-topic .dica{margin-top:14px;padding:12px 16px;border-radius:14px;background:var(--gs);font-weight:700;color:var(--gd)}
.tw5-view{display:block;width:100%;height:62dvh;margin-top:30px;border:2px solid var(--ink);border-radius:20px;background:#fff}
.tw5-band{margin-top:60px;padding:34px 26px;border-radius:24px;background:var(--g);color:#fff;display:grid;gap:18px;justify-items:start}
.tw5-band h2{margin:0;font:800 clamp(1.6rem,5vw,2.3rem)/1.08 'Manrope',system-ui,sans-serif;letter-spacing:-.045em;color:#fff}
.tw5-band .tw-cta{margin:0;justify-content:flex-start}
.tw5-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:34px;font-weight:800}
.tw5-faq details{border-top:2px solid var(--ink);padding:20px 0}
.tw5-faq details:last-child{border-bottom:2px solid var(--ink)}
.tw5-faq summary{display:flex;justify-content:space-between;gap:16px;cursor:pointer;list-style:none;font:800 1.15rem/1.3 'Manrope',system-ui,sans-serif;letter-spacing:-.03em}
.tw5-faq summary::-webkit-details-marker{display:none}
.tw5-faq summary b{color:var(--g);font-size:1.7rem;line-height:1;transition:transform .2s cubic-bezier(.23,1,.32,1)}
.tw5-faq details[open] summary b{transform:rotate(45deg)}
.tw5-faq p{margin:12px 0 0;font-size:1.02rem;line-height:1.6;color:var(--ink)}
.tw5-vazio{padding:26px;border:2px dashed var(--ink);border-radius:20px;font-weight:700}
@media (min-width:640px){.tw5-tiles{grid-template-columns:repeat(2,1fr)}}
@media (min-width:900px){
  .tw5{padding-top:34px}
  .tw5-back nav{display:flex}
  .tw5-tiles{grid-template-columns:repeat(3,1fr)}
  .tw5-view{height:78dvh}
  .tw5-band{grid-template-columns:1fr auto;align-items:center;padding:40px 44px}
}
@media (prefers-reduced-motion:reduce){.tw5-top{animation:none}}
.tw5-back nav span{display:inline-flex;align-items:center;gap:8px}
.tw-ft{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.tw-ft a{color:var(--ink);font-weight:600}
.tw-ft h4{color:var(--ink)}
TWISISA_CSS5_EOF
echo "ok: páginas atualizadas"
