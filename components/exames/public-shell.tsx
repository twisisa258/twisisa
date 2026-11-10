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
