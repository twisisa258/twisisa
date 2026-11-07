# State.md — Twisisa

Última actualização: 30/10/2026.
Este ficheiro é o único documento vivo do estado do projecto. O registo detalhado dos 171 itens anteriores (até 27/10/2026) está no histórico do git: `git log -p -- State.md`.

## Como usar
- Uma página só passa a FEITO E TESTADO depois de ser usada por uma pessoa num telemóvel (não basta compilar).
- Dado sem fonte real não se mostra: usa-se "—" ou um estado vazio. Nunca um número escrito no código.
- Tabela sem quem escreva nela, ou sem quem leia, é dívida: regista-se aqui.
- Nenhuma pasta de cópia de segurança dentro do repositório: o git é a cópia.
- Ao acabar uma alteração, actualizar a linha da página ou do item afectado.

Estados: FEITO E TESTADO · FEITO, FALTA TESTE · FICTÍCIO (dados inventados) · NÃO FEITO.

## Comandos
- `npm run build` (`next build --webpack`), `npm run migrate`, `npm run migrate:status`, `npm test`.
- O `State.md` antigo falava em `pnpm`; o repositório tem `package-lock.json` e `pnpm-workspace.yaml` ao mesmo tempo. Decidir um gestor de pacotes (ver Decisões).

## Páginas do estudante

| Página | Estado | Nota |
|---|---|---|
| `/sign-up`, `/sign-in` | FEITO, FALTA TESTE | Registo de 1 ecrã: e-mail, palavra-passe, caixa dos Termos (versão e data em `account_consents`). Validação em tempo real e repetida no servidor (`hooks.before` em `lib/auth.ts`). Botão Google desactivado até existirem `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Sessão de 30 dias; «Computador partilhado» na entrada (`rememberMe: false`, a confirmar em ensaio); depois de entrar volta ao sítio de origem (`?next=`). Limite de pedidos na base de dados (tabela `rateLimit`). |
| `/aluno/bem-vindo` (onboarding) | FEITO, FALTA TESTE | Passos curtos, só botões: Sobre ti (nome, data DD/MM/AAAA, Termos), O que preparas (percurso e, na admissão, instituição), Curso (lista com procura; «Ainda não sei» leva ao teste vocacional no painel), Combinação de provas (só se o curso tiver mais de uma), Meta diária. No fim, um modal pergunta «Queres praticar agora?»: nunca abre um quiz sozinho. Os lembretes ficam ligados por defeito (e-mail). |
| `/esqueci-a-senha`, `/redefinir-senha` | FEITO, FALTA TESTE | Depende do domínio no Resend (`docs/EMAIL.md`). |
| `/aluno/percurso` | FEITO, FALTA TESTE | 10ª, 12ª ou admissão (com instituição). |
| `/aluno` (painel) | FEITO, FALTA TESTE | Linha discreta «Hoje 4/10 · 3 dias seguidos» com dados reais de `study_days` (escritos pelo simulador, pela Biblioteca e pelo Jonas). Parabéns no aniversário (dia e mês, fuso de Maputo; 29/02 celebra a 28/02 nos anos não bissextos). |
| `/aluno/simulador` (+ sessão, histórico, configurações) | FEITO, FALTA TESTE | Servidor avalia respostas, valida o dono da tentativa, fecha o tempo do modo rápido, limita inícios por hora. Testes de unidade só do motor (`tests/quiz-engine.test.ts`). Precisa de questões publicadas. |
| `/biblioteca` (+ categoria, explorar, pesquisa) | FEITO, FALTA TESTE | Entrega de PDF pelo Cloudinary por confirmar (Definições, Segurança, "Allow delivery of PDF and ZIP files"). |
| `/aluno/perfil` | FEITO, FALTA TESTE | Foto no Cloudinary com upload assinado. |
| `/aluno/ranking` | FEITO, FALTA TESTE | Real (pontos de `attempt_items`). `show_in_ranking` é verdadeiro por omissão. |
| `/jonas` | FEITO, FALTA TESTE | Groq. Só travão de 25 mensagens por minuto; sem limites por plano. |
| `/aluno/notificacoes` | FEITO, FALTA TESTE | Lembretes criados pelo cron (`lib/lembretes.ts`) e a mensagem de boas-vindas; mais recentes primeiro, com ação e «marcar tudo como lido». |
| `/aluno/estudar-depois` | FEITO, FALTA TESTE | Questões guardadas no Kit ou no resultado, por data; «Praticar este tema» inicia uma Prática. |
| `/aluno/favoritos` | FEITO, FALTA TESTE | Lista real de `library_favorites` (só materiais aprovados). |
| `/aluno/desafios` | FEITO, FALTA TESTE | Sequência, missões do dia e da semana, prontidão por curso e avisos, tudo calculado a partir das respostas do Simulador (`lib/desafios.ts`). Curso alvo escolhido no perfil ou no resultado do teste vocacional (`student_profiles.target_course_id`, migração 0026). |
| `/aluno/descobrir-curso` | NÃO VERIFICADO | |
| `/planos` | FEITO | Mostra 197 MT/mês (`lib/plano.ts`). Sem Stripe. O pagamento por meios locais ainda não existe; nada na plataforma é reservado a quem paga. |
| `/blog` | FEITO, FALTA TESTE | Artigos reais da base de dados (`blog_posts`, migração 0039), escritos em `/admin/blog`. Listagem em `/blog`, artigo em `/blog/[slug]`, pré-visualização em `/blog/pre-visualizar/[id]`, RSS em `/blog/feed.xml`. Sem artigos publicados mostra o estado vazio. |

## Administração (`/admin`)
Instituições, Disciplinas, Temas, Classificação (categorias e níveis), Módulos, Materiais, Banco de questões, Variantes, Cursos, Equipa, Jonas (modelo), Blog (artigos). Todas FEITO, FALTA TESTE no telemóvel.
- Formulários usam `FeedbackForm`: durante o envio os campos ficam desactivados e o botão de envio mostra um indicador (CSS em `app/globals.css`, marcador `Estado de processamento`).
- Acções em linha usam `RowMenu` (já tem estado de processamento).
- O botão de confirmação do diálogo em `components/admin/question-bulk-form.tsx` desactiva-se durante o processamento, mas não mostra indicador: por fazer.

## Regras do projecto
- Nunca passar componentes (ícones) como propriedade de uma página de servidor para um componente de cliente. Passar o nome (texto) ou usar um componente de servidor.
- Acções de servidor devolvem `ActionResult` (`lib/action-result.ts`, `runAction`, `AppError`); o erro aparece no modal de feedback. Não lançar erros para o cliente.
- Páginas de lista do admin seguem `components/admin/page-parts.tsx`.
- Um módulo só pode estar "Ativo" quando tem `ready: true` em `lib/exam-modules.ts`.
- Anos vêm de `lib/years.ts`; a ordem de listas de `lib/reorder.ts`.
- Fórmulas em KaTeX por `lib/math-text.tsx` (`$...$` e `$$...$$`); o texto fora das fórmulas nunca é HTML.
- As pastas do Cloudinary `estuda-mz/materiais` e `estuda-mz/logotipos` mantêm-se (já há ficheiros nelas).
- Sem emojis na interface nova.

## Kit de ferramentas do Simulador (novo)
Botão flutuante no quiz (`components/simulador/toolbox.tsx`, atalho `T`). No Modo rápido só aparece depois de responder.
| Ferramenta | Quando | Como funciona |
|---|---|---|
| Dica (3 níveis) | antes de responder | Níveis 1 e 2 pela IA (Groq, mesmas definições do Jonas, sem revelar a resposta); nível 3 elimina uma opção errada (servidor). Cada dica custa 25 % dos pontos (`hint_events`, mínimo 25 %). Sem dicas no Modo rápido. |
| Porque errei | depois de errar | Ação `porque` do Jonas (`/api/jonas/explicar`), guardada na conversa da questão. |
| Questão parecida | depois de responder | A IA cria uma questão nova (JSON validado em `lib/kit-pure.ts`); o servidor guarda a certa em `ai_practice` e só a revela após a resposta. Não conta para pontos nem ranking; marcada «Criada por IA». |
| Matéria relacionada | sempre | Materiais aprovados da mesma disciplina; os que falam do tema (título ou descrição) vêm primeiro. Sem ligação tema-material explícita. |
| Estudar depois | sempre | `study_marks` (hoje, amanhã, fim de semana, sem data). Alimenta `/aluno/estudar-depois`, o Plano de hoje e os lembretes. |
| Reportar questão | sempre | `question_reports`; lido em `/admin/reportes`. |

## Lembretes
- Não há página de lembretes. Os lembretes vêm **ligados por defeito** (e-mail, criado no fim do onboarding: `saveGoal`). O push pede-se num **modal simples** no painel (`components/aluno/notificacoes-modal.tsx`, botão «Permitir notificações»), só se o navegador ainda não decidiu.
- No **perfil**, secção «Lembretes», um interruptor liga ou desliga tudo (`LembretesSwitch` → `setReminders`; ao desligar apagam-se os aparelhos registados).
- No máximo **uma janela por dia** por aparelho (`reservarModalHoje` em `lib/dispensar.ts`): notificações, depois instalar a app, depois novidade.
- Hora do lembrete: `notification_prefs.study_hour` (padrão `DEFAULT_STUDY_HOUR`, hora de Maputo). `/lembretes/cancelar?token=` desliga com um botão de confirmação.
- Cron (`/api/cron/lembretes`), regras em `lib/lembretes-shared.ts`; envia e-mail e push.

## Cores (`app/globals.css`)
Marca (ação principal), sucesso, erro (só erros), aviso (atenção e tempo a acabar), ajuda (azul), assistente e revisão (índigo), conquista (dourado). Classes `.btn-primario/-secundario/-terciario/-perigo/-icone` e `.chip`. Pílula só para etiquetas.

## Enunciado das questões (regra de apresentação)
`lib/statement-parse.ts` separa o enunciado por linhas e `components/simulador/question-statement.tsx` desenha-o. A regra, que também aparece no formulário de questões do admin («Como o enunciado aparece ao aluno»):
1. **Uma ideia por linha.**
2. **Contexto**: as primeiras linhas, em texto normal. Se vêm dados a seguir, a linha termina em `:`.
3. **Dados**: uma linha por dado, logo a seguir aos dois pontos, num cartão com marcador. Linhas só com fórmula (`$...$`) aparecem maiores, em bloco; o `;` ou `.` final é retirado.
4. **Pergunta**: a última linha, se terminar em `?` ou começar por Qual, Calcule, Determine, Indique, Assinale, etc. É a única em negrito. Enunciado de uma só linha = pergunta.
Pontuação solta numa linha (ex.: um `.` sozinho) junta-se à linha anterior, também nas opções. No simulador o enunciado fica num cartão com borda e fundo branco; o resultado (certo/errado) aparece depois das opções, para a questão não encolher.

## Painel do aluno (/aluno)
Cada bloco tem forma própria: destaque escuro «Hoje» (`hoje-hero.tsx`: anel da meta + continuar), faixa fina de aviso que se fecha (`aviso-faixa.tsx`, um por vez, «+N» abre janela pequena, volta no dia seguinte), fichas «Para hoje» (`plano-hoje.tsx`), três atalhos em grelha, cartão de orientação que se fecha (`fechavel.tsx`, volta ao fim de 14 dias) e uma janela de novidade única (`novidade-modal.tsx`, muda o ID em `ID` para anunciar outra). O «fechado» fica só no aparelho (`lib/dispensar.ts`, localStorage).

## Web push
Ficheiros: `public/sw.js` (service worker), `lib/push.ts` (envio), `lib/push-client.ts` (navegador), `app/api/push` (registar/apagar aparelho), `app/api/push/teste` (diagnóstico). **Motor de 30 em 30 minutos** (tipos, limites, definições em `app_settings`, agendador no GitHub Actions): `docs/NOTIFICACOES-PUSH.md`; código em `lib/push-regras.ts` (puro, testado) e `lib/push-motor.ts`. Variáveis: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (opcional), `CRON_SECRET`. No iPhone só funciona com a app instalada no ecrã principal.

## Percurso, exames e calendário
Especificação, mapa do fluxo entre cursos e disciplinas e estado das fases em `docs/EXAMES-E-PERCURSO.md`. Feito: modal «Praticar agora?», modal de instalar a app, curso e combinação de provas (onboarding, perfil, `/aluno/escolher-curso`), bloqueio «sem curso não se começa nada» para candidatos, Simulador só com as disciplinas da combinação (botões), notificações em modal. Por fazer: exame com regras, calendário, UEM integrado, seletores do admin e da Biblioteca. Regra de ouro: nada de listas fixas no código; tudo na base de dados e no admin; sem `<select>`, `alert` ou `confirm` nativos.

## Editais de admissão carregados
Edital 2027 da UP-Maputo, UniLicungo, UniPúnguè e UniRovuma: 184 cursos, 248 opções, vagas e provas por curso (`database/migrations/0033` e `0034`). Datas, regras, confirmações em falta e mapa de provas: `docs/EDITAL-UP-2027.md`. Cursos por concurso documental não entram (não há exame). A UEM 2027 falta carregar.

## Exames públicos, temas e importação com o Jonas
Páginas públicas `/exames` (Google), temas principais (`/admin/temas-principais`), importação de exames com o Jonas (`/admin/importar`): `docs/EXAMES-PUBLICOS-E-JONAS.md`. Depende de `unpdf` e `pdf-lib`. Migrações 0037 e 0038.

## Pendentes, por prioridade
P0 (antes de receber estudantes)
1. Ensaio completo com 3 a 5 estudantes reais num telemóvel (conta, e-mail, percurso, simulado, ranking, Jonas, Biblioteca).
2. Conteúdo mínimo carregado: instituições, disciplinas, temas, questões publicadas, materiais.
3. Confirmar a entrega de PDF no Cloudinary.
4. Verificar o domínio no Resend e testar a recuperação de conta com e-mail real.
5. FEITO: Comunidade e Convites retirados; Notificações e Favoritos ligados a dados reais. Falta correr `npm run migrate` (0027 e 0028) e definir `CRON_SECRET`.

P1
6. Registo: FEITO (idade, Termos, validação). Falta ligar o Google: criar as credenciais, registar `<BETTER_AUTH_URL>/api/auth/callback/google`, preencher as duas variáveis e passar a aplicação a «In production» na Google.
7. FEITO: guarda única `requireStudent()` (`lib/require-student.ts`) nas páginas do estudante, `/jonas`, `/biblioteca` e `/comunidade`. Faltam as acções de servidor e rotas de API, que continuam a validar a sessão uma a uma.
8. FEITO: ranking oculto por omissão para menores de 18 (decisão: idade mínima 13).
9. Ligação à base com pooler; monitorização de erros; eventos de utilização (primeiro simulado, primeira mensagem ao Jonas).
10. Jonas: limites por plano, tecto diário, estado quando a Groq recusa por quota, política de dados da Groq nos Termos.
11. Pagamento local (M-Pesa, e-Mola…): decidir os meios e o fluxo (confirmação manual no admin ou API); a tabela `subscriptions` já tem `provider`, `reference` e `current_period_end`.

P2
12. FEITO por outra via: `study_days` (`lib/study-days.ts`). A tabela `study_progress` ficou sem leitura nem escrita: remover (ver 16).
13. FEITO: notificações e e-mail de lembretes (`lib/lembretes.ts`, cron `/api/cron/lembretes`, fila `notification_outbox`). Falta testar com e-mail real.
14. FEITO: `/aluno/favoritos` lê `library_favorites`.
15. Remover as dependências sem uso (`ai`, `@ai-sdk/react`, `@base-ui/react`, `class-variance-authority`): script à parte, depois do build passar.
16. FEITO: a migração 0028 remove `study_progress`, `quiz_attempts`, `posts`, `follows` e `post_likes` (apaga dados). Ficam as linhas antigas de `exam_modules`.

Herdado do registo anterior (número do item antigo)
- #7 dados reais das instituições (sigla, nome, descrição, logótipo).
- #10 `/planos` sem ligação em nenhuma página.
- #11 depois de entrar, vai sempre para `/aluno` (perde o contexto de onde veio).
- #13 PNGs comprimidos (OG de 1,6 MB para 0,7 MB); `images.unoptimized: true` mantém-se.
- #50 eliminar tema não verifica uso.
- #61 o envio de material cria a disciplina por texto livre.
- #127 CSV gravado pelo Excel com `;` falha; só aceita vírgulas.
- #134 revisor sem percurso é enviado para `/aluno/percurso`.
- #138 confirmar pesos no edital da UEM (`docs/CURSOS-UEM-2026.md`).
- #139 ligação aluno-curso: o curso-alvo é texto livre; materiais e questões sem marca de prova.
- #146 as secções da Biblioteca dependem do `slug` das categorias (`MAIN_SECTIONS` em `lib/library-shared.ts`).
- #147 instituição dos materiais é texto livre.

## Identidade, onboarding e retenção (docs/IDENTIDADE-ONBOARDING-RETENCAO.md)
Feito (fases A a D, ainda por testar com estudantes): guarda central, limite de pedidos em base de dados, chaves estrangeiras com CASCADE (`student_profiles`, `notifications`, `quiz_attempts`, `posts`), registo de 1 ecrã, onboarding de 3 ecrãs, regras de idade, `study_days`, saudação de aniversário. Migração `0024_identidade_onboarding.sql`: correr `npm run migrate` antes de publicar.
Por fazer:
- Fase C (resto): lista de dispositivos com sessão aberta e «terminar sessão» no perfil; mudar e-mail; apagar conta e exportar dados.
- Fase E: marcos na plataforma, banner de anúncios do admin, barra de cookies com Aceitar e Recusar para o Google Analytics.
- Fase F (feito): lembrete diário por e-mail na hora escolhida, `notification_outbox`, cron, desligar com confirmação. Por fazer: pré-visualização no admin, e-mail de aniversário. Hoje `notification_prefs` só guarda a escolha do ecrã 3: nada a lê.
- Fase G: Web Push (o botão «No telemóvel» do onboarding está desactivado).
- Fase H: datas de exame por instituição e contagem no painel.
- Estudantes que já tinham conta passam pelo onboarding no próximo acesso (falta-lhes data de nascimento, meta e escolha de lembretes).
- Quem entra por Google, com consentimento por registar, vê a caixa dos Termos no ecrã 1 do onboarding.

## Decisões por tomar
- Pagamento: moeda, meio (cartão ou carteira móvel) e o que o plano pago desbloqueia. Sugestão: lançar gratuito e cobrar depois.
- Menores de idade: decidido idade mínima de conta 13 (`MIN_AGE` em `lib/identity.ts`) e predefinições de privacidade abaixo de 18. Falta confirmar com quem conheça a lei local.
- Desafios: manter ou simplificar até haver estudantes (a Comunidade foi retirada).
- Conteúdo mínimo para lançar (percursos, disciplinas, número de questões).
- Gestor de pacotes: npm ou pnpm.
- Origens de questão jogáveis (`PLAYABLE_ORIGINS` em `lib/simulator.ts`).
- Decisões em aberto de `SIMULADOR.md` (secção 11) e `JONAS.md` (secção 7).

## Documentos
- `docs/IDENTIDADE-ONBOARDING-RETENCAO.md`: desenho final de identidade, onboarding, actividade e retenção (fases A a H).
- `SIMULADOR.md`, `JONAS.md`, `CONVITES.md`, `ADMIN-MATERIAIS.md`, `docs/EMAIL.md`, `docs/CURSOS-UEM-2026.md`, `docs/prompt-csv-questoes.md`: mantidos; ainda não foram revistos contra o código.
