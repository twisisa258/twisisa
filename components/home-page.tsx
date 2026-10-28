'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { articles } from '@/lib/blog'

// Separadores "Por dentro": conteúdo real da plataforma (Biblioteca, Simulador, Jonas, Comunidade, Blog).
const tabs = [
  {
    key: 'Biblioteca', href: '/biblioteca', title: 'Biblioteca',
    text: 'Livros, exames e guias de estudos num só lugar, organizados por categoria e filtrados pelo teu percurso.',
    items: ['Pesquisa por título e disciplina', 'Pré-visualização antes de abrir', 'Descarrega os materiais que precisas', 'Guarda os favoritos para voltar depois'],
  },
  {
    key: 'Simulador', href: '/aluno/simulador', title: 'Simulador',
    text: 'Pratica no teu ritmo, com correção e histórico, e volta ao que errou até perceber.',
    items: ['Prática: uma questão de cada vez, com correção imediata', 'Modo rápido: 10 questões, 30 segundos cada', 'Revisar erros: refaz o que erraste', 'Histórico dos teus resultados'],
  },
  {
    key: 'Jonas', href: '/jonas', title: 'Jonas, o explicador (IA)',
    text: 'Um explicador académico que responde em português claro, passo a passo, e explica o porquê de cada passo.',
    items: ['Pede uma explicação, um exemplo ou ajuda a organizar o estudo', 'Reconhece quando não tem certeza', 'Não inventa fontes', 'Não substitui professores nem fontes oficiais'],
  },
  {
    key: 'Comunidade', href: '/comunidade', title: 'Comunidade',
    text: 'Aprender em conjunto: partilha o que aprendeste e acompanha outros estudantes.',
    items: ['Publica o que queres partilhar', 'Segue outros estudantes', 'Tira dúvidas e troca ideias'],
  },
  {
    key: 'Blog', href: '/blog', title: 'Blog',
    text: 'Guias de estudo, dicas para exames e novidades úteis para estudantes moçambicanos.',
    items: ['Método de estudo', 'Revisão por disciplina', 'Preparação da candidatura à universidade'],
  },
] as const

const words = ['regra', 'fórmula', 'passo 1', 'exceção', 'passo 2', 'definição', 'truque', 'data']

function Visual({ k }: { k: string }) {
  if (k === 'Biblioteca') return <>{['Livros', 'Exames', 'Guias de estudos'].map((n) => <div className="tw-row" key={n}><b />{n}<small>Ver · Baixar</small></div>)}</>
  if (k === 'Simulador') return <>
    <div className="tw-ring"><span>30s</span></div>
    <div className="tw-dots">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < 6 ? 'f' : ''} />)}</div>
    <div className="tw-row" style={{ justifyContent: 'center' }}>Modo rápido · 10 questões</div></>
  if (k === 'Jonas') return <>
    <div className="tw-bub tw-me">Porque dividimos os dois lados?</div>
    <div className="tw-bub tw-jo">Para manter a balança equilibrada: o que fazes de um lado, fazes do outro.</div>
    <div className="tw-bub tw-me">Agora percebi!</div></>
  if (k === 'Comunidade') return <>
    <div className="tw-row" style={{ color: '#5d6b64', fontWeight: 500 }}>O que queres partilhar?</div>
    <div className="tw-row"><b />Estudante<small style={{ color: '#14704a', fontWeight: 700 }}>Seguir</small></div>
    <div className="tw-row"><b />Estudante<small style={{ color: '#14704a', fontWeight: 700 }}>Seguir</small></div></>
  return <>{articles.slice(0, 3).map((a) => <div className="tw-row" key={a.slug}><b />{a.title}</div>)}</>
}

export default function Page({ signedIn = false }: { signedIn?: boolean }) {
  const [menu, setMenu] = useState(false)
  const [tab, setTab] = useState(0)
  const [divided, setDivided] = useState(false)
  const cta = signedIn ? '/aluno' : '/sign-up'
  const t = tabs[tab]

  // Animação fade-in-up: o observer junta .tw-in quando o elemento entra no ecrã; o CSS faz a transição.
  useEffect(() => {
    const els = document.querySelectorAll('.tw-rv')
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('tw-in')); return }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('tw-in'); io.unobserve(e.target) } }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' })
    els.forEach((e) => io.observe(e))
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
            <Link href="/biblioteca">Biblioteca</Link><Link href="/aluno/simulador">Simulador</Link>
            <Link href="/comunidade">Comunidade</Link><Link href="/jonas">Jonas</Link><Link href="/blog">Blog</Link>
          </nav>
          <div className="flex items-center gap-2">
            {!signedIn && <Link href="/sign-in" className="hidden px-3 text-sm font-semibold text-[#5d6b64] md:block">Entrar</Link>}
            <Link href={cta} className="tw-btn" style={{ padding: '9px 18px', fontSize: '.85rem' }}>{signedIn ? 'Painel' : 'Criar conta'}</Link>
            <button className="tw-menu p-2" onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu}>{menu ? '✕' : '☰'}</button>
          </div>
        </div>
        {menu && <nav className="tw-mob tw-menu" aria-label="Menu móvel" onClick={() => setMenu(false)}>
          <Link href="/biblioteca">Biblioteca</Link><Link href="/aluno/simulador">Simulador</Link><Link href="/comunidade">Comunidade</Link>
          <Link href="/jonas">Jonas</Link><Link href="/blog">Blog</Link><Link href="/planos">Planos</Link>{!signedIn && <Link href="/sign-in">Entrar</Link>}
        </nav>}
      </header>

      {/* HERO: decorar desaparece, perceber fica */}
      <section className="tw-hero"><div className="tw-w">
        <h1 className="tw-rv">Percebe. <em>Não decores.</em></h1>
        <p className="tw-sub tw-rv" style={{ ['--d' as string]: '.08s' }}>A plataforma de estudos para estudantes moçambicanos: compreende a lógica de cada matéria, pratica e prepara-te ao teu ritmo.</p>
        <div className="tw-cta tw-rv" style={{ ['--d' as string]: '.16s' }}>
          <Link href={cta} className="tw-btn lg">{signedIn ? 'Ir para o painel' : 'Começar a estudar'}</Link>
          <a href="#metodo" className="tw-btn lg ol">Ver como funciona</a>
        </div>
        <div className="tw-duel">
          <div className="tw-pn tw-rv"><h3>Decorar</h3><p>Muito esforço, pouco que fica.</p>
            <div className="tw-words">{words.map((w, i) => <span key={w} style={{ ['--i' as string]: i }}>{w}</span>)}</div></div>
          <div className="tw-pn ok tw-rv" style={{ ['--d' as string]: '.12s' }}><h3>Perceber</h3><p>Cada ideia liga-se à seguinte.</p>
            <svg viewBox="0 0 300 130" aria-hidden="true">
              <line x1="50" y1="65" x2="150" y2="28" /><line x1="50" y1="65" x2="150" y2="102" /><line x1="150" y1="28" x2="250" y2="65" /><line x1="150" y1="102" x2="250" y2="65" />
              <circle style={{ ['--i' as string]: 0 }} cx="50" cy="65" r="10" /><circle style={{ ['--i' as string]: 1 }} cx="150" cy="28" r="10" /><circle style={{ ['--i' as string]: 2 }} cx="150" cy="102" r="10" /><circle style={{ ['--i' as string]: 3 }} cx="250" cy="65" r="14" />
              <text x="30" y="92">porquê</text><text x="224" y="98">resposta</text></svg></div>
        </div>
      </div></section>

      {/* COMO FUNCIONA */}
      <section className="tw-sec" id="metodo" style={{ paddingTop: 0 }}><div className="tw-w">
        <span className="tw-tag tw-rv">Como funciona</span>
        <h2 className="tw-h2 tw-rv">Três passos, ao teu ritmo.</h2>
        <div className="tw-steps" style={{ marginTop: 40 }}>
          <div className="tw-card tw-step tw-rv"><b>01</b><h3 style={{ marginTop: 8 }}>Escolhe o percurso</h3><p>Diz o que estás a preparar. Podes mudar quando quiseres e o teu histórico mantém-se.</p>
            <div className="tw-chips"><span>10ª classe</span><span>12ª classe</span><span>Admissão</span></div></div>
          <div className="tw-card tw-step tw-rv" style={{ ['--d' as string]: '.1s' }}><b>02</b><h3 style={{ marginTop: 8 }}>Estuda e pratica</h3><p>Lê na Biblioteca, tira dúvidas com o Jonas e testa o que sabes no Simulador.</p>
            <div className="tw-chips"><span>Biblioteca</span><span>Jonas</span><span>Simulador</span></div></div>
          <div className="tw-card tw-step tw-rv" style={{ ['--d' as string]: '.2s' }}><b>03</b><h3 style={{ marginTop: 8 }}>Revê e evolui</h3><p>Refaz os erros, acompanha o histórico e estuda em conjunto com a comunidade.</p>
            <div className="tw-chips"><span>Revisar erros</span><span>Histórico</span><span>Comunidade</span></div></div>
        </div>
      </div></section>

      {/* BLOG: artigos reais */}
      <section className="tw-sec" style={{ paddingTop: 0 }}><div className="tw-w">
        <span className="tw-tag tw-rv">Blog</span>
        <h2 className="tw-h2 tw-rv">Ler 3 minutos ajuda.</h2>
        <div className="tw-art">{articles.map((a, n) => <Link href={`/blog/${a.slug}`} key={a.slug} className="tw-rv" style={{ ['--d' as string]: `${n * 0.1}s` }}><small>{a.category}</small><h3>{a.title}</h3><p>{a.description}</p></Link>)}</div>
      </div></section>

      {/* PLANO */}
      <section className="tw-sec" style={{ paddingTop: 0 }}><div className="tw-w">
        <span className="tw-tag tw-rv">Twisisa Plus</span>
        <h2 className="tw-h2 tw-rv">Mais foco para cada etapa.</h2>
        <p className="tw-sub tw-rv">Desbloqueia ferramentas para praticar melhor e acompanha a tua evolução.</p>
        <div className="tw-plan tw-rv">
          <strong>Plano mensal</strong>
          <div className="pr">$9.99 <small>/ mês</small></div>
          <ul><li>Simulados premium</li><li>Desafios</li><li>Materiais avançados</li><li>Cancela quando quiseres</li></ul>
          <Link href="/planos" className="tw-btn">Ver o plano</Link>
          <p className="fn">Pagamento processado com segurança pela Stripe.</p>
        </div>
      </div></section>

      {/* FECHO */}
      <section className="tw-close"><div className="tw-w">
        <h2 className="tw-rv">Começa a perceber.</h2>
        <p className="tw-rv">Cria a tua conta e escolhe o teu percurso. O resto vem passo a passo.</p>
        <div className="tw-cta tw-rv"><Link href={cta} className="tw-btn lg wh">{signedIn ? 'Ir para o painel' : 'Criar conta'}</Link></div>
      </div></section>

      <footer className="tw-foot"><div className="tw-w">
        <div className="tw-ft">
          <div><Link href="/" className="tw-brand"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-6 w-auto" />Twisisa</Link>
            <p style={{ marginTop: 12, maxWidth: 260, lineHeight: 1.6 }}>Percebe a matéria. Não decores. Feita em Moçambique.</p></div>
          <div><h4>Explorar</h4><Link href="/biblioteca">Biblioteca</Link><Link href="/aluno/simulador">Simulador</Link><Link href="/blog">Blog</Link></div>
          <div><h4>Plataforma</h4><Link href="/jonas">Jonas</Link><Link href="/comunidade">Comunidade</Link><Link href="/planos">Planos</Link><Link href={cta}>{signedIn ? 'Painel' : 'Criar conta'}</Link></div>
          <div><h4>Legal</h4><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link></div>
        </div>
        <div className="tw-bot"><span>© {new Date().getFullYear()} Twisisa</span><span>Feito em Moçambique</span></div>
      </div></footer>
    </main>
  )
}
