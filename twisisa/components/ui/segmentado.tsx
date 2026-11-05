import Link from 'next/link'

export type SegmentoItem = { href: string; label: string; active: boolean }

// Seletor de partes iguais (ex.: Semana | Geral). Cada parte é uma ligação, por isso funciona sem JavaScript.
// O texto nunca parte: as etiquetas têm de ser curtas (ver `.seg` em globals.css).
export function Segmentado({ label, items }: { label: string; items: SegmentoItem[] }) {
  return (
    <nav aria-label={label} className="seg">
      {items.map((item) => (
        <Link key={item.href} href={item.href} scroll={false} aria-current={item.active ? 'page' : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
