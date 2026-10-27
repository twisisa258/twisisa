import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { pageMetadata } from '@/lib/seo'
import { getStaffAccess } from '@/lib/staff'
import { Brand } from '@/components/brand'
import { SignOutButton } from '@/components/sign-out-button'
import { AdminNav } from '@/components/admin/admin-nav'

export const metadata: Metadata = pageMetadata({
  title: 'Administração | Twisisa',
  description: 'Gestão de conteúdos do Twisisa.',
  path: '/admin',
  index: false,
})

const badge = 'rounded-full bg-[#e6f0e9] px-2.5 py-1 text-[11px] font-semibold text-[#1d4d41]'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const access = await getStaffAccess()
  // Sem sessão, /aluno reencaminha para o início de sessão; sem permissão, fica na área do estudante.
  if (!access) redirect('/aluno')
  const admin = access.user
  const home = access.role === 'admin' ? '/admin' : '/admin/questoes'
  const roleLabel = access.role === 'admin' ? 'Administração' : 'Revisão'
  const firstName = admin.name.split(' ')[0]

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f8f8f5] text-[#202321] lg:flex-row">
      <aside className="hidden w-[252px] shrink-0 flex-col border-r border-[#e3e5dc] bg-[#f3f4ef] px-4 py-5 lg:flex lg:h-full">
        <div className="flex items-center justify-between gap-2 px-3">
          <Brand href={home} />
        </div>
        <span className={`${badge} mx-3 mt-4 w-fit`}>{roleLabel}</span>
        <AdminNav variant="sidebar" role={access.role} />
        <div className="mt-auto border-t border-[#dfe2d9] pt-4">
          <Link href="/aluno" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-[#68716a] hover:bg-white hover:text-[#1d4d41]"><ArrowLeft size={16} /> Área do estudante</Link>
          <div className="mt-3 flex items-center justify-between gap-2 px-3">
            <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#d8e4dc] text-[#1d4d41]">{firstName.slice(0, 1)}</span>
              <span className="truncate">{firstName}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-30 shrink-0 border-b border-[#e3e5dc] bg-[#f8f8f5]/95 px-5 pt-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 pb-3">
            <Brand href={home} />
            <div className="flex items-center gap-2">
              <span className={badge}>{roleLabel}</span>
              <Link href="/aluno" aria-label="Voltar à área do estudante" className="rounded-full p-2 text-[#526057] hover:bg-white"><ArrowLeft size={18} /></Link>
            </div>
          </div>
          <AdminNav variant="pills" role={access.role} />
        </header>
        {/* A página não rola; só esta área. As páginas de lista enchem-na (AdminPage) e rolam apenas a lista. */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-8 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
