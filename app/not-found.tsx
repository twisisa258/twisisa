import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5 py-16 text-[#202321]">
      <section className="w-full max-w-xl text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-[#dce9e2] text-[#1d4d41]">
          <Search aria-hidden="true" size={24} />
        </div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#1d4d41]">Página não encontrada</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Este caminho ainda não existe.</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#68716c]">A página pode ter sido movida ou o endereço pode estar incorreto. Volta ao início e continua a explorar.</p>
        <Link href="/" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#163b32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4d41]">
          <ArrowLeft aria-hidden="true" size={17} />
          Voltar ao início
        </Link>
      </section>
    </main>
  )
}
