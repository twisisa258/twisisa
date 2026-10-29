-- Ranking real (pontos = soma de attempt_items.points). O aluno pode sair do ranking (privacidade).
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS show_in_ranking boolean NOT NULL DEFAULT true;
-- A consulta do ranking filtra por pontos > 0 e por data da resposta.
CREATE INDEX IF NOT EXISTS attempt_items_answered_points_idx ON attempt_items (answered_at) WHERE points > 0;
