import Link from 'next/link'
import { BookMarked, BookOpen, ChevronRight, FileText, FolderOpen, GraduationCap, Layers } from 'lucide-react'
import { getCategoryCounts } from '@/lib/library'
import { MAIN_SECTIONS } from '@/lib/library-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { EmptyState } from '@/components/states/empty-state'
import { requireStudent } from '@/lib/require-student'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Explorar a biblioteca | Twisisa', robots: { index: false } }

const icons: Record<string, typeof BookOpen> = {
  exames: FileText,
  apontamentos: BookOpen,
  resumos: BookMarked,
  fichas: GraduationCap,
  guias: GraduationCap,
  livros: BookMarked,
}

const tile = 'flex min-h-[88px] items-center gap-3 rounded-2xl p-4 shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.22)]'

// Segunda página da Biblioteca: todas as categorias com o número de materiais. Cada uma abre a sua própria lista.
export default async function ExplorarPage() {
  const session = await requireStudent('/biblioteca/explorar')
  const firstName = session.user.name.split(' ')[0]

  let categories: Awaited<ReturnType<typeof getCategoryCounts>> | null = null
  try {
    categories = await getCategoryCounts()
  } catch (error) {
    console.error('[BIBLIOTECA] Erro ao listar categorias', error)
  }

  const main = new Set<string>(MAIN_SECTIONS.map((section) => section.slug))
  const ordered = categories ? [...categories.filter((item) => main.has(item.slug)), ...categories.filter((item) => !main.has(item.slug))] : []
  const total = ordered.reduce((sum, item) => sum + item.count, 0)

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Biblioteca" title="Explorar" backHref="/biblioteca" backLabel="Biblioteca">
      {!categories ? (
        <EmptyState title="Não foi possível carregar" description="Tenta outra vez dentro de instantes." icon={FolderOpen} />
      ) : ordered.length === 0 ? (
        <EmptyState title="A biblioteca ainda não tem materiais" icon={BookOpen} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <Link href="/biblioteca/pesquisa" className={`${tile} bg-gradient-to-br from-[#2f7260] to-[#1d4d41] text-white`}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.16]"><Layers size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">Todos os materiais</span>
                <span className="block text-xs text-white/70">{total === 1 ? '1 material' : `${total} materiais`}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 opacity-70" />
            </Link>
          </li>
          {ordered.map((item) => {
            const Icon = icons[item.slug] ?? FolderOpen
            const label = MAIN_SECTIONS.find((section) => section.slug === item.slug)?.title ?? item.name
            return (
              <li key={item.slug}>
                <Link href={`/biblioteca/${item.slug}`} className={`${tile} bg-gradient-to-br from-white to-[#f1f5ef] text-[#202321]`}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e4eee8] to-[#cbddd2] text-[#1d4d41]"><Icon size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{label}</span>
                    <span className="block text-xs text-[#788178]">{item.count === 1 ? '1 material' : `${item.count} materiais`}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-[#929b94]" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </StudentFeatureShell>
  )
}
