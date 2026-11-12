-- As 10 disciplinas gerais do Twisisa e a regra das variantes.
-- Nada se apaga: o que sai das regras fica arquivado (ativo = false) e pode voltar.

-- 1. Marcas novas.
ALTER TABLE library_subjects ADD COLUMN IF NOT EXISTS core boolean NOT NULL DEFAULT false;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false;

-- 2. As 10 disciplinas gerais existem (cria as que faltarem).
INSERT INTO library_subjects (id, name, slug, active, core)
SELECT 'subject-' || g.slug, g.name, g.slug, true, true
FROM (VALUES
  ('Matemática', 'matematica'), ('Física', 'fisica'), ('Química', 'quimica'), ('Biologia', 'biologia'),
  ('Português', 'portugues'), ('Inglês', 'ingles'), ('Francês', 'frances'), ('Filosofia', 'filosofia'),
  ('Geografia', 'geografia'), ('História', 'historia')
) AS g(name, slug)
WHERE NOT EXISTS (SELECT 1 FROM library_subjects s WHERE s.slug = g.slug OR lower(s.name) = lower(g.name));

UPDATE library_subjects s SET core = true, active = true
FROM (VALUES
  ('matematica'), ('fisica'), ('quimica'), ('biologia'), ('portugues'),
  ('ingles'), ('frances'), ('filosofia'), ('geografia'), ('historia')
) AS g(slug)
WHERE s.slug = g.slug;

-- 3. As outras (Música, Teatro, Desenho, Sociolinguístico, Aptidão Física, etc.) deixam de existir: ficam arquivadas.
UPDATE library_subjects SET active = false WHERE core = false AND active = true;

-- 4. As 10 existem em todas as classes e em todas as instituições.
INSERT INTO subject_scopes (id, subject_id, track)
SELECT 'scope-core-' || s.slug || '-' || t.track, s.id, t.track
FROM library_subjects s CROSS JOIN (VALUES ('10'), ('12')) AS t(track)
WHERE s.core AND NOT EXISTS (SELECT 1 FROM subject_scopes c WHERE c.subject_id = s.id AND c.track = t.track);

INSERT INTO subject_scopes (id, subject_id, institution_id)
SELECT 'scope-core-' || s.slug || '-' || i.id, s.id, i.id
FROM library_subjects s CROSS JOIN institutions i
WHERE s.core AND NOT EXISTS (SELECT 1 FROM subject_scopes c WHERE c.subject_id = s.id AND c.institution_id = i.id);

-- 5. Variantes (I, II, III) só na UEM.
UPDATE institutions SET has_variants = true WHERE upper(short_name) = 'UEM';
UPDATE institutions SET has_variants = false WHERE upper(short_name) <> 'UEM';

-- 6. Curso sem nenhuma combinação feita só das 10 disciplinas gerais (provas escritas) deixa de existir: fica arquivado.
UPDATE courses c SET active = false, updated_at = now()
WHERE c.active = true AND NOT EXISTS (
  SELECT 1 FROM course_exam_options o
  WHERE o.course_id = c.id
    AND EXISTS (SELECT 1 FROM course_exam_option_papers op WHERE op.option_id = o.id)
    AND NOT EXISTS (
      SELECT 1 FROM course_exam_option_papers op
      JOIN exam_papers p ON p.id = op.paper_id
      JOIN library_subjects s ON s.id = p.subject_id
      WHERE op.option_id = o.id AND (s.core = false OR p.variant IN ('pratica', 'escrita'))
    )
);
