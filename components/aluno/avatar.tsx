import { avatarUrl } from '@/lib/perfil'

// Foto redonda do aluno (ou a inicial, se não tiver foto). Serve em páginas de servidor e de cliente.
// O fundo em degradê serve de «carregamento» enquanto a imagem chega.
export function Avatar({ name, image, size = 40, className = '' }: { name: string; image?: string | null; size?: number; className?: string }) {
  const src = avatarUrl(image, size * 2)
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#e1ece5] to-[#cfe0d5] font-semibold text-[#1d4d41] ${className}`}
    >
      {src ? <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" /> : name.trim().slice(0, 1).toUpperCase()}
    </span>
  )
}
