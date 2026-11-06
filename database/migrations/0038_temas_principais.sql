-- Os 10 temas principais de cada disciplina, por instituição. Alimentam as páginas públicas /exames (Google) e o PDF de estudo.
-- Escrita: /admin/temas-principais (com ajuda do Jonas). Leitura pública: só o que estiver «publicado».
CREATE TABLE IF NOT EXISTS key_topics (
  id             text PRIMARY KEY,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  subject_id     text NOT NULL REFERENCES library_subjects(id) ON DELETE CASCADE,
  position       smallint NOT NULL CHECK (position BETWEEN 1 AND 10),
  title          text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  summary        text NOT NULL CHECK (char_length(summary) BETWEEN 20 AND 2500),
  tips           text CHECK (tips IS NULL OR char_length(tips) <= 600),
  status         text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
  origin         text NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'jonas')),
  updated_by     text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, subject_id, position)
);
CREATE INDEX IF NOT EXISTS key_topics_public_idx ON key_topics (institution_id, subject_id, status);
