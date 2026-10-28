import { notFound, redirect } from 'next/navigation'
import { MODE_SLUGS } from '@/lib/simulator-shared'

export default async function ModeRedirect({ params, searchParams }: { params: Promise<{ modo: string }>; searchParams: Promise<{ d?: string }> }) {
  const [{ modo }, { d }] = await Promise.all([params, searchParams])
  const mode = MODE_SLUGS[modo]
  if (!mode) notFound()
  redirect(`/aluno/simulador?${d ? `d=${encodeURIComponent(d)}&` : ''}m=${mode}`)
}
