'use client'

import { Brand } from '@/components/brand'
import { SignOutButton } from '@/components/sign-out-button'
import { StudentNavGroups } from '@/components/student-nav'

// Menu lateral do computador, igual em todas as páginas do estudante.
export function StudentSidebar({ firstName }: { firstName: string }) {
  return (
    <aside className="sticky top-0 z-30 hidden h-screen w-[252px] shrink-0 flex-col overflow-y-auto border-r border-[#eceee7] bg-[#f3f4ef] px-4 py-5 lg:flex">
      <div className="px-3">
        <Brand href="/aluno" />
      </div>
      <div className="mt-10 flex flex-1 flex-col">
        <StudentNavGroups />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#e3e6dc] pt-4">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e1ece5] to-[#cfe0d5] text-xs font-semibold text-[#1d4d41]">{firstName.slice(0, 1)}</span>
          <span className="truncate text-xs font-medium text-[#48534b]">{firstName}</span>
        </span>
        <SignOutButton />
      </div>
    </aside>
  )
}
