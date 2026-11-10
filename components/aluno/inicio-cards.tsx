import Link from 'next/link'
import { Compass } from 'lucide-react'
import type { OrientacaoCardData, SubjectProgress } from '@/lib/aluno-inicio'
import { percent } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'

// Cartões do Início (/aluno). Só mostram o que existe: sem dados, dizem que ainda não há (nunca um zero ou um exemplo inventado).

const soft = 'shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)]'
const card = cn('overflow-hidden rounded-[18px] bg-gradient-to-br from-white to-marca-suave', soft)
const sectionLabel = 'mb-[8px] ml-[4px] text-[11px] font-bold uppercase tracking-[0.12em] text-texto'
const secondaryButton =
  'inline-flex h-[44px] items-center justify-center gap-[8px] rounded-[22px] bg-gradient-to-br from-marca-suave to-marca-suave px-[18px] text-[14px] font-semibold text-marca no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca'

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-[16px] py-[14px]">
      <p className="text-[14px] font-medium text-texto">{title}</p>
      <p className="mt-[2px] text-[12px] text-texto-2">{text}</p>
    </div>
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
                    <p className="min-w-0 truncate text-[14px] font-medium text-texto">{subject.name}</p>
                    <p className="flex-none text-[14px] font-semibold text-marca">{pct}%</p>
                  </div>
                  <div aria-hidden="true" className="mt-[8px] h-[6px] overflow-hidden rounded-[3px] bg-linha">
                    <div className="h-full rounded-[3px] bg-gradient-to-r from-[#4a8a76] to-marca" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-[6px] text-[12px] text-texto-2">
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
          <span className="flex size-[40px] flex-none items-center justify-center rounded-[12px] bg-gradient-to-br from-marca-suave to-marca-suave text-marca">
            <Compass size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[8px]">
              <h2 className="text-[16px] font-semibold text-texto">{data.label}</h2>
              {!done && data.status === 'soon' && (
                <span className="rounded-full bg-conquista-suave px-[8px] py-[2px] text-[10px] font-semibold text-aviso-texto">Em breve</span>
              )}
            </div>
            {!done && <p className="mt-[2px] text-[13px] leading-[18px] text-texto-2">{data.description}</p>}
          </div>
        </div>

        {estado.status === 'concluido' ? (
          <>
            <ul className="mt-[12px] divide-y divide-black/[0.05]">
              {estado.courses.slice(0, 3).map((course) => (
                <li key={`${course.name}-${course.institution ?? ''}`} className="flex items-center justify-between gap-[12px] py-[10px]">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-texto">{course.name}</span>
                    {course.institution && <span className="block truncate text-[12px] text-texto-2">{course.institution}</span>}
                  </span>
                  <span aria-label={`${course.percent}% de afinidade`} className="flex-none text-[14px] font-semibold text-marca">
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
