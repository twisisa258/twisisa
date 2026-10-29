import { Skeleton } from '@/components/skeletons/skeleton'
import { StudentShellSkeleton } from '@/components/skeletons/student-shell'

export default function Loading() {
  return (
    <StudentShellSkeleton>
      <div className="max-w-[520px] space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-12 w-full rounded-full sm:w-40" />
      </div>
    </StudentShellSkeleton>
  )
}
