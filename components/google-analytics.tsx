'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { GA_ID } from '@/lib/analytics'

// Áreas que nunca entram nas estatísticas (equipa interna).
const PRIVATE_PREFIXES = ['/admin']

function isPrivate(pathname: string) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function GoogleAnalytics() {
  const pathname = usePathname()

  // O GA4 regista sozinho as mudanças de página (navegação sem recarregar).
  // Aqui só se liga e desliga o envio consoante a área em que o utilizador está.
  useEffect(() => {
    if (!GA_ID) return
    ;(window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = isPrivate(pathname)
  }, [pathname])

  if (!GA_ID || process.env.NODE_ENV !== 'production') return null

  const id = JSON.stringify(GA_ID)
  const init = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
if (location.pathname === '/admin' || location.pathname.indexOf('/admin/') === 0) { window['ga-disable-' + ${id}] = true; }
gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
gtag('js', new Date());
gtag('config', ${id});
`

  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">{init}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`} strategy="afterInteractive" />
    </>
  )
}
