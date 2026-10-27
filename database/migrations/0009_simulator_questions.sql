-- Banco de questões do Simulador (Fase 3). Questões publicadas não são eliminadas.
CREATE TABLE IF NOT EXISTS question_media (
  id text PRIMARY KEY,
  url text NOT NULL,
  alt_text text NOT NULL CHECK (length(btrim(alt_text)) > 0),
  caption text,
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 1048576),
  created_by text REFERENCES "user"("id") ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  previous_version_id text REFERENCES questions(id) ON DELETE RESTRICT,
  statement text NOT NULL,
  explanation text,
  track text CHECK (track IN ('10','12','admissao')),
  institution_id text REFERENCES institutions(id) ON DELETE RESTRICT,
  subject_id text NOT NULL REFERENCES library_subjects(id) ON DELETE RESTRICT,
  topic_id text REFERENCES topics(id) ON DELETE RESTRICT,
  difficulty text NOT NULL DEFAULT 'media' CHECK (difficulty IN ('facil','media','dificil')),
  exam_year integer CHECK (exam_year IS NULL OR exam_year BETWEEN 1990 AND 2100),
  origin_label text,
  origin text NOT NULL DEFAULT 'admin' CHECK (origin IN ('real','ia','admin')),
  answer_source text NOT NULL DEFAULT 'sugestao' CHECK (answer_source IN ('oficial','confirmada','sugestao')),
  answer_confirmed_by text REFERENCES "user"("id") ON DELETE SET NULL,
  answer_confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicada','arquivada')),
  created_by text REFERENCES "user"("id") ON DELETE SET NULL,
  updated_by text REFERENCES "user"("id") ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((track = 'admissao' AND institution_id IS NOT NULL) OR (track IN ('10','12') AND institution_id IS NULL) OR (track IS NULL AND institution_id IS NULL))
);
CREATE INDEX IF NOT EXISTS questions_status_subject_idx ON questions(status, subject_id);
CREATE INDEX IF NOT EXISTS questions_track_status_idx ON questions(track, status);
CREATE INDEX IF NOT EXISTS questions_institution_status_idx ON questions(institution_id, status);

CREATE TABLE IF NOT EXISTS question_options (
  id text PRIMARY KEY,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position BETWEEN 0 AND 4),
  body text,
  media_id text REFERENCES question_media(id) ON DELETE RESTRICT,
  is_correct boolean NOT NULL DEFAULT false,
  is_fixed boolean NOT NULL DEFAULT false,
  UNIQUE(question_id, position),
  CHECK (nullif(btrim(coalesce(body, '')), '') IS NOT NULL OR media_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS question_options_question_idx ON question_options(question_id, position);

CREATE TABLE IF NOT EXISTS question_media_links (
  question_id text NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  media_id text NOT NULL REFERENCES question_media(id) ON DELETE RESTRICT,
  usage text NOT NULL CHECK (usage IN ('statement','explanation')),
  position integer NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 3),
  PRIMARY KEY(question_id, media_id, usage)
);

-- O catálogo de módulos já não inclui Exames anteriores; esses ficheiros vivem na Biblioteca.
DELETE FROM exam_modules WHERE module_key = 'exames-anteriores';
