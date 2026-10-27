import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Flame, Trophy, Users } from 'lucide-react'
import { auth } from '@/lib/auth'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { ChallengeBoard } from '@/components/challenge-board'

export default async function DesafiosPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const stats = [
    { icon: Flame, value: '4', label: 'dias seguidos' },
    { icon: Trophy, value: '2', label: 'concluídos' },
    { icon: Users, value: '12', label: 'na turma' },
  ]

  return (
    <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="Desafios" title="Desafios da semana.">
      <div className="mb-6 grid grid-cols-3 gap-3 sm:mb-8 sm:gap-6" aria-label="Resumo dos desafios">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Icon className="size-[18px] shrink-0 text-[#1d4d41] sm:size-5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight text-[#202321] sm:text-xl">{value}</p>
              <p className="mt-1 text-[10px] leading-tight text-[#7d857e] sm:text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <ChallengeBoard />
    </StudentFeatureShell>
  )
}
