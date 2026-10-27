import { BookOpen, BookOpenCheck, Copy, GraduationCap, Landmark, Layers, LayoutDashboard, LayoutGrid, ListTree, Sparkles, Tags, Users, type LucideIcon } from 'lucide-react'

export type AdminSection = {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

export const adminOverview = { href: '/admin', label: 'Visão geral', icon: LayoutDashboard }

// Áreas de gestão que existem. Para acrescentar uma, cria a página em app/admin/<área>/ e junta-a aqui:
// aparece sozinha na navegação e na visão geral.
export const adminSections: AdminSection[] = [
  {
    href: '/admin/questoes',
    label: 'Banco de questões',
    description: 'Cria, classifica e revê questões do Simulador.',
    icon: BookOpenCheck,
  },
  {
    href: '/admin/materiais',
    label: 'Materiais académicos',
    description: 'Publica, consulta e elimina exames, apontamentos e outros recursos da Biblioteca.',
    icon: BookOpen,
  },
  {
    href: '/admin/instituicoes',
    label: 'Instituições',
    description: 'Logótipo, sigla, tipo, estado e ordem das instituições de admissão ao ensino superior.',
    icon: Landmark,
  },
  {
    href: '/admin/cursos',
    label: 'Cursos',
    description: 'Cursos de cada instituição e as provas de admissão (disciplinas e pesos) de cada um.',
    icon: GraduationCap,
  },
  {
    href: '/admin/disciplinas',
    label: 'Disciplinas',
    description: 'Disciplinas por classe (10ª, 12ª) e por instituição.',
    icon: Layers,
  },
  {
    href: '/admin/temas',
    label: 'Temas',
    description: 'Temas de cada disciplina, para ligar questões e materiais.',
    icon: ListTree,
  },
  {
    href: '/admin/variantes',
    label: 'Variantes',
    description: 'Versões do exame de cada disciplina (ex.: Matemática I, II, III) e a sua dificuldade.',
    icon: Copy,
  },
  {
    href: '/admin/classificacao',
    label: 'Classificação',
    description: 'Categorias e níveis da biblioteca.',
    icon: Tags,
  },
  {
    href: '/admin/modulos',
    label: 'Módulos',
    description: 'Estado dos módulos da página Exames por percurso: ativo, em breve ou oculto.',
    icon: LayoutGrid,
  },
  {
    href: '/admin/jonas',
    label: 'Jonas',
    description: 'Chave da Groq, modelo, estado do explicador e uso pelos alunos.',
    icon: Sparkles,
  },
  {
    href: '/admin/equipa',
    label: 'Equipa',
    description: 'Convida revisores por carta e gere quem tem acesso à administração.',
    icon: Users,
  },
]
