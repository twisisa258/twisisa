'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { StudentMobileSidebar } from '@/components/student-mobile-sidebar'

// Mantido por compatibilidade: o botão do menu faz agora parte do cabeçalho (components/shell/app-header.tsx).
export function StudentMenu({ firstName, image = null }: { firstName: string; image?: string | null }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" aria-label="Abrir menu do aluno" aria-expanded={open} onClick={() => setOpen(true)} className="sh-ic sh-only-m"><Menu size={18} aria-hidden /></button>
    <StudentMobileSidebar firstName={firstName} image={image} open={open} onClose={() => setOpen(false)} />
  </>
}
