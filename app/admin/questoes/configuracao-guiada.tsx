'use client'

import { ListaEscolha, type ItemEscolha } from '@/components/ui/lista-escolha'
import { DISCIPLINAS_GERAIS, etapaEmFalta, posicaoDisciplina, precisaVariante, type ConfigQuestao, type EtapaConfig } from '@/lib/regras'
import type { Choice, EditorSubject, EditorTopic, EditorVariant } from './question-form'

const TITULOS: Record<EtapaConfig, string> = {
  onde: 'Para que instituição?',
  disciplina: 'Que disciplina?',
  variante: 'Que variante?',
  tema: 'Que tema?',
}
const ROTULOS: Record<EtapaConfig, string> = { onde: 'Instituição', disciplina: 'Disciplina', variante: 'Variante', tema: 'Tema' }
const ORDEM: EtapaConfig[] = ['onde', 'disciplina', 'variante', 'tema']

const nomeCurto = (rotulo: string) => rotulo.split(' · ')[0]

// Configuração de uma questão, um passo por ecrã e uma escolha por passo: Instituição → Disciplina → Variante (só UEM) → Tema.
// Cada escolha avança sozinha. Quem já escolheu pode tocar numa escolha anterior para a mudar.
export function ConfiguracaoGuiada({
  valor,
  subjects,
  topics,
  variants,
  institutions,
  variantInstitutionIds,
  forcar,
  onChange,
  onForcar,
}: {
  valor: ConfigQuestao
  subjects: EditorSubject[]
  topics: EditorTopic[]
  variants: EditorVariant[]
  institutions: Choice[]
  variantInstitutionIds: string[]
  forcar: EtapaConfig | null
  onChange: (parcial: Partial<ConfigQuestao>) => void
  onForcar: (etapa: EtapaConfig | null) => void
}) {
  const scopeKey = valor.track === 'admissao' ? (valor.institutionId ? `inst:${valor.institutionId}` : '') : valor.track
  const disciplinas = subjects.filter((item) => scopeKey && item.scopes.includes(scopeKey)).sort((a, b) => posicaoDisciplina(a.name) - posicaoDisciplina(b.name))
  const variantes = variants.filter((item) => item.subjectId === valor.subjectId && item.active)
  const pedeVariante = precisaVariante(valor.track, valor.institutionId, variantInstitutionIds, variantes.length > 0)
  const temas = topics.filter((item) => item.subjectId === valor.subjectId)

  const falta = etapaEmFalta(valor, variantInstitutionIds, variantes.length > 0)
  const etapa: EtapaConfig = forcar ?? falta ?? 'tema'
  const passos = ORDEM.filter((item) => item !== 'variante' || pedeVariante)

  const itensOnde: ItemEscolha[] = [
    ...institutions.map((item) => ({ id: `inst:${item.value}`, label: nomeCurto(item.label), detail: item.label.split(' · ').slice(1).join(' · ') || null })),
    { id: '12', label: '12ª classe' },
    { id: '10', label: '10ª classe' },
  ]
  const itensDisciplina: ItemEscolha[] = disciplinas.map((item) => ({ id: item.id, label: item.name }))
  const itensVariante: ItemEscolha[] = variantes.map((item) => ({ id: item.name, label: `Variante ${item.name}` }))
  const itensTema: ItemEscolha[] = temas.map((item) => ({ id: item.id, label: item.name }))

  function escolherOnde(id: string) {
    const track = id === '10' || id === '12' ? id : 'admissao'
    const institutionId = id.startsWith('inst:') ? id.slice(5) : ''
    const mudou = track !== valor.track || institutionId !== valor.institutionId
    onChange(mudou ? { track, institutionId, subjectId: '', topicId: '', variant: '' } : {})
    onForcar(null)
  }
  function escolherDisciplina(id: string) {
    onChange(id !== valor.subjectId ? { subjectId: id, topicId: '', variant: '' } : {})
    onForcar(null)
  }

  const ondeValor = valor.track === 'admissao' ? (valor.institutionId ? `inst:${valor.institutionId}` : null) : valor.track || null
  const escolhido: Record<EtapaConfig, string> = {
    onde: valor.track === 'admissao' ? nomeCurto(institutions.find((item) => item.value === valor.institutionId)?.label ?? '') : valor.track ? `${valor.track}ª classe` : '',
    disciplina: subjects.find((item) => item.id === valor.subjectId)?.name ?? '',
    variante: valor.variant ? `Variante ${valor.variant}` : '',
    tema: topics.find((item) => item.id === valor.topicId)?.name ?? '',
  }
  const indice = passos.indexOf(etapa)

  return (
    // Enter na pesquisa não pode enviar o formulário.
    <div className="grid gap-4" onKeyDown={(event) => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault() }}>
      <div className="grid gap-2">
        <ol aria-label="Configuração" className="flex gap-1.5">
          {passos.map((item, i) => (
            <li key={item} className={`h-1.5 flex-1 rounded-full ${i <= indice ? 'bg-marca' : 'bg-linha'}`} />
          ))}
        </ol>
        <p className="text-xs font-semibold text-texto-2">Passo {indice + 1} de {passos.length}</p>
      </div>

      {passos.slice(0, indice).some((item) => escolhido[item]) && (
        <div className="flex flex-wrap gap-2">
          {passos.slice(0, indice).filter((item) => escolhido[item]).map((item) => (
            <button key={item} type="button" onClick={() => onForcar(item)} aria-label={`Mudar ${ROTULOS[item].toLowerCase()}: ${escolhido[item]}`} className="min-h-9 rounded-full border border-linha bg-white px-3 text-xs font-semibold text-marca hover:bg-[#f1f4ef]">
              {escolhido[item]}
            </button>
          ))}
        </div>
      )}

      <h3 className="text-lg font-semibold leading-6">{etapa === 'onde' && valor.track && valor.track !== 'admissao' ? 'Para que classe?' : TITULOS[etapa]}</h3>

      {etapa === 'onde' && <ListaEscolha rotulo="Instituição ou classe" itens={itensOnde} valor={ondeValor} onChange={escolherOnde} vazio="Ainda não há instituições." />}
      {etapa === 'disciplina' && <ListaEscolha rotulo="Disciplina" itens={itensDisciplina} valor={valor.subjectId || null} onChange={escolherDisciplina} procuraDepois={12} vazio="Esta escolha ainda não tem disciplinas. Corre a migração das disciplinas gerais." />}
      {etapa === 'variante' && <ListaEscolha rotulo="Variante" itens={itensVariante} valor={valor.variant || null} onChange={(id) => { onChange({ variant: id }); onForcar(null) }} vazio="Esta disciplina ainda não tem variantes. Cria-as em Variantes." />}
      {etapa === 'tema' && <ListaEscolha rotulo="Tema" itens={itensTema} valor={valor.topicId || null} onChange={(id) => { onChange({ topicId: id }); onForcar(null) }} vazio="Esta disciplina ainda não tem temas. Cria-os em Temas." />}

      {forcar !== null && (
        <button type="button" onClick={() => onForcar(null)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3d9] px-4 text-sm font-semibold text-marca hover:bg-[#f1f4ef]">
          Voltar à questão
        </button>
      )}
      <p className="text-xs text-texto-2">As {DISCIPLINAS_GERAIS.length} disciplinas gerais valem para todas as instituições.</p>
    </div>
  )
}
