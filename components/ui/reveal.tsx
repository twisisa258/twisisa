'use client'

import { createElement, useEffect, useRef, type ReactNode } from 'react'

type Tag = 'div' | 'li' | 'section' | 'article' | 'ul' | 'ol'

// Entrada suave ao fazer scroll. O HTML do servidor já vem visível (Google e leitores de ecrã veem tudo):
// só depois de a página carregar é que o que está abaixo do ecrã é escondido e revelado quando aparece.
// Sem movimento para quem pediu «reduzir movimento» e para o que já está visível ao abrir.
export function Reveal({ children, delay = 0, className = '', as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: Tag }) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return
    el.classList.add('rv')
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.classList.add('rv-in')
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return createElement(as, { ref, className, style: delay ? { ['--d' as string]: `${delay}s` } : undefined }, children)
}
