export function SimHeader({ context }: { context?: string }) {
  return (
    <header>
      <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Simulador</h1>
      {context && <p className="mt-0.5 text-[14px] text-[#7d857e]">{context}</p>}
    </header>
  )
}
