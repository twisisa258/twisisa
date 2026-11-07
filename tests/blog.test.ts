import assert from 'node:assert/strict'
import { test } from 'node:test'
import { slugify } from '../lib/slug'
import { checkBlogInput, isPublicNow, parseTags, readingMinutes, slugFromTitle, type BlogInput } from '../lib/blog-pure'
import { parseBlogMarkdown, parseInline, safeHref, safeImageSrc, showToc, splitCells, tableOfContents } from '../lib/blog-markdown'

const base: BlogInput = { title: 'Como estudar para o exame', slug: '', excerpt: 'Um guia curto.', body: 'Texto do artigo.', coverUrl: '', coverAlt: '', track: '', subjectId: '', themeId: '', tags: '' }

test('slugify: acentos, símbolos e limites', () => {
  assert.equal(slugify('Como estudar Matemática: funções & limites!'), 'como-estudar-matematica-funcoes-limites')
  assert.equal(slugify('  --Educação Física--  '), 'educacao-fisica')
  assert.equal(slugFromTitle('a'.repeat(120)).length, 90)
  assert.equal(slugFromTitle('x'.repeat(89) + ' yyyy').endsWith('-'), false)
})

test('tempo de leitura: 200 palavras por minuto, mínimo 1, ignora fórmulas e código', () => {
  assert.equal(readingMinutes(''), 1)
  assert.equal(readingMinutes('palavra '.repeat(200)), 1)
  assert.equal(readingMinutes('palavra '.repeat(201)), 2)
  assert.equal(readingMinutes('palavra '.repeat(400)), 2)
  assert.equal(readingMinutes(`${'palavra '.repeat(10)}\n\n$$${'x + '.repeat(500)}$$\n\n\`\`\`\n${'codigo '.repeat(500)}\n\`\`\``), 1)
  assert.equal(readingMinutes(`[${'a '.repeat(200).trim()}](https://exemplo.mz/${'b'.repeat(2000)})`), 1)
})

test('visibilidade: só publicado e já na hora', () => {
  const now = new Date('2026-11-07T10:00:00Z')
  assert.equal(isPublicNow({ status: 'published', publishedAt: new Date('2026-11-07T09:59:59Z') }, now), true)
  assert.equal(isPublicNow({ status: 'published', publishedAt: new Date('2026-11-07T10:00:00Z') }, now), true)
  assert.equal(isPublicNow({ status: 'published', publishedAt: new Date('2026-11-07T10:00:01Z') }, now), false)
  assert.equal(isPublicNow({ status: 'published', publishedAt: null }, now), false)
  assert.equal(isPublicNow({ status: 'draft', publishedAt: new Date('2026-01-01') }, now), false)
  assert.equal(isPublicNow({ status: 'archived', publishedAt: new Date('2026-01-01') }, now), false)
})

test('validação: rascunho, publicação e limites', () => {
  const ok = checkBlogInput(base, 'publish')
  assert.equal(ok.ok, true)
  if (ok.ok) assert.equal(ok.value.slug, 'como-estudar-para-o-exame')
  assert.equal(checkBlogInput({ ...base, title: 'Curto' }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, title: 'Four' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, title: 'x'.repeat(121) }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, slug: 'Maiúsculas' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, slug: 'ab' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, slug: 'dois--hifens' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, slug: 'pre-visualizar' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, excerpt: 'x'.repeat(161) }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, excerpt: 'x'.repeat(160) }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, excerpt: '', body: '' }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, excerpt: '' }, 'publish').ok, false)
  assert.equal(checkBlogInput({ ...base, body: '  ' }, 'publish').ok, false)
  assert.equal(checkBlogInput({ ...base, coverUrl: 'http://x.mz/a.jpg', coverAlt: 'a' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, coverUrl: 'https://x.mz/a.jpg' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, coverUrl: 'https://x.mz/a.jpg', coverAlt: 'Alunos a estudar' }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, track: '11' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, track: 'admissao' }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, themeId: 't1' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, subjectId: 's1', themeId: 't1' }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, tags: 'a,b,c,d,e,f,g,h,i' }, 'draft').ok, false)
})

test('etiquetas: minúsculas, sem repetidas', () => {
  assert.deepEqual(parseTags('Exame, exame ,  Dicas de Estudo\n\n12ª classe'), ['exame', 'dicas de estudo', '12ª classe'])
})

test('Markdown: títulos, ids únicos e índice só com 3 ou mais h2', () => {
  const blocks = parseBlogMarkdown('# Um\n\nTexto\n\n## Dois\n\n### Sub\n\n## Dois\n')
  const toc = tableOfContents(blocks)
  assert.deepEqual(toc.map((item) => [item.level, item.id]), [[2, 'um'], [2, 'dois'], [3, 'sub'], [2, 'dois-2']])
  assert.equal(showToc(toc), true)
  assert.equal(showToc(toc.slice(0, 2)), false)
})

test('Markdown: listas, citações, tabelas e fórmulas', () => {
  const src = '- a\n- b **forte**\n\n1. um\n2. dois\n\n> citação\n\n| x | y |\n|---|:-:|\n| $|a|$ | 2 |\n\n$$\\frac{a}{b}$$\n\nTexto com $x^2$ e \\$5.'
  const blocks = parseBlogMarkdown(src)
  assert.deepEqual(blocks.map((block) => block.t), ['ul', 'ol', 'quote', 'table', 'math', 'p'])
  const table = blocks[3]
  assert.equal(table.t === 'table' && table.rows[0][0][0].t, 'math')
  assert.equal(table.t === 'table' && table.align[1], 'center')
  assert.deepEqual(splitCells('| a | $|b|$ | c\\|d |'), ['a', '$|b|$', 'c|d'])
  const para = blocks[5]
  assert.equal(para.t === 'p' && para.c.some((item) => item.t === 'math' && item.v === 'x^2'), true)
  assert.equal(para.t === 'p' && para.c.some((item) => item.t === 'text' && item.v.includes('$5')), true)
})

test('sanitização: HTML fica texto e endereços perigosos são recusados', () => {
  const html = parseBlogMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')
  assert.equal(html.every((block) => block.t === 'p' && block.c.every((item) => item.t === 'text')), true)
  assert.equal(safeHref('javascript:alert(1)'), null)
  assert.equal(safeHref('JaVaScRiPt:alert(1)'), null)
  assert.equal(safeHref('java\nscript:alert(1)'), null)
  assert.equal(safeHref(' javascript:alert(1)'), null)
  assert.equal(safeHref('data:text/html;base64,AAAA'), null)
  assert.equal(safeHref('vbscript:x'), null)
  assert.equal(safeHref('//evil.com/x'), null)
  assert.equal(safeHref('https://twisisa.com/blog'), 'https://twisisa.com/blog')
  assert.equal(safeHref('/aluno/simulador'), '/aluno/simulador')
  assert.equal(safeHref('mailto:ajuda@twisisa.com'), 'mailto:ajuda@twisisa.com')
  assert.equal(safeHref('#secao-1'), '#secao-1')
  assert.equal(safeImageSrc('http://x.mz/a.png'), null)
  assert.equal(safeImageSrc('javascript:alert(1)'), null)
  assert.equal(safeImageSrc('https://res.cloudinary.com/x/a.png'), 'https://res.cloudinary.com/x/a.png')

  const link = parseInline('[ver](javascript:alert(1)) e [ok](https://twisisa.com)')
  assert.equal(link.some((item) => item.t === 'link' && item.href.startsWith('javascript')), false)
  assert.equal(link.some((item) => item.t === 'link' && item.href === 'https://twisisa.com'), true)
  assert.deepEqual(parseBlogMarkdown('![x](javascript:alert(1))').map((block) => block.t), ['p'])
  assert.deepEqual(parseBlogMarkdown('![Capa](https://res.cloudinary.com/x/a.png)').map((block) => block.t), ['image'])
})

test('Markdown: texto enorme ou marcas por fechar não rebentam', () => {
  const started = Date.now()
  parseBlogMarkdown('**'.repeat(9000))
  parseBlogMarkdown(`${'['.repeat(5000)}x`)
  parseBlogMarkdown('> '.repeat(50) + 'fundo')
  assert.equal(parseBlogMarkdown('**aberto sem fechar').length, 1)
  assert.equal(Date.now() - started < 3000, true)
})
