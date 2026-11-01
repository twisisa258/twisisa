#!/usr/bin/env bash
# Correcção do desafios.sh (já aplicado, com 3 ficheiros por acertar). Corre na raiz do projeto twisisa. Só bash e node.
# O que faz:
#  1. Renumera a migração (já existia uma 0024: o migrate usa o número como chave e falharia) e aplica-a.
#  2. Acrescenta target_course_id ao schema (era o que fazia o build falhar na maioria dos sítios).
#  3. Painel: liga os Desafios/avisos ao painel actual (mantém o aniversário) e deixa passar quem escolheu «Outra classe».
#  4. Percurso: a página e a acção passam a tratar «Outra classe» (o seletor já a enviava).
#  5. Perfil: volta a mostrar «Outra classe» no Percurso e na completude.
#  6. Verifica os tipos (tsc) e só depois faz commit e push.
set -euo pipefail

[ -f package.json ] && grep -q '"name": "twisisa"' package.json || { echo "Corre este script na raiz do projeto twisisa."; exit 1; }
[ -f lib/desafios.ts ] || { echo "Falta o desafios.sh: corre-o primeiro."; exit 1; }

# 1. Migração: 0024 já existe (identidade_onboarding); a dos desafios passa a 0026 (a 0025 é «outra classe»).
if [ -f database/migrations/0024_curso_alvo.sql ]; then
  if [ -f database/migrations/0026_curso_alvo.sql ]; then rm database/migrations/0024_curso_alvo.sql; else mv database/migrations/0024_curso_alvo.sql database/migrations/0026_curso_alvo.sql; fi
  echo '  ok  database/migrations/0024_curso_alvo.sql -> 0026_curso_alvo.sql'
fi
[ -f database/migrations/0026_curso_alvo.sql ] || { echo "ERRO: falta database/migrations/0026_curso_alvo.sql"; exit 1; }
if [ "$(ls database/migrations/0026_*.sql | wc -l)" -ne 1 ]; then echo "ERRO: há mais de uma migração 0026; renumera à mão."; exit 1; fi

node - <<'JSEOF'
const fs = require('node:fs')
const patches = {
  'lib/db/schema.ts': [
    [
      "targetCourse: text('target_course'), targetScore",
      "targetCourse: text('target_course'), targetCourseId: text('target_course_id'), targetScore",
    ],
  ],
  'app/aluno/(painel)/page.tsx': [
    [
      "import { isTrack, trackLabel, type Track } from '@/lib/percurso'",
      "import { isTrack, levelLabel, type Track } from '@/lib/percurso'",
    ],
    [
      'institutionId: studentProfiles.institutionId, birthDate: studentProfiles.birthDate, dailyGoal: studentProfiles.dailyGoal })',
      'institutionId: studentProfiles.institutionId, targetCourseId: studentProfiles.targetCourseId, otherLevel: studentProfiles.otherLevel, birthDate: studentProfiles.birthDate, dailyGoal: studentProfiles.dailyGoal })',
    ],
    [
      "if (!track && !isAdmin) redirect('/aluno/percurso')",
      "if (!track && !profile?.otherLevel && !isAdmin) redirect('/aluno/percurso')",
    ],
    [
      "(trackLabel(track) ?? 'Escolher percurso')",
      "(levelLabel(track, profile?.otherLevel) ?? 'Escolher percurso')",
    ],
    [
      '  const greeting = getGreeting({ name: session.user.name, userId: session.user.id, createdAt: session.user.createdAt, birthDate: profile?.birthDate ?? null, streak: week?.streak ?? null })',
      '  const desafios = await desafiosPromise\n' +
        '  const avisos = desafios ? buildAvisos(desafios).slice(0, 3) : []\n' +
        '  const greeting = getGreeting({ name: session.user.name, userId: session.user.id, createdAt: session.user.createdAt, birthDate: profile?.birthDate ?? null, streak: desafios ? desafios.streak.current : (week?.streak ?? null) })',
    ],
  ],
  'app/aluno/percurso/page.tsx': [
    [
      'db.select({ track: studentProfiles.track, institutionId: studentProfiles.institutionId })',
      'db.select({ track: studentProfiles.track, otherLevel: studentProfiles.otherLevel, institutionId: studentProfiles.institutionId })',
    ],
    [
      '        initialTrack={isTrack(savedTrack) ? savedTrack : null}\n',
      '        initialTrack={isTrack(savedTrack) ? savedTrack : null}\n        initialOtherLevel={profile?.otherLevel ?? null}\n',
    ],
  ],
  'app/aluno/percurso/actions.ts': [
    [
      "import { isTrack } from '@/lib/percurso'",
      "import { cleanOtherLevel, isTrack } from '@/lib/percurso'",
    ],
    [
      "    const track = String(formData.get('track') ?? '')\n    if (!isTrack(track)) throw new AppError('Escolhe o que estás a preparar.')",
      "    const track = String(formData.get('track') ?? '')\n" +
        '    // «Outra classe»: sem percurso com conteúdo. A classe fica em other_level (a base exige track, instituição e curso vazios).\n' +
        '    if (!track) {\n' +
        "      const otherLevel = cleanOtherLevel(formData.get('otherLevel'))\n" +
        "      if (!otherLevel) throw new AppError('Escolhe ou escreve a classe que estás a preparar.')\n" +
        '      const empty = { track: null, institutionId: null, targetCourseId: null, targetCourse: null, otherLevel }\n' +
        '      await db\n' +
        '        .insert(studentProfiles)\n' +
        '        .values({ userId: session.user.id, ...empty })\n' +
        '        .onConflictDoUpdate({ target: studentProfiles.userId, set: { ...empty, updatedAt: new Date() } })\n' +
        "      revalidatePath('/aluno')\n" +
        "      revalidatePath('/aluno/perfil')\n" +
        "      revalidatePath('/aluno/percurso')\n" +
        "      return 'Percurso guardado.'\n" +
        '    }\n' +
        "    if (!isTrack(track)) throw new AppError('Escolhe o que estás a preparar.')",
    ],
    [
      'const course = keepCourse ? {} : { targetCourseId: null, targetCourse: null }',
      'const course = keepCourse ? { otherLevel: null } : { targetCourseId: null, targetCourse: null, otherLevel: null }',
    ],
  ],
  'app/aluno/perfil/page.tsx': [
    [
      "import { trackLabel } from '@/lib/percurso'",
      "import { levelLabel } from '@/lib/percurso'",
    ],
    [
      '    track,\n    institutionId: current?.institutionId ?? null,\n    targetCourse: current?.targetCourseId ?? null,',
      '    track,\n    otherLevel: current?.otherLevel ?? null,\n    institutionId: current?.institutionId ?? null,\n    targetCourse: current?.targetCourseId ?? null,',
    ],
    [
      '  const trackSummary = track\n    ? [trackLabel(track), ',
      '  const levelName = levelLabel(track, current?.otherLevel)\n  const trackSummary = levelName\n    ? [levelName, ',
    ],
    [
      '{track ? `${trackLabel(track)}${isAdmission',
      '{levelName ? `${levelName}${isAdmission',
    ],
    [
      "{track ? 'Alterar percurso' : 'Escolher percurso'}",
      "{levelName ? 'Alterar percurso' : 'Escolher percurso'}",
    ],
  ],
  'State.md': [
    [
      '| `/aluno/desafios` | FICTÍCIO | Números fixos no código; missões só no browser. |',
      '| `/aluno/desafios` | FEITO, FALTA TESTE | Sequência, missões do dia e da semana, prontidão por curso e avisos, tudo calculado a partir das respostas do Simulador (`lib/desafios.ts`). Curso alvo escolhido no perfil ou no resultado do teste vocacional (`student_profiles.target_course_id`, migração 0026). |',
    ],
  ],
}
let failed = false
for (const [file, pairs] of Object.entries(patches)) {
  let s = fs.readFileSync(file, 'utf8')
  let changed = 0
  for (const [from, to] of pairs) {
    if (s.includes(to)) continue
    if (s.split(from).length !== 2) {
      console.error('  ERRO ' + file + ': não encontrei (ou há mais de um) o trecho: ' + from.slice(0, 70).replace(/\n/g, ' '))
      failed = true
      continue
    }
    s = s.replace(from, () => to)
    changed++
  }
  if (changed) fs.writeFileSync(file, s)
  console.log((changed ? '  ok  ' : '  --  ') + file + (changed ? '' : ' (já estava aplicado)'))
}
if (failed) process.exit(1)
JSEOF

echo
echo "== Migração =="
npm run migrate

echo
echo "== Verificação de tipos =="
npx tsc --noEmit

echo
echo "== Git =="
git add -A
git commit -m "feat(desafios): sequência, missões, prontidão por curso e avisos; percurso Outra classe; migração 0026"
git push origin main

echo
echo "Feito. Agora: mv materiais.sh ~/twisisa && cd ~/twisisa && bash materiais.sh"
