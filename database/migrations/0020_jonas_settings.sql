-- Jonas: definições controladas pelo admin (uma única linha).
-- `models` vazio = «automático»: usa GROQ_MODEL (se existir no servidor) ou a lista predefinida.
-- A chave da Groq NÃO se guarda aqui: fica só na variável GROQ_API_KEY do servidor.

CREATE TABLE IF NOT EXISTS jonas_settings (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  enabled boolean NOT NULL DEFAULT true,
  models text[] NOT NULL DEFAULT '{}',
  reasoning_effort text NOT NULL DEFAULT 'low' CHECK (reasoning_effort IN ('low', 'medium', 'high')),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO jonas_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;
