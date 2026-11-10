'use client'

// [twisisa-inicio-exemplar] Página inicial: exemplar aprovado, ligado às rotas e aos números reais da plataforma.
import Image from 'next/image'
import Link from 'next/link'
import { useState, type ChangeEvent } from 'react'
import { ThemeToggle } from '@/components/site/theme-toggle'
import './home-page.css'

// Os tipos continuam exportados: app/page.tsx envia estes dados.
export type HomePost = { slug: string; category: string; title: string; description: string }
export type HomeInstitution = { slug: string; shortName: string; name: string; exams: number }
export type HomeStats = { questoes: number }

// Aplica o modo guardado antes de a página aparecer (o mesmo das páginas de exames).
const THEME_SCRIPT = "try{var t=localStorage.getItem('tw-tema');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}"
// Letra manuscrita (Caveat) e o peso 800 do Manrope, só para a página inicial.
const FONTES = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Manrope:wght@800&display=swap'

const TEMAS = ['Funções', 'Limites', 'Derivadas', 'Trigon.', 'Probab.']
const ATUAL = [0.82, 0.4, 0.7, 0.62, 0.76]
const ANTES = [0.6, 0.38, 0.55, 0.5, 0.6]

const milhares = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')

function Radar({ a, b, w }: { a: number[]; b: number[]; w: number }) {
  const c = w / 2
  const r = c - 30
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / 5
  const P = (v: number[]) => v.map((x, i) => `${(c + r * x * Math.cos(ang(i))).toFixed(1)},${(c + r * x * Math.sin(ang(i))).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${w}`} overflow="visible" role="img" aria-label="Mapa de temas">
      {[0.33, 0.66, 1].map((k) => <polygon key={k} points={P([k, k, k, k, k])} fill="none" stroke="var(--ln)" />)}
      {TEMAS.map((l, i) => {
        const t = ang(i)
        const x = c + (r + 14) * Math.cos(t)
        const y = c + (r + 12) * Math.sin(t) + 3
        return <text key={l} x={x.toFixed(0)} y={y.toFixed(0)} textAnchor={Math.abs(Math.cos(t)) < 0.3 ? 'middle' : Math.cos(t) > 0 ? 'start' : 'end'} fontSize="10" fill="var(--mu)">{l}</text>
      })}
      <polygon points={P(b)} fill="none" stroke="var(--mu)" strokeDasharray="4 3" />
      <polygon points={P(a)} fill="var(--gs)" fillOpacity=".8" stroke="var(--g)" strokeWidth="2" />
    </svg>
  )
}

function Acumulado({ dias, minutos }: { dias: number; minutos: number }) {
  const W = 280
  const H = 120
  const passo = Math.max(1, Math.floor(dias / 40))
  const dia: number[] = []
  for (let i = 0; i <= dias; i += passo) dia.push(i)
  if (dia[dia.length - 1] !== dias) dia.push(dias)
  const max = (120 * 120) / 3
  const P = dia.map((i) => `${(8 + ((W - 16) * i) / dias).toFixed(1)},${(H - 14 - ((H - 30) * ((i * minutos) / 3)) / max).toFixed(1)}`)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Questões acumuladas por dia">
      <polygon points={`${P.join(' ')} ${W - 8},${H - 14} 8,${H - 14}`} fill="var(--gs)" />
      <polyline points={P.join(' ')} fill="none" stroke="var(--g)" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="8" y1={H - 14} x2={W - 8} y2={H - 14} stroke="var(--ln)" />
      <text x="8" y={H - 2} fontSize="10" fill="var(--mu)">hoje</text>
      <text x={W - 8} y={H - 2} textAnchor="end" fontSize="10" fill="var(--mu)">exame</text>
    </svg>
  )
}

export default function Page({ signedIn = false, institutions = [], stats = { questoes: 0 } }: { signedIn?: boolean; posts?: HomePost[]; institutions?: HomeInstitution[]; stats?: HomeStats }) {
  const cta = signedIn ? '/aluno' : '/sign-up'
  const [dias, setDias] = useState(47)
  const [minutos, setMinutos] = useState(30)
  const questoes = Math.round((dias * minutos) / 3)
  // Exames por universidade: números reais, as quatro com mais exames.
  const barras = institutions.filter((i) => i.exams > 0).sort((a, b) => b.exams - a.exams).slice(0, 4)
  const maior = Math.max(1, ...barras.map((i) => i.exams))

  return (
    <div className="tx" id="inicio">
      <link rel="stylesheet" href={FONTES} />
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <header className="hd"><div className="bar">
        <Link href="/" className="brand" aria-label="Twisisa, início">
          <Image src="/images/twisisa-mark.png" alt="" width={44} height={24} priority className="h-6 w-auto" />Twisisa
        </Link>
        <nav className="nav" aria-label="Navegação principal">
          <Link href="/exames">Exames</Link><Link href="/simulado">Simulador</Link><Link href="/jonas">Jonas</Link><Link href="/blog">Blog</Link>
        </nav>
        <span className="sp" />
        <ThemeToggle />
        <Link className="btn sm" href={cta}>{signedIn ? 'Painel' : 'Criar conta'}</Link>
      </div></header>

      <main>
        <section className="w hero">
          <div>
            <span className="hand">para quem estuda sozinho</span>
            <h1>Estudar sozinho não devia ser adivinhar.</h1>
            <p className="l">Tudo o que precisas para transformar dúvidas em conhecimento e conhecimento em conquistas.</p>
            <div className="cta">
              <Link className="btn" href={cta}>{signedIn ? 'Ir ao painel' : 'Criar conta grátis'}</Link>
              <Link className="btn ol" href="/exames">Ver exames sem conta</Link>
            </div>
            <p className="micro">Não deixes para depois. Começa hoje gratuitamente.</p>
          </div>
          <div className="ph" aria-hidden="true">
            <div className="note hand">o teu tema mais fraco
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 4c9 0 16 5 18 17M21 21l-6-3M21 21l1-7" /></svg>
            </div>
            <span className="eb">Hoje</span>
            <h3>Resolve 5 questões sobre Limites</h3>
            <div><Radar a={ATUAL} b={ANTES} w={260} /></div>
            <div className="go"><span>Sequência</span><b>6 dias</b></div>
            <div className="go"><span>Nota estimada</span><b>13,1 / 20</b></div>
          </div>
        </section>

        <section className="w" id="dia">
          <span className="hand">sem rodeios</span>
          <h2>Reconheces isto?</h2>
          <p className="lead">Cinco coisas que se repetem a quem prepara um exame. E o que a Twisisa faz em cada uma.</p>
          <div className="rows">
            <div className="row">
              <p className="no">Procuras o exame antigo. Está num grupo, num PDF que não abre.</p>
              <div className="yes">Todos num só sítio, por universidade, disciplina e ano.<Link href="/exames">Ver exames →</Link></div>
              <div className="viz">
                <span className="chip">grupo_12.pdf</span><span className="chip">foto(3)</span><span className="chip">exame final</span>
                <svg width="100%" height="14" viewBox="0 0 100 14"><path d="M50 1v9m0 0-4-4m4 4 4-4" fill="none" stroke="var(--am)" strokeWidth="1.6" strokeLinecap="round" /></svg>
                <span className="chip on">UEM · 2023 · Matemática</span>
              </div>
            </div>
            <div className="row">
              <p className="no">Treinas, mas não sabes que nota terias.</p>
              <div className="yes">Descobre até onde podes chegar.<Link href="/aluno/simulador">Fazer um simulado →</Link></div>
              <div className="viz">
                <svg viewBox="0 0 220 70"><line x1="6" y1="22" x2="214" y2="22" stroke="var(--am)" strokeDasharray="4 3" /><polyline points="10,58 45,52 80,54 115,42 150,36 185,38 210,26" fill="none" stroke="var(--g)" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="210" cy="26" r="4.5" fill="var(--g)" /><text x="214" y="15" textAnchor="end" fontSize="9" fill="var(--mu)">nota de corte</text></svg>
                <p className="tag">Ilustração</p>
              </div>
            </div>
            <div className="row">
              <p className="no">Ficas preso numa dúvida às 22h e ninguém responde.</p>
              <div className="yes">O Jonas explica passo a passo, a qualquer hora.<Link href="/jonas">Falar com o Jonas →</Link></div>
              <div className="viz">
                <div className="bub u">Porque é que x ≥ 2?</div>
                <div className="bub j">O que está dentro da raiz não pode ser negativo. Vamos ver passo a passo.</div>
              </div>
            </div>
            <div className="row">
              <p className="no">Repetes o que já sabes e falhas o que não treinaste.</p>
              <div className="yes">Refazes só o que erraste, até dominares.<Link href="/aluno/simulador">Rever os meus erros →</Link></div>
              <div className="viz">
                <svg viewBox="0 0 220 70">
                  {([['Limites', 0.9], ['Derivadas', 0.55], ['Funções', 0.25]] as const).map(([nome, v], i) => (
                    <g key={nome}>
                      <text x="0" y={14 + i * 24} fontSize="10" fill="var(--mu)">{nome}</text>
                      <rect x="64" y={5 + i * 24} width="150" height="11" rx="3" fill="var(--gs)" />
                      <rect x="64" y={5 + i * 24} width={150 * v} height="11" rx="3" fill={i ? 'var(--g)' : 'var(--am)'} />
                    </g>
                  ))}
                </svg>
                <p className="tag">Ilustração</p>
              </div>
            </div>
            <div className="row">
              <p className="no">Não sabes o que vai sair.</p>
              <div className="yes">Vês os temas que mais saem em cada disciplina.<Link href="/exames">Ver temas →</Link></div>
              <div className="viz"><span className="chip on">1 · Funções</span><span className="chip">2 · Limites</span><span className="chip">3 · Derivadas</span><span className="chip">4 · Probabilidades</span></div>
            </div>
          </div>
        </section>

        <section className="w" id="plano">
          <span className="hand">faz as contas</span>
          <h2>Quantas questões consegues treinar até ao exame?</h2>
          <p className="lead">Mexe nos valores. É só aritmética: a 3 minutos por questão.</p>
          <div className="calc">
            <div className="card">
              <label className="sl"><span>Dias até ao exame <b>{dias}</b></span><input type="range" min={7} max={120} value={dias} onChange={(e: ChangeEvent<HTMLInputElement>) => setDias(Number(e.target.value))} /></label>
              <label className="sl"><span>Minutos por dia <b>{minutos}</b></span><input type="range" min={10} max={120} step={5} value={minutos} onChange={(e: ChangeEvent<HTMLInputElement>) => setMinutos(Number(e.target.value))} /></label>
              <div className="big"><span>{questoes}</span> <small>questões</small></div>
              {stats.questoes > 0 && <p className="tag" style={{ margin: '6px 0 0' }}>A Twisisa tem <b>{milhares(stats.questoes)}</b> questões publicadas.</p>}
            </div>
            <div className="card">
              <div><Acumulado dias={dias} minutos={minutos} /></div>
              <Link className="btn" style={{ width: '100%', marginTop: 12 }} href={cta}>Guardar este plano</Link>
            </div>
          </div>
        </section>

        <section className="w" id="exames">
          <span className="hand">o que já cá está</span>
          <h2>Exames reais, de universidades reais.</h2>
          <div className="two">
            {barras.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '1.05rem', marginBottom: 12 }}>Exames por universidade</h3>
                <svg viewBox={`0 0 280 ${barras.length * 28}`} role="img" aria-label="Exames por universidade">
                  {barras.map((u, i) => {
                    const larg = Math.max(4, (u.exams / maior) * 172.8)
                    return (
                      <g key={u.slug}>
                        <text x="0" y={15 + i * 28} fontSize="11" fill="var(--ink)" fontWeight="700">{u.shortName.length > 11 ? `${u.shortName.slice(0, 10)}…` : u.shortName}</text>
                        <rect x="78" y={4 + i * 28} width={larg} height="16" rx="3" fill="var(--g)" />
                        <text x={84 + larg} y={16 + i * 28} fontSize="11" fill="var(--mu)" fontWeight="700">{u.exams}</text>
                      </g>
                    )
                  })}
                </svg>
                <Link className="btn ol" style={{ marginTop: 12 }} href="/exames">Ver todos os exames</Link>
              </div>
            )}
            <div className="card">
              <h3 style={{ fontSize: '1.05rem' }}>O teu mapa de temas</h3>
              <div><Radar a={ATUAL} b={ANTES} w={300} /></div>
              <p className="tag">Exemplo do que vês no teu painel, depois de treinares.</p>
            </div>
          </div>
        </section>

        <section className="w" id="criar">
          <div className="fin">
            <span className="hand">1 minuto</span>
            <h2>Cria a conta e começa pelo tema mais fraco.</h2>
            <ul><li>Guardas o teu progresso</li><li>Vês a tua nota estimada</li><li>Falas com o Jonas</li></ul>
            <div className="cta">
              <Link className="btn" href={cta}>{signedIn ? 'Ir ao painel' : 'Criar conta grátis'}</Link>
              {!signedIn && <Link className="btn ol" href="/sign-in" style={{ background: 'var(--sf)' }}>Já tenho conta</Link>}
            </div>
          </div>
        </section>

        <section className="w">
          <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Perguntas curtas</h2>
          <details><summary>Preciso de conta para ver os exames?</summary><p>Não. Lês qualquer exame sem conta. Para descarregar o PDF e treinar no simulador, cria uma conta gratuita.</p></details>
          <details><summary>Quanto custa?</summary><p>Criar conta é grátis. O plano Plus é opcional e está na página de planos.</p></details>
          <details><summary>Como é calculada a nota?</summary><p>De 0 a 20: 20 × pontos ganhos ÷ pontos possíveis. As questões mais difíceis valem mais.</p></details>
          <details><summary>Funciona no telemóvel?</summary><p>Sim. Abre no navegador, sem instalar nada.</p></details>
        </section>
      </main>

      <footer><div className="w">
        <span>© {new Date().getFullYear()} Twisisa</span>
        <Link href="/planos">Planos</Link><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link>
        <span>Feito em Moçambique</span>
      </div></footer>
    </div>
  )
}
