# Edital dos Exames de Admissão 2027: UP-Maputo, UniLicungo, UniPúnguè e UniRovuma

## Fonte e confirmação
- Anúncio oficial da UP-Maputo (20/10/2026): https://up.ac.mz/anuncios/edital-2027. Confirma os exames de 12 a 15 de Janeiro de 2027 e as candidaturas online até 5 de Dezembro de 2026.
- Edital em PDF: https://up.ac.mz/files/2026/10/Edital_UPM_2027.pdf. É um PDF digitalizado, sem texto que se possa ler por máquina.
- Quadros de cursos, vagas e provas: transcritos do artigo https://sovagas.co.mz/edital-up-2027/ (reproduz o edital, assinado em Maputo a 13/10/2026 pela Coordenadora da Comissão de Exames de Admissão, Mestre Sheila António Sitoe Rangel). **Conferido por soma**: as vagas de cada faculdade/instituto batem com os subtotais do edital e os totais por universidade também (4.990 + 3.840 + 2.340 + 4.920 = 16.090). As provas de cada curso não têm esta verificação: convém uma leitura final contra o PDF oficial.

## Prazos e valores
| O quê | Quando / quanto |
|---|---|
| Candidatura online e pagamento | 20 de Outubro a 5 de Dezembro de 2026, em candidaturas.up.ac.mz |
| Taxa de inscrição | 1.000,00 MT, não reembolsável, só no Millennium BIM (balcão, IZI, BIM Internet Banking ou ATM do BIM), com a Entidade e a Referência geradas pelo sistema |
| Exames (época única) | 12 a 15 de Janeiro de 2027 |
| Repescagem (recandidatura) | 8 a 9 de Março de 2027; matrícula dos repescados 12 a 16 de Março |
| Matrícula (UP-Maputo e UniLicungo) | 17/02 a 03/03/2027; UniPúnguè e UniRovuma publicam depois |
| Revisão de exame | 1.000,00 MT por exame; pedido até 48 h depois dos resultados |
| Certificado da 12ª classe | até 90 dias depois do início das matrículas |

Resultados, salas e horários: portal candidaturas.up.ac.mz e aplicação UPKwiK. Cada candidato escolhe **uma** universidade e **um** curso, com um único código de candidato (5 dígitos).

## Calendário dos exames
| Data | Disciplina (hora) |
|---|---|
| 12/01/2027 | Aptidão Física (Fase I) 08:00, Aptidão em Desenho 08:00, Educação Visual 08:00, Fundamentos de Filosofia 08:00, Geografia 10:30, Química 14:00 |
| 13/01/2027 | Inglês 08:00, Aptidão Física (Fase II) 08:00, Desenho Técnico (Geometria Descritiva) 08:00, Matemática 10:30 |
| 14/01/2027 | Francês 08:00, Física 08:00, Biologia 10:30, História 14:00 |
| 15/01/2027 | Português I 08:00, Português II 10:30 |

Quem falta a um dos exames não é admitido. Aptidão Física e Medicina exigem atestado de saúde.

## Regras no dia do exame
- Chegar 45 minutos antes, com documento de identificação com fotografia. Não se entra 20 minutos depois do início.
- Lápis de carvão HB (ou esferográfica preta ou azul). Proibidos: esferográfica vermelha, corrector, dicionário, calculadora, telemóvel e relógios inteligentes.
- Exames de **escolha múltipla**, excepto Aptidão em Desenho, Educação Visual, Desenho Técnico e Aptidão Física.
- Os locais (escola e sala) saem na plataforma até uma semana antes; o candidato deve consultá-los até 72 horas antes.

## O que ficou na plataforma (migrações 0033 e 0034)
| Instituição | Cursos | Opções (regime) | Vagas com exame | Concurso documental (fora) |
|---|---|---|---|---|
| UP-Maputo | 50 | 91 | 4.990 | 0 |
| UniLicungo | 57 | 65 | 3.140 | 700 vagas, 5 cursos EaD |
| UniPúnguè | 15 | 15 | 450 | 1.890 vagas, 29 ofertas (pós-laboral e EaD) |
| UniRovuma | 62 | 77 | 4.080 | 840 vagas, 7 cursos do ISEAD |

- **Concurso Documental (CD)** não tem exame de admissão: esses cursos não entraram, porque não há provas para treinar.
- Cada opção guarda as **vagas** do edital (coluna nova `vacancies`).
- O regime **à distância (EaD)** passou a existir como período (`ead`), junto de laboral e pós-laboral. EaD de vários centros do mesmo curso junta-se numa só opção, com as vagas somadas.
- Cursos com o mesmo nome em campus diferentes da mesma instituição (UniLicungo, UniPúnguè, UniRovuma) levam o campus no nome: «Informática (Quelimane)», «Informática (Sofala)». O campus e a faculdade ficam também nos campos próprios.
- A migração só cria o que ainda não existe e não mexe em nada que o admin já tenha criado. Instituições já existentes são reconhecidas pelo nome (a UP pode já existir como «UP»).
- **Nenhum curso destes editais tem mais de uma combinação de provas.** Por isso a pergunta «Que provas vais fazer?» não aparece a quem escolhe estes cursos; aparece na UEM.

## Provas: como foram ligadas às disciplinas
| No edital | Na plataforma |
|---|---|
| Português I / Português II | Português, variante I / II |
| Matemática, Física, Química, Biologia, História, Geografia, Inglês, Francês | a disciplina, sem variante |
| Fundamentos de Filosofia | Filosofia |
| Aptidão em Desenho | Desenho (a mesma da UEM; confirmar) |
| Educação Visual | Educação Visual (disciplina nova) |
| Desenho Técnico (Geometria Descritiva) | Desenho Técnico (Geometria Descritiva) (disciplina nova) |
| Aptidão Física | Aptidão Física, prova prática |

Cada disciplina fica associada às quatro instituições (âmbito de admissão), para o banco de questões.

## A confirmar
1. **Pesos das provas**: o edital resumido não os indica; entraram 50/50.
2. Leitura final das provas de cada curso contra o PDF oficial (digitalizado).
3. **Aptidão em Desenho** reaproveita a disciplina «Desenho» da UEM; se forem provas diferentes, separar.
4. Datas de matrícula da UniPúnguè e da UniRovuma (por publicar).
5. A **UEM** também publicou o edital 2027: falta carregar (a plataforma tem o de 2026).

## Para o calendário (fase 6)
Quando existir a tabela de datas, lançar: candidaturas até 5/12/2026 (prazo importante para avisar quem ainda não se candidatou), exames de 12 a 15/01/2027 (por disciplina, ver acima), resultados, repescagem e matrículas.
