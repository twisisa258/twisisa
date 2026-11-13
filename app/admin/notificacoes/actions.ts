'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/admin'
import { markAllRead, markRead } from '@/lib/admin-notify'

export async function marcarLida(id: string): Promise<void> {
  const admin = await getAdminUser()
  if (!admin) return
  await markRead(admin.id, String(id))
  revalidatePath('/admin', 'layout')
}

export async function marcarTodasLidas(): Promise<void> {
  const admin = await getAdminUser()
  if (!admin) return
  await markAllRead(admin.id)
  revalidatePath('/admin', 'layout')
}
