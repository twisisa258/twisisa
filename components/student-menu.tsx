'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { StudentMobileSidebar } from '@/components/student-mobile-sidebar'

export function StudentMenu({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" aria-label="Abrir menu do estudante" aria-expanded={open} onClick={() => setOpen(true)} className="flex size-9 items-center justify-center rounded-full text-[#68716a] transition-colors hover:bg-[#eef0e9] hover:text-[#1d4d41] lg:hidden"><Menu /></button>
    <StudentMobileSidebar firstName={firstName} open={open} onClose={() => setOpen(false)} />
  </>
}
