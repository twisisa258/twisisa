#!/usr/bin/env bash
# Admin v3:
#  - menu lateral escuro e por grupos (Fluxo de conteúdo, Publicação, Catálogo, Qualidade, Sistema);
#  - importar com o Jonas: o que fica sem ano, tema ou variante exata vai direto para a Revisão (o resto segue normal);
#  - Materiais em passos: define o contexto uma vez (tipo, nível, instituição, disciplina, ano) e junta os ficheiros;
#  - seletor personalizado (sem menus nativos) no carregamento de materiais;
#  - Plus arquivado: a linha «Plano» das Definições só aparece com pagamento ou Plus ativo;
#  - corrige o número da migração do Plus (colidia com a 0041_admin_v2).
# Pré-requisito: Admin v2 aplicado. Depois corre:  npm run migrate status   (e  npm run migrate  se houver pendentes)
# Corre na raiz do projeto:  mv aplicar-admin-v3.sh ~/twisisa && cd ~/twisisa && bash aplicar-admin-v3.sh
set -e
for f in database/migrations/0041_admin_v2.sql components/admin/passos.tsx components/ui/lista-escolha.tsx lib/revisao.ts lib/importar-exame.ts app/admin/importar/actions.ts components/admin/material-bulk.tsx app/admin/materiais/novo/page.tsx app/admin/layout.tsx components/admin/admin-nav.tsx app/aluno/definicoes/page.tsx app/globals.css State.md; do
  [ -f "$f" ] || { echo "Falta $f. Corre na raiz do projeto (~/twisisa), com o Admin v2 e as Definições já aplicados."; exit 1; }
done

# Migrações com o mesmo número (0041_admin_v2 e 0041_plus_sugestoes): o número é chave primária em _migrations.
if [ -f database/migrations/0041_plus_sugestoes.sql ] && [ -f database/migrations/0041_admin_v2.sql ]; then
  ULTIMA=$(ls database/migrations | grep -oE '^[0-9]+' | sort -n | tail -1)
  NOVA=$(printf '%04d' $((10#$ULTIMA + 1)))
  mv database/migrations/0041_plus_sugestoes.sql "database/migrations/${NOVA}_plus_sugestoes.sql"
  export MIGRACAO_PLUS="$NOVA"
  echo "Renumerei 0041_plus_sugestoes.sql para ${NOVA}_plus_sugestoes.sql (já existia 0041_admin_v2.sql)."
fi

mkdir -p components/ui components/admin app/admin tests lib

cat > "lib/admin-grupos.ts" <<'TWISISA_AV3_EOF'
// Como a navegação do admin se agrupa. Só endereços (sem ícones), para se poder testar.
// Uma secção nova em lib/admin-sections.ts que não esteja aqui aparece sozinha num grupo «Outros»: nada desaparece do menu.

export type GrupoAdmin = { id: string; titulo: string | null; hrefs: string[]; fechado?: boolean }

export const GRUPOS_ADMIN: GrupoAdmin[] = [
  { id: 'painel', titulo: null, hrefs: ['/admin'] },
  // O caminho de um exame, por ordem: carregar o PDF → o Jonas lê → rever o que falta → publicar no banco.
  { id: 'fluxo', titulo: 'Fluxo de conteúdo', hrefs: ['/admin/materiais', '/admin/importar', '/admin/revisao', '/admin/questoes'] },
  { id: 'publicacao', titulo: 'Publicação', hrefs: ['/admin/temas-principais', '/admin/blog', '/admin/anuncios'] },
  { id: 'catalogo', titulo: 'Catálogo', fechado: true, hrefs: ['/admin/instituicoes', '/admin/cursos', '/admin/disciplinas', '/admin/temas', '/admin/variantes', '/admin/classificacao', '/admin/modulos'] },
  { id: 'qualidade', titulo: 'Qualidade', hrefs: ['/admin/reportes', '/admin/notificacoes'] },
  { id: 'sistema', titulo: 'Sistema', hrefs: ['/admin/jonas', '/admin/equipa'] },
]

/** Endereços que estão em mais do que um grupo (não devia haver nenhum). */
export function hrefsRepetidos(grupos: GrupoAdmin[] = GRUPOS_ADMIN): string[] {
  const vistos = new Set<string>()
  const repetidos = new Set<string>()
  for (const grupo of grupos) for (const href of grupo.hrefs) (vistos.has(href) ? repetidos : vistos).add(href)
  return [...repetidos]
}
TWISISA_AV3_EOF

cat > "components/ui/seletor.tsx" <<'TWISISA_AV3_EOF'
'use client'

import { ChevronDown, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ListaEscolha } from '@/components/ui/lista-escolha'

const VAZIO = '__vazio'

// Seletor personalizado e controlado (sem o menu nativo do sistema): um botão que mostra o valor e abre uma folha com a lista,
// com procura quando há muitas opções. A primeira linha («Não definir») limpa o valor. Para formulários com `name` usa-se o SelectField.
export function Seletor({
  rotulo,
  valor,
  onChange,
  opcoes,
  vazio = 'Não definir',
  desativado = false,
}: {
  rotulo: string
  valor: string
  onChange: (valor: string) => void
  opcoes: { value: string; label: string }[]
  vazio?: string
  desativado?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const atual = opcoes.find((opcao) => opcao.value === valor)

  useEffect(() => {
    if (!aberto) return
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', fechar)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', fechar)
      document.body.style.overflow = antes
    }
  }, [aberto])

  return (
    <div className="grid gap-1 text-xs font-semibold text-[#526057]">
      <span>{rotulo}</span>
      <button
        type="button"
        disabled={desativado}
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        aria-label={`${rotulo}: ${atual?.label ?? vazio}`}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#dfe3d9] bg-white px-3 text-left text-sm font-normal outline-none transition-colors focus-visible:border-marca focus-visible:ring-2 focus-visible:ring-marca/10 disabled:opacity-60"
      >
        <span className={`truncate ${atual ? 'text-texto' : 'text-texto-2'}`}>{atual?.label ?? vazio}</span>
        <ChevronDown size={16} aria-hidden className="shrink-0 text-texto-2" />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={rotulo}>
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} />
          <div className="relative z-10 flex max-h-[85dvh] w-full max-w-md flex-col gap-3 rounded-t-3xl bg-white p-4 text-texto sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{rotulo}</h2>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="grid size-10 place-items-center rounded-full text-texto-2 hover:bg-[#f1f4ef]"><X size={18} aria-hidden /></button>
            </div>
            <div className="min-h-0 overflow-y-auto">
              <ListaEscolha
                rotulo={rotulo}
                itens={[{ id: VAZIO, label: vazio }, ...opcoes.map((opcao) => ({ id: opcao.value, label: opcao.label }))]}
                valor={valor || VAZIO}
                onChange={(id) => { onChange(id === VAZIO ? '' : id); setAberto(false) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
TWISISA_AV3_EOF

cat > "components/admin/assistente-material.tsx" <<'TWISISA_AV3_EOF'
'use client'

import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Passos, type Passo } from '@/components/admin/passos'
import { MaterialBulk, type Catalog, type Fields } from '@/components/admin/material-bulk'
import { ListaEscolha, type ItemEscolha } from '@/components/ui/lista-escolha'

const CHAVE = 'twisisa:material-contexto'
const DETETAR = '__detetar'
const VAZIO: Fields = { category: '', subject: '', level: '', institution: '', year: '', course: '' }

// Adicionar materiais em dois tempos: primeiro o contexto, uma pergunta por ecrã (tipo, nível, instituição, disciplina, ano),
// depois os ficheiros, que herdam tudo isso sem repetir nada. Cada pergunta pode ficar em «Detetar»: o nome do ficheiro e as pastas decidem.
// O contexto fica guardado neste separador; a barra no topo mostra-o sempre e deixa mudar.
export function NovoMaterial({ catalog }: { catalog: Catalog }) {
  const [contexto, setContexto] = useState<Fields | null>(null)
  const [rascunho, setRascunho] = useState<Fields>(VAZIO)
  const [indice, setIndice] = useState(0)
  const [lido, setLido] = useState(false)

  useEffect(() => {
    try {
      const guardado = window.sessionStorage.getItem(CHAVE)
      if (guardado) {
        const valor = JSON.parse(guardado) as Partial<Fields>
        if (valor && typeof valor === 'object') setContexto({ ...VAZIO, ...valor })
      }
    } catch { /* sem armazenamento: começa do início */ }
    setLido(true)
  }, [])

  const deixar: ItemEscolha = { id: DETETAR, label: 'Deixar detetar', detail: 'Pelo nome do ficheiro e pelas pastas' }
  function passo(id: string, titulo: string, chave: keyof Fields, itens: ItemEscolha[], ultimo = false): Passo {
    return {
      id,
      titulo,
      pronto: true,
      conteudo: (
        <ListaEscolha
          rotulo={titulo}
          itens={[deixar, ...itens]}
          valor={rascunho[chave] || DETETAR}
          procuraDepois={8}
          onChange={(escolha) => {
            setRascunho((atual) => ({ ...atual, [chave]: escolha === DETETAR ? '' : escolha }))
            if (!ultimo) setIndice((atual) => atual + 1)
          }}
        />
      ),
    }
  }

  const passos: Passo[] = [
    passo('tipo', 'Que tipo de material?', 'category', catalog.categories.map((item) => ({ id: item.slug, label: item.name }))),
    passo('nivel', 'Que classe ou nível?', 'level', catalog.levels.map((item) => ({ id: item.id, label: item.name }))),
    passo('instituicao', 'De que instituição?', 'institution', catalog.institutions.map((item) => ({ id: item.shortName, label: item.shortName, detail: item.name }))),
    passo('disciplina', 'Que disciplina?', 'subject', catalog.subjects.map((item) => ({ id: item.id, label: item.name }))),
    passo('ano', 'De que ano?', 'year', catalog.years.map((ano) => ({ id: String(ano), label: String(ano) })), true),
  ]

  function concluir() {
    setContexto(rascunho)
    try { window.sessionStorage.setItem(CHAVE, JSON.stringify(rascunho)) } catch { /* vale só nesta visita */ }
  }

  function mudar() {
    setRascunho(contexto ?? VAZIO)
    setIndice(0)
    setContexto(null)
    try { window.sessionStorage.removeItem(CHAVE) } catch { /* nada */ }
  }

  if (!lido) return null

  if (!contexto) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <Passos passos={passos} indice={indice} onIndice={setIndice} onConcluir={concluir} rotuloFinal="Escolher ficheiros" />
      </div>
    )
  }

  const nomes: { chave: keyof Fields; texto: string }[] = [
    { chave: 'category', texto: catalog.categories.find((item) => item.slug === contexto.category)?.name ?? '' },
    { chave: 'level', texto: catalog.levels.find((item) => item.id === contexto.level)?.name ?? '' },
    { chave: 'institution', texto: contexto.institution },
    { chave: 'subject', texto: catalog.subjects.find((item) => item.id === contexto.subject)?.name ?? '' },
    { chave: 'year', texto: contexto.year },
  ]
  const definidos = nomes.filter((item) => item.texto)

  const barra = (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-linha bg-white p-3">
      <span className="text-xs font-semibold text-texto-2">A carregar para:</span>
      {definidos.length > 0 ? definidos.map((item) => (
        <span key={item.chave} className="rounded-full bg-[#e6f0e9] px-3 py-1 text-xs font-semibold text-marca">{item.texto}</span>
      )) : <span className="text-xs text-texto-2">tudo detetado pelo nome e pelas pastas</span>}
      <button type="button" onClick={mudar} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#c9d7cd] bg-white px-3 text-xs font-semibold text-marca hover:bg-[#f1f4ef]"><Pencil size={14} aria-hidden /> Mudar</button>
    </div>
  )

  return <MaterialBulk key={JSON.stringify(contexto)} catalog={catalog} initialDefaults={contexto} contexto={barra} />
}
TWISISA_AV3_EOF

cat > "components/admin/admin-nav.tsx" <<'TWISISA_AV3_EOF'
'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { adminOverview, adminSections } from '@/lib/admin-sections'
import { GRUPOS_ADMIN } from '@/lib/admin-grupos'
import type { StaffRole } from '@/lib/staff-shared'

const todos = [adminOverview, ...adminSections]
const porHref = new Map(todos.map((item) => [item.href, item]))
const REVISOR = new Set(['/admin/questoes', '/admin/revisao'])

function montarGrupos(role: StaffRole) {
  const usados = new Set(GRUPOS_ADMIN.flatMap((grupo) => grupo.hrefs))
  const sobras = todos.filter((item) => !usados.has(item.href)).map((item) => item.href)
  const grupos = [...GRUPOS_ADMIN, ...(sobras.length ? [{ id: 'outros', titulo: 'Outros', hrefs: sobras, fechado: false }] : [])]
  return grupos
    .map((grupo) => ({
      ...grupo,
      itens: grupo.hrefs
        .filter((href) => role !== 'revisor' || REVISOR.has(href))
        .map((href) => porHref.get(href))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    }))
    .filter((grupo) => grupo.itens.length > 0)
}

// `sidebar`: grupos por fluxo de trabalho (ecrãs largos). `pills`: linha deslizável com tudo, pela mesma ordem (telemóvel).
export function AdminNav({ variant, role = 'admin', badges = {} }: { variant: 'sidebar' | 'pills'; role?: StaffRole; badges?: Record<string, number> }) {
  const pathname = usePathname()
  const grupos = montarGrupos(role)
  const [fechados, setFechados] = useState<Record<string, boolean>>({})
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`))
  const numero = (href: string) => (badges[href] ? (badges[href] > 99 ? '99+' : String(badges[href])) : null)

  if (variant === 'pills') {
    return (
      <nav aria-label="Administração" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-3">
        {grupos.flatMap((grupo) => grupo.itens).map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${active ? 'border-marca bg-marca font-semibold text-white' : 'border-[#dfe3d9] bg-white text-[#526057]'}`}>
              <Icon size={16} aria-hidden="true" />
              {label}
              {numero(href) ? <span className="ml-1 rounded-full bg-[#c0392b] px-1.5 text-[11px] font-semibold leading-5 text-white">{numero(href)}</span> : null}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav aria-label="Administração" className="ad-nv">
      {grupos.map((grupo) => {
        const fechado = grupo.titulo ? (fechados[grupo.id] ?? Boolean(grupo.fechado)) && !grupo.itens.some((item) => isActive(item.href)) : false
        return (
          <div key={grupo.id} className="contents">
            {grupo.titulo && (
              <button type="button" className="ad-gh" aria-expanded={!fechado} onClick={() => setFechados((atual) => ({ ...atual, [grupo.id]: !fechado }))}>
                {grupo.titulo}
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            )}
            {!fechado && grupo.itens.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className="ad-it">
                <Icon size={16} aria-hidden="true" />
                {label}
                {numero(href) ? <span className={href === '/admin/revisao' ? 'ad-b ad-b-w' : 'ad-b'}>{numero(href)}</span> : null}
              </Link>
            ))}
          </div>
        )
      })}
    </nav>
  )
}
TWISISA_AV3_EOF

cat > "app/admin/layout.tsx" <<'TWISISA_AV3_EOF'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { pageMetadata } from '@/lib/seo'
import { getStaffAccess } from '@/lib/staff'
import { Brand } from '@/components/brand'
import { SignOutButton } from '@/components/sign-out-button'
import { AdminNav } from '@/components/admin/admin-nav'
import { countUnread } from '@/lib/admin-notify'
import { contarRevisao } from '@/lib/revisao-db'

export const metadata: Metadata = pageMetadata({
  title: 'Administração | Twisisa',
  description: 'Gestão de conteúdos do Twisisa.',
  path: '/admin',
  index: false,
})

const badge = 'rounded-full bg-[#e6f0e9] px-2.5 py-1 text-[11px] font-semibold text-marca'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const access = await getStaffAccess()
  // Sem sessão, /aluno reencaminha para o início de sessão; sem permissão, fica na área do estudante.
  if (!access) redirect('/aluno')
  const admin = access.user
  const home = access.role === 'admin' ? '/admin' : '/admin/questoes'
  const roleLabel = access.role === 'admin' ? 'Administração' : 'Revisão'
  const firstName = admin.name.split(' ')[0]
  const [porLer, emRevisao] = await Promise.all([countUnread(admin.id), contarRevisao()])
  const badges = { '/admin/notificacoes': porLer, '/admin/revisao': emRevisao }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-fundo text-texto lg:flex-row">
      {/* Barra lateral escura: é o que distingue a administração da área do estudante. */}
      <aside className="ad-sd hidden lg:flex">
        <Link href={home} aria-label="Twisisa, página inicial da administração" className="ad-logo">
          <span className="ad-mark"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-4 w-auto object-contain" /></span>
          Twisisa
        </Link>
        <p className="ad-papel">{roleLabel}</p>
        <AdminNav variant="sidebar" role={access.role} badges={badges} />
        <div className="ad-rodape">
          <Link href="/aluno" className="ad-volta"><ArrowLeft size={16} aria-hidden="true" /> Área do estudante</Link>
          <div className="ad-eu">
            <span className="flex min-w-0 items-center gap-2">
              <span className="ad-av">{firstName.slice(0, 1)}</span>
              <span className="truncate">{firstName}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-30 shrink-0 border-b border-linha bg-fundo/95 px-5 pt-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 pb-3">
            <Brand href={home} />
            <div className="flex items-center gap-2">
              <span className={badge}>{roleLabel}</span>
              <Link href="/aluno" aria-label="Voltar à área do estudante" className="rounded-full p-2 text-[#526057] hover:bg-white"><ArrowLeft size={18} /></Link>
            </div>
          </div>
          <AdminNav variant="pills" role={access.role} badges={badges} />
        </header>
        {/* A página não rola; só esta área. As páginas de lista enchem-na (AdminPage) e rolam apenas a lista. */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-8 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
TWISISA_AV3_EOF

cat > "tests/admin-v3.test.ts" <<'TWISISA_AV3_EOF'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GRUPOS_ADMIN, hrefsRepetidos } from '../lib/admin-grupos'
import { adminOverview, adminSections } from '../lib/admin-sections'
import { motivosDaRevisao } from '../lib/revisao'

test('menu do admin: nenhum endereço em dois grupos e nenhuma secção fica de fora', () => {
  assert.deepEqual(hrefsRepetidos(GRUPOS_ADMIN), [])
  const agrupados = new Set(GRUPOS_ADMIN.flatMap((grupo) => grupo.hrefs))
  for (const item of [adminOverview, ...adminSections]) assert.ok(agrupados.has(item.href), `${item.href} não está em nenhum grupo`)
  for (const href of agrupados) assert.ok([adminOverview, ...adminSections].some((item) => item.href === href), `${href} não existe nas secções`)
})

test('menu do admin: o fluxo de conteúdo segue a ordem do trabalho', () => {
  const fluxo = GRUPOS_ADMIN.find((grupo) => grupo.id === 'fluxo')
  assert.deepEqual(fluxo?.hrefs, ['/admin/materiais', '/admin/importar', '/admin/revisao', '/admin/questoes'])
})

test('motivos da revisão: ordem fixa e só o que existe', () => {
  assert.equal(motivosDaRevisao({}), '')
  assert.equal(motivosDaRevisao({ sem_tema: 1, sem_ano: 2 }), '2 sem ano, 1 sem tema')
  assert.equal(motivosDaRevisao({ possivel_duplicada: 1, sem_variante: 3 }), '3 sem variante, 1 possível duplicada')
  assert.equal(motivosDaRevisao({ sem_ano: 0 }), '')
})
TWISISA_AV3_EOF

# Resumo da Revisão: texto dos motivos (acrescentado ao fim de lib/revisao.ts).
if ! grep -q "motivosDaRevisao" lib/revisao.ts; then
cat >> lib/revisao.ts <<'TWISISA_AV3_EOF'

/** «2 sem ano, 1 sem tema»: o que levou questões para a Revisão, pela ordem de sempre. Vazio se nenhuma. */
export function motivosDaRevisao(porRazao: Partial<Record<Razao, number>>): string {
  return ORDEM_RAZOES.filter((razao) => (porRazao[razao] ?? 0) > 0)
    .map((razao) => `${porRazao[razao]} ${razaoLabel(razao).toLowerCase()}`)
    .join(', ')
}
TWISISA_AV3_EOF
fi

# Ligações ao que já existe e registo no State.md.
node - <<'TWISISA_AV3_NODE'
const fs = require('fs')
function patch(file, steps) {
  let text = fs.readFileSync(file, 'utf8')
  for (const [from, to, done] of steps) {
    if (text.includes(done)) continue
    if (!text.includes(from)) { console.error(`Não encontrei o trecho esperado em ${file}:\n${from}\nO ficheiro mudou desde o zip; diz-me e ajusto.`); process.exit(1) }
    text = text.replace(from, to)
  }
  fs.writeFileSync(file, text)
}

// 1. O Jonas manda direto para a Revisão o que fica sem ano, tema ou variante exata.
patch('lib/importar-exame.ts', [
  ["import { subjectHasScope } from '@/lib/questions'", "import { subjectHasScope } from '@/lib/questions'\nimport type { Razao } from '@/lib/revisao'", 'import type { Razao }'],
  ["export type BatchResult = { saved: number; low: number; skipped: Skipped[]; nextNumber: number; done: boolean; notes: string[] }", "export type BatchResult = { saved: number; low: number; skipped: Skipped[]; nextNumber: number; done: boolean; notes: string[]; review: number; porRazao: Partial<Record<Razao, number>> }", 'review: number; porRazao'],
  ["  let saved = 0\n  let low = 0\n  const notes: string[] = []\n", "  let saved = 0\n  let low = 0\n  let review = 0\n  const porRazao: Partial<Record<Razao, number>> = {}\n  const notes: string[] = []\n", 'let review = 0'],
  ["      saved += 1\n      if (decision.confidence === 'baixa') low += 1\n", "      // O que falta (ano, tema, variante exata) leva a questão direta para a Revisão; o resto segue como rascunho normal.\n      await client.query('SAVEPOINT revisao')\n      try {\n        const razoes = ((await client.query(`UPDATE questions SET review_reasons = COALESCE(question_review_reasons(id), '{}') WHERE id = $1 RETURNING review_reasons`, [questionId])).rows[0]?.review_reasons ?? []) as Razao[]\n        await client.query('RELEASE SAVEPOINT revisao')\n        if (razoes.length > 0) {\n          review += 1\n          for (const razao of razoes) porRazao[razao] = (porRazao[razao] ?? 0) + 1\n        }\n      } catch (error) {\n        await client.query('ROLLBACK TO SAVEPOINT revisao')\n        console.error('[IMPORTAR] revisão (a migração do Admin v2 está aplicada?)', error)\n      }\n      saved += 1\n      if (decision.confidence === 'baixa') low += 1\n", "await client.query('SAVEPOINT revisao')"],
  ["    return { saved, low, skipped, nextNumber: done ? from : nextNumber, done, notes }", "    return { saved, low, skipped, nextNumber: done ? from : nextNumber, done, notes, review, porRazao }", 'done, notes, review, porRazao'],
])
patch('app/admin/importar/actions.ts', [
  ["import { runImportBatch, undoLastBatch } from '@/lib/importar-exame'", "import { runImportBatch, undoLastBatch } from '@/lib/importar-exame'\nimport { notifyAdmin } from '@/lib/admin-notify'\nimport { motivosDaRevisao } from '@/lib/revisao'", "import { motivosDaRevisao }"],
  ["  revalidatePath('/admin/questoes')\n  revalidatePath('/admin')\n}", "  revalidatePath('/admin/questoes')\n  revalidatePath('/admin/revisao')\n  revalidatePath('/admin')\n}", "revalidatePath('/admin/revisao')"],
  ["    if (result.skipped.length) parts.push(`Ignoradas: ${describeSkipped(result.skipped)}.`)\n    if (result.notes.length) parts.push(...result.notes)", "    if (result.review > 0) {\n      const motivos = motivosDaRevisao(result.porRazao)\n      parts.push(`${result.review} ${result.review === 1 ? 'foi direta para a Revisão' : 'foram diretas para a Revisão'}${motivos ? ` (${motivos})` : ''}.`)\n      await notifyAdmin(admin.id, {\n        kind: 'question.ai_import',\n        level: 'aviso',\n        title: `${result.review} ${result.review === 1 ? 'questão precisa' : 'questões precisam'} de revisão`,\n        body: `Importação do Jonas${motivos ? `: ${motivos}` : ''}. As restantes ficaram como rascunho normal.`,\n        link: '/admin/revisao',\n        data: { review: result.review, porRazao: result.porRazao },\n      })\n    }\n    if (result.skipped.length) parts.push(`Ignoradas: ${describeSkipped(result.skipped)}.`)\n    if (result.notes.length) parts.push(...result.notes)", 'motivosDaRevisao(result.porRazao)'],
])

// 2. Materiais: contexto primeiro (um passo por ecrã), ficheiros depois; selectores personalizados.
patch('components/admin/material-bulk.tsx', [
  ["import { Spinner } from '@/components/ui/spinner'", "import { Spinner } from '@/components/ui/spinner'\nimport { Seletor } from '@/components/ui/seletor'", 'import { Seletor }'],
  ["type Fields = Record<FieldKey, string>", "export type Fields = Record<FieldKey, string>", 'export type Fields'],
  ["  const select = (key: FieldKey, label: string, options: { value: string; label: string }[]) => (\n    <label className=\"grid gap-1 text-xs font-semibold text-[#526057]\">\n      {label}\n      <select value={values[key]} onChange={(event) => onChange(key, event.target.value)} disabled={disabled} className={input}>\n        <option value=\"\">{blank}</option>\n        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}\n      </select>\n    </label>\n  )", "  const select = (key: FieldKey, label: string, options: { value: string; label: string }[]) => (\n    <Seletor rotulo={label} valor={values[key]} onChange={(valor) => onChange(key, valor)} opcoes={options} vazio={blank} desativado={disabled} />\n  )", '<Seletor rotulo={label}'],
  ["export function MaterialBulk({ catalog }: { catalog: Catalog }) {", "export function MaterialBulk({ catalog, initialDefaults, contexto }: { catalog: Catalog; initialDefaults?: Fields; contexto?: React.ReactNode }) {", 'initialDefaults?: Fields'],
  ["  const [defaults, setDefaults] = useState<Fields>(EMPTY)", "  const [defaults, setDefaults] = useState<Fields>(initialDefaults ?? EMPTY)", 'initialDefaults ?? EMPTY'],
  ["      <section className=\"rounded-2xl border border-linha bg-white p-4 sm:p-5\" aria-label=\"Para todos\">", "      {contexto}\n      <section hidden={Boolean(initialDefaults)} className=\"rounded-2xl border border-linha bg-white p-4 sm:p-5\" aria-label=\"Para todos\">", '{contexto}'],
])
patch('app/admin/materiais/novo/page.tsx', [
  ["import { MaterialBulk, type Catalog } from '@/components/admin/material-bulk'", "import type { Catalog } from '@/components/admin/material-bulk'\nimport { NovoMaterial } from '@/components/admin/assistente-material'", 'NovoMaterial }'],
  ["<MaterialBulk catalog={catalog} />", "<NovoMaterial catalog={catalog} />", '<NovoMaterial catalog'],
  ['description="Escolhe vários ficheiros ou uma pasta e classifica tudo de uma vez."', 'description="Diz primeiro do que se trata, uma pergunta de cada vez; depois junta os ficheiros."', 'uma pergunta de cada vez'],
])

// 3. Plus arquivado: a linha «Plano» das Definições só aparece quando há pagamento ou o aluno já tem Plus.
{
  const file = 'app/aluno/definicoes/page.tsx'
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes('(PAGAMENTO_ATIVO || plus) && (')) {
    const inicio = text.indexOf('        <Grupo titulo="Plano">')
    const fecho = '        </Grupo>\n'
    const fim = inicio < 0 ? -1 : text.indexOf(fecho, inicio)
    if (inicio < 0 || fim < 0) { console.error(`Não encontrei o grupo «Plano» em ${file}. O ficheiro mudou desde o zip; diz-me e ajusto.`); process.exit(1) }
    const bloco = text.slice(inicio, fim + fecho.length).trimEnd()
    text = text.slice(0, inicio) + '        {(PAGAMENTO_ATIVO || plus) && (\n' + bloco + '\n        )}\n' + text.slice(fim + fecho.length)
    fs.writeFileSync(file, text)
  }
}

// 4. Registo no projecto.
{
  const file = 'State.md'
  let text = fs.readFileSync(file, 'utf8')
  if (process.env.MIGRACAO_PLUS) text = text.replace('**Migração 0041** (`student_profiles.plus_suggestions`)', `**Migração ${process.env.MIGRACAO_PLUS}** (\`student_profiles.plus_suggestions\`)`)
  if (!text.includes('## Admin v3')) {
    const secao = "## Admin v3 (12/11/2026), FEITO, FALTA TESTE\n- **Menu lateral** escuro e por grupos (`lib/admin-grupos.ts`, `components/admin/admin-nav.tsx`): Fluxo de conteúdo (Materiais → Importar → Revisão → Banco de questões), Publicação, Catálogo (fechado), Qualidade e Sistema. Uma secção nova que não esteja num grupo aparece em «Outros»; nada desaparece. O revisor continua a ver só Banco de questões e Revisão.\n- **Importar com o Jonas → Revisão:** `runImportBatch` calcula `review_reasons` em cada questão guardada; a que fica sem ano, tema ou variante exata vai direta para `/admin/revisao` e o admin recebe um aviso; as restantes seguem como rascunho normal. Precisa da migração do Admin v2 (se faltar, a importação segue sem enviar para a Revisão e regista o erro).\n- **Materiais em passos** (`/admin/materiais/novo`, `components/admin/assistente-material.tsx`): tipo → nível → instituição → disciplina → ano, uma pergunta por ecrã, cada uma com «Deixar detetar»; depois os ficheiros herdam o contexto, que fica numa barra no topo (guardado no separador, com «Mudar»).\n- **Seletor personalizado** (`components/ui/seletor.tsx`, controlado, abre uma folha com procura) substitui os `<select>` nativos do carregamento de materiais. Falta trocar os de Cursos (4) e do editor do Blog (3), e converter para passos os formulários de Instituições, Temas, Variantes, Cursos, Equipa, Anúncios e Blog.\n- **Plus arquivado:** a linha «Plano» das Definições só aparece com `PAGAMENTO_ATIVO` ou com Plus ativo.\n- **Migrações:** havia duas com o número 0041 (`admin_v2` e `plus_sugestoes`); `_migrations.id` é chave primária, por isso a segunda falhava. A do Plus passou a ter o número seguinte. Se `npm run migrate status` mostrar `plus_sugestoes` APLICADA e `admin_v2` PENDENTE, corre `UPDATE \"_migrations\" SET id = 42, name = '0042_plus_sugestoes.sql' WHERE name = '0041_plus_sugestoes.sql';` e depois `npm run migrate`.\n- Falta: hubs de grupo, barra de topo com procura e o Painel como na proposta (o Painel do Admin v2 mantém-se), e a tabela do Banco de questões.\n\n"
    if (!text.includes('## Pendentes, por prioridade')) { console.error('Não encontrei «## Pendentes, por prioridade» em State.md.'); process.exit(1) }
    text = text.replace('## Pendentes, por prioridade', secao + '## Pendentes, por prioridade')
  }
  fs.writeFileSync(file, text)
}
TWISISA_AV3_NODE

# Estilos do menu (acrescentados ao fim)
if ! grep -q "twisisa-admin-v3" app/globals.css; then
cat >> app/globals.css <<'TWISISA_AV3_EOF'

/* [twisisa-admin-v3] barra lateral escura e agrupada da administração */
.ad-sd{width:252px;flex-shrink:0;flex-direction:column;height:100%;padding:16px 10px;background:#0f2f27;color:#b8cbc2}
.ad-logo{display:flex;align-items:center;gap:9px;padding:2px 8px 4px;color:#fff;font-size:1.05rem;font-weight:800;letter-spacing:-.03em;text-decoration:none}
.ad-mark{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#fff}
.ad-papel{margin:0 8px 6px;padding-left:39px;color:#7f9a8e;font-size:.75rem;font-weight:600}
.ad-nv{display:flex;flex-direction:column;gap:2px;flex:1;min-height:0;overflow-y:auto;padding:4px 0 12px}
.ad-gh{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:12px;padding:6px 10px;border:0;background:none;color:#7f9a8e;font-size:.7rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;cursor:pointer}
.ad-gh svg{transition:rotate .15s}
.ad-gh[aria-expanded="false"] svg{rotate:-90deg}
.ad-it{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;color:#b8cbc2;font-size:.9rem;font-weight:500;text-decoration:none}
.ad-it:hover{background:#16413a;color:#fff}
.ad-it[aria-current="page"]{background:#16413a;color:#fff;font-weight:600;box-shadow:inset 2px 0 0 #3fbf75}
.ad-it svg{flex:none;opacity:.85}
.ad-b{min-width:20px;margin-left:auto;padding:1px 6px;border-radius:999px;background:#3fbf75;color:#06281a;font-size:.7rem;font-weight:800;text-align:center}
.ad-b-w{background:#f5c04a}
.ad-rodape{margin-top:auto;padding:12px 8px 0;border-top:1px solid rgba(255,255,255,.1)}
.ad-volta{display:flex;align-items:center;gap:8px;padding:8px 2px;color:#b8cbc2;font-size:.85rem;text-decoration:none}
.ad-volta:hover{color:#fff}
.ad-eu{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;color:#fff;font-size:.8rem;font-weight:600}
.ad-av{display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:50%;background:#16413a;color:#fff;font-weight:800}
@media (prefers-reduced-motion:reduce){.ad-gh svg{transition:none}}
TWISISA_AV3_EOF
fi

echo "Admin v3 aplicado."
echo "Agora:  npm run migrate status   e, se houver pendentes,  npm run migrate"

# Git
if [ -d .git ]; then
  git add -A lib components app database tests State.md
  git commit -m "Admin v3: menu por grupos, importação do Jonas para a Revisão, Materiais em passos, seletor personalizado, Plus arquivado, migração renumerada"
  git push origin main
fi
