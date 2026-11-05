import { Segmentado } from '@/components/ui/segmentado'

const TABS = [
  { key: 'principal', label: 'Principal', href: '/aluno/simulador' },
  { key: 'configuracoes', label: 'Configurações', href: '/aluno/simulador/configuracoes' },
] as const

export function SimTabs({ active }: { active: (typeof TABS)[number]['key'] }) {
  return <Segmentado label="Simulador" items={TABS.map((tab) => ({ href: tab.href, label: tab.label, active: tab.key === active }))} />
}
