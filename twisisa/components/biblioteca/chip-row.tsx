import Link from 'next/link'

export type Chip = { key: string; label: string; href: string; active: boolean; count?: number }

// Fila de botões (instituições, tipos). Desliza na horizontal para não ocupar altura.
export function ChipRow({ label, chips }: { label: string; chips: Chip[] }) {
  if (chips.length === 0) return null
  return (
    <nav aria-label={label} className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-2 lg:w-auto lg:flex-wrap">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={chip.href}
              aria-current={chip.active ? 'true' : undefined}
              className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold ${
                chip.active
                  ? 'bg-marca text-white'
                  : 'border border-linha bg-white text-[#465249] transition-colors hover:border-marca hover:text-marca'
              }`}
            >
              {chip.label}
              {chip.count !== undefined && <span className={`text-[11px] font-medium ${chip.active ? 'text-white/75' : 'text-texto-2'}`}>{chip.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
