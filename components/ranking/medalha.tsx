// Medalha de ouro, prata ou bronze: fita, disco metálico e o número do lugar.
const METAL = {
  1: { claro: '#fff0b3', medio: '#f2c14e', escuro: '#b7791f', aro: '#8a5a12', fita: ['#1d4d41', '#2f7260'] },
  2: { claro: '#ffffff', medio: '#cfd6dd', escuro: '#8d99a6', aro: '#5f6b78', fita: ['#1d4d41', '#2f7260'] },
  3: { claro: '#fbe0c4', medio: '#dba06a', escuro: '#a8642b', aro: '#7a4515', fita: ['#1d4d41', '#2f7260'] },
} as const

export function Medalha({ lugar, size = 30 }: { lugar: 1 | 2 | 3; size?: number }) {
  const c = METAL[lugar]
  const id = `medalha-${lugar}`
  return (
    <svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 32 40" role="img" aria-label={`${lugar}.º lugar`}>
      <defs>
        <linearGradient id={id} x1="6" y1="12" x2="26" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={c.claro} />
          <stop offset="0.5" stopColor={c.medio} />
          <stop offset="1" stopColor={c.escuro} />
        </linearGradient>
      </defs>
      <path d="M8 0h7l4 15h-7z" fill={c.fita[0]} />
      <path d="M24 0h-7l-4 15h7z" fill={c.fita[1]} />
      <circle cx="16" cy="26" r="13" fill={`url(#${id})`} stroke={c.aro} strokeWidth="1.2" />
      <circle cx="16" cy="26" r="9.5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" />
      <text x="16" y="31" textAnchor="middle" fontSize="14" fontWeight="800" fill={c.aro} fontFamily="inherit">{lugar}</text>
    </svg>
  )
}
