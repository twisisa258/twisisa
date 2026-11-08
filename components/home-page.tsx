'use client'

import { PLANO } from '@/lib/plano'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
// Artigos reais do blog (últimos publicados), enviados por app/page.tsx. Sem artigos, a secção do blog não aparece.
export type HomePost = { slug: string; category: string; title: string; description: string }
// Universidades com exames públicos (enviadas por app/page.tsx): ligações diretas a /exames/<universidade>.
export type HomeInstitution = { slug: string; shortName: string; name: string; exams: number }

const words = ['regra', 'fórmula', 'passo 1', 'exceção', 'passo 2', 'definição', 'truque', 'data']

export default function Page({ signedIn = false, posts = [], institutions = [] }: { signedIn?: boolean; posts?: HomePost[]; institutions?: HomeInstitution[] }) {
  const [menu, setMenu] = useState(false)
  const cta = signedIn ? '/aluno' : '/sign-up'

  // Entrada ao fazer scroll. O servidor envia tudo visível; só depois de carregar é que o que está abaixo do ecrã
  // fica escondido (.tw-js) e aparece uma vez (.tw-in). O que já está visível ao abrir não anima.
  useEffect(() => {
    const root = document.querySelector('.tw')
    const els = Array.from(document.querySelectorAll('.tw-rv'))
    if (!root || !('IntersectionObserver' in window)) return
    const rest = els.filter((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) { el.classList.add('tw-in'); return false }
      return true
    })
    root.classList.add('tw-js')
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('tw-in'); io.unobserve(entry.target) } }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' })
    rest.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <main className="tw min-h-screen" id="inicio">
      <header className="tw-head">
        <div className="tw-w tw-bar">
          <Link href="/" className="tw-brand" aria-label="Twisisa, início">
            <Image src="/images/twisisa-mark.png" alt="" width={44} height={24} priority className="h-6 w-auto" />Twisisa
          </Link>
          <nav className="tw-nav" aria-label="Navegação principal">
            <Link href="/exames">Exames</Link><Link href="/aluno/simulador">Simulador</Link>
            <Link href="/jonas">Jonas</Link><Link href="/blog">Blog</Link>
          </nav>
          <div className="flex items-center gap-2">
            {!signedIn && <span className="hidden md:block"><Link href="/sign-in" className="tw-btn ol sm">Entrar</Link></span>}
            <Link href={cta} className="tw-btn sm">{signedIn ? 'Painel' : 'Criar conta'}</Link>
            <button className="tw-menu tw-burger" onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu}>{menu ? '✕' : '☰'}</button>
          </div>
        </div>
        {menu && <nav className="tw-mob tw-menu" aria-label="Menu móvel" onClick={() => setMenu(false)}>
          <Link href="/exames">Exames</Link><Link href="/aluno/simulador">Simulador</Link>
          <Link href="/jonas">Jonas</Link><Link href="/blog">Blog</Link><Link href="/planos">Planos</Link>{!signedIn && <Link href="/sign-in">Entrar</Link>}
        </nav>}
      </header>

      {/* HERO: decorar desaparece, perceber fica */}
      <section className="tw-hero"><div className="tw-w">
        <h1>Percebe. <em>Não decores.</em></h1>
        <div className="tw-cta">
          <Link href={cta} className="tw-btn lg">{signedIn ? 'Ir para o painel' : 'Começar a estudar'}</Link>
          <a href="#metodo" className="tw-btn lg ol">Ver como funciona</a>
        </div>
        <div className="tw-duel">
          <div className="tw-pn tw-rv"><h3>Decorar</h3>
            <div className="tw-words">{words.map((w, i) => <span key={w} style={{ ['--i' as string]: i }}>{w}</span>)}</div></div>
          <div className="tw-pn ok tw-rv" style={{ ['--d' as string]: '.1s' }}><h3>Perceber</h3>
            <svg viewBox="0 0 300 130" aria-hidden="true">
              <line x1="50" y1="65" x2="150" y2="28" /><line x1="50" y1="65" x2="150" y2="102" /><line x1="150" y1="28" x2="250" y2="65" /><line x1="150" y1="102" x2="250" y2="65" />
              <circle style={{ ['--i' as string]: 0 }} cx="50" cy="65" r="10" /><circle style={{ ['--i' as string]: 1 }} cx="150" cy="28" r="10" /><circle style={{ ['--i' as string]: 2 }} cx="150" cy="102" r="10" /><circle style={{ ['--i' as string]: 3 }} cx="250" cy="65" r="14" />
              <text x="30" y="92">porquê</text><text x="224" y="98">resposta</text></svg></div>
        </div>
      </div></section>

      {/* COMO FUNCIONA: cada passo leva ao sítio certo */}
      <section className="tw-sec" id="metodo" style={{ paddingTop: 0 }}><div className="tw-w">
        <h2 className="tw-h2 tw-rv">Três passos.</h2>
        <div className="tw-steps">
          <div className="tw-card tw-step tw-rv"><b>01</b><h3>Escolhe o percurso</h3>
            <div className="tw-chips"><Link href={cta}>10ª classe</Link><Link href={cta}>12ª classe</Link><Link href={cta}>Admissão</Link></div></div>
          <div className="tw-card tw-step tw-rv" style={{ ['--d' as string]: '.07s' }}><b>02</b><h3>Estuda e pratica</h3>
            <div className="tw-chips"><Link href="/exames">Exames</Link><Link href="/jonas">Jonas</Link><Link href="/aluno/simulador">Simulador</Link></div></div>
          <div className="tw-card tw-step tw-rv" style={{ ['--d' as string]: '.12s' }}><b>03</b><h3>Revê e evolui</h3>
            <div className="tw-chips"><Link href="/aluno/simulador">Revisar erros</Link><Link href="/aluno/simulador/historico">Histórico</Link></div></div>
        </div>
      </div></section>

      {/* EXAMES: uma ligação por universidade com conteúdo; sem nenhuma a secção não aparece */}
      {institutions.length > 0 && <section className="tw-sec" style={{ paddingTop: 0 }}><div className="tw-w">
        <h2 className="tw-h2 tw-rv">Exames por universidade</h2>
        <div className="tw-chips tw-rv" style={{ justifyContent: 'center', marginTop: 28 }}>{institutions.map((i) => <Link key={i.slug} href={`/exames/${i.slug}`}>{i.shortName}</Link>)}</div>
      </div></section>}

      {/* BLOG: artigos reais da base de dados; sem artigos publicados a secção não aparece */}
      {posts.length > 0 && <section className="tw-sec" style={{ paddingTop: 0 }}><div className="tw-w">
        <h2 className="tw-h2 tw-rv">Ler 3 minutos ajuda.</h2>
        <div className="tw-art">{posts.map((a, n) => <Link href={`/blog/${a.slug}`} key={a.slug} className="tw-rv" style={{ ['--d' as string]: `${[0, 0.07, 0.12][n] ?? 0.12}s` }}><small>{a.category}</small><h3>{a.title}</h3></Link>)}</div>
      </div></section>}

      {/* PLANO */}
      <section className="tw-sec" style={{ paddingTop: 0 }}><div className="tw-w">
        <h2 className="tw-h2 tw-rv">Twisisa Plus</h2>
        <div className="tw-plan tw-rv">
          <div className="pr">{PLANO.precoMt} MT <small>/ mês</small></div>
          <ul><li>Simulados premium</li><li>Desafios</li><li>Materiais avançados</li></ul>
          <Link href="/planos" className="tw-btn">Ver o plano</Link>
        </div>
      </div></section>

      {/* FECHO */}
      <section className="tw-close"><div className="tw-w">
        <h2 className="tw-rv">Começa a perceber.</h2>
        <div className="tw-cta tw-rv" style={{ ['--d' as string]: '.08s' }}><Link href={cta} className="tw-btn lg wh">{signedIn ? 'Ir para o painel' : 'Criar conta'}</Link></div>
      </div></section>

      <footer className="tw-foot"><div className="tw-w">
        <div className="tw-ft">
          <div><Link href="/" className="tw-brand"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-6 w-auto" />Twisisa</Link></div>
          <div><h4>Explorar</h4><Link href="/exames">Exames</Link><Link href="/aluno/simulador">Simulador</Link><Link href="/blog">Blog</Link></div>
          <div><h4>Plataforma</h4><Link href="/jonas">Jonas</Link><Link href="/planos">Planos</Link><Link href={cta}>{signedIn ? 'Painel' : 'Criar conta'}</Link></div>
          <div><h4>Legal</h4><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link></div>
        </div>
        <div className="tw-bot"><span>© {new Date().getFullYear()} Twisisa</span><span>Feito em Moçambique</span></div>
      </div></footer>
    </main>
  )
}
