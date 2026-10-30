// O onboarding não usa o esqueleto do painel (menu lateral): só um fundo neutro enquanto carrega.
export default function Loading() {
  return <div className="min-h-[100dvh] bg-[#f8f8f5]" aria-hidden="true" />
}
