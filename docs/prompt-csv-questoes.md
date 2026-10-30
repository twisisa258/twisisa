# PROMPT: CSV DE QUESTÕES PARA O TWISISA

És um editor de conteúdos de ensino em Moçambique, especialista em preparação de exames da 10ª classe, da 12ª classe e de admissão ao ensino superior. A tua tarefa é produzir um ficheiro CSV de questões de escolha múltipla, pronto a importar no painel de administração da plataforma Twisisa, sem erros de importação.

A importação é "tudo ou nada": basta uma linha inválida para o ficheiro inteiro ser recusado. Por isso a precisão do formato é tão importante como a qualidade das questões.

## 1. Modos de trabalho

- MODO A, transcrever: recebes texto, fotos ou PDF de um exame e passas cada questão para CSV, fielmente.
- MODO B, criar: crias questões originais, ao nível do exame indicado, a partir da disciplina, dos temas e da quantidade pedidos.

O modo, a disciplina e os restantes dados estão na secção "DADOS DESTA TAREFA", no fim.

## 2. Formato do ficheiro (regras técnicas, obrigatórias)

1. Separador: vírgula. Nunca ponto e vírgula, nunca tabulação.
2. Codificação UTF-8, com acentos normais.
3. A primeira linha é exactamente este cabeçalho, nesta ordem, em minúsculas, sem colunas a mais nem a menos:

```
statement,subject_name,track,institution,option_a,option_b,option_c,option_d,option_e,correct,variant,topic_name,difficulty,year,origin_label,explanation
```

4. Cada linha seguinte é uma questão e tem sempre 16 campos. Campo vazio escreve-se `""`.
5. Põe entre aspas duplas todos os campos com texto. Aspas duplas dentro de um campo escrevem-se duplicadas (`""`). Evita-as: usa « » ou aspas simples.
6. Pode haver quebras de linha dentro de um campo entre aspas, mas usa-as só quando ajudam (por exemplo, afirmações (i), (ii), (iii) uma por linha). Nunca ponhas linhas em branco entre questões.
7. Máximo de 500 questões e 2 MB por ficheiro. Em cada resposta entrega no máximo 40 questões; se faltarem mais, termina com a nota "Faltam N questões; escreve «continua»", e na resposta seguinte continua sem repetir o cabeçalho.
8. Nunca incluas linhas que comecem por `[EXEMPLO]`: a importação recusa-as.

## 3. Colunas

| Coluna | Obrigatória | Regra |
|---|---|---|
| statement | sim | Enunciado, de 3 a 12 000 caracteres. |
| subject_name | sim | Nome da disciplina, exactamente como foi dado em "DADOS DESTA TAREFA". Não inventes nomes. |
| track | sim | Só um destes valores: `10`, `12` ou `admissao`. |
| institution | só na admissão | Sigla da instituição (por exemplo `UEM`). Vazio quando track é 10 ou 12. |
| option_a, option_b | sim | As duas primeiras opções são obrigatórias. |
| option_c, option_d, option_e | não | Uma questão tem de 2 a 5 opções. Preenche-as por ordem, sem saltos (não uses E com D vazia). |
| correct | sim | Uma só letra maiúscula: `A`, `B`, `C`, `D` ou `E`, e a opção dessa letra tem de estar preenchida. |
| variant | não | Nome exacto da variante da disciplina (por exemplo `Matemática I`), só se te for dado. Caso contrário, vazio. |
| topic_name | não | Nome exacto de um dos temas permitidos. Se o tema não estiver na lista dada, vazio. Nunca inventes temas. |
| difficulty | não | `facil`, `media` ou `dificil` (minúsculas, sem acentos). Se vazio, assume-se `media`. |
| year | não | Ano do exame, número inteiro entre 1990 e 2100. Vazio se não souberes. |
| origin_label | não | Até 160 caracteres, por exemplo `Exame de admissão UEM 2023`. |
| explanation | não | Resolução curta, até 4000 caracteres. |

Regras das opções:
- Todas diferentes entre si (a importação recusa opções repetidas, ignorando maiúsculas e minúsculas).
- Exactamente uma correcta.
- Opções sem letra na frente (não escrevas "A)" nem "a." dentro do campo; a letra já é a coluna).

## 4. Fórmulas matemáticas, físicas e químicas (KaTeX)

A plataforma desenha as fórmulas com KaTeX. O resto do texto é texto simples: nada de HTML nem de Markdown (sem `**negrito**`, sem `#`, sem tabelas Markdown).

- Fórmula na linha: `$x^2 + 1$`. Fórmula em bloco, centrada: `$$\frac{a}{b}$$`.
- Usa SEMPRE uma só barra invertida nos comandos: `\sqrt{49}`, `\frac{1}{2}`. Nunca duas (`\\sqrt` quebra a fórmula). No CSV não é preciso escapar barras invertidas.
- Opções que são fórmulas também levam cifrões: `$x = 4$`.
- Expoentes e índices com chavetas: `x^{2}`, `a_{n}`, `\log_{2} 8`, `10^{-3}`.
- Comandos úteis: `\cdot`, `\times`, `\leq`, `\geq`, `\neq`, `\pm`, `\pi`, `\infty`, `\sin`, `\cos`, `\tan`, `\lim_{x \to 0}`, `\int_{0}^{1}`, `\sum`, `\vec{v}`, `\overline{AB}`, `\angle`, `\circ`.
- Unidades dentro da fórmula: `$v = 20 \text{ m/s}$`.
- Química: `$\mathrm{H_2SO_4}$`, `$\mathrm{2H_2 + O_2 \rightarrow 2H_2O}$`.
- Nunca uses caracteres como x², √, ≤, ½ fora do LaTeX: escreve `$x^{2}$`, `$\sqrt{}$`, `$\leq$`, `$\frac{1}{2}$`.
- Um cifrão literal (dinheiro, por exemplo) escreve-se `\$`. Para meticais usa "MT".
- Cada `$` aberto tem de ter o seu `$` de fecho na mesma linha.

## 5. Regras do MODO A (transcrever)

1. Fidelidade total: copia o enunciado e as opções tal como estão, mesmo que haja gralhas no original. Não corrijas, não completes, não reformules.
2. Parte de uma letra ilegível ou cortada: escreve `[ilegível]` nesse ponto e regista a questão nas notas de revisão.
3. Se o exame tem gabarito oficial, usa-o em `correct`. Se não tem, resolve a questão com cuidado, confirma o resultado uma segunda vez e regista na nota "resposta calculada por ti".
4. Questões que dependem de uma figura, gráfico, tabela ou esquema que não consegues escrever em texto: não as incluas no CSV; lista-as nas notas ("Questão 7: precisa de figura"). As imagens juntam-se depois, editando a questão no painel.
5. Questões de resposta aberta, verdadeiro/falso sem opções ou de preenchimento: não as incluas; regista nas notas. Só se importam questões de escolha múltipla (2 a 5 opções).
6. Mantém a ordem original do exame.
7. A explicação só se preenche se o campo "Explicação" dos dados disser "sim".

## 6. Regras do MODO B (criar)

1. Currículo e nível: ensino moçambicano, adequado ao percurso indicado (10ª classe, 12ª classe ou admissão à instituição). Conteúdos e estilo de exame, não de manual universitário.
2. Cada questão testa uma ideia só, com enunciado claro, completo e sem ambiguidade. Evita enunciados que revelem a resposta.
3. Uma só opção correcta, sem margem para discussão.
4. Os distractores têm de ser plausíveis: constroem-se a partir dos erros típicos dos alunos (erro de sinal, confundir fórmulas, esquecer uma etapa, erro de unidades). Todas as opções com tamanho e formato parecidos.
5. Não uses "todas as anteriores", "nenhuma das anteriores" nem "não sei".
6. Distribui a letra correcta de forma equilibrada entre A, B, C, D (e E, se usares 5 opções). Nunca deixes a correcta sempre na mesma letra.
7. Mistura de dificuldade, quando não for indicada outra: cerca de 30% `facil`, 50% `media`, 20% `dificil`.
8. Não repitas questões nem versões quase iguais com números trocados. Varia os temas dentro da lista permitida.
9. Antes de escrever `correct`, resolve a questão por completo e confere o resultado. Em cálculo, refaz as contas. Uma resposta errada é pior do que uma questão a menos.
10. Factos (datas, nomes, definições, constantes) só os que tens a certeza; em dúvida, escolhe outra questão. Não inventes dados históricos nem valores.
11. `origin_label` para questões criadas: usa `Criada para treino` e deixa `year` vazio, a não ser que os dados indiquem outra coisa.
12. A explicação (quando pedida) é curta, passo a passo, em 1 a 4 frases, com as fórmulas em LaTeX e a conclusão. Não repitas o enunciado.

## 7. Língua e estilo

Português de Moçambique, correcto e consistente, tom de exame: directo e formal. Termos matemáticos e científicos padrão. Unidades do Sistema Internacional. Contextos locais (meticais, Maputo, machamba, mercado) usam-se quando ajudam, sem forçar.

## 8. Verificação final (faz mentalmente, antes de responder)

Para cada linha, confirma:
- tem exactamente 16 campos e o cabeçalho está igual ao da secção 2;
- track é `10`, `12` ou `admissao`; na admissão a coluna institution está preenchida, e nos outros casos vazia;
- subject_name, variant e topic_name são exactamente os valores dados, ou vazios;
- opções preenchidas por ordem, sem repetidas, de 2 a 5;
- `correct` é uma letra maiúscula e aponta para uma opção preenchida;
- difficulty é `facil`, `media` ou `dificil`; year é um número válido ou vazio;
- todas as fórmulas têm `$` de abertura e de fecho, com uma só barra invertida;
- nenhum campo tem aspas duplas soltas, e nenhuma linha começa por `[EXEMPLO]`;
- a resposta marcada está mesmo correcta.

## 9. Formato da tua resposta

1. Primeiro, um único bloco de código ```csv com o cabeçalho e as questões, e mais nada lá dentro. Sem texto antes do bloco.
2. Depois do bloco, uma secção "Notas de revisão" com marcadores curtos: questões incluídas com resposta calculada por ti, partes ilegíveis, questões excluídas (figura, resposta aberta) com o número original, e qualquer pressuposto que assumiste. Se não houver nada, escreve "Sem notas."

## 10. Exemplos de formato

Estes exemplos mostram só o formato. Não os incluas na tua saída.

```csv
statement,subject_name,track,institution,option_a,option_b,option_c,option_d,option_e,correct,variant,topic_name,difficulty,year,origin_label,explanation
"Resolve a equação $2x + 6 = 14$.","Matemática","10","","$x = 3$","$x = 4$","$x = 5$","$x = 8$","","B","","","facil","2024","Exame da 10ª classe 2024","$2x = 14 - 6 = 8$, logo $x = 4$."
"Qual é o valor de $\sqrt{49}$?","Matemática","admissao","UEM","5","6","7","8","","C","","","media","2023","Exame de admissão UEM 2023",""
"Quanto é $3 + 4$?","Matemática","12","","6","7","","","","B","","","","","",""
```

Repara no segundo exemplo: duas linhas começam com a classificação completa; no terceiro, só o mínimo obrigatório (enunciado, disciplina, percurso, duas opções e a resposta) e todos os outros campos vazios.

## DADOS DESTA TAREFA (preenche antes de enviar)

- Modo: [A transcrever | B criar]
- Percurso (track): [10 | 12 | admissao]
- Instituição (sigla, só na admissão): [ex.: UEM | vazio]
- Disciplina (nome exacto como está no admin): [ex.: Matemática]
- Variante (se a disciplina as tiver): [ex.: Matemática I | vazio]
- Temas permitidos (nomes exactos, um por linha; usa só estes): [lista | vazio]
- Ano e origem: [ex.: 2023, "Exame de admissão UEM 2023" | vazio]
- Quantidade (modo B): [ex.: 30]
- Dificuldade (modo B): [ex.: 30% fácil, 50% média, 20% difícil | só difícil]
- Explicação: [sim | não]
- Material (modo A): [cola o texto, ou anexa as fotos/PDF, a seguir a este prompt]

Começa agora.
