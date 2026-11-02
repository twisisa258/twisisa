import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Flag } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { pool } from '@/lib/db'
import { relativeTime } from '@/lib/relative-time'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader } from '@/components/admin/page-parts'
import { EmptyState } from '@/components/states/empty-state'
import { resolveReport } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reportes | Administração | Twisisa' }

const REASONS: Record<string, string> = { enunciado: 'Erro no enunciado', resposta: 'Resposta certa duvidosa', figura: 'Figura ilegível', outro: 'Outro' }

type Row = { id: string; questionId: string; reason: string; note: string | null; statement: string; subject: string; at: Date; count: number }

export default async function AdminReportesPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  let rows: Row[] | null = null
  try {
    const result = await pool.query(
      `SELECT r.id, r.question_id, r.reason, r.note, r.created_at, q.statement, s.name AS subject,
              (SELECT count(*)::int FROM question_reports x WHERE x.question_id = r.question_id AND x.status = 'aberto') AS count
       FROM question_reports r JOIN questions q ON q.id = r.question_id JOIN library_subjects s ON s.id = q.subject_id
       WHERE r.status = 'aberto' ORDER BY count DESC, r.created_at DESC LIMIT 100`,
    )
    rows = result.rows.map((r) => ({ id: r.id, questionId: r.question_id, reason: r.reason, note: r.note ?? null, statement: r.statement, subject: r.subject, at: new Date(r.created_at), count: r.count }))
  } catch (error) {
    console.error('[ADMIN REPORTES]', error)
  }
  return (
    <AdminPage>
      <AdminPageHeader icon={Flag} title="Reportes" description="Questões que os alunos assinalaram como erradas ou ilegíveis. As mais reportadas vêm primeiro." />
      <AdminListPanel>
        {rows === null ? (
          <AdminLoadError href="/admin/reportes" />
        ) : rows.length === 0 ? (
          <EmptyState icon={Flag} title="Sem reportes abertos" description="Quando um aluno reportar uma questão, ela aparece aqui." />
        ) : (
          <ul className="divide-y divide-[#eceee7]">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-aviso">{REASONS[row.reason] ?? row.reason}{row.count > 1 ? ` · ${row.count} reportes nesta questão` : ''}</p>
                  <p className="mt-1 line-clamp-2 text-[14px]">{row.statement}</p>
                  {row.note && <p className="mt-1 text-[13px] text-texto-2">«{row.note}»</p>}
                  <p className="mt-1 text-xs text-texto-2">{row.subject} · {relativeTime(row.at)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/admin/questoes?q=${encodeURIComponent(row.statement.slice(0, 40))}`} className="btn btn-secundario">Ver questão</Link>
                  <form action={resolveReport}><input type="hidden" name="id" value={row.id} /><button type="submit" className="btn btn-terciario">Resolvido</button></form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminListPanel>
    </AdminPage>
  )
}
