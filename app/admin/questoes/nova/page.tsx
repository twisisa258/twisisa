import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listInstitutions } from '@/lib/institutions'
import { listSubjects } from '@/lib/subjects'
import { listTopics } from '@/lib/classification'
import { listVariants } from '@/lib/variants'
import { idsInstituicoesComVariantes } from '@/lib/regras-db'
import { normalizarVariante, precisaVariante } from '@/lib/regras'
import { examYearOptions } from '@/lib/years'
import { AdminLoadError, AdminPage, AdminPageHeader } from '@/components/admin/page-parts'
import { AssistenteSessao } from './assistente'
import { SessaoQuestoes } from './sessao'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Criar questões | Administração | Twisisa' }

type Params = { modo?: string; onde?: string; disc?: string; var?: string; nivel?: string; ok?: string; passo?: string }

const NIVEIS: Record<string, string> = { facil: 'Fácil', media: 'Médio', dificil: 'Difícil' }

export default async function NovaQuestaoPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams

  let dados
  try {
    const [instituicoes, disciplinas, variantes, temas, idsComVariantes] = await Promise.all([listInstitutions(), listSubjects(), listVariants(), listTopics(), idsInstituicoesComVariantes()])
    dados = { instituicoes, disciplinas, variantes, temas, idsComVariantes }
  } catch (error) {
    console.error('[ADMIN QUESTOES] Erro ao preparar a criação de questões', error)
    return (
      <AdminPage>
        <AdminPageHeader icon={Plus} title="Criar questões" />
        <AdminLoadError href="/admin/questoes/nova" />
      </AdminPage>
    )
  }

  const instituicoes = dados.instituicoes.filter((item) => item.active)
  const disciplinas = dados.disciplinas.filter((item) => item.active).map((item) => ({ id: item.id, name: item.name, scopes: item.scopes.map((scope) => scope.key) }))
  const variantes = dados.variantes.filter((item) => item.active).map((item) => ({ name: item.name, subjectId: item.subjectId }))
  const escolhasInstituicao = instituicoes.map((item) => ({ value: item.id, label: `${item.shortName} · ${item.name}` }))

  // O que veio no endereço só vale se ainda existir e fizer sentido (nada é de confiança).
  const modo = params.modo === 'importar' || params.modo === 'manual' ? params.modo : ''
  const instituicao = instituicoes.find((item) => item.id === params.onde)
  const onde = params.onde === '10' || params.onde === '12' ? params.onde : instituicao ? instituicao.id : ''
  const chave = onde === '10' || onde === '12' ? onde : onde ? `inst:${onde}` : ''
  const disciplina = disciplinas.find((item) => item.id === params.disc && chave && item.scopes.includes(chave))
  const variantesDaDisciplina = variantes.filter((item) => item.subjectId === disciplina?.id)
  const variante = normalizarVariante(params.var) ?? ''
  const varianteOk = !variante || (dados.idsComVariantes.includes(onde) && variantesDaDisciplina.some((item) => item.name === variante))
  const nivel = NIVEIS[params.nivel ?? ''] ? (params.nivel as string) : ''
  const completo = params.ok === '1' && !!modo && !!onde && !!disciplina && varianteOk && !!nivel

  const topicos = dados.temas.filter((item) => item.active && item.subjectId === disciplina?.id).map((item) => ({ id: item.id, name: item.name }))
  const queryBase = new URLSearchParams()
  if (modo) queryBase.set('modo', modo)
  if (onde) queryBase.set('onde', onde)

  return (
    <AdminPage>
      <AdminPageHeader
        icon={Plus}
        title="Criar questões"
        description="Escolhe uma vez onde as questões ficam; depois só crias."
        action={
          <Link href="/admin/questoes" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#c9d7cd] bg-white px-3.5 text-sm font-semibold text-marca hover:bg-[#f1f4ef]">
            <ArrowLeft size={16} aria-hidden="true" /> <span className="hidden sm:inline">Banco de questões</span><span className="sm:hidden">Voltar</span>
          </Link>
        }
      />
      <div className="mx-auto w-full max-w-2xl">
        {completo && disciplina ? (
          <SessaoQuestoes
            cfg={{
              modo: modo as 'manual' | 'importar',
              onde,
              track: onde === '10' || onde === '12' ? onde : 'admissao',
              institutionId: instituicao ? instituicao.id : '',
              instituicao: instituicao ? instituicao.shortName : `${onde}ª classe`,
              subjectId: disciplina.id,
              disciplina: disciplina.name,
              variant: variante,
              nivel,
              nivelLabel: NIVEIS[nivel],
              podePublicar: !precisaVariante(onde === '10' || onde === '12' ? onde : 'admissao', instituicao?.id ?? '', dados.idsComVariantes, variantesDaDisciplina.length > 0) || !!variante,
            }}
            temas={topicos}
            anos={examYearOptions('Sem ano (fica para revisão)')}
            linkDisciplina={`/admin/questoes/nova?${new URLSearchParams({ modo, onde, passo: 'disciplina' }).toString()}`}
            linkTudo="/admin/questoes/nova"
          />
        ) : (
          <AssistenteSessao
            instituicoes={escolhasInstituicao}
            disciplinas={disciplinas}
            variantes={variantes}
            idsComVariantes={dados.idsComVariantes}
            inicial={{ modo, onde, subjectId: disciplina?.id ?? '', variant: variante, nivel, passo: params.passo === 'disciplina' ? 'disciplina' : '' }}
          />
        )}
      </div>
    </AdminPage>
  )
}
