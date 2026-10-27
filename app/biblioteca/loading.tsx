import { CardGridSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <CardGridSkeleton count={6} label="A carregar a biblioteca" />
    </main>
  )
}
