import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'
import { sendPasswordChangedEmail, sendPasswordResetEmail, sendVerificationEmail } from '@/lib/email'

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
  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
    ...(process.env.NODE_ENV === 'production'
      ? [
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
        ]
      : []),
  ],
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
})
