-- Cursos e provas de admissão: edital dos Exames de Admissão 2027 (UP-Maputo, UniLicungo, UniPúnguè e UniRovuma).
-- Fonte: edital assinado em Maputo a 13/10/2026 pela Comissão de Exames de Admissão; https://up.ac.mz/anuncios/edital-2027
-- Só cria o que ainda não existe: não altera instituições, cursos nem provas que o admin já tenha criado ou editado.
-- Cursos admitidos por Concurso Documental (CD) não têm exame e ficam de fora. Pesos 50/50 por defeito (o edital não os indica).
-- Resumo, datas e números: docs/EDITAL-UP-2027.md.

INSERT INTO institutions (id, short_name, name, kind, city, province, active, show_when_empty)
SELECT 'institution-up', 'UP', 'Universidade Pedagógica de Maputo', 'universidade', 'Maputo', 'Maputo', true, false
WHERE NOT EXISTS (SELECT 1 FROM institutions WHERE short_name IN ('UP', 'UP-Maputo') OR name ILIKE 'Universidade Pedag%');

INSERT INTO institutions (id, short_name, name, kind, city, province, active, show_when_empty)
SELECT 'institution-unilicungo', 'UniLicungo', 'Universidade Licungo', 'universidade', 'Quelimane', 'Zambézia', true, false
WHERE NOT EXISTS (SELECT 1 FROM institutions WHERE short_name ILIKE 'UniLicungo' OR name ILIKE 'Universidade Licungo');

INSERT INTO institutions (id, short_name, name, kind, city, province, active, show_when_empty)
SELECT 'institution-unipungue', 'UniPúnguè', 'Universidade Púnguè', 'universidade', 'Chimoio', 'Manica', true, false
WHERE NOT EXISTS (SELECT 1 FROM institutions WHERE short_name ILIKE 'UniP%nguè' OR name ILIKE 'Universidade P%nguè');

INSERT INTO institutions (id, short_name, name, kind, city, province, active, show_when_empty)
SELECT 'institution-unirovuma', 'UniRovuma', 'Universidade Rovuma', 'universidade', 'Nampula', 'Nampula', true, false
WHERE NOT EXISTS (SELECT 1 FROM institutions WHERE short_name ILIKE 'UniRovuma' OR name ILIKE 'Universidade Rovuma');

-- Disciplinas usadas nas provas (reaproveita as que já existem, pelo slug)
INSERT INTO library_subjects (id, name, slug, active) VALUES
  ('subject-aptidao-fisica', 'Aptidão Física', 'aptidao-fisica', true),
  ('subject-biologia', 'Biologia', 'biologia', true),
  ('subject-desenho', 'Desenho', 'desenho', true),
  ('subject-desenho-tecnico', 'Desenho Técnico (Geometria Descritiva)', 'desenho-tecnico', true),
  ('subject-educacao-visual', 'Educação Visual', 'educacao-visual', true),
  ('subject-filosofia', 'Filosofia', 'filosofia', true),
  ('subject-fisica', 'Física', 'fisica', true),
  ('subject-frances', 'Francês', 'frances', true),
  ('subject-geografia', 'Geografia', 'geografia', true),
  ('subject-historia', 'História', 'historia', true),
  ('subject-ingles', 'Inglês', 'ingles', true),
  ('subject-matematica', 'Matemática', 'matematica', true),
  ('subject-portugues', 'Português', 'portugues', true),
  ('subject-quimica', 'Química', 'quimica', true)
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE _inst (key text PRIMARY KEY, id text NOT NULL) ON COMMIT DROP;
INSERT INTO _inst SELECT 'up', id FROM institutions WHERE short_name IN ('UP', 'UP-Maputo') OR name ILIKE 'Universidade Pedag%' ORDER BY short_name = 'UP' DESC LIMIT 1;
INSERT INTO _inst SELECT 'unilicungo', id FROM institutions WHERE short_name ILIKE 'UniLicungo' OR name ILIKE 'Universidade Licungo' ORDER BY short_name = 'UniLicungo' DESC LIMIT 1;
INSERT INTO _inst SELECT 'unipungue', id FROM institutions WHERE short_name ILIKE 'UniP%nguè' OR name ILIKE 'Universidade P%nguè' ORDER BY short_name = 'UniPúnguè' DESC LIMIT 1;
INSERT INTO _inst SELECT 'unirovuma', id FROM institutions WHERE short_name ILIKE 'UniRovuma' OR name ILIKE 'Universidade Rovuma' ORDER BY short_name = 'UniRovuma' DESC LIMIT 1;

CREATE TEMP TABLE _edital (inst_key text, cid text, curso text, unit text, campus text, periodo text, ord int, vagas int, s1 text, v1 text, s2 text, v2 text) ON COMMIT DROP;
INSERT INTO _edital VALUES
  ('up', 'course-up-ensino-de-lingua-inglesa', 'Ensino de Língua Inglesa', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'laboral', 0, 35, 'ingles', '', 'portugues', 'II'),
  ('up', 'course-up-ensino-de-lingua-inglesa', 'Ensino de Língua Inglesa', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'pos_laboral', 1, 120, 'ingles', '', 'portugues', 'II'),
  ('up', 'course-up-ensino-de-lingua-inglesa', 'Ensino de Língua Inglesa', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'ead', 2, 130, 'ingles', '', 'portugues', 'II'),
  ('up', 'course-up-ensino-de-lingua-francesa', 'Ensino de Língua Francesa', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'laboral', 0, 35, 'frances', '', 'portugues', 'II'),
  ('up', 'course-up-ensino-de-lingua-francesa', 'Ensino de Língua Francesa', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'pos_laboral', 1, 60, 'frances', '', 'portugues', 'II'),
  ('up', 'course-up-ensino-de-lingua-portuguesa', 'Ensino de Língua Portuguesa', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'laboral', 0, 35, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-ensino-de-lingua-portuguesa', 'Ensino de Língua Portuguesa', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'pos_laboral', 1, 60, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-design-da-comunicacao', 'Design da Comunicação', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'laboral', 0, 35, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-design-da-comunicacao', 'Design da Comunicação', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'pos_laboral', 1, 60, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-jornalismo', 'Jornalismo', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'laboral', 0, 35, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-jornalismo', 'Jornalismo', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'pos_laboral', 1, 60, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-artes-cenicas', 'Artes Cénicas', 'Faculdade de Ciências da Linguagem, Comunicação e Artes', NULL, 'laboral', 0, 35, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-antropologia-e-desenvolvimento-comunitario', 'Antropologia e Desenvolvimento Comunitário', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'laboral', 0, 35, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-direito', 'Direito', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'pos_laboral', 0, 120, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-ensino-de-filosofia', 'Ensino de Filosofia', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'laboral', 0, 35, 'filosofia', '', 'historia', ''),
  ('up', 'course-up-ensino-de-filosofia', 'Ensino de Filosofia', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'pos_laboral', 1, 60, 'filosofia', '', 'historia', ''),
  ('up', 'course-up-servico-social-e-accao-humanitaria', 'Serviço Social e Acção Humanitária', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'laboral', 0, 35, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-servico-social-e-accao-humanitaria', 'Serviço Social e Acção Humanitária', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'pos_laboral', 1, 60, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-ensino-de-historia', 'Ensino de História', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'laboral', 0, 35, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-ensino-de-historia', 'Ensino de História', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'pos_laboral', 1, 60, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-ensino-de-historia', 'Ensino de História', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'ead', 2, 200, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-sociologia-e-desenvolvimento-de-instituicoes', 'Sociologia e Desenvolvimento de Instituições', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'laboral', 0, 35, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-sociologia-e-desenvolvimento-de-instituicoes', 'Sociologia e Desenvolvimento de Instituições', 'Faculdade de Ciências Sociais e Filosofia', NULL, 'pos_laboral', 1, 60, 'portugues', 'II', 'historia', ''),
  ('up', 'course-up-ensino-de-geografia', 'Ensino de Geografia', 'Faculdade de Ciências da Terra e Ambiente', NULL, 'laboral', 0, 35, 'geografia', '', 'historia', ''),
  ('up', 'course-up-ensino-de-geografia', 'Ensino de Geografia', 'Faculdade de Ciências da Terra e Ambiente', NULL, 'pos_laboral', 1, 120, 'geografia', '', 'historia', ''),
  ('up', 'course-up-planeamento-e-ordenamento-territorial', 'Planeamento e Ordenamento Territorial', 'Faculdade de Ciências da Terra e Ambiente', NULL, 'laboral', 0, 35, 'geografia', '', 'portugues', 'II'),
  ('up', 'course-up-planeamento-e-ordenamento-territorial', 'Planeamento e Ordenamento Territorial', 'Faculdade de Ciências da Terra e Ambiente', NULL, 'pos_laboral', 1, 60, 'geografia', '', 'portugues', 'II'),
  ('up', 'course-up-cartografia-e-agrimensura', 'Cartografia e Agrimensura', 'Faculdade de Ciências da Terra e Ambiente', NULL, 'laboral', 0, 35, 'matematica', '', 'portugues', 'II'),
  ('up', 'course-up-cartografia-e-agrimensura', 'Cartografia e Agrimensura', 'Faculdade de Ciências da Terra e Ambiente', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'II'),
  ('up', 'course-up-gestao-ambiental-e-desenvolvimento-comunitario', 'Gestão Ambiental e Desenvolvimento Comunitário', 'Faculdade de Ciências da Terra e Ambiente', NULL, 'pos_laboral', 0, 60, 'geografia', '', 'portugues', 'II'),
  ('up', 'course-up-patrimonio-e-turismo', 'Património e Turismo', 'Faculdade de Ciências da Terra e Ambiente', NULL, 'laboral', 0, 35, 'geografia', '', 'historia', ''),
  ('up', 'course-up-gestao-publica-e-educacional', 'Gestão Pública e Educacional', 'Faculdade de Educação e Psicologia', NULL, 'laboral', 0, 40, 'portugues', 'I', 'matematica', ''),
  ('up', 'course-up-gestao-publica-e-educacional', 'Gestão Pública e Educacional', 'Faculdade de Educação e Psicologia', NULL, 'pos_laboral', 1, 60, 'portugues', 'I', 'matematica', ''),
  ('up', 'course-up-educacao-e-assistencia-social', 'Educação e Assistência Social', 'Faculdade de Educação e Psicologia', NULL, 'laboral', 0, 40, 'portugues', 'I', 'historia', ''),
  ('up', 'course-up-educacao-e-assistencia-social', 'Educação e Assistência Social', 'Faculdade de Educação e Psicologia', NULL, 'pos_laboral', 1, 60, 'portugues', 'I', 'historia', ''),
  ('up', 'course-up-pedagogia', 'Pedagogia', 'Faculdade de Educação e Psicologia', NULL, 'laboral', 0, 40, 'portugues', 'I', 'historia', ''),
  ('up', 'course-up-pedagogia', 'Pedagogia', 'Faculdade de Educação e Psicologia', NULL, 'pos_laboral', 1, 60, 'portugues', 'I', 'historia', ''),
  ('up', 'course-up-pedagogia', 'Pedagogia', 'Faculdade de Educação e Psicologia', NULL, 'ead', 2, 70, 'portugues', 'I', 'historia', ''),
  ('up', 'course-up-educacao-e-desenvolvimento-da-primeira-infancia', 'Educação e Desenvolvimento da Primeira Infância', 'Faculdade de Educação e Psicologia', NULL, 'laboral', 0, 40, 'portugues', 'I', 'biologia', ''),
  ('up', 'course-up-educacao-e-desenvolvimento-da-primeira-infancia', 'Educação e Desenvolvimento da Primeira Infância', 'Faculdade de Educação e Psicologia', NULL, 'pos_laboral', 1, 60, 'portugues', 'I', 'biologia', ''),
  ('up', 'course-up-psicologia-educacional', 'Psicologia Educacional', 'Faculdade de Educação e Psicologia', NULL, 'laboral', 0, 40, 'portugues', 'I', 'biologia', ''),
  ('up', 'course-up-psicologia-educacional', 'Psicologia Educacional', 'Faculdade de Educação e Psicologia', NULL, 'pos_laboral', 1, 60, 'portugues', 'I', 'biologia', ''),
  ('up', 'course-up-psicologia-clinica-e-da-saude', 'Psicologia Clínica e da Saúde', 'Faculdade de Educação e Psicologia', NULL, 'laboral', 0, 40, 'portugues', 'I', 'biologia', ''),
  ('up', 'course-up-psicologia-clinica-e-da-saude', 'Psicologia Clínica e da Saúde', 'Faculdade de Educação e Psicologia', NULL, 'pos_laboral', 1, 60, 'portugues', 'I', 'biologia', ''),
  ('up', 'course-up-psicologia-social-e-do-trabalho', 'Psicologia Social e do Trabalho', 'Faculdade de Educação e Psicologia', NULL, 'laboral', 0, 40, 'portugues', 'I', 'biologia', ''),
  ('up', 'course-up-psicologia-social-e-do-trabalho', 'Psicologia Social e do Trabalho', 'Faculdade de Educação e Psicologia', NULL, 'pos_laboral', 1, 60, 'portugues', 'I', 'biologia', ''),
  ('up', 'course-up-administracao-e-gestao-da-educacao', 'Administração e Gestão da Educação', 'Faculdade de Educação e Psicologia', NULL, 'ead', 0, 70, 'portugues', 'I', 'historia', ''),
  ('up', 'course-up-ensino-de-biologia', 'Ensino de Biologia', 'Faculdade de Ciências Naturais e Matemática', NULL, 'laboral', 0, 35, 'biologia', '', 'quimica', ''),
  ('up', 'course-up-ensino-de-biologia', 'Ensino de Biologia', 'Faculdade de Ciências Naturais e Matemática', NULL, 'pos_laboral', 1, 60, 'biologia', '', 'quimica', ''),
  ('up', 'course-up-ensino-de-matematica', 'Ensino de Matemática', 'Faculdade de Ciências Naturais e Matemática', NULL, 'laboral', 0, 35, 'matematica', '', 'fisica', ''),
  ('up', 'course-up-ensino-de-matematica', 'Ensino de Matemática', 'Faculdade de Ciências Naturais e Matemática', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'fisica', ''),
  ('up', 'course-up-energias-renovaveis', 'Energias Renováveis', 'Faculdade de Ciências Naturais e Matemática', NULL, 'pos_laboral', 0, 60, 'fisica', '', 'matematica', ''),
  ('up', 'course-up-estatistica-e-gestao-de-informacao', 'Estatística e Gestão de Informação', 'Faculdade de Ciências Naturais e Matemática', NULL, 'pos_laboral', 0, 60, 'portugues', 'I', 'matematica', ''),
  ('up', 'course-up-ensino-de-quimica', 'Ensino de Química', 'Faculdade de Ciências Naturais e Matemática', NULL, 'laboral', 0, 35, 'quimica', '', 'biologia', ''),
  ('up', 'course-up-ensino-de-quimica', 'Ensino de Química', 'Faculdade de Ciências Naturais e Matemática', NULL, 'ead', 1, 70, 'quimica', '', 'biologia', ''),
  ('up', 'course-up-ensino-de-fisica', 'Ensino de Física', 'Faculdade de Ciências Naturais e Matemática', NULL, 'laboral', 0, 35, 'fisica', '', 'matematica', ''),
  ('up', 'course-up-ensino-de-fisica', 'Ensino de Física', 'Faculdade de Ciências Naturais e Matemática', NULL, 'ead', 1, 70, 'fisica', '', 'matematica', ''),
  ('up', 'course-up-nutricao', 'Nutrição', 'Faculdade de Ciências Naturais e Matemática', NULL, 'pos_laboral', 0, 60, 'quimica', '', 'biologia', ''),
  ('up', 'course-up-contabilidade-e-auditoria', 'Contabilidade e Auditoria', 'Faculdade de Economia e Gestão', NULL, 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-contabilidade-e-auditoria', 'Contabilidade e Auditoria', 'Faculdade de Economia e Gestão', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-economia', 'Economia', 'Faculdade de Economia e Gestão', NULL, 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-economia', 'Economia', 'Faculdade de Economia e Gestão', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-gestao-de-empresas', 'Gestão de Empresas', 'Faculdade de Economia e Gestão', NULL, 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-gestao-de-empresas', 'Gestão de Empresas', 'Faculdade de Economia e Gestão', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-gestao-financeira-e-bancaria', 'Gestão Financeira e Bancária', 'Faculdade de Economia e Gestão', NULL, 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-gestao-financeira-e-bancaria', 'Gestão Financeira e Bancária', 'Faculdade de Economia e Gestão', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-gestao-de-recursos-humanos', 'Gestão de Recursos Humanos', 'Faculdade de Economia e Gestão', NULL, 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-gestao-de-recursos-humanos', 'Gestão de Recursos Humanos', 'Faculdade de Economia e Gestão', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-marketing-e-relacoes-publicas', 'Marketing e Relações Públicas', 'Faculdade de Economia e Gestão', NULL, 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-marketing-e-relacoes-publicas', 'Marketing e Relações Públicas', 'Faculdade de Economia e Gestão', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'I'),
  ('up', 'course-up-engenharia-eletronica-e-de-telecomunicacoes', 'Engenharia Eletrónica e de Telecomunicações', 'Faculdade de Engenharias e Tecnologias', NULL, 'laboral', 0, 40, 'matematica', '', 'fisica', ''),
  ('up', 'course-up-engenharia-eletronica-e-de-telecomunicacoes', 'Engenharia Eletrónica e de Telecomunicações', 'Faculdade de Engenharias e Tecnologias', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'fisica', ''),
  ('up', 'course-up-engenharia-de-construcao-civil', 'Engenharia de Construção Civil', 'Faculdade de Engenharias e Tecnologias', NULL, 'laboral', 0, 40, 'matematica', '', 'fisica', ''),
  ('up', 'course-up-engenharia-de-construcao-civil', 'Engenharia de Construção Civil', 'Faculdade de Engenharias e Tecnologias', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'fisica', ''),
  ('up', 'course-up-engenharia-agronomica', 'Engenharia Agronómica', 'Faculdade de Engenharias e Tecnologias', NULL, 'laboral', 0, 35, 'matematica', '', 'quimica', ''),
  ('up', 'course-up-engenharia-agronomica', 'Engenharia Agronómica', 'Faculdade de Engenharias e Tecnologias', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'quimica', ''),
  ('up', 'course-up-extensao-agraria', 'Extensão Agrária', 'Faculdade de Engenharias e Tecnologias', NULL, 'laboral', 0, 35, 'biologia', '', 'quimica', ''),
  ('up', 'course-up-extensao-agraria', 'Extensão Agrária', 'Faculdade de Engenharias e Tecnologias', NULL, 'pos_laboral', 1, 60, 'biologia', '', 'quimica', ''),
  ('up', 'course-up-extensao-agraria', 'Extensão Agrária', 'Faculdade de Engenharias e Tecnologias', NULL, 'ead', 2, 70, 'biologia', '', 'quimica', ''),
  ('up', 'course-up-informatica', 'Informática', 'Faculdade de Engenharias e Tecnologias', NULL, 'laboral', 0, 40, 'matematica', '', 'fisica', ''),
  ('up', 'course-up-informatica', 'Informática', 'Faculdade de Engenharias e Tecnologias', NULL, 'pos_laboral', 1, 60, 'matematica', '', 'fisica', ''),
  ('up', 'course-up-design-e-multimidia', 'Design e Multimídia', 'Faculdade de Engenharias e Tecnologias', NULL, 'laboral', 0, 35, 'portugues', 'I', 'desenho', ''),
  ('up', 'course-up-design-e-multimidia', 'Design e Multimídia', 'Faculdade de Engenharias e Tecnologias', NULL, 'pos_laboral', 1, 60, 'portugues', 'I', 'desenho', ''),
  ('up', 'course-up-tecnologia-de-alimentos', 'Tecnologia de Alimentos', 'Faculdade de Engenharias e Tecnologias', NULL, 'laboral', 0, 35, 'quimica', '', 'biologia', ''),
  ('up', 'course-up-informatica-aplicada', 'Informática Aplicada', 'Faculdade de Engenharias e Tecnologias', NULL, 'ead', 0, 140, 'matematica', '', 'fisica', ''),
  ('up', 'course-up-educacao-visual-e-geometria-descritiva', 'Educação Visual e Geometria Descritiva', 'Faculdade de Engenharias e Tecnologias', NULL, 'laboral', 0, 35, 'educacao-visual', '', 'desenho-tecnico', ''),
  ('up', 'course-up-ensino-de-educacao-fisica-e-desporto-escolar', 'Ensino de Educação Física e Desporto Escolar', 'Faculdade de Educação Física e Desportos', NULL, 'laboral', 0, 40, 'biologia', '', 'aptidao-fisica', 'pratica'),
  ('up', 'course-up-ensino-de-educacao-fisica-e-desporto-escolar', 'Ensino de Educação Física e Desporto Escolar', 'Faculdade de Educação Física e Desportos', NULL, 'pos_laboral', 1, 60, 'biologia', '', 'aptidao-fisica', 'pratica'),
  ('up', 'course-up-actividade-fisica-e-saude', 'Actividade Física e Saúde', 'Faculdade de Educação Física e Desportos', NULL, 'laboral', 0, 35, 'biologia', '', 'aptidao-fisica', 'pratica'),
  ('up', 'course-up-actividade-fisica-e-saude', 'Actividade Física e Saúde', 'Faculdade de Educação Física e Desportos', NULL, 'pos_laboral', 1, 60, 'biologia', '', 'aptidao-fisica', 'pratica'),
  ('up', 'course-up-treino-desportivo', 'Treino Desportivo', 'Faculdade de Educação Física e Desportos', NULL, 'laboral', 0, 35, 'biologia', '', 'aptidao-fisica', 'pratica'),
  ('unilicungo', 'course-unilicungo-gestao-ambiental-e-desenvolvimento-comunitario-quelimane', 'Gestão Ambiental e Desenvolvimento Comunitário (Quelimane)', 'Faculdade de Engenharia e Planeamento Físico', 'Sede – Quelimane', 'pos_laboral', 0, 120, 'geografia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-planeamento-e-ordenamento-territorial', 'Planeamento e Ordenamento Territorial', 'Faculdade de Engenharia e Planeamento Físico', 'Sede – Quelimane', 'laboral', 0, 40, 'geografia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-informatica-quelimane', 'Informática (Quelimane)', 'Faculdade de Engenharia e Planeamento Físico', 'Sede – Quelimane', 'laboral', 0, 40, 'fisica', '', 'matematica', ''),
  ('unilicungo', 'course-unilicungo-estatistica-e-gestao-de-informacao-quelimane', 'Estatística e Gestão de Informação (Quelimane)', 'Faculdade de Engenharia e Planeamento Físico', 'Sede – Quelimane', 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-direito-quelimane', 'Direito (Quelimane)', 'Faculdade de Ciências Sociais', 'Sede – Quelimane', 'pos_laboral', 0, 60, 'portugues', 'II', 'historia', ''),
  ('unilicungo', 'course-unilicungo-filosofia-social-e-politica', 'Filosofia Social e Política', 'Faculdade de Ciências Sociais', 'Sede – Quelimane', 'laboral', 0, 40, 'filosofia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-psicologia-social-e-das-organizacoes-quelimane', 'Psicologia Social e das Organizações (Quelimane)', 'Faculdade de Ciências Sociais', 'Sede – Quelimane', 'pos_laboral', 0, 60, 'portugues', 'I', 'biologia', ''),
  ('unilicungo', 'course-unilicungo-ensino-de-matematica', 'Ensino de Matemática', 'Faculdade de Educação', 'Sede – Quelimane', 'laboral', 0, 40, 'matematica', '', 'fisica', ''),
  ('unilicungo', 'course-unilicungo-educacao-de-infancia', 'Educação de Infância', 'Faculdade de Educação', 'Sede – Quelimane', 'laboral', 0, 40, 'biologia', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-psicologia-educacional-quelimane', 'Psicologia Educacional (Quelimane)', 'Faculdade de Educação', 'Sede – Quelimane', 'pos_laboral', 0, 60, 'biologia', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-ensino-de-ciencias-sociais', 'Ensino de Ciências Sociais', 'Faculdade de Educação', 'Sede – Quelimane', 'laboral', 0, 40, 'historia', '', 'geografia', ''),
  ('unilicungo', 'course-unilicungo-ensino-de-geografia-quelimane', 'Ensino de Geografia (Quelimane)', 'Faculdade de Educação', 'Sede – Quelimane', 'pos_laboral', 0, 60, 'geografia', '', 'historia', ''),
  ('unilicungo', 'course-unilicungo-ensino-de-quimica-quelimane', 'Ensino de Química (Quelimane)', 'Faculdade de Educação', 'Sede – Quelimane', 'laboral', 0, 40, 'quimica', '', 'biologia', ''),
  ('unilicungo', 'course-unilicungo-ensino-de-biologia-quelimane', 'Ensino de Biologia (Quelimane)', 'Faculdade de Educação', 'Sede – Quelimane', 'laboral', 0, 40, 'biologia', '', 'quimica', ''),
  ('unilicungo', 'course-unilicungo-actividade-fisica-e-saude', 'Actividade Física e Saúde', 'Faculdade de Educação', 'Sede – Quelimane', 'laboral', 0, 40, 'biologia', '', 'aptidao-fisica', 'pratica'),
  ('unilicungo', 'course-unilicungo-ensino-de-ciencias-naturais', 'Ensino de Ciências Naturais', 'Faculdade de Educação', 'Sede – Quelimane', 'laboral', 0, 40, 'biologia', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-administracao-publica-e-autarquica', 'Administração Pública e Autárquica', 'Faculdade de Economia e Gestão', 'Sede – Quelimane', 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-gestao-dos-recursos-humanos-quelimane', 'Gestão dos Recursos Humanos (Quelimane)', 'Faculdade de Economia e Gestão', 'Sede – Quelimane', 'pos_laboral', 0, 60, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-gestao-de-empresas-quelimane', 'Gestão de Empresas (Quelimane)', 'Faculdade de Economia e Gestão', 'Sede – Quelimane', 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-contabilidade', 'Contabilidade', 'Faculdade de Economia e Gestão', 'Sede – Quelimane', 'pos_laboral', 0, 60, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-economia-e-financas', 'Economia e Finanças', 'Faculdade de Economia e Gestão', 'Sede – Quelimane', 'pos_laboral', 0, 60, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-pecuaria-e-extensao-rural', 'Pecuária e Extensão Rural', 'Faculdade de Ciências Agrárias', 'Sede – Quelimane', 'laboral', 0, 40, 'quimica', '', 'biologia', ''),
  ('unilicungo', 'course-unilicungo-agro-processamento', 'Agro-processamento', 'Faculdade de Ciências Agrárias', 'Sede – Quelimane', 'laboral', 0, 40, 'quimica', '', 'biologia', ''),
  ('unilicungo', 'course-unilicungo-engenharia-agronomica', 'Engenharia Agronómica', 'Faculdade de Ciências Agrárias', 'Sede – Quelimane', 'laboral', 0, 40, 'quimica', '', 'matematica', ''),
  ('unilicungo', 'course-unilicungo-engenharia-agronomica', 'Engenharia Agronómica', 'Faculdade de Ciências Agrárias', 'Sede – Quelimane', 'pos_laboral', 1, 60, 'quimica', '', 'matematica', ''),
  ('unilicungo', 'course-unilicungo-medicina-geral', 'Medicina Geral', 'Faculdade de Medicina', 'Sede – Quelimane', 'laboral', 0, 40, 'quimica', '', 'biologia', ''),
  ('unilicungo', 'course-unilicungo-geologia', 'Geologia', 'Faculdade de Ciências e Tecnologia', 'Delegação de Sofala', 'laboral', 0, 40, 'quimica', '', 'fisica', ''),
  ('unilicungo', 'course-unilicungo-engenharia-de-construcao-civil', 'Engenharia de Construção Civil', 'Faculdade de Ciências e Tecnologia', 'Delegação de Sofala', 'pos_laboral', 0, 60, 'matematica', '', 'fisica', ''),
  ('unilicungo', 'course-unilicungo-informatica-sofala', 'Informática (Sofala)', 'Faculdade de Ciências e Tecnologia', 'Delegação de Sofala', 'pos_laboral', 0, 60, 'matematica', '', 'fisica', ''),
  ('unilicungo', 'course-unilicungo-estatistica-e-gestao-de-informacao-sofala', 'Estatística e Gestão de Informação (Sofala)', 'Faculdade de Ciências e Tecnologia', 'Delegação de Sofala', 'pos_laboral', 0, 60, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-gestao-ambiental-e-desenvolvimento-comunitario-sofala', 'Gestão Ambiental e Desenvolvimento Comunitário (Sofala)', 'Faculdade de Ciências e Tecnologia', 'Delegação de Sofala', 'pos_laboral', 0, 60, 'geografia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-gestao-ambiental-e-desenvolvimento-comunitario-sofala', 'Gestão Ambiental e Desenvolvimento Comunitário (Sofala)', 'Faculdade de Ciências e Tecnologia', 'Delegação de Sofala', 'laboral', 1, 40, 'geografia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-ciencias-energeticas', 'Ciências Energéticas', 'Faculdade de Ciências e Tecnologia', 'Delegação de Sofala', 'laboral', 0, 40, 'matematica', '', 'fisica', ''),
  ('unilicungo', 'course-unilicungo-quimica-ambiental', 'Química Ambiental', 'Faculdade de Ciências e Tecnologia', 'Delegação de Sofala', 'laboral', 0, 40, 'quimica', '', 'matematica', ''),
  ('unilicungo', 'course-unilicungo-ciencias-biologicas', 'Ciências Biológicas', 'Faculdade de Ciências e Tecnologia', 'Delegação de Sofala', 'laboral', 0, 40, 'quimica', '', 'biologia', ''),
  ('unilicungo', 'course-unilicungo-matematica-aplicada', 'Matemática Aplicada', 'Faculdade de Ciências e Tecnologia', 'Delegação de Sofala', 'laboral', 0, 40, 'matematica', '', 'fisica', ''),
  ('unilicungo', 'course-unilicungo-historia', 'História', 'Faculdade de Letras e Humanidades', 'Delegação de Sofala', 'laboral', 0, 40, 'historia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-historia', 'História', 'Faculdade de Letras e Humanidades', 'Delegação de Sofala', 'pos_laboral', 1, 60, 'historia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-jornalismo', 'Jornalismo', 'Faculdade de Letras e Humanidades', 'Delegação de Sofala', 'laboral', 0, 40, 'historia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-relacoes-internacionais-e-assistencia-humanitaria', 'Relações Internacionais e Assistência Humanitária', 'Faculdade de Letras e Humanidades', 'Delegação de Sofala', 'laboral', 0, 40, 'historia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-relacoes-internacionais-e-assistencia-humanitaria', 'Relações Internacionais e Assistência Humanitária', 'Faculdade de Letras e Humanidades', 'Delegação de Sofala', 'pos_laboral', 1, 60, 'historia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-ciencias-politicas-e-governacao', 'Ciências Políticas e Governação', 'Faculdade de Letras e Humanidades', 'Delegação de Sofala', 'laboral', 0, 40, 'historia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-sociologia', 'Sociologia', 'Faculdade de Letras e Humanidades', 'Delegação de Sofala', 'laboral', 0, 40, 'historia', '', 'portugues', 'II'),
  ('unilicungo', 'course-unilicungo-administracao-e-gestao-educacional', 'Administração e Gestão Educacional', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'pos_laboral', 0, 60, 'portugues', 'I', 'matematica', ''),
  ('unilicungo', 'course-unilicungo-ciencias-de-educacao', 'Ciências de Educação', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'laboral', 0, 40, 'portugues', 'I', 'historia', ''),
  ('unilicungo', 'course-unilicungo-ensino-basico', 'Ensino Básico', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'laboral', 0, 40, 'portugues', 'I', 'biologia', ''),
  ('unilicungo', 'course-unilicungo-psicologia-educacional-sofala', 'Psicologia Educacional (Sofala)', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'laboral', 0, 40, 'portugues', 'I', 'biologia', ''),
  ('unilicungo', 'course-unilicungo-psicologia-social-e-das-organizacoes-sofala', 'Psicologia Social e das Organizações (Sofala)', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'pos_laboral', 0, 60, 'biologia', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-educacao-visual', 'Educação Visual', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'laboral', 0, 40, 'desenho', '', 'matematica', ''),
  ('unilicungo', 'course-unilicungo-educacao-fisica-e-desportos', 'Educação Física e Desportos', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'laboral', 0, 40, 'biologia', '', 'aptidao-fisica', 'pratica'),
  ('unilicungo', 'course-unilicungo-educacao-fisica-e-desportos', 'Educação Física e Desportos', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'pos_laboral', 1, 60, 'biologia', '', 'aptidao-fisica', 'pratica'),
  ('unilicungo', 'course-unilicungo-ensino-de-portugues', 'Ensino de Português', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'laboral', 0, 40, 'portugues', 'II', 'historia', ''),
  ('unilicungo', 'course-unilicungo-ensino-de-quimica-sofala', 'Ensino de Química (Sofala)', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'pos_laboral', 0, 60, 'quimica', '', 'biologia', ''),
  ('unilicungo', 'course-unilicungo-pedagogia', 'Pedagogia', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'laboral', 0, 40, 'portugues', 'I', 'historia', ''),
  ('unilicungo', 'course-unilicungo-ensino-de-frances', 'Ensino de Francês', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'laboral', 0, 40, 'portugues', 'II', 'frances', ''),
  ('unilicungo', 'course-unilicungo-ensino-de-geografia-sofala', 'Ensino de Geografia (Sofala)', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'pos_laboral', 0, 60, 'geografia', '', 'historia', ''),
  ('unilicungo', 'course-unilicungo-ensino-de-biologia-sofala', 'Ensino de Biologia (Sofala)', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'laboral', 0, 40, 'biologia', '', 'quimica', ''),
  ('unilicungo', 'course-unilicungo-ensino-de-filosofia', 'Ensino de Filosofia', 'Faculdade de Psicologia e Ciências da Educação', 'Delegação de Sofala', 'laboral', 0, 40, 'portugues', 'II', 'filosofia', ''),
  ('unilicungo', 'course-unilicungo-gestao-de-empresas-sofala', 'Gestão de Empresas (Sofala)', 'Faculdade de Ciências Empresariais e Jurídicas', 'Delegação de Sofala', 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-gestao-de-empresas-sofala', 'Gestão de Empresas (Sofala)', 'Faculdade de Ciências Empresariais e Jurídicas', 'Delegação de Sofala', 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-gestao-dos-recursos-humanos-sofala', 'Gestão dos Recursos Humanos (Sofala)', 'Faculdade de Ciências Empresariais e Jurídicas', 'Delegação de Sofala', 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-gestao-dos-recursos-humanos-sofala', 'Gestão dos Recursos Humanos (Sofala)', 'Faculdade de Ciências Empresariais e Jurídicas', 'Delegação de Sofala', 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-contabilidade-e-financas', 'Contabilidade e Finanças', 'Faculdade de Ciências Empresariais e Jurídicas', 'Delegação de Sofala', 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-contabilidade-e-financas', 'Contabilidade e Finanças', 'Faculdade de Ciências Empresariais e Jurídicas', 'Delegação de Sofala', 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'I'),
  ('unilicungo', 'course-unilicungo-direito-sofala', 'Direito (Sofala)', 'Faculdade de Ciências Empresariais e Jurídicas', 'Delegação de Sofala', 'pos_laboral', 0, 60, 'portugues', 'II', 'historia', ''),
  ('unipungue', 'course-unipungue-lingua-inglesa', 'Língua Inglesa', 'Faculdade de Letras, Ciências Sociais e Humanidades', 'Manica', 'laboral', 0, 30, 'ingles', '', 'portugues', 'II'),
  ('unipungue', 'course-unipungue-ensino-de-geografia', 'Ensino de Geografia', 'Faculdade de Geociências e Ambiente', 'Manica', 'laboral', 0, 30, 'geografia', '', 'historia', ''),
  ('unipungue', 'course-unipungue-matematica-aplicada', 'Matemática Aplicada', 'Faculdade de Ciências Exactas e Tecnológicas', 'Manica', 'laboral', 0, 30, 'matematica', '', 'fisica', ''),
  ('unipungue', 'course-unipungue-gestao-estrategica-da-educacao', 'Gestão Estratégica da Educação', 'Faculdade de Educação', 'Manica', 'laboral', 0, 30, 'portugues', 'I', 'matematica', ''),
  ('unipungue', 'course-unipungue-ciencias-biologicas', 'Ciências Biológicas', 'Faculdade de Ciências Agrárias e Biológicas', 'Manica', 'laboral', 0, 30, 'biologia', '', 'quimica', ''),
  ('unipungue', 'course-unipungue-agronomia', 'Agronomia', 'Faculdade de Ciências Agrárias e Biológicas', 'Manica', 'laboral', 0, 30, 'biologia', '', 'quimica', ''),
  ('unipungue', 'course-unipungue-engenharia-de-energias-renovaveis', 'Engenharia de Energias Renováveis', 'Faculdade de Engenharia', 'Manica', 'laboral', 0, 30, 'fisica', '', 'matematica', ''),
  ('unipungue', 'course-unipungue-engenharia-de-mecanizacao-agricola', 'Engenharia de Mecanização Agrícola', 'Faculdade de Engenharia', 'Manica', 'laboral', 0, 30, 'fisica', '', 'matematica', ''),
  ('unipungue', 'course-unipungue-educacao-fisica-e-desporto', 'Educação Física e Desporto', 'Instituto Superior de Educação Física e Desporto', 'Manica', 'laboral', 0, 30, 'biologia', '', 'aptidao-fisica', 'pratica'),
  ('unipungue', 'course-unipungue-gestao-de-empresas', 'Gestão de Empresas', 'Escola Superior de Ciências Económicas e Contábeis', 'Manica', 'laboral', 0, 30, 'portugues', 'I', 'matematica', ''),
  ('unipungue', 'course-unipungue-linguistica', 'Linguística', 'Faculdade de Letras, Ciências Sociais e Humanidades', 'Tete', 'laboral', 0, 30, 'portugues', 'II', 'ingles', ''),
  ('unipungue', 'course-unipungue-geologia', 'Geologia', 'Faculdade de Geociências e Ambiente', 'Tete', 'laboral', 0, 30, 'quimica', '', 'fisica', ''),
  ('unipungue', 'course-unipungue-estatistica-e-ciencias-de-dados', 'Estatística e Ciências de Dados', 'Faculdade de Ciências Exactas e Tecnológicas', 'Tete', 'laboral', 0, 30, 'matematica', '', 'portugues', 'I'),
  ('unipungue', 'course-unipungue-psicologia-educacional', 'Psicologia Educacional', 'Faculdade de Educação', 'Tete', 'laboral', 0, 30, 'portugues', 'I', 'biologia', ''),
  ('unipungue', 'course-unipungue-biologia-aplicada', 'Biologia Aplicada', 'Faculdade de Ciências Agrárias e Biológicas', 'Tete', 'laboral', 0, 30, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-sociologia', 'Sociologia', 'Faculdade de Ciências Sociais e Filosofia', 'Nampula', 'laboral', 0, 50, 'portugues', 'II', 'historia', ''),
  ('unirovuma', 'course-unirovuma-historia', 'História', 'Faculdade de Ciências Sociais e Filosofia', 'Nampula', 'laboral', 0, 50, 'portugues', 'II', 'historia', ''),
  ('unirovuma', 'course-unirovuma-ensino-de-filosofia', 'Ensino de Filosofia', 'Faculdade de Ciências Sociais e Filosofia', 'Nampula', 'pos_laboral', 0, 70, 'portugues', 'II', 'filosofia', ''),
  ('unirovuma', 'course-unirovuma-antropologia', 'Antropologia', 'Faculdade de Ciências Sociais e Filosofia', 'Nampula', 'laboral', 0, 50, 'portugues', 'II', 'historia', ''),
  ('unirovuma', 'course-unirovuma-ciencias-politicas', 'Ciências Políticas', 'Faculdade de Ciências Sociais e Filosofia', 'Nampula', 'laboral', 0, 50, 'portugues', 'II', 'historia', ''),
  ('unirovuma', 'course-unirovuma-lingua-cultura-e-literatura-chinesa', 'Língua, Cultura e Literatura Chinesa', 'Faculdade de Letras', 'Nampula', 'laboral', 0, 25, 'portugues', 'II', 'ingles', ''),
  ('unirovuma', 'course-unirovuma-ensino-de-frances', 'Ensino de Francês', 'Faculdade de Letras', 'Nampula', 'laboral', 0, 45, 'portugues', 'II', 'frances', ''),
  ('unirovuma', 'course-unirovuma-lingua-portuguesa', 'Língua Portuguesa', 'Faculdade de Letras', 'Nampula', 'laboral', 0, 45, 'portugues', 'II', 'ingles', ''),
  ('unirovuma', 'course-unirovuma-ensino-de-ingles', 'Ensino de Inglês', 'Faculdade de Letras', 'Nampula', 'laboral', 0, 45, 'portugues', 'II', 'ingles', ''),
  ('unirovuma', 'course-unirovuma-ensino-de-ingles', 'Ensino de Inglês', 'Faculdade de Letras', 'Nampula', 'pos_laboral', 1, 60, 'portugues', 'II', 'ingles', ''),
  ('unirovuma', 'course-unirovuma-ensino-de-educacao-fisica-e-desporto', 'Ensino de Educação Física e Desporto', 'Faculdade de Educação e Psicologia', 'Nampula', 'laboral', 0, 50, 'biologia', '', 'aptidao-fisica', 'pratica'),
  ('unirovuma', 'course-unirovuma-pedagogia', 'Pedagogia', 'Faculdade de Educação e Psicologia', 'Nampula', 'laboral', 0, 50, 'portugues', 'I', 'matematica', ''),
  ('unirovuma', 'course-unirovuma-psicologia-nampula', 'Psicologia (Nampula)', 'Faculdade de Educação e Psicologia', 'Nampula', 'laboral', 0, 50, 'biologia', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-psicologia-nampula', 'Psicologia (Nampula)', 'Faculdade de Educação e Psicologia', 'Nampula', 'pos_laboral', 1, 60, 'biologia', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-fisica', 'Física', 'Faculdade de Ciências', 'Nampula', 'laboral', 0, 50, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-quimica', 'Química', 'Faculdade de Ciências', 'Nampula', 'laboral', 0, 50, 'quimica', '', 'biologia', ''),
  ('unirovuma', 'course-unirovuma-matematica', 'Matemática', 'Faculdade de Ciências', 'Nampula', 'laboral', 0, 50, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-biologia', 'Biologia', 'Faculdade de Ciências', 'Nampula', 'laboral', 0, 50, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-biologia', 'Biologia', 'Faculdade de Ciências', 'Nampula', 'pos_laboral', 1, 60, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-geografia-aplicada-e-gestao-de-territorio', 'Geografia Aplicada e Gestão de Território', 'Faculdade de Ciências', 'Nampula', 'laboral', 0, 50, 'geografia', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-gestao-do-ambiente-e-do-territorio', 'Gestão do Ambiente e do Território', 'Faculdade de Ciências', 'Nampula', 'laboral', 0, 50, 'geografia', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-estatistica-e-gestao-de-informacao', 'Estatística e Gestão de Informação', 'Faculdade de Ciências', 'Nampula', 'laboral', 0, 50, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-estatistica-e-gestao-de-informacao', 'Estatística e Gestão de Informação', 'Faculdade de Ciências', 'Nampula', 'pos_laboral', 1, 60, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-geologia', 'Geologia', 'Faculdade de Ciências', 'Nampula', 'laboral', 0, 50, 'quimica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-gestao-ambiental-e-desenvolvimento-comunitario-nampula', 'Gestão Ambiental e Desenvolvimento Comunitário (Nampula)', 'Faculdade de Ciências', 'Nampula', 'pos_laboral', 0, 60, 'geografia', '', 'portugues', 'II'),
  ('unirovuma', 'course-unirovuma-geoprocessamento-e-analise-de-risco', 'Geoprocessamento e Análise de Risco', 'Faculdade de Ciências', 'Nampula', 'pos_laboral', 0, 60, 'geografia', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-educacao-visual', 'Educação Visual', 'Faculdade de Engenharia', 'Nampula', 'laboral', 0, 45, 'desenho', '', 'matematica', ''),
  ('unirovuma', 'course-unirovuma-informatica-nampula', 'Informática (Nampula)', 'Faculdade de Engenharia', 'Nampula', 'laboral', 0, 45, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-engenharia-informatica', 'Engenharia Informática', 'Faculdade de Engenharia', 'Nampula', 'laboral', 0, 45, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-engenharia-informatica', 'Engenharia Informática', 'Faculdade de Engenharia', 'Nampula', 'pos_laboral', 1, 60, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-engenharia-de-construcao-civil', 'Engenharia de Construção Civil', 'Faculdade de Engenharia', 'Nampula', 'laboral', 0, 45, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-engenharia-de-construcao-civil', 'Engenharia de Construção Civil', 'Faculdade de Engenharia', 'Nampula', 'pos_laboral', 1, 60, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-engenharia-mecanica', 'Engenharia Mecânica', 'Faculdade de Engenharia', 'Nampula', 'laboral', 0, 45, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-engenharia-electrica', 'Engenharia Eléctrica', 'Faculdade de Engenharia', 'Nampula', 'laboral', 0, 45, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-engenharia-electrica', 'Engenharia Eléctrica', 'Faculdade de Engenharia', 'Nampula', 'pos_laboral', 1, 60, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-engenharia-electronica', 'Engenharia Electrónica', 'Faculdade de Engenharia', 'Nampula', 'laboral', 0, 45, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-engenharia-electronica', 'Engenharia Electrónica', 'Faculdade de Engenharia', 'Nampula', 'pos_laboral', 1, 60, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-contabilidade-e-fiscalidade-nampula', 'Contabilidade e Fiscalidade (Nampula)', 'Faculdade de Ciências Económicas e Empresariais', 'Nampula', 'laboral', 0, 50, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-contabilidade-e-fiscalidade-nampula', 'Contabilidade e Fiscalidade (Nampula)', 'Faculdade de Ciências Económicas e Empresariais', 'Nampula', 'pos_laboral', 1, 70, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-gestao-de-recursos-humanos-nampula', 'Gestão de Recursos Humanos (Nampula)', 'Faculdade de Ciências Económicas e Empresariais', 'Nampula', 'pos_laboral', 0, 70, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-gestao-de-empresas-nampula', 'Gestão de Empresas (Nampula)', 'Faculdade de Ciências Económicas e Empresariais', 'Nampula', 'pos_laboral', 0, 70, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-economia', 'Economia', 'Faculdade de Ciências Económicas e Empresariais', 'Nampula', 'laboral', 0, 50, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-direito-nampula', 'Direito (Nampula)', 'Faculdade de Direito', 'Nampula', 'laboral', 0, 45, 'portugues', 'II', 'historia', ''),
  ('unirovuma', 'course-unirovuma-direito-nampula', 'Direito (Nampula)', 'Faculdade de Direito', 'Nampula', 'pos_laboral', 1, 100, 'portugues', 'II', 'historia', ''),
  ('unirovuma', 'course-unirovuma-engenharia-agronomica-e-desenvolvimento-rural-nampula', 'Engenharia Agronómica e Desenvolvimento Rural (Nampula)', 'Faculdade de Ciências Alimentares e Agrárias (Campus de Namaita)', 'Nampula', 'laboral', 0, 50, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-tecnologia-e-seguranca-alimentar', 'Tecnologia e Segurança Alimentar', 'Faculdade de Ciências Alimentares e Agrárias (Campus de Namaita)', 'Nampula', 'laboral', 0, 50, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-comercio-agrario', 'Comércio Agrário', 'Faculdade de Ciências Alimentares e Agrárias (Campus de Namaita)', 'Nampula', 'laboral', 0, 50, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-comercio-agrario', 'Comércio Agrário', 'Faculdade de Ciências Alimentares e Agrárias (Campus de Namaita)', 'Nampula', 'pos_laboral', 1, 70, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-nutricao-e-seguranca-alimentar', 'Nutrição e Segurança Alimentar', 'Faculdade de Ciências Alimentares e Agrárias (Campus de Namaita)', 'Nampula', 'laboral', 0, 50, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-producao-e-sanidade-animal-nampula', 'Produção e Sanidade Animal (Nampula)', 'Faculdade de Ciências Alimentares e Agrárias (Campus de Namaita)', 'Nampula', 'laboral', 0, 50, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-gestao-ambiental-e-desenvolvimento-comunitario-nacala', 'Gestão Ambiental e Desenvolvimento Comunitário (Nacala)', 'Instituto Superior de Transporte, Logística e Telecomunicações', 'Nacala', 'laboral', 0, 40, 'geografia', '', 'portugues', 'II'),
  ('unirovuma', 'course-unirovuma-gestao-ambiental-e-desenvolvimento-comunitario-nacala', 'Gestão Ambiental e Desenvolvimento Comunitário (Nacala)', 'Instituto Superior de Transporte, Logística e Telecomunicações', 'Nacala', 'pos_laboral', 1, 50, 'geografia', '', 'portugues', 'II'),
  ('unirovuma', 'course-unirovuma-informatica-nacala', 'Informática (Nacala)', 'Instituto Superior de Transporte, Logística e Telecomunicações', 'Nacala', 'laboral', 0, 50, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-gestao-de-transportes-e-logistica', 'Gestão de Transportes e Logística', 'Instituto Superior de Transporte, Logística e Telecomunicações', 'Nacala', 'laboral', 0, 45, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-gestao-de-transportes-e-logistica', 'Gestão de Transportes e Logística', 'Instituto Superior de Transporte, Logística e Telecomunicações', 'Nacala', 'pos_laboral', 1, 70, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-gestao-de-empresas-nacala', 'Gestão de Empresas (Nacala)', 'Instituto Superior de Transporte, Logística e Telecomunicações', 'Nacala', 'laboral', 0, 40, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-gestao-de-recursos-humanos-nacala', 'Gestão de Recursos Humanos (Nacala)', 'Instituto Superior de Transporte, Logística e Telecomunicações', 'Nacala', 'pos_laboral', 0, 50, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-engenharia-agronomica-e-desenvolvimento-rural-niassa', 'Engenharia Agronómica e Desenvolvimento Rural (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'laboral', 0, 50, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-producao-e-sanidade-animal-niassa', 'Produção e Sanidade Animal (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'laboral', 0, 50, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-ciencias-alimentares-niassa', 'Ciências Alimentares (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'pos_laboral', 0, 70, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-ensino-de-biologia-niassa', 'Ensino de Biologia (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'laboral', 0, 50, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-psicologia-niassa', 'Psicologia (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'laboral', 0, 50, 'portugues', 'I', 'biologia', ''),
  ('unirovuma', 'course-unirovuma-geografia-aplicada', 'Geografia Aplicada', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'laboral', 0, 50, 'geografia', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-gestao-do-ambiente-e-territorio', 'Gestão do Ambiente e Território', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'pos_laboral', 0, 70, 'geografia', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-gestao-de-recursos-humanos-niassa', 'Gestão de Recursos Humanos (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'pos_laboral', 0, 70, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-contabilidade-e-fiscalidade-niassa', 'Contabilidade e Fiscalidade (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'laboral', 0, 50, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-contabilidade-e-fiscalidade-niassa', 'Contabilidade e Fiscalidade (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'pos_laboral', 1, 70, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-gestao-de-empresas-niassa', 'Gestão de Empresas (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'laboral', 0, 50, 'matematica', '', 'portugues', 'I'),
  ('unirovuma', 'course-unirovuma-direito-niassa', 'Direito (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'laboral', 0, 50, 'portugues', 'II', 'historia', ''),
  ('unirovuma', 'course-unirovuma-direito-niassa', 'Direito (Niassa)', 'Instituto Superior de Desenvolvimento Rural e Biociências', 'Niassa', 'pos_laboral', 1, 70, 'portugues', 'II', 'historia', ''),
  ('unirovuma', 'course-unirovuma-gestao-ambiental-e-desenvolvimento-comunitario-montepuez', 'Gestão Ambiental e Desenvolvimento Comunitário (Montepuez)', 'Instituto Superior de Recursos Naturais e Ambiente', 'Montepuez', 'pos_laboral', 0, 50, 'geografia', '', 'portugues', 'II'),
  ('unirovuma', 'course-unirovuma-ensino-de-quimica', 'Ensino de Química', 'Instituto Superior de Recursos Naturais e Ambiente', 'Montepuez', 'laboral', 0, 45, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-ensino-de-biologia-montepuez', 'Ensino de Biologia (Montepuez)', 'Instituto Superior de Recursos Naturais e Ambiente', 'Montepuez', 'laboral', 0, 45, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-ensino-de-matematica', 'Ensino de Matemática', 'Instituto Superior de Recursos Naturais e Ambiente', 'Montepuez', 'laboral', 0, 45, 'matematica', '', 'fisica', ''),
  ('unirovuma', 'course-unirovuma-engenharia-agronomica-e-desenvolvimento-rural-montepuez', 'Engenharia Agronómica e Desenvolvimento Rural (Montepuez)', 'Instituto Superior de Recursos Naturais e Ambiente', 'Montepuez', 'laboral', 0, 45, 'biologia', '', 'quimica', ''),
  ('unirovuma', 'course-unirovuma-ensino-de-historia', 'Ensino de História', 'Instituto Superior de Recursos Naturais e Ambiente', 'Montepuez', 'laboral', 0, 45, 'historia', '', 'geografia', ''),
  ('unirovuma', 'course-unirovuma-ciencias-alimentares-montepuez', 'Ciências Alimentares (Montepuez)', 'Instituto Superior de Recursos Naturais e Ambiente', 'Montepuez', 'laboral', 0, 40, 'biologia', '', 'quimica', '');

-- Essas disciplinas passam a existir em cada instituição (admissão)
INSERT INTO subject_scopes (id, subject_id, institution_id)
SELECT 'scope-' || i.key || '-' || s.slug, s.id, i.id
FROM _inst i, library_subjects s
WHERE s.slug IN (SELECT s1 FROM _edital WHERE inst_key = i.key UNION SELECT s2 FROM _edital WHERE inst_key = i.key)
ON CONFLICT DO NOTHING;

-- Provas (disciplina + variante) por instituição
INSERT INTO exam_papers (id, institution_id, subject_id, variant)
SELECT 'paper-' || p.inst_key || '-' || p.slug || CASE WHEN p.variant = '' THEN '' ELSE '-' || p.variant END, i.id, s.id, p.variant
FROM (SELECT inst_key, s1 AS slug, v1 AS variant FROM _edital UNION SELECT inst_key, s2, v2 FROM _edital) p
JOIN _inst i ON i.key = p.inst_key
JOIN library_subjects s ON s.slug = p.slug
ON CONFLICT DO NOTHING;

-- Cursos
INSERT INTO courses (id, institution_id, name, unit, campus, active)
SELECT DISTINCT ON (e.cid) e.cid, i.id, e.curso, e.unit, e.campus, true
FROM _edital e JOIN _inst i ON i.key = e.inst_key
ORDER BY e.cid
ON CONFLICT DO NOTHING;

-- Opções de exame (uma por curso e regime). Só nos cursos que ainda não têm nenhuma.
INSERT INTO course_exam_options (id, course_id, period, sort_order, vacancies)
SELECT 'opt-' || e.cid || '-' || e.periodo, c.id, e.periodo, e.ord, e.vagas
FROM _edital e
JOIN _inst i ON i.key = e.inst_key
JOIN courses c ON c.institution_id = i.id AND lower(c.name) = lower(e.curso)
WHERE NOT EXISTS (SELECT 1 FROM course_exam_options o WHERE o.course_id = c.id)
ON CONFLICT DO NOTHING;

-- As duas provas de cada opção (peso 50/50)
INSERT INTO course_exam_option_papers (option_id, paper_id, weight)
SELECT o.id, p.id, 50
FROM _edital e
JOIN _inst i ON i.key = e.inst_key
JOIN course_exam_options o ON o.id = 'opt-' || e.cid || '-' || e.periodo
JOIN library_subjects s ON s.slug IN (e.s1, e.s2)
JOIN exam_papers p ON p.institution_id = i.id AND p.subject_id = s.id AND p.variant = CASE WHEN s.slug = e.s1 THEN e.v1 ELSE e.v2 END
WHERE NOT EXISTS (SELECT 1 FROM course_exam_option_papers x WHERE x.option_id = o.id)
ON CONFLICT DO NOTHING;
