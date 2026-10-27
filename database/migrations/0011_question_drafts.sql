-- Questões por concluir: o editor de «Adicionar questão» guarda o que já foi escrito (mesmo incompleto),
-- para o admin retomar do ponto onde ficou. Não é o banco de questões: estas linhas não chegam ao aluno.
-- `finished_at` marca um trabalho que já virou questão (ou foi descartado): impede que um guardamento
-- automático atrasado o ressuscite. As linhas terminadas e as abandonadas há muito são limpas pela aplicação.
CREATE TABLE IF NOT EXISTS question_drafts (
  id text PRIMARY KEY CHECK (id ~ '^qd-[0-9a-zA-Z-]{8,64}$'),
  admin_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  payload jsonb NOT NULL,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS question_drafts_open_idx ON question_drafts (admin_id, updated_at DESC) WHERE finished_at IS NULL;
