# Administração de materiais académicos

## Acesso

1. Configure `ADMIN_EMAILS` no ambiente da aplicação com os emails das contas autorizadas, separados por vírgulas. Exemplo: `ADMIN_EMAILS=admin@exemplo.com,conteudos@exemplo.com`.
2. Inicie sessão com uma dessas contas.
3. Abra `/admin/materiais`.
4. Preencha os metadados, escolha o documento e aguarde o fim do carregamento. O material é publicado no catálogo após a gravação.

A autorização é verificada no servidor, ao abrir a página, ao pedir a assinatura de upload e ao executar a acção de criação. Um utilizador sem permissão é redireccionado para a área do estudante; a acção e a rota de assinatura recusam pedidos não autorizados.

## Armazenamento (Cloudinary)

O documento é enviado directamente do browser para o Cloudinary com uma assinatura gerada no servidor (`/api/admin/cloudinary-sign`). O ficheiro não passa pelo servidor da aplicação, por isso não há o limite de corpo das funções da Vercel. A base de dados guarda o URL seguro devolvido pelo Cloudinary e os metadados.

Variáveis de ambiente (servidor): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. O segredo nunca é enviado ao browser.

Em contas gratuitas, o Cloudinary bloqueia por omissão a entrega de PDF e ZIP. Active "Allow delivery of PDF and ZIP files" em Settings, Security, antes de publicar PDF.

A acção de criação só aceita URLs de `https://res.cloudinary.com/<CLOUDINARY_CLOUD_NAME>/`. Tipos aceites: PDF, Word, PowerPoint, Excel e imagens (jpg, png, webp). Tamanho máximo verificado no browser: 10 MB (o Cloudinary aplica o limite do plano).

## Base de dados

A página depende das tabelas do catálogo (`library_categories`, `library_subjects`, `library_levels` e `academic_materials`) criadas pela migração `database/migrations/0004_library_catalog.sql`. Execute as migrações existentes no ambiente antes de usar a página.
