-- Identidade, onboarding e actividade (docs/IDENTIDADE-ONBOARDING-RETENCAO.md, fases A a D).

-- ───────────── Fase A: limite de pedidos em base de dados (better-auth) ─────────────
-- O armazenamento em memória não serve em serverless: cada instância da Vercel teria o seu contador.
CREATE TABLE IF NOT EXISTS "rateLimit" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL,
  "count" integer NOT NULL,
  "lastRequest" bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "rateLimit_key_idx" ON "rateLimit" ("key");

-- ───────────── Fase A: chaves estrangeiras com CASCADE ─────────────
-- Apagar um utilizador deixava dados órfãos nestas tabelas. Primeiro limpam-se os órfãos que já existem.
DELETE FROM student_profiles WHERE user_id NOT IN (SELECT id FROM "user");
DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM "user");
DELETE FROM quiz_attempts WHERE user_id NOT IN (SELECT id FROM "user");
DELETE FROM posts WHERE user_id NOT IN (SELECT id FROM "user");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_user_fk') THEN
    ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_user_fk FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_fk') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_attempts_user_fk') THEN
    ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_user_fk FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_user_fk') THEN
    ALTER TABLE posts ADD CONSTRAINT posts_user_fk FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
END $$;
-- `follows` e `post_likes` ficam de fora: a Comunidade está fora do plano e `follows` ainda guarda ids que não são utilizadores (State.md).

-- ───────────── Fase B: perfil (data de nascimento, meta diária, fim do onboarding) ─────────────
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS daily_goal integer;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_daily_goal_check') THEN
    ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_daily_goal_check CHECK (daily_goal IS NULL OR daily_goal IN (5, 10, 20));
  END IF;
END $$;

-- Aceitação dos Termos e da Privacidade: uma linha por aceitação, com a versão. Prova o quê e quando.
CREATE TABLE IF NOT EXISTS account_consents (
  id          bigserial PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('terms', 'privacy')),
  version     text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip          text
);
CREATE INDEX IF NOT EXISTS account_consents_user_idx ON account_consents (user_id, kind, accepted_at DESC);

-- Preferências de lembretes. Só existe linha depois de o estudante escolher (ecrã 3 do onboarding).
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id           text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  email_enabled     boolean NOT NULL DEFAULT false,
  push_enabled      boolean NOT NULL DEFAULT false,
  categories        jsonb NOT NULL DEFAULT '{}'::jsonb,
  unsubscribe_token text NOT NULL UNIQUE,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ───────────── Fase D: dias de estudo ─────────────
-- Uma linha por estudante e dia civil de Maputo. Sequência, «hoje» e «esta semana» calculam-se daqui.
CREATE TABLE IF NOT EXISTS study_days (
  user_id         text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  day             date NOT NULL,
  questions       integer NOT NULL DEFAULT 0,
  materials       integer NOT NULL DEFAULT 0,
  jonas_messages  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
