-- Biblioteca por secções: histórico de pesquisas do aluno e índices para catálogos grandes
-- (centenas de exames por instituição). Só cria o que falta; pode correr mais de uma vez.
CREATE TABLE IF NOT EXISTS library_searches (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  term text NOT NULL,
  search_count integer NOT NULL DEFAULT 1 CHECK (search_count >= 1),
  last_searched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, term)
);

CREATE INDEX IF NOT EXISTS library_searches_user_idx ON library_searches(user_id, last_searched_at DESC);
CREATE INDEX IF NOT EXISTS library_searches_term_idx ON library_searches(term);

-- Filtros da lista (instituição, disciplina, ano) e ordenação por popularidade, só para materiais aprovados.
CREATE INDEX IF NOT EXISTS academic_materials_filter_idx
  ON academic_materials(category_id, institution_name, subject_id, academic_year)
  WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS academic_materials_popular_idx
  ON academic_materials(download_count DESC)
  WHERE status = 'approved' AND download_count > 0;
