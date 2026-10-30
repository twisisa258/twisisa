'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useFeedback } from '@/components/feedback-provider'
import { track } from '@/lib/analytics'
import { Spinner } from '@/components/ui/spinner'
import { normalizeEmail, passwordStrength, provisionalName, safeNext, suggestEmail, validateEmail, validatePassword } from '@/lib/identity'

const inputClass = 'w-full rounded-xl border bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#1d4d41]'
const STRENGTH_LABEL = ['', 'Fraca', 'Razoável', 'Boa', 'Forte']
const STRENGTH_COLOR = ['bg-[#e3e5dc]', 'bg-[#c9503c]', 'bg-[#d99a2b]', 'bg-[#7fae5a]', 'bg-[#1d4d41]']

// Registo e entrada. O registo é curto (e-mail, palavra-passe, Termos); nome, data de nascimento e o resto vêm no onboarding.
// O servidor volta a validar tudo (lib/auth.ts, hooks.before): esta validação só poupa uma viagem à rede.
export function AuthForm({ mode, googleEnabled, next }: { mode: 'sign-in' | 'sign-up'; googleEnabled: boolean; next?: string }) {
  const router = useRouter()
  const feedback = useFeedback()
  const signUp = mode === 'sign-up'
  const target = safeNext(next)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [shared, setShared] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const emailError = signUp ? validateEmail(email) : null
  const passwordError = signUp ? validatePassword(password) : null
  const suggestion = signUp && touched.email && !emailError ? suggestEmail(email) : null
  const strength = passwordStrength(password)
  const valid = signUp ? !emailError && !passwordError && email.length > 0 && password.length > 0 && accepted : email.trim().length > 0 && password.length > 0
  const busy = loading || googleLoading

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid || busy) return
    setLoading(true)
    let failure: string | null = null
    try {
      const cleanEmail = normalizeEmail(email)
      const result = signUp
        ? await authClient.signUp.email({ name: provisionalName(cleanEmail), email: cleanEmail, password, acceptTerms: true } as Parameters<typeof authClient.signUp.email>[0])
        : await authClient.signIn.email({ email: cleanEmail, password, rememberMe: !shared })
      if (result.error) {
        const error = result.error as { code?: string; message?: string; status?: number }
        if (error.status === 429) failure = 'Muitas tentativas seguidas. Espera um minuto e tenta outra vez.'
        else if (error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') failure = 'Já existe uma conta com este e-mail. Tenta entrar.'
        else if (error.code === 'INVALID_EMAIL_OR_PASSWORD') failure = 'E-mail ou palavra-passe incorretos.'
        else if (error.code === 'INVALID_EMAIL_FORMAT' || error.code === 'PASSWORD_NOT_ACCEPTED' || error.code === 'TERMS_REQUIRED') failure = error.message ?? null
        failure ??= signUp ? 'Não foi possível criar a conta. Verifica os dados e tenta novamente.' : 'Não foi possível entrar. Verifica os teus dados e tenta novamente.'
      }
    } catch {
      failure = 'Sem ligação ao servidor. Verifica a internet e tenta outra vez.'
    }
    setLoading(false)
    if (failure) {
      feedback.error(failure, signUp ? 'Não foi possível criar a conta' : 'Não foi possível entrar')
      return
    }
    track(signUp ? 'sign_up' : 'login', { method: 'email' })
    // Conta nova: directo ao onboarding. Quem entra volta ao sítio de onde veio; a guarda do estudante trata do resto.
    router.push(signUp ? '/aluno/bem-vindo' : target)
    router.refresh()
  }

  async function handleGoogle() {
    if (!googleEnabled || busy || (signUp && !accepted)) return
    setGoogleLoading(true)
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: signUp ? '/aluno/bem-vindo' : target })
    } catch {
      setGoogleLoading(false)
      feedback.error('Não foi possível ligar à Google. Tenta outra vez ou entra com o e-mail.', 'Google indisponível')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-sm font-medium">E-mail</label>
          <input
            id="auth-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            aria-invalid={touched.email && !!emailError}
            className={`${inputClass} ${touched.email && emailError ? 'border-[#c9503c]' : 'border-[#dfe1d9]'}`}
            placeholder="tu@email.com"
          />
          {touched.email && emailError && <p className="text-[13px] text-[#b03a28]">{emailError}</p>}
          {suggestion && (
            <p className="text-[13px] text-[#6e756f]">
              Querias dizer{' '}
              <button type="button" onClick={() => setEmail(suggestion)} className="font-semibold text-[#1d4d41] underline">{suggestion}</button>?
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-sm font-medium">Palavra-passe</label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={signUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              aria-invalid={touched.password && !!passwordError}
              className={`${inputClass} pr-12 ${touched.password && passwordError ? 'border-[#c9503c]' : 'border-[#dfe1d9]'}`}
              placeholder={signUp ? 'Mínimo 8 caracteres' : 'A tua palavra-passe'}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Esconder a palavra-passe' : 'Mostrar a palavra-passe'}
              className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-[#6e756f]"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          {signUp && password.length > 0 && (
            <div className="flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((level) => <span key={level} className={`h-1 flex-1 rounded-full ${strength >= level ? STRENGTH_COLOR[strength] : 'bg-[#e3e5dc]'}`} />)}
              </div>
              <span className="w-[62px] text-right text-[12px] text-[#6e756f]">{STRENGTH_LABEL[strength]}</span>
            </div>
          )}
          {signUp && touched.password && passwordError && <p className="text-[13px] text-[#b03a28]">{passwordError}</p>}
        </div>

        {signUp ? (
          <label className="flex items-start gap-3 text-[13px] leading-5 text-[#4d5851]">
            <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#1d4d41]" />
            <span>
              Aceito os <Link href="/termos" target="_blank" className="font-semibold text-[#1d4d41] underline">Termos</Link> e a <Link href="/privacidade" target="_blank" className="font-semibold text-[#1d4d41] underline">Privacidade</Link>.
            </span>
          </label>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2.5 text-[13px] text-[#4d5851]">
              <input type="checkbox" checked={shared} onChange={(event) => setShared(event.target.checked)} className="size-5 shrink-0 accent-[#1d4d41]" />
              Computador partilhado
            </label>
            <Link href="/esqueci-a-senha" className="text-[13px] font-semibold text-[#1d4d41]">Esqueceste?</Link>
          </div>
        )}

        <button type="submit" disabled={!valid || busy} aria-busy={loading} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1d4d41] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#153e34] disabled:opacity-50">
          {loading ? <><Spinner />{signUp ? 'A criar a conta…' : 'A entrar…'}</> : signUp ? 'Criar conta' : 'Entrar'}
        </button>
      </form>

      <div className="flex items-center gap-3 text-[12px] text-[#8a918a]" aria-hidden="true"><span className="h-px flex-1 bg-[#e3e5dc]" />ou<span className="h-px flex-1 bg-[#e3e5dc]" /></div>

      {/* Sem as chaves da Google (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET) o botão fica desactivado. */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={!googleEnabled || busy || (signUp && !accepted)}
        aria-busy={googleLoading}
        title={googleEnabled ? undefined : 'Entrar com Google estará disponível em breve'}
        className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#dfe1d9] bg-white px-5 py-3 text-sm font-semibold text-[#202321] transition hover:bg-[#f6f7f2] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {googleLoading ? <Spinner /> : <GoogleMark />}
        Continuar com Google
        {!googleEnabled && <span className="rounded-full bg-[#f1f2ec] px-2 py-0.5 text-[11px] font-semibold text-[#6e756f]">Em breve</span>}
      </button>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] shrink-0">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.87 8.88 4.76 12 4.76z" />
    </svg>
  )
}
