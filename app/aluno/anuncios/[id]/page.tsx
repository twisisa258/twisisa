import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { ANUNCIO_TOM_LABEL, getAnuncioAtivo } from '@/lib/anuncios'
import { requireStudent } from '@/lib/require-student'

// [twisisa-ux] detalhe de um anúncio. Só para estudantes com sessão; não é indexado.
export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ id: string }> }

export default async function AnuncioPage({ params }: Props) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const session = await requireStudent(`/aluno/anuncios/${id}`)
  const anuncio = await getAnuncioAtivo(id).catch((error: unknown) => {
    console.error('[ALUNO] anúncio', error)
    return null
  })
  if (!anuncio) notFound()

  const firstName = session.user.name.split(' ')[0]
  const cta = anuncio.ctaHref && anuncio.ctaLabel ? { href: anuncio.ctaHref, label: anuncio.ctaLabel } : null

  return (
    <StudentFeatureShell firstName={firstName} eyebrow={ANUNCIO_TOM_LABEL[anuncio.tone]} title={anuncio.title} description="Anúncio da equipa Twisisa.">
      <Link href="/aluno" className="inline-flex items-center gap-2 text-sm font-semibold text-marca">
        <ArrowLeft size={16} aria-hidden="true" /> Voltar ao painel
      </Link>
      <article className="mt-5 rounded-2xl border border-linha bg-white p-5">
        {anuncio.body && <p className="whitespace-pre-line text-[15px] leading-7 text-texto-2">{anuncio.body}</p>}
        {cta && (
          cta.href.startsWith('https://') ? (
            <a href={cta.href} target="_blank" rel="noopener noreferrer" className="btn btn-primario mt-6">{cta.label}</a>
          ) : (
            <Link href={cta.href} className="btn btn-primario mt-6">{cta.label}</Link>
          )
        )}
      </article>
    </StudentFeatureShell>
  )
}
