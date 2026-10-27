-- Equipa (papéis) e convites por carta. O admin controla tudo a partir do painel; nenhum nome fica no código.
CREATE TABLE IF NOT EXISTS staff_roles (
  user_id text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('revisor')),
  granted_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_invites (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'revisor' CHECK (role IN ('revisor')),
  -- O link e o código nunca se guardam: só as impressões digitais (SHA-256 e HMAC).
  token_hash text NOT NULL UNIQUE,
  code_hash text NOT NULL,
  code_in_email boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aberta','concluido','revogado','bloqueado')),
  step text NOT NULL DEFAULT 'carta' CHECK (step IN ('carta','tarefa','conta','aguardar')),
  attempts integer NOT NULL DEFAULT 0,
  session_hash text,
  account_user_id text REFERENCES "user"("id") ON DELETE SET NULL,
  verification_sends integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  consumed_at timestamptz
);
-- Um convite ativo por e-mail.
CREATE UNIQUE INDEX IF NOT EXISTS staff_invites_one_active_per_email_idx ON staff_invites(email) WHERE status IN ('pendente','aberta','bloqueado');
CREATE INDEX IF NOT EXISTS staff_invites_created_idx ON staff_invites(created_at DESC);
