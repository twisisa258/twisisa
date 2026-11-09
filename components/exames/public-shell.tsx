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
