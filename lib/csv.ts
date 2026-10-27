// Leitor de CSV (RFC 4180 simplificado): campos entre aspas, aspas duplas escapadas, vírgulas e quebras de linha dentro de aspas.
// Linhas totalmente vazias são ignoradas. Lança um erro se houver uma aspa por fechar.
export function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"' && field === '') {
      quoted = true
    } else if (char === ',') {
      row.push(field.trim())
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1
      row.push(field.trim())
      field = ''
      if (row.some((value) => value !== '')) rows.push(row)
      row = []
    } else {
      field += char
    }
  }
  if (quoted) throw new Error('CSV inválido: há uma aspa por fechar.')
  row.push(field.trim())
  if (row.some((value) => value !== '')) rows.push(row)
  return rows
}
