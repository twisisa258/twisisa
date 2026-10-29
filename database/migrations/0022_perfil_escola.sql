-- Perfil do aluno: província e escola (opcionais). A foto usa user.image (já existe).
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS school text;
