import { Sparkles, type LucideIcon } from 'lucide-react'
import { AdminPage, AdminPageHeader, AdminTabs } from '@/components/admin/page-parts'

// Estrutura comum das páginas do Jonas no admin: faixa verde, separadores (Estado | Modelo) e uma área que rola.
export function JonasShell({ active, children }: { active: 'estado' | 'modelo'; children: React.ReactNode }) {
  return (
    <AdminPage>
      <AdminPageHeader icon={Sparkles} title="Jonas" description="Chave da Groq, modelo e estado do explicador." />
      <AdminTabs
        label="Secções do Jonas"
        tabs={[
          { href: '/admin/jonas', label: 'Estado', active: active === 'estado' },
          { href: '/admin/jonas/modelo', label: 'Modelo', active: active === 'modelo' },
        ]}
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">{children}</div>
    </AdminPage>
  )
}

export const jonasCard = 'rounded-2xl border border-[#e3e5dc] bg-white p-4 sm:p-5'

export function CardTitle({ icon: Icon, children, badge }: { icon: LucideIcon; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2.5 text-sm font-semibold">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f0e9] text-[#1d4d41]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="truncate">{children}</span>
      </h2>
      {badge}
    </div>
  )
}
