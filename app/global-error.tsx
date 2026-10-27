'use client'

import { useEffect } from 'react'

// Último recurso: erro no layout raiz. Substitui o <html> inteiro, por isso não depende de CSS, fontes nem providers.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[GLOBAL]', error)
  }, [error])

  return (
    <html lang="pt">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8f8f5', color: '#202321' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 360, width: '100%', background: '#fff', border: '1px solid #e3e5dc', borderRadius: 24, padding: 24, textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>Algo correu mal</h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#68736a', margin: '0 0 20px' }}>Não foi possível carregar o Twisisa. Tenta outra vez; se continuar, volta mais tarde.</p>
            <button type="button" onClick={reset} style={{ height: 44, padding: '0 20px', borderRadius: 999, border: 0, background: '#1d4d41', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Tentar outra vez
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
