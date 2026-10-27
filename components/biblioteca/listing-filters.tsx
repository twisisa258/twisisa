'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { SelectField } from '@/components/ui/select-field'
import { withParams } from '@/lib/library-shared'

type Facet = { value: string; label: string; count: number }

const trigger =
  'h-11 rounded-xl bg-white px-3 text-sm text-[#202321] shadow-[0_1px_2px_rgba(20,50,40,0.05),0_8px_20px_-14px_rgba(20,50,40,0.25)] outline-none focus-visible:ring-2 focus-visible:ring-[#1d4d41]/25'

// Disciplina e Ano, em funil: mudar a disciplina limpa o ano. A instituição são botões (ver `ChipRow`).
// A página recarrega com o novo endereço, por isso só vem da base de dados o que é preciso.
export function ListingFilters({
  basePath,
  q,
  categoria,
  institution,
  subject,
  year,
  subjects,
  years,
}: {
  basePath: string
  q: string
  categoria: string
  institution: string
  subject: string
  year: string
  subjects: Facet[]
  years: Facet[]
}) {
  const router = useRouter()
  const hasFilter = !!(institution || subject || year)

  function go(next: { disciplina?: string; ano?: string }) {
    router.push(withParams(basePath, { q, categoria, instituicao: institution, disciplina: next.disciplina ?? subject, ano: next.ano ?? year }))
  }

  if (subjects.length === 0 && years.length === 0 && !hasFilter) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div key={`d-${subject}`} className="min-w-[150px] flex-1 sm:max-w-[240px]">
        <SelectField
          name="disciplina"
          label="Disciplina"
          placeholder="Disciplina"
          defaultValue={subject}
          triggerClassName={trigger}
          options={[{ value: '', label: 'Todas as disciplinas' }, ...subjects.map((item) => ({ value: item.value, label: `${item.label} (${item.count})` }))]}
          onValueChange={(value) => {
            if (value !== subject) go({ disciplina: value, ano: '' })
          }}
        />
      </div>
      <div key={`a-${year}-${subject}`} className="min-w-[110px] flex-1 sm:max-w-[160px]">
        <SelectField
          name="ano"
          label="Ano"
          placeholder="Ano"
          defaultValue={year}
          triggerClassName={trigger}
          options={[{ value: '', label: 'Todos os anos' }, ...years.map((item) => ({ value: item.value, label: `${item.label} (${item.count})` }))]}
          onValueChange={(value) => {
            if (value !== year) go({ ano: value })
          }}
        />
      </div>
      {hasFilter && (
        <button
          type="button"
          onClick={() => router.push(withParams(basePath, { q, categoria }))}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-[#1d4d41] hover:bg-[#eaf1ec]"
        >
          <X size={14} /> Limpar
        </button>
      )}
    </div>
  )
}
