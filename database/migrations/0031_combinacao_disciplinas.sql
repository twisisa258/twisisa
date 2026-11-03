-- Combinação de provas escolhida pelo aluno (uma opção de exame do curso). Define as duas disciplinas que o Simulador mostra.
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS target_option_id text REFERENCES course_exam_options(id) ON DELETE SET NULL;
