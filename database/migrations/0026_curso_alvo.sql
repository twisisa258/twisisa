-- Curso alvo do aluno (da lista de cursos da instituição). As disciplinas das provas vêm de course_exam_options.
-- O texto livre antigo (target_course) mantém-se só como cópia do nome, para o que já o lê.
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS target_course_id text REFERENCES courses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS student_profiles_target_course_idx ON student_profiles (target_course_id);
-- Os desafios agrupam as respostas por dia: ajuda a consulta por aluno e data.
CREATE INDEX IF NOT EXISTS attempt_items_answered_at_idx ON attempt_items (answered_at) WHERE answered_at IS NOT NULL;
