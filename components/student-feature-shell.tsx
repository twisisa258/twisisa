import Link from 'next/link'
import { headers } from 'next/headers'
import { ArrowLeft, Bell, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StudentMenu } from '@/components/student-menu'
import { StudentSidebar } from '@/components/student-sidebar'
import { auth } from '@/lib/auth'
import { Brand } from '@/components/brand'
import { SignOutButton } from '@/components/sign-out-button'

// Estrutura comum das páginas do estudante (menu, cabeçalho, botão de voltar).
// `backHref`/`backLabel`: para onde volta o botão (por omissão, a visão geral).
// `hideTitle`: a página desenha o seu próprio cabeçalho (ex.: Biblioteca).
export async function StudentFeatureShell({
  firstName,
  eyebrow,
  title,
  description,
  icon: Icon,
  tone = 'marca',
  children,
  hideBackLink = false,
  hideTitle = false,
  backHref = '/aluno',
  backLabel = 'Voltar à visão geral',
}: {
  firstName: string
  eyebrow: string
  title: string
  description?: string
  /** Ícone no cabeçalho da página, num quadrado com a cor da área. Se faltar, o título aparece sozinho. */
  icon?: LucideIcon
  tone?: 'marca' | 'conquista' | 'ajuda' | 'assistente' | 'aviso'
  children: React.ReactNode
  hideBackLink?: boolean
  hideTitle?: boolean
  backHref?: string
  backLabel?: string
}) {
  // A foto vem da sessão: assim todas as páginas do estudante mostram-na sem cada uma a ter de a passar.
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  const image = session?.user.image ?? null
  return (
    <main className="min-h-screen overflow-x-clip bg-fundo text-texto">
      <div className="flex min-h-screen">
        <StudentSidebar firstName={firstName} image={image} />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-[#eceee7] bg-fundo/95 px-5 py-3 backdrop-blur sm:px-8">
            <div className="mx-auto flex min-h-10 max-w-[1050px] items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <StudentMenu firstName={firstName} image={image} />
                <span className="lg:hidden"><Brand href="/aluno" /></span>
                <div className="hidden min-w-0 lg:block"><p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-marca">{eyebrow}</p></div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href="/aluno/notificacoes" aria-label="Notificações" className="flex size-10 items-center justify-center rounded-full text-texto-2 transition-colors hover:bg-[#eef0e9] hover:text-marca"><Bell /></Link>
                <SignOutButton />
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-[1050px] px-5 py-6 sm:px-8 sm:py-10">
            {!hideBackLink && <Link href={backHref} className="inline-flex items-center gap-2 text-xs font-semibold text-texto-2 hover:text-marca lg:hidden"><ArrowLeft />{backLabel}</Link>}
            {!hideTitle && (
              <div className={cn('mt-3 flex max-w-2xl items-center gap-3.5', `tom-${tone}`)}>
                {Icon && <span className="ic-tom ic-tom-lg"><Icon size={24} aria-hidden="true" /></span>}
                <div className="min-w-0">
                  <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">{title}</h1>
                  {description && <p className="mt-1 text-[14px] leading-5 text-texto-2">{description}</p>}
                </div>
              </div>
            )}
            <div className={hideTitle && hideBackLink ? '' : 'mt-5'}>{children}</div>
          </div>
        </div>
      </div>
    </main>
  )
}
