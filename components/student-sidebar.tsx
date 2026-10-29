'use client'

import { Brand } from '@/components/brand'
import { Avatar } from '@/components/aluno/avatar'
import { SignOutButton } from '@/components/sign-out-button'
import { StudentNavGroups } from '@/components/student-nav'

// Menu lateral do computador, igual em todas as páginas do estudante.
export function StudentSidebar({ firstName, image = null }: { firstName: string; image?: string | null }) {
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
          <Avatar name={firstName} image={image} size={32} />
          <span className="truncate text-xs font-medium text-[#48534b]">{firstName}</span>
        </span>
        <SignOutButton />
      </div>
    </aside>
  )
}
