'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, Plus, Trash2 } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { Passos, type Passo } from '@/components/admin/passos'
import { ListaEscolha } from '@/components/ui/lista-escolha'
import { QuestionStatement } from '@/components/simulador/question-statement'
import { saveQuestion } from '../actions'
import { criarTemaRapido, importarQuestoesSessao } from './actions'

export type ConfigSessao = {
  modo: 'manual' | 'importar'
  onde: string
  track: string
  institutionId: string
  instituicao: string
  subjectId: string
  disciplina: string
  variant: string
  nivel: string
  nivelLabel: string
  podePublicar: boolean
}

const campo = 'w-full rounded-xl border border-[#dfe3d9] bg-white px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-[#8a928c] focus:border-marca focus:ring-2 focus:ring-marca/10'
const botao = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40'
const LETRAS = ['A', 'B', 'C', 'D', 'E']

export function SessaoQuestoes({ cfg, temas, anos, linkDisciplina, linkTudo }: { cfg: ConfigSessao; temas: { id: string; name: string }[]; anos: { value: string; label: string }[]; linkDisciplina: string; linkTudo: string }) {
  const [guardadas, setGuardadas] = useState(0)
  const etiquetas = [cfg.instituicao, cfg.disciplina, cfg.variant ? `Variante ${cfg.variant}` : '', cfg.nivelLabel].filter(Boolean)
  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-[#d5e5da] bg-[#f4f8f5] p-4">
        <div className="flex flex-wrap gap-2">
          {etiquetas.map((texto) => (
            <span key={texto} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-marca shadow-sm">{texto}</span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href={linkDisciplina} className="font-semibold text-marca hover:underline">Gerir outra disciplina</Link>
          <Link href={linkTudo} className="text-texto-2 hover:underline">Mudar tudo</Link>
          {cfg.modo === 'manual' && guardadas > 0 && <span className="ml-auto text-xs font-semibold text-texto-2">Nesta sessão: {guardadas} {guardadas === 1 ? 'guardada' : 'guardadas'}</span>}
        </div>
      </section>
      {cfg.modo === 'manual' ? <Manual cfg={cfg} temasIniciais={temas} anos={anos} aoGuardar={() => setGuardadas((n) => n + 1)} /> : <Importar cfg={cfg} />}
    </div>
  )
}

function Manual({ cfg, temasIniciais, anos, aoGuardar }: { cfg: ConfigSessao; temasIniciais: { id: string; name: string }[]; anos: { value: string; label: string }[]; aoGuardar: () => void }) {
  const feedback = useFeedback()
  const [temas, setTemas] = useState(temasIniciais)
  const [topicId, setTopicId] = useState('')
  const [novoTema, setNovoTema] = useState('')
  const [statement, setStatement] = useState('')
  const [opcoes, setOpcoes] = useState(['', '', '', ''])
  const [certa, setCerta] = useState<number | null>(null)
  const [ano, setAno] = useState('')
  const [explicacao, setExplicacao] = useState('')
  const [indice, setIndice] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')

  const preenchidas = opcoes.filter((opcao) => opcao.trim()).length
  const certaValida = certa !== null && !!opcoes[certa]?.trim()

  async function criarTema() {
    const resposta = await criarTemaRapido(cfg.subjectId, novoTema)
    if (!resposta.ok) { feedback.error(resposta.message); return }
    setTemas((lista) => (lista.some((item) => item.id === resposta.id) ? lista : [...lista, { id: resposta.id, name: resposta.name }]))
    setTopicId(resposta.id)
    setNovoTema('')
  }

  async function guardar(intencao: 'draft' | 'publish') {
    setOcupado(true)
    setAviso('')
    try {
      const dados = new FormData()
      dados.set('intent', intencao)
      dados.set('track', cfg.track)
      dados.set('institutionId', cfg.institutionId)
      dados.set('subjectId', cfg.subjectId)
      dados.set('topicId', topicId)
      dados.set('variant', cfg.variant)
      dados.set('difficulty', cfg.nivel)
      dados.set('origin', 'admin')
      dados.set('answerSource', 'confirmada')
      dados.set('year', ano)
      dados.set('statement', statement)
      dados.set('explanation', explicacao)
      opcoes.forEach((opcao) => dados.append('option', opcao))
      if (certa !== null) dados.set('correct', String(certa))
      const resposta = await saveQuestion(dados)
      if (!resposta.ok) { feedback.error(resposta.message); return }
      aoGuardar()
      setAviso(intencao === 'publish' ? 'Publicada. Podes criar a seguinte.' : ano ? 'Guardada como rascunho. Podes criar a seguinte.' : 'Guardada como rascunho (sem ano: vai para a Revisão). Podes criar a seguinte.')
      setStatement(''); setOpcoes(['', '', '', '']); setCerta(null); setAno(''); setExplicacao(''); setIndice(1)
    } finally {
      setOcupado(false)
    }
  }

  const passos: Passo[] = [
    {
      id: 'tema',
      titulo: 'Qual é o tema?',
      ajuda: 'Cada questão pede um tema. Se não existir, cria-o aqui.',
      pronto: !!topicId,
      conteudo: (
        <div className="grid gap-3">
          <ListaEscolha rotulo="Tema" itens={temas.map((item) => ({ id: item.id, label: item.name }))} valor={topicId || null} onChange={setTopicId} procuraDepois={8} vazio="Esta disciplina ainda não tem temas. Cria o primeiro abaixo." />
          <div className="flex gap-2">
            <input value={novoTema} onChange={(event) => setNovoTema(event.target.value)} placeholder="Novo tema (ex.: Equações)" aria-label="Nome do novo tema" maxLength={120} className={campo} />
            <button type="button" disabled={novoTema.trim().length < 2} onClick={criarTema} className={`${botao} shrink-0 border border-[#c9d7cd] bg-white text-marca hover:bg-[#f1f4ef]`}><Plus size={16} aria-hidden="true" /> Criar</button>
          </div>
        </div>
      ),
    },
    {
      id: 'enunciado',
      titulo: 'Qual é o enunciado?',
      ajuda: 'Fórmulas entre $ $, por exemplo $x^2 + 1$.',
      pronto: statement.trim().length >= 3,
      conteudo: (
        <div className="grid gap-3">
          {aviso && <p role="status" className="rounded-xl bg-[#e6f0e9] px-3.5 py-2.5 text-sm font-semibold text-marca">{aviso}</p>}
          <textarea value={statement} onChange={(event) => setStatement(event.target.value)} rows={5} maxLength={12000} placeholder="Escreve o enunciado" aria-label="Enunciado" className={campo} />
          {statement.trim() && (
            <div className="rounded-2xl bg-[#fafbf8] p-3.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#9aa39c]">Como fica</p>
              <QuestionStatement text={statement} compact />
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'opcoes',
      titulo: 'Quais são as opções?',
      ajuda: 'Escreve pelo menos duas e toca no círculo da resposta certa.',
      pronto: preenchidas >= 2 && certaValida,
      conteudo: (
        <div className="grid gap-2.5">
          {opcoes.map((opcao, i) => (
            <div key={i} className="flex items-center gap-2">
              <button type="button" role="radio" aria-checked={certa === i} aria-label={`Marcar ${LETRAS[i]} como a certa`} onClick={() => setCerta(i)} className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${certa === i ? 'border-marca bg-marca text-white' : 'border-[#c9d7cd] bg-white text-marca'}`}>{LETRAS[i]}</button>
              <input value={opcao} onChange={(event) => setOpcoes((lista) => lista.map((item, j) => (j === i ? event.target.value : item)))} maxLength={2000} placeholder={`Opção ${LETRAS[i]}`} aria-label={`Opção ${LETRAS[i]}`} className={campo} />
              {opcoes.length > 2 && (
                <button type="button" aria-label={`Remover opção ${LETRAS[i]}`} onClick={() => { setOpcoes((lista) => lista.filter((_, j) => j !== i)); setCerta((atual) => (atual === null ? null : atual === i ? null : atual > i ? atual - 1 : atual)) }} className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#8a928c] hover:bg-[#eef0ea]"><Trash2 size={16} aria-hidden="true" /></button>
              )}
            </div>
          ))}
          {opcoes.length < 5 && <button type="button" onClick={() => setOpcoes((lista) => [...lista, ''])} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#c9d7cd] text-sm font-semibold text-marca hover:bg-[#f1f4ef]"><Plus size={16} aria-hidden="true" /> Mais uma opção</button>}
        </div>
      ),
    },
    {
      id: 'extra',
      titulo: 'Qual é o ano do exame?',
      ajuda: 'Sem ano, a questão guarda-se na mesma e vai para a Revisão. A explicação é opcional.',
      pronto: true,
      conteudo: (
        <div className="grid gap-4">
          <ListaEscolha rotulo="Ano" itens={anos.map((item) => ({ id: item.value, label: item.label }))} valor={ano} onChange={setAno} procuraDepois={6} vazio="" />
          <label className="text-sm font-medium">Explicação (opcional)
            <textarea value={explicacao} onChange={(event) => setExplicacao(event.target.value)} rows={3} maxLength={4000} placeholder="Porque é que esta é a resposta certa" className={`${campo} mt-1`} />
          </label>
        </div>
      ),
    },
  ]

  return (
    <Passos
      passos={passos}
      indice={indice}
      onIndice={setIndice}
      final={
        <div className="grid w-full gap-2 sm:flex">
          <button type="button" disabled={ocupado} onClick={() => guardar('draft')} className={`${botao} border border-[#c9d7cd] bg-white text-marca hover:bg-[#f1f4ef]`}>{ocupado ? 'A guardar…' : 'Guardar rascunho'}</button>
          <button type="button" disabled={ocupado || !cfg.podePublicar} onClick={() => guardar('publish')} className={`${botao} bg-marca text-white hover:bg-marca-escura`}>Publicar</button>
          {!cfg.podePublicar && <p className="text-xs text-texto-2 sm:self-center">Sem variante só se guarda como rascunho.</p>}
        </div>
      }
    />
  )
}

function Importar({ cfg }: { cfg: ConfigSessao }) {
  const [indice, setIndice] = useState(0)
  const [ficheiro, setFicheiro] = useState<File | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; message: string } | null>(null)

  async function importar() {
    if (!ficheiro) return
    setOcupado(true)
    setResultado(null)
    try {
      const dados = new FormData()
      dados.set('csv', ficheiro)
      dados.set('onde', cfg.onde)
      dados.set('subjectId', cfg.subjectId)
      dados.set('variant', cfg.variant)
      dados.set('nivel', cfg.nivel)
      const resposta = await importarQuestoesSessao(dados)
      setResultado({ ok: resposta.ok, message: resposta.message ?? '' })
      if (resposta.ok) setFicheiro(null)
    } finally {
      setOcupado(false)
    }
  }

  const passos: Passo[] = [
    {
      id: 'modelo',
      titulo: 'Prepara o ficheiro',
      ajuda: `Um CSV com as questões de ${cfg.disciplina}. A instituição, a disciplina e o nível já estão escolhidos: não vão no ficheiro.`,
      pronto: true,
      conteudo: (
        <div className="grid gap-3">
          <ul className="grid gap-1 rounded-2xl bg-[#fafbf8] p-4 text-xs leading-5 text-[#526057]">
            <li><strong>Obrigatórias:</strong> statement, option_a, option_b, correct (A a E).</li>
            <li><strong>Opcionais:</strong> option_c a option_e, topic_name, year, variant, explanation, origin_label.</li>
            <li>Se faltar o ano, o tema ou a variante, a questão entra como rascunho e vai para a <strong>Revisão</strong>. Recebes um aviso com o resumo.</li>
            <li>O modelo traz 2 linhas de exemplo marcadas <strong>[EXEMPLO]</strong>: apaga-as antes de importar.</li>
          </ul>
          <Link href="/admin/questoes/nova/modelo" prefetch={false} className="inline-flex items-center gap-2 text-sm font-semibold text-marca hover:underline"><Download size={16} aria-hidden="true" /> Descarregar o modelo</Link>
        </div>
      ),
    },
    {
      id: 'ficheiro',
      titulo: 'Escolhe o ficheiro',
      ajuda: 'Até 500 questões por ficheiro.',
      pronto: !!ficheiro,
      conteudo: (
        <div className="grid gap-3">
          <input type="file" accept=".csv,text/csv" aria-label="Ficheiro CSV" onChange={(event) => { setFicheiro(event.target.files?.[0] ?? null); setResultado(null) }} className="block w-full rounded-xl border border-[#dfe3d9] bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#edf3ee] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-marca" />
          {resultado && (
            <div role={resultado.ok ? 'status' : 'alert'} className={`rounded-2xl px-4 py-3 text-sm leading-6 ${resultado.ok ? 'bg-[#e6f0e9] text-marca' : 'bg-[#fbeaea] text-[#a33a3a]'}`}>
              <p>{resultado.message}</p>
              {resultado.ok && <Link href="/admin/revisao" className="mt-1 inline-block font-semibold underline">Ver a revisão</Link>}
            </div>
          )}
        </div>
      ),
    },
  ]

  return <Passos passos={passos} indice={indice} onIndice={setIndice} onConcluir={importar} rotuloFinal="Importar" ocupado={ocupado} />
}
