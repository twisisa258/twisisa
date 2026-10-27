import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { AppError } from '@/lib/action-result'
import { isAdminEmail } from '@/lib/admin'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { sendInviteEmail, siteBaseUrl } from '@/lib/email'
import { isUniqueViolation } from '@/lib/pg-errors'
import { INVITE_VALID_DAYS, MAX_CODE_ATTEMPTS, ROLE_LABEL, type InviteRole, type InviteStep, type StaffRole } from '@/lib/staff-shared'

// Convites por carta. Quatro camadas contra mãos erradas:
// 1) o link tem 256 bits aleatórios e só se guarda a impressão digital; 2) abrir exige um código à parte (5 tentativas);
// 3) a conta só pode usar o e-mail do convite; 4) o acesso só é dado depois de o e-mail ser verificado.
// Cada passo avança no servidor e nunca recua; ao concluir, a carta é destruída.

const COOKIE = 'convite'
const GONE = 'Esta carta já não existe.'
const LOCKED = 'Demasiadas tentativas erradas. Pede ao administrador que te envie uma nova carta.'
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // sem 0/O, 1/I/L

type InviteRow = {
  id: string; name: string; email: string; role: InviteRole; token_hash: string; code_hash: string; code_in_email: boolean
  status: 'pendente' | 'aberta' | 'concluido' | 'revogado' | 'bloqueado'; step: InviteStep; attempts: number; session_hash: string | null
  account_user_id: string | null; verification_sends: number; last_sent_at: Date | null; expires_at: Date
  created_by: string | null; created_at: Date; opened_at: Date | null; consumed_at: Date | null
}

function secret() {
  const value = process.env.BETTER_AUTH_SECRET
  if (value) return value
  if (process.env.NODE_ENV === 'production') throw new Error('BETTER_AUTH_SECRET em falta')
  return 'dev-only-secret'
}
const sha = (value: string) => createHash('sha256').update(value).digest('hex')
const normalizeCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
const hashCode = (code: string) => createHmac('sha256', secret()).update(normalizeCode(code)).digest('hex')
const same = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function newCode() {
  const raw = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}
const newToken = () => randomBytes(32).toString('base64url')
const validToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token)

async function findByToken(token: string) {
  if (!validToken(token)) return null
  const found = await pool.query<InviteRow>(`SELECT * FROM staff_invites WHERE token_hash = $1`, [sha(token)])
  return found.rows[0] ?? null
}
const isLive = (row: InviteRow) => ['pendente', 'aberta', 'bloqueado'].includes(row.status) && new Date(row.expires_at).getTime() > Date.now()

async function readCookie() {
  const raw = (await cookies()).get(COOKIE)?.value ?? ''
  const dot = raw.indexOf('.')
  return dot > 0 ? { id: raw.slice(0, dot), secret: raw.slice(dot + 1) } : null
}
async function hasSession(row: InviteRow) {
  const cookie = await readCookie()
  return !!cookie && cookie.id === row.id && !!row.session_hash && same(sha(cookie.secret), row.session_hash)
}

// ───────────── Concluir: dar o papel e destruir a carta ─────────────

async function finalize(row: InviteRow, userId: string) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const done = await client.query(`UPDATE staff_invites SET status = 'concluido', consumed_at = now(), session_hash = NULL, account_user_id = $2 WHERE id = $1 AND status = 'aberta' RETURNING id`, [row.id, userId])
    if (done.rowCount) {
      await client.query(
        `INSERT INTO staff_roles (user_id, role, granted_by) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role`,
        [userId, row.role, row.created_by],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Chamado quando alguém com conta verificada entra: se tinha uma carta à espera de verificação, conclui-a. */
export async function finalizeInviteForUser(userId: string): Promise<StaffRole | null> {
  const found = await pool.query<InviteRow>(`SELECT * FROM staff_invites WHERE account_user_id = $1 AND status = 'aberta' AND step = 'aguardar'`, [userId])
  if (!found.rows[0]) return null
  await finalize(found.rows[0], userId)
  return found.rows[0].role
}

// ───────────── A carta (público, com o link) ─────────────

export type InviteView =
  | { state: 'gone' }
  | { state: 'locked' }
  | { state: 'sealed' }
  | { state: 'done' }
  | { state: 'step'; step: InviteStep; name: string; roleLabel: string; email: string }

export async function getInviteView(token: string, signedIn: { id: string; email: string; verified: boolean } | null): Promise<InviteView> {
  const row = await findByToken(token)
  if (!row || !isLive(row)) return { state: 'gone' }
  if (row.status === 'bloqueado') return { state: 'locked' }
  if (!(await hasSession(row))) return { state: 'sealed' }
  // Quem já tem conta verificada com este e-mail só tem de entrar nela: a carta conclui-se sozinha.
  if (row.step === 'conta' && signedIn?.verified && signedIn.email.toLowerCase() === row.email) {
    await finalize(row, signedIn.id)
    return { state: 'done' }
  }
  return { state: 'step', step: row.step, name: row.name, roleLabel: ROLE_LABEL[row.role], email: row.email }
}

async function requireSession(token: string) {
  const row = await findByToken(token)
  if (!row || !isLive(row)) throw new AppError(GONE)
  if (row.status === 'bloqueado') throw new AppError(LOCKED)
  if (row.status !== 'aberta' || !(await hasSession(row))) throw new AppError('A sessão da carta expirou. Volta a abri-la com o código.')
  return row
}

export async function unlockInvite(token: string, code: string) {
  const row = await findByToken(token)
  if (!row || !isLive(row)) throw new AppError(GONE)
  if (row.status === 'bloqueado') throw new AppError(LOCKED)
  if (!normalizeCode(code)) throw new AppError('Escreve o código que veio no e-mail.')

  if (!same(hashCode(code), row.code_hash)) {
    const updated = await pool.query(
      `UPDATE staff_invites SET attempts = attempts + 1, status = CASE WHEN attempts + 1 >= $2 THEN 'bloqueado' ELSE status END WHERE id = $1 RETURNING attempts, status`,
      [row.id, MAX_CODE_ATTEMPTS],
    )
    await sleep(600)
    if (updated.rows[0].status === 'bloqueado') throw new AppError(LOCKED)
    const left = MAX_CODE_ATTEMPTS - (updated.rows[0].attempts as number)
    throw new AppError(`Código incorreto. ${left === 1 ? 'Resta 1 tentativa' : `Restam ${left} tentativas`}.`)
  }

  const sessionSecret = randomBytes(32).toString('base64url')
  await pool.query(
    `UPDATE staff_invites SET status = CASE WHEN status = 'pendente' THEN 'aberta' ELSE status END, opened_at = COALESCE(opened_at, now()), session_hash = $2 WHERE id = $1`,
    [row.id, sha(sessionSecret)],
  )
  ;(await cookies()).set(COOKIE, `${row.id}.${sessionSecret}`, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/convite', maxAge: 60 * 60 * 24 })
  return { step: row.step, name: row.name, roleLabel: ROLE_LABEL[row.role], email: row.email }
}

/** Só para a frente: carta → tarefa → conta. */
export async function advanceInvite(token: string, to: 'tarefa' | 'conta') {
  const row = await requireSession(token)
  const from: InviteStep = to === 'tarefa' ? 'carta' : 'tarefa'
  if (row.step === to) return
  if (row.step !== from) throw new AppError('Este passo já não está disponível.')
  await pool.query(`UPDATE staff_invites SET step = $2 WHERE id = $1 AND step = $3`, [row.id, to, from])
}

const VERIFIED_PATH = '/convite/verificado'

export async function createInviteAccount(token: string, password: string): Promise<{ needSignIn: boolean }> {
  const row = await requireSession(token)
  if (row.step !== 'conta') throw new AppError('Este passo já não está disponível.')
  if (password.length < 8 || password.length > 128) throw new AppError('A palavra-passe deve ter entre 8 e 128 caracteres.')

  const existing = await pool.query(`SELECT id, "emailVerified" AS verified FROM "user" WHERE lower(email) = $1`, [row.email])
  let userId: string
  try {
    if (existing.rows[0]) {
      // Já existe conta com este e-mail: se está verificada, tem de entrar nela para aceitar; se não, só falta verificar.
      if (existing.rows[0].verified) return { needSignIn: true }
      userId = existing.rows[0].id as string
      await auth.api.sendVerificationEmail({ body: { email: row.email, callbackURL: VERIFIED_PATH } })
    } else {
      const created = await auth.api.signUpEmail({ body: { name: row.name, email: row.email, password, callbackURL: VERIFIED_PATH } })
      userId = created.user.id
    }
  } catch (error) {
    console.error('[CONVITE] Falha ao criar a conta', error)
    throw new AppError('Não foi possível criar a conta. Tenta de novo.')
  }
  await pool.query(
    `UPDATE staff_invites SET step = 'aguardar', account_user_id = $2, last_sent_at = now(), verification_sends = 1, expires_at = GREATEST(expires_at, now() + interval '2 days') WHERE id = $1 AND step = 'conta'`,
    [row.id, userId],
  )
  return { needSignIn: false }
}

export async function pollInvite(token: string): Promise<{ state: 'waiting' | 'done' | 'gone' }> {
  const row = await findByToken(token)
  if (!row) return { state: 'gone' }
  if (row.status === 'concluido') return { state: (await readCookie())?.id === row.id ? 'done' : 'gone' }
  const open = await requireSession(token)
  if (open.step !== 'aguardar' || !open.account_user_id) return { state: 'waiting' }
  const user = await pool.query(`SELECT "emailVerified" AS verified FROM "user" WHERE id = $1`, [open.account_user_id])
  if (!user.rows[0]?.verified) return { state: 'waiting' }
  await finalize(open, open.account_user_id)
  return { state: 'done' }
}

export async function resendVerification(token: string) {
  const row = await requireSession(token)
  if (row.step !== 'aguardar') throw new AppError('Este passo já não está disponível.')
  if (row.verification_sends >= 5) throw new AppError('Já reenviaste demasiadas vezes. Fala com o administrador.')
  if (row.last_sent_at && Date.now() - new Date(row.last_sent_at).getTime() < 60_000) throw new AppError('Espera um minuto antes de reenviar.')
  await pool.query(`UPDATE staff_invites SET last_sent_at = now(), verification_sends = verification_sends + 1 WHERE id = $1`, [row.id])
  try {
    await auth.api.sendVerificationEmail({ body: { email: row.email, callbackURL: VERIFIED_PATH } })
  } catch (error) {
    console.error('[CONVITE] Falha ao reenviar a verificação', error)
    throw new AppError('Não foi possível reenviar agora. Tenta de novo daqui a pouco.')
  }
}

// ───────────── Gestão (admin) ─────────────

type Admin = { id: string; email: string }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function deliver(row: Pick<InviteRow, 'name' | 'email' | 'role' | 'code_in_email'>, token: string, code: string) {
  await sendInviteEmail({ to: row.email, name: row.name, link: `${siteBaseUrl()}/convite/${token}`, code: row.code_in_email ? code : null, roleLabel: ROLE_LABEL[row.role] })
}
const expiry = () => new Date(Date.now() + INVITE_VALID_DAYS * 86_400_000)

export async function createInvite(admin: Admin, input: { name: string; email: string; sendEmail: boolean; codeInEmail: boolean }) {
  const name = input.name.trim().replace(/\s+/g, ' ')
  const email = input.email.trim().toLowerCase()
  if (name.length < 2 || name.length > 80) throw new AppError('O nome deve ter entre 2 e 80 caracteres.')
  if (email.length > 254 || !EMAIL.test(email)) throw new AppError('O e-mail não é válido.')
  if (isAdminEmail(email)) throw new AppError('Este e-mail já é de um administrador.')
  const member = await pool.query(`SELECT 1 FROM staff_roles s JOIN "user" u ON u.id = s.user_id WHERE lower(u.email) = $1`, [email])
  if (member.rowCount) throw new AppError('Esta pessoa já faz parte da equipa.')

  const token = newToken()
  const code = newCode()
  const id = randomUUID()
  try {
    await pool.query(
      `INSERT INTO staff_invites (id, name, email, role, token_hash, code_hash, code_in_email, expires_at, created_by) VALUES ($1, $2, $3, 'revisor', $4, $5, $6, $7, $8)`,
      [id, name, email, sha(token), hashCode(code), input.codeInEmail, expiry(), admin.id],
    )
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError('Já existe um convite ativo para este e-mail. Reenvia ou revoga o anterior.')
    throw error
  }
  const link = `${siteBaseUrl()}/convite/${token}`
  // O e-mail é opcional: o admin também pode entregar o link e o código por WhatsApp a partir do painel.
  if (input.sendEmail) {
    try {
      await deliver({ name, email, role: 'revisor', code_in_email: input.codeInEmail }, token, code)
    } catch (error) {
      await pool.query(`DELETE FROM staff_invites WHERE id = $1`, [id])
      throw error
    }
  }
  return { id, name, email, code, link, emailed: input.sendEmail }
}

/** Nova carta (novo link e novo código): serve para reenviar, desbloquear ou recomeçar. O link anterior morre. */
export async function reissueInvite(admin: Admin, id: string, sendEmail: boolean) {
  const found = await pool.query<InviteRow>(`SELECT * FROM staff_invites WHERE id = $1 AND status IN ('pendente','aberta','bloqueado')`, [id])
  const row = found.rows[0]
  if (!row) throw new AppError('Este convite já não pode ser reenviado.')
  const token = newToken()
  const code = newCode()
  await pool.query(
    `UPDATE staff_invites SET token_hash = $2, code_hash = $3, status = 'pendente', step = 'carta', attempts = 0, session_hash = NULL, verification_sends = 0, last_sent_at = NULL, expires_at = $4, created_by = $5 WHERE id = $1`,
    [id, sha(token), hashCode(code), expiry(), admin.id],
  )
  if (sendEmail) await deliver(row, token, code)
  return { name: row.name, email: row.email, code, link: `${siteBaseUrl()}/convite/${token}`, emailed: sendEmail }
}

export async function revokeInvite(id: string) {
  const done = await pool.query(`UPDATE staff_invites SET status = 'revogado', session_hash = NULL WHERE id = $1 AND status IN ('pendente','aberta','bloqueado') RETURNING email`, [id])
  if (!done.rowCount) throw new AppError('Este convite já não está ativo.')
  return done.rows[0].email as string
}

export async function removeStaffMember(userId: string) {
  const done = await pool.query(`DELETE FROM staff_roles WHERE user_id = $1 RETURNING user_id`, [userId])
  if (!done.rowCount) throw new AppError('Esta pessoa já não faz parte da equipa.')
}

export type InviteListItem = { id: string; name: string; email: string; status: InviteRow['status'] | 'expirado'; step: InviteStep; attempts: number; createdAt: string; openedAt: string | null }
export async function listInvites(): Promise<InviteListItem[]> {
  const rows = await pool.query<InviteRow>(`SELECT * FROM staff_invites ORDER BY created_at DESC LIMIT 60`)
  return rows.rows.map((row) => ({
    id: row.id, name: row.name, email: row.email,
    status: ['pendente', 'aberta', 'bloqueado'].includes(row.status) && new Date(row.expires_at).getTime() <= Date.now() ? 'expirado' : row.status,
    step: row.step, attempts: row.attempts, createdAt: new Date(row.created_at).toISOString(), openedAt: row.opened_at ? new Date(row.opened_at).toISOString() : null,
  }))
}
export type StaffMember = { userId: string; name: string; email: string; role: InviteRole; since: string }
export async function listStaff(): Promise<StaffMember[]> {
  const rows = await pool.query(`SELECT s.user_id, s.role, s.created_at, u.name, u.email FROM staff_roles s JOIN "user" u ON u.id = s.user_id ORDER BY s.created_at DESC`)
  return rows.rows.map((row) => ({ userId: row.user_id, name: row.name, email: row.email, role: row.role, since: new Date(row.created_at).toISOString() }))
}
