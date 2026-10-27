-- Motor de tentativas do Simulador (Fase 4): Prática, Modo rápido e Revisar erros.
-- A correção vive no servidor: `is_correct` só é preenchido quando a regra do modo o permite.
CREATE TABLE IF NOT EXISTS attempts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('pratica','rapido','revisao')),
  subject_id text REFERENCES library_subjects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'em_curso' CHECK (status IN ('em_curso','concluida','expirada','abandonada')),
  total integer NOT NULL CHECK (total > 0),
  correct integer NOT NULL DEFAULT 0 CHECK (correct >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS attempts_user_started_idx ON attempts(user_id, started_at DESC);
-- Uma sessão em curso por modo e aluno: recarregar volta ao mesmo ponto.
CREATE UNIQUE INDEX IF NOT EXISTS attempts_one_open_per_mode_idx ON attempts(user_id, mode) WHERE status = 'em_curso';

CREATE TABLE IF NOT EXISTS attempt_items (
  attempt_id text NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  question_id text NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  -- Ordem das opções usada nesta tentativa (embaralhada no servidor; opções «fixas» ficam no sítio).
  option_order text[] NOT NULL,
  answer_option_id text REFERENCES question_options(id) ON DELETE RESTRICT,
  is_correct boolean,
  answered_at timestamptz,
  PRIMARY KEY (attempt_id, position)
);
CREATE INDEX IF NOT EXISTS attempt_items_question_idx ON attempt_items(question_id);

-- Os módulos que já funcionam passam a «Ativo» (antes ficavam ocultos ou «Em breve» por não haver nada por trás).
-- Simulados, Estudo temático, Duelo e Teste vocacional não mudam.
INSERT INTO exam_modules (module_key, track, status)
SELECT m.k, t.k, 'active'
FROM (VALUES ('pratica'), ('modo-rapido'), ('revisar-erros'), ('historico')) AS m(k)
CROSS JOIN (VALUES ('10'), ('12'), ('admissao')) AS t(k)
ON CONFLICT (module_key, track) DO UPDATE SET status = 'active', updated_at = now() WHERE exam_modules.status <> 'active';
