import Link from 'next/link'
import { FileText } from 'lucide-react'
import type { CategoryCount } from '@/lib/library'
import { ICONES_SECCAO } from '@/components/biblioteca/section-row'

// Um cartão por tipo de material que tem conteúdo. Se aparecerem novos tipos na administração, aparecem aqui sem mexer no código.
export function CategoryTiles({ categories }: { categories: CategoryCount[] }) {
  return (
    <nav aria-label="Tipos de material" className="tom-ajuda grid grid-cols-2 gap-3">
      {categories.map((item) => {
        const Icon = ICONES_SECCAO[item.slug] ?? FileText
        return (
          <Link key={item.slug} href={`/biblioteca/${item.slug}`} className="sf sf-toque flex items-center gap-3 p-3.5 no-underline">
            <span className="ic-tom"><Icon size={19} aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-[15px] font-semibold leading-5 text-texto">{item.name}</span>
              <span className="num block text-[12px] leading-4 text-texto-2">{item.count} {item.count === 1 ? 'material' : 'materiais'}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
