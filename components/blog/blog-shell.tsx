import { SiteFrame } from '@/components/site/site-frame'

// Moldura pública do blog: a mesma dos exames e do simulado (cabeçalho fixo com a navegação principal e o modo claro/escuro, e rodapé com as universidades).
// Sem sessão no servidor: o botão «Entrar»/«Painel» resolve-se no navegador, por isso os artigos podem ser páginas estáticas.
// Cada página do blog desenha o seu próprio <main id="conteudo">.
export function BlogShell({ children }: { children: React.ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>
}
