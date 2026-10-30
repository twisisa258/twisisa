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
| `/sign-up`, `/sign-in` | FEITO, FALTA TESTE | Nome, e-mail, palavra-passe. Sem idade, sem aceitação dos Termos, sem Google, sem validação em tempo real. |
| `/esqueci-a-senha`, `/redefinir-senha` | FEITO, FALTA TESTE | Depende do domínio no Resend (`docs/EMAIL.md`). |
| `/aluno/percurso` | FEITO, FALTA TESTE | 10ª, 12ª ou admissão (com instituição). |
| `/aluno` (painel) | FEITO, FALTA TESTE | "Semana" e "Sequência" mostram "—": nada escreve em `study_progress`. |
| `/aluno/simulador` (+ sessão, histórico, configurações) | FEITO, FALTA TESTE | Servidor avalia respostas, valida o dono da tentativa, fecha o tempo do modo rápido, limita inícios por hora. Testes de unidade só do motor (`tests/quiz-engine.test.ts`). Precisa de questões publicadas. |
| `/biblioteca` (+ categoria, explorar, pesquisa) | FEITO, FALTA TESTE | Entrega de PDF pelo Cloudinary por confirmar (Definições, Segurança, "Allow delivery of PDF and ZIP files"). |
| `/aluno/perfil` | FEITO, FALTA TESTE | Foto no Cloudinary com upload assinado. |
| `/aluno/ranking` | FEITO, FALTA TESTE | Real (pontos de `attempt_items`). `show_in_ranking` é verdadeiro por omissão. |
| `/jonas` | FEITO, FALTA TESTE | Groq. Só travão de 25 mensagens por minuto; sem limites por plano. |
| `/aluno/notificacoes` | FICTÍCIO | Lê e marca como lida, mas nada cria notificações. |
| `/aluno/favoritos` | FICTÍCIO | Página estática; a Biblioteca já guarda em `library_favorites`. |
| `/aluno/desafios` | FICTÍCIO | Números fixos no código; missões só no browser. |
| `/comunidade` | FICTÍCIO | Pessoas fixas; "seguir" grava ids que não são utilizadores (`follows` sem chave estrangeira); a lista não vem da base. |
| `/aluno/convites` | NÃO VERIFICADO | Tratar como fictícia até prova em contrário. |
| `/aluno/descobrir-curso` | NÃO VERIFICADO | |
| `/planos`, `/pagamentos/sucesso` | FEITO, FALTA TESTE | Stripe em USD 9,99; a landing diz 197 MT; nada na plataforma é reservado a quem paga. |
| `/blog` | FEITO | 5 artigos em `lib/blog.ts`. |

## Administração (`/admin`)
Instituições, Disciplinas, Temas, Classificação (categorias e níveis), Módulos, Materiais, Banco de questões, Variantes, Cursos, Equipa, Jonas (modelo). Todas FEITO, FALTA TESTE no telemóvel.
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

## Pendentes, por prioridade
P0 (antes de receber estudantes)
1. Ensaio completo com 3 a 5 estudantes reais num telemóvel (conta, e-mail, percurso, simulado, ranking, Jonas, Biblioteca).
2. Conteúdo mínimo carregado: instituições, disciplinas, temas, questões publicadas, materiais.
3. Confirmar a entrega de PDF no Cloudinary.
4. Verificar o domínio no Resend e testar a recuperação de conta com e-mail real.
5. Retirar do menu o que é FICTÍCIO, ou terminá-lo.

P1
6. Registo: idade, aceitação dos Termos, validação em tempo real, Google (em desenho).
7. Guarda de sessão única (não existe `middleware` nem `proxy`; cada página repete `getSession`).
8. Ranking oculto por omissão e política para menores (ver Decisões).
9. Ligação à base com pooler; monitorização de erros; eventos de utilização (primeiro simulado, primeira mensagem ao Jonas).
10. Jonas: limites por plano, tecto diário, estado quando a Groq recusa por quota, política de dados da Groq nos Termos.
11. Testar fluxo Stripe de ponta a ponta, ou trocar o meio de pagamento.

P2
12. Escrever em `study_progress` (alimenta "Semana" e "Sequência").
13. Criar notificações reais (e ligá-las ao e-mail).
14. Ligar `/aluno/favoritos` a `library_favorites`.
15. Remover as dependências sem uso (`ai`, `@ai-sdk/react`, `@stripe/stripe-js`, `@base-ui/react`, `class-variance-authority`): script à parte, depois do build passar.
16. Tabelas sem uso: `quiz_attempts`, linhas antigas de `exam_modules`, `post_likes`. Decidir: ligar ou migração para remover.

Herdado do registo anterior (número do item antigo)
- #7 dados reais das instituições (sigla, nome, descrição, logótipo).
- #10 `/planos` sem ligação em nenhuma página.
- #11 depois de entrar, vai sempre para `/aluno` (perde o contexto de onde veio).
- #13 PNGs de 1,6 MB e 1,8 MB com `images.unoptimized: true`.
- #22 `/biblioteca/partilhar` continua acessível por URL e não envia nada.
- #50 eliminar tema não verifica uso.
- #61 o envio de material cria a disciplina por texto livre.
- #127 CSV gravado pelo Excel com `;` falha; só aceita vírgulas.
- #134 revisor sem percurso é enviado para `/aluno/percurso`.
- #138 confirmar pesos no edital da UEM (`docs/CURSOS-UEM-2026.md`).
- #139 ligação aluno-curso: o curso-alvo é texto livre; materiais e questões sem marca de prova.
- #146 as secções da Biblioteca dependem do `slug` das categorias (`MAIN_SECTIONS` em `lib/library-shared.ts`).
- #147 instituição dos materiais é texto livre.

## Decisões por tomar
- Pagamento: moeda, meio (cartão ou carteira móvel) e o que o plano pago desbloqueia. Sugestão: lançar gratuito e cobrar depois.
- Menores de idade: consentimento, dados no ranking e na comunidade. Confirmar com quem conheça a lei local.
- Comunidade e Desafios: terminar ou retirar até haver estudantes.
- Conteúdo mínimo para lançar (percursos, disciplinas, número de questões).
- Gestor de pacotes: npm ou pnpm.
- Origens de questão jogáveis (`PLAYABLE_ORIGINS` em `lib/simulator.ts`).
- Decisões em aberto de `SIMULADOR.md` (secção 11) e `JONAS.md` (secção 7).

## Documentos
- `SIMULADOR.md`, `JONAS.md`, `CONVITES.md`, `ADMIN-MATERIAIS.md`, `docs/EMAIL.md`, `docs/CURSOS-UEM-2026.md`, `docs/prompt-csv-questoes.md`: mantidos; ainda não foram revistos contra o código.
