import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Ícones do desenho «aluno · telemóvel», copiados tal como estão (grelha 24, traço 2, extremidades redondas).
const ICONS = {
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  bell: <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6M9 17v1a3 3 0 0 0 6 0v-1" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  file: <path d="M14 3v4a1 1 0 0 0 1 1h4M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />,
  up: <path d="M7 17L17 7M8 7h9v9" />,
  book: <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13M12 6v13M21 6v13" />,
  test: <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM9 14l2 2l4-4" />,
  spark: <path d="M5 12a6 6 0 0 0 6-6a6 6 0 0 0 6 6a6 6 0 0 0-6 6a6 6 0 0 0-6-6zM18 4v4M16 6h4" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  flame: <path d="M12 3c1 3-3 5-3 9a3 3 0 0 0 6 0c0-1-.5-2-1-3c3 1 5 4 5 7a7 7 0 0 1-14 0c0-6 5-8 7-13z" />,
  down: <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5l5-5M12 4v12" />,
  mark: <path d="M9 4h6a2 2 0 0 1 2 2v14l-5-3l-5 3V6a2 2 0 0 1 2-2z" />,
  hist: <path d="M12 8v4l2 2M3 4v7h7M3.5 15a9 9 0 1 0 .5-6" />,
  chev: <path d="M9 6l6 6l-6 6" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

export function Ic({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      {ICONS[name]}
    </svg>
  )
}
