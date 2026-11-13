-- Admin v2.0: notificações do admin, área de revisão das questões e variantes da UEM.

-- 1. Notificações: tudo o que acontece no admin chega ao próprio admin.
CREATE TABLE IF NOT EXISTS admin_notifications (
  id text PRIMARY KEY,
  admin_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind text NOT NULL,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'sucesso', 'aviso', 'erro')),
  title text NOT NULL,
  body text,
  link text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_notifications_admin_idx ON admin_notifications (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_unread_idx ON admin_notifications (admin_id) WHERE read_at IS NULL;

-- 2. Revisão: cada questão guarda o que lhe falta (sem ano, sem tema, sem variante, possível duplicada).
ALTER TABLE questions ADD COLUMN IF NOT EXISTS review_reasons text[] NOT NULL DEFAULT '{}';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS review_note text;
CREATE INDEX IF NOT EXISTS questions_review_idx ON questions (status) WHERE cardinality(review_reasons) > 0;

CREATE OR REPLACE FUNCTION question_review_reasons(qid text) RETURNS text[] LANGUAGE sql STABLE AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN q.exam_year IS NULL THEN 'sem_ano' END,
    CASE WHEN q.topic_id IS NULL THEN 'sem_tema' END,
    CASE WHEN q.variant IS NULL
          AND EXISTS (SELECT 1 FROM institutions i WHERE i.id = q.institution_id AND i.has_variants)
          AND EXISTS (SELECT 1 FROM subject_variants v WHERE v.subject_id = q.subject_id AND v.active)
         THEN 'sem_variante' END,
    CASE WHEN EXISTS (
           SELECT 1 FROM questions o
           WHERE o.id <> q.id AND o.subject_id = q.subject_id AND o.status <> 'arquivada'
             AND lower(btrim(o.statement)) = lower(btrim(q.statement))
         ) THEN 'possivel_duplicada' END
  ], NULL)
  FROM questions q WHERE q.id = qid
$$;

UPDATE questions SET review_reasons = COALESCE(question_review_reasons(id), '{}');

-- 3. Variantes I, II e III da UEM: criadas a partir das provas do edital (só disciplinas gerais). A III é a mais fácil.
INSERT INTO subject_variants (id, subject_id, name, difficulty, sort_order)
SELECT 'variant-' || gen_random_uuid(), x.subject_id, x.variant,
  CASE x.variant WHEN 'III' THEN 'facil' ELSE 'media' END,
  CASE x.variant WHEN 'I' THEN 1 WHEN 'II' THEN 2 ELSE 3 END
FROM (
  SELECT DISTINCT p.subject_id, p.variant
  FROM exam_papers p
  JOIN institutions i ON i.id = p.institution_id
  JOIN library_subjects s ON s.id = p.subject_id
  WHERE i.has_variants AND s.core AND p.variant IN ('I', 'II', 'III')
) x
ON CONFLICT (subject_id, name) DO NOTHING;
