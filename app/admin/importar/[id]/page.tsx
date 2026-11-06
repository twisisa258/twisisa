import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { getImportDetail } from '@/lib/importar-exame'
import { MathText, plainExcerpt } from '@/lib/math-text'
import { AdminLoadError, AdminPage } from '@/components/admin/page-parts'
import { ImportarLote } from '@/components/admin/importar-lote'

export const dynamic = 'force-dynamic'
// A leitura de um lote (PDF + dois pedidos ao Jonas) pode demorar.
export const maxDuration = 60
export const metadata = { title: 'Importar exame | Administração | Twisisa' }

const CONFIDENCE = {
  alta: { label: 'Resposta segura', tone: 'bg-sucesso-suave text-sucesso-texto' },
  media: { label: 'Rever resposta', tone: 'bg-aviso-suave text-aviso-texto' },
  baixa: { label: 'Resposta incerta', tone: 'bg-erro-suave text-erro-texto' },
} as const

export default async function AdminImportarDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const { id } = await params
  if (!/^[\w-]{1,100}$/.test(id)) notFound()

  let detail: Awaited<ReturnType<typeof getImportDetail>> | undefined
  try {
    detail = await getImportDetail(id)
  } catch (error) {
    console.error('[ADMIN IMPORTAR DETALHE]', error)
    return <AdminPage><AdminLoadError href={`/admin/importar/${id}`} /></AdminPage>
  }
  if (!detail) notFound()

  const missing = [!detail.institution && 'instituição', !detail.subjectId && 'disciplina'].filter(Boolean)
  const rows = [
    ['Instituição', detail.institution ?? '—'],
    ['Ano', detail.year ? String(detail.year) : '—'],
    ['Disciplina', detail.subject ?? '—'],
    ['Páginas', detail.pages ? String(detail.pages) : 'ainda não lido'],
    ['Próxima questão', detail.status === 'concluida' ? 'leitura concluída' : String(detail.nextNumber)],
  ]
  const lowCount = detail.questions.filter((item) => item.confidence !== 'alta').length

  return (
    <AdminPage>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/importar" className="inline-flex items-center gap-1.5 text-sm font-semibold text-marca no-underline"><ArrowLeft size={15} aria-hidden /> Importar exames</Link>
          <h1 className="mt-2 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{detail.title}</h1>
        </div>
        <a href={`/api/biblioteca/${detail.id}/ficheiro`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-[#dfe3d9] bg-white px-4 text-sm font-semibold text-[#526057] no-underline hover:bg-[#f3f4ef]"><ExternalLink size={15} aria-hidden /> Abrir o PDF</a>
      </div>

      <dl className="grid shrink-0 grid-cols-2 gap-3 rounded-2xl border border-[#e3e7dc] bg-white p-4 sm:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-texto-2">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {missing.length > 0 && (
        <p role="status" className="shrink-0 rounded-xl bg-aviso-suave px-4 py-3 text-sm text-aviso-texto">
          Falta a {missing.join(' e a ')} deste documento. O Jonas tenta descobri-la, mas é mais seguro defini-la em <Link href="/admin/materiais" className="font-semibold underline">Materiais académicos</Link>.
        </p>
      )}
      {detail.status === 'erro' && detail.lastError && <p role="alert" className="shrink-0 rounded-xl bg-erro-suave px-4 py-3 text-sm text-erro-texto">{detail.lastError}</p>}

      <section className="shrink-0 rounded-2xl border border-[#e3e7dc] bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-assistente" aria-hidden /> O Jonas lê 10 questões de cada vez</div>
        <p className="mt-1 text-sm text-texto-2">Fórmulas em LaTeX, opções separadas e a resposta proposta. Tudo entra como <strong className="font-semibold text-texto">rascunho</strong>: nada chega aos alunos antes de o rever e confirmar em <Link href="/admin/questoes" className="font-semibold text-marca">Banco de questões</Link>. As respostas são verificadas por uma segunda resolução independente.</p>
        <div className="mt-4"><ImportarLote materialId={detail.id} concluida={detail.status === 'concluida'} nextNumber={detail.nextNumber} temLote={detail.questions.length > 0} /></div>
      </section>

      {detail.questions.length > 0 && (
        <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#e3e7dc] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#edf0e9] px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold">Questões importadas ({detail.questions.length})</h2>
            {lowCount > 0 && <span className="text-xs text-texto-2">{lowCount} para rever com atenção</span>}
          </div>
          <ul className="max-h-[56dvh] divide-y divide-[#edf0e9] overflow-y-auto">
            {detail.questions.map((item) => (
              <li key={item.id}>
                <Link href={`/admin/questoes?editar=${item.id}`} className="flex items-start gap-3 px-4 py-3 text-texto no-underline hover:bg-[#f6f8f3] sm:px-5">
                  <span className="mt-0.5 w-7 shrink-0 text-xs font-semibold tabular-nums text-texto-2">{item.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm"><MathText text={plainExcerpt(item.statement, 150)} /></span>
                    {item.note && <span className="mt-0.5 block text-xs text-texto-2">{item.note}</span>}
                  </span>
                  {item.correctLetter && <span className="mt-0.5 shrink-0 text-xs font-semibold text-texto-2">Resp. {item.correctLetter}</span>}
                  <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${CONFIDENCE[item.confidence].tone}`}>{CONFIDENCE[item.confidence].label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AdminPage>
  )
}
