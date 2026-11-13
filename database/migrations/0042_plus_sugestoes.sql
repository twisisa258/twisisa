-- Preferência do aluno: ver ou não as sugestões do plano Plus (cartão ao entrar no painel e faixa).
-- Lida e escrita por lib/plano-sugestoes.ts; muda-se em Definições, «Plano».
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS plus_suggestions boolean NOT NULL DEFAULT true;
