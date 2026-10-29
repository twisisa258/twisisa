-- Orientação de curso («Descobre o teu curso»). Modelo RIASEC (Holland): R prático, I investigação, A criatividade,
-- S ajudar pessoas, E liderar, C organização.
-- orientation_questions: perguntas (cada uma pertence a uma dimensão; o aluno nunca vê a dimensão).
-- orientation_course_profiles: o que cada curso pede, de 0 a 5 por dimensão. RASCUNHO: `reviewed = false` até um orientador/docente rever.
-- orientation_attempts / orientation_answers: o teste de cada aluno. O resultado fica guardado (instantâneo) na tentativa concluída.
-- Os dados pessoais do aluno não saem do Twisisa: nada é enviado a terceiros. Apagar a conta apaga as tentativas e respostas (ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS orientation_questions (
  id text PRIMARY KEY,
  position integer NOT NULL UNIQUE,
  dimension text NOT NULL CHECK (dimension IN ('R', 'I', 'A', 'S', 'E', 'C')),
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS orientation_course_profiles (
  course_id text PRIMARY KEY REFERENCES courses(id) ON DELETE CASCADE,
  r smallint NOT NULL DEFAULT 0 CHECK (r BETWEEN 0 AND 5),
  i smallint NOT NULL DEFAULT 0 CHECK (i BETWEEN 0 AND 5),
  a smallint NOT NULL DEFAULT 0 CHECK (a BETWEEN 0 AND 5),
  s smallint NOT NULL DEFAULT 0 CHECK (s BETWEEN 0 AND 5),
  e smallint NOT NULL DEFAULT 0 CHECK (e BETWEEN 0 AND 5),
  c smallint NOT NULL DEFAULT 0 CHECK (c BETWEEN 0 AND 5),
  reviewed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (r + i + a + s + e + c > 0)
);

CREATE TABLE IF NOT EXISTS orientation_attempts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'em_curso' CHECK (status IN ('em_curso', 'concluido')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  result jsonb
);
CREATE INDEX IF NOT EXISTS orientation_attempts_user_idx ON orientation_attempts(user_id, started_at DESC);
-- Um teste em curso por aluno: recarregar volta ao mesmo ponto.
CREATE UNIQUE INDEX IF NOT EXISTS orientation_attempts_one_open_idx ON orientation_attempts(user_id) WHERE status = 'em_curso';

CREATE TABLE IF NOT EXISTS orientation_answers (
  attempt_id text NOT NULL REFERENCES orientation_attempts(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES orientation_questions(id) ON DELETE RESTRICT,
  value smallint NOT NULL CHECK (value BETWEEN 0 AND 2),
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id)
);

-- Perguntas (30: 5 por dimensão, intercaladas). Só cria o que ainda não existe.
INSERT INTO orientation_questions (id, position, dimension, body) VALUES
  ('oq-01', 1, 'R', 'Reparar um aparelho avariado ou montar coisas com as mãos.'),
  ('oq-02', 2, 'I', 'Fazer experiências para descobrir como as coisas funcionam.'),
  ('oq-03', 3, 'A', 'Desenhar, pintar ou criar coisas novas.'),
  ('oq-04', 4, 'S', 'Ajudar pessoas com os seus problemas.'),
  ('oq-05', 5, 'E', 'Liderar um grupo para atingir um objectivo.'),
  ('oq-06', 6, 'C', 'Organizar documentos, ficheiros ou listas com cuidado.'),
  ('oq-07', 7, 'R', 'Trabalhar ao ar livre, a cuidar de plantas ou animais.'),
  ('oq-08', 8, 'I', 'Resolver problemas difíceis de matemática.'),
  ('oq-09', 9, 'A', 'Escrever histórias, poemas ou canções.'),
  ('oq-10', 10, 'S', 'Explicar uma matéria a colegas que não a percebem.'),
  ('oq-11', 11, 'E', 'Convencer pessoas a aceitar uma ideia ou a comprar algo.'),
  ('oq-12', 12, 'C', 'Seguir regras e procedimentos claros.'),
  ('oq-13', 13, 'R', 'Usar ferramentas ou máquinas.'),
  ('oq-14', 14, 'I', 'Ler sobre ciência, a natureza ou o corpo humano.'),
  ('oq-15', 15, 'A', 'Cantar, tocar um instrumento ou dançar.'),
  ('oq-16', 16, 'S', 'Cuidar de crianças ou de pessoas doentes.'),
  ('oq-17', 17, 'E', 'Abrir o meu próprio negócio.'),
  ('oq-18', 18, 'C', 'Fazer contas e controlar o dinheiro de um orçamento.'),
  ('oq-19', 19, 'R', 'Construir ou arranjar uma casa, um muro ou uma instalação eléctrica.'),
  ('oq-20', 20, 'I', 'Descobrir a causa de um problema, passo a passo.'),
  ('oq-21', 21, 'A', 'Fazer teatro ou falar para um público.'),
  ('oq-22', 22, 'S', 'Trabalhar em equipa com muita gente.'),
  ('oq-23', 23, 'E', 'Tomar decisões e assumir riscos.'),
  ('oq-24', 24, 'C', 'Manter tudo arrumado e dentro dos prazos.'),
  ('oq-25', 25, 'R', 'Fazer trabalho físico em vez de estar sentado o dia todo.'),
  ('oq-26', 26, 'I', 'Analisar números para encontrar padrões.'),
  ('oq-27', 27, 'A', 'Ter ideias originais, sem seguir regras fixas.'),
  ('oq-28', 28, 'S', 'Ouvir as pessoas e aconselhá-las.'),
  ('oq-29', 29, 'E', 'Organizar eventos ou campanhas.'),
  ('oq-30', 30, 'C', 'Registar dados no computador sem enganos.')
ON CONFLICT DO NOTHING;

-- Perfil dos cursos da UEM 2026 (rascunho por rever). Só cria o que ainda não existe: não altera o que já foi editado.
WITH v(course_id, r, i, a, s, e, c) AS (VALUES
  ('course-uem-agro-economia-e-extensao-agraria', 3, 2, 0, 3, 3, 0),
  ('course-uem-engenharia-agronomica', 4, 4, 0, 0, 1, 0),
  ('course-uem-engenharia-florestal', 5, 4, 0, 0, 0, 0),
  ('course-uem-arquitectura-e-planeamento-fisico', 3, 3, 5, 0, 0, 0),
  ('course-uem-biologia-aplicada', 3, 5, 0, 0, 0, 0),
  ('course-uem-biologia-e-saude', 0, 5, 0, 3, 0, 0),
  ('course-uem-biologia-marinha-aquatica-e-costeira', 3, 5, 0, 0, 0, 0),
  ('course-uem-ecologia-e-conservacao-da-biodiversidade-terrestre', 3, 5, 0, 0, 0, 0),
  ('course-uem-geo-ciencias-de-petroleo-e-gas', 4, 5, 0, 0, 0, 0),
  ('course-uem-geo-fisica-aplicada', 3, 5, 0, 0, 0, 1),
  ('course-uem-geologia-urbana-e-ambiental', 4, 5, 0, 0, 0, 0),
  ('course-uem-hidrogeologia-e-recursos-hidricos', 4, 5, 0, 0, 0, 0),
  ('course-uem-geologia-e-pesquisa-mineral', 4, 5, 0, 0, 0, 0),
  ('course-uem-quimica-ambiental', 3, 5, 0, 0, 0, 0),
  ('course-uem-quimica-industrial', 4, 5, 0, 0, 0, 1),
  ('course-uem-ciencias-de-informacao-geografica', 2, 5, 0, 0, 0, 3),
  ('course-uem-estatistica', 0, 5, 0, 0, 0, 4),
  ('course-uem-informatica', 2, 5, 0, 0, 0, 3),
  ('course-uem-matematica', 0, 5, 0, 0, 0, 3),
  ('course-uem-fisica', 3, 5, 0, 0, 0, 0),
  ('course-uem-meteorologia', 2, 5, 0, 0, 0, 2),
  ('course-uem-direito', 0, 3, 0, 3, 4, 3),
  ('course-uem-economia', 0, 4, 0, 0, 4, 4),
  ('course-uem-gestao', 0, 0, 0, 2, 5, 4),
  ('course-uem-contabilidade-e-financas', 0, 2, 0, 0, 3, 5),
  ('course-uem-lingua-de-sinais-de-mocambique', 0, 2, 2, 5, 0, 0),
  ('course-uem-organizacao-e-gestao-da-educacao', 0, 0, 0, 4, 4, 3),
  ('course-uem-desenvolvimento-e-educacao-de-infancia', 0, 0, 3, 5, 0, 0),
  ('course-uem-educacao-ambiental', 2, 3, 0, 5, 0, 0),
  ('course-uem-psicologia-das-organizacoes', 0, 3, 0, 5, 3, 0),
  ('course-uem-psicologia-escolar-e-das-necessidades-educativas-especiais', 0, 4, 0, 5, 0, 0),
  ('course-uem-engenharia-do-ambiente', 4, 4, 0, 0, 0, 0),
  ('course-uem-engenharia-civil', 5, 4, 0, 0, 0, 2),
  ('course-uem-engenharia-electrica', 5, 4, 0, 0, 0, 0),
  ('course-uem-engenharia-electronica', 4, 5, 0, 0, 0, 0),
  ('course-uem-engenharia-informatica', 3, 5, 0, 0, 0, 3),
  ('course-uem-engenharia-mecanica', 5, 4, 0, 0, 0, 0),
  ('course-uem-engenharia-quimica', 4, 5, 0, 0, 0, 0),
  ('course-uem-engenharia-de-petroleo-e-gas-natural', 5, 5, 0, 0, 0, 0),
  ('course-uem-engenharia-de-telecomunicacoes', 4, 5, 0, 0, 0, 0),
  ('course-uem-engenharia-e-gestao-industrial', 3, 4, 0, 0, 3, 3),
  ('course-uem-filosofia', 0, 5, 3, 2, 0, 0),
  ('course-uem-ensino-de-filosofia', 0, 4, 2, 5, 0, 0),
  ('course-uem-administracao-publica', 0, 0, 0, 3, 4, 4),
  ('course-uem-ciencia-politica', 0, 4, 0, 3, 4, 0),
  ('course-uem-ensino-de-portugues', 0, 2, 4, 5, 0, 0),
  ('course-uem-historia', 0, 5, 3, 2, 0, 0),
  ('course-uem-linguistica', 0, 5, 3, 0, 0, 2),
  ('course-uem-literatura-mocambicana', 0, 3, 5, 2, 0, 0),
  ('course-uem-sociologia', 0, 5, 0, 4, 0, 0),
  ('course-uem-antropologia', 0, 5, 2, 4, 0, 0),
  ('course-uem-arqueologia-e-gestao-do-patrimonio-cultural', 3, 5, 2, 0, 0, 0),
  ('course-uem-geografia', 3, 4, 0, 2, 0, 0),
  ('course-uem-ensino-de-frances', 0, 2, 3, 5, 0, 0),
  ('course-uem-traducao-portugues-frances', 0, 3, 4, 0, 0, 3),
  ('course-uem-ensino-de-ingles', 0, 2, 3, 5, 0, 0),
  ('course-uem-traducao-portugues-ingles', 0, 3, 4, 0, 0, 3),
  ('course-uem-lingua-cultura-e-literatura-chinesa', 0, 4, 4, 2, 0, 0),
  ('course-uem-ensino-de-linguas-bantu', 0, 3, 3, 5, 0, 0),
  ('course-uem-medicina', 2, 5, 0, 5, 0, 0),
  ('course-uem-ciencia-e-tecnologia-de-alimentos', 4, 5, 0, 0, 0, 2),
  ('course-uem-ciencia-e-tecnologia-animal', 5, 4, 0, 0, 0, 0),
  ('course-uem-medicina-veterinaria', 4, 5, 0, 3, 0, 0),
  ('course-uem-arquivistica', 0, 3, 0, 0, 0, 5),
  ('course-uem-biblioteconomia', 0, 2, 0, 3, 0, 5),
  ('course-uem-jornalismo', 0, 2, 4, 3, 3, 0),
  ('course-uem-marketing-e-relacoes-publicas', 0, 0, 3, 3, 5, 0),
  ('course-uem-musica', 0, 0, 5, 2, 0, 0),
  ('course-uem-teatro', 0, 0, 5, 3, 2, 0),
  ('course-uem-ciencias-do-desporto', 4, 2, 0, 4, 0, 0),
  ('course-uem-oceanografia', 4, 5, 0, 0, 0, 0),
  ('course-uem-biologia-marinha', 4, 5, 0, 0, 0, 0),
  ('course-uem-quimica-marinha', 4, 5, 0, 0, 0, 0),
  ('course-uem-geologia-marinha', 4, 5, 0, 0, 0, 0),
  ('course-uem-comunicacao-e-extensao-rural', 3, 0, 0, 5, 2, 0),
  ('course-uem-economia-agraria', 2, 4, 0, 0, 4, 3),
  ('course-uem-agro-processamento', 5, 3, 0, 0, 0, 2),
  ('course-uem-engenharia-rural', 5, 4, 0, 0, 0, 0),
  ('course-uem-producao-animal', 5, 3, 0, 0, 0, 0),
  ('course-uem-producao-pesqueira', 5, 3, 0, 0, 2, 0),
  ('course-uem-producao-agricola', 5, 3, 0, 0, 2, 0),
  ('course-uem-gestao-hoteleira', 0, 0, 0, 4, 4, 3),
  ('course-uem-animacao-turistica', 0, 0, 4, 4, 3, 0),
  ('course-uem-informacao-turistica', 0, 0, 0, 5, 2, 3),
  ('course-uem-ecoturismo-e-conservacao-da-natureza', 4, 3, 0, 3, 2, 0),
  ('course-uem-financas', 0, 2, 0, 0, 4, 5),
  ('course-uem-gestao-de-empresas', 0, 0, 0, 2, 5, 4),
  ('course-uem-gestao-comercial', 0, 0, 0, 3, 5, 3),
  ('course-uem-agro-negocios', 3, 0, 0, 0, 4, 3),
  ('course-uem-agricultura-comercial', 4, 0, 0, 0, 4, 2)
)
INSERT INTO orientation_course_profiles (course_id, r, i, a, s, e, c)
SELECT v.course_id, v.r, v.i, v.a, v.s, v.e, v.c FROM v JOIN courses ON courses.id = v.course_id
ON CONFLICT DO NOTHING;
