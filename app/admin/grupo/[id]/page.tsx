import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getStaffAccess } from '@/lib/staff'
import { countUnread } from '@/lib/admin-notify'
import { getCatalog, type CatalogRow } from '@/lib/admin-overview'
import { adminSections } from '@/lib/admin-sections'
import { grupoPorId } from '@/lib/admin-grupos'
import { contarRevisao } from '@/lib/revisao-db'
import { AdminPage, AdminPageHeader } from '@/components/admin/page-parts'

export const dynamic = 'force-dynamic'

const nf = new Intl.NumberFormat('pt-PT')

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const grupo = grupoPorId((await params).id)
  return { title: `${grupo?.titulo ?? 'Grupo'} | Administração | Twisisa` }
}

// A página de um grupo do menu: cada secção com a sua descrição e o número que importa (o que espera por ti, ou quantos há).
export default async function GrupoAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getStaffAccess()
  if (!access) redirect('/aluno')
  if (access.role !== 'admin') redirect('/admin/questoes')
  const grupo = grupoPorId((await params).id)
  if (!grupo) notFound()

  let catalogo: CatalogRow[] = []
  let porLer = 0
  let emRevisao = 0
  try {
    ;[catalogo, porLer, emRevisao] = await Promise.all([getCatalog().catch(() => []), countUnread(access.user.id), contarRevisao()])
  } catch (error) {
    console.error('[ADMIN] grupo', error)
  }
  const contagem = new Map(catalogo.map((linha) => [linha.href, linha]))
  const pendentes: Record<string, number> = { '/admin/notificacoes': porLer, '/admin/revisao': emRevisao }

  const secoes = grupo.hrefs.map((href) => adminSections.find((item) => item.href === href)).filter((item): item is NonNullable<typeof item> => Boolean(item))

  return (
    <AdminPage>
      <AdminPageHeader title={grupo.titulo ?? ''} description={grupo.descricao} />
      <ul className="ad-hub">
        {secoes.map(({ href, label, description, icon: Icon }) => {
          const linha = contagem.get(href)
          const espera = pendentes[href] ?? 0
          return (
            <li key={href}>
              <Link href={href} className="ad-hc">
                <span className="ad-hc-i"><Icon size={19} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><b>{label}</b><small>{description}</small></span>
                {espera > 0 ? <span className="ad-hc-n ad-hc-w">{nf.format(espera)}</span> : linha ? <span className="ad-hc-n">{nf.format(linha.on)}</span> : null}
                <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-[#9aa39c]" />
              </Link>
            </li>
          )
        })}
      </ul>
    </AdminPage>
  )
}
