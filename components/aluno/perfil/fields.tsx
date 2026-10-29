// Estilos e campo comuns às secções do perfil.
export const fieldClass =
  'h-11 w-full rounded-xl border border-[#dfe3d9] bg-white px-3.5 text-sm font-normal text-[#202321] outline-none transition-colors placeholder:text-[#9aa29c] focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10 disabled:opacity-60 read-only:bg-[#f3f4ef] read-only:text-[#68716a]'

// `custom`: para selectores personalizados (botões dentro de <label> repetiriam o clique), usa <div> em vez de <label>.
export function Field({ label, hint, custom = false, children }: { label: React.ReactNode; hint?: string; custom?: boolean; children: React.ReactNode }) {
  const Wrapper = custom ? 'div' : 'label'
  return (
    <Wrapper className="grid gap-1.5 text-sm font-medium text-[#202321]">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-[#737c75]">{hint}</span>}
    </Wrapper>
  )
}
