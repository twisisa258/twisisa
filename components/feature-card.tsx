import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

// Componente de servidor (sem 'use client'): recebe o ícone como componente e pode ser usado em páginas de servidor.
// Estava dentro de student-feature-shell.tsx (cliente), e passar um ícone de uma página de servidor para um
// componente de cliente dá erro («Functions cannot be passed directly to Client Components»).
export function FeatureCard({ icon: Icon, title, text, href }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string; href?: string }) {
  const content = (
    <div className="rounded-3xl border border-[#e3e5dc] bg-white p-6">
      <Icon className="text-[#1d4d41]" />
      <h2 className="mt-5 text-xl font-medium">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#7d857e]">{text}</p>
      {href && <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1d4d41]">Abrir <ArrowUpRight /></span>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}
