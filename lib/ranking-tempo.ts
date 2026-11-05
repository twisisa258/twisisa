// Quanto falta para o ranking semanal recomeçar: segunda-feira 00:00 em Maputo (CAT, UTC+2, sem hora de verão).
// Função pura (recebe a hora atual) para poder ser testada.

const CAT_MS = 2 * 3600_000
const DIA_MS = 86_400_000

export function reinicioDaSemana(agora: number): { dias: number; horas: number; texto: string } {
  const cat = new Date(agora + CAT_MS) // os campos UTC deste objeto são a hora de Maputo
  const diaSemana = cat.getUTCDay() // 0 = domingo
  const ateSegunda = ((8 - diaSemana) % 7) || 7
  const proximaSegunda = Date.UTC(cat.getUTCFullYear(), cat.getUTCMonth(), cat.getUTCDate() + ateSegunda)
  const falta = proximaSegunda - cat.getTime()
  const dias = Math.floor(falta / DIA_MS)
  const horas = Math.floor((falta % DIA_MS) / 3600_000)
  const texto = dias >= 1 ? `Reinicia em ${dias} ${dias === 1 ? 'dia' : 'dias'}` : horas >= 1 ? `Reinicia em ${horas} h` : 'Reinicia daqui a pouco'
  return { dias, horas, texto }
}
