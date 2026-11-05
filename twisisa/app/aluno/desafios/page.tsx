import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { buildAvisos } from '@/lib/avisos'
import { getDesafios, type DesafiosSnapshot } from '@/lib/desafios'
import { requireSimulatorScope } from '@/lib/simulator-scope'
import { CalendarRange, Sun, Target } from 'lucide-react'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { Avisos } from '@/components/aluno/avisos'
import { MissionList, ReadinessCard, Regras, StreakCard } from '@/components/aluno/desafios/parts'
import { ErrorState } from '@/components/states/error-state'

export const metadata = { title: 'Desafios | Twisisa', description: 'Sequência, missões do dia e da semana e prontidão para o teu curso.' }
export const dynamic = 'force-dynamic'

export default async function DesafiosPage() {
  const { scope, firstName } = await requireSimulatorScope({ next: '/aluno/desafios' })
  const [profile] = await db.select({ targetCourseId: studentProfiles.targetCourseId, dailyGoal: studentProfiles.dailyGoal }).from(studentProfiles).where(eq(studentProfiles.userId, scope.userId)).limit(1)

  let data: DesafiosSnapshot | null = null
  try {
    data = await getDesafios({ scope, targetCourseId: profile?.targetCourseId ?? null, dailyGoal: profile?.dailyGoal ?? null })
  } catch (error) {
    console.error('[DESAFIOS]', error)
  }

  // A meta de hoje e a sequência já estão no cartão de cima: não se repetem nos avisos.
  const avisos = data ? buildAvisos(data).filter((aviso) => aviso.id !== 'done' && aviso.id !== 'daily') : []
  const daysToSunday = data ? 6 - data.weekday : 0

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Desafios" title="Desafios" description="Missões diárias e semanais, e a tua prontidão." icon={Target} tone="conquista" hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        {!data ? (
          <ErrorState title="Não foi possível carregar os desafios" description="Tenta outra vez daqui a pouco." />
        ) : (
          <>
            <StreakCard s={data} />
            <Avisos items={avisos} />
            <MissionList title="Hoje" hint="acaba às 24:00" missions={data.daily} icon={Sun} tone="marca" />
            <MissionList title="Esta semana" hint={daysToSunday === 0 ? 'acaba hoje' : `acaba em ${daysToSunday} ${daysToSunday === 1 ? 'dia' : 'dias'}`} missions={data.weekly} icon={CalendarRange} tone="conquista" />
            <ReadinessCard s={data} />
            <Regras admission={data.admission} goal={data.goal} />
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
