# Administração de materiais académicos

## Acesso

1. Configure `ADMIN_EMAILS` no ambiente da aplicação com os emails das contas autorizadas, separados por vírgulas. Exemplo: `ADMIN_EMAILS=admin@exemplo.com,conteudos@exemplo.com`.
2. Inicie sessão com uma dessas contas.
3. Abra `/admin/materiais`.
4. Clique em **Adicionar** (abre `/admin/materiais/novo`). Escolha vários ficheiros ou uma pasta inteira (também se pode arrastar).
5. Em «Para todos os documentos» defina uma vez a categoria, disciplina, classe, instituição, ano e curso. O que ficar em branco é detetado pelo nome do ficheiro e pelas pastas (ex.: `Matemática/UEM/2023/Exame 12ª classe.pdf`). Prioridade: valor escolhido para o material > valor para todos > deteção automática.
6. Para corrigir alguns: selecione as linhas e aplique um valor a todas de uma vez («Aplicar aos selecionados»). Os títulos editam-se na própria linha.
7. Clique em **Publicar**. Os ficheiros vão para o Cloudinary 3 de cada vez e são registados em remessas de 20; as falhas ficam na lista para «Repetir». Ficheiros com o mesmo nome de um já existente aparecem como «Já existe».

A disciplina, a instituição, a categoria e a classe são escolhidas das listas existentes (Disciplinas, Instituições…), não escritas à mão. Para uma disciplina nova, crie-a primeiro em `/admin/disciplinas`.

A autorização é verificada no servidor, ao abrir a página, ao pedir a assinatura de upload e ao executar a acção de criação. Um utilizador sem permissão é redireccionado para a área do estudante; a acção e a rota de assinatura recusam pedidos não autorizados.

## Armazenamento (Cloudinary)

O documento é enviado directamente do browser para o Cloudinary com uma assinatura gerada no servidor (`/api/admin/cloudinary-sign`). O ficheiro não passa pelo servidor da aplicação, por isso não há o limite de corpo das funções da Vercel. A base de dados guarda o URL seguro devolvido pelo Cloudinary e os metadados.

Variáveis de ambiente (servidor): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. O segredo nunca é enviado ao browser.

Em contas gratuitas, o Cloudinary bloqueia por omissão a entrega de PDF e ZIP. Active "Allow delivery of PDF and ZIP files" em Settings, Security, antes de publicar PDF.

A acção de criação só aceita URLs de `https://res.cloudinary.com/<CLOUDINARY_CLOUD_NAME>/`. Tipos aceites: PDF, Word, PowerPoint, Excel e imagens (jpg, png, webp). Tamanho máximo verificado no browser: 10 MB (o Cloudinary aplica o limite do plano).

## Base de dados

A página depende das tabelas do catálogo (`library_categories`, `library_subjects`, `library_levels` e `academic_materials`) criadas pela migração `database/migrations/0004_library_catalog.sql`. Execute as migrações existentes no ambiente antes de usar a página.
