import { AdminTableSkeleton, SkeletonRegion } from '@/components/skeletons'

export default function Loading() {
  return (
    <SkeletonRegion label="A carregar a administração">
      <AdminTableSkeleton rows={6} columns={4} />
    </SkeletonRegion>
  )
}
