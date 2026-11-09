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
