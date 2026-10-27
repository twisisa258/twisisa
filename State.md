# State.md — Twisisa

Última actualização: 2026-10-26 · Fase 1B concluída em código (falta teste no browser).
Estados: PENDENTE · RESOLVIDO · BLOQUEADO. "Corrigido" só passa a RESOLVIDO depois de testado.

## Problemas

| # | Prio | Estado | Problema | Causa / evidência |
|---|------|--------|----------|-------------------|
| 1 | P0 | PENDENTE (corrigido; falta correr `pnpm db:migrate` numa BD de teste) | Páginas/acções com "server error" por tabelas inexistentes | `schema.ts` tinha 12 tabelas; só `study_progress` tinha migração, com FK para `"user"` que nenhuma migração criava. |
| 2 | P1 | PENDENTE (corrigido; falta teste com Stripe em modo teste) | Pagamento não activava nada | O webhook só fazia `console.log`. Agora grava em `subscriptions`. |
| 3 | P1 | PENDENTE (corrigido; falta teste) | `/api/checkout` sem autenticação; URLs de retorno vinham do cabeçalho `Origin` | Agora exige sessão (401 sem sessão), usa URL do servidor, recusa se já há subscrição activa (409). |
| 3b | P1 | PENDENTE (corrigido; falta teste) | `/pagamentos/sucesso` dizia "Bem-vindo ao Plus" a qualquer visitante | Agora exige sessão e `session_id` pago do próprio utilizador; senão vai para `/planos`. |
| 3c | P2 | PENDENTE (corrigido; falta teste) | Webhook devolvia "Assinatura inválida" (400) também em falhas de BD, e o Stripe não repetia o evento | Assinatura inválida = 400; falha ao processar = 500. |
| 4 | P1 | PENDENTE | `/aluno/ranking` mostra estudantes inventados (Amélia M., Tomás C., Lídia S.) e "Tu" com 1280 pts | Array fixo no ficheiro. Falta decidir a fonte real dos pontos (não existe tabela de pontos). |
| 5 | P2 | PENDENTE (corrigido na Fase 1A; falta teste) | Dados fictícios no painel do aluno | `app/aluno/page.tsx`: "Matemática · Funções 58%", "Aula 3 de 5", "Meta semanal: 80%", `goal = max(progresso, 68)`. |
| 6 | P2 | PENDENTE (corrigido na Fase 1A; falta teste) | Perfil: "Nome de exibição" sem `name`, nunca guardado; "Pontos de Ranking 0.0" fixo | `app/aluno/perfil/page.tsx` |
| 7 | P2 | PENDENTE (o admin já cria instituições; faltam os dados reais: logótipos e descrições) | `institutions` vazia: perfil sem instituições | Falta a lista real (sigla, nome, descrição). |
| 8 | P2 | PENDENTE | Só um simulado, com respostas fixas no código; `study_quizzes` não é usada | `app/aluno/simulados/actions.ts` |
| 9 | P2 | PENDENTE (corrigido na Fase 1A; falta teste) | `@nickname` descrito como único, sem UNIQUE | `student_profiles` |
| 10 | P2 | PENDENTE (decisão tua) | `/planos` não tem link em nenhuma página: o pagamento é inalcançável pela interface | Não acrescentei botão para não poluir a UI; diz-me onde queres a entrada. |
| 11 | P2 | PENDENTE | Após entrar, o utilizador vai sempre para `/aluno`: quem veio de `/planos` perde o contexto | `components/auth-form.tsx` |
| 12 | P1 | PENDENTE (documentado) | Em produção o better-auth exige `BETTER_AUTH_SECRET`; não estava documentado | Ver `.env.example`. |
| 13 | P3 | PENDENTE | PNGs de ~1,6 MB e ~1,8 MB com `images.unoptimized: true` | `public/images/*` |
| 14 | P3 | RESOLVIDO | Sem `.env.example` | Criado. |
| 15 | — | PENDENTE | Auditoria visual/responsiva, rotas e links, formulários, acessibilidade | Ainda não iniciada. |

## Não verificado
- `ui_mode: 'hosted_page'` e `integration_identifier` no checkout foram mantidos como estavam; não confirmei contra os tipos do Stripe instalado.

## Testes
| Teste | Resultado |
|-------|-----------|
| Migrações 0000→0003 em SQLite (tipos traduzidos) | OK (ordem das FK e estrutura; não valida sintaxe Postgres) |
| Sintaxe TypeScript dos ficheiros alterados (tsc, erros TS1xxx) | OK |
| Script `aplicar-fase-2.sh` numa cópia limpa: aplica, é idempotente, cria backups | ver relatório |
| `pnpm db:migrate`, build, tipos completos, fluxo Stripe de ponta a ponta | NÃO EXECUTADO |

## Fase 3 — Biblioteca (visualização, download, eliminação, cards)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 16 | P1 | PENDENTE (corrigido; falta testar com o Cloudinary real) | "Abrir" levava ao URL do Cloudinary, que mostrava um JSON em vez do documento | Os documentos passam por `/api/biblioteca/<id>/ficheiro` (exige sessão): tenta o URL público e, se o Cloudinary o recusar, usa o descarregamento assinado. Envia o ficheiro com o tipo e o nome correctos. |
| 17 | P1 | PENDENTE (corrigido; falta teste) | Sem pré-visualização | Botão "Ver" abre uma janela com as páginas do PDF/imagem convertidas em JPG pelo Cloudinary. Word/PowerPoint/Excel só têm "Baixar". |
| 18 | P2 | PENDENTE (corrigido; falta teste) | Download não existia / contador parado | Botão "Baixar" (`?baixar=1`) entrega como anexo e regista em `library_downloads` + `download_count`. |
| 19 | P2 | PENDENTE (corrigido; falta teste) | Admin não podia eliminar materiais | Ícone de lixo em "Materiais recentes", com confirmação. Apaga o registo (favoritos, downloads e denúncias saem em cascata) e o ficheiro no Cloudinary; se o ficheiro não sair, o admin é avisado. |
| 20 | P2 | PENDENTE (corrigido; falta teste visual) | Cards grandes demais | Card compacto: ícone, título (2 linhas), linha única de metadados, downloads + "Ver" / "Baixar". Descrição deixou de aparecer no card. |
| 21 | P2 | PENDENTE (corrigido; falta teste) | Botão "Partilhar material" na biblioteca | Removido da biblioteca. |
| 22 | P2 | PENDENTE (decisão tua) | `/biblioteca/partilhar` continua acessível por URL e é um formulário simulado (não envia nada) | Não foi apagada porque não foi pedido. Diz-me se a removo. |

Testes da Fase 3: sintaxe TypeScript dos ficheiros alterados OK; parser dos URLs do Cloudinary testado com exemplos. NÃO EXECUTADO: build, tipos completos, ligação ao Cloudinary, eliminação, ecrã real.

## Fase 4 — Modal de feedback (sucesso e erro)

Causa: em produção o Next.js esconde a mensagem de qualquer erro lançado por uma acção de servidor, e várias acções eram chamadas com `void` (o erro perdia-se). Agora as acções devolvem `{ ok, message }` e a interface mostra-o num modal (sucesso fecha sozinho em 3,5 s; erro fica até ser fechado).

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 23 | P1 | PENDENTE (corrigido; falta teste) | Sem tratamento de erros nas acções | `lib/action-result.ts` (`runAction`, `AppError`), `components/feedback-provider.tsx` (`useFeedback().success/error`), `components/feedback-form.tsx`, `app/error.tsx` (erro ao desenhar página). |
| 24 | P2 | PENDENTE (corrigido; falta teste) | Admin: publicar/eliminar sem feedback (usava `?created=1`/`?removed=`) | Modal; o formulário limpa depois de publicar. |
| 25 | P2 | PENDENTE (corrigido; falta teste) | Perfil guardava sem confirmar | Modal "Perfil guardado." |
| 26 | P2 | PENDENTE (corrigido; falta teste) | Biblioteca: download falhado abria texto simples | Download por `fetch`; falha mostra o motivo no modal. |
| 27 | P2 | PENDENTE (corrigido; falta teste) | Publicações, seguir, notificações, simulados, Jonas, convite, checkout e entrar/criar conta falhavam em silêncio ou em linha | Erro no modal; publicação/seguir voltam ao estado anterior se falhar. |
| 28 | P1 | PENDENTE (decisão tua) | `SocialNetwork` mostra pessoas fictícias (`amelia-demo`, …) e `CommunityFeed` guarda a publicação mas não a lista | Dados fictícios. Seguir grava um follow para um utilizador que não existe; agora, se falhar, o erro aparece em vez de ficar escondido. |

Não coberto: `app/global-error.tsx` (erro no layout raiz), `togglePostLike`/`getCommunityPosts` (não usadas pela interface), erro de upload do documento no admin (continua em linha, no próprio campo).
Testes da Fase 4: sintaxe TypeScript dos ficheiros alterados OK. NÃO EXECUTADO: build, tipos completos, qualquer fluxo no browser.

## Fase 5 — Erros de documento sempre no modal

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 29 | P1 | PENDENTE (corrigido; falta teste) | Abrir um documento que o servidor não consegue obter mostrava uma página de texto simples | Num link, a rota volta à página de origem com `?erro=` e o modal mostra o motivo (`components/url-feedback.tsx`). |
| 30 | P1 | PENDENTE (causa por confirmar) | O servidor não consegue obter o documento ao Cloudinary | A mensagem passa a incluir o motivo técnico (estado HTTP e `x-cld-error` do URL público e do descarregamento assinado) e fica nos registos como `[BIBLIOTECA] ... recusado`. Causa mais provável: entrega de PDF bloqueada (Cloudinary, Settings, Security, "Allow delivery of PDF and ZIP files"). |

## Fase 6 — Área de administração (`/admin`)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 31 | P2 | PENDENTE (corrigido; falta teste visual) | `/admin` não existia; o admin só chegava a `/admin/materiais` | `/admin` é agora a visão geral: resumo (materiais publicados, downloads, utilizadores, números reais da BD) e as áreas de gestão. Menu lateral no computador e separadores deslizáveis no telemóvel. |
| 32 | P2 | PENDENTE (corrigido; falta teste) | Acesso | O layout só deixa entrar quem está em `ADMIN_EMAILS` (sem permissão vai para `/aluno`). Cada página continua a verificar por si. O botão do admin na área do estudante passou a "Administração" e leva a `/admin`. |
| 33 | P2 | PENDENTE (decisão tua) | Só existe uma área de gestão: Materiais académicos | Para acrescentar outra: criar `app/admin/<área>/page.tsx` e juntá-la a `lib/admin-sections.ts`. Candidatas com dados reais na BD: categorias/disciplinas/níveis da biblioteca, instituições (vazia, ver #7), utilizadores e subscrições. Nenhuma foi criada de propósito. |

## Fase 0 — Preparação e estabilidade (23/10/2026)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 34 | P0 | RESOLVIDO | `pnpm migrate` (migrações 0001→0004) | Testado em PostgreSQL 16 real: aplica as 4, cria 22 tabelas, 2.ª execução é idempotente, `migrate:status` correto. Fecha o #1. |
| 35 | P0 | RESOLVIDO | Build e tipos | `tsc --noEmit` sem erros; `next build --webpack` compila e gera todas as rotas. |
| 36 | P1 | RESOLVIDO | Falta `app/global-error.tsx` | Criado (sem dependência de CSS/providers). Não testado a forçar um erro no layout raiz. |
| 37 | P1 | RESOLVIDO | Skeletons e estados de ecrã, **um por página** (cada um copia a estrutura real da sua página) | `components/skeletons`: `StudentShellSkeleton` (menu + cabeçalho do shell), `BibliotecaSkeleton`, `AlunoSkeleton` (o painel tem menu próprio), `AdminHomeSkeleton`, `AdminMateriaisSkeleton`, `PerfilSkeleton`, `NotificacoesSkeleton`; `components/states`: `EmptyState`, `ErrorState`. Cada `loading.tsx` fica num route group (`(painel)`, `(visao-geral)`, `(catalogo)`) para não ser herdado por rotas filhas com outra estrutura. Verificado com sessão real: cada rota envia o seu skeleton. Falta validação visual no browser. Rotas de dados falsos ou estáticos (simulados, ranking, favoritos, comunidade) ficam com o loader global até serem reconstruídas nas suas fases. |
| 38 | P3 | RESOLVIDO | Documentação | O script chama-se `pnpm migrate` (não `db:migrate`); corrigido em `.env.example` e `LEIA-PRIMEIRO.md`. `BETTER_AUTH_SECRET` e `ADMIN_EMAILS` já estavam documentados no `.env.example`. |
| 39 | P1 | PENDENTE (precisa de credenciais reais) | PDFs do Cloudinary (#30) | Não testável aqui: causa mais provável é a definição "Allow delivery of PDF and ZIP files" na conta. Verificar nos registos `[BIBLIOTECA] ... recusado`. |
| 40 | P1 | PENDENTE (precisa de chaves de teste) | Fluxo Stripe de ponta a ponta | Verificado só: `/api/checkout` sem sessão → 401; webhook sem assinatura → 400. |

Observação: sem sessão, `/aluno` e `/admin` respondem 200 com redirecionamento no corpo (`NEXT_REDIRECT`), porque o `app/loading.tsx` global faz streaming. Não vaza conteúdo; é comportamento do Next, não uma falha.

Fase 0 **não** está completa: faltam #39 e #40, que dependem de ti. A Fase 1 está bloqueada pela lista de instituições (decisão 1 da secção 15).

## Fase 1 — Fundação (parte A: percurso e instituições)

Aplicada por `aplicar-fase-1a-percurso-instituicoes.sh`. Requer `pnpm migrate` (migração 0005). **Parte B por fazer:** Disciplinas, Temas, Categorias, Níveis, Anos e Módulos no admin.

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 41 | P1 | PENDENTE (feito; falta teste) | Percurso do aluno (10ª, 12ª, admissão) | `student_profiles.track`; ecrã `/aluno/percurso` (admissão pede instituição); mudar de classe retira a instituição; histórico e pontos não são tocados. Primeiro acesso: `/aluno` redireciona para a escolha (a administração não é redirecionada, para poder criar instituições). |
| 42 | P1 | PENDENTE (feito; falta teste) | Admin: Instituições | `/admin/instituicoes`: criar, editar, ocultar/activar (com confirmação), reordenar, eliminar (só sem conteúdos nem alunos), logótipo (upload Cloudinary, até 1 MB). Regra de visibilidade em `lib/institutions.ts`. |
| 43 | P2 | PENDENTE (feito; falta teste) | Registo de acções do admin | Tabela `admin_audit_log`; as acções das instituições ficam registadas. |
| 44 | P2 | PENDENTE (feito; falta teste) | `@nickname` único | Índice único sem distinguir maiúsculas; guarda em minúsculas; mensagem clara se já existir. Repetidos antigos: fica o mais antigo, os outros ficam sem `@nickname`. Fecha o #9. |
| 45 | P2 | PENDENTE (feito; falta teste) | Perfil: nome de exibição | Passa a ser guardado (`user.name`). Fecha o #6, junto com a remoção dos pontos `0.0`. |
| 46 | P2 | PENDENTE (feito; falta teste) | Dados fictícios fora do painel e do perfil | Saem: `Funções 58%`, `Aula 3 de 5`, `Meta semanal: 80%`, `goal = max(progresso, 68)` e `Pontos de Ranking 0.0`. Sem actividade aparece `Ainda sem atividade`. Fecha o #5. |
| 47 | P3 | PENDENTE | Conteúdos por instituição ainda por texto livre | Hoje conta-se por `academic_materials.institution_name` = sigla. Passa a id na Fase 2 (Exames). |
| 48 | P3 | PENDENTE | Instituição ocultada continua no perfil de quem a escolheu | Os filtros das fases 2 a 6 têm de ignorar instituições inactivas. |

Skeletons novos (um por página): `PercursoSkeleton`, `AdminInstituicoesSkeleton`; `PerfilSkeleton` e `AlunoSkeleton` ajustados.
NÃO EXECUTADO: `pnpm migrate`, build, tipos, qualquer ecrã no browser, upload de logótipo.

### Fase 1B — progresso
Regra de interface: cartões e linhas mostram só o essencial; as acções vão para o menu ⋯ (`components/admin/row-menu.tsx`).
- 1/5 · menu ⋯ e cartão de instituição compacto — PENDENTE (feito; falta teste visual)
- 2/5 · Disciplinas (`/admin/disciplinas`, âmbito por classe e instituição; reaproveita `library_subjects`; migração 0006 também cria `topics`) — PENDENTE (feito; falta teste)
- 3/5 · Temas (`/admin/temas`: criar, editar, arquivar, eliminar, filtro por disciplina; único por disciplina sem distinguir maiúsculas) — PENDENTE (feito; falta teste visual)
- 4/5 · Classificação (`/admin/classificacao`, separadores Categorias, Níveis e Anos; reaproveita `library_categories` e `library_levels`; migração 0007 cria `exam_years`; não elimina o que está em uso, arquiva) — PENDENTE (feito; falta teste visual)
- 5/5 · Módulos (`/admin/modulos`: 9 módulos × 3 percursos, Ativo/Em breve/Oculto, etiqueta «Novidade» de 7/30/60 dias; migração 0007 cria `exam_modules`, tudo começa Oculto) — PENDENTE (feito; falta teste visual)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 49 | P2 | PENDENTE (feito; falta teste) | Módulos só ficam «Ativo» quando a funcionalidade existe | `lib/exam-modules.ts` tem `ready: false` em todos; o servidor recusa «Ativo» (e a opção aparece desactivada). Ao fechar cada fase, pôr `ready: true` no módulo respectivo. `getVisibleModules(track)` já devolve os módulos de um percurso para a página Exames (Fase 2). |
| 50 | P3 | PENDENTE | Eliminar tema não verifica uso | Hoje nada usa temas. Na Fase 3 (questões) e ao ligar materiais a temas, `deleteTopic` tem de recusar temas em uso e mandar arquivar. |
| 51 | P3 | PENDENTE | Anos: `academic_materials.academic_year` continua número livre | A lista `exam_years` alimenta os formulários de Exames (Fase 2); o envio de materiais ainda aceita qualquer ano. |
| 52 | P3 | PENDENTE | Disciplinas ainda não têm ligação com Temas na lista de Temas além do filtro | Sem acção; só informação. |

Testes da Fase 1B (3 a 5/5): `tsc --noEmit` sem erros; `next build --webpack` compila e gera `/admin/temas`, `/admin/classificacao`, `/admin/modulos`; `pnpm migrate` 0001→0007 em PostgreSQL 16 real, repetível sem erro; SQL do upsert de módulos (com e sem «Novidade»), unicidade de temas e CHECK dos anos verificados na BD. NÃO EXECUTADO: as acções com sessão de admin real e o ecrã no browser/telemóvel.

### Fase 1 — fecho
Código da Fase 1 (A + B) completo. **Não passa a RESOLVIDA** até: (1) correres `pnpm migrate` (0005, 0006, 0007) e usares no browser percurso, instituições, disciplinas, temas, classificação e módulos; (2) existirem as instituições reais (sigla, nome, descrição, logótipo) na BD, incluindo o IFP; (3) validação visual no telemóvel dos skeletons novos (`PercursoSkeleton`, `AdminInstituicoesSkeleton`, `AdminDisciplinasSkeleton`, `AdminTemasSkeleton`, `AdminClassificacaoSkeleton`, `AdminModulosSkeleton`).

## Admin: Materiais (formulário em modal)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 53 | P2 | PENDENTE (feito; falta teste visual) | Materiais: formulário em modal | `/admin/materiais` abre na lista (painel com a altura do ecrã; só a lista rola, com pesquisa por título e paginação de 15 à vista). O formulário abre no botão "Adicionar" (`components/admin/form-modal.tsx`): fecha com X, Esc ou depois de publicar; não fecha ao clicar fora (evita perder o ficheiro carregado). Regra de produto: nenhuma área do admin tem scroll sem contexto, e cada ecrã mostra uma coisa de cada vez. |

Testes: `tsc --noEmit` e `next build --webpack` sem erros; consulta de pesquisa e paginação verificada em PostgreSQL 16 (pesquisa com `%` e `_` escapados). NÃO EXECUTADO: ecrã no browser/telemóvel, foco e Esc do modal, publicar com ficheiro real.

## Admin: padrão das páginas de lista

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 54 | P2 | PENDENTE (feito; falta teste visual) | Padrão das páginas de lista do admin | `components/admin/page-parts.tsx`: `AdminPage`, `AdminPageHeader` (faixa verde: ícone, título, botão «Adicionar» que abre modal), `AdminSearchBar` ([ícone ‖ pesquisa ‖ botão] + contagem), `AdminListPanel` (ocupa o resto do ecrã; só a lista rola) e `AdminPager`. `app/admin/layout.tsx`: a página não rola, só a área de conteúdo. Esqueletos espelham-no em `components/skeletons/admin-page-parts.tsx`. **Regra: toda a página administrativa nova segue este padrão.** |
| 55 | P2 | PENDENTE (feito; falta teste visual) | Materiais: pesquisa estreita, título partido, painel curto, pesquisa sem acentos | `/admin/materiais` passa a usar o padrão; «portugues» encontra «Português». |
| 56 | P2 | PENDENTE (feito; falta teste visual) | Instituições no padrão | `/admin/instituicoes`: criar e editar em modal (`RouteModal` com `?editar=`), pesquisa por sigla, nome ou cidade; Subir/Descer só sem pesquisa activa. |
| 57 | P2 | PENDENTE (feito; falta teste visual) | Menu ⋯ cortado em listas com scroll | `RowMenu` passa a posição fixa e abre para cima junto ao fundo; fecha ao rolar. |
| 58 | P3 | PENDENTE | Disciplinas, Temas, Classificação e Módulos ainda têm o formulário ao lado da lista | Migrar para o padrão (pedido pelo utilizador: «a partir de agora»). |

Testes: `tsc --noEmit` e `next build --webpack` sem erros; pesquisa sem acentos verificada em PostgreSQL 16. NÃO EXECUTADO: ecrã no browser/telemóvel (altura do painel, modal de edição, menu ⋯ perto do fundo).

## Admin: Disciplinas

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 59 | P2 | PENDENTE (feito; falta teste) | Disciplinas sem lista no código | Removido o `INSERT INTO library_subjects` da migração 0004 (12 disciplinas). Base nova arranca vazia (testado: 0 linhas após `pnpm migrate`). Numa base existente, as disciplinas antigas continuam: eliminar/editar em `/admin/disciplinas` (só se não estiverem em uso; senão, arquivar). |
| 60 | P2 | PENDENTE (feito; falta teste visual) | `/admin/disciplinas` no padrão do admin | Faixa verde, «Adicionar» e «Editar» em modal, pesquisa por nome (sem acentos), estado vazio «Ainda sem disciplinas». |
| 61 | P3 | PENDENTE | Disciplinas criadas por texto livre no envio de material | `app/admin/materiais/actions.ts` cria a disciplina se o nome ainda não existir. Decidir se o envio passa a só escolher disciplinas existentes (select). |
| 62 | P3 | PENDENTE | Disciplinas «Matemática», etc. fixas em páginas de demonstração (home, simulado, comunidade) | Já previsto na Fase 5 e na limpeza da Fase 1/9; não tocado aqui. |

Testes: `tsc --noEmit` e `next build --webpack` sem erros; migrações 0001→0007 numa base nova deixam `library_subjects` vazia. NÃO EXECUTADO: ecrã no browser/telemóvel.

## Admin: Temas

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 63 | P2 | PENDENTE (feito; falta teste visual) | Temas no padrão do admin | `/admin/temas`: faixa verde, «Adicionar» e «Editar» em modal, pesquisa por tema ou disciplina (sem acentos), disciplina com selector personalizado, âmbito da disciplina (classes/instituições) visível em cada linha. |
| 64 | P2 | PENDENTE | Temas ainda não aparecem ao aluno | Um tema é uma etiqueta de classificação (não é conteúdo). Só chega ao aluno quando questões e materiais passarem a ter `topic_id`: Fase 3 (questões), Fase 4 (Prática por disciplina e tema) e Fase 7 (Estudo temático). Hoje nada na área do aluno usa temas. |
| 65 | P3 | PENDENTE | Um tema herda o âmbito da disciplina | Se «Matemática» existir na 10ª e na 12ª, os temas valem para as duas. Se a 10ª e a 12ª precisarem de temas diferentes, criar disciplinas separadas por classe. Confirmar na decisão da Fase 3. |

Testes: `tsc --noEmit` sem erros. NÃO EXECUTADO: ecrã no browser/telemóvel.

## Admin: Classificação (anos e ordem)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 66 | P2 | PENDENTE (feito; falta teste) | Anos como lista fixa | `lib/years.ts`: 2020 até 2026 (ou ao ano corrente se posterior), do mais recente ao mais antigo. Sem área de admin para anos. Migração 0008 apaga `exam_years`. O formulário de material usa o selector personalizado «Ano». Os formulários novos (Exames, Questões) usam `examYearOptions()`. |
| 67 | P2 | PENDENTE (feito; falta teste) | Ordem automática | `lib/reorder.ts`: item novo = n+1; Subir/Descer renumeram a lista (1..n). Sem campo «Ordem» em categorias, níveis e temas (temas: dentro da disciplina). Subir/Descer ficam desactivados com pesquisa activa. Testado em PostgreSQL 16. |
| 68 | P2 | PENDENTE (feito; falta teste visual) | `/admin/classificacao` no padrão | Faixa verde, separadores Categorias \| Níveis em partes iguais (`AdminTabs`), pesquisa por separador, criar/editar em modal. |
| 69 | P3 | PENDENTE | Módulos (`/admin/modulos`) ainda fora do padrão | Próxima migração de página. |

Testes: `tsc --noEmit` e `next build --webpack` sem erros; migração 0008 aplicada; criação (n+1) e Subir/Descer verificados na base. NÃO EXECUTADO: ecrã no browser/telemóvel.

## Admin: Módulos

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 70 | P2 | PENDENTE (feito; falta teste visual) | Módulos no padrão do admin | `/admin/modulos`: faixa verde (sem «Adicionar»: os 9 módulos são fixos), lista com o estado por percurso em etiquetas, edição em modal (`?modulo=`) com selectores personalizados (10ª, 12ª, Admissão e «Novidade»). Sem descrições nem «Fase N». |
| 71 | P2 | PENDENTE | «Ativo» escondido enquanto o módulo não existe | `ready: false` em `lib/exam-modules.ts`; a opção «Ativo» só aparece quando `ready: true` (e o servidor recusa na mesma). Passar a `true` ao fechar cada fase. |

Com isto, todas as páginas de admin de listas seguem o padrão. Testes: `tsc --noEmit` e `next build --webpack` sem erros. NÃO EXECUTADO: ecrã no browser/telemóvel; gravar um módulo com sessão de admin.

## Admin: Visão geral

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 72 | P2 | PENDENTE (feito; falta teste visual) | Visão geral do admin em [Actividade \| Catálogo] | Fim da lista de cartões grandes com texto. **Actividade**: «Por tratar» (denúncias de materiais abertas), downloads e novos alunos (7 dias), registo recente (`admin_audit_log`). **Catálogo**: linha por área com número real e atalho. Só dados reais: sem Utilizadores nem Suporte enquanto não existirem. `lib/admin-overview.ts`. Consultas testadas em PostgreSQL 16. |
| 73 | P3 | PENDENTE | Pedidos e relatórios | Quando existirem (moderação de material enviado, pedidos de alunos), entram em «Por tratar» na aba Actividade com uma linha cada; a página de cada um liga-se pelo menu do topo. |

Testes: `tsc --noEmit` e `next build --webpack` sem erros. NÃO EXECUTADO: ecrã no browser/telemóvel.

## Rota /exames retirada e Simulador

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 76 | P2 | PENDENTE (feito; falta teste) | Rota /exames retirada | `app/exames` apagada; redireciona (permanente) para `/biblioteca`. Ligações retiradas do menu do aluno, do painel (o cartão passou a «Fazer simulados») e da página inicial. Os exames anteriores em PDF vivem na Biblioteca. |
| 77 | P2 | PENDENTE | «Exames anteriores» sai de Admin → Módulos | Depende da decisão 1 de `SIMULADOR.md`. O módulo `exames-anteriores` ainda está em `lib/exam-modules.ts`. |
| 78 | P1 | PENDENTE | Especificação do Simulador | `SIMULADOR.md`: a aprovar (secção 11, 8 decisões) antes da Fase 3. O simulado atual (`components/mock-quiz.tsx`) é inventado e expõe as respostas ao navegador: sai na Fase 5 (ou já, decisão 5). |

Testes: `tsc --noEmit` e `next build --webpack` sem erros; nenhuma referência a `/exames` restante no código. NÃO EXECUTADO: abrir `/exames` no browser (deve ir para a Biblioteca) e percorrer os menus.

| 81 | P1 | PENDENTE (documento) | Ficha técnica da IA | `SIMULADOR.md` 9.9: admin = Gemini API (SDK `@google/genai`, nível gratuito, modelo em `AI_ADMIN_MODEL`, saída estruturada + Zod, fila `ai_jobs`); Jonas = nível pago com teto mensal (proposta: `@anthropic-ai/sdk`, `claude-haiku-5-5`), limites por aluno, sem ferramentas. Decisão 12 por responder (teto mensal e fornecedor). |

| 82 | P1 | PENDENTE (documento) | IA sem orçamento | `SIMULADOR.md` 9.9: admin = Gemini grátis (cota esgotada = trabalho fica na fila e retoma no dia seguinte; resultado guardado para sempre); Jonas = Cloudflare Workers AI grátis (10 000 Neurons/dia partilhados, sem treino com os dados), orçamento diário global, 5 mensagens/dia por aluno gratuito; passa a pago com 5 a 10 assinantes Pro. Prática e Modo rápido não gastam IA. Decisão 12 por responder. |

## Correção: Simulados não abria

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 83 | P1 | PENDENTE (feito; falta teste no telemóvel) | Simulados não abria (e Favoritos tinha o mesmo defeito) | Causa reproduzida em produção local: `FeatureCard` estava num ficheiro `'use client'` e recebia o ícone de páginas de servidor. Passou para `components/feature-card.tsx` (servidor). Testado com sessão real: `/aluno`, simulados, favoritos, ranking, desafios, convites, notificações, perfil, percurso, biblioteca, jonas, comunidade, planos e todas as páginas do admin respondem sem erro; `/exames` redireciona (308). |
| 84 | P3 | PENDENTE | Regra para o futuro | Nunca passar componentes (ícones) como propriedade de uma página de servidor para um componente de cliente; passar o nome (texto) ou usar um componente de servidor. |

## Área do aluno: Simulador

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 85 | P1 | PENDENTE (feito; falta teste no telemóvel) | Simulador como hub do percurso | `/aluno/simulador` (substitui `/aluno/simulados`, que redireciona): faixa «A preparar {percurso} · Mudar» e lista dos módulos que o admin deixou visíveis para esse percurso, com «Em breve»; sem módulos, estado vazio «O Simulador abre em breve»; sem percurso, vai a `/aluno/percurso`. Só dados reais (`getVisibleModules`). Skeleton próprio. Testado com sessão real: sem percurso, percurso sem módulos, e com módulos «Em breve» e «Novo». |
| 86 | P2 | PENDENTE | Simulado de demonstração retirado | Removidos `components/mock-quiz.tsx` e `app/aluno/simulados/` (as respostas certas iam para o navegador). A tabela `quiz_attempts` fica até à Fase 5. |
| 87 | P2 | PENDENTE | «Exames anteriores» deixou de ser módulo | Saiu de `lib/exam-modules.ts` (vive na Biblioteca). As linhas antigas em `exam_modules` ficam sem uso; o catálogo do admin só conta os módulos atuais. |

## Área do aluno: Painel (/aluno)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 88 | P2 | PENDENTE (feito; falta teste visual) | `/aluno` redesenhado | Boas-vindas (verde sólido), Esta semana (anel), Sequência (número grande + 7 pontos), Notificações (lista das 3 últimas), Biblioteca (favoritos e descarregados), Simulador (percurso), Professor Jonas (contorno). Sem texto explicativo; botões com a mesma altura, alinhados à base do cartão. Ponto laranja no sino quando há notificações por ler. |
| 89 | P2 | PENDENTE (feito; falta teste) | Só dados reais | `library_favorites`, `library_downloads`, `notifications`, `study_progress`, `student_profiles`, `institutions`. Se a consulta falhar mostra «–» (nunca zero inventado) e regista `[ALUNO]` nos registos. |
| 90 | P3 | PENDENTE (feito; falta teste) | Texto explicativo do Jonas retirado dos menus laterais | `/aluno` (computador) e `components/student-mobile-sidebar.tsx` (telemóvel, partilhado por todas as páginas do aluno): ficou só «Jonas». Cabeçalho: saiu «Continua a construir o teu caminho.». |
| 91 | P3 | PENDENTE (decisão tua) | Menu lateral de `/aluno` tem 3+3 ligações; o do telemóvel e o de `StudentFeatureShell` têm 9+3 | Falta Ranking, Desafios, Convites, Comunidade e Blog no menu de `/aluno` no computador. Só uniformizo se confirmares. |
| 92 | P3 | PENDENTE | Restantes páginas do aluno (simulador, perfil, notificações, favoritos, ranking, desafios, convites, biblioteca, comunidade) | Ainda com texto explicativo e cartões do mesmo estilo; migrar uma a uma, na ordem que indicares. |

Testes: sintaxe TypeScript/TSX dos 3 ficheiros (sem erros TS1xxx); o script foi corrido numa cópia do projecto com repositório git e remoto locais (aplica, é idempotente, faz commit e `git push origin main`). NÃO EXECUTADO: `tsc` com tipos completos, build, ecrã no browser/telemóvel (altura dos cartões, alinhamento dos botões, anel), consultas com sessão real.

## Área do aluno: /aluno como ponto de navegação

Substitui o painel dos itens 88 e 89 (cartões grandes com estatísticas), que não era o que o painel deve ser: `/aluno` serve para navegar entre as páginas do aluno.

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 93 | P2 | PENDENTE (feito; falta teste visual) | `/aluno` com atalhos compactos | 11 atalhos de 84 px (Biblioteca, Simulador, Jonas em 2 colunas, Comunidade, Blog, Ranking, Desafios, Convites, Favoritos, Notificações, Perfil), cada um com estilo próprio; grelha 2/3/4 colunas sem buracos. Saudação «Olá, {nome}» pequena no topo, com o percurso e (admin) «Administração». |
| 94 | P2 | PENDENTE (feito; falta teste) | Histórico mínimo | «Recentes»: os 3 últimos materiais aprovados que o aluno descarregou (`library_downloads`), com «há X». Abrem o ficheiro numa nova janela. Sem histórico (ou se a consulta falhar) a secção não aparece. Ponto laranja no sino e número em «Notificações» quando há por ler. |
| 95 | P3 | PENDENTE (decisão tua) | Os atalhos repetem o menu lateral | O menu lateral de `/aluno` no computador tem 3+3 ligações; o do telemóvel 9+3. Uniformizar? |
| 96 | P3 | PENDENTE | Ranking, Desafios, Convites, Comunidade e Favoritos têm dados fictícios ou estão por reconstruir (#4, #28) | Os atalhos levam a essas páginas tal como estão. |

Testes: sintaxe TSX dos 3 ficheiros (sem erros TS1xxx); script corrido numa cópia com git e remoto locais (aplica, idempotente, commit e `git push origin main`). NÃO EXECUTADO: `tsc` com tipos completos, build, ecrã no browser/telemóvel, consulta «Recentes» com sessão real.

## Área do aluno: /aluno com propósito

Substitui os itens 88 a 94 (painel de estatísticas e grelha de atalhos). `/aluno` é a página a seguir ao login: mostra o que o aluno faz de facto, em vez de repetir o menu.

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 97 | P2 | PENDENTE (feito; falta teste visual) | Estrutura de `/aluno` | Saudação pequena + percurso; **pesquisa** (formulário GET para `/biblioteca?q=`); **Continuar** (último material descarregado, botão «Abrir»); **O que queres fazer?** (Biblioteca, Simulador, Jonas: 3 cartões de 112 px, estilos diferentes, ícone no topo e nome na base); coluna **Recentes** e **Guardados** (favoritos). Blocos sem dados não aparecem; se a consulta falhar ficam só a pesquisa e as 3 ações. |
| 98 | P2 | PENDENTE (feito; falta teste) | Etiqueta do Simulador | «Novidade» se algum módulo ativo tem etiqueta válida; «Em breve» se há módulos visíveis e nenhum ativo; sem módulos visíveis, sem etiqueta (`getVisibleModules`). |
| 99 | P3 | PENDENTE (decisão tua) | «Continuar» só conhece downloads | Não há simulado em progresso nem visualizações registadas. Quando o Simulador existir (Fase 5), «Continuar» passa a mostrar o simulado a meio; para incluir materiais só abertos, é preciso registar visualizações (hoje só `library_downloads`). |
| 100 | P3 | PENDENTE (decisão tua) | O menu lateral de `/aluno` (3+3 ligações) difere do do telemóvel (9+3) | Uniformizar? |
| 101 | P3 | PENDENTE | Ranking, Desafios, Convites, Comunidade e Favoritos com dados fictícios ou por reconstruir (#4, #28) | Fora do painel; não foram tocados. |

Testes: sintaxe TSX dos 3 ficheiros (sem erros TS1xxx); script corrido numa cópia com git e remoto locais (aplica, idempotente, commit e `git push origin main`). NÃO EXECUTADO: `tsc` com tipos completos, build, ecrã no browser/telemóvel, consultas com sessão real.

## Área do aluno: /aluno, página de entrada

Esta versão substitui qualquer painel anterior de `/aluno` (itens 88 a 101, se tiverem sido aplicados). Regra de produto: os números existem, mas são secundários; um estado vazio («Sem atividade recente», zero) é normal e não deve ser o foco da página.

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 102 | P2 | PENDENTE (feito; falta teste visual) | Estrutura de `/aluno` | Saudação pequena + percurso; pesquisa (formulário GET para `/biblioteca?q=`); **Continuar** (último material descarregado, «Abrir»; sem histórico, «Explorar»); **O que queres fazer?** (Biblioteca, Simulador, Jonas: cartões de 112 px, estilos diferentes, ícone no topo e nome na base); linha de números (Semana, Sequência, Descarregados; 76 px); coluna **Recentes** e **Guardados** com estado vazio curto. |
| 103 | P2 | PENDENTE (feito; falta teste) | Dados reais e falhas | `study_progress`, `library_downloads`, `library_favorites`, `notifications`, `student_profiles`, `institutions`. Se a consulta falhar: «Indisponível» nas listas e «–» nos números (nunca zero inventado); regista `[ALUNO]`. Ponto laranja no sino quando há notificações por ler. |
| 104 | P2 | PENDENTE (feito; falta teste) | Etiqueta do Simulador | «Novidade» se algum módulo ativo tem etiqueta válida; «Em breve» se há módulos visíveis e nenhum ativo; sem módulos visíveis, sem etiqueta (`getVisibleModules`). |
| 105 | P3 | PENDENTE (decisão tua) | «Semana» e «Sequência» dependem de `study_progress` | Nada no código actual escreve nessa tabela (só o simulador, ainda por fazer, deve escrever); até lá mostram 0. «Continuar» só conhece downloads (não há visualizações registadas nem simulado a meio). |
| 106 | P3 | PENDENTE (decisão tua) | Menu lateral de `/aluno` (3+3 ligações) difere do do telemóvel (9+3) | Uniformizar? |
| 107 | P3 | PENDENTE | Ranking, Desafios, Convites, Comunidade e Favoritos com dados fictícios ou por reconstruir (#4, #28) | Fora do painel; não foram tocados. |

Testes: sintaxe TSX dos 3 ficheiros (sem erros TS1xxx); script corrido numa cópia com git e remoto locais (aplica, idempotente, commit e `git push origin main`). NÃO EXECUTADO: `tsc` com tipos completos, build, ecrã no browser/telemóvel, consultas com sessão real.

## Área do aluno: painel (desenho «aluno · telemóvel»)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 108 | P2 | PENDENTE (feito; falta teste no telemóvel) | Painel do aluno no desenho telemóvel | `/aluno`: cabeçalho com sino, saudação + percurso, pesquisa, «Continuar», «O que queres fazer?», resumo, «Recentes», «Guardados». Medidas, cores e ícones copiados do desenho (`components/aluno/icons.tsx`). No computador mantém o menu lateral e põe as duas colunas lado a lado. Sem emoji na saudação e sem a seta desenhada à mão (anotação do desenho). |
| 109 | P2 | PENDENTE (feito; falta teste) | Só dados reais, com estado vazio | `lib/aluno-overview.ts`: não lidas (`notifications`), descarregados/guardados/recentes (`library_downloads`, `library_favorites`, só materiais aprovados), percurso e instituição, estado do Simulador (`exam_modules`). Cada parte falha sozinha: aparece «—» ou «Não foi possível carregar», nunca um zero inventado. Pesquisa: `/biblioteca?q=`. «Abrir» e as linhas das listas: `/api/biblioteca/<id>/ficheiro`. |
| 110 | P2 | PENDENTE (decisão tua) | «Semana» e «Sequência» sem fonte de dados | Nada no código grava em `study_progress`, por isso mostram «—» até existir uma linha. Falta decidir o que conta como progresso semanal e como se calcula a sequência. |
| 111 | P2 | PENDENTE (decisão tua) | «Guardados» sem forma de guardar | `library_favorites` existe, mas a Biblioteca não tem botão para guardar; o contador e a lista ficam vazios. `/aluno/favoritos` continua estática. |
| 112 | P3 | PENDENTE (decisão tua) | «Continuar» e «Recentes» baseiam-se em downloads | Abrir ou «Ver» não fica registado; só `library_downloads` tem utilizador e data. Para mostrar o que o aluno abriu, é preciso uma tabela de aberturas (migração). |

Testes: sintaxe TypeScript dos ficheiros novos verificada. NÃO EXECUTADO: build, tipos completos, ecrã no telemóvel/computador, dados reais.

## Biblioteca: guardar materiais

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 113 | P2 | PENDENTE (feito; falta teste) | Guardar material na Biblioteca (só ícone) | Marcador no canto de cada cartão (`aria-pressed`, sem texto). `app/biblioteca/(catalogo)/actions.ts` (`toggleFavorite`): alterna em `library_favorites`; só guarda materiais aprovados; remover funciona sempre. O ícone muda logo e volta atrás se falhar, com o motivo no modal. A página carrega os guardados do aluno numa consulta própria (uma falha não esconde o catálogo). Fecha o #91: «Guardados» e o contador em `/aluno` passam a ter dados. Sem migração. |
| 114 | P2 | PENDENTE (decisão tua) | `/aluno/favoritos` continua estática | Diz sempre «Ainda não tens favoritos», mesmo com materiais guardados. Falta ligá-la à lista real. |
| 115 | P3 | PENDENTE | Sem marcador na pré-visualização | O ícone só existe nos cartões; o modal «Ver» mantém só «Baixar». |

Testes: sintaxe TypeScript verificada. NÃO EXECUTADO: build, tipos completos, guardar/remover no browser.


## Simulador — implementação inicial baseada em `SIMULADOR.md` (24/10/2026)

| Estado | Entrega | Notas |
|---|---|---|
| IMPLEMENTADO EM CÓDIGO; teste pendente | Migração `0009_simulator_questions.sql` | Tabelas `questions`, `question_options`, `question_media` e ligações de imagens; classificação por percurso, instituição, disciplina, tema, dificuldade, ano, estado e marcas internas. |
| IMPLEMENTADO EM CÓDIGO; teste pendente | Admin → Banco de questões (`/admin/questoes`) | Pesquisa e filtros por estado, disciplina e dificuldade; criação/edição em três passos; arquivo em vez de eliminação; marcas internas só no admin. |
| IMPLEMENTADO EM CÓDIGO; teste pendente | Validação do banco | 2–5 opções, exactamente uma correcta, disciplina compatível com o percurso, resposta confirmada antes de publicar; impede alterar enunciado/opções de questão publicada. |
| IMPLEMENTADO EM CÓDIGO; teste pendente | Importação CSV transaccional | Até 500 linhas e 2 MB; erros por linha cancelam o lote; importações ficam em rascunho. Sem imagens no CSV. |
| PENDENTE | Imagens e pré-visualização como aluno | Upload com validação de formato/tamanho, texto alternativo, dimensões e zoom; ainda não ligado ao formulário. |
| PENDENTE | Fórmulas KaTeX | O formulário aceita e guarda LaTeX; renderização e pré-visualização ainda não implementadas. |
| PENDENTE | Versionamento completo | A alteração de enunciado/resposta numa questão publicada é bloqueada; criação assistida de nova versão ainda não implementada. |
| PENDENTE | IA de transcrição e variantes | Não implementada. Deve produzir apenas rascunhos e nunca decidir/publicar resposta certa. |
| PENDENTE | Fases 4 e 5 do simulador | Motor de tentativas, guardar/retomar, modo prática/rápido, cronómetro de servidor, simulados, revisão de erros e histórico ainda não implementados. |

Validação desta entrega: `npm run build` **não executado com sucesso** porque a instalação de dependências não terminou e `next` não ficou disponível (`sh: next: not found`). Migração PostgreSQL e fluxo no browser também não foram testados. Não marcar a fase como resolvida até executar `pnpm migrate`, build e teste real no telemóvel.


## Simulador — continuação (25/10/2026)
- [x] Versionamento básico: alterar enunciado/opções de questão publicada arquiva a anterior e cria nova versão ligada por `previous_version_id`.
- [x] Pré-visualização textual no editor sem expor qual opção é correta.
- [ ] KaTeX e imagens com texto alternativo/dimensões.
- [ ] Validar build, migração 0009 e fluxo no telemóvel antes de marcar a Fase 3 como concluída.

## Área do aluno: cartão nos atalhos

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 116 | P3 | PENDENTE (feito; falta teste no telemóvel) | «O que queres fazer?» num cartão | `/aluno`: a secção (Biblioteca, Simulador, Jonas) fica dentro de um cartão (branco, borda `#e3e5dc`, cantos 20 px, 14 px de margem interior); o skeleton igual. Testado com sessão real: `/aluno`, simulador, biblioteca, jonas, perfil, favoritos, ranking, desafios, convites, notificações, percurso, planos e as páginas do admin respondem sem erro. |

## Simulador, Fase 3 (1/3): banco de questões no padrão

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 117 | P1 | PENDENTE (feito; falta teste no telemóvel) | Banco de questões no padrão do admin | `/admin/questoes`: faixa verde com «+ Adicionar» e um botão só com ícone para «Importar CSV» (modal); fim do cartão de importação por baixo da lista. Separadores Rascunhos \| Publicadas \| Arquivadas, pesquisa sem acentos (enunciado, disciplina, tema), paginação de 15. |
| 118 | P1 | PENDENTE (feito; falta teste visual) | Editor em 3 passos com selectores personalizados | Enunciado → Opções → Classificação; «Para quem» (10ª, 12ª, admissão + instituição) filtra as disciplinas e o tema; pré-visualização como aluno; origem da resposta; opção de posição fixa. |
| 119 | P1 | PENDENTE (feito; falta teste visual) | Fórmulas com KaTeX | `lib/math-text.tsx`: `$x^2$` na linha, `$$…$$` em bloco, `\$` para um cifrão. Texto fora das fórmulas nunca é HTML; KaTeX com `trust` desligado. Dependência nova: `katex`. |
| 120 | P2 | PENDENTE (feito; falta `pnpm migrate`) | Migração 0010 | Classe/percurso obrigatório (`CHECK (track IS NOT NULL) NOT VALID`: vale para questões novas e alteradas). |
| 121 | P2 | PENDENTE | Regras de guardar e publicar | Publicar exige 2 a 5 opções, uma só correta, sem repetidas, resposta «confirmada» ou «oficial». Só mudar enunciado ou opções de uma questão publicada cria nova versão (a anterior fica arquivada). Só rascunhos se eliminam. Questões com imagens nas opções não se editam até o editor suportar imagens. |
| 122 | P2 | PENDENTE | Importação CSV | Tudo ou nada; instituição pela sigla (`institution`) ou `institution_id`; modelo só com o cabeçalho em `/admin/questoes/modelo`. Tudo entra como rascunho com a resposta «por confirmar». |
| 123 | P1 | PENDENTE | Fase 3 (2/3): imagens no editor | A base de dados já tem as tabelas; falta o carregamento (Cloudinary), texto alternativo e ampliação, no enunciado, nas opções e na explicação. |
| 124 | P3 | PENDENTE | Filtros por disciplina e dificuldade | Hoje a pesquisa encontra pela disciplina e o tema; filtros próprios quando a lista crescer. |

Testes (servidor local com sessão de admin e ações reais): 22 casos de guardar, publicar, versões, estados, duplicar, eliminar e CSV (incluindo cancelamento total); `tsc` e `next build` sem erros; migrações 0001 a 0010 numa base nova. NÃO EXECUTADO: ecrã no telemóvel (modal, passos, selectores) e KaTeX no browser.

## Banco de questões: questões por concluir e modelo CSV

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 125 | P1 | PENDENTE (feito; falta `pnpm migrate` e teste) | Questões por concluir (guardamento automático) | Ao criar uma questão, o que se escreve (mesmo incompleto) guarda-se sozinho cerca de 1 s depois de parares de escrever, ao mudar de passo, ao esconder o separador e ao fechar o modal. Fica em «Por concluir» no topo de `/admin/questoes` (até 5 visíveis; as mais antigas aparecem quando concluíres ou descartares), com Continuar (abre no passo onde ficou) e Descartar. Tabela `question_drafts` (migração 0011), por admin; abandonadas há 60 dias e terminadas há 2 dias são limpas. Guardar ou publicar a questão fecha o trabalho em curso. Sem a tabela (migração por correr) a página e o guardar normal funcionam; só o guardamento automático falha, com aviso no editor. Editar uma questão que já existe não tem guardamento automático (já está guardada). |
| 126 | P2 | PENDENTE (feito; falta teste) | Modelo CSV com exemplos | `/admin/questoes/modelo` traz o cabeçalho e 3 linhas: completa (10ª, com fórmulas, tema e explicação), admissão com instituição, e só com o mínimo obrigatório (12ª). Usa disciplinas, temas e instituições que existem mesmo (prefere Matemática); sem dados usa nomes de substituição. As linhas começam por `[EXEMPLO]` e a importação recusa-as com uma mensagem clara. |
| 127 | P3 | PENDENTE (decisão tua) | CSV guardado pelo Excel em português usa «;» | A importação só aceita vírgulas. Um CSV gravado pelo Excel com separador «;» falha com «Faltam colunas obrigatórias». Posso fazer a importação reconhecer «;». |

Testes: sintaxe TypeScript/TSX dos 8 ficheiros (sem erros TS1xxx); lógica pura testada com o leitor de CSV real (modelo lido de volta com 15 colunas por linha, vírgulas e aspas dentro de campos, marca `[EXEMPLO]`) e a sanitização dos rascunhos (limites, tipos inválidos, ids). NÃO EXECUTADO: `tsc` com tipos completos, build, a migração 0011 e o SQL numa base real, ecrã no telemóvel, fechar o modal a meio da escrita e retomar.

## Início, saudação, entrada da equipa, e-mails e recuperação de conta (26/10/2026)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 128 | P2 | PENDENTE (feito; falta teste) | Botão «Painel» na página inicial | `app/page.tsx` lê a sessão no servidor e passa `signedIn` a `HomePage`. Com sessão, o cabeçalho (computador e menu do telemóvel), o botão do topo e a ligação do rodapé mostram «Painel» / «Ir para o painel» (→ `/aluno`) em vez de Entrar e Criar conta. A página inicial passa a ser dinâmica (deixa de ser estática). |
| 129 | P2 | PENDENTE (feito; falta teste) | Saudação inteligente em `/aluno` | `lib/greeting.ts` (hora de Maputo, estável durante a parte do dia). Prioridade: boas-vindas (conta com menos de 48 h) → feriados e datas (1 Jan, 3 Fev, 8 Mar, 7 Abr, 1 Mai, 25 Jun, 7 Set, 25 Set, 4 Out, 5 Out, 1 Nov, 17 Nov, 25 Dez «Dia da Família», 31 Dez) → aniversário da conta → marcos da sequência (3, 7, 14, 30, 50, 100, 200, 365 dias) → segunda de manhã, sexta, fim de semana → bom dia / boa tarde / boa noite / madrugada (com «Olá 👋» a alternar). Emojis só nesta saudação. A linha pode ter 2 linhas (`line-clamp-2`) para frases longas no telemóvel. |
| 130 | P1 | PENDENTE (feito; falta teste) | Revisores entram na administração sem escrever o endereço | `lib/staff.ts`: novo `getStaffRole(user)` (o `getStaffAccess` usa-o). `/aluno`: botão «Administração» (admin) ou «Revisão» (revisor, → `/admin/questoes`). Se a consulta falhar (ex.: migração 0013 por correr) a página abre sem o botão. |
| 131 | P1 | PENDENTE (feito; falta teste e configuração do domínio) | E-mails mais profissionais | `lib/email.ts`: modelo novo (logótipo `public/images/email-logo.png`, texto de pré-visualização, botão, ligação por extenso, aviso de segurança, rodapé que diz porque recebeu), nome do remetente «Twisisa», `EMAIL_REPLY_TO` opcional, assuntos claros (o convite deixou de ser «Tens uma carta à tua espera»). O que decide o spam do Gmail é o domínio (SPF, DKIM, DMARC) e a foto do remetente: ver `docs/EMAIL.md`. |
| 132 | P1 | PENDENTE (feito; falta teste com e-mail real) | Recuperação de conta | `/esqueci-a-senha` (pede o e-mail; resposta igual exista a conta ou não) e `/redefinir-senha` (nova palavra-passe + repetição). Ligação de 1 hora e uso único; ao redefinir, as outras sessões terminam e chega um aviso por e-mail. Ligação «Esqueceste a palavra-passe?» no início de sessão. `lib/auth.ts`: `sendResetPassword`, `onPasswordReset`; o envio corre depois da resposta (`after`). Sem migração. |
| 133 | P3 | PENDENTE (decisão tua) | «Boas-vindas» em vez de «Bem-vindo» | Sem género, para servir todos os alunos. Troca de uma palavra em `lib/greeting.ts`. |
| 134 | P3 | PENDENTE | Revisor sem percurso escolhido | Um revisor novo continua a ser enviado para `/aluno/percurso` antes de ver `/aluno` (e o botão «Revisão»). Só o admin salta essa escolha. |

Testes: sintaxe TS/TSX dos ficheiros alterados (sem erros TS1xxx); `getGreeting` corrido com datas fixas (feriado, 25 Dez, aniversário, boas-vindas, marco da sequência, sexta, fim de semana, madrugada, nome vazio); os 4 e-mails gerados com envio simulado (remetente com nome, `reply_to`, assunto, versão em texto). NÃO EXECUTADO: `tsc` com tipos completos, build, nomes das opções do better-auth na versão instalada (`requestPasswordReset`, `resetPassword`, `sendResetPassword`, `onPasswordReset`, `revokeSessionsOnPasswordReset`), `after()` dentro do manipulador de autenticação, e-mail real no Gmail, ecrã no telemóvel.

## Cursos e provas de admissão (UEM 2026) (26/10/2026)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 135 | P1 | PENDENTE (feito; falta `pnpm migrate` e teste) | Cursos e provas de admissão | Migração `0014_courses.sql`: `exam_papers` (disciplina + variante I/II/III/prática/escrita, por instituição), `courses`, `course_exam_options` (por período laboral/pós-laboral) e `course_exam_option_papers` (peso %). Um curso pode ter várias opções de exame (ex.: Informática: Matemática-II + Português-II **ou** Matemática-I + Física-I). |
| 136 | P1 | PENDENTE (feito; falta `pnpm migrate` e teste) | Carga da UEM 2026 | Migração `0015_seed_uem_courses_2026.sql`: 90 cursos, 124 ofertas (89 laboral + 35 pós-laboral, igual ao divulgado pela UEM), 25 provas, 15 disciplinas (reaproveita as que já existem pelo nome) com âmbito UEM. Só cria o que falta (`ON CONFLICT DO NOTHING`); cria a instituição UEM (oculta até ter conteúdo) se não existir. Fonte: Edital UEM 2026, Tabela A1. Sem vagas nem mensalidades. |
| 137 | P1 | PENDENTE (feito; falta teste) | Admin → Cursos | `/admin/cursos` (só admin): «Por curso» (faculdade, local e provas com pesos, por período) e «Por provas» (cada combinação → os cursos que a aceitam). Adicionar/editar (até 6 opções de 3 provas), arquivar, eliminar. Disciplinas e Instituições passam a recusar eliminar o que tem provas/cursos. |
| 138 | P2 | PENDENTE (decisão tua) | Confirmar no edital | Arquitectura (Matemática-III/Desenho 50/50), História (Português-I 40 / História-I 60), Ciências do Desporto (Português-III 30), e os 70/30 de Matemática, Estatística, Informática, CIG: ilegíveis ou deduzidos na digitalização do PDF. Lista em `docs/CURSOS-UEM-2026.md`. |
| 139 | P1 | PENDENTE | Próximos passos da ligação aluno ↔ curso | (a) aluno escolhe o curso-alvo (hoje `student_profiles.target_course` é texto livre); (b) materiais e questões marcados com a prova (disciplina + variante) para chegarem só a quem os precisa; (c) teste vocacional (percentagens por curso; depende da IA); (d) outras instituições (UP, ISCTEM, UniZambeze...) pelo mesmo formulário. |

Testes: sintaxe TS/TSX; as migrações 0014 e 0015 correram num motor SQL de teste (SQLite) com instituição e disciplina já existentes: 90 cursos, 124 ofertas, todas as opções somam 100%, correr duas vezes não duplica, reaproveita ids existentes. NÃO EXECUTADO: PostgreSQL real (`pnpm migrate`), `tsc` com tipos completos, build, ecrã `/admin/cursos` no telemóvel.

## Área do estudante: ligação entre páginas, painel e Biblioteca por secções (26/10/2026)

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 140 | P2 | PENDENTE (feito; falta teste visual) | Menu único em todas as páginas do estudante | `components/student-nav.tsx` (9 + 3 ligações, página atual marcada) usado por `StudentSidebar` (computador) e `StudentMobileSidebar` (telemóvel). `/aluno` e todas as páginas com `StudentFeatureShell` passam a ter o mesmo menu. Fecha #91, #95, #100 e #106. O cartão de areia do Jonas saiu: Jonas é uma ligação normal, com a mesma cor das outras. `StudentFeatureShell` ganha `backHref`, `backLabel` e `hideTitle`. |
| 141 | P2 | PENDENTE (feito; falta teste visual) | Painel `/aluno` | Pesquisa retirada (a pesquisa vive na Biblioteca); cartões com degradê na família verde da plataforma (sem fundos lisos); bordas pesadas trocadas por sombra suave; Jonas no mesmo verde; «Continuar» só aparece quando há material para continuar (sem estado vazio nem de erro). Emojis da saudação mantidos, sem novos. Skeleton igual (sem «Continuar»). |
| 142 | P1 | PENDENTE (feito; falta teste visual) | Biblioteca: página inicial por secções | `/biblioteca`: ícone + título, pesquisa em tempo real, «Mais populares», «Livros», «Exames», «Guias de estudos» (6 a 8 cartões com capa, título e contexto; secção vazia não aparece), «Ver mais» em cada secção e «Explorar mais» no fim. `/biblioteca?q=` redireciona para `/biblioteca/pesquisa`. |
| 143 | P1 | PENDENTE (feito; falta teste com muitos dados) | Páginas próprias e escala | `/biblioteca/<categoria>` (só materiais daquela categoria), `/biblioteca/pesquisa` (toda a biblioteca, com botões por tipo) e `/biblioteca/explorar` (mosaicos das categorias com contagem). Sempre com botão de voltar. Tudo filtrado e paginado na base de dados (12 por página, páginas numeradas, sem scroll infinito): o navegador nunca recebe o catálogo inteiro. Filtros em funil: Instituição (botões) -> Disciplina -> Ano; mudar a instituição limpa disciplina e ano. Exames ordenados por ano, do mais recente. `lib/library.ts` (servidor) e `lib/library-shared.ts` (também no navegador). |
| 144 | P2 | PENDENTE (feito; falta `pnpm migrate` e teste) | Pesquisa com sugestões e histórico | `components/biblioteca/library-search.tsx`, `/api/biblioteca/sugestoes`. Sem texto: pesquisas recentes e termos em alta (só os pesquisados por 3 ou mais alunos). Com texto: recentes que combinam, até 6 materiais e «Ver todos os resultados». Pesquisa sem acentos e por várias palavras (todas têm de aparecer). Histórico por aluno (30 mais recentes, «Limpar»). Migração `0016_library_sections.sql` (tabela `library_searches` e índices de filtro). Sem a migração a Biblioteca abre na mesma; só o histórico fica vazio. |
| 145 | P3 | PENDENTE | Capas dos cartões | Capa = 1.ª página do PDF/imagem convertida pelo Cloudinary. Documentos Word/PowerPoint/Excel (e ficheiros que falhem) mostram o ícone da categoria. Não existe campo de capa própria. |
| 146 | P2 | PENDENTE (decisão tua) | As 3 secções dependem do `slug` da categoria | Seguem `livros`, `exames` e `guias` (`MAIN_SECTIONS` em `lib/library-shared.ts`). Se uma categoria mudar de `slug` no admin, a secção deixa de aparecer na página inicial (continua em «Explorar»). Os títulos («Livros», «Exames», «Guias de estudos») são fixos no código. |
| 147 | P3 | PENDENTE | Instituição filtra por texto | `academic_materials.institution_name` continua texto livre (ver #47): «UEM» e «uem» seriam duas instituições nos botões. Passa a id na fase dos Exames. |
| 148 | P3 | PENDENTE (decisão tua) | «Mais populares» = mais descarregados | Não há visualizações nem pesquisas por material registadas (ver #112); sem nenhum download a secção não aparece. |
| 149 | P3 | PENDENTE | `/aluno/favoritos` continua estática (#114) e `/biblioteca/partilhar` continua acessível por URL (#22) | Não tocadas. |

Testes: sintaxe TS/TSX de todos os ficheiros (sem erros TS1xxx); `parseListParams`, `withParams`, `normalizeTerm`, `normalizeText` e a janela da paginação testados com Node. NÃO EXECUTADO: `pnpm migrate` (0016), as consultas SQL numa base PostgreSQL real, tipos completos, ecrã no telemóvel/computador, pesquisa com milhares de materiais.


## Lógica única: variantes, temas, sem repetição, pesos e nota /20 (26/10/2026)

Especificação completa em `SIMULADOR.md`, secção «Lógica única».

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 150 | P1 | PENDENTE (feito; falta `pnpm migrate` e teste) | Variantes eram texto livre e o aluno recebia questões fora da variante escolhida | Tabela `subject_variants` + ligação (disciplina, nome) nas questões; **Admin → Variantes**; formulário com selector; CSV com coluna `variant`; publicar exige variante quando a disciplina as tem. Migração `0018`. |
| 151 | P1 | PENDENTE (feito; falta teste) | «Todas as variantes» misturava questões sem variante; Modo rápido ignorava a variante | Sem variante só completa a mistura; Modo rápido passa a escolher variante. |
| 152 | P1 | PENDENTE (feito; falta teste) | Repetição de questões entre sessões e modos | `student_question_stats` (marca ao criar a sessão). Novas primeiro, repartidas por anos; erradas voltam (≤30 %, espera 1 h); certas só no fim. Histórico antigo migrado. |
| 153 | P1 | PENDENTE (feito; falta teste) | Rascunho do editor perdia a variante | `variant` entrou no `DraftPayload`. |
| 154 | P2 | PENDENTE (feito; falta teste) | Pontos 10 por certa → peso 2 a 4, com decaimento por repetição | `attempt_items.weight`; pontos com decimais; pontos antigos de 10 passam a 3 na migração. |
| 155 | P2 | PENDENTE (feito; falta teste) | Nota por percentagem arredondada → nota 0–20 pesada (ex.: 13,4) | `gradeOutOf20` em `lib/quiz-engine.ts`; resultado e histórico. |
| 156 | P2 | PENDENTE (feito; testado com Node) | Baralhar opções com `Math.random` | `OptionShuffler`: aleatoriedade criptográfica, sem 3 letras certas seguidas, nunca a ordem do admin. |
| 157 | P2 | PENDENTE (feito; falta teste) | Prática por tema + «Temas para reforçar» | `attempts.topic_id`; temas com ≥3 respostas e <60 % de acertos. Questões sem tema só completam. |
| 158 | P2 | PENDENTE (decisão tua, já aplicada) | Prática/Modo rápido/Revisão passam a usar também exames reais (`origin = real`) | Antes só `ia` e `admin`. Simulados continuam para a Fase 5. Se quiseres voltar atrás: `PLAYABLE_ORIGINS` em `lib/simulator.ts`. |
| 159 | P3 | PENDENTE | Variantes duplicadas por texto antigo | Juntar à mão em Admin → Variantes. |
| 160 | P2 | PENDENTE | Ranking continua fictício; rede social (reações próprias) por desenhar | Ver #4 e `SIMULADOR.md` L7. |

Testes: `tests/quiz-engine.test.ts` (10 testes, Node) — pesos 2–4, decaimento, nota /20, escolha sem repetição, anos repartidos, erradas com espera, baralhar sem padrões. Ficheiros alterados: sintaxe TS conferida. NÃO EXECUTADO: `pnpm install`, tipos completos, build, `pnpm migrate` (0018), consultas SQL numa base PostgreSQL real, ecrãs no telemóvel.


## Jonas com histórico, Groq e explicação no Simulador (27/10/2026)

Especificação em `JONAS.md`.

| # | Prio | Estado | Alteração | Notas |
|---|------|--------|-----------|-------|
| 161 | P1 | PENDENTE (feito; falta `pnpm migrate`, `GROQ_API_KEY` e teste) | Jonas passa a usar a **Groq** (antes: AI Gateway com `openai/gpt-oss-120b`) | `lib/groq.ts` (fetch, sem dependências). `GROQ_MODEL` opcional (lista por vírgulas). Por omissão tenta `openai/gpt-oss-120b` → `openai/gpt-oss-20b` → `llama-3.1-8b-instant` e passa ao seguinte se um não existir na conta ou estiver com o limite cheio (o Llama falhou no plano gratuito). Limites do plano gratuito da Groq são por organização (cerca de 30 pedidos/min e 1000/dia no gpt-oss-120b, com tokens/min baixos): confirmar na página de limites da conta. |
| 162 | P1 | PENDENTE (feito; falta teste visual) | Página `/jonas` redesenhada: ecrã inteiro, histórico numa barra que fecha, nova conversa contextualizada (percurso + disciplina) | `components/jonas-chat.tsx`, `components/jonas/*`, `app/jonas/page.tsx` e `loading.tsx`. |
| 163 | P1 | PENDENTE (feito; falta `pnpm migrate`) | Conversas e mensagens guardadas | `0019_jonas.sql`. Rotas em `app/api/jonas/**`. O Jonas recebe percurso, disciplina e assuntos recentes como referência. |
| 164 | P1 | PENDENTE (feito; testado com Node) | Respostas com `**negrito**`, listas, tabelas e KaTeX | `lib/jonas-markdown.ts` (16 casos testados). Sem HTML do modelo. |
| 165 | P1 | PENDENTE (feito; falta teste com a Groq real) | «Ver explicação» = Jonas explica no próprio Simulador, passo a passo, com atalhos e perguntas | `components/simulador/jonas-explain.tsx`; também na revisão do resultado. Só depois de responder. Sem Jonas: explicação da equipa. |
| 166 | P2 | PENDENTE (feito; falta teste visual) | «Modo rápido», «Prática» e cartões de variante parecem botões | `components/simulador/styles.ts` (degradê verde suave, sombra, seta em círculo). |
| 167 | P2 | PENDENTE (decisão tua) | **Sem limites** de produto por agora; só travão de 25 mensagens/min | `checkAllowance` em `lib/jonas.ts` é o ponto para limites por plano. Propostas em `JONAS.md` §7. |
| 168 | P2 | PENDENTE | Política de dados da Groq | Confirmar nos termos da Groq antes de abrir a menores e acrescentar às conversas guardadas aos Termos do Twisisa. |
| 169 | P3 | PENDENTE | Sem classificador antes do modelo | Âmbito e segurança só no prompt (`lib/jonas-prompts.ts`). Medir abuso e decidir. |
| 170 | P3 | PENDENTE | Pacotes `ai` e `@ai-sdk/react` ficaram sem uso | Não removidos de propósito (mexer no `package.json` quebra `pnpm install --frozen-lockfile` sem atualizar o lock). Retirar com `pnpm remove ai @ai-sdk/react` e fazer commit do lock. |
| 171 | P3 | PENDENTE (feito) | `pnpm test` não corria (imports sem extensão) | `tests/register.mjs` + `tests/resolve-ts.mjs`; script `test` atualizado. |

Testes: `tests/jonas.test.ts` (17 testes, com um servidor Groq falso: fluxo em pedaços partidos, erros 429 e chave em falta, cancelar a meio guarda o texto) + os 10 de `quiz-engine`. NÃO EXECUTADO: `pnpm migrate` (0019), `pnpm build` (sem dependências instaladas aqui), consultas SQL do Jonas contra PostgreSQL, ecrãs no navegador e no telemóvel, Groq real.

