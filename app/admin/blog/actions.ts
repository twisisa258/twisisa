'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { blogSlugTaken, deleteBlogPost, getAdminPost, saveBlogPost, setBlogStatus } from '@/lib/blog'
import { checkBlogInput, isBlogStatus, type BlogInput, type BlogStatus } from '@/lib/blog-pure'

// Só a administração escreve no blog (estudantes e revisores nunca).
async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

// Páginas públicas que mudam quando um artigo publicado muda (ou passa a publicado / deixa de o ser).
function refreshPublic(slugs: (string | null | undefined)[]) {
  revalidatePath('/blog')
  revalidatePath('/blog/feed.xml')
  revalidatePath('/sitemap.xml')
  revalidatePath('/')
  for (const slug of new Set(slugs)) if (slug) revalidatePath(`/blog/${slug}`)
}
const refreshAdmin = () => revalidatePath('/admin/blog')

const str = (value: unknown, max = 100_000) => (typeof value === 'string' ? value.slice(0, max) : '')

export type SaveBlogPayload = { id: string | null; intent: 'save' | 'publish' | 'autosave'; fields: BlogInput }
export type SaveBlogResult =
  | { ok: true; id: string; slug: string; status: BlogStatus; message: string }
  | { ok: false; message: string }

// Guarda (cria ou atualiza). «save» e «autosave» não mudam o estado; «publish» publica. O auto-guardar só mexe em rascunhos
// e não vai para o registo de auditoria (seria uma linha por pausa de escrita); a criação, a gravação manual e a publicação ficam registadas.
export async function saveBlogPostAction(payload: SaveBlogPayload): Promise<SaveBlogResult> {
  let saved: { id: string; slug: string; status: BlogStatus; message: string } | null = null
  const result = await runAction(async () => {
    const admin = await requireAdmin()
    const id = typeof payload.id === 'string' && payload.id ? payload.id.slice(0, 80) : null
    const intent = payload.intent === 'publish' ? 'publish' : payload.intent === 'autosave' ? 'autosave' : 'save'
    const fields: BlogInput = {
      title: str(payload.fields?.title, 400),
      slug: str(payload.fields?.slug, 200),
      excerpt: str(payload.fields?.excerpt, 1000),
      body: str(payload.fields?.body),
      coverUrl: str(payload.fields?.coverUrl, 1000),
      coverAlt: str(payload.fields?.coverAlt, 500),
      track: str(payload.fields?.track, 20),
      subjectId: str(payload.fields?.subjectId, 120),
      themeId: str(payload.fields?.themeId, 120),
      tags: str(payload.fields?.tags, 1000),
    }
    const check = checkBlogInput(fields, intent === 'publish' ? 'publish' : 'draft')
    if (!check.ok) throw new AppError(check.message)
    if (id && intent === 'autosave') {
      const current = await getAdminPost(id)
      if (!current) throw new AppError('Este artigo já não existe.')
      if (current.status !== 'draft') throw new AppError('O auto-guardar só funciona em rascunhos.')
    }
    if (await blogSlugTaken(check.value.slug, id)) throw new AppError('Já existe um artigo com este endereço. Escolhe outro.')

    const done = await saveBlogPost({ id, clean: check.value, publish: intent === 'publish', userId: admin.id })
    if (!id) await logAdminAction(admin, 'blog.create', 'blog_post', done.id, { title: check.value.title, slug: done.slug })
    if (intent === 'publish') await logAdminAction(admin, 'blog.publish', 'blog_post', done.id, { title: check.value.title, slug: done.slug })
    else if (id && intent === 'save') await logAdminAction(admin, 'blog.update', 'blog_post', done.id, { title: check.value.title, slug: done.slug })

    refreshAdmin()
    if (intent === 'publish' || done.wasPublished || done.status === 'published') refreshPublic([done.slug, done.previousSlug])
    saved = {
      id: done.id,
      slug: done.slug,
      status: done.status,
      message: intent === 'publish' ? 'Artigo publicado.' : intent === 'autosave' ? 'Rascunho guardado.' : done.status === 'published' ? 'Alterações guardadas.' : 'Rascunho guardado.',
    }
  }, 'Não foi possível guardar o artigo. Tenta outra vez.')
  if (!result.ok || !saved) return { ok: false, message: result.ok ? 'Não foi possível guardar o artigo.' : result.message }
  return { ok: true, ...(saved as { id: string; slug: string; status: BlogStatus; message: string }) }
}

/** Verifica no servidor se o endereço está livre (o editor chama-a enquanto escreves). */
export async function checkBlogSlugAction(slug: string, id: string | null): Promise<{ taken: boolean }> {
  const admin = await getAdminUser()
  if (!admin) return { taken: false }
  const clean = str(slug, 200).trim().toLowerCase()
  if (!clean) return { taken: false }
  try {
    return { taken: await blogSlugTaken(clean, id && id.length <= 80 ? id : null) }
  } catch {
    return { taken: false }
  }
}

// Linha da lista: publicar, despublicar (volta a rascunho) e arquivar.
export async function setBlogStatusAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = String(formData.get('id') ?? '')
    const status = String(formData.get('status') ?? '')
    if (!id) throw new AppError('Artigo em falta.')
    if (!isBlogStatus(status)) throw new AppError('Estado inválido.')
    const done = await setBlogStatus(id, status)
    const action = status === 'published' ? 'blog.publish' : status === 'archived' ? 'blog.archive' : 'blog.unpublish'
    await logAdminAction(admin, action, 'blog_post', id, { title: done.title, slug: done.slug, from: done.previous })
    refreshAdmin()
    refreshPublic([done.slug])
    return status === 'published' ? 'Artigo publicado.' : status === 'archived' ? 'Artigo arquivado.' : 'Artigo despublicado: passou a rascunho.'
  }, 'Não foi possível mudar o estado do artigo.')
}

export async function deleteBlogPostAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = String(formData.get('id') ?? '')
    if (!id) throw new AppError('Artigo em falta.')
    const done = await deleteBlogPost(id)
    await logAdminAction(admin, 'blog.delete', 'blog_post', id, { title: done.title, slug: done.slug, wasPublished: done.wasPublished })
    refreshAdmin()
    refreshPublic([done.slug])
    return 'Artigo apagado.'
  }, 'Não foi possível apagar o artigo.')
}
