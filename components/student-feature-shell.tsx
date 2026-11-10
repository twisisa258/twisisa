import Link from 'next/link'
import { headers } from 'next/headers'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AlunoAside } from '@/components/shell/aluno-aside'
import { AppHeader } from '@/components/shell/app-header'
import { auth } from '@/lib/auth'
import { hasPlus } from '@/lib/subscription'

// Estrutura comum das páginas do estudante: menu lateral, cabeçalho fixo e botão de voltar.
// `backHref`/`backLabel`: para onde volta o botão (por omissão, a visão geral).
// `hideTitle`: a página desenha o seu próprio cabeçalho (ex.: Ranking).
export async function StudentFeatureShell({
  firstName,
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
  /** Já não aparece no cabeçalho (o cabeçalho é mínimo); fica aceite para as páginas não mudarem. */
  eyebrow?: string
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
  const plus = session ? await hasPlus(session.user.id) : false
  return (
    <div className="sh-app">
      <a href="#conteudo" className="sh-skip">Saltar para o conteúdo</a>
      <AlunoAside firstName={firstName} image={image} plus={plus} />
      <div className="sh-main min-w-0 overflow-x-clip">
        <AppHeader aluno={{ firstName, image, plus }} />
        <main id="conteudo" className="mx-auto max-w-[1050px] px-5 py-6 text-texto sm:px-8 sm:py-10">
          {!hideBackLink && <Link href={backHref} className="inline-flex items-center gap-2 text-xs font-semibold text-texto-2 hover:text-marca min-[900px]:hidden"><ArrowLeft />{backLabel}</Link>}
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
        </main>
      </div>
    </div>
  )
}
