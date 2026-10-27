-- Fase 1B (2/5): âmbito das disciplinas (classe ou instituição) e tabela de temas.
-- As disciplinas são as de library_subjects (as que os materiais já usam).

CREATE TABLE IF NOT EXISTS "subject_scopes" (
  "id" text PRIMARY KEY,
  "subject_id" text NOT NULL REFERENCES "library_subjects"("id") ON DELETE CASCADE,
  "track" text CHECK ("track" IN ('10', '12')),
  "institution_id" text REFERENCES "institutions"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "subject_scopes_one_target" CHECK (("track" IS NOT NULL) <> ("institution_id" IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS "subject_scopes_track_unique" ON "subject_scopes" ("subject_id", "track") WHERE "track" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "subject_scopes_institution_unique" ON "subject_scopes" ("subject_id", "institution_id") WHERE "institution_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "subject_scopes_institution_idx" ON "subject_scopes" ("institution_id");

CREATE TABLE IF NOT EXISTS "topics" (
  "id" text PRIMARY KEY,
  "subject_id" text NOT NULL REFERENCES "library_subjects"("id") ON DELETE RESTRICT,
  "name" text NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "topics_subject_name_unique" ON "topics" ("subject_id", lower("name"));
