import { groupByYear, type LibraryItem } from '@/lib/library-shared'
import { MaterialCard } from '@/components/biblioteca/material-card'

// Duas colunas no telemóvel (mais no computador). Em listas ordenadas por ano, cada ano ganha o seu título: a biblioteca organiza-se sozinha à medida que cresce.
export function MaterialGrid({ items, byYear = false, showCategory = false }: { items: LibraryItem[]; byYear?: boolean; showCategory?: boolean }) {
  const groups = byYear && items.some((item) => item.year !== null) ? groupByYear(items) : [{ year: null, items }]
  const titled = groups.length > 1 || groups[0]?.year !== null
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.year ?? 'sem-ano'} aria-label={group.year ? String(group.year) : 'Sem ano'}>
          {titled && (
            <h3 className="mb-3 flex items-center gap-3">
              <span className="num text-[17px] font-semibold tracking-[-0.02em] text-texto">{group.year ?? 'Sem ano'}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-linha" />
              <span className="text-[12px] text-texto-2">{group.items.length}</span>
            </h3>
          )}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {group.items.map((item) => (
              <li key={item.id} className="min-w-0">
                <MaterialCard item={item} showCategory={showCategory} hideYear={titled && group.year !== null} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
