-- Percurso «Outra classe» (8ª, 9ª, 11ª ou texto livre) e notificações com imagem e botão.

-- O conteúdo (questões, módulos, disciplinas) continua só nas 10ª, 12ª e admissão: `track` não muda.
-- Quem escolhe «Outra» fica com `track` vazio e a classe em `other_level`.
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS other_level text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_other_level_check') THEN
    ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_other_level_check CHECK (other_level IS NULL OR (char_length(btrim(other_level)) BETWEEN 1 AND 40 AND track IS NULL AND institution_id IS NULL));
  END IF;
END $$;

-- Notificações: texto longo, imagem opcional e botão opcional (mensagens promocionais).
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_href text;
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
