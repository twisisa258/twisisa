-- Kit de ferramentas do Simulador, «Estudar depois», reportes de questões, ligação tema-material e fila de lembretes.
-- Regra do projecto: cada tabela nova tem quem escreva e quem leia (ver State.md, secção «Tabelas»).

-- «Estudar depois»: escrita pelo Kit e pelo resultado do Simulador; lida em /aluno/estudar-depois, no Plano de hoje e nos lembretes.
CREATE TABLE IF NOT EXISTS study_marks (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  remind_on   date,
  done_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS study_marks_user_open_idx ON study_marks (user_id, remind_on) WHERE done_at IS NULL;

-- Dicas pedidas (nível 1 a 3) e o texto dado (nível 3: o id da opção eliminada). Escrita pelo Kit; lida ao recarregar a sessão e pelo motor de pontos (cada dica custa 25 % dos pontos).
CREATE TABLE IF NOT EXISTS hint_events (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  attempt_id  text NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  position    integer NOT NULL CHECK (position >= 0),
  level       smallint NOT NULL CHECK (level BETWEEN 1 AND 3),
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, position, level)
);
CREATE INDEX IF NOT EXISTS hint_events_user_idx ON hint_events (user_id, created_at DESC);

-- Reportes de questões (enunciado errado, figura ilegível...). Escrita pelo Kit; lida em /admin/reportes.
CREATE TABLE IF NOT EXISTS question_reports (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  reason      text NOT NULL CHECK (reason IN ('enunciado','resposta','figura','outro')),
  note        text CHECK (note IS NULL OR char_length(note) <= 500),
  status      text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','resolvido')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS question_reports_status_idx ON question_reports (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS question_reports_one_open_idx ON question_reports (user_id, question_id) WHERE status = 'aberto';

-- «Questão parecida» gerada por IA: o servidor guarda a resposta certa e só a revela depois de o aluno responder.
-- Escrita e lida pelo Kit; as linhas com mais de 7 dias são apagadas pelo cron de lembretes.
CREATE TABLE IF NOT EXISTS ai_practice (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  payload     jsonb NOT NULL,
  chosen      smallint,
  created_at  timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_practice_user_idx ON ai_practice (user_id, created_at DESC);

-- Hora preferida para estudar (escolhida no onboarding) e fila de envio de lembretes.
ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS study_hour smallint CHECK (study_hour IS NULL OR study_hour BETWEEN 0 AND 23);
ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS last_sent_on date;

-- Notificações criadas por regras (cron) não se repetem no mesmo dia.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_idx ON notifications (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Fila de e-mails: escrita pelo cron de lembretes, lida e esvaziada pelo mesmo cron (tentativas e erro ficam registados).
CREATE TABLE IF NOT EXISTS notification_outbox (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  channel     text NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  subject     text NOT NULL,
  body        text NOT NULL,
  href        text,
  dedupe_key  text NOT NULL,
  status      text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviada','falhou','cancelada')),
  attempts    integer NOT NULL DEFAULT 0,
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx ON notification_outbox (status, created_at) WHERE status = 'pendente';
