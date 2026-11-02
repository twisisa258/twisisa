import Link from 'next/link'
import { ArrowRight, ClipboardCheck, Compass, FileText } from 'lucide-react'
import { plural } from '@/lib/desafios-regras'
import type { ResumeItem } from '@/lib/aluno-inicio'
import { relativeTime } from '@/lib/relative-time'

function Anel({ answered, goal }: { answered: number; goal: number }) {
  const raio = 28
  const volta = 2 * Math.PI * raio
  const parte = goal > 0 ? Math.min(1, answered / goal) : 0
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" role="img" aria-label={`${Math.min(answered, goal)} de ${goal} questões hoje`} className="shrink-0 text-white">
      <circle cx="36" cy="36" r={raio} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="7" />
      <circle cx="36" cy="36" r={raio} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${volta * parte} ${volta}`} transform="rotate(-90 36 36)" />
      <text x="36" y="41" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">{Math.min(answered, goal)}/{goal}</text>
    </svg>
  )
}

// O destaque do dia: a meta e o próximo passo, num só sítio. É o único cartão grande e escuro do painel.
export function HojeHero({ goal, answered, resume }: { goal: number | null; answered: number; resume: ResumeItem | null }) {
  if (goal === null && !resume) return null
  const feita = goal !== null && answered >= goal
  const material = resume?.kind === 'material'
  const Icon = resume?.kind === 'orientacao' ? Compass : material ? FileText : ClipboardCheck
  const unidade = resume?.kind === 'orientacao' ? 'perguntas' : 'questões'
  const linha = 'flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-marca no-underline'

  const conteudo = resume ? (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-marca-suave"><Icon size={19} aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-5 text-texto">Continuar: {resume.title}</span>
        <span className="block truncate text-[12px] leading-4 text-texto-2">{resume.kind === 'material' ? relativeTime(resume.at) : `${resume.answered} de ${resume.total} ${unidade}`}</span>
      </span>
      <ArrowRight size={18} className="shrink-0" aria-hidden />
    </>
  ) : (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-marca-suave"><ClipboardCheck size={19} aria-hidden /></span>
      <span className="min-w-0 flex-1 text-[15px] font-semibold leading-5 text-texto">{feita ? 'Praticar mais' : 'Praticar agora'}</span>
      <ArrowRight size={18} className="shrink-0" aria-hidden />
    </>
  )

  return (
    <section aria-label="Hoje" className="rounded-[20px] bg-gradient-to-br from-[#2f7260] via-marca to-[#12362d] p-4 text-white shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.3)]">
      {goal !== null && (
        <div className="flex items-center gap-4">
          <Anel answered={answered} goal={goal} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">Hoje</p>
            <p className="mt-0.5 text-[17px] font-semibold leading-6">{feita ? 'Meta de hoje cumprida' : `Faltam ${plural(goal - answered, 'questão', 'questões')}`}</p>
          </div>
        </div>
      )}
      <div className={goal !== null ? 'mt-4' : ''}>
        {resume?.kind === 'material'
          ? <a href={resume.href} target="_blank" rel="noopener" className={linha}>{conteudo}</a>
          : <Link href={resume ? resume.href : '/aluno/simulador'} className={linha}>{conteudo}</Link>}
      </div>
    </section>
  )
}
