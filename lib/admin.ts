import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export function isAdminEmail(email: string) {
  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  return allowed.length > 0 && allowed.includes(email.toLowerCase())
}

// Devolve o utilizador se tiver sessão e estiver em ADMIN_EMAILS; caso contrário, null.
export async function getAdminUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || !isAdminEmail(session.user.email)) return null
  return session.user
}
