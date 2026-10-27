-- Simulador: variantes de exame (ex.: UEM Matemática I, II, III) e pontos por resposta certa.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS variant text CHECK (variant IS NULL OR char_length(variant) BETWEEN 1 AND 60);
CREATE INDEX IF NOT EXISTS questions_subject_variant_idx ON questions(subject_id, variant) WHERE status = 'publicada';

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS variant text;
-- Pontos ganhos em cada resposta (base do ranking).
ALTER TABLE attempt_items ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0 CHECK (points >= 0);
