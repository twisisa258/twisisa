import { cn } from '@/lib/utils'

// O selo de quem tem o Twisisa Plus ativo: círculo ondulado em verde-claro com um visto. É o ÚNICO sítio onde o selo é desenhado;
// aparece ao lado do nome ou da foto (cabeçalho, menu lateral, cartão, página do plano) e só para quem tem Plus ativo.
// A cor vem de `--selo` e `--selo-visto` (app/globals.css, secção «twisisa-plano-8»), por isso muda sozinha no modo escuro.
// `decorativo`: quando o texto ao lado já diz «Plus», o leitor de ecrã ignora o selo.
const FORMA =
  'M23.5 12.0L23.3 12.7L22.8 13.4L22.1 14.0L21.4 14.5L20.8 15.0L20.5 15.5L20.3 16.1L20.4 16.9L20.6 17.7L20.6 18.6L20.5 19.4L20.1 20.1L19.4 20.5L18.6 20.6L17.7 20.6L16.9 20.4L16.1 20.3L15.5 20.5L15.0 20.8L14.5 21.4L14.0 22.1L13.4 22.8L12.7 23.3L12.0 23.5L11.3 23.3L10.6 22.8L10.0 22.1L9.5 21.4L9.0 20.8L8.5 20.5L7.9 20.3L7.1 20.4L6.3 20.6L5.4 20.6L4.6 20.5L3.9 20.1L3.5 19.4L3.4 18.6L3.4 17.7L3.6 16.9L3.7 16.1L3.5 15.5L3.2 15.0L2.6 14.5L1.9 14.0L1.2 13.4L0.7 12.7L0.5 12.0L0.7 11.3L1.2 10.6L1.9 10.0L2.6 9.5L3.2 9.0L3.5 8.5L3.7 7.9L3.6 7.1L3.4 6.3L3.4 5.4L3.5 4.6L3.9 3.9L4.6 3.5L5.4 3.4L6.3 3.4L7.1 3.6L7.9 3.7L8.5 3.5L9.0 3.2L9.5 2.6L10.0 1.9L10.6 1.2L11.3 0.7L12.0 0.5L12.7 0.7L13.4 1.2L14.0 1.9L14.5 2.6L15.0 3.2L15.5 3.5L16.1 3.7L16.9 3.6L17.7 3.4L18.6 3.4L19.4 3.5L20.1 3.9L20.5 4.6L20.6 5.4L20.6 6.3L20.4 7.1L20.3 7.9L20.5 8.5L20.8 9.0L21.4 9.5L22.1 10.0L22.8 10.6L23.3 11.3Z'

export function SeloPlus({ className, decorativo = false }: { className?: string; decorativo?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('selo-plus', className)} {...(decorativo ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Assinante Plus' })}>
      <path d={FORMA} className="selo-plus-forma" />
      <path d="M7.6 12.5l3 3 5.9-6.4" className="selo-plus-visto" />
    </svg>
  )
}
