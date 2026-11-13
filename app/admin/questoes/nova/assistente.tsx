'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Passos, type Passo } from '@/components/admin/passos'
import { ListaEscolha, type ItemEscolha } from '@/components/ui/lista-escolha'
import { posicaoDisciplina, precisaVariante } from '@/lib/regras'

type Escolha = { value: string; label: string }
type Disciplina = { id: string; name: string; scopes: string[] }
type Variante = { name: string; subjectId: string }
type Inicial = { modo: string; onde: string; subjectId: string; variant: string; nivel: string; passo: '' | 'disciplina' }

const nomeCurto = (rotulo: string) => rotulo.split(' · ')[0]

// Os passos antes de criar: Tipo → Instituição → Disciplina → Variante → Nível. Feito uma vez por sessão.
export function AssistenteSessao({
  instituicoes,
  disciplinas,
  variantes,
  idsComVariantes,
  inicial,
}: {
  instituicoes: Escolha[]
  disciplinas: Disciplina[]
  variantes: Variante[]
  idsComVariantes: string[]
  inicial: Inicial
}) {
  const router = useRouter()
  const [modo, setModo] = useState(inicial.modo)
  const [onde, setOnde] = useState(inicial.onde)
  const [subjectId, setSubjectId] = useState(inicial.subjectId)
  const [temVariante, setTemVariante] = useState<'sim' | 'nao' | ''>(inicial.variant ? 'sim' : '')
  const [variant, setVariant] = useState(inicial.variant)
  const [nivel, setNivel] = useState(inicial.nivel)

  const track = onde === '10' || onde === '12' ? onde : onde ? 'admissao' : ''
  const chave = track === 'admissao' ? `inst:${onde}` : track
  const doOnde = disciplinas.filter((item) => chave && item.scopes.includes(chave)).sort((a, b) => posicaoDisciplina(a.name) - posicaoDisciplina(b.name))
  const dessaDisciplina = variantes.filter((item) => item.subjectId === subjectId)
  const pedeVariante = precisaVariante(track, track === 'admissao' ? onde : '', idsComVariantes, dessaDisciplina.length > 0)

  const itensOnde: ItemEscolha[] = [
    ...instituicoes.map((item) => ({ id: item.value, label: nomeCurto(item.label), detail: item.label.split(' · ').slice(1).join(' · ') || null })),
    { id: '12', label: '12ª classe' },
    { id: '10', label: '10ª classe' },
  ]

  const passos: Passo[] = [
    {
      id: 'tipo',
      titulo: 'Como vais criar as questões?',
      pronto: !!modo,
      conteudo: (
        <ListaEscolha
          rotulo="Tipo"
          itens={[
            { id: 'importar', label: 'Importar', detail: 'Um ficheiro CSV com várias questões' },
            { id: 'manual', label: 'Criar manualmente', detail: 'Uma questão de cada vez' },
          ]}
          valor={modo || null}
          onChange={setModo}
          vazio=""
        />
      ),
    },
    {
      id: 'onde',
      titulo: 'Qual é a instituição?',
      ajuda: 'Também podes escolher uma classe (10ª ou 12ª).',
      pronto: !!onde,
      conteudo: (
        <ListaEscolha
          rotulo="Instituição"
          itens={itensOnde}
          valor={onde || null}
          onChange={(id) => {
            if (id !== onde) { setSubjectId(''); setVariant(''); setTemVariante('') }
            setOnde(id)
          }}
          vazio="Ainda não há instituições. Cria-as em Instituições."
        />
      ),
    },
    {
      id: 'disciplina',
      titulo: 'Qual é a disciplina?',
      pronto: !!subjectId,
      conteudo: (
        <ListaEscolha
          rotulo="Disciplina"
          itens={doOnde.map((item) => ({ id: item.id, label: item.name }))}
          valor={subjectId || null}
          onChange={(id) => {
            if (id !== subjectId) { setVariant(''); setTemVariante('') }
            setSubjectId(id)
          }}
          procuraDepois={12}
          vazio="Esta escolha ainda não tem disciplinas."
        />
      ),
    },
    ...(pedeVariante
      ? [
          {
            id: 'variante',
            titulo: 'A disciplina tem variante?',
            ajuda: 'Na UEM o exame tem variantes I, II e III. Sem variante, a questão fica na Revisão.',
            pronto: temVariante === 'nao' || (temVariante === 'sim' && !!variant),
            conteudo: (
              <div className="grid gap-4">
                <ListaEscolha
                  rotulo="Tem variante?"
                  itens={[{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }]}
                  valor={temVariante || null}
                  onChange={(id) => { setTemVariante(id as 'sim' | 'nao'); if (id === 'nao') setVariant('') }}
                  vazio=""
                />
                {temVariante === 'sim' && (
                  <div className="grid gap-2">
                    <p className="text-sm font-semibold">Qual?</p>
                    <ListaEscolha rotulo="Variante" itens={dessaDisciplina.map((item) => ({ id: item.name, label: `Variante ${item.name}` }))} valor={variant || null} onChange={setVariant} vazio="Esta disciplina ainda não tem variantes." />
                  </div>
                )}
              </div>
            ),
          } satisfies Passo,
        ]
      : []),
    {
      id: 'nivel',
      titulo: 'Qual é o nível destas questões?',
      pronto: !!nivel,
      conteudo: <ListaEscolha rotulo="Nível" itens={[{ id: 'facil', label: 'Fácil' }, { id: 'media', label: 'Médio' }, { id: 'dificil', label: 'Difícil' }]} valor={nivel || null} onChange={setNivel} vazio="" />,
    },
  ]

  const inicio = inicial.passo === 'disciplina' ? Math.max(0, passos.findIndex((item) => item.id === 'disciplina')) : 0
  const [indice, setIndice] = useState(inicio)

  function concluir() {
    const query = new URLSearchParams({ modo, onde, disc: subjectId, nivel, ok: '1' })
    if (pedeVariante && temVariante === 'sim' && variant) query.set('var', variant)
    router.push(`/admin/questoes/nova?${query.toString()}`)
  }

  return <Passos passos={passos} indice={indice} onIndice={setIndice} onConcluir={concluir} rotuloFinal="Começar" />
}
