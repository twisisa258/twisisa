-- Blog do Twisisa: artigos de estudo escritos pela administração (Markdown).
-- Escrita: /admin/blog (só administração). Leitura pública: só o que tem status = 'published' e published_at <= now().
CREATE TABLE IF NOT EXISTS blog_posts (
  id              text PRIMARY KEY,
  slug            text NOT NULL,
  title           text NOT NULL,
  excerpt         text NOT NULL DEFAULT '',
  body            text NOT NULL DEFAULT '',
  cover_url       text,
  cover_alt       text,
  status          text NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  author_id       text REFERENCES "user"(id) ON DELETE SET NULL,
  reading_minutes integer NOT NULL DEFAULT 1,
  track           text,
  subject_id      text REFERENCES library_subjects(id) ON DELETE SET NULL,
  theme_id        text REFERENCES topics(id) ON DELETE SET NULL,
  tags            text[] NOT NULL DEFAULT '{}',
  CONSTRAINT blog_posts_slug_unique UNIQUE (slug),
  CONSTRAINT blog_posts_slug_format CHECK (char_length(slug) BETWEEN 3 AND 90 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT blog_posts_title_len CHECK (char_length(title) BETWEEN 5 AND 120),
  CONSTRAINT blog_posts_excerpt_len CHECK (char_length(excerpt) <= 160),
  CONSTRAINT blog_posts_body_len CHECK (char_length(body) <= 100000),
  CONSTRAINT blog_posts_status CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT blog_posts_track CHECK (track IS NULL OR track IN ('10', '12', 'admissao')),
  CONSTRAINT blog_posts_reading CHECK (reading_minutes BETWEEN 1 AND 240),
  CONSTRAINT blog_posts_cover_url CHECK (cover_url IS NULL OR (cover_url ~ '^https://' AND char_length(cover_url) <= 500)),
  CONSTRAINT blog_posts_cover_alt CHECK (cover_alt IS NULL OR char_length(cover_alt) <= 160),
  CONSTRAINT blog_posts_cover_needs_alt CHECK (cover_url IS NULL OR char_length(btrim(coalesce(cover_alt, ''))) > 0),
  CONSTRAINT blog_posts_tags_len CHECK (cardinality(tags) <= 8),
  CONSTRAINT blog_posts_theme_needs_subject CHECK (theme_id IS NULL OR subject_id IS NOT NULL),
  CONSTRAINT blog_posts_published_complete CHECK (
    status <> 'published' OR (published_at IS NOT NULL AND char_length(btrim(excerpt)) > 0 AND char_length(btrim(body)) > 0)
  )
);
CREATE INDEX IF NOT EXISTS blog_posts_status_published_idx ON blog_posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_subject_idx ON blog_posts (subject_id);
CREATE INDEX IF NOT EXISTS blog_posts_track_idx ON blog_posts (track);

-- Versão anterior de cada gravação (o código guarda as últimas 20 por artigo).
CREATE TABLE IF NOT EXISTS blog_post_revisions (
  id       bigserial PRIMARY KEY,
  post_id  text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  title    text NOT NULL,
  body     text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  saved_by text REFERENCES "user"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS blog_post_revisions_post_idx ON blog_post_revisions (post_id, saved_at DESC);
