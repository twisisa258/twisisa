# Twisisa: identidade, onboarding, actividade e retenção (documento final)

Data: 30/10/2026. Este documento substitui todas as versões anteriores. Onde algo não foi verificado está marcado **NÃO VERIFICADO**. Não é parecer jurídico.

Objectivo: o estudante entra todos os dias, sente-se valorizado e a plataforma parece séria, **sem poluir o ecrã e sem scroll desnecessário no telemóvel**.

---

## 0. Decisões fechadas (fonte única de verdade)

| # | Decisão |
|---|---|
| D1 | Idade mínima de conta: **13 anos**. Constante única `MIN_AGE = 13`. |
| D2 | Menores de 18 recebem **predefinições de privacidade**, não bloqueios. |
| D3 | Data de nascimento **completa** (dia, mês, ano). Dia e mês servem para o parabéns; o ano serve para o limite de 13 e para a regra de menores. Sem o ano não há como aplicar D1 e D2. |
| D4 | **Registo: 1 ecrã. Onboarding: 3 ecrãs.** Total 4 (eram 8 a 9). Não há mais agrupamento possível sem misturar o pedido de permissão do telemóvel com outras perguntas. |
| D5 | **Nenhum cartão, faixa ou lista de tarefas no painel** a lembrar o que falta. O painel fica limpo. |
| D6 | Cada dado extra é pedido **no momento em que faz falta**, não no onboarding. |
| D7 | No máximo **1 elemento extra visível** por ecrã (banner de anúncio **ou** barra de cookies, nunca os dois). |
| D8 | Cada página do estudante cabe em **360x640 sem scroll**, excepto listas (Biblioteca, histórico). |
| D9 | Tudo o que a interface valida, o **servidor volta a validar**. |
| D10 | Lembretes só com razão real e específica, 1 e-mail por dia no máximo, parar após 3 sem regresso. |
| D11 | Canal principal para trazer o estudante de volta: **Web Push**. E-mail para resumos e para quem não aceitou push. |
| D12 | Comunidade fora do plano (decisão anterior mantida). |

---

## 1. Idade e privacidade

### 1.1 Regras

| Idade (calculada no fuso de Maputo, CAT, UTC+2) | Comportamento |
|---|---|
| Data no futuro ou idade acima de 100 | Recusa com mensagem clara |
| Menos de 13 | Recusa: "O Twisisa é para maiores de 13 anos." Nenhuma conta é criada |
| 13 a 17 | `show_in_ranking = false` por omissão; sem publicação aberta (hoje não há comunidade, regra fica pronta); sem e-mails promocionais (só lembretes de estudo, com opção de desligar); foto opcional e nunca pedida |
| 18 ou mais | Como hoje, com as mesmas opções ao alcance |

As predefinições aplicam-se no momento em que a data de nascimento é guardada. Ao fazer 18 anos nada muda sozinho: o estudante escolhe se quer aparecer no ranking.

### 1.2 Contexto legal (pesquisa de 30/10/2026)
- Segundo as fontes encontradas, Moçambique não tinha lei geral de protecção de dados em vigor. Existem o artigo 71 da Constituição e os artigos 63 a 65 da Lei n.º 3/2017 (Transacções Electrónicas).
- A proposta de Lei de Protecção de Dados Pessoais foi aprovada em Conselho de Ministros a 3 de Março de 2026 e, segundo a AIM de 25 de Agosto de 2026, submetida à Assembleia da República. **NÃO VERIFICADO** se foi aprovada depois.
- Não encontrei idade mínima de consentimento digital na proposta. O 13 é convenção estrangeira, adoptada por decisão de produto.
- Recomendação: confirmar com jurista local antes de lançamento amplo.

---

## 2. Registo e entrada

### 2.1 Estado actual (verificado no código)
- `components/auth-form.tsx`: nome, e-mail, palavra-passe; validação só nativa do browser; erros genéricos; só trata `USER_ALREADY_EXISTS`.
- Depois de entrar vai sempre para `/aluno`.
- Verificação de e-mail enviada mas não bloqueia a conta.
- Sessão de 7 dias com renovação diária (`expiresIn`, `updateAge` em `lib/auth.ts`).
- Limite de pedidos: o por omissão do better-auth.

### 2.2 Segurança (antes de abrir ao público)
O armazenamento por omissão do limite de pedidos do better-auth é a memória do processo; a documentação desaconselha isso em serverless. Na Vercel cada instância tem memória própria, logo o limite de tentativas pode ser contornado.

**Correcção:** `rateLimit.storage: 'database'`. Pontos sensíveis (`/sign-in`, `/sign-up`, `/change-password`, `/change-email`) têm por omissão 3 pedidos por 10 s.

### 2.3 Ecrã de registo (único)

Conteúdo, de cima para baixo:
1. Alternador discreto "Criar conta / Entrar".
2. E-mail.
3. Palavra-passe (mostrar/ocultar; barra de força fina).
4. Uma linha: caixa "Aceito os Termos e a Privacidade" (links abrem a página legal sem perder o formulário).
5. Botão "Criar conta" (só activo quando tudo é válido).
6. Separador "ou" e botão "Continuar com Google".

A caixa fica **acima dos dois botões**, para valer para os dois caminhos. Caixa explícita prova melhor o consentimento do que "ao continuar aceitas".

Nome e data de nascimento **não** estão aqui: vão para o onboarding, igual para e-mail e Google.

| Campo | Regra no servidor | Interface |
|---|---|---|
| E-mail | Formato válido; normalizado em minúsculas | Sugere correcção de erros comuns (`gmail.con`, `gmial.com`); "já existe" só ao submeter |
| Palavra-passe | Mínimo 8; recusar lista curta de senhas muito comuns | Barra de força; regra visível |
| Termos | Obrigatório; grava versão e data | Botão bloqueado sem ela |

Erros de validação aparecem **depois de sair do campo**, não a cada tecla. Mensagens específicas em vez de "Verifica os dados".

### 2.4 Google (OAuth)
Verificado na documentação do better-auth:
- `socialProviders.google` com `clientId` e `clientSecret`; cliente: `authClient.signIn.social({ provider: 'google', callbackURL })`.
- URI de redirecionamento na Google: `https://<domínio>/api/auth/callback/google`. `BETTER_AUTH_URL` deve apontar para `twisisa.site` para evitar `redirect_uri_mismatch`.
- Variáveis novas: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- Ecrã de consentimento da Google: passar de "Testing" para "In production", com link para `/privacidade`.

**NÃO VERIFICADO:** se o domínio próprio fica automaticamente em `trustedOrigins`; o processo exacto de verificação da Google para o âmbito básico; o comportamento do "esqueci a senha" numa conta só-Google.

Tratamentos obrigatórios:
1. Quem entra por Google salta o formulário, mas passa pelo mesmo onboarding e pela mesma guarda (secção 2.6).
2. Ligação de contas: o login social junta-se a um utilizador existente com o mesmo e-mail se ambos estiverem verificados. Como a verificação aqui não é obrigatória, quem tem conta por palavra-passe não verificada e tenta o Google pode ficar bloqueado. Mensagem clara ("Verifica o teu e-mail primeiro") e reenvio da verificação.
3. "Esqueci a senha" numa conta só-Google: explicar "esta conta entra com Google".

### 2.5 Sessão ("voltar sem fazer login")
- Hoje: 7 dias com renovação diária. Chega para uso diário; falha para quem passa mais de 7 dias fora.
- Passa a **30 dias com renovação**.
- Opção "Este computador é partilhado" (escolas e ciber-cafés) que reduz a duração.
- `rememberMe` do better-auth: **NÃO VERIFICADO**, confirmar antes de desenhar a caixa.
- `callbackURL` dinâmico: voltar ao sítio de onde veio (hoje é sempre `/aluno`).
- Em `/aluno/perfil`: lista de dispositivos com "terminar sessão" (`revokeSession`, `revokeSessions`).
- Nada se perde ao expirar: as tentativas de simulado já ficam no servidor.

### 2.6 Guarda central `requireStudent()`
Hoje cada página repete `getSession` + `redirect`. Passa a existir uma função única que devolve o utilizador ou redirecciona:
- sem sessão: para entrar;
- sem consentimento ou onboarding por concluir: para o primeiro passo em falta (secção 3.4).

Usada por todas as páginas de `/aluno`. Uma camada `proxy.ts` serve só como verificação optimista (a documentação do better-auth desaconselha confiar nela sozinha).

### 2.7 Ciclo de vida da conta
- Mudar palavra-passe e e-mail dentro da conta (mudar e-mail vem desligado por omissão no better-auth).
- Apagar conta e exportar dados (padrão profissional; a proposta de lei, segundo as fontes, prevê acesso, rectificação, apagamento e oposição).
- **Problema no esquema:** `student_profiles`, `notifications` e outras tabelas usam `user_id text` sem chave estrangeira para `user` (só `session` tem). Apagar um utilizador deixa órfãos. A migração limpa os órfãos existentes e depois acrescenta `REFERENCES "user"(id) ON DELETE CASCADE`.

---

## 3. Onboarding (3 ecrãs)

### 3.1 Regras de interface
- Um tema por ecrã, no máximo 3 campos leves.
- Cabe em 360x640 **sem scroll**, incluindo com teclado aberto quando há campo de texto. Escolhas por toque, não por escrita.
- Progresso discreto (3 pontos ou barra fina) e botão voltar.
- **Cada passo é guardado no servidor ao avançar**: se fechar a aplicação, retoma onde parou.
- Sem ecrã de parabéns no fim: entra directamente num primeiro simulado curto (o tempo até ao primeiro valor decide se volta).

### 3.2 Ecrãs

| # | Ecrã | Conteúdo | Notas |
|---|---|---|---|
| 1 | "Sobre ti" | Nome (preenchido se vier do Google); data de nascimento em **três selectores numa linha** (dia, mês, ano) | Os selectores evitam o teclado. A data completa permite o parabéns no dia certo e o cálculo exacto da idade (13 e 18). Menos de 13: ecrã de recusa e nenhuma conta activa |
| 2 | "O que preparas" | Percurso em 3 botões (10ª, 12ª, Admissão). Se Admissão: surge **no mesmo ecrã** o selector de instituição. Por baixo, meta diária em 3 opções | O selector de instituição só aparece após o toque em Admissão, sem mudar de ecrã. Curso alvo: fica para depois |
| 3 | "Lembretes" | Três botões: "No telemóvel", "Por e-mail", "Agora não" | Ecrã próprio: o pedido de permissão do telemóvel só deve surgir após um toque com o valor claro |

**Critério de aceitação nº 1:** o ecrã 2 caber sem scroll em 360x640 com Admissão e instituição visíveis. **NÃO FOI TESTADO** em aparelho.

Texto dos ecrãs em português de Moçambique, curto e directo, sem tom de formulário. Rever contigo antes de publicar.

### 3.3 O que NÃO entra no onboarding

| Dado | Quando se pede |
|---|---|
| `@nickname` | Na primeira abertura do Ranking, só para maiores de 18 que queiram aparecer |
| Foto | Nunca é pedida; fica em `/aluno/perfil` |
| Escola e província | `/aluno/perfil` (acordeão que já mostra o completo) |
| Curso alvo | `/aluno/perfil` |
| Telefone | Só se um dia houver WhatsApp |

### 3.4 Como o servidor sabe o passo
Sem tabela de passos. O passo calcula-se pelo que falta:
1. nome e data de nascimento;
2. percurso, instituição (se Admissão) e meta;
3. lembretes (escolha registada em `notification_prefs`; por omissão desligado até haver escolha).

`requireStudent()` redirecciona para o primeiro em falta. `onboarded_at` regista a conclusão.

### 3.5 Regra para o resto da plataforma
Cada página do estudante cabe em 360x640 sem scroll, excepto listas. Formulários longos viram passos ou linhas que abrem (como o acordeão do perfil). A auditoria página a página aplica esta regra a cada uma.

---

## 4. Actividade (sem ela nenhum lembrete é honesto)

Hoje `study_progress` tem leitura e nenhuma escrita: não se sabe quando o estudante estudou.

### 4.1 Definição única de "dia de estudo"
Um dia em CAT conta se o estudante fez **pelo menos uma** destas:
- respondeu a uma questão no simulador (`submitAnswer`, `finishAttempt`);
- abriu ou descarregou um material (endpoint do ficheiro da Biblioteca);
- enviou mensagem ao Jonas (`/api/jonas`).

Os pontos de escrita existem; falta registar. Abrir materiais só deixa rasto com a tabela de aberturas (item antigo #112).

### 4.2 Dados
- `study_days (user_id FK, day date, questions int, materials int, jonas_messages int, PRIMARY KEY (user_id, day))`, com `INSERT ... ON CONFLICT DO UPDATE`.
- Sequência, "esta semana" e "última actividade" **calculam-se** a partir desta tabela (nada de número guardado que dessincronize).
- Meta diária escolhida no onboarding, editável em `/aluno/perfil`.

### 4.3 Pronto quando
- Responder uma questão altera "Semana" e "Sequência" no painel.
- A sequência respeita a meia-noite de Maputo, não a do servidor.

---

## 5. Retenção: o que enviar, a quem, quando

### 5.1 Regras de comportamento
1. Só se envia com razão real e específica, extraída de dados do estudante.
2. Cada mensagem traz um próximo passo concreto ("10 questões de Funções, cerca de 8 minutos").
3. Tom de convite, sem culpa: "Retoma quando quiseres", nunca "Perdeste a tua sequência".
4. No máximo 1 e-mail por dia; após 3 lembretes de inactividade sem regresso, parar até ele voltar.
5. O estudante controla: preferências por tipo e desligar com um clique.
6. Reconhecer o que ele fez (marcos) pesa mais do que lembrar: é aqui que se cumpre o "sentir-se valorizado".

### 5.2 Catálogo

| Gatilho | Condição | Canal | Limite |
|---|---|---|---|
| Boas-vindas | Conta criada | Na plataforma + e-mail | Uma vez |
| **Aniversário** | Dia e mês da data de nascimento, em CAT. Nascidos a 29/02: celebrar a 28/02 nos anos não bissextos | Saudação no painel (prioridade mais alta em `lib/greeting.ts`, acima de boas-vindas e feriados) + e-mail dentro do orçamento diário | Uma vez por ano |
| Primeiro simulado | Percurso escolhido, nenhuma tentativa em 24 h | Na plataforma | Uma vez |
| Retomar | Tinha dias de estudo e última actividade há 2+ dias | Push ou e-mail | Dia 2, dia 5, dia 12; depois para |
| Sequência em risco | Sequência de 3+ dias e ainda não estudou hoje | Push (preferível) | Um por dia |
| Resumo semanal | Segunda-feira: questões, pontos, melhor disciplina, temas a reforçar (já calculado em `lib/simulator.ts`) | E-mail ou plataforma | Semanal |
| Marcos | 10 certas, 100 questões, sequência 3/7/14/30; top 10 (se visível) | Na plataforma, no momento | Uma vez por marco |
| Material novo | Admin publica material do percurso, disciplina ou instituição | Dentro do resumo semanal | Semanal |
| Contagem para o exame | Admissão com instituição: dias até ao exame | **Uma linha** na saudação do painel, sem cartão | Diário, só essa linha |
| Datas do calendário | Feriados e datas de `lib/greeting.ts` | Saudação no painel | Já existe |

Para menores de 18: sem e-mails promocionais; marcos, resumo e lembretes de estudo continuam, com opção de desligar.

### 5.3 Anúncios (banner do admin)
- `announcements (id, title, body, cta_label, cta_href, audience jsonb, starts_at, ends_at, dismissible, priority)` e `announcement_dismissals (user_id, announcement_id)`.
- Página no admin no padrão das outras (faixa verde, modal de criação).
- Públicos: todos, por percurso, por instituição.
- Regras: **uma faixa fina**, um banner de cada vez, sempre dispensável.

### 5.4 Aviso de cookies
- Barra fina com Aceitar e Recusar; o Google Analytics (`NEXT_PUBLIC_GA_ID`, só em produção) só carrega após aceitar; a escolha fica guardada.
- **NÃO VERIFICADO** se a lei actual exige; é prática profissional.
- Nunca visível ao mesmo tempo que um banner de anúncio (D7): o de cookies tem prioridade; o anúncio espera.

---

## 6. Canais e orçamento

| Canal | Alcança quem não abriu a plataforma? | Custo e limite | Notas |
|---|---|---|---|
| Na plataforma | Não | Gratuito | Necessário, mas não traz de volta |
| E-mail (Resend) | Sim | **Gratuito: 100/dia e 3.000/mês** (confirmar na página de preços da Resend). Pago desde 20 USD/mês | Limite partilhado com verificação e recuperação de senha |
| Web Push (já há `manifest`) | Sim | Sem custo por mensagem | Service worker, chaves VAPID e permissão. Android (Chrome) funciona; iPhone só com a app instalada no ecrã inicial. **NÃO VERIFICADO** neste projecto |
| WhatsApp / SMS (`student_profiles.phone`) | Sim | Custo por mensagem; WhatsApp exige modelos aprovados | Fora do MVP |

### Orçamento diário de e-mail (prioridade)
1. Transaccionais (verificação, recuperação): sempre passam; reserva fixa (por exemplo 30/dia).
2. Aniversário e sequência em risco.
3. Retomar.
4. Resumo semanal.

O que não couber fica para o dia seguinte. Esgotar com frequência é o sinal para o plano pago. Só se envia lembretes a **e-mails verificados**.

---

## 7. Arquitectura do envio

### 7.1 Dados
- `notification_prefs (user_id PK/FK, email_enabled, push_enabled, categories jsonb, unsubscribe_token, updated_at)`.
- `notification_outbox (id, user_id, kind, channel, dedupe_key UNIQUE, payload jsonb, status, scheduled_for, sent_at, error)`.
- A tabela `notifications` existente vira a caixa de entrada na plataforma, com `kind` normalizado.

### 7.2 Execução
- Tarefa diária `/api/cron/lembretes` protegida por `CRON_SECRET`. No plano Hobby da Vercel corre no máximo uma vez por dia, em UTC, e pode disparar em qualquer minuto da hora marcada. Escolher 15:00 UTC (17:00 em Maputo) sem depender de precisão.
- A Vercel pode entregar o mesmo evento mais de uma vez: `dedupe_key` único (`kind:user:dia`); executar duas vezes não envia duas vezes.
- Processar em lotes; o que sobrar vai no dia seguinte.
- Marcos disparam no momento, dentro da acção que os causa, sem cron.
- Falhas ficam no `outbox` com o erro e nunca derrubam a resposta ao estudante.

### 7.3 Admin "Notificações"
Interruptor geral, interruptor por regra, **pré-visualização do que seria enviado hoje** (contagem e amostra, sem enviar) e orçamento diário gasto.

### 7.4 Conformidade da mensagem
- Remetente "Twisisa", assunto claro, versão em texto (já em `lib/email.ts`).
- "Desligar este tipo de aviso" em cada e-mail, sem login (token em `notification_prefs`), mais cabeçalho `List-Unsubscribe`.
- Domínio autenticado no Resend (SPF, DKIM), como descreve `docs/EMAIL.md`; sem isto vai para spam.

---

## 8. Esquema da migração (resumo)

```sql
-- 1. Limpar órfãos e acrescentar chaves estrangeiras
--    (student_profiles, notifications, e restantes tabelas com user_id text)
-- 2. Novos campos e tabelas
ALTER TABLE student_profiles
  ADD COLUMN birth_date date,
  ADD COLUMN onboarded_at timestamptz;

CREATE TABLE account_consents (
  id          bigserial PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind        text NOT NULL,            -- 'terms' | 'privacy'
  version     text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip          text
);

CREATE TABLE study_days (
  user_id         text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  day             date NOT NULL,
  questions       int NOT NULL DEFAULT 0,
  materials       int NOT NULL DEFAULT 0,
  jonas_messages  int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE notification_prefs (
  user_id           text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  email_enabled     boolean NOT NULL DEFAULT false,
  push_enabled      boolean NOT NULL DEFAULT false,
  categories        jsonb NOT NULL DEFAULT '{}',
  unsubscribe_token text NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_outbox (
  id            bigserial PRIMARY KEY,
  user_id       text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind          text NOT NULL,
  channel       text NOT NULL,
  dedupe_key    text NOT NULL UNIQUE,
  payload       jsonb,
  status        text NOT NULL DEFAULT 'pending',
  scheduled_for timestamptz,
  sent_at       timestamptz,
  error         text
);

CREATE TABLE announcements (
  id bigserial PRIMARY KEY, title text NOT NULL, body text,
  cta_label text, cta_href text, audience jsonb NOT NULL DEFAULT '{"all":true}',
  starts_at timestamptz, ends_at timestamptz,
  dismissible boolean NOT NULL DEFAULT true, priority int NOT NULL DEFAULT 0
);
CREATE TABLE announcement_dismissals (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  announcement_id bigint NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, announcement_id)
);
-- Fase H: exam_dates (institution_id, exam_date) gerida no admin.
-- Tabela de aberturas de materiais (item #112) para contar "materials".
```

Constantes no código: `MIN_AGE = 13`, `TERMS_VERSION`, `PRIVACY_VERSION` (mostradas no rodapé das páginas legais).

Variáveis de ambiente novas: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, chaves VAPID (pública e privada), e `BETTER_AUTH_URL` apontando para o domínio final.

---

## 9. Ordem de construção e critérios de "pronto"

| Fase | Entrega | Pronto quando |
|---|---|---|
| A | `requireStudent()`; limite de pedidos em base de dados; chaves estrangeiras com `CASCADE` | Páginas do aluno usam a guarda única; login falhado travado entre instâncias; apagar conta não deixa órfãos |
| B | Registo de 1 ecrã (com Termos versionados e Google visível) + onboarding de 3 ecrãs; regras de idade (13 e menores de 18) | Servidor recusa data inválida, menor de 13 e falta de consentimento por pedido directo; ranking oculto por omissão para menores; nenhum ecrã com scroll em 360x640 |
| C | Google ligado ao mesmo onboarding; sessão de 30 dias e computador partilhado; `callbackURL` dinâmico; lista de dispositivos | Conta Google nova passa pelo onboarding e não chega a `/aluno` sem o concluir; sessão sobrevive 7 dias fora |
| D | `study_days`; "Semana" e "Sequência" reais; meta diária | Responder uma questão altera o painel; meia-noite de Maputo respeitada |
| E | Marcos na plataforma; saudação de aniversário; banner do admin; barra de cookies | Marcos aparecem no momento; banner só para o público escolhido; nunca mais de um elemento extra |
| F | Preferências, e-mail com orçamento diário, cron, desligar com um clique, pré-visualização no admin | Execução dupla não duplica envios; orçamento nunca ultrapassado |
| G | Web Push | Estudante com permissão recebe "sequência em risco" no Android |
| H | Calendário de exames no admin e contagem no painel | Estudante de admissão vê os dias que faltam numa linha |

A fase A não se vê, mas as outras dependem dela. A D é o que torna honestos todos os lembretes.

---

## 10. Como saber se funciona

Métrica principal: **regresso em 48 h após um lembrete**, medido contra um grupo de controlo (por exemplo 10% que não recebe). Sem controlo não se sabe se o lembrete trouxe o estudante.

Outras: estudantes com 3+ dias de estudo na primeira semana; percentagem que conclui o onboarding; pedidos para desligar (se subirem, os lembretes incomodam).

---

## 11. Pontos em aberto

1. Confirmação jurídica local de D1 e D2.
2. A lei de protecção de dados foi aprovada depois de Agosto de 2026?
3. Plano da Vercel (Hobby ou Pro) e da Resend (gratuito ou pago).
4. better-auth: `rememberMe`, `trustedOrigins` com domínio próprio, recuperação de senha em conta só-Google.
5. Datas oficiais de exame por instituição: quem as mantém.
6. Web Push em iPhone: testar em aparelho real.
7. Textos dos ecrãs e lembretes em português de Moçambique: rever antes de enviar.
8. Teste do ecrã 2 do onboarding em 360x640.
