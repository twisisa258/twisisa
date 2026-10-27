import { Brand } from '@/components/brand'
import { BackToSignIn, RequestResetForm } from '@/components/password-reset-form'

export default function ForgotPasswordPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5 py-12 text-[#202321]"><div className="w-full max-w-[420px]"><Brand /><div className="mt-8 rounded-[28px] border border-[#e0e2d9] bg-white p-6 shadow-[0_24px_60px_rgba(35,54,44,0.08)] sm:p-8"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4d41]">recuperar conta</p><h1 className="mt-3 text-3xl font-medium tracking-[-0.06em]">Esqueceste a palavra-passe?</h1><p className="mt-3 text-sm leading-6 text-[#6e756f]">Escreve o e-mail da tua conta e enviamos uma ligação para escolheres uma nova.</p><div className="mt-8"><RequestResetForm /></div><BackToSignIn /></div></div></main>
}
