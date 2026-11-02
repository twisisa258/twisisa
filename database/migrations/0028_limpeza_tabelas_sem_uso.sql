-- Limpeza: tabelas sem leitura nem escrita no código (State.md, itens 16 e «Comunidade»).
-- A Comunidade era fictícia (pessoas fixas; «seguir» gravava ids que não eram utilizadores) e foi retirada.
-- ATENÇÃO: apaga dados. Se alguma destas tabelas tiver conteúdo que queiras guardar, exporta-o antes de correr `npm run migrate`.
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS study_progress CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
