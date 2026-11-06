import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decideAnswer, matchByName, matchVariant, parseExtraction, parseSolutions, stripOptionPrefix, windowFor, type Extracted } from '../lib/importar-exame-pure'

const raw = `Aqui está:
@@META
disciplina: Matemática
variante: I
ano: 2023
instituicao: UEM
@@Q 2
dificuldade: fácil
tema: Limites
resposta: B
origem: resolvida
confianca: alta
@@ENUNCIADO
Calcule o limite:
$\\lim_{x\\to 0}\\frac{\\sin x}{x}$
@@OPCOES
A) 0
B) 1
C) 2
D) $\\infty$
@@EXPLICACAO
Limite notável.
@@FIM
@@Q 1
figura: sim
@@ENUNCIADO
Observe a figura.
@@OPCOES
A) a
B) b
@@FIM
@@Q 3
resposta: A
@@ENUNCIADO
Qual é a soma?
@@OPCOES
A) 1
@@FIM
@@Q 4
resposta: A
@@ENUNCIADO
Repetidas
@@OPCOES
A) x
B) X
C) y
@@FIM
@@Q 5
origem: gabarito
resposta: Z
@@ENUNCIADO
Quanto é 2+2?
@@OPCOES
A) 3
B) 4
   continuação da opção B
C) 5
@@FIM
@@ULTIMA nao`

test('lê, limpa e ordena as questões extraídas (LaTeX intacto)', () => {
  const parsed = parseExtraction(raw)!
  assert.deepEqual(parsed.meta, { disciplina: 'Matemática', variante: 'I', ano: 2023, instituicao: 'UEM' })
  assert.deepEqual(parsed.questoes.map((q) => q.numero), [2, 5])
  assert.equal(parsed.questoes[0].enunciado, 'Calcule o limite:\n$\\lim_{x\\to 0}\\frac{\\sin x}{x}$')
  assert.deepEqual(parsed.questoes[0].opcoes, ['0', '1', '2', '$\\infty$'])
  assert.equal(parsed.questoes[0].correta, 1)
  assert.equal(parsed.questoes[0].dificuldade, 'facil')
  assert.equal(parsed.questoes[0].explicacao, 'Limite notável.')
  assert.equal(parsed.questoes[1].correta, null)
  assert.equal(parsed.questoes[1].origem, 'gabarito')
  assert.equal(parsed.questoes[1].opcoes[1], '4 continuação da opção B')
  assert.deepEqual(parsed.ignoradas.map((i) => i.numero), [1, 3, 4])
  assert.equal(parsed.ultima, false)
  assert.equal(parseExtraction('sem marcas'), null)
})

test('prefixos de opção', () => {
  assert.equal(stripOptionPrefix('A) cem'), 'cem')
  assert.equal(stripOptionPrefix('(c) 12'), '12')
  assert.equal(stripOptionPrefix('B. $x$'), '$x$')
  assert.equal(stripOptionPrefix('Alfa'), 'Alfa')
  assert.equal(stripOptionPrefix('A 2'), 'A 2')
})

test('verificação independente', () => {
  const map = parseSolutions('@@RESPOSTAS\n2: b\n5) D\nx: A\n12. (C)')
  assert.deepEqual([...map.entries()], [[2, 1], [5, 3], [12, 2]])
})

const base: Extracted = { numero: 1, enunciado: 'q', opcoes: ['a', 'b', 'c'], correta: 1, origem: 'resolvida', confianca: 'alta', dificuldade: 'media', tema: '', explicacao: '' }
test('confiança da resposta', () => {
  assert.deepEqual(decideAnswer(base, 1), { correct: 1, confidence: 'alta', note: null })
  assert.equal(decideAnswer({ ...base, confianca: 'media' }, 1).confidence, 'media')
  assert.equal(decideAnswer(base, 2).confidence, 'baixa')
  assert.equal(decideAnswer(base, null).confidence, 'baixa')
  assert.deepEqual(decideAnswer({ ...base, origem: 'gabarito' }, 1).confidence, 'alta')
  assert.equal(decideAnswer({ ...base, origem: 'gabarito' }, 0).correct, 1)
  assert.deepEqual(decideAnswer({ ...base, correta: null }, 2), { correct: 2, confidence: 'baixa', note: 'Só a verificação deu resposta.' })
  assert.equal(decideAnswer({ ...base, correta: null }, null).correct, null)
})

test('janela de texto e nomes', () => {
  const text = 'Cabeçalho\n' + '1. a\n'.repeat(5) + 'x'.repeat(40000) + '\n21. alvo da questão'
  assert.ok(windowFor(text, 21).includes('21. alvo'))
  assert.equal(windowFor('curto', 5), 'curto')
  const items = [{ name: 'Matemática' }, { name: 'Física' }]
  assert.equal(matchByName(items, 'matematica')?.name, 'Matemática')
  assert.equal(matchByName(items, 'Física I')?.name, 'Física')
  assert.equal(matchByName(items, ''), null)
})

test('variante nunca confunde I com II', () => {
  const items = [{ name: 'II' }, { name: 'I' }]
  assert.equal(matchVariant(items, 'I')?.name, 'I')
  assert.equal(matchVariant([{ name: 'II' }], 'I'), null)
  assert.equal(matchVariant([{ name: 'Matemática II' }, { name: 'Matemática I' }], 'I')?.name, 'Matemática I')
})
