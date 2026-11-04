-- Motor de notificações push: registo do que já foi enviado (limites, intervalos, sem repetir) e definições editáveis.
CREATE TABLE IF NOT EXISTS push_log (
  id      text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind    text NOT NULL,
  ref     text NOT NULL DEFAULT '',
  title   text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_log_user_sent_idx ON push_log (user_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
