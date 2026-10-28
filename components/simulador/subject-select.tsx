'use client'

import { useRouter } from 'next/navigation'
import { SelectField } from '@/components/ui/select-field'

export function SubjectSelect({ subjects, current, mode }: { subjects: { id: string; name: string }[]; current: string | null; mode?: string }) {
  const router = useRouter()
  return (
    <SelectField
      name="disciplina"
      label="Disciplina"
      placeholder="Escolhe a disciplina"
      defaultValue={current ?? ''}
      options={subjects.map((item) => ({ value: item.id, label: item.name }))}
      triggerClassName="h-14 rounded-2xl bg-white px-5 text-[16px] font-semibold shadow-[0_1px_3px_rgba(20,50,40,0.10)] outline-none focus-visible:ring-2 focus-visible:ring-[#1d4d41]/25"
      onValueChange={(value) => {
        if (value && value !== (current ?? '')) router.replace(`/aluno/simulador?d=${encodeURIComponent(value)}${mode ? `&m=${mode}` : ''}`, { scroll: false })
      }}
    />
  )
}
