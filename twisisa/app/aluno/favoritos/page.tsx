import Link from 'next/link'
import { BookOpen, ExternalLink, Bookmark } from 'lucide-react'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { pool } from '@/lib/db'
import { relativeTime } from '@/lib/relative-time'
import { requireStudent } from '@/lib/require-student'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Materiais guardados' }

type Saved = { id: string; title: string; category: string; subject: string | null; at: Date }

async function loadSaved(userId: string): Promise<Saved[]> {
  const rows = (
    await pool.query(
      `SELECT m.id, m.title, c.name AS category, s.name AS subject, f.created_at
       FROM library_favorites f JOIN academic_materials m ON m.id = f.material_id JOIN library_categories c ON c.id = m.category_id LEFT JOIN library_subjects s ON s.id = m.subject_id
       WHERE f.user_id = $1 AND m.status = 'approved' ORDER BY f.created_at DESC LIMIT 200`,
      [userId],
    )
  ).rows
  return rows.map((r) => ({ id: r.id, title: r.title, category: r.category, subject: r.subject ?? null, at: new Date(r.created_at) }))
}

export default async function FavoritosPage() {
  const session = await requireStudent('/aluno/favoritos')
  const items = await loadSaved(session.user.id).catch((error: unknown) => {
    console.error('[FAVORITOS]', error)
    return null
  })
  return (
    <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="A minha biblioteca" title="Materiais guardados." description="Os materiais que guardaste na Biblioteca." icon={Bookmark} tone="ajuda">
      {items === null ? (
        <div className="rounded-2xl border border-linha bg-white p-6"><p className="text-[15px] font-medium">Não foi possível carregar os teus materiais</p><p className="mt-1 text-sm text-texto-2">Tenta outra vez daqui a pouco.</p></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-linha bg-white p-6">
          <p className="text-[15px] font-medium">Ainda não guardaste nenhum material</p>
          <p className="mt-1 text-sm text-texto-2">Na Biblioteca, toca em guardar num material e ele aparece aqui.</p>
          <Link href="/biblioteca" className="btn btn-primario mt-4">Abrir a Biblioteca</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <a href={`/api/biblioteca/${encodeURIComponent(item.id)}/ficheiro`} target="_blank" rel="noopener" className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-linha bg-white p-3 no-underline">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ajuda-suave text-ajuda"><BookOpen size={20} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-texto">{item.title}</span>
                  <span className="block truncate text-[12px] text-texto-2">{item.category}{item.subject ? ` · ${item.subject}` : ''} · guardado {relativeTime(item.at)}</span>
                </span>
                <ExternalLink size={16} className="shrink-0 text-texto-2" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
    </StudentFeatureShell>
  )
}
