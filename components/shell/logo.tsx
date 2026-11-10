import Image from 'next/image'
import Link from 'next/link'

// Marca do cabeçalho e do menu lateral: igual em todas as áreas.
export function ShellLogo({ href = '/', className = '' }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`sh-brand ${className}`} aria-label="Twisisa, início">
      <Image src="/images/twisisa-mark.png" alt="" width={44} height={24} priority className="h-6 w-auto" />
      Twisisa
    </Link>
  )
}
