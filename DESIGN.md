# DESIGN.md — Twisisa

Fonte de verdade dos valores: `app/globals.css`. Aqui ficam as regras de uso.

## Cores com propósito (uma cor, um significado)
- Marca `--marca`: acção principal e identidade. Um botão primário por ecrã.
- Sucesso: resposta certa, meta cumprida.
- Erro: só resposta errada, falha, erro de formulário e acções destrutivas.
- Aviso: atenção (sequência em risco, tempo a acabar, disciplina fraca).
- Ajuda (azul): dicas, matéria relacionada, informação.
- Assistente e revisão (índigo): Jonas, Estudar depois, revisão.
- Conquista (dourado): sequência, pontos, ranking.
- Não introduzir cinzentos novos. Texto de apoio usa `--texto-2`. O que é dispensável afasta-se das acções principais (canto de cima à direita ou em baixo à esquerda) e tem cor visível.

## Botões e etiquetas
- Botão = cantos de 14 px (`.btn`). Primário `.btn-primario` (um por ecrã), `.btn-secundario`, `.btn-terciario`, `.btn-perigo`, `.btn-icone`.
- Etiqueta = pílula (`.chip`). Só etiquetas e estados. Nunca parece botão.
- Rótulo de botão: verbo, até 24 caracteres.

## Texto que não quebra
- Botões e cards: uma linha por texto, sem quebra. `.btn` usa `white-space: nowrap`. Em cards, cada linha é um elemento com `white-space: nowrap`.
- Por isso os textos têm de caber: escrever curto, testar a 360 px e a 320 px. Se não cabe, encurta-se o texto; não se deixa quebrar.
- Texto corrido fora de botões e cards (parágrafos) pode quebrar.

## Clicável ou informativo
| Elemento | Parece assim | Nunca |
|---|---|---|
| Botão | Preenchido na cor da marca, texto em verbo | Só texto sem contentor |
| Link | Cor da marca, sublinhado no texto corrido | Igual ao texto normal |
| Cartão clicável | Borda mais forte, seta ou chevron, estado de toque e de foco, o cartão inteiro é a área | Parecer igual a um cartão informativo |
| Cartão informativo | Sem borda forte, sem seta, fundo neutro, cursor normal | Ter seta ou «Abrir» |
| Ícone sozinho | Só se for universal; senão com rótulo | Ícone sem texto numa acção nova |
| Etiqueta (chip) | Pílula, sem estado de toque | Parecer botão |

Regra: a cor da marca só aparece em coisas que se tocam.

## Textos
- Instruções até 12 palavras. Textos de ajuda instruem; nunca explicam razões técnicas ou internas.
- Específico em vez de genérico: «UEM 2025 · Matemática», nunca «Bem-vindo à tua jornada».
- Sem emojis. Sem sombras em cartões: a estrutura vem de linhas de 1 px.

## Tipografia
- Corpo: DM Sans. Títulos: Manrope.

## Moldura única (cabeçalho, menu lateral, tema)
- Um só cabeçalho em toda a plataforma: fixo, opaco e mínimo (52 px), `components/shell/app-header.tsx`. Sem sessão: logo, quatro ligações, tema e conta. Com sessão: menu (telemóvel), tema, notificações e foto.
- Um só menu lateral do aluno (232 px, a partir de 900 px): `components/shell/aluno-aside.tsx`. A lista de ligações está em `components/student-nav.tsx` e serve também a gaveta do telemóvel. Nas páginas públicas aparece quando há sessão (`PublicAsideGate`).
- Sem barra de navegação em baixo (decidido).
- Modo claro/escuro: botão no cabeçalho, escolha guardada em `localStorage` (`tw-tema`), por omissão segue o sistema. O script do `<head>` (`components/shell/theme-script.tsx`) aplica-o antes de pintar. Os tokens escuros estão em `app/globals.css` (secção «twisisa-shell-7»).
- Em páginas novas: usar tokens (`bg-superficie`, `bg-superficie-2`, `border-linha`, `text-texto-2`, `text-on-marca`), nunca `#hex`. Um `#hex` não muda no modo escuro.
- Ecrãs de foco sem menu: onboarding, sessão do Treinar e Jonas.
