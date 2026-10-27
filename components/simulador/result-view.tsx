import Link from 'next/link'
import { Check, ChevronDown, Clock, X } from 'lucide-react'
import { MathText, plainExcerpt } from '@/lib/math-text'
import { ExplainButton } from '@/components/simulador/jonas-explain'
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
      <p className="text-[15px] font-medium leading-6"><MathText text={item.statement} /></p>
      <ul className="space-y-2">
        {item.options.map((option, i) => {
          const right = fb?.correctOptionId === option.id
          const mine = item.selectedOptionId === option.id
          return (
            <li key={option.id} className={`flex items-start gap-3 rounded-[14px] p-3 text-sm ${right ? 'bg-[#e4f4ea]' : mine ? 'bg-[#fbeaea]' : 'bg-[#f6f8f3]'}`}>
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${right ? 'bg-[#2f8a5a] text-white' : mine ? 'bg-[#c24b4b] text-white' : 'bg-[#edf3ee] text-[#1d4d41]'}`}>{LETTERS[i]}</span>
              <span className="min-w-0 flex-1 space-y-2">
                {option.image && <QuestionImage image={option.image} zoomable={false} />}
                {option.body && <span className="block leading-6"><MathText text={option.body} /></span>}
                {(right || mine) && <span className={`block text-xs font-semibold ${right ? 'text-[#1f6b45]' : 'text-[#9a3030]'}`}>{right ? (mine ? 'A tua resposta · certa' : 'Resposta certa') : 'A tua resposta'}</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {!item.selectedOptionId && <p className="text-xs font-semibold text-[#805f19]">Não respondeste a esta questão.</p>}
      {item.selectedOptionId && fb && <ExplainButton attemptId={attemptId} position={item.position} officialExplanation={fb.explanation} images={fb.images} />}
    </div>
  )
}

export function ResultView({ result }: { result: Result }) {
  const pct = percent(result.correct, result.total)
  const message = verdict(pct)
  const wrong = result.total - result.correct
  return (
    <div className="max-w-[720px] space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-white to-[#f3f6f0] shadow-[0_1px_2px_rgba(20,50,40,0.05)] p-5 sm:p-7">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Ring pct={pct} />
            <span className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold tracking-[-0.04em]">{pct}%</span></span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1d4d41]">{MODE_META[result.mode].label}{result.variant ? ` · ${result.variant}` : result.subject ? ` · ${result.subject}` : ''}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{message.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[#68736a]">{message.text}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {[
            ['Acertos', `${result.correct}/${result.total}`],
            ['Pontos', `+${formatPoints(result.points)}`],
            ['Nota', `${formatGrade(result.grade)}/20`],
            ['Tempo', formatDuration(result.seconds)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[16px] bg-[#1d4d41]/[0.05] px-2 py-3">
              <dt className="text-[11px] font-medium text-[#7d857e]">{label}</dt>
              <dd className="mt-0.5 text-base font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {result.timedOut && <p className="mt-3 flex items-center gap-2 text-xs text-[#805f19]"><Clock size={14} aria-hidden />O tempo acabou e a prova foi entregue automaticamente.</p>}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <RestartButton mode={result.mode === 'revisao' ? 'pratica' : result.mode} subjectId={result.subjectId} variant={result.variant} topicId={result.topicId} label="Nova ronda" primary />
          {wrong > 0 && <RestartButton mode="revisao" subjectId={result.subjectId} label="Rever os meus erros" />}
          <Link href="/aluno/simulador" className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#68716a] hover:text-[#1d4d41]">Voltar ao Simulador</Link>
        </div>
      </section>

      {result.bySubject.length > 1 && (
        <section className="rounded-2xl bg-gradient-to-br from-white to-[#f3f6f0] shadow-[0_1px_2px_rgba(20,50,40,0.05)] p-5">
          <h3 className="text-sm font-semibold">Por disciplina</h3>
          <ul className="mt-3 space-y-3">
            {result.bySubject.map((entry) => (
              <li key={entry.subject}>
                <div className="flex justify-between text-sm"><span>{entry.subject}</span><span className="text-[#7d857e]">{entry.correct}/{entry.total}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e3e8de]"><div className="h-full rounded-full bg-[#1d4d41]" style={{ width: `${percent(entry.correct, entry.total)}%` }} /></div>
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
              <li key={item.position} className="overflow-hidden rounded-2xl bg-gradient-to-br from-white to-[#f3f6f0] shadow-[0_1px_2px_rgba(20,50,40,0.05)]">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-white ${ok ? 'bg-[#2f8a5a]' : 'bg-[#c24b4b]'}`}>{ok ? <Check size={15} aria-hidden /> : <X size={15} aria-hidden />}</span>
                    <span className="min-w-0 flex-1 truncate text-sm"><span className="font-semibold">{item.position + 1}.</span> {plainExcerpt(item.statement, 90)}</span>
                    <ChevronDown size={18} className="shrink-0 text-[#9aa29b] transition-transform group-open:rotate-180" aria-hidden />
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
