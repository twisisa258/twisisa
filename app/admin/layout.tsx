import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { pageMetadata } from '@/lib/seo'
import { getStaffAccess } from '@/lib/staff'
import { Brand } from '@/components/brand'
import { SignOutButton } from '@/components/sign-out-button'
import { AdminNav } from '@/components/admin/admin-nav'
import { countUnread } from '@/lib/admin-notify'
import { contarRevisao } from '@/lib/revisao-db'

export const metadata: Metadata = pageMetadata({
  title: 'Administração | Twisisa',
  description: 'Gestão de conteúdos do Twisisa.',
  path: '/admin',
  index: false,
})

const badge = 'rounded-full bg-[#e6f0e9] px-2.5 py-1 text-[11px] font-semibold text-marca'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const access = await getStaffAccess()
  // Sem sessão, /aluno reencaminha para o início de sessão; sem permissão, fica na área do estudante.
  if (!access) redirect('/aluno')
  const admin = access.user
  const home = access.role === 'admin' ? '/admin' : '/admin/questoes'
  const roleLabel = access.role === 'admin' ? 'Administração' : 'Revisão'
  const firstName = admin.name.split(' ')[0]
  const [porLer, emRevisao] = await Promise.all([countUnread(admin.id), contarRevisao()])
  const badges = { '/admin/notificacoes': porLer, '/admin/revisao': emRevisao }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-fundo text-texto lg:flex-row">
      {/* Barra lateral escura: é o que distingue a administração da área do estudante. */}
      <aside className="ad-sd hidden lg:flex">
        <Link href={home} aria-label="Twisisa, página inicial da administração" className="ad-logo">
          <span className="ad-mark"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-4 w-auto object-contain" /></span>
          Twisisa
        </Link>
        <p className="ad-papel">{roleLabel}</p>
        <AdminNav variant="sidebar" role={access.role} badges={badges} />
        <div className="ad-rodape">
          <Link href="/aluno" className="ad-volta"><ArrowLeft size={16} aria-hidden="true" /> Área do estudante</Link>
          <div className="ad-eu">
            <span className="flex min-w-0 items-center gap-2">
              <span className="ad-av">{firstName.slice(0, 1)}</span>
              <span className="truncate">{firstName}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-30 shrink-0 border-b border-linha bg-fundo/95 px-5 pt-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 pb-3">
            <Brand href={home} />
            <div className="flex items-center gap-2">
              <span className={badge}>{roleLabel}</span>
              <Link href="/aluno" aria-label="Voltar à área do estudante" className="rounded-full p-2 text-[#526057] hover:bg-white"><ArrowLeft size={18} /></Link>
            </div>
          </div>
          <AdminNav variant="pills" role={access.role} badges={badges} />
        </header>
        {/* A página não rola; só esta área. As páginas de lista enchem-na (AdminPage) e rolam apenas a lista. */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-8 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
