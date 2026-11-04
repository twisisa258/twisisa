# Twisisa v2: o que mudou

Feito a partir de `twisisa.zip` (auditoria de 1 de novembro de 2026). **Não foi possível correr `npm install`, `next build` nem uma base de dados neste ambiente**: o código foi verificado com testes unitários (as regras novas passam) e com o `tsc` comparado com o original, mas precisa de um primeiro `build` e de um ensaio real.

## Para pôr a funcionar
1. `npm install` e `npm run build` (corrige qualquer erro de tipos que o `tsc` isolado não viu).
2. `npm run migrate`: aplica a **0027** (tabelas novas) e a **0028** (apaga `posts`, `follows`, `post_likes`, `study_progress`, `quiz_attempts`). Faz cópia da base antes.
3. Variáveis: `CRON_SECRET` (qualquer texto longo; a Vercel envia-o ao cron). `GROQ_API_KEY` e Resend como antes.
4. O cron de hora a hora precisa de um plano da Vercel que permita crons horários; no plano gratuito corre uma vez por dia.

## Novo
- Kit de ferramentas no quiz (dica com IA, porque errei, questão parecida com IA, matéria relacionada, estudar depois, reportar).
- Lembretes reais (hora escolhida, cron, fila de e-mail, desligar), Plano de hoje, Estudar depois, Materiais guardados, Reportes no admin.
- Sistema de cores com propósito e hierarquia de botões; foco visível, teclado no quiz (A–E, Enter, setas).
- Tabelas: `study_marks`, `hint_events`, `question_reports`, `ai_practice`, `notification_outbox`; colunas `study_hour`, `last_sent_on`, `dedupe_key`.

## Corrigido
- Cronómetro deixa de ser vermelho (laranja, sem piscar); chama da sequência em dourado.
- Meta diária do aluno usada nas missões, sequência e avisos (antes fixa em 10).
- Notificações por ordem do mais recente, com ação; Favoritos reais; texto «Voltou tudo a zero» suavizado.
- Fontes por `<link>` (já não bloqueiam a renderização); `colorScheme` só claro (não há modo escuro); imagens comprimidas.
- ~850 cores escritas à mão trocadas por variáveis; contraste do texto de apoio acima de 4,5:1.

## Retirado
Comunidade, Convites de estudante, `/biblioteca/partilhar`, ficheiros soltos (`*.sh`, `tsconfig.tsbuildinfo`) e as tabelas sem uso.

## Fica por fazer (dito com franqueza)
Web Push; datas de exame (fase H); repetição espaçada automática; «dia livre» da sequência; rascunho/calculadora no Kit; ligação explícita tema-material no admin; modo escuro; resto das pílulas (193) fora do Simulador; decidir preço/plano pago; testes de componentes. Os textos de Termos e Privacidade foram ajustados (sem comunidade): pedir revisão a quem conheça a lei local.

## Ajustes pós-teste
- Kit visível desde o início no Modo rápido (só Estudar depois e Reportar antes de responder).
- Enunciado com hierarquia (cartão, dados, fórmulas em destaque, pergunta separada); regra documentada em State.md e no admin.
- Resultado da questão passou para depois das opções.
- Painel /aluno com blocos de formas diferentes, avisos e sugestões que se fecham e janela de novidade.
- Stripe removido (código, rotas, página de sucesso, colunas); preço em `lib/plano.ts` (197 MT/mês). Migração 0029 (acrescenta colunas; as do Stripe saem depois, em `database/opcional/0030_remover_colunas_stripe.sql`).
- Web push construído de raiz (antes só estava planeado). Migração 0029 cria `push_subscriptions`.
- A migração 0028 (apaga tabelas) saiu de `database/migrations` para `database/opcional`, para não correr sem querer.
- Onboarding já não abre um quiz sozinho: modal «Praticar agora?». Modal próprio para instalar a app. Especificação de exames e percurso em `docs/EXAMES-E-PERCURSO.md`.
- Sem página de lembretes: modal «Permitir notificações» e interruptor no perfil; lembretes ligados por defeito. Onboarding sem o passo de lembretes.
- Onboarding por botões (data com máscara, instituição e curso em listas com procura), com curso e combinação de provas. Perfil com curso e combinação. Simulador só com as disciplinas da combinação, em botões. Migração 0031.
- Candidatos sem curso (ou combinação) não começam nenhuma prática: página `/aluno/escolher-curso`, guarda nas páginas do Simulador e em `startAttempt`, destaque no painel. Quem já tinha conta entra na regra sozinho. Combinação lida por SQL (as páginas não dependem da migração 0031 para abrir). Desafios usam as disciplinas da combinação.
- Escolher curso passou a modal grande e fechável no painel (sem página própria); painel limpo enquanto falta o curso.
- Motor de notificações push de 30 em 30 minutos com variedade (prazo do desafio, prática a meio, matéria nova, questões quentes, voltar, escolher curso), limites e silêncio configuráveis. Migração 0032, workflow `.github/workflows/push-cron.yml`, `docs/NOTIFICACOES-PUSH.md`.

