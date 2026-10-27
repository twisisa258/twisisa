import { headers } from 'next/headers'
import { isAdminEmail } from '@/lib/admin'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { finalizeInviteForUser } from '@/lib/staff-invites'
import type { StaffRole } from '@/lib/staff-shared'

type StaffCandidate = { id: string; email: string; emailVerified?: boolean | null }

// Papel de equipa de um utilizador que já tem sessão.
// admin: e-mails em ADMIN_EMAILS (controlo total). revisor: concedido pelo painel (Equipa), só revê questões.
export async function getStaffRole(user: StaffCandidate): Promise<StaffRole | null> {
  if (isAdminEmail(user.email)) return 'admin'
  if (!user.emailVerified) return null
  const found = await pool.query(`SELECT role FROM staff_roles WHERE user_id = $1`, [user.id])
  if (found.rows[0]) return found.rows[0].role as StaffRole
  // Verificou o e-mail noutro dispositivo: a carta à espera conclui-se agora.
  return (await finalizeInviteForUser(user.id)) ?? null
}

// Quem pode entrar na administração e com que papel.
export async function getStaffAccess(): Promise<{ user: { id: string; name: string; email: string }; role: StaffRole } | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return null
  const role = await getStaffRole(user)
  return role ? { user, role } : null
}
