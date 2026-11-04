-- Cursos à distância (EaD) também têm exame de admissão; e cada opção passa a poder guardar as vagas do edital.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'course_exam_options'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%period%'
  LOOP
    EXECUTE format('ALTER TABLE course_exam_options DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE course_exam_options ADD CONSTRAINT course_exam_options_period_check CHECK (period IN ('laboral', 'pos_laboral', 'ead'));
ALTER TABLE course_exam_options ADD COLUMN IF NOT EXISTS vacancies integer CHECK (vacancies IS NULL OR vacancies >= 0);
