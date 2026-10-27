import Image from 'next/image'

/** Loader global de segmentos de rota do App Router. */
export default function Loading() {
  return (
    <main className="global-loader" role="status" aria-live="polite" aria-label="A carregar o Twisisa">
      <div className="global-loader__content">
        <div className="global-loader__mark">
          <Image src="/images/twisisa-mark.png" alt="Logótipo Twisisa" width={120} height={65} priority className="global-loader__logo" />
          <span className="global-loader__orbit" aria-hidden="true" />
        </div>
        <span className="global-loader__caption">A carregar</span>
      </div>
    </main>
  )
}
