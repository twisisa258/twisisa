'use client'

import { useRouter } from 'next/navigation'
import { SelectField } from '@/components/ui/select-field'

// Selector de disciplina: ocupa uma linha e leva à mesma página com a disciplina escolhida (`?d=`).
export function SubjectSelect({ subjects, current, basePath }: { subjects: { id: string; name: string }[]; current: string | null; basePath: string }) {
  const router = useRouter()
  return (
    <SelectField
      name="disciplina"
      label="Disciplina"
      placeholder="Escolhe a disciplina"
      defaultValue={current ?? ''}
      options={subjects.map((item) => ({ value: item.id, label: item.name }))}
      triggerClassName="h-12 rounded-xl bg-white px-4 text-[15px] font-medium shadow-[0_1px_2px_rgba(20,50,40,0.06)] outline-none focus-visible:ring-2 focus-visible:ring-[#1d4d41]/20"
      onValueChange={(value) => {
        // O selector avisa também ao montar: só navega quando a escolha muda de facto.
        if (value && value !== (current ?? '')) router.push(`${basePath}?d=${encodeURIComponent(value)}`)
      }}
    />
  )
}
