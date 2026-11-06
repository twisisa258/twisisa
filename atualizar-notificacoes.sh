#!/usr/bin/env bash
# Twisisa: notificações importantes seguem também por e-mail e push (lib/notificar.ts),
# e o motor de 30 em 30 minutos passa a correr pelo GitHub Actions (.github/workflows/push-cron.yml).
# Corre na raiz do projecto (onde está o package.json). Só Node e heredocs, sem Python.
# Se um trecho não bater certo, o script para e diz em que ficheiro. Pode voltar a correr: não duplica nada.
set -euo pipefail

if [ ! -f package.json ] || [ ! -f lib/email.ts ] || [ ! -f lib/push.ts ] || [ ! -f app/aluno/bem-vindo/actions.ts ]; then
  echo "Corre este script na raiz do projecto twisisa (onde está o package.json)."
  exit 1
fi
command -v node >/dev/null 2>&1 || { echo "Falta o Node.js."; exit 1; }

if git rev-parse --git-dir >/dev/null 2>&1 && [ -n "$(git status --porcelain)" ]; then
  echo "AVISO: há alterações por guardar. Faz um commit antes de correr (o git é a cópia de segurança)."
fi

echo "1/4 E-mail de aviso (lib/email.ts)"
if grep -qF 'export function avisoEmail' lib/email.ts; then
  echo "  já estava"
else
cat >> lib/email.ts <<'EOF'

// [twisisa-notif] e-mail de aviso importante (boas-vindas, conta, avisos da equipa). Sem desligar: é uma mensagem sobre a conta.
export function avisoEmail(input: { name: string; title: string; text: string; cta: string; href: string }) {
  const url = `${siteBaseUrl()}${input.href.startsWith('/') ? input.href : '/aluno/notificacoes'}`
  const html = layout({
    title: escapeHtml(input.title),
    preheader: escapeHtml(input.text),
    body: p(`Olá, ${firstName(input.name)}.`) + p(escapeHtml(input.text)),
    button: { label: input.cta, href: url },
    reason: 'Recebes este aviso porque tens uma conta no Twisisa.',
  })
  const text = `Olá, ${input.name.trim().split(/\s+/)[0] || 'estudante'}.\n\n${input.text}\n\n${input.cta}: ${url}`
  return { subject: input.title, html, text }
}
EOF
  echo "  acrescentado"
fi

echo "2/4 Função central de notificações (lib/notificar.ts)"
if [ -f lib/notificar.ts ] && grep -qF '[twisisa-notif]' lib/notificar.ts; then
  echo "  já estava"
else
cat > lib/notificar.ts <<'EOF'
import 'server-only'

import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { avisoEmail } from '@/lib/email'
import { pushToUser } from '@/lib/push'

// [twisisa-notif] Notificações importantes da plataforma: aparecem no sino da app, seguem por e-mail (fila notification_outbox)
// e por push, se o aluno tiver ativado. Os lembretes de estudo continuam em lib/lembretes.ts (regras próprias: um por dia, na hora escolhida).

export const TIPOS_IMPORTANTES = ['boas-vindas', 'aviso', 'conta', 'sistema'] as const

export type NotificacaoInput = {
  userId: string
  kind: string
  title: string
  body: string
  href?: string | null
  actionLabel?: string | null
  // Chave única por aluno: a mesma notificação não entra nem sai duas vezes.
  dedupeKey: string
  // true: só cria se o aluno ainda não tiver nenhuma notificação deste tipo (ex.: boas-vindas).
  unica?: boolean
}

export type ResultadoNotificacao = { criada: boolean; emailEnfileirado: boolean }

export async function notificarAluno(input: NotificacaoInput): Promise<ResultadoNotificacao> {
  const id = randomUUID()
  const href = input.href && input.href.startsWith('/') && !input.href.startsWith('//') ? input.href : '/aluno/notificacoes'
  const inserida = await pool.query(
    input.unica
      ? `INSERT INTO notifications (id, user_id, title, body, kind, action_label, action_href, dedupe_key)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8
         WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = $2 AND kind = $5)
         ON CONFLICT DO NOTHING`
      : `INSERT INTO notifications (id, user_id, title, body, kind, action_label, action_href, dedupe_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
    [id, input.userId, input.title, input.body, input.kind, input.actionLabel ?? null, href, input.dedupeKey],
  )
  if (!inserida.rowCount) return { criada: false, emailEnfileirado: false }

  if (!(TIPOS_IMPORTANTES as readonly string[]).includes(input.kind)) return { criada: true, emailEnfileirado: false }

  // E-mail: só se a conta ainda tiver o e-mail ligado (interruptor no perfil). Sem preferências guardadas, envia.
  const alvo = (
    await pool.query(
      `SELECT u.name, u.email, p.email_enabled FROM "user" u LEFT JOIN notification_prefs p ON p.user_id = u.id WHERE u.id = $1`,
      [input.userId],
    )
  ).rows[0] as { name: string; email: string; email_enabled: boolean | null } | undefined

  let emailEnfileirado = false
  if (alvo?.email && alvo.email_enabled !== false) {
    const mail = avisoEmail({ name: alvo.name, title: input.title, text: input.body, cta: input.actionLabel ?? 'Abrir na Twisisa', href })
    await pool.query(
      `INSERT INTO notification_outbox (id, user_id, subject, body, href, dedupe_key) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [randomUUID(), input.userId, mail.subject, JSON.stringify({ html: mail.html, text: mail.text }), href, `aviso:${input.dedupeKey}`],
    )
    emailEnfileirado = true
  }

  // Push: não bloqueia a ação que criou a notificação. Sem aparelhos registados, não faz nada.
  void pushToUser(input.userId, { title: input.title, body: input.body, url: href }).catch((error: unknown) => {
    console.error('[NOTIFICAR] push', error)
  })

  return { criada: true, emailEnfileirado }
}
EOF
  echo "  escrito"
fi

echo "3/4 Boas-vindas passam por notificarAluno (app/aluno/bem-vindo/actions.ts)"
if grep -qF 'notificarAluno(' app/aluno/bem-vindo/actions.ts; then
  echo "  já estava"
else
BLOCO="$(mktemp "${TMPDIR:-/tmp}/twisisa-bloco.XXXXXX")"
PATCH="$(mktemp "${TMPDIR:-/tmp}/twisisa-notif.XXXXXX")"
trap 'rm -f "$BLOCO" "$PATCH"' EXIT
cat > "$BLOCO" <<'EOF'
    // Boas-vindas na plataforma, uma só vez. Também vai por e-mail e push (ver lib/notificar.ts).
    const firstName = state.name.split(' ')[0] || 'estudante'
    await notificarAluno({
      userId: user.id,
      kind: 'boas-vindas',
      title: `Boas-vindas, ${firstName}`,
      body: 'Responde a algumas questões hoje e começa a tua sequência de dias de estudo.',
      dedupeKey: 'boas-vindas',
      unica: true,
    }).catch((error) => console.error('[ONBOARDING] notificação de boas-vindas', error))
EOF
cat > "$PATCH" <<'EOF'
const fs = require('fs')
const file = process.argv[2]
const bloco = fs.readFileSync(process.argv[3], 'utf8')
let texto = fs.readFileSync(file, 'utf8')

const inicio = texto.indexOf('    // Boas-vindas na plataforma, uma só vez.')
const fimMarca = "console.error('[ONBOARDING] notificação de boas-vindas', error))"
const fim = texto.indexOf(fimMarca, inicio)
if (inicio < 0 || fim < 0) {
  console.error('ERRO: não encontrei o bloco das boas-vindas em ' + file + '. Nada foi alterado.')
  process.exit(1)
}
texto = texto.slice(0, inicio) + bloco.replace(/\n$/, '') + texto.slice(fim + fimMarca.length)

texto = texto.replace(/^import /m, () => "import { notificarAluno } from '@/lib/notificar'\nimport ")

// randomUUID só sai do import se já não for usado em mais lado nenhum.
if (texto.split('randomUUID').length - 1 === 1) {
  texto = texto.replace(/^import \{\s*randomUUID\s*\} from 'node:crypto'\n/m, '')
  texto = texto.replace(/randomUUID,\s*/, '').replace(/,\s*randomUUID(?=\s*\})/, '')
}
fs.writeFileSync(file, texto)
console.log('  ligado: boas-vindas com e-mail e push')
EOF
node "$PATCH" app/aluno/bem-vindo/actions.ts "$BLOCO"
fi

echo "4/4 Agendador do motor de push (.github/workflows/push-cron.yml)"
if [ -f .github/workflows/push-cron.yml ]; then
  echo "  já estava"
else
mkdir -p .github/workflows
cat > .github/workflows/push-cron.yml <<'EOF'
# Motor de notificações: chama /api/cron/lembretes de 30 em 30 minutos (lembretes, fila de e-mail e push).
# Segredos no GitHub (Settings > Secrets and variables > Actions):
#   SITE_URL    = endereço do site, sem barra no fim
#   CRON_SECRET = o mesmo valor da variável na Vercel
# O GitHub só corre agendamentos a partir da branch main. Para testar: Actions > Run workflow.
name: Motor de notificações

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  motor:
    runs-on: ubuntu-latest
    steps:
      - name: Chamar /api/cron/lembretes
        env:
          SITE_URL: ${{ secrets.SITE_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
        run: |
          set -euo pipefail
          curl -fsS --max-time 55 -H "Authorization: Bearer ${CRON_SECRET}" "${SITE_URL}/api/cron/lembretes"
EOF
  echo "  escrito"
fi

echo ""
echo "Concluído. Ficheiros tocados:"
echo "  lib/email.ts · lib/notificar.ts (novo) · app/aluno/bem-vindo/actions.ts · .github/workflows/push-cron.yml (novo)"
echo ""
echo "Para o push funcionar de ponta a ponta, confirma no GitHub os segredos SITE_URL e CRON_SECRET,"
echo "e corre Actions > Motor de notificações > Run workflow. A resposta deve mostrar o JSON do motor."
if [ -d node_modules ]; then
  npx tsc --noEmit && echo "tipos OK" || echo "AVISO: o tsc encontrou erros acima."
fi
