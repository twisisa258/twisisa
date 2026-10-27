"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'

const articles = [
  { slug: 'como-organizar-estudo-para-exames', category: 'Método de estudo', title: 'Como organizar o estudo para os exames', text: 'Um ponto de partida simples para criar ritmo sem estudar tudo de uma vez.', date: 'Guia' },
  { slug: 'rever-matematica-com-exercicios', category: 'Disciplinas', title: 'Rever Matemática com exercícios', text: 'Estratégias para identificar lacunas e transformar erros em progresso.', date: 'Aula' },
  { slug: 'preparar-candidatura-universidade', category: 'Admissão', title: 'Preparar a candidatura à universidade', text: 'Checklist de estudo e organização para começares com clareza.', date: 'Guia' },
]

export function EditorialFeed() {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => articles.filter((article) => `${article.title} ${article.text} ${article.category}`.toLowerCase().includes(query.toLowerCase())), [query])
  return <div className="space-y-6">
    <label className="block"><span className="sr-only">Pesquisar conteúdos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar artigos e guias" className="w-full rounded-2xl border border-[#dfe3d9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1d4d41]" /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      {filtered.map((article) => <article key={article.slug} className="rounded-[24px] border border-[#e1e4db] bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9188]">{article.category} · {article.date}</p><h2 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{article.title}</h2><p className="mt-2 text-sm leading-6 text-[#727a73]">{article.text}</p><Link href={`/blog/${article.slug}`} className="mt-6 inline-flex text-sm font-semibold text-[#1d4d41]">Ler conteúdo <span aria-hidden="true" className="ml-2">↗</span></Link></article>)}
    </div>
    {filtered.length === 0 && <p className="rounded-2xl border border-dashed border-[#cfd5ca] p-6 text-sm text-[#727a73]">Não encontrámos conteúdos com essa pesquisa.</p>}
  </div>
}
