'use client'

import Link from 'next/link'
import { useSession } from '@/lib/auth-client'

// Botões do cabeçalho público. A página é estática (para o Google e para ser rápida): quem já tem sessão vê «Painel» assim que o navegador confirma.
export function AuthLinks() {
  const { data, isPending } = useSession()
  if (data?.user) return <Link href="/aluno" className="btn btn-primario">Painel</Link>
  return (
    <div className={`flex items-center gap-1.5 ${isPending ? 'invisible' : ''}`}>
      <Link href="/sign-in" className="btn btn-terciario">Entrar</Link>
      <Link href="/sign-up" className="btn btn-primario">Criar conta</Link>
    </div>
  )
}
