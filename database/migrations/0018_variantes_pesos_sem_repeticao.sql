-- Lógica única do banco de questões (26/10/2026):
--   1) variantes passam a ser registos reais por disciplina (antes: texto livre em cada questão);
--   2) o que cada aluno já viu fica registado (para não repetir) em `student_question_stats`;
--   3) cada questão de uma sessão tem um peso (2 a 4) que alimenta os pontos e a nota de 0 a 20;
--   4) a prática pode ser feita por tema.

-- 1. Variantes (ex.: Matemática I, II, III). `difficulty` é a dificuldade da variante no exame (a III é a mais fácil).
CREATE TABLE IF NOT EXISTS subject_variants (
  id text PRIMARY KEY,
  subject_id text NOT NULL REFERENCES library_subjects(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  difficulty text NOT NULL DEFAULT 'media' CHECK (difficulty IN ('facil','media','dificil')),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, name)
);

-- As variantes que já existem escritas nas questões passam a registos (espaços nas pontas removidos).
UPDATE questions SET variant = NULLIF(btrim(variant), '') WHERE variant IS NOT NULL AND variant <> NULLIF(btrim(variant), '');
INSERT INTO subject_variants (id, subject_id, name, sort_order)
SELECT 'variant-' || gen_random_uuid(), x.subject_id, x.variant, (row_number() OVER (PARTITION BY x.subject_id ORDER BY x.variant))::int
FROM (SELECT DISTINCT subject_id, variant FROM questions WHERE variant IS NOT NULL) x
ON CONFLICT (subject_id, name) DO NOTHING;

-- A questão só pode ter uma variante que exista na sua disciplina; renomear a variante renomeia nas questões.
-- (MATCH SIMPLE: sem variante, não se verifica.)
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_variant_fk;
ALTER TABLE questions ADD CONSTRAINT questions_variant_fk FOREIGN KEY (subject_id, variant) REFERENCES subject_variants(subject_id, name) ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS questions_subject_variant_topic_idx ON questions(subject_id, variant, topic_id) WHERE status = 'publicada';

-- 2. O que cada aluno já viu. `times_shown` conta quando a questão entra numa sessão (é aí que fica «marcada»);
--    `last_result` só muda quando o aluno responde (right/wrong); NULL = nunca respondeu.
CREATE TABLE IF NOT EXISTS student_question_stats (
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  times_shown integer NOT NULL DEFAULT 0 CHECK (times_shown >= 0),
  times_correct integer NOT NULL DEFAULT 0 CHECK (times_correct >= 0),
  times_wrong integer NOT NULL DEFAULT 0 CHECK (times_wrong >= 0),
  last_result text CHECK (last_result IN ('right','wrong')),
  last_shown_at timestamptz,
  last_answered_at timestamptz,
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS student_question_stats_user_result_idx ON student_question_stats(user_id, last_result);

-- O histórico que já existe passa para a nova tabela (só sessões que não foram abandonadas sem resposta).
INSERT INTO student_question_stats (user_id, question_id, times_shown, times_correct, times_wrong, last_result, last_shown_at, last_answered_at)
SELECT a.user_id, i.question_id,
  count(*)::int,
  count(*) FILTER (WHERE i.is_correct)::int,
  count(*) FILTER (WHERE i.is_correct = false)::int,
  (array_agg(CASE WHEN i.is_correct THEN 'right' WHEN i.is_correct = false THEN 'wrong' END ORDER BY i.answered_at DESC NULLS LAST) FILTER (WHERE i.is_correct IS NOT NULL))[1],
  max(coalesce(i.answered_at, a.started_at)),
  max(i.answered_at)
FROM attempt_items i JOIN attempts a ON a.id = i.attempt_id
WHERE a.status <> 'abandonada' OR i.answered_at IS NOT NULL
GROUP BY a.user_id, i.question_id
ON CONFLICT (user_id, question_id) DO NOTHING;

-- 3. Peso de cada questão numa sessão (2 a 4, vezes o fator de repetição) e pontos com decimais.
ALTER TABLE attempt_items ADD COLUMN IF NOT EXISTS weight numeric(4,1) NOT NULL DEFAULT 1 CHECK (weight >= 0);
-- Os pontos antigos eram 10 por resposta certa (valor de teste): passam a 3, o valor médio da nova escala.
UPDATE attempt_items SET points = 3 WHERE points = 10;
ALTER TABLE attempt_items ALTER COLUMN points TYPE numeric(5,1) USING points::numeric;
ALTER TABLE attempt_items ALTER COLUMN points SET DEFAULT 0;

-- 4. Prática por tema.
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS topic_id text REFERENCES topics(id) ON DELETE SET NULL;
