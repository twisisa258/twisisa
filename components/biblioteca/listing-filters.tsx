'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { SelectField } from '@/components/ui/select-field'
import { withParams } from '@/lib/library-shared'

type Facet = { value: string; label: string; count: number }

const trigger =
  'h-11 rounded-xl border border-linha bg-white px-3 text-sm text-texto outline-none focus-visible:ring-2 focus-visible:ring-marca/25'

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
    <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
      <div key={`d-${subject}`} className="min-w-0 sm:min-w-[150px] sm:max-w-[240px] sm:flex-1">
        <SelectField
          name="disciplina"
          label="Disciplina"
          placeholder="Disciplina"
          defaultValue={subject}
          triggerClassName={trigger}
          options={[{ value: '', label: 'Disciplinas' }, ...subjects.map((item) => ({ value: item.value, label: `${item.label} (${item.count})` }))]}
          onValueChange={(value) => {
            if (value !== subject) go({ disciplina: value, ano: '' })
          }}
        />
      </div>
      <div key={`a-${year}-${subject}`} className="min-w-0 sm:min-w-[110px] sm:max-w-[160px] sm:flex-1">
        <SelectField
          name="ano"
          label="Ano"
          placeholder="Ano"
          defaultValue={year}
          triggerClassName={trigger}
          options={[{ value: '', label: 'Anos' }, ...years.map((item) => ({ value: item.value, label: `${item.label} (${item.count})` }))]}
          onValueChange={(value) => {
            if (value !== year) go({ ano: value })
          }}
        />
      </div>
      {hasFilter && (
        <button
          type="button"
          onClick={() => router.push(withParams(basePath, { q, categoria }))}
          className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-marca hover:bg-[#eaf1ec] sm:col-span-1"
        >
          <X size={14} /> Limpar
        </button>
      )}
    </div>
  )
}
