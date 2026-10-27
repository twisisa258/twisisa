-- Fase 1B (3/5 a 5/5): anos de exame e estado dos módulos da página Exames por percurso.
-- Categorias e níveis já existem (0004); temas em 0006.

CREATE TABLE IF NOT EXISTS "exam_years" (
  "year" integer PRIMARY KEY CHECK ("year" BETWEEN 1990 AND 2100),
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "exam_modules" (
  "module_key" text NOT NULL,
  "track" text NOT NULL CHECK ("track" IN ('10', '12', 'admissao')),
  "status" text NOT NULL DEFAULT 'hidden' CHECK ("status" IN ('active', 'soon', 'hidden')),
  "novelty_until" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("module_key", "track")
);

-- Tudo começa oculto: um módulo só aparece quando o admin o decide (e só fica "Ativo" quando funciona).
INSERT INTO "exam_modules" ("module_key", "track")
SELECT m.k, t.k
FROM (VALUES ('exames-anteriores'), ('pratica'), ('modo-rapido'), ('simulados'), ('revisar-erros'),
             ('estudo-tematico'), ('modo-duelo'), ('teste-vocacional'), ('historico')) AS m(k)
CROSS JOIN (VALUES ('10'), ('12'), ('admissao')) AS t(k)
ON CONFLICT DO NOTHING;
