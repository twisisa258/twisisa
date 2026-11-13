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
