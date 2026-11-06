-- Importação de exames com o Jonas: acompanha cada documento da Biblioteca (onde vai a leitura) e a origem de cada questão importada.
CREATE TABLE IF NOT EXISTS material_imports (
  material_id    text PRIMARY KEY REFERENCES academic_materials(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'nova' CHECK (status IN ('nova', 'em_curso', 'concluida', 'erro')),
  next_number    integer NOT NULL DEFAULT 1 CHECK (next_number >= 1),
  detected       jsonb,
  extracted_text text,
  pages          integer,
  last_error     text,
  created_by     text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_sources (
  question_id text PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  material_id text NOT NULL REFERENCES academic_materials(id) ON DELETE CASCADE,
  number      integer NOT NULL,
  batch_id    text NOT NULL,
  confidence  text NOT NULL CHECK (confidence IN ('alta', 'media', 'baixa')),
  answer_from text NOT NULL CHECK (answer_from IN ('gabarito', 'resolvida')),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, number)
);
CREATE INDEX IF NOT EXISTS question_sources_batch_idx ON question_sources (material_id, batch_id);
