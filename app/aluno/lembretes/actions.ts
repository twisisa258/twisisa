'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { isStudyHour } from '@/lib/lembretes-shared'

export async function saveReminderSettings(input: { emailEnabled: boolean; hour: number }): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')
    if (typeof input?.emailEnabled !== 'boolean' || !isStudyHour(input.hour)) throw new AppError('Escolhe uma hora válida.')
    await pool.query(
      `INSERT INTO notification_prefs (user_id, email_enabled, push_enabled, categories, unsubscribe_token, study_hour)
       VALUES ($1, $2, false, $3::jsonb, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET email_enabled = $2, study_hour = $5, categories = notification_prefs.categories || '{"study": true}'::jsonb, updated_at = now()`,
      [session.user.id, input.emailEnabled, JSON.stringify({ study: true, summary: true, promo: false }), randomBytes(24).toString('hex'), input.hour],
    )
    revalidatePath('/aluno/lembretes')
  }, 'Não foi possível guardar. Tenta outra vez.')
}
