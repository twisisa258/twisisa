'use client'

import { authClient } from '@/lib/auth-client'
import { Field, fieldClass } from './fields'
import { SectionForm } from './section-form'
import type { ActionResult } from '@/lib/action-result'

async function changePassword(formData: FormData): Promise<ActionResult> {
  const currentPassword = String(formData.get('currentPassword') ?? '')
  const newPassword = String(formData.get('newPassword') ?? '')
  if (newPassword.length < 8) return { ok: false, message: 'A nova palavra-passe deve ter pelo menos 8 caracteres.' }
  if (newPassword === currentPassword) return { ok: false, message: 'A nova palavra-passe tem de ser diferente da atual.' }
  const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
  if (error) return { ok: false, message: 'Não foi possível alterar. Confirma a palavra-passe atual.' }
  return { ok: true }
}

export function PasswordForm() {
  return (
    <SectionForm sectionId="seguranca" action={changePassword} submitLabel="Alterar palavra-passe" resetOnSuccess>
      <Field label="Palavra-passe atual">
        <input name="currentPassword" type="password" required autoComplete="current-password" className={fieldClass} />
      </Field>
      <Field label="Nova palavra-passe" hint="Pelo menos 8 caracteres. As outras sessões terminam.">
        <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={fieldClass} />
      </Field>
    </SectionForm>
  )
}
