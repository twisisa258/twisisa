# Pontos, nota e ranking (regra única)

Fonte do código: `lib/quiz-engine.ts` (puro, testado em `tests/quiz-engine.test.ts`), `lib/simulator.ts`, `lib/ranking.ts`, `lib/desafios-regras.ts`.

| Medida | Definição | Onde aparece |
|---|---|---|
| **Peso** da questão | 2 a 4, pela dificuldade da questão e da variante; × fator de repetição (100 %, 50 %, 25 %… mínimo 10 %) | guardado em `attempt_items.weight` |
| **Pontos** | peso, só se acertar, menos 25 % por cada dica pedida (mínimo 25 %) | resultado, ranking, missão semanal |
| **Nota (0–20)** | **20 × pontos ganhos ÷ pontos possíveis** (soma dos pesos) | resultado, histórico, `/simulado` |
| **Ranking** | soma de pontos na semana (segunda 00:00, Maputo) ou geral, entre alunos do mesmo percurso | `/aluno/ranking` |
| **Meta diária / sequência** | respostas dadas no dia (10), não pontos | painel, desafios |

Pontos e nota são a mesma medida em duas escalas. Antes, a nota ignorava as dicas e os pontos não: o mesmo simulado dava dois «resultados» que não batiam. Agora as dicas descontam aos dois.

Dados antigos (antes da migração 0018) tinham pontos maiores que o peso: a nota limita cada questão ao seu peso (`LEAST(points, weight)`).

## Decisões em aberto (para o dono do produto)
1. Em «Revisar erros» o fator de repetição reduz os pontos: rever erros rende pouco no ranking. Manter, ou dar peso cheio na revisão?
2. A nota usa o peso já reduzido pela repetição. Manter (treino repetido pesa menos) ou calcular a nota com o peso base?
3. Pontos da semana não distinguem modo rápido de prática.
