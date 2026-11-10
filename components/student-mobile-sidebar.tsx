'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { SignOutButton } from '@/components/sign-out-button'
import { Avatar } from '@/components/aluno/avatar'
import { ShellLogo } from '@/components/shell/logo'
import { StudentNavGroups } from '@/components/student-nav'

// Gaveta do aluno no telemóvel: a mesma lista do menu lateral do computador.
export function StudentMobileSidebar({ firstName, image = null, open, onClose }: { firstName: string; image?: string | null; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="sh-drawer" role="dialog" aria-modal="true" aria-label="Menu do aluno">
      <button type="button" aria-label="Fechar menu" onClick={onClose} className="sh-scrim" />
      <aside className="sh-panel">
        <div className="sh-panel-top">
          <ShellLogo href="/aluno" className="" />
          <button type="button" aria-label="Fechar menu" onClick={onClose} className="sh-ic"><X size={18} aria-hidden /></button>
        </div>
        <StudentNavGroups onNavigate={onClose} />
        <div className="sh-aside-foot">
          <Link href="/aluno/perfil" onClick={onClose} className="sh-who">
            <Avatar name={firstName} image={image} size={32} />
            <span>{firstName}</span>
          </Link>
          <SignOutButton />
        </div>
      </aside>
    </div>,
    document.body,
  )
}
