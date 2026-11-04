# Notificações push (motor de 30 em 30 minutos)

Pedido do dono do produto: notificar com variedade e de forma útil, e lembrar quem começou e não continuou.

## Como funciona
- Um agendador chama `GET /api/cron/lembretes` de 30 em 30 minutos (com `Authorization: Bearer CRON_SECRET`).
- A rota corre, por esta ordem: limpeza das questões da IA, e-mails de lembrete (uma vez por dia), fila de e-mails e o **motor push** (`lib/push-motor.ts`).
- Para cada aluno que permitiu notificações, o motor junta o contexto e `pickPush` (`lib/push-regras.ts`, puro e testado) escolhe **no máximo uma mensagem**, ou nenhuma. Nem todo o ciclo de 30 minutos envia: só envia quando há motivo.
- O que foi enviado fica em `push_log` (guarda 14 dias) para respeitar limites e não repetir.

## Tipos de mensagem (por prioridade)
| Tipo | Quando | Exemplo |
|---|---|---|
| `desafio-prazo` | Meta de hoje por cumprir; um aviso por patamar de horas (por defeito faltam 8, 4 e 3 horas) | «Faltam 4 horas para fechar o teu desafio diário. Faltam 6 questões para não perderes a tua sequência de 5 dias.» |
| `retomar` | Prática a meio (já respondeu, não acabou) parada há 2 horas ou mais; uma vez por prática | «Deixaste uma prática a meio. Respondeste a 4 de 10. Faltam só 6.» |
| `materia-nova` | Material aprovado nos últimos 3 dias, nas disciplinas das provas do aluno | «Nova matéria no teu curso. Limites · Matemática já está na Biblioteca.» |
| `questoes-quentes` | Erros por rever e questões guardadas para hoje (máx. 10) | «10 questões quentes à tua espera» |
| `voltar` | Há 3 dias ou mais sem praticar | «Já não praticas há 5 dias» |
| `escolher-curso` | Candidato sem curso escolhido; só esta mensagem, uma vez por dia | «Escolhe o teu curso» |

## Limites (para ninguém desligar as notificações)
Por defeito: intervalo mínimo de 30 minutos entre mensagens, no máximo 6 por dia, silêncio das 22h às 7h (hora de Maputo), e cooldown por tipo (retomar 12 h, matéria nova 6 h, questões quentes 8 h, voltar 72 h, escolher curso 24 h).
Tudo isto se muda na tabela `app_settings`, chave `push`, sem mexer no código. Exemplo:

```sql
INSERT INTO app_settings (key, value) VALUES ('push', '{"minGapMinutes": 60, "maxPerDay": 4, "deadlineTiers": [2, 6]}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
```
Chaves: `minGapMinutes`, `maxPerDay`, `quietFromHour`, `quietToHour`, `deadlineTiers`, `resumeAfterMinutes`, `comebackAfterDays`, `cooldownHours` (um número por tipo). Valores inválidos são ignorados. Falta uma página de admin para editar isto (por fazer).

## Agendador de 30 em 30 minutos
A Vercel no plano gratuito só corre crons uma vez por dia (`vercel.json`, usado para o e-mail). Para os 30 minutos, o repositório traz `.github/workflows/push-cron.yml`:
1. No GitHub: Settings > Secrets and variables > Actions > New repository secret.
2. `SITE_URL` = endereço do site, sem barra no fim. `CRON_SECRET` = o mesmo valor da variável na Vercel.
3. O GitHub só corre agendamentos a partir da branch `main`. Em Actions pode-se chamar «Run workflow» à mão para testar.
Alternativas: plano Pro da Vercel com `*/30 * * * *`, ou um agendador externo (cron-job.org) com o cabeçalho `Authorization`.

## Texto das mensagens
Está em `lib/push-regras.ts` (por fazer: passar para o admin, como o resto do conteúdo).
