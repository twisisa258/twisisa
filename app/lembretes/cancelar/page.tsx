import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { pool } from '@/lib/db'

export const metadata: Metadata = { title: 'Desligar lembretes', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Só um botão faz a alteração (nunca o simples abrir da ligação): alguns leitores de e-mail abrem as ligações sozinhos.
async function unsubscribe(formData: FormData) {
  'use server'
  const token = String(formData.get('token') ?? '')
  if (/^[a-f0-9]{16,128}$/i.test(token)) {
    await pool.query(`UPDATE notification_prefs SET email_enabled = false, updated_at = now() WHERE unsubscribe_token = $1`, [token])
  }
  redirect('/lembretes/cancelar?feito=1')
}

export default async function CancelarLembretes({ searchParams }: { searchParams: Promise<{ token?: string; feito?: string }> }) {
  const { token = '', feito } = await searchParams
  const valid = /^[a-f0-9]{16,128}$/i.test(token)
  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo px-5 text-texto">
      <div className="w-full max-w-[420px] rounded-3xl border border-linha bg-white p-7">
        {feito ? (
          <>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em]">Lembretes desligados</h1>
            <p className="mt-2 text-[15px] leading-6 text-texto-2">Não vais receber mais lembretes por e-mail. Podes voltar a ligá-los quando quiseres, na tua conta.</p>
            <Link href="/aluno/lembretes" className="btn btn-secundario mt-5">Gerir lembretes</Link>
          </>
        ) : valid ? (
          <>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em]">Desligar os lembretes?</h1>
            <p className="mt-2 text-[15px] leading-6 text-texto-2">Deixas de receber o e-mail diário de estudo. Os teus dados e o teu progresso ficam como estão.</p>
            <form action={unsubscribe} className="mt-5 flex flex-col gap-2">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="btn btn-primario btn-grande">Desligar lembretes</button>
              <Link href="/aluno" className="btn btn-terciario">Manter</Link>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em]">Ligação inválida</h1>
            <p className="mt-2 text-[15px] leading-6 text-texto-2">Esta ligação não funciona. Entra na tua conta para gerir os lembretes.</p>
            <Link href="/aluno/lembretes" className="btn btn-secundario mt-5">Gerir lembretes</Link>
          </>
        )}
      </div>
    </main>
  )
}
