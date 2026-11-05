-- Anúncios do Twisisa: cartões que a equipa publica para os estudantes (novidades, eventos, avisos).
-- Escrita: /admin/anuncios (só administração). Leitura: painel do aluno (/aluno), por percurso e dentro das datas.
CREATE TABLE IF NOT EXISTS announcements (
  id         text PRIMARY KEY,
  title      text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  body       text CHECK (body IS NULL OR char_length(body) <= 220),
  tone       text NOT NULL DEFAULT 'info' CHECK (tone IN ('novidade', 'info', 'evento', 'aviso')),
  featured   boolean NOT NULL DEFAULT false,
  cta_label  text CHECK (cta_label IS NULL OR char_length(cta_label) <= 24),
  cta_href   text CHECK (cta_href IS NULL OR cta_href ~ '^(/[^/]|https://)'),
  track      text CHECK (track IS NULL OR track IN ('10', '12', 'admissao')),
  starts_at  timestamptz NOT NULL DEFAULT now(),
  ends_at    timestamptz,
  active     boolean NOT NULL DEFAULT true,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS announcements_live_idx ON announcements (active, starts_at, ends_at);
