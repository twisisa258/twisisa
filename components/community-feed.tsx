'use client'

import { useState } from 'react'
import { Heart, MessageCircle, PenLine, Send, Users } from 'lucide-react'
import { createPost } from '@/app/comunidade/actions'
import { useFeedback } from '@/components/feedback-provider'
import { Avatar } from '@/components/aluno/avatar'
import { publicName } from '@/lib/perfil'

type Post = { id: number; author: string; initials: string; image?: string | null; time: string; text: string }

const starterPosts: Post[] = [
  { id: 1, author: 'Comunidade Twisisa', initials: 'E', time: 'Agora', text: 'Partilha uma dúvida, uma descoberta ou uma dica de estudo com outros estudantes.' },
]

export function CommunityFeed({ me }: { me: { name: string; image: string | null } }) {
  const feedback = useFeedback()
  const [post, setPost] = useState('')
  const [posts, setPosts] = useState(starterPosts)
  const canPublish = post.trim().length > 0

  async function publishPost() {
    if (!canPublish) return
    const nextPost = post.trim()
    const id = Date.now()
    setPosts((current) => [{ id, author: publicName(me.name), initials: me.name, image: me.image, time: 'Agora', text: nextPost }, ...current])
    setPost('')
    // Se a gravação falhar, a publicação sai da lista e o texto volta à caixa para não se perder.
    const undo = (message: string) => { setPosts((current) => current.filter((item) => item.id !== id)); setPost(nextPost); feedback.error(message, 'Não foi possível publicar') }
    try {
      const result = await createPost(nextPost)
      if (!result.ok) undo(result.message)
    } catch {
      undo('Sem ligação ao servidor. Verifica a internet e tenta outra vez.')
    }
  }

  return <div className="space-y-5">
    <form onSubmit={(event) => { event.preventDefault(); publishPost() }} className="rounded-2xl border border-[#e0e2d9] bg-white p-5">
      <div className="flex items-start gap-3"><Avatar name={me.name} image={me.image} size={40} /><textarea value={post} onChange={(event) => setPost(event.target.value)} placeholder="O que queres partilhar?" aria-label="Escreve uma publicação" rows={3} className="min-w-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[#9da49d]" /></div>
      <div className="mt-4 flex items-center justify-between border-t border-[#edf0e8] pt-3"><span className="flex items-center gap-2 text-xs text-[#7a8179]"><PenLine size={14} /> Partilha conhecimento, não dados pessoais.</span><button type="submit" disabled={!canPublish} className="inline-flex items-center gap-2 rounded-full bg-[#1d4d41] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Publicar <Send size={14} /></button></div>
    </form>
    {posts.map((item) => <article key={item.id} className="rounded-2xl border border-[#e0e2d9] bg-white p-5"><div className="flex items-center gap-3"><Avatar name={item.initials} image={item.image} size={36} /><div><p className="text-sm font-semibold">{item.author}</p><p className="text-xs text-[#899088]">{item.time}</p></div></div><p className="mt-4 text-sm leading-6 text-[#4f574f]">{item.text}</p><div className="mt-4 flex gap-5 border-t border-[#edf0e8] pt-3 text-xs text-[#7a8179]"><span className="inline-flex items-center gap-1"><Heart size={14} /> Gostar</span><span className="inline-flex items-center gap-1"><MessageCircle size={14} /> Responder</span></div></article>)}
    <div className="rounded-2xl bg-[#eee9dc] p-5"><div className="flex items-center gap-3"><Users className="text-[#1d4d41]" size={20} /><p className="text-sm font-semibold text-[#1d4d41]">Uma comunidade focada em aprender</p></div><p className="mt-2 text-sm leading-6 text-[#62675e]">Segue boas conversas, encontra colegas e mantém o foco no teu percurso académico.</p></div>
  </div>
}
