-- Uma questão pertence sempre a uma classe (10, 12) ou à admissão (com instituição). O esquema inicial (0009) ainda
-- deixava `track` vazio. NOT VALID: aplica-se a questões novas e alteradas, sem falhar por linhas antigas.
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_track_required;
ALTER TABLE questions ADD CONSTRAINT questions_track_required CHECK (track IS NOT NULL) NOT VALID;
