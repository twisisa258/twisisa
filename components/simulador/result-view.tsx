import Link from 'next/link'
import { QuestionStatement } from '@/components/simulador/question-statement'
import { Check, ChevronDown, Clock, X } from 'lucide-react'
import { MathText, plainExcerpt } from '@/lib/math-text'
import { ExplainButton } from '@/components/simulador/jonas-explain'
import { MarkLater } from '@/components/simulador/mark-later'
import { QuestionImage } from '@/components/simulador/question-image'
import { RestartButton } from '@/components/simulador/restart-button'
import { MODE_META, formatDuration, formatGrade, formatPoints, percent, verdict, type PlayItem } from '@/lib/simulator-shared'
import type { getResult } from '@/lib/simulator'

type Result = NonNullable<Awaited<ReturnType<typeof getResult>>>
const LETTERS = ['A', 'B', 'C', 'D', 'E']

function Ring({ pct }: { pct: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  return (
    <svg viewBox="0 0 120 120" className="size-32 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="#e3e8de" strokeWidth="10" />
      <circle cx="60" cy="60" r={radius} fill="none" stroke={pct >= 60 ? '#2f8a5a' : pct >= 40 ? '#c8922a' : '#c24b4b'} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct / 100)} />
    </svg>
  )
}

function Review({ item, attemptId }: { item: PlayItem; attemptId: string }) {
  const fb = item.feedback
  return (
    <div className="space-y-3 border-t border-black/[0.05] px-4 py-4">
      {item.images.map((image, i) => <QuestionImage key={image.url + i} image={image} />)}
      <QuestionStatement text={item.statement} compact />
      <ul className="space-y-2">
        {item.options.map((option, i) => {
          const right = fb?.correctOptionId === option.id
          const mine = item.selectedOptionId === option.id
          return (
            <li key={option.id} className={`flex items-start gap-3 rounded-[14px] p-3 text-sm ${right ? 'bg-sucesso-suave' : mine ? 'bg-erro-suave' : 'bg-superficie-2'}`}>
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${right ? 'bg-sucesso text-white' : mine ? 'bg-erro text-white' : 'bg-superficie-2 text-marca'}`}>{LETTERS[i]}</span>
              <span className="min-w-0 flex-1 space-y-2">
                {option.image && <QuestionImage image={option.image} zoomable={false} />}
                {option.body && <span className="block leading-6"><MathText text={option.body} /></span>}
                {(right || mine) && <span className={`block text-xs font-semibold ${right ? 'text-sucesso-texto' : 'text-erro-texto'}`}>{right ? (mine ? 'A tua resposta · certa' : 'Resposta certa') : 'A tua resposta'}</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {!item.selectedOptionId && <p className="text-xs font-semibold text-aviso-texto">Não respondeste a esta questão.</p>}
      <div className="flex flex-wrap items-center gap-2">
        {item.selectedOptionId && fb && <ExplainButton attemptId={attemptId} position={item.position} officialExplanation={fb.explanation} images={fb.images} />}
        <MarkLater questionId={item.questionId} initial={item.marked} />
      </div>
    </div>
  )
}

export function ResultView({ result }: { result: Result }) {
  // O anel e a mensagem seguem a nota (0 a 20): é o número que o estudante vai ter no exame.
  const pct = Math.max(0, Math.min(100, Math.round(result.grade * 5)))
  const message = verdict(pct)
  const wrong = result.total - result.correct
  return (
    <div className="max-w-[720px] space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-white to-marca-suave shadow-[0_1px_2px_rgba(20,50,40,0.05)] p-5 sm:p-7">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Ring pct={pct} />
            <span className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold leading-none tracking-[-0.04em]">{formatGrade(result.grade)}</span><span className="mt-1 text-xs font-semibold text-texto-2">de 20</span></span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-marca">{MODE_META[result.mode].label}{result.variant ? ` · ${result.variant}` : result.subject ? ` · ${result.subject}` : ''}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{message.title}</h2>
            <p className="mt-1 text-sm leading-6 text-texto-2">{message.text}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ['Acertos', `${result.correct} de ${result.total}`],
            ['Pontos', `${formatPoints(result.points)} de ${formatPoints(result.pointsPossible)}`],
            ['Tempo', formatDuration(result.seconds)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[16px] bg-marca/[0.05] px-2 py-3">
              <dt className="text-[11px] font-medium text-texto-2">{label}</dt>
              <dd className="mt-0.5 text-base font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-5 text-texto-2">Nota = 20 × pontos ganhos ÷ pontos possíveis. Questões que já viste e dicas pedidas valem menos pontos.</p>
        {result.timedOut && <p className="mt-3 flex items-center gap-2 text-xs text-aviso-texto"><Clock size={14} aria-hidden />O tempo acabou e a prova foi entregue automaticamente.</p>}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <RestartButton mode={result.mode === 'revisao' ? 'pratica' : result.mode} subjectId={result.subjectId} variant={result.variant} topicId={result.topicId} label="Nova ronda" primary />
          {wrong > 0 && <RestartButton mode="revisao" subjectId={result.subjectId} label="Rever os meus erros" />}
          <Link href="/aluno/ranking" className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-marca hover:underline">Ver ranking</Link>
          <Link href="/aluno/simulador" className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-texto-2 hover:text-marca">Voltar ao Simulador</Link>
        </div>
      </section>

      {result.bySubject.length > 1 && (
        <section className="rounded-2xl bg-gradient-to-br from-white to-marca-suave shadow-[0_1px_2px_rgba(20,50,40,0.05)] p-5">
          <h3 className="text-sm font-semibold">Por disciplina</h3>
          <ul className="mt-3 space-y-3">
            {result.bySubject.map((entry) => (
              <li key={entry.subject}>
                <div className="flex justify-between text-sm"><span>{entry.subject}</span><span className="text-texto-2">{entry.correct}/{entry.total}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-linha"><div className="h-full rounded-full bg-marca" style={{ width: `${percent(entry.correct, entry.total)}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Revisão das respostas">
        <h3 className="px-1 text-sm font-semibold">Revê as respostas</h3>
        <ul className="mt-3 space-y-2.5">
          {result.items.map((item) => {
            const ok = item.feedback?.isCorrect
            return (
              <li key={item.position} className="overflow-hidden rounded-2xl bg-gradient-to-br from-white to-marca-suave shadow-[0_1px_2px_rgba(20,50,40,0.05)]">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-white ${ok ? 'bg-sucesso' : 'bg-erro'}`}>{ok ? <Check size={15} aria-hidden /> : <X size={15} aria-hidden />}</span>
                    <span className="min-w-0 flex-1 truncate text-sm"><span className="font-semibold">{item.position + 1}.</span> {plainExcerpt(item.statement, 90)}</span>
                    <ChevronDown size={18} className="shrink-0 text-texto-2 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <Review item={item} attemptId={result.id} />
                </details>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
