#!/usr/bin/env bash
# Twisisa: botões (variantes, sem borda animada), anúncios (cartão claro + página de detalhe),
# faixa discreta para instalar a app no topo do painel e cartão para ativar as notificações.
# Corre na raiz do projecto (onde está o package.json). Só Node, sem Python.
# Se um trecho não bater certo, o script para e diz em que ficheiro. Pode voltar a correr depois de corrigir: não duplica nada.
set -euo pipefail

if [ ! -f package.json ] || [ ! -f app/globals.css ] || [ ! -f lib/anuncios.ts ] || [ ! -f "app/aluno/(painel)/page.tsx" ]; then
  echo "Corre este script na raiz do projecto twisisa (onde está o package.json)."
  exit 1
fi
command -v node >/dev/null 2>&1 || { echo "Falta o Node.js."; exit 1; }

if git rev-parse --git-dir >/dev/null 2>&1 && [ -n "$(git status --porcelain)" ]; then
  echo "AVISO: há alterações por guardar. Faz um commit antes de correr (o git é a cópia de segurança)."
fi

echo "1/6 Variantes de botão (globals.css)"
if grep -qF '[twisisa-ux] variantes de botão' app/globals.css; then
  echo "  já estava"
else
cat >> app/globals.css <<'EOF'

/* [twisisa-ux] variantes de botão. O btn-aura deixa de girar: fica sólido, com sombra suave. */
.btn-aura { position: relative; border: 0; background: var(--marca); color: #fff; box-shadow: 0 6px 16px -8px rgba(29, 77, 65, 0.55); filter: none; isolation: auto; }
.btn-aura::before, .btn-aura::after { content: none; display: none; }
.btn-aura:hover:not(:disabled) { background: var(--marca-escura); }
.btn-aura:active:not(:disabled) { transform: translateY(1px); }
.btn-contorno { background: #fff; color: var(--marca); box-shadow: inset 0 0 0 1.5px var(--marca); }
.btn-contorno:hover:not(:disabled) { background: var(--marca-suave); }
.btn-escuro { background: var(--texto, #202321); color: #fff; }
.btn-escuro:hover:not(:disabled) { filter: brightness(1.15); }
.btn-destaque { background: var(--conquista, #d99a06); color: #fff; }
.btn-destaque:hover:not(:disabled) { filter: brightness(0.94); }
EOF
  echo "  acrescentado"
fi

echo "2/6 Página de detalhe de anúncio (lib/anuncios.ts)"
if grep -qF 'export async function getAnuncioAtivo' lib/anuncios.ts; then
  echo "  já estava"
else
cat >> lib/anuncios.ts <<'EOF'

// [twisisa-ux] anúncio único para a página de detalhe. Só se estiver ativo e dentro das datas.
export async function getAnuncioAtivo(id: string): Promise<Anuncio | null> {
  const result = await pool.query(
    `SELECT id, title, body, tone, featured, cta_label, cta_href
     FROM announcements
     WHERE id = $1 AND active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
     LIMIT 1`,
    [id],
  )
  const row = result.rows[0] as Linha | undefined
  return row ? toAnuncio(row) : null
}
EOF
  echo "  acrescentado"
fi

echo "3/6 Cartão de anúncio (claro para todos + ligação para o detalhe)"
if grep -qF '[twisisa-ux]' components/anuncios/anuncio-card.tsx 2>/dev/null; then
  echo "  já estava"
else
cat > components/anuncios/anuncio-card.tsx <<'EOF'
'use client'

// [twisisa-ux] cartão claro para todos os anúncios (sem o cartão escuro). «Ver detalhes» abre a página do anúncio.
import Link from 'next/link'
import { ArrowRight, CalendarDays, Info, Sparkles, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import type { Anuncio, AnuncioTom } from '@/lib/anuncios'
import { cn } from '@/lib/utils'

// Não importar valores de lib/anuncios aqui: esse ficheiro usa a base de dados e não pode ir para o navegador.
const TIPOS: Record<AnuncioTom, { tom: string; icon: LucideIcon; rotulo: string }> = {
  novidade: { tom: 'tom-assistente', icon: Sparkles, rotulo: 'Novidade' },
  info: { tom: 'tom-ajuda', icon: Info, rotulo: 'Informação' },
  evento: { tom: 'tom-conquista', icon: CalendarDays, rotulo: 'Evento' },
  aviso: { tom: 'tom-aviso', icon: TriangleAlert, rotulo: 'Aviso' },
}

function Ligacao({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return href.startsWith('https://') ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  ) : (
    <Link href={href} className={className}>{children}</Link>
  )
}

export function AnuncioCard({ anuncio, onClose }: { anuncio: Anuncio; onClose?: () => void }) {
  const tipo = TIPOS[anuncio.tone]
  const Icon = tipo.icon
  const cta = anuncio.ctaHref && anuncio.ctaLabel ? { href: anuncio.ctaHref, label: anuncio.ctaLabel } : null

  return (
    <article className={cn('sf-tom relative flex gap-3 p-3.5', onClose && 'pr-11', tipo.tom)}>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fechar anúncio" className="btn btn-icone absolute right-1 top-1">
          <X size={18} aria-hidden="true" />
        </button>
      )}
      <span className="ic-tom"><Icon size={19} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--tom-texto)]">{tipo.rotulo}</p>
        <h2 className="mt-0.5 text-[15px] font-semibold leading-5 text-texto">{anuncio.title}</h2>
        {anuncio.body && <p className="mt-1 line-clamp-3 text-[13px] leading-5 text-texto-2">{anuncio.body}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {cta && (
            <Ligacao href={cta.href} className="inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-[color:var(--tom-texto)] no-underline">
              {cta.label}
              <ArrowRight size={14} aria-hidden="true" />
            </Ligacao>
          )}
          <Link href={`/aluno/anuncios/${anuncio.id}`} className="inline-flex min-h-9 items-center text-[13px] font-semibold text-marca no-underline">
            Ver detalhes
          </Link>
        </div>
      </div>
    </article>
  )
}
EOF
  echo "  escrito"
fi

echo "4/6 Página de detalhe de anúncio (app/aluno/anuncios/[id])"
if [ -f "app/aluno/anuncios/[id]/page.tsx" ] && grep -qF '[twisisa-ux]' "app/aluno/anuncios/[id]/page.tsx"; then
  echo "  já estava"
else
mkdir -p "app/aluno/anuncios/[id]"
cat > "app/aluno/anuncios/[id]/page.tsx" <<'EOF'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { ANUNCIO_TOM_LABEL, getAnuncioAtivo } from '@/lib/anuncios'
import { requireStudent } from '@/lib/require-student'

// [twisisa-ux] detalhe de um anúncio. Só para estudantes com sessão; não é indexado.
export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ id: string }> }

export default async function AnuncioPage({ params }: Props) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const session = await requireStudent(`/aluno/anuncios/${id}`)
  const anuncio = await getAnuncioAtivo(id).catch((error: unknown) => {
    console.error('[ALUNO] anúncio', error)
    return null
  })
  if (!anuncio) notFound()

  const firstName = session.user.name.split(' ')[0]
  const cta = anuncio.ctaHref && anuncio.ctaLabel ? { href: anuncio.ctaHref, label: anuncio.ctaLabel } : null

  return (
    <StudentFeatureShell firstName={firstName} eyebrow={ANUNCIO_TOM_LABEL[anuncio.tone]} title={anuncio.title} description="Anúncio da equipa Twisisa.">
      <Link href="/aluno" className="inline-flex items-center gap-2 text-sm font-semibold text-marca">
        <ArrowLeft size={16} aria-hidden="true" /> Voltar ao painel
      </Link>
      <article className="mt-5 rounded-2xl border border-linha bg-white p-5">
        {anuncio.body && <p className="whitespace-pre-line text-[15px] leading-7 text-texto-2">{anuncio.body}</p>}
        {cta && (
          cta.href.startsWith('https://') ? (
            <a href={cta.href} target="_blank" rel="noopener noreferrer" className="btn btn-primario mt-6">{cta.label}</a>
          ) : (
            <Link href={cta.href} className="btn btn-primario mt-6">{cta.label}</Link>
          )
        )}
      </article>
    </StudentFeatureShell>
  )
}
EOF
  echo "  escrito"
fi

echo "5/6 Faixa de instalação discreta (substitui o popup no painel)"
if [ -f components/aluno/instalar-barra.tsx ] && grep -qF '[twisisa-ux]' components/aluno/instalar-barra.tsx; then
  echo "  já estava"
else
cat > components/aluno/instalar-barra.tsx <<'EOF'
'use client'

// [twisisa-ux] faixa discreta no topo do painel para instalar a app (não é janela).
// Android/Chrome: botão «Instalar» (usa o evento do navegador). iPhone/Safari: instruções curtas.
import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'
import { fechar, foiFechado } from '@/lib/dispensar'

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const ID = 'instalar-barra'

export function InstalarBarra() {
  const [modo, setModo] = useState<'android' | 'ios' | null>(null)
  const evento = useRef<EventoInstalar | null>(null)

  useEffect(() => {
    const instalada = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (instalada || foiFechado(ID)) return
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) setModo('ios')

    const onPrompt = (event: Event) => {
      event.preventDefault()
      evento.current = event as EventoInstalar
      setModo('android')
    }
    const onInstalada = () => {
      fechar(ID)
      setModo(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalada)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalada)
    }
  }, [])

  if (!modo) return null

  async function instalar() {
    const e = evento.current
    if (!e) return
    await e.prompt()
    const { outcome } = await e.userChoice
    evento.current = null
    if (outcome === 'accepted') fechar(ID)
    else fechar(ID, 30)
    setModo(null)
  }

  return (
    <div role="region" aria-label="Instalar a app" className="flex items-center gap-3 border-b border-[#cfe0d5] bg-marca-suave px-4 py-2 text-[13px] leading-5 text-texto">
      <p className="min-w-0 flex-1">
        {modo === 'android'
          ? 'Instala a Twisisa no ecrã principal para abrir mais depressa.'
          : 'No iPhone: toca em Partilhar e depois em «Adicionar ao ecrã principal».'}
      </p>
      {modo === 'android' && (
        <button type="button" onClick={instalar} className="btn btn-primario px-3 py-2 text-[13px]">
          <Download size={15} aria-hidden="true" />
          Instalar
        </button>
      )}
      <button type="button" aria-label="Fechar aviso de instalação" onClick={() => { fechar(ID, 14); setModo(null) }} className="btn btn-icone size-9 min-h-9">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
EOF
  echo "  escrito"
fi

echo "6/6 Cartão para ativar notificações (fica na página até o aparelho ficar registado)"
if [ -f components/aluno/push-card.tsx ] && grep -qF '[twisisa-ux]' components/aluno/push-card.tsx; then
  echo "  já estava"
else
cat > components/aluno/push-card.tsx <<'EOF'
'use client'

// [twisisa-ux] cartão na página para quem ainda não ativou as notificações. Some quando este aparelho já está registado.
// O popup (NotificacoesModal) continua a aparecer como antes; este cartão é o lembrete permanente.
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { ativarPush, pushLigado, suportaPush } from '@/lib/push-client'

export function PushCard({ publicKey }: { publicKey: string }) {
  const chave = publicKey.trim()
  const [estado, setEstado] = useState<'a-ver' | 'mostrar' | 'ligado'>('a-ver')
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!chave || !suportaPush()) {
      setEstado('ligado')
      return
    }
    let vivo = true
    pushLigado(chave)
      .then((ligado) => { if (vivo) setEstado(ligado ? 'ligado' : 'mostrar') })
      .catch(() => { if (vivo) setEstado('mostrar') })
    return () => { vivo = false }
  }, [chave])

  if (estado !== 'mostrar') return null

  async function ativar() {
    setOcupado(true)
    setAviso(null)
    const resultado = await ativarPush(chave)
    setOcupado(false)
    if (resultado.ok) setEstado('ligado')
    else setAviso(resultado.mensagem)
  }

  return (
    <section aria-label="Notificações" className="flex items-center gap-3 rounded-2xl border border-linha bg-white p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-marca-suave text-marca">
        <Bell size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold text-texto">Ativa os lembretes de estudo</h2>
        <p className="mt-0.5 text-[13px] leading-5 text-texto-2">Recebe um aviso no telemóvel quando fizer falta praticar.</p>
        {aviso && <p role="status" className="mt-1.5 text-[12px] text-aviso-texto">{aviso}</p>}
      </div>
      <button type="button" onClick={ativar} disabled={ocupado} aria-busy={ocupado} className="btn btn-primario shrink-0 px-3 py-2 text-[13px]">
        {ocupado ? 'A ligar…' : 'Ativar'}
      </button>
    </section>
  )
}
EOF
  echo "  escrito"
fi

echo "Ligações no painel (app/aluno/(painel)/page.tsx)"
PATCH="$(mktemp "${TMPDIR:-/tmp}/twisisa-ux.XXXXXX")"
trap 'rm -f "$PATCH"' EXIT
cat > "$PATCH" <<'EOF'
const fs = require('fs')
const file = 'app/aluno/(painel)/page.tsx'
let texto = fs.readFileSync(file, 'utf8')

// Troca um trecho que tem de aparecer exatamente uma vez. Se o novo texto já lá estiver, não mexe.
function trocar(antigo, novo) {
  if (texto.includes(novo)) return console.log('  já estava: ' + novo.trim().slice(0, 60))
  const vezes = texto.split(antigo).length - 1
  if (vezes !== 1) {
    console.error('ERRO: o trecho "' + antigo.trim().slice(0, 60) + '" aparece ' + vezes + ' vez(es), esperava 1. Nada foi gravado neste ficheiro.')
    process.exit(1)
  }
  texto = texto.replace(antigo, () => novo)
  console.log('  ligado: ' + novo.trim().slice(0, 60))
}

trocar("import { InstalarApp } from '@/components/aluno/instalar-app'",
  "import { InstalarBarra } from '@/components/aluno/instalar-barra'\nimport { PushCard } from '@/components/aluno/push-card'")
trocar('<InstalarApp />', '<InstalarBarra />')
trocar('{!gate?.need && <Anuncios items={anuncios} />}',
  "{!gate?.need && <Anuncios items={anuncios} />}\n              {!gate?.need && <PushCard publicKey={process.env.VAPID_PUBLIC_KEY ?? ''} />}")

fs.writeFileSync(file, texto)
EOF
node "$PATCH"

echo ""
echo "Concluído. Ficheiros tocados:"
echo "  app/globals.css · lib/anuncios.ts · components/anuncios/anuncio-card.tsx"
echo "  app/aluno/anuncios/[id]/page.tsx (novo) · components/aluno/instalar-barra.tsx (novo)"
echo "  components/aluno/push-card.tsx (novo) · app/aluno/(painel)/page.tsx"
echo ""
if [ -d node_modules ]; then
  echo "A verificar tipos (npx tsc)…"
  npx tsc --noEmit && echo "  tipos OK" || echo "  AVISO: o tsc encontrou erros acima. Não avançar sem os resolver."
else
  echo "Sem node_modules: corre npm install e depois npm run build para confirmar."
fi
