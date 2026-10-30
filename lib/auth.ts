import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { pool } from '@/lib/db'
import { PRIVACY_VERSION, TERMS_VERSION, validateEmail, validatePassword } from '@/lib/identity'
import { sendPasswordChangedEmail, sendPasswordResetEmail, sendVerificationEmail } from '@/lib/email'

// Google só fica activo quando as duas chaves existem; sem elas o botão aparece desactivado (components/auth-form.tsx).
export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

function originOf(value: string | undefined) {
  if (!value) return []
  try {
    return [new URL(value).origin]
  } catch {
    return []
  }
}

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // Recuperação de conta: ligação de uso único válida 1 hora; ao redefinir, as outras sessões terminam e a pessoa é avisada por e-mail.
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    // Espera pelo envio (como a verificação): em ambiente serverless, um envio «em segundo plano» pode ser cortado quando a resposta termina.
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendPasswordResetEmail(user.email, user.name, url)
      } catch (error) {
        console.error('[AUTH] Falha ao enviar o e-mail de recuperação', error)
      }
    },
    onPasswordReset: async ({ user }) => {
      try {
        await sendPasswordChangedEmail(user.email, user.name)
      } catch (error) {
        console.error('[AUTH] Falha ao enviar o aviso de palavra-passe alterada', error)
      }
    },
  },
  // Verificação por e-mail (Resend). Não bloqueia o início de sessão dos alunos; serve para provar que o e-mail é da pessoa
  // (os convites da equipa só dão acesso depois de verificado). Uma falha no envio nunca derruba a criação da conta.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendVerificationEmail(user.email, user.name, url)
      } catch (error) {
        console.error('[AUTH] Falha ao enviar o e-mail de verificação', error)
      }
    },
  },
  // Entrar com Google: URI de redirecionamento a registar na Google = `${BETTER_AUTH_URL}/api/auth/callback/google`.
  ...(googleEnabled ? { socialProviders: { google: { clientId: process.env.GOOGLE_CLIENT_ID as string, clientSecret: process.env.GOOGLE_CLIENT_SECRET as string } } } : {}),
  // Limite de pedidos guardado na base de dados: em serverless (Vercel) cada instância tem memória própria, e um contador
  // em memória pode ser contornado repartindo os pedidos. Tabela "rateLimit" (migração 0024). Por IP e rota.
  rateLimit: {
    storage: 'database',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 10 },
    },
  },
  hooks: {
    // O servidor volta a validar tudo o que a interface valida: pedidos feitos directamente à API não passam sem
    // e-mail válido, palavra-passe aceitável e aceitação dos Termos.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') return
      const body = (ctx.body ?? {}) as Record<string, unknown>
      const emailError = validateEmail(body.email)
      if (emailError) throw new APIError('BAD_REQUEST', { message: emailError, code: 'INVALID_EMAIL_FORMAT' })
      const passwordError = validatePassword(body.password)
      if (passwordError) throw new APIError('BAD_REQUEST', { message: passwordError, code: 'PASSWORD_NOT_ACCEPTED' })
      if (body.acceptTerms !== true) throw new APIError('BAD_REQUEST', { message: 'Aceita os Termos e a Privacidade para criar a conta.', code: 'TERMS_REQUIRED' })
    }),
    // Guarda a aceitação (versão e data). Se falhar, o onboarding volta a pedir a caixa: nunca se segue sem consentimento registado.
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') return
      try {
        const returned = ctx.context.returned as { user?: { id?: string } } | undefined
        const userId = ctx.context.newSession?.user.id ?? returned?.user?.id
        if (!userId) return
        const ip = ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || null
        await pool.query(
          `INSERT INTO account_consents (user_id, kind, version, ip) VALUES ($1, 'terms', $2, $4), ($1, 'privacy', $3, $4)`,
          [userId, TERMS_VERSION, PRIVACY_VERSION, ip],
        )
      } catch (error) {
        console.error('[AUTH] Não foi possível guardar a aceitação dos Termos', error)
      }
    }),
  },
  trustedOrigins: [
    ...originOf(process.env.BETTER_AUTH_URL),
    ...originOf(process.env.NEXT_PUBLIC_SITE_URL),
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
    ...(process.env.NODE_ENV === 'production'
      ? [
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
        ]
      : []),
  ],
  // 30 dias, renovada a cada dia de uso: quem estuda todos os dias nunca volta a entrar. «Computador partilhado» (rememberMe: false) dura só o separador.
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
})
