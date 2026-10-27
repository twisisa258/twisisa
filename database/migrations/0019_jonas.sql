-- Jonas (explicador): histórico por conversa e explicações dentro do Simulador.
-- `kind = 'chat'`: conversa aberta pelo aluno na página do Jonas (aparece na barra lateral).
-- `kind = 'simulador'`: explicação de uma questão (uma por tentativa e posição); fica guardada como referência para o Jonas,
-- mas não aparece na lista de conversas.

CREATE TABLE IF NOT EXISTS jonas_conversations (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat', 'simulador')),
  title text NOT NULL DEFAULT 'Nova conversa' CHECK (char_length(title) BETWEEN 1 AND 120),
  subject_id text REFERENCES library_subjects(id) ON DELETE SET NULL,
  attempt_id text REFERENCES attempts(id) ON DELETE SET NULL,
  question_id text REFERENCES questions(id) ON DELETE SET NULL,
  item_position integer CHECK (item_position IS NULL OR item_position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jonas_conversations_user_idx ON jonas_conversations (user_id, kind, updated_at DESC);
-- Uma explicação por questão de cada tentativa e aluno.
CREATE UNIQUE INDEX IF NOT EXISTS jonas_conversations_item_unique ON jonas_conversations (user_id, attempt_id, item_position)
  WHERE kind = 'simulador' AND attempt_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS jonas_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES jonas_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jonas_messages_conversation_idx ON jonas_messages (conversation_id, id);
-- Travão técnico contra abuso (mensagens por minuto), não é uma quota de produto.
CREATE INDEX IF NOT EXISTS jonas_messages_recent_idx ON jonas_messages (created_at) WHERE role = 'user';
