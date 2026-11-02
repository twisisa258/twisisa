-- Pagamentos locais: prepara o registo de um pagamento local na subscrição.
-- As colunas do Stripe ficam por agora (o código novo já não as usa); saem em database/opcional/0030_remover_colunas_stripe.sql.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "reference" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "current_period_end" timestamp;

-- Web push: um registo por aparelho do aluno.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  user_agent text,
  created_at timestamp NOT NULL DEFAULT now(),
  last_ok_at timestamp,
  failures   smallint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);
