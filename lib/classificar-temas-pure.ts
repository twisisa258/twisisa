// Classificação automática de temas (Jonas). Puro: monta o pedido e lê a resposta, sem rede nem base de dados.

export type TemaOpcao = { id: string; name: string }

const limpar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

export function sistemaClassificador(disciplina: string, temas: TemaOpcao[]): string {
  return [
    `És o Jonas, assistente do Twisisa. Classificas questões de exame de ${disciplina} (ensino moçambicano) num único tema.`,
    'Responde SÓ com o nome exacto de um dos temas da lista, sem aspas, sem explicação.',
    'Se nenhum tema serve com clareza, responde exactamente: NENHUM.',
    `Temas:\n${temas.map((tema) => `- ${tema.name}`).join('\n')}`,
  ].join('\n\n')
}

export function pedidoClassificador(enunciado: string, opcoes: string[]): string {
  const texto = enunciado.replace(/\s+/g, ' ').trim().slice(0, 1500)
  const lista = opcoes.filter(Boolean).slice(0, 5).map((opcao, i) => `${String.fromCharCode(65 + i)}. ${opcao.replace(/\s+/g, ' ').slice(0, 200)}`).join('\n')
  return `Questão:\n${texto}${lista ? `\n\nOpções:\n${lista}` : ''}\n\nTema:`
}

/** Procura na resposta um tema da lista. «NENHUM», vazio ou ambíguo → null (a questão continua «sem tema»). */
export function lerTema(resposta: string, temas: TemaOpcao[]): TemaOpcao | null {
  const alvo = limpar(resposta.split('\n')[0] ?? '').replace(/^(tema|resposta) /, '')
  if (!alvo || alvo === 'nenhum') return null
  const exacto = temas.find((tema) => limpar(tema.name) === alvo)
  if (exacto) return exacto
  const contidos = temas.filter((tema) => alvo.includes(limpar(tema.name)))
  return contidos.length === 1 ? contidos[0] : null
}
