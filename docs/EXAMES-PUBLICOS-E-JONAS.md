# Exames públicos (Google), temas principais e importação com o Jonas

Pedido do dono do produto (2026-11-05). Estado no fim.

## 1. Ideia
Quem pesquisa no Google «Exame de admissão de Matemática UEM» deve chegar a uma página do Twisisa com o exame, os temas a estudar e a prática. Visitantes **leem** sem conta; **descarregar** o PDF exige conta (por agora é o único obstáculo). Os exames já estão na Biblioteca, por isso o Jonas ajuda a administração a passá-los para questões, em vez de as escrever uma a uma.

## 2. Páginas públicas (indexáveis, `/exames`)
| Endereço | Conteúdo |
|---|---|
| `/exames` | Universidades com conteúdo |
| `/exames/uem` | Disciplinas da universidade |
| `/exames/uem/matematica` | «Exame de admissão de Matemática UEM»: os 10 temas principais, exames anteriores para ler, cursos que pedem a disciplina, botões «Praticar» e «Descarregar os temas em PDF» |
| `/exames/uem/matematica/<id>` | Um exame: título para o Google («Exame de admissão de Matemática UEM 2023 (II)»), leitor do PDF sem conta, «Descarregar o PDF» |
| `/exames/uem/matematica/temas.pdf` | PDF dos temas (exige conta) |
- Tudo vem da base de dados: universidades, disciplinas, exames aprovados na categoria «Exames» da Biblioteca e temas **publicados**. Só aparece o que tem conteúdo.
- SEO: título e descrição por página, canonical, Open Graph, dados estruturados (Breadcrumb, LearningResource, ItemList) e entrada no `sitemap.xml`.
- A leitura pública (`/api/publico/exames/<id>`) só serve PDFs aprovados da categoria «Exames» e não é indexada; o Google indexa a página.
- Descarregar: `/api/biblioteca/<id>/ficheiro?baixar=1`. Sem sessão, vai para `/sign-up?next=<página>` e volta à página.
- As páginas da Biblioteca dos alunos continuam fechadas e `noindex`.

## 3. Temas principais (admin: `/admin/temas-principais`)
- 10 temas por instituição e disciplina (`key_topics`): título, resumo e dica. Texto simples, sem LaTeX.
- «Gerar com o Jonas»: usa os temas que mais aparecem nas questões já importadas e a lista de temas da disciplina. Entra como rascunho; o admin edita e publica. Só o publicado aparece no site e no PDF.
- Publicar exige pelo menos 3 temas.

## 4. Importar exames com o Jonas (admin: `/admin/importar`)
1. Lista os PDFs de exames da Biblioteca, por instituição, com o estado: por ler, a meio, concluída, com erro.
2. Em cada documento: «Ler as próximas 10 questões». O Jonas lê o texto do PDF, identifica disciplina, variante, ano e instituição (usa o que já está no material), separa enunciado e opções, escreve as fórmulas em LaTeX e segue a regra de apresentação do enunciado (contexto, dados, pergunta).
3. **Resposta certa**: se o documento tem gabarito, usa-o; senão o Jonas resolve. Uma **segunda resolução independente** confirma: coincidem = «segura»; divergem = «incerta». Sem resposta, a questão é ignorada.
4. Tudo entra como **rascunho**, resposta «sugestão», com a origem (instituição, ano, disciplina, variante). Nada chega aos alunos antes de rever e publicar em `/admin/questoes`. Cada questão fica ligada ao documento e ao nº original (`question_sources`).
5. «Desfazer o último lote» apaga os rascunhos desse lote e volta a ler do mesmo ponto.
- Questões que dependem de figuras ou gráficos ficam de fora (a leitura é só de texto).
- PDFs **digitalizados** (sem texto) não se leem: o sistema avisa. A leitura por imagem é uma fase futura.
- Em matemática, o texto extraído do PDF perde estrutura das fórmulas; o Jonas reconstrói, mas a revisão humana é obrigatória.

## 5. Para instalar
`npm install unpdf pdf-lib` (leitura de PDF e geração do PDF dos temas). Migrações 0037 (importação) e 0038 (temas principais).

## 6. Estado e por fazer
| Parte | Estado |
|---|---|
| Importar exames com o Jonas | FEITO (falta teste com PDFs reais) |
| Temas principais (admin + Jonas) | FEITO (falta teste) |
| Páginas públicas, SEO, sitemap, PDF | FEITO (falta teste) |
| Leitura de PDFs digitalizados (imagem) | por fazer |
| Páginas por curso (`/cursos/<instituição>/<curso>`) com as duas disciplinas | por fazer |
| Mostrar a confiança da resposta em `/admin/questoes` | por fazer |
| Pesquisa dentro das páginas públicas | por fazer |
