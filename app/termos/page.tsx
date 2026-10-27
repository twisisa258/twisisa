import Link from 'next/link'
import { Brand } from '@/components/brand'

const sections = [
  ['1. Sobre o serviço', 'O Twisisa é uma plataforma de apoio ao estudo para estudantes em Moçambique. Disponibilizamos materiais, simulados, desafios, comunidade e ferramentas de organização da aprendizagem.'],
  ['2. Conta e utilização', 'Deves fornecer informação verdadeira ao criar uma conta e manter as tuas credenciais seguras. A tua conta é pessoal e não deve ser partilhada. Usa a plataforma apenas para fins legais e académicos.'],
  ['3. Conteúdo e comunidade', 'Respeita os outros membros. Não publiques conteúdo ilegal, ofensivo, enganador, discriminatório ou que viole direitos de terceiros. Podemos remover conteúdo que viole estas regras.'],
  ['4. Materiais de estudo', 'Os materiais são disponibilizados para apoio educativo. Embora procuremos manter a informação correta e atualizada, o conteúdo não substitui orientação de professores, instituições ou fontes oficiais.'],
  ['5. Planos e pagamentos', 'As funcionalidades pagas, quando disponíveis, são apresentadas antes da subscrição. Os pagamentos são processados por parceiros especializados. A gestão da subscrição e eventuais reembolsos seguem as condições apresentadas no checkout.'],
  ['6. Disponibilidade', 'Trabalhamos para manter o serviço disponível, mas podem ocorrer interrupções para manutenção, segurança ou motivos fora do nosso controlo.'],
  ['7. Alterações', 'Podemos atualizar estes termos para refletir melhorias no serviço ou alterações legais. Quando a alteração for relevante, comunicaremos através da plataforma.'],
]

export default function TermsPage() {
  return <main className="min-h-screen bg-[#f8f8f5] text-[#202321]"><header className="border-b border-[#e5e6df] bg-[#f8f8f5]/95"><div className="mx-auto flex h-[72px] max-w-[900px] items-center justify-between px-5"><Brand /><Link href="/" className="text-sm font-medium text-[#1d4d41]">Voltar ao início</Link></div></header><article className="mx-auto max-w-[760px] px-5 py-14 sm:py-20"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1d4d41]">Informação legal</p><h1 className="mt-4 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">Termos de uso</h1><p className="mt-5 text-sm leading-6 text-[#737a73]">Última atualização: 22 de outubro de 2026</p><div className="mt-12 space-y-9">{sections.map(([title, body]) => <section key={title}><h2 className="text-lg font-semibold tracking-[-0.03em]">{title}</h2><p className="mt-3 text-sm leading-7 text-[#606860]">{body}</p></section>)}</div><div className="mt-14 border-t border-[#e2e4dc] pt-6 text-sm text-[#737a73]"><p>Questões sobre estes termos? Fala connosco através dos canais disponíveis na plataforma.</p><Link href="/privacidade" className="mt-3 inline-block font-semibold text-[#1d4d41]">Ler a política de privacidade</Link></div></article></main>
}
