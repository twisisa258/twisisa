'use client'

import { useEffect, useState } from 'react'
import type { Anuncio } from '@/lib/anuncios'
import { AnuncioCard } from '@/components/anuncios/anuncio-card'
import { fechar, foiFechado } from '@/lib/dispensar'
import { cn } from '@/lib/utils'

const chave = (anuncio: Anuncio) => `anuncio:${anuncio.id}`

// Anúncios da equipa. Um só: ocupa a largura toda. Vários: deslizam na horizontal e o seguinte espreita ao lado.
// Fechar guarda-se neste aparelho; o anúncio deixa de aparecer sozinho quando a equipa o termina.
export function Anuncios({ items }: { items: Anuncio[] }) {
  const [fechados, setFechados] = useState<string[] | null>(null)

  useEffect(() => {
    setFechados(items.filter((anuncio) => foiFechado(chave(anuncio))).map((anuncio) => anuncio.id))
  }, [items])

  if (fechados === null) return null
  const visiveis = items.filter((anuncio) => !fechados.includes(anuncio.id))
  if (visiveis.length === 0) return null

  return (
    <section aria-label="Anúncios" className="cartao-entra -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
      {visiveis.map((anuncio) => (
        <div key={anuncio.id} className={cn('shrink-0 snap-center', visiveis.length > 1 ? 'w-[88%] lg:w-[70%]' : 'w-full')}>
          <AnuncioCard
            anuncio={anuncio}
            onClose={() => {
              fechar(chave(anuncio))
              setFechados((atual) => [...(atual ?? []), anuncio.id])
            }}
          />
        </div>
      ))}
    </section>
  )
}
