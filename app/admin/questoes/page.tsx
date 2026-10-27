import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, ArchiveRestore, CheckCircle2, CircleHelp, Copy, Download, Eye, Pencil, Trash2 } from 'lucide-react'
import { getStaffAccess } from '@/lib/staff'
import { listInstitutions, type InstitutionRow } from '@/lib/institutions'
import { listSubjects, type SubjectRow } from '@/lib/subjects'
import { listTopics, type TopicRow } from '@/lib/classification'
import { listVariants, type VariantRow } from '@/lib/variants'
import { ANSWER_SOURCES, answerSourceLabel, countByStatus, DIFFICULTIES, difficultyLabel, getQuestion, listQuestions, ORIGINS, originLabel, STATUSES, type QuestionDetail, type QuestionListItem, type QuestionStatus } from '@/lib/questions'
import { examYearOptions } from '@/lib/years'
import { MathText, plainExcerpt } from '@/lib/math-text'
import { getOpenDraft, listOpenDrafts, type OpenDraft } from '@/lib/question-drafts'
import { relativeTime } from '@/lib/relative-time'
import { bulkManageQuestions, deleteQuestion, discardQuestionDraft, duplicateQuestion, importQuestionsCsv, saveQuestion, setQuestionStatus } from './actions'
import { QuestionBulkForm } from '@/components/admin/question-bulk-form'
import { QuestionForm, type EditorValue } from './question-form'
import { RowMenu } from '@/components/admin/row-menu'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminPager, AdminSearchBar, AdminTabs, normalizeSearch } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Questões | Administração | Twisisa' }

const PAGE_SIZE = 15
const LETTERS = ['A', 'B', 'C', 'D', 'E']

function href(tab: string, q: string, page: number, extra = '') {
  const params = new URLSearchParams()
  if (tab !== 'rascunhos') params.set('estado', tab)
  if (q) params.set('q', q)
  if (page > 1) params.set('pagina', String(page))
  if (extra) params.set(extra.split('=')[0], extra.split('=')[1])
  const query = params.toString()
  return `/admin/questoes${query ? `?${query}` : ''}`
}

function toEditorValue(question: QuestionDetail): EditorValue {
  return {
    id: question.id,
    status: question.status,
    statement: question.statement,
    explanation: question.explanation ?? '',
    options: question.options,
    track: question.track,
    institutionId: question.institutionId ?? '',
    subjectId: question.subjectId,
    topicId: question.topicId ?? '',
    difficulty: question.difficulty,
    origin: question.origin,
    answerSource: question.answerSource,
    originLabel: question.originLabel ?? '',
    year: question.examYear ? String(question.examYear) : '',
    variant: question.variant ?? '',
  }
}

function MaybeBulk({ enabled, status, children }: { enabled: boolean; status: QuestionStatus; children: React.ReactNode }) {
  return enabled ? <QuestionBulkForm status={status} action={bulkManageQuestions}>{children}</QuestionBulkForm> : <>{children}</>
}

export default async function AdminQuestoesPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string; pagina?: string; editar?: string; ver?: string; continuar?: string }> }) {
  const access = await getStaffAccess()
  if (!access) redirect('/aluno')
  const admin = access.user
  // O revisor edita, pré-visualiza, publica e arquiva; criar, importar, duplicar, eliminar e ações em lote são do admin.
  const canManage = access.role === 'admin'
  const params = await searchParams
  const tab = STATUSES.find((item) => item.tab === params.estado) ?? STATUSES[0]
  const q = (params.q ?? '').trim().slice(0, 100)
  const requested = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1)

  let list: { total: number; page: number; items: QuestionListItem[] } | null = null
  let counts: Record<QuestionStatus, number> | null = null
  let subjects: SubjectRow[] = []
  let topics: TopicRow[] = []
  let variants: VariantRow[] = []
  let institutions: InstitutionRow[] = []
  let editing: QuestionDetail | null = null
  let preview: QuestionDetail | null = null
  let drafts: OpenDraft[] = []
  let resumed: OpenDraft | null = null
  try {
    ;[list, counts, subjects, topics, variants, institutions] = await Promise.all([
      listQuestions({ status: tab.value, term: normalizeSearch(q), page: requested, pageSize: PAGE_SIZE }),
      countByStatus(),
      listSubjects(),
      listTopics(),
      listVariants(),
      listInstitutions(),
    ])
    if (params.editar) editing = await getQuestion(params.editar)
    if (params.ver) preview = await getQuestion(params.ver)
  } catch (error) {
    console.error('[ADMIN QUESTOES]', error)
  }
  // Questões por concluir: se a tabela ainda não existir (migração 0011 por correr) ou a consulta falhar, a página funciona na mesma.
  try {
    ;[drafts, resumed] = await Promise.all([listOpenDrafts(admin.id), params.continuar ? getOpenDraft(admin.id, params.continuar) : Promise.resolve(null)])
  } catch (error) {
    console.error('[ADMIN QUESTOES] questões por concluir', error)
  }

  const formProps = {
    action: saveQuestion,
    subjects: subjects.filter((subject) => subject.active || subject.id === editing?.subjectId).map((subject) => ({ id: subject.id, name: subject.name, scopes: subject.scopes.map((scope) => scope.key) })),
    topics: topics.filter((topic) => topic.active || topic.id === editing?.topicId).map((topic) => ({ id: topic.id, name: topic.name, subjectId: topic.subjectId })),
    variants: variants.map((item) => ({ name: item.name, subjectId: item.subjectId, active: item.active })),
    institutions: institutions.filter((item) => item.active || item.id === editing?.institutionId).map((item) => ({ value: item.id, label: `${item.shortName} · ${item.name}` })),
    years: examYearOptions('Sem ano'),
    difficulties: DIFFICULTIES.map((item) => ({ value: item.value, label: item.label })),
    origins: ORIGINS.map((item) => ({ value: item.value, label: item.label })),
    answerSources: ANSWER_SOURCES.map((item) => ({ value: item.value, label: item.label })),
  }
  const page = list?.page ?? 1
  const pages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1
  const countLabel = list ? (q ? `${list.total} ${list.total === 1 ? 'resultado' : 'resultados'}` : `${list.total} ${list.total === 1 ? 'questão' : 'questões'}`) : undefined
  const closeHref = href(tab.tab, q, page)

  return (
    <AdminPage>
      <AdminPageHeader
        icon={CircleHelp}
        title="Questões"
        description="O banco de questões do Simulador, da Prática e do Modo rápido."
        action={
          !canManage ? undefined : <div className="flex shrink-0 items-center gap-2">
            <FormModal variant="secondary" icon="upload" label="Importar CSV" title="Importar questões" description="Todas entram como rascunho, com a resposta por confirmar.">
              <FeedbackForm action={importQuestionsCsv} successMessage="Importação concluída." errorMessage="Não foi possível importar o CSV." resetOnSuccess className="grid gap-4">
                <p className="text-sm leading-6 text-[#526057]">
                  Um ficheiro <strong>.csv</strong> com até 500 questões. Se houver um erro numa linha, nada é guardado e vês o que corrigir.
                </p>
                <ul className="grid gap-1 rounded-2xl bg-[#fafbf8] p-4 text-xs leading-5 text-[#526057]">
                  <li><strong>Obrigatórias:</strong> statement, subject_name, track (10, 12 ou admissao), option_a, option_b, correct (A a E).</li>
                  <li><strong>Opcionais:</strong> option_c a option_e, institution (sigla; obrigatória na admissão), variant (nome de uma variante já criada em Variantes), topic_name, difficulty (facil, media, dificil), year, origin_label, explanation.</li>
                  <li>A disciplina e o tema têm de existir, com o mesmo nome, e a disciplina tem de estar no percurso indicado.</li>
                  <li>O modelo traz 3 linhas de exemplo marcadas com <strong>[EXEMPLO]</strong>: apaga-as antes de importar.</li>
                </ul>
                <Link href="/admin/questoes/modelo" prefetch={false} className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d4d41] hover:underline"><Download size={16} aria-hidden="true" /> Descarregar o modelo (com exemplos)</Link>
                <label className="text-sm font-medium">Ficheiro CSV *
                  <input name="csv" type="file" accept=".csv,text/csv" required className="mt-1 block w-full rounded-xl border border-[#dfe3d9] bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#edf3ee] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#1d4d41]" />
                </label>
                <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">Importar</button>
              </FeedbackForm>
            </FormModal>
            <FormModal label="Adicionar" title="Adicionar questão" description="Em 3 passos: enunciado, opções e classificação.">
              <QuestionForm {...formProps} editing={null} draft={null} />
            </FormModal>
          </div>
        }
      />
      {editing && (
        <RouteModal title="Editar questão" closeHref={closeHref}>
          <QuestionForm {...formProps} editing={toEditorValue(editing)} draft={null} />
        </RouteModal>
      )}
      {resumed && !editing && (
        <RouteModal title="Continuar questão" description="Retomada do ponto onde ficou." closeHref={closeHref}>
          <QuestionForm {...formProps} editing={null} draft={{ id: resumed.id, payload: resumed.payload }} />
        </RouteModal>
      )}
      {preview && (
        <RouteModal title="Como o aluno vê" description="A resposta certa e a explicação só aparecem ao aluno depois de responder." closeHref={closeHref}>
          <div className="grid gap-4">
            <p className="text-[15px] leading-7"><MathText text={preview.statement} /></p>
            <ul className="grid gap-2">
              {preview.options.map((option, index) => (
                <li key={index} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${option.isCorrect ? 'border-[#1d4d41] bg-[#edf3ee]' : 'border-[#e3e5dc]'}`}>
                  <span className="font-semibold text-[#1d4d41]">{LETTERS[index]}</span>
                  <span className="min-w-0 flex-1"><MathText text={option.body} /></span>
                  {option.isCorrect && <CheckCircle2 size={18} aria-label="Resposta correta" className="shrink-0 text-[#1d4d41]" />}
                </li>
              ))}
            </ul>
            {preview.explanation && (
              <div className="rounded-2xl bg-[#fafbf8] p-4 text-sm leading-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#9aa39c]">Explicação</p>
                <MathText text={preview.explanation} />
              </div>
            )}
          </div>
        </RouteModal>
      )}

      {drafts.length > 0 && (
        <section aria-label="Questões por concluir" className="shrink-0 rounded-2xl border border-[#ecdfb8] bg-[#faf5e6] px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#805f19]">Por concluir ({drafts.length})</p>
          <ul className="divide-y divide-[#efe6c9]">
            {drafts.slice(0, 5).map((draft) => (
              <li key={draft.id} className="flex items-center gap-3 py-2">
                <Link href={href(tab.tab, q, page, `continuar=${draft.id}`)} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{plainExcerpt(draft.payload.statement || draft.payload.options.find((option) => option.body.trim())?.body || 'Sem enunciado', 90)}</p>
                  <p className="mt-0.5 text-xs text-[#737c75]">Passo {draft.payload.step + 1} de 3 · {relativeTime(draft.updatedAt)}</p>
                </Link>
                <RowMenu
                  label="Ações da questão por concluir"
                  items={[
                    { label: 'Continuar', icon: <Pencil size={16} />, href: href(tab.tab, q, page, `continuar=${draft.id}`) },
                    { label: 'Descartar', icon: <Trash2 size={16} />, action: discardQuestionDraft, fields: { id: draft.id }, confirm: 'Descartar', tone: 'danger' as const },
                  ]}
                />
              </li>
            ))}
          </ul>
          {drafts.length > 5 && <p className="pb-0.5 text-xs text-[#737c75]">+ {drafts.length - 5} mais antigas: aparecem quando concluíres ou descartares estas.</p>}
        </section>
      )}

      <AdminTabs label="Estado das questões" tabs={STATUSES.map((item) => ({ href: href(item.tab, '', 1), label: item.label, count: counts?.[item.value], active: item.tab === tab.tab }))} />
      <AdminSearchBar q={q} placeholder="Pesquisar questão ou disciplina" countLabel={countLabel} hidden={tab.tab === 'rascunhos' ? undefined : { estado: tab.tab }} />

      <AdminListPanel>
        {list === null ? (
          <AdminLoadError href={closeHref} />
        ) : list.items.length === 0 ? (
          <div className="m-4">
            {q ? (
              <EmptyState title="Sem resultados" description={`Nenhuma questão corresponde a “${q}”.`} actionLabel="Limpar pesquisa" actionHref={href(tab.tab, '', 1)} />
            ) : (
              <EmptyState title={`Sem ${tab.label.toLowerCase()}`} description={tab.value === 'rascunho' ? (canManage ? 'Usa o botão Adicionar para escrever a primeira, ou Importar CSV.' : 'Quando houver questões para rever, aparecem aqui.') : 'Quando houver, aparecem aqui.'} />
            )}
          </div>
        ) : (
          <MaybeBulk enabled={canManage} status={tab.value}>
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {list.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                {canManage && <input type="checkbox" value={item.id} data-question-select aria-label={`Seleccionar questão: ${plainExcerpt(item.statement).slice(0, 70)}`} className="size-4 shrink-0 accent-[#1d4d41]" />}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-5">{plainExcerpt(item.statement)}</p>
                  <p className="mt-1 truncate text-xs text-[#737c75]">{item.subjectName} · {item.scopeLabel} · {difficultyLabel(item.difficulty)}{item.examYear ? ` · ${item.examYear}` : ''}</p>
                  {/* Marcas internas: só aqui, no admin. */}
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#eef0ea] px-2 py-0.5 text-[10px] font-semibold text-[#5f6d63]">{originLabel(item.origin)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.answerSource === 'sugestao' ? 'bg-[#f4eddb] text-[#805f19]' : 'bg-[#e6f0e9] text-[#1d4d41]'}`}>{answerSourceLabel(item.answerSource)}</span>
                    {item.version > 1 && <span className="rounded-full bg-[#eef0ea] px-2 py-0.5 text-[10px] font-semibold text-[#5f6d63]">v{item.version}</span>}
                  </p>
                </div>
                <RowMenu
                  label="Ações da questão"
                  items={[
                    { label: 'Editar', icon: <Pencil size={16} />, href: href(tab.tab, q, page, `editar=${item.id}`) },
                    { label: 'Pré-visualizar', icon: <Eye size={16} />, href: href(tab.tab, q, page, `ver=${item.id}`) },
                    ...(canManage ? [{ label: 'Duplicar', icon: <Copy size={16} />, action: duplicateQuestion, fields: { id: item.id } }] : []),
                    ...(item.status === 'rascunho'
                      ? [
                          { label: 'Publicar', icon: <CheckCircle2 size={16} />, action: setQuestionStatus, fields: { id: item.id, to: 'publicada' } },
                          ...(canManage ? [{ label: 'Eliminar', icon: <Trash2 size={16} />, action: deleteQuestion, fields: { id: item.id }, confirm: 'Eliminar', tone: 'danger' as const }] : []),
                        ]
                      : item.status === 'publicada'
                        ? [{ label: 'Arquivar', icon: <Archive size={16} />, action: setQuestionStatus, fields: { id: item.id, to: 'arquivada' }, confirm: 'Arquivar' }]
                        : [{ label: 'Restaurar', icon: <ArchiveRestore size={16} />, action: setQuestionStatus, fields: { id: item.id, to: 'rascunho' } }]),
                  ]}
                />
              </li>
            ))}
          </ul>
          </MaybeBulk>
        )}
        {list && list.total > 0 && <AdminPager page={page} pages={pages} prevHref={href(tab.tab, q, page - 1)} nextHref={href(tab.tab, q, page + 1)} />}
      </AdminListPanel>
    </AdminPage>
  )
}
