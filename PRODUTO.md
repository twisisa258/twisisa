# PRODUTO.md — Twisisa

Contexto-mestre. Cola este ficheiro no início de qualquer conversa de design ou de produto.

PRODUTO: Twisisa, plataforma de estudo (hoje Moçambique; desenhada para qualquer país).
PÚBLICO: 13–24 anos, Android, ecrã de 360px, dados caros, rede instável.
PROMESSA: em 10 segundos o aluno sabe O QUE fazer, PORQUÊ e QUE GANHO tem.

REGRAS
- Uma acção principal por ecrã.
- Instruções até 12 palavras.
- Nada de dados inventados: usar «—» ou estado vazio.
- O que é clicável parece clicável; o informativo não.
- Só tokens de `app/globals.css`.
- Sem emojis. Sem cartões com sombra.
- Nenhum texto dentro de botões ou cards quebra de linha (ver DESIGN.md).

VOZ: português de Moçambique, directo, sem culpa («faltam 6», não «falhaste»).

PROIBIDO (cara de IA): gradiente roxo, Inter por defeito, cartões dentro de cartões, número gigante a brilhar, tudo centrado, ícone num círculo colorido em todos os cartões.

MÉTRICAS: CURR (percentagem dos activos de hoje que também estiveram activos na semana anterior), tempo até ao primeiro estudo, percentagem que activa push, partilhas por canal.

NOMES (um por coisa)
- Treinar: praticar questões, sem pressão (hoje `/aluno/simulador`).
- Simulado: prova completa com tempo e nota (módulo ainda «Em breve»; não entra no menu até abrir).
- Exames: arquivo de exames reais por universidade e ano (`/exames`).

SEQUÊNCIA E META (decidido na Fase 0)
- Sequência = 1 acção mínima por dia (3 questões, `STREAK_MIN` em `lib/desafios-regras.ts`, nunca mais do que a meta do aluno).
- Meta diária = barra à parte (`DAILY_GOAL` ou a meta escolhida no onboarding).
