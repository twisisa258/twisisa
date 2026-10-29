'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { SignOutButton } from '@/components/sign-out-button'
import { Avatar } from '@/components/aluno/avatar'
import { StudentNavGroups } from '@/components/student-nav'

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
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do estudante">
      <button type="button" aria-label="Fechar menu" onClick={onClose} className="absolute inset-0 bg-[#10231e]/45 backdrop-blur-[2px]" />
      <aside className="relative flex h-full w-[min(86vw,360px)] min-w-0 max-w-full flex-col overflow-y-auto overflow-x-hidden bg-[#f3f4ef] px-4 py-5 shadow-2xl">
        <div className="flex items-center justify-between px-3">
          <Link href="/aluno" onClick={onClose} className="text-lg font-semibold tracking-[-0.04em]">Twisisa</Link>
          <button type="button" aria-label="Fechar menu" onClick={onClose} className="flex size-9 items-center justify-center rounded-full text-[#68716a] transition-colors hover:bg-white hover:text-[#1d4d41]"><X /></button>
        </div>
        <div className="mt-10 flex flex-1 flex-col">
          <StudentNavGroups onNavigate={onClose} />
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-[#e3e6dc] pt-4">
          <Link href="/aluno" onClick={onClose} className="flex min-w-0 items-center gap-2">
            <Avatar name={firstName} image={image} size={32} />
            <span className="truncate text-xs font-medium text-[#48534b]">{firstName}</span>
          </Link>
          <SignOutButton />
        </div>
      </aside>
    </div>,
    document.body,
  )
}
