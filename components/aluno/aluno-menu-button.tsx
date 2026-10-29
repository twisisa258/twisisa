'use client'

import { useState } from 'react'
import { StudentMobileSidebar } from '@/components/student-mobile-sidebar'
import { Ic } from '@/components/aluno/icons'

// Botão do menu do desenho (44 px). Só recebe texto: nunca ícones como propriedade (ver State.md #84).
export function AlunoMenuButton({ firstName, image = null }: { firstName: string; image?: string | null }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex size-[44px] items-center justify-center rounded-[22px] border-0 bg-transparent text-[#4d5851] lg:hidden"
      >
        <Ic name="menu" />
      </button>
      <StudentMobileSidebar firstName={firstName} image={image} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
