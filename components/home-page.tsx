'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
// Artigos reais do blog (últimos publicados), enviados por app/page.tsx. Sem artigos, a secção do blog não aparece.
export type HomePost = { slug: string; category: string; title: string; description: string }
// Universidades com exames públicos (enviadas por app/page.tsx): ligações diretas a /exames/<universidade>.
export type HomeInstitution = { slug: string; shortName: string; name: string; exams: number }
// Números reais da plataforma (de app/page.tsx). O que for 0 não aparece.
export type HomeStats = { questoes: number }

// Problema → promessa, par a par. Cada promessa leva ao sítio da plataforma que a cumpre.
const pares = [
  { problema: <>Decoras e <b>esqueces</b>.</>, promessa: <>Percebes a <b>lógica</b>.</>, href: '/jonas', rotulo: 'Falar com o Jonas' },
  { problema: <>Não sabes o que <b>vai sair</b>.</>, promessa: <>Vês o que <b>costuma sair</b>.</>, href: '/exames', rotulo: 'Ver exames' },
  { problema: <>Treinas <b>às cegas</b>.</>, promessa: <>Sabes a tua <b>nota</b>.</>, href: '/aluno/simulador', rotulo: 'Fazer um simulado' },
  { problema: <>Repetes o que <b>já sabes</b>.</>, promessa: <>Refazes só o que <b>erraste</b>.</>, href: '/aluno/simulador', rotulo: 'Revisar erros' },
]

const perguntas = [
  { q: 'Preciso de conta para ver os exames?', a: 'Não. Lês qualquer exame sem conta. Para descarregar o PDF e treinar no simulador, cria uma conta gratuita.' },
  { q: 'Quanto custa?', a: 'Criar conta é grátis. O plano Plus é opcional e está na página de planos.' },
  { q: 'Funciona no telemóvel?', a: 'Sim. Abre no navegador do telemóvel, sem instalar nada.' },
  { q: 'Como é calculada a nota?', a: 'De 0 a 20: 20 × pontos ganhos ÷ pontos possíveis. As questões mais difíceis valem mais.' },
]

export default function Page({ signedIn = false, posts = [], institutions = [], stats = { questoes: 0 } }: { signedIn?: boolean; posts?: HomePost[]; institutions?: HomeInstitution[]; stats?: HomeStats }) {
  const totalExames = institutions.reduce((sum, item) => sum + item.exams, 0)
  const numeros = [
    { n: totalExames, rotulo: 'exames' },
    { n: stats.questoes, rotulo: 'questões' },
    { n: institutions.length, rotulo: institutions.length === 1 ? 'universidade' : 'universidades' },
  ].filter((item) => item.n > 0)
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

      {/* APRESENTAÇÃO: o que é, numa frase, com a imagem em círculo e as três áreas à volta */}
      <section className="tw2-hero"><div className="tw-w">
        <div className="tw2-copy">
          <h1>Percebe. <em>Não decores.</em></h1>
          <p className="tw2-lead">Exames, simulador e explicador. Num só lugar.</p>
          <div className="tw-cta">
            <Link href={cta} className="tw-btn lg">{signedIn ? 'Ir para o painel' : 'Começar a estudar'}</Link>
            <Link href="/exames" className="tw-btn lg ol">Ver exames</Link>
          </div>
        </div>
        <div className="tw2-photo">
          <div className="tw2-img"><Image src="/images/estudantes-estudo.jpg" alt="Estudantes a estudar juntos" fill priority sizes="(min-width: 820px) 460px, 76vw" /></div>
          <Link href="/exames" className="tw2-pill p1">Exames</Link>
          <Link href="/aluno/simulador" className="tw2-pill p2">Simulador</Link>
          <Link href="/jonas" className="tw2-pill p3">Jonas</Link>
        </div>
      </div></section>

      {/* NÚMEROS REAIS: só aparecem se existirem */}
      {numeros.length > 0 && <section className="tw3-nums"><div className="tw-w">
        {numeros.map((item, n) => <div key={item.rotulo} className="tw-rv" style={{ ['--d' as string]: `${[0, 0.06, 0.1][n]}s` }}><b>{item.n}</b><span>{item.rotulo}</span></div>)}
      </div></section>}

      {/* PROBLEMAS */}
      <section className="tw2-dark"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Estudar assim não funciona.</h2>
        <ol className="tw2-list">
          {pares.map((p, n) => <li key={n} className="tw2-row tw-rv" style={{ ['--d' as string]: `${[0, 0.06, 0.1, 0.13][n]}s` }}><i>0{n + 1}</i><span>{p.problema}</span></li>)}
        </ol>
      </div></section>

      {/* PROMESSAS */}
      <section className="tw2-sun"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Com o Twisisa.</h2>
        <ol className="tw2-list">
          {pares.map((p, n) => <li key={n} className="tw2-row tw-rv" style={{ ['--d' as string]: `${[0, 0.06, 0.1, 0.13][n]}s` }}><i>0{n + 1}</i><span>{p.promessa}</span><Link href={p.href} className="tw-btn dk">{p.rotulo}</Link></li>)}
        </ol>
      </div></section>

      {/* POR DENTRO: a plataforma a funcionar */}
      <section className="tw3-in"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Vê por dentro.</h2>

        <div className="tw3-feat">
          <div className="tw3-txt tw-rv"><i>Exames</i><h3>Lê. Descarrega. Estuda.</h3><Link href="/exames" className="tw-btn">Ver exames</Link></div>
          <div className="tw3-mock tw-rv" style={{ ['--d' as string]: '.08s' }} aria-hidden="true">
            <div className="tw3-top"><span>UEM</span><span>UP</span><span>ISCTEM</span></div>
            <div className="tw3-li"><b>Matemática</b><em>2024</em><u>Ler</u></div>
            <div className="tw3-li"><b>Física</b><em>2023</em><u>Ler</u></div>
            <div className="tw3-li"><b>Química</b><em>2023</em><u>Ler</u></div>
            <div className="tw3-li"><b>Biologia</b><em>2022</em><u>Ler</u></div>
          </div>
        </div>

        <div className="tw3-feat rev">
          <div className="tw3-txt tw-rv"><i>Simulador</i><h3>Responde. Corrige. Evolui.</h3><Link href="/aluno/simulador" className="tw-btn">Fazer um simulado</Link></div>
          <div className="tw3-mock tw-rv" style={{ ['--d' as string]: '.08s' }} aria-hidden="true">
            <p className="tw3-q">Quanto vale x, se 2x + 6 = 14?</p>
            <div className="tw3-op">A · 2</div><div className="tw3-op ok">B · 4 ✓</div><div className="tw3-op">C · 6</div><div className="tw3-op">D · 8</div>
            <div className="tw3-nota"><span>A tua nota</span><b>16<small>/20</small></b></div>
          </div>
        </div>

        <div className="tw3-feat">
          <div className="tw3-txt tw-rv"><i>Jonas</i><h3>Pergunta. Percebe.</h3><Link href="/jonas" className="tw-btn">Falar com o Jonas</Link></div>
          <div className="tw3-mock tw-rv" style={{ ['--d' as string]: '.08s' }} aria-hidden="true">
            <div className="tw3-b me">Não percebo como resolver 2x + 6 = 14.</div>
            <div className="tw3-b ai"><strong>Jonas</strong>Passa o 6 para o outro lado: 2x = 8. Agora divide por 2: x = 4.</div>
            <div className="tw3-b me">Já percebi!</div>
          </div>
        </div>
      </div></section>

      {/* COMO FUNCIONA */}
      <section className="tw3-how"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Começar é rápido.</h2>
        <ol>
          <li className="tw-rv"><b>1</b><span>Cria a conta</span></li>
          <li className="tw-rv" style={{ ['--d' as string]: '.07s' }}><b>2</b><span>Escolhe o teu percurso</span></li>
          <li className="tw-rv" style={{ ['--d' as string]: '.12s' }}><b>3</b><span>Treina e vê a tua nota</span></li>
        </ol>
        <div className="tw-cta tw-rv"><Link href={cta} className="tw-btn lg">{signedIn ? 'Ir para o painel' : 'Criar conta grátis'}</Link></div>
      </div></section>

      {/* PERGUNTAS */}
      <section className="tw3-faq"><div className="tw-w">
        <h2 className="tw2-h tw-rv">Perguntas.</h2>
        <div className="tw-rv">{perguntas.map((p) => <details key={p.q}><summary>{p.q}<b aria-hidden="true">+</b></summary><p>{p.a}</p></details>)}</div>
      </div></section>

      {/* UNIVERSIDADES E BLOG: ligações reais; sem conteúdo a secção não aparece */}
      {(institutions.length > 0 || posts.length > 0) && <section className="tw-sec"><div className="tw-w">
        {institutions.length > 0 && <>
          <h2 className="tw-h2 tw-rv">Exames por universidade</h2>
          <div className="tw-chips tw-rv" style={{ justifyContent: 'center', marginTop: 28 }}>{institutions.map((i) => <Link key={i.slug} href={`/exames/${i.slug}`}>{i.shortName}</Link>)}</div>
        </>}
        {posts.length > 0 && <div className="tw2-blog tw-rv" style={{ marginTop: institutions.length > 0 ? 64 : 0 }}>
          <h2>Ler 3 minutos ajuda.</h2>
          {posts.map((a) => <Link href={`/blog/${a.slug}`} key={a.slug}><span>{a.title}</span><b aria-hidden="true">→</b></Link>)}
        </div>}
      </div></section>}

      {/* FECHO */}
      <section className="tw2-close"><div className="tw-w">
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
