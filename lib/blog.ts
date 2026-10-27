export type Article = {
  slug: string
  category: string
  title: string
  description: string
  paragraphs: string[]
}

export const articles: Article[] = [
  {
    slug: 'como-organizar-estudo-para-exames',
    category: 'Método de estudo',
    title: 'Como organizar o estudo para os exames',
    description: 'Guia prático para organizar o estudo antes dos exames: objetivos por sessão, blocos pequenos de matéria e revisão alternada com exercícios.',
    paragraphs: [
      'Começa por escolher um objetivo concreto para cada sessão. Uma sessão curta e focada ajuda mais do que uma lista impossível de cumprir.',
      'Divide a matéria em blocos pequenos, alterna revisão com exercícios e reserva alguns minutos para anotar o que ainda precisa de atenção.',
      'Na Biblioteca podes encontrar materiais para continuares este plano com recursos adequados ao teu nível.',
    ],
  },
  {
    slug: 'rever-matematica-com-exercicios',
    category: 'Disciplinas',
    title: 'Rever Matemática com exercícios',
    description: 'Como rever Matemática com exercícios: resolve sem consultar a solução, aprende com o erro e acompanha a tua evolução com simulados.',
    paragraphs: [
      'Resolve primeiro sem consultar a solução. O erro mostra exatamente qual conceito precisa de ser revisto.',
      'Depois de corrigir, explica o raciocínio com as tuas próprias palavras e tenta uma questão semelhante.',
      'Usa os Simulados para acompanhar a evolução ao longo do tempo.',
    ],
  },
  {
    slug: 'preparar-candidatura-universidade',
    category: 'Admissão',
    title: 'Preparar a candidatura à universidade',
    description: 'Como preparar a candidatura à universidade: organiza a informação por instituição, curso e disciplina e confirma os requisitos nas fontes oficiais.',
    paragraphs: [
      'Organiza as informações por instituição, curso e disciplina antes de começares a estudar.',
      'Confirma sempre datas e requisitos nas fontes oficiais da instituição. A plataforma ajuda na preparação, mas não substitui os avisos oficiais.',
      'Consulta a área de Exames para encontrares provas e materiais relacionados.',
    ],
  },
]

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug)
}
