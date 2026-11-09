#!/usr/bin/env bash
# Diagnóstico do push do Twisisa. Só lê, mas o passo 2 chama o motor a sério (pode enviar notificações a alunos reais,
# dentro dos limites do motor). Por isso só corre com CONFIRMAR=sim.
# Uso: SITE_URL=https://twisisa.site CRON_SECRET=... CONFIRMAR=sim bash scripts/diagnostico-push.sh
set -u
echo "1) Agendador (vercel.json)"
grep -n '"schedule"' vercel.json || echo "   sem cron na Vercel"
echo "   O cron da Vercel só corre 1 vez por dia; os 30 minutos dependem do GitHub Actions («Motor de notificações»)."
echo
echo "2) Rota do motor"
if [ "${CONFIRMAR:-}" != "sim" ]; then
  echo "   Saltado. Para chamar o motor: CONFIRMAR=sim (envia notificações reais, dentro dos limites)."
elif [ -z "${SITE_URL:-}" ] || [ -z "${CRON_SECRET:-}" ]; then
  echo "   Define SITE_URL e CRON_SECRET."
else
  code=$(curl -s -o /tmp/cron-push.out -w '%{http_code}' -H "Authorization: Bearer $CRON_SECRET" "${SITE_URL%/}/api/cron/lembretes")
  echo "   Resposta: $code"
  head -c 400 /tmp/cron-push.out; echo
  case "$code" in
    200) echo "   Rota boa (procura pushChecked na resposta).";;
    401) echo "   CRON_SECRET em falta ou diferente entre a Vercel e o GitHub.";;
    500) echo "   Erro no servidor: base de dados ou migração em falta.";;
    *)   echo "   Código inesperado.";;
  esac
fi
echo
echo "3) Migrações (têm de estar aplicadas: 0027, 0028 e 0032)"
npm run migrate:status 2>&1 | grep -E "0027|0028|0032|pendente|pending" || echo "   Confirma no resultado completo de: npm run migrate:status"
echo
echo "4) À mão"
echo "   GitHub > Actions > Motor de notificações: execuções verdes nas últimas 24 horas?"
echo "   Perfil > botão de teste: 503 = chaves VAPID em falta; 502 = o texto do erro diz o que fazer."
echo "   iPhone: só funciona com a app adicionada ao ecrã principal (iOS 16.4 ou superior)."
echo "   Testa primeiro no Android com Chrome."
