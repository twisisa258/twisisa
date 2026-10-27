-- Cursos e provas de admissão (parte 1 de 2). A carga de dados da UEM 2026 está em 0015.
-- exam_papers: uma «prova» de uma instituição = disciplina + variante (Matemática-I, Matemática-II, Música prova prática...).
-- courses: cursos de cada instituição. course_exam_options: cada opção de exame que dá acesso ao curso, por período;
-- course_exam_option_papers: as provas dessa opção e o peso de cada uma (a soma por opção é 100, validada ao guardar).

CREATE TABLE IF NOT EXISTS "exam_papers" (
  "id" text PRIMARY KEY,
  "institution_id" text NOT NULL REFERENCES "institutions"("id") ON DELETE RESTRICT,
  "subject_id" text NOT NULL REFERENCES "library_subjects"("id") ON DELETE RESTRICT,
  "variant" text NOT NULL DEFAULT '' CHECK ("variant" IN ('', 'I', 'II', 'III', 'pratica', 'escrita')),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "exam_papers_unique" ON "exam_papers" ("institution_id", "subject_id", "variant");
CREATE INDEX IF NOT EXISTS "exam_papers_subject_idx" ON "exam_papers" ("subject_id");

CREATE TABLE IF NOT EXISTS "courses" (
  "id" text PRIMARY KEY,
  "institution_id" text NOT NULL REFERENCES "institutions"("id") ON DELETE RESTRICT,
  "name" text NOT NULL,
  "unit" text,
  "campus" text,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "courses_institution_name_unique" ON "courses" ("institution_id", lower("name"));

CREATE TABLE IF NOT EXISTS "course_exam_options" (
  "id" text PRIMARY KEY,
  "course_id" text NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "period" text NOT NULL CHECK ("period" IN ('laboral', 'pos_laboral')),
  "sort_order" integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "course_exam_options_course_idx" ON "course_exam_options" ("course_id");

CREATE TABLE IF NOT EXISTS "course_exam_option_papers" (
  "option_id" text NOT NULL REFERENCES "course_exam_options"("id") ON DELETE CASCADE,
  "paper_id" text NOT NULL REFERENCES "exam_papers"("id") ON DELETE RESTRICT,
  "weight" integer NOT NULL CHECK ("weight" BETWEEN 1 AND 100),
  PRIMARY KEY ("option_id", "paper_id")
);
CREATE INDEX IF NOT EXISTS "course_exam_option_papers_paper_idx" ON "course_exam_option_papers" ("paper_id");
