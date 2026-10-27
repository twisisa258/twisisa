import Image from 'next/image'
import Link from 'next/link'

export function Brand({ href = '/', compact = false }: { href?: string; compact?: boolean }) {
  return <Link href={href} aria-label="Twisisa — página inicial" className="inline-flex min-w-0 items-center gap-2.5">
    <Image src="/images/twisisa-mark.png" alt="" width={44} height={24} priority className="h-6 w-auto object-contain" />
    {!compact && <span className="text-lg font-semibold tracking-[-0.05em] text-[#202321]">Twisisa</span>}
  </Link>
}
