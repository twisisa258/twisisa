'use client'

import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()
  return <button onClick={async () => { await authClient.signOut(); router.push('/'); router.refresh() }} className="rounded-full border border-[#d7d9d0] bg-white px-4 py-2 text-xs font-semibold text-[#39433e]">Sair</button>
}
