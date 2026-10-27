-- Fase 1 (parte A): percurso do aluno, instituições completas, @nickname único e registo de acções do admin.

-- Instituições: tipo, localização, ordem e visibilidade sem conteúdo.
ALTER TABLE "institutions"
  ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'universidade',
  ADD COLUMN IF NOT EXISTS "city" text,
  ADD COLUMN IF NOT EXISTS "province" text,
  ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "show_when_empty" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'institutions_kind_check') THEN
    ALTER TABLE "institutions" ADD CONSTRAINT "institutions_kind_check" CHECK ("kind" IN ('universidade', 'instituto', 'academia'));
  END IF;
END $$;

-- Perfil: percurso (10ª classe, 12ª classe ou admissão ao ensino superior).
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "track" text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_track_check') THEN
    ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_track_check" CHECK ("track" IS NULL OR "track" IN ('10', '12', 'admissao'));
  END IF;
END $$;

-- @nickname único (sem distinguir maiúsculas). Antes de criar o índice, limpa vazios e repetidos:
-- se dois alunos tinham o mesmo @nickname, fica com ele o mais antigo; os outros ficam sem @nickname e escolhem outro.
UPDATE "student_profiles" SET "nickname" = NULL WHERE "nickname" IS NOT NULL AND btrim("nickname") = '';
UPDATE "student_profiles" p SET "nickname" = NULL
WHERE p."nickname" IS NOT NULL AND EXISTS (
  SELECT 1 FROM "student_profiles" q
  WHERE lower(q."nickname") = lower(p."nickname")
    AND (q."created_at" < p."created_at" OR (q."created_at" = p."created_at" AND q."user_id" < p."user_id"))
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_profiles_nickname_unique" ON "student_profiles" (lower("nickname")) WHERE "nickname" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "student_profiles_institution_idx" ON "student_profiles" ("institution_id");

-- Registo das acções sensíveis do admin (eliminar, ocultar, alterar regras).
CREATE TABLE IF NOT EXISTS "admin_audit_log" (
  "id" text PRIMARY KEY,
  "admin_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "admin_email" text,
  "action" text NOT NULL,
  "entity" text NOT NULL,
  "entity_id" text,
  "detail" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "admin_audit_log_created_idx" ON "admin_audit_log" ("created_at" DESC);
