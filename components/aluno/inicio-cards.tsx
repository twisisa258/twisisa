import Link from 'next/link'
import { ArrowRight, ClipboardCheck, Compass } from 'lucide-react'
import { Ic } from '@/components/aluno/icons'
import type { OrientacaoCardData, ResumeItem, SubjectProgress } from '@/lib/aluno-inicio'
import { relativeTime } from '@/lib/relative-time'
import { percent } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'

// Cartões do Início (/aluno). Só mostram o que existe: sem dados, dizem que ainda não há (nunca um zero ou um exemplo inventado).

const soft = 'shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)]'
const card = cn('overflow-hidden rounded-[18px] bg-gradient-to-br from-white to-[#f6f8f3]', soft)
const sectionLabel = 'mb-[8px] ml-[4px] text-[11px] font-bold uppercase tracking-[0.12em] text-[#202321]'
const secondaryButton =
  'inline-flex h-[44px] items-center justify-center gap-[8px] rounded-[22px] bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] px-[18px] text-[14px] font-semibold text-[#1d4d41] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4d41]'

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-[16px] py-[14px]">
      <p className="text-[14px] font-medium text-[#202321]">{title}</p>
      <p className="mt-[2px] text-[12px] text-[#6b756e]">{text}</p>
    </div>
  )
}

/** Um só «Continuar»: orientação a meio, sessão do Simulador a meio ou o último material. */
export function ContinuarCard({ resume }: { resume: ResumeItem }) {
  const material = resume.kind === 'material'
  const Icon = resume.kind === 'orientacao' ? Compass : ClipboardCheck
  const pct = resume.kind === 'material' ? 0 : percent(resume.answered, resume.total)
  const unit = resume.kind === 'orientacao' ? 'perguntas' : 'questões'
  const buttonClass = 'mt-[14px] flex h-[48px] items-center justify-center gap-[8px] rounded-[24px] bg-white text-[15px] font-semibold text-[#1d4d41] no-underline'

  return (
    <section aria-label="Continuar" className={cn('rounded-[20px] bg-gradient-to-br from-[#2f7260] via-[#1d4d41] to-[#12362d] p-[16px] text-white', soft)}>
      <div className="flex items-center gap-[12px]">
        <span className="flex size-[44px] flex-none items-center justify-center rounded-[14px] bg-white/[0.16] text-white">
          {material ? <Ic name="file" /> : <Icon size={20} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-white/70">CONTINUAR</p>
          <p className="mt-[2px] truncate text-[16px] font-semibold">{resume.title}</p>
          <p className="mt-[2px] text-[12px] text-white/70">
            {resume.kind === 'material' ? relativeTime(resume.at) : `${resume.answered} de ${resume.total} ${unit}`}
          </p>
        </div>
      </div>
      {resume.kind !== 'material' && (
        <div role="progressbar" aria-label="Progresso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-[12px] h-[6px] overflow-hidden rounded-[3px] bg-white/[0.2]">
          <div className="h-full rounded-[3px] bg-white" style={{ width: `${pct}%` }} />
        </div>
      )}
      {resume.kind === 'material' ? (
        <a href={resume.href} target="_blank" rel="noopener" className={buttonClass}>
          Abrir <Ic name="up" size={16} />
        </a>
      ) : (
        <Link href={resume.href} className={buttonClass}>
          Continuar <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </section>
  )
}

/** Acertos por disciplina (as 5 com mais respostas). */
export function ProgressoPorDisciplina({ subjects }: { subjects: SubjectProgress[] }) {
  return (
    <section aria-label="Progresso por disciplina">
      <h2 className={sectionLabel}>Progresso por disciplina</h2>
      <div className={card}>
        {subjects.length === 0 ? (
          <Empty title="Ainda sem respostas" text="Responde a questões no Simulador e o teu progresso aparece aqui." />
        ) : (
          <ul>
            {subjects.map((subject, index) => {
              const pct = percent(subject.correct, subject.answered)
              return (
                <li key={subject.id} className={cn('px-[16px] py-[12px]', index > 0 && 'border-t border-black/[0.05]')}>
                  <div className="flex items-baseline justify-between gap-[12px]">
                    <p className="min-w-0 truncate text-[14px] font-medium text-[#202321]">{subject.name}</p>
                    <p className="flex-none text-[14px] font-semibold text-[#1d4d41]">{pct}%</p>
                  </div>
                  <div aria-hidden="true" className="mt-[8px] h-[6px] overflow-hidden rounded-[3px] bg-[#e3e9df]">
                    <div className="h-full rounded-[3px] bg-gradient-to-r from-[#4a8a76] to-[#1d4d41]" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-[6px] text-[12px] text-[#6b756e]">
                    {subject.correct} de {subject.answered} {subject.answered === 1 ? 'certa' : 'certas'}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Questões erradas por rever (o mesmo número do Início do Simulador). */
export function ErrosCard({ count, href }: { count: number; href: string }) {
  return (
    <section aria-label="Erros">
      <h2 className={sectionLabel}>Erros</h2>
      <div className={card}>
        {count === 0 ? (
          <Empty title="Ainda não tens erros para rever" text="As questões que errares aparecem aqui para refazeres." />
        ) : (
          <div className="flex items-center gap-[12px] px-[16px] py-[14px]">
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-semibold text-[#202321]">{count}</p>
              <p className="text-[12px] text-[#6b756e]">{count === 1 ? 'questão para rever' : 'questões para rever'}</p>
            </div>
            <Link href={href} className={secondaryButton}>
              Rever erros
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Orientação de curso. Nunca feito: «Começar» (ou «Em breve», sem botão, se o módulo ainda não está ativo).
 * A meio: não aparece aqui, porque o «Continuar» já o mostra. Concluído: os cursos e a percentagem.
 */
export function DescobreCursoCard({ data }: { data: OrientacaoCardData }) {
  const { estado } = data
  if (estado.status === 'em_curso') return null
  const done = estado.status === 'concluido'

  return (
    <section aria-label={data.label}>
      <div className={cn(card, 'p-[16px]')}>
        <div className="flex items-start gap-[12px]">
          <span className="flex size-[40px] flex-none items-center justify-center rounded-[12px] bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]">
            <Compass size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[8px]">
              <h2 className="text-[16px] font-semibold text-[#202321]">{data.label}</h2>
              {!done && data.status === 'soon' && (
                <span className="rounded-full bg-[#f4eddb] px-[8px] py-[2px] text-[10px] font-semibold text-[#805f19]">Em breve</span>
              )}
            </div>
            {!done && <p className="mt-[2px] text-[13px] leading-[18px] text-[#6b756e]">{data.description}</p>}
          </div>
        </div>

        {estado.status === 'concluido' ? (
          <>
            <ul className="mt-[12px] divide-y divide-black/[0.05]">
              {estado.courses.slice(0, 3).map((course) => (
                <li key={`${course.name}-${course.institution ?? ''}`} className="flex items-center justify-between gap-[12px] py-[10px]">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[#202321]">{course.name}</span>
                    {course.institution && <span className="block truncate text-[12px] text-[#6b756e]">{course.institution}</span>}
                  </span>
                  <span aria-label={`${course.percent}% de afinidade`} className="flex-none text-[14px] font-semibold text-[#1d4d41]">
                    {course.percent}%
                  </span>
                </li>
              ))}
            </ul>
            <Link href={data.resultHref} className={cn(secondaryButton, 'mt-[12px] w-full')}>
              Ver resultado completo
            </Link>
          </>
        ) : (
          data.status === 'active' && (
            <Link href={data.href} className={cn(secondaryButton, 'mt-[12px] w-full')}>
              Começar
            </Link>
          )
        )}
      </div>
    </section>
  )
}
