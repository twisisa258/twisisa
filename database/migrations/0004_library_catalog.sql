-- Twisisa: catálogo académico, submissões, favoritos e registo de downloads.
CREATE TABLE IF NOT EXISTS library_categories (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_subjects (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_levels (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS academic_materials (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  file_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  file_size_bytes integer,
  category_id text NOT NULL REFERENCES library_categories(id) ON DELETE RESTRICT,
  subject_id text REFERENCES library_subjects(id) ON DELETE SET NULL,
  level_id text REFERENCES library_levels(id) ON DELETE SET NULL,
  institution_name text,
  course_name text,
  academic_year integer,
  author_id text REFERENCES "user"(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','pending','approved','rejected','archived')),
  reviewed_by text REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  download_count integer NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS library_favorites (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  material_id text NOT NULL REFERENCES academic_materials(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, material_id)
);

CREATE TABLE IF NOT EXISTS library_downloads (
  id text PRIMARY KEY,
  user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  material_id text NOT NULL REFERENCES academic_materials(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_reports (
  id text PRIMARY KEY,
  material_id text NOT NULL REFERENCES academic_materials(id) ON DELETE CASCADE,
  reporter_id text REFERENCES "user"(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  reviewed_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS academic_materials_catalog_idx ON academic_materials(status, published_at DESC);
CREATE INDEX IF NOT EXISTS academic_materials_category_idx ON academic_materials(category_id, status);
CREATE INDEX IF NOT EXISTS academic_materials_subject_idx ON academic_materials(subject_id, status);
CREATE INDEX IF NOT EXISTS academic_materials_level_idx ON academic_materials(level_id, status);
CREATE INDEX IF NOT EXISTS academic_materials_search_idx ON academic_materials USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(institution_name,'') || ' ' || coalesce(course_name,'')));
CREATE INDEX IF NOT EXISTS library_downloads_material_idx ON library_downloads(material_id, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS library_reports_status_idx ON library_reports(status, created_at DESC);

INSERT INTO library_categories (id, name, slug, sort_order) VALUES
  ('cat-exames', 'Exames anteriores', 'exames', 1),
  ('cat-apontamentos', 'Apontamentos', 'apontamentos', 2),
  ('cat-resumos', 'Resumos', 'resumos', 3),
  ('cat-fichas', 'Fichas de exercícios', 'fichas', 4),
  ('cat-guias', 'Guias de estudo', 'guias', 5),
  ('cat-livros', 'Livros e manuais', 'livros', 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO library_levels (id, name, slug, sort_order) VALUES
  ('level-7', '7.ª classe', '7-classe', 7),
  ('level-8', '8.ª classe', '8-classe', 8),
  ('level-9', '9.ª classe', '9-classe', 9),
  ('level-10', '10.ª classe', '10-classe', 10),
  ('level-11', '11.ª classe', '11-classe', 11),
  ('level-12', '12.ª classe', '12-classe', 12),
  ('level-universidade', 'Universidade', 'universidade', 13),
  ('level-admissao', 'Exames de admissão', 'admissao', 14)
ON CONFLICT (slug) DO NOTHING;

