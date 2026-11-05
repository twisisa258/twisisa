import { Atom, BookOpen, BookText, Brain, Calculator, Dna, FlaskConical, Globe, Landmark, Languages, Laptop, Sigma, type LucideIcon } from 'lucide-react'

// Ícone da disciplina pelo nome (sem acentos). Disciplinas novas caem no livro aberto até terem o seu.
const POR_NOME: [RegExp, LucideIcon][] = [
  [/matem/, Sigma],
  [/fisic/, Atom],
  [/quimic/, FlaskConical],
  [/biolog/, Dna],
  [/portugu/, BookText],
  [/ingles|frances|lingua/, Languages],
  [/histor/, Landmark],
  [/geograf/, Globe],
  [/filosof|psicolog/, Brain],
  [/inform|tic\b/, Laptop],
  [/contab|econom|calcul/, Calculator],
]

export function iconeDaDisciplina(nome: string): LucideIcon {
  const limpo = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return POR_NOME.find(([padrao]) => padrao.test(limpo))?.[1] ?? BookOpen
}
