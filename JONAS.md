# Jonas, o explicador do Twisisa

Decisões de 27/10/2026. IA: **Groq**. Sem limites de produto por agora.

## 1. O que é

O Jonas não é só uma caixa de chat: é um espaço de estudo com **histórico por conversa**, contextualizado ao percurso do aluno, e é também quem **explica as questões dentro do Simulador**.

## 2. Página `/jonas`

- Ecrã inteiro, **sem o menu do estudante** (nada distrai). Seta de voltar ao painel no cabeçalho.
- **Barra lateral de histórico** que fecha: no computador recolhe e expande; no telemóvel é uma gaveta com fundo escurecido. Tem «Nova conversa», pesquisa (sem acentos), grupos (Hoje, Ontem, Últimos 7 dias, Últimos 30 dias, Mais antigas), e por conversa: abrir, mudar o nome e eliminar (com confirmação).
- **Nova conversa contextualizada aos estudos**: saudação com o percurso do aluno, escolha opcional da **disciplina** (entra no prompt e fica na conversa) e quatro pontos de partida (explicar um conceito, resolver um exercício, plano de estudo, dúvida de um exame) que preenchem a caixa de texto.
- **Respostas formatadas**: `**negrito**`, listas, títulos, tabelas e **KaTeX** (`$x^2$` na linha, `$$…$$` em bloco; `\( \)` e `\[ \]` também funcionam). Durante a escrita, marcas ainda por fechar ficam como texto até fecharem. Nunca se usa HTML vindo do modelo (`lib/jonas-markdown.ts` gera uma árvore; `components/jonas/rich-text.tsx` desenha-a).
- Parar a resposta, copiar, «Responder de novo», «Tentar de novo» depois de uma falha (reaproveita a conversa já criada), título automático a partir da primeira mensagem, saltar para o fim se o aluno subiu a ler.
- Enter envia no computador; no telemóvel muda de linha (envia-se pelo botão).

## 3. Explicação no Simulador

`components/simulador/jonas-explain.tsx`, usada no jogador (`session-player.tsx`) e na revisão do resultado (`result-view.tsx`).

1. O aluno responde e toca em **Ver explicação**.
2. A folha tenta ler a explicação já guardada (`GET /api/jonas/explicar`). Se não há, pede o **passo a passo** (`POST`, `action: 'passo'`).
3. Atalhos: `devagar`, `exemplo`, `outras`, `resumo`; ou pergunta livre (`pergunta`, até 1000 caracteres).
4. Se o Jonas falhar: erro claro + «Tentar de novo», e a explicação da equipa (se existir).

O servidor monta o contexto **a partir da base de dados** (nunca do que o navegador diz): enunciado, opções **na ordem em que o aluno as viu**, a opção certa, a escolhida, tema, variante, descrição (`alt`) das figuras e a explicação da equipa como referência. O prompt diz ao Jonas que a opção certa está confirmada e que nunca a contrarie.

## 4. Dados (migração `0019_jonas.sql`)

| Tabela | Para quê |
|---|---|
| `jonas_conversations` | `kind = 'chat'` (aparece na barra lateral) ou `'simulador'` (uma por aluno, tentativa e posição). Título, disciplina, tentativa/questão |
| `jonas_messages` | Mensagens (`user`/`assistant`), ordenadas por `id` |

Tudo é filtrado pelo aluno dono. Apagar o aluno apaga as conversas (`ON DELETE CASCADE`). As conversas do Simulador não aparecem na lista, mas ficam guardadas como referência.

## 5. API (todas exigem sessão)

| Rota | Função |
|---|---|
| `POST /api/jonas` | Chat. `{ conversationId?, message, subjectId? }` ou `{ conversationId, regenerate: true }`. Resposta: texto em fluxo; cabeçalhos `X-Conversation-Id` e `X-Conversation-Title` |
| `GET /api/jonas/conversas` | Lista |
| `GET/PATCH/DELETE /api/jonas/conversas/[id]` | Abrir, mudar o nome, eliminar |
| `GET/POST /api/jonas/explicar` | Explicação de uma questão (ver 3) |

Falhas antes do primeiro texto devolvem JSON `{ error }` com estado certo (401, 404, 429, 502, 503). O texto que chegou é guardado mesmo que o aluno cancele.

## 6. Segurança

- Chave da Groq só no servidor. Sem ferramentas nem acesso à base de dados para o modelo.
- Prompt: âmbito só estudo (frase fixa para o resto), nunca revelar instruções, texto colado é dado e não ordem, não inventar fontes.
- Mensagem até 4000 caracteres; histórico enviado ao modelo limitado a 10 mensagens.
- Erros técnicos (chave, modelo) vão para os registos do servidor; o aluno vê uma mensagem simpática.
- Um prompt reduz o risco, não o elimina. Falta medir abuso real antes de acrescentar o classificador.

## 7. Limites: como pensar (para decidir mais tarde)

Hoje: nenhum, só o travão de 25 mensagens por minuto. Ponto de ligação: `checkAllowance`.

**Atenção ao plano gratuito da Groq**: os limites são da organização (todos os alunos juntos), com ordem de grandeza de ~30 pedidos/min e ~1000 pedidos/dia no gpt-oss-120b, e poucos tokens por minuto. Com muitos alunos em simultâneo o Jonas vai ver «muitos pedidos» (a lista de modelos alivia, porque cada um tem limite próprio). Conferir os valores reais da conta em `console.groq.com` e passar ao plano pago quando houver uso.

Propostas para estudar (nada está decidido):

- **Gratuito**: N mensagens por dia no chat; explicações do Simulador mais generosas (são a ponte para o produto e já ficam guardadas, por isso repetir não gasta).
- **Pro**: mais mensagens, ou sem limite prático; histórico completo e pesquisa.
- Contar **mensagens do aluno** (já estão na base, `jonas_messages`), não *tokens*; mostrar «restam X hoje» antes de bloquear; ao esgotar, sugerir Biblioteca e Prática (não gastam IA).
- Guardar a explicação passo a passo **por questão** para todos os alunos (hoje é por aluno) reduziria muito o custo; exige textos sem letras de opções (cada aluno vê as opções baralhadas).

## 8. Para pôr a funcionar

1. `GROQ_API_KEY` no ambiente (`.env.example` e Vercel). `GROQ_MODEL` é opcional: sem ele, o Jonas tenta `openai/gpt-oss-120b`, depois `openai/gpt-oss-20b` e por fim `llama-3.1-8b-instant`, passando ao seguinte quando um modelo não existe na conta ou tem o limite cheio. Os modelos `gpt-oss` pensam antes de responder: o servidor pede esforço baixo e dá margem de tokens para o pensamento não cortar a resposta.
2. `pnpm migrate` (aplica `0019_jonas.sql`).
3. `pnpm test` (inclui o fluxo da Groq com um servidor falso).
