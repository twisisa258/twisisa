# Percurso do aluno, exames e calendário (especificação)

Pedido do dono do produto em 2026-11-02. Este documento existe para nada se perder. O estado de cada parte está na secção 9.

## 0. Princípios (valem para tudo)
1. **Nada de dados fixos no código.** Instituições, cursos, disciplinas, combinações de provas, número de questões, durações, tentativas, datas e textos vêm da base de dados e editam-se no painel de admin. O código só tem lógica. Nunca pôr um `<input>` ou uma lista escrita à mão onde o que se mostra são dados guardados.
2. **Sem `<select>`, `alert()`, `confirm()` nem `prompt()` nativos.** Poucas opções → botões. Muitas opções (ex.: cursos) → painel próprio com pesquisa. Confirmações → modal próprio.
3. **Sem poluição.** Uma decisão por ecrã. Só o essencial.
4. **Modal pequeno e fechável** é uma variação válida, mas tem de trazer algo novo; quando tudo tem a mesma forma, fica feio.
5. Deve existir um **modal de instalar a app**.

## 1. Depois de criar a conta
- O aluno **nunca cai num quiz sozinho**. Ao acabar o onboarding aparece um modal pequeno: «Queres praticar agora?» com «Praticar agora» e «Agora não». Só se disser sim começa a prática curta (tamanho da meta diária).

## 2. Instituição, curso e disciplinas (percurso de admissão)
- O aluno escolhe a **instituição** e o **curso**. Pouca coisa → botões; muita → painel com pesquisa. Sem seletor.
- Quem **não sabe o curso** usa o **teste vocacional** (já existe: `orientation_*`).
- Quem **já escolheu** pode **testar se a escolha é coerente** (o teste vocacional compara com o curso escolhido).
- Cada curso tem uma ou mais **combinações de provas** (já existe: `course_exam_options` e `course_exam_option_papers`). Exemplo: um curso de Matemática na UEM pode ser «Matemática + Física» ou «Matemática + Português».
  - Se o curso tem **uma** combinação: fica escolhida sem perguntar.
  - Se tem **mais de uma**: pergunta «Qual é a tua combinação?» (botões) e guarda no perfil.
- O perfil mostra e deixa mudar o curso e a combinação.
- No **Simulador só aparecem as duas disciplinas** da combinação do aluno, como dois botões grandes. Sem seletor de disciplina.
- Esta etapa **não pode ser saltada** (ver pergunta aberta P1).

## 2.1 Fluxo entre cursos e disciplinas (mapa e regras)
**Regra:** quem se candidata (percurso Admissão, com instituição) **não começa nenhuma prática** enquanto não tiver **curso** e, se o curso aceitar mais de uma combinação de provas, **combinação**. Quem fez a conta antes da atualização entra nesta regra sozinho. Uma só combinação fica escolhida sem perguntar; instituição sem cursos na base não bloqueia; 10ª e 12ª classe não são afetadas.

| Onde | O que acontece |
|---|---|
| Onboarding (conta nova) | Percurso → instituição → curso → combinação (se houver várias) → meta. «Ainda não sei o curso» deixa seguir, mas a escolha é pedida logo a seguir em `/aluno/escolher-curso` |
| Modal «A que curso te candidatas?» (`components/aluno/curso-gate.tsx`) | Curso (lista com procura) e combinação, só botões. Se não souber o curso, link para o teste vocacional. Ao guardar segue para onde ia (`/aluno?curso=1&next=...`). A rota `/aluno/escolher-curso` só redireciona (links antigos) |
| Painel `/aluno` | Sem curso, o painel fica limpo: um cartão simples «Escolhe o teu curso» e um **modal grande, que se pode fechar**, com a escolha (abre sozinho; tem prioridade sobre os outros modais) |
| Simulador (páginas) | `requireSimulatorScope()` redireciona para `/aluno?curso=1&next=...`, que abre o modal |
| Qualquer início de sessão | `startAttempt` (lib/simulator.ts) recusa com a mensagem «Escolhe primeiro o teu curso…»; vale para Prática, Modo rápido, Rever erros, «Praticar este tema» e primeira prática |
| Desafios | Mesma guarda; as disciplinas e pesos vêm da combinação do aluno |
| Teste vocacional | Fora da guarda (é por lá que se pode escolher). Escolher um curso do resultado resolve a combinação (uma só: automático; várias: leva a `/aluno/escolher-curso`) |
| Perfil → Percurso | Curso e combinação por botões; guardar exige combinação se houver várias |
| Mudar de percurso, instituição ou curso | A combinação antiga deixa de valer (só vale se pertencer ao curso atual); o aluno escolhe de novo |
| Admin apaga ou refaz as opções de um curso | A combinação guardada desaparece (`ON DELETE SET NULL`); o aluno é perguntado outra vez, ou fica escolhida sozinha se sobrar uma |

Código: `lib/combinacoes-pure.ts` (`decideGate`, testado), `lib/combinacoes.ts` (`getCourseGate`, `getStudentSubjectIds`, `getStudentCourseSubjects`). A coluna `student_profiles.target_option_id` (migração 0031) é lida por SQL e não pelo drizzle: se a migração faltar, as páginas abrem na mesma e o aviso fica nos registos do servidor.

## 3. Exame e prática
Ao escolher a disciplina, a página diz claramente se é **exame** ou **prática**.

**Exame** (regras iguais para todos, mas cada valor configurável no admin por instituição/prova):
- 40 questões (configurável) e tempo definido, a contar até ao fim.
- **Sem ferramentas de ajuda** (o Kit não aparece), **sem Jonas/IA a explicar**, **sem ver a resposta de imediato**.
- **Não pausa** depois de começar. Antes de começar, um aviso em modal próprio explica isto e pede confirmação.
- No fim: resultado, **notificação** e **e-mail estratégico**. Se foi mal, o e-mail ajuda a melhorar (temas fracos, o que praticar); se foi bem, dá os parabéns.
- Pode **refazer o mesmo exame**, mas com **questões e opções baralhadas** (as mesmas questões, outra ordem).
- **Máximo de duas tentativas por exame**: exame normal e exame de recorrência.
- Aconselha-se **fazer prática antes**: Modo rápido, Duelo e outras formas de treinar, sugeridas no ecrã do exame.

**UEM, exame integrado:** na UEM fazem-se **dois exames ao mesmo tempo, em 3 horas**. Ao escolher exame numa instituição que o tenha, pergunta «Integrado ou não integrado?». As outras instituições não têm esta pergunta. Quem decide se uma instituição tem exame integrado, e a duração, é o admin.

## 4. Calendário de exames
- O **edital** de cada instituição traz sempre as datas de início dos exames. O aluno vê um **calendário** com a data do exame **real** dele.
- O aluno pode **criar agenda** de exames dentro da plataforma (os seus treinos e exames), com lembrete (liga aos lembretes e ao web push).
- As datas oficiais são dados do admin, com a fonte (link do edital).

## 4.1 Lembretes e notificações (decidido)
- Não há página de configurações de lembretes. Os lembretes vêm ligados por defeito; um modal simples pede a permissão de notificações e o perfil tem um interruptor para desligar.

## 5. Interface
- Substituir os `<select>` existentes (lista na secção 8).
- Modal de instalar a app (feito, ver secção 9).

## 6. Modelo de dados (proposta; migrações novas, nada escrito no código)
- `student_profiles`: acrescentar `course_id` e `exam_option_id` (a combinação escolhida).
- `exam_rules`: `institution_id` (nulo = regra geral), `question_count`, `duration_minutes`, `integrated_duration_minutes`, `max_attempts` (2), `pausable` (falso), `help_enabled` (falso), `ai_enabled` (falso), `show_answers_after` (verdadeiro).
- `institutions`: `has_integrated_exam` (booleano).
- `exam_attempts_meta` (ou colunas em `attempts`): `exam_key`, `attempt_no` (1 normal, 2 recorrência), `integrated` (booleano), `seed` (para baralhar de forma repetível), `deadline_at`.
- `exam_calendar`: `institution_id`, `title`, `kind` (exame, inscrição, resultados), `starts_on`, `ends_on`, `source_url`, `academic_year`.
- `student_exam_agenda`: `user_id`, `title`, `starts_at`, `remind_before`, `calendar_id` (opcional).
- Regras puras (testáveis, em `lib/`): decidir tentativa permitida, baralhar com seed, calcular prazo, escolher o e-mail estratégico pelo resultado.
- Admin: páginas para `exam_rules`, `exam_calendar` e os campos novos de instituições.

## 7. E-mail e notificação do exame
- Notificação na plataforma (e push, se ligado) ao terminar.
- E-mail com duas variantes pelo resultado (limite configurável no admin): «precisa de melhorar» (temas mais fracos e botão para praticar esses temas) ou «parabéns» (próximo passo). Texto e limites editáveis, não escritos no código.

## 8. Seletores nativos a substituir
`components/onboarding/onboarding-flow.tsx` (dia, mês, ano de nascimento e instituição), `components/jonas-chat.tsx` (disciplina), `components/admin/material-bulk.tsx`, `app/admin/cursos/page.tsx` (instituição, período, disciplina, variante). Procurar também `alert(` e `confirm(`: no código atual não há.

## 9. Fases e estado
| Fase | O quê | Estado |
|---|---|---|
| 1 | Modal «Praticar agora?» no fim do onboarding; modal de instalar a app; notificações em modal (sem página de lembretes) | FEITO (falta teste no telemóvel) |
| 2 | Sem seletores nativos | PARCIAL: feito no onboarding, perfil e Simulador (botões e lista com procura). Falta: `jonas-chat`, filtros da Biblioteca e todo o admin (`SelectField`) |
| 3 | Curso e combinação no perfil e no onboarding; simulador só com as duas disciplinas; bloqueio «sem curso não se começa nada» (secção 2.1) | FEITO (migração 0031; falta teste). Falta aplicar o mesmo filtro aos modos Duelo e outros quando existirem |
| 4 | Exame: regras, aviso, sem pausa, sem ajuda, 2 tentativas, baralhar, UEM integrado | por fazer |
| 5 | Resultado do exame: notificação e e-mail estratégico | por fazer |
| 6 | Calendário de exames e agenda do aluno | por fazer |
| 7 | Teste vocacional e verificação de coerência na escolha do curso | por fazer (o teste já existe) |
| 8 | Admin: `exam_rules`, `exam_calendar`, instituição integrada | por fazer |

## 10. Perguntas em aberto
- **P1 (decidido).** A escolha de curso faz parte do onboarding de admissão e não se salta; a única saída é «Ainda não sei o curso», que deixa o teste vocacional à espera no painel.
- **P2.** O exame integrado: são dois exames numa só sessão de 3 horas (questões das duas disciplinas misturadas ou uma a seguir à outra)? Assumo uma a seguir à outra, com o tempo total partilhado.
- **P3.** Quando o aluno gasta as duas tentativas, vê só o histórico? Assumo que sim.
