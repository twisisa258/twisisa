#!/usr/bin/env bash
# Twisisa, Fase 0 (09/11/2026): sequência separada da meta, push (404 do teste e tag por tipo),
# nomes do menu (Hoje, Treinar, Eu), botões sem quebra de texto, DESIGN.md, PRODUTO.md e diagnóstico do push.
# Corre na raiz do projecto (onde está o package.json). Recria os ficheiros completos.
# Só faz commit e push se os testes e o `npm run build` passarem (set -e).
set -euo pipefail

if [ ! -f package.json ] || [ ! -f app/globals.css ] || [ ! -f lib/desafios-regras.ts ] || [ ! -f public/sw.js ]; then
  echo "Corre este script na raiz do projecto twisisa (onde está o package.json)."
  exit 1
fi

mkdir -p scripts

echo "A escrever app/api/push/teste/route.ts"
cat > "app/api/push/teste/route.ts" <<'TWISISA_FASE0_EOF'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pushConfigError, pushConfigured, pushToUserReport } from '@/lib/push'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'A tua sessão expirou. Inicia sessão outra vez.' }, { status: 401 })
  if (!pushConfigured()) return NextResponse.json({ error: `As notificações não estão configuradas no servidor. ${pushConfigError() ?? ''}`.trim() }, { status: 503 })
  const report = await pushToUserReport(session.user.id, { title: 'Twisisa', body: 'Está a funcionar. Os lembretes de estudo chegam assim.', url: '/aluno/notificacoes', tag: 'teste' })
  if (report.ok > 0) return NextResponse.json({ ok: true, sent: report.ok })
  if (report.total === 0) return NextResponse.json({ error: 'Este aparelho não está registado no servidor. Desliga e liga outra vez.' }, { status: 502 })
  if (report.statuses.some((s) => s === 401 || s === 403)) return NextResponse.json({ error: 'O serviço de notificações recusou as chaves do servidor. Confirma que VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY são do mesmo par, faz novo deploy, desliga e liga outra vez neste aparelho.' }, { status: 502 })
  if (report.removed > 0) return NextResponse.json({ error: 'O registo deste aparelho tinha expirado e foi apagado. Desliga e liga outra vez.' }, { status: 502 })
  return NextResponse.json({ error: `Não foi possível enviar para este aparelho (código ${report.statuses.join(', ') || 'desconhecido'}). Desliga e liga outra vez.` }, { status: 502 })
}
TWISISA_FASE0_EOF

echo "A escrever app/globals.css"
cat > "app/globals.css" <<'TWISISA_FASE0_EOF'
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-marca: var(--marca);
  --color-marca-escura: var(--marca-escura);
  --color-marca-suave: var(--marca-suave);
  --color-fundo: var(--fundo);
  --color-linha: var(--linha);
  --color-texto: var(--texto);
  --color-texto-2: var(--texto-2);
  --color-sucesso: var(--sucesso);
  --color-sucesso-suave: var(--sucesso-suave);
  --color-sucesso-texto: var(--sucesso-texto);
  --color-erro: var(--erro);
  --color-erro-suave: var(--erro-suave);
  --color-erro-texto: var(--erro-texto);
  --color-aviso: var(--aviso);
  --color-aviso-suave: var(--aviso-suave);
  --color-aviso-texto: var(--aviso-texto);
  --color-ajuda: var(--ajuda);
  --color-ajuda-suave: var(--ajuda-suave);
  --color-assistente: var(--assistente);
  --color-assistente-suave: var(--assistente-suave);
  --color-conquista: var(--conquista);
  --color-conquista-suave: var(--conquista-suave);
  --color-conquista-texto: var(--conquista-texto);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  color-scheme: light;
  /* Cores com propósito: uma cor, um significado (ver State.md, «Cores»). Nunca só cor: ícone e texto também. */
  --marca: #1d4d41;          /* ação principal e identidade: um botão por ecrã */
  --marca-escura: #163e34;
  --marca-suave: #e6f0e9;
  --fundo: #f8f8f5;
  --linha: #e3e5dc;
  --texto: #202321;
  --texto-2: #5b645d;        /* texto de apoio, 5,5:1 sobre o fundo */
  --sucesso: #15803d;        /* resposta certa, meta cumprida */
  --sucesso-suave: #e7f6ec;
  --sucesso-texto: #166534;
  --erro: #b91c1c;           /* só: resposta errada, falha, erro de formulário, ações destrutivas */
  --erro-suave: #feecec;
  --erro-texto: #991b1b;
  --aviso: #b45309;          /* atenção: sequência em risco, tempo a acabar, disciplina fraca */
  --aviso-suave: #fff4e5;
  --aviso-texto: #7c2d12;
  --ajuda: #1d4ed8;          /* dicas, matéria relacionada, informação */
  --ajuda-suave: #e8f0fe;
  --assistente: #4338ca;     /* Jonas, Estudar depois, revisão */
  --assistente-suave: #eef0ff;
  --conquista: #d99a06;      /* sequência, pontos, ranking */
  --conquista-suave: #fef3c7;
  --conquista-texto: #92400e;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: var(--marca);
  --primary-foreground: #ffffff;
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: var(--erro);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  color-scheme: dark;
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    scroll-behavior: smooth;
  }
  html,
body {
  overflow-x: hidden;
}

body {
    @apply bg-background text-foreground;
    font-family: 'DM Sans', sans-serif;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Manrope', sans-serif;
  }
  button, a, input {
    -webkit-tap-highlight-color: transparent;
  }
  :focus-visible {
    outline: 2px solid var(--marca);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }
}


/* ───────────── Botões: a forma diz o papel ─────────────
   Ação = cantos suaves (14 px). Pílula fica só para etiquetas e estados (.chip).
   Primário: um por ecrã. Secundário: tonal. Terciário: só texto. Perigo: contorno vermelho. */
@layer components {
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 10px 18px; border-radius: 14px; font-size: 15px; font-weight: 600; line-height: 1.2; text-align: center; white-space: nowrap; text-decoration: none; cursor: pointer; transition: transform 0.08s ease, background-color 0.15s ease; -webkit-user-select: none; user-select: none; }
  .btn:active:not(:disabled) { transform: translateY(1px); }
  .btn:disabled, .btn[aria-disabled='true'] { cursor: default; opacity: 0.45; }
  .btn-grande { min-height: 52px; font-size: 16px; }
  .btn-primario { background: var(--marca); color: #fff; border-bottom: 3px solid var(--marca-escura); }
  .btn-primario:hover:not(:disabled) { background: var(--marca-escura); }
  .btn-primario:active:not(:disabled) { border-bottom-width: 2px; }
  .btn-secundario { background: var(--marca-suave); color: var(--marca); }
  .btn-secundario:hover:not(:disabled) { background: #d6e6dc; }
  .btn-terciario { min-height: 40px; padding: 8px 10px; background: transparent; color: var(--marca); }
  .btn-terciario:hover:not(:disabled) { text-decoration: underline; }
  .btn-perigo { background: #fff; color: var(--erro); box-shadow: inset 0 0 0 1.5px var(--erro); }
  .btn-perigo:hover:not(:disabled) { background: var(--erro-suave); }
  .btn-icone { width: 44px; padding: 0; flex: none; border-radius: 12px; background: transparent; color: var(--texto-2); }
  .btn-icone:hover:not(:disabled) { background: #eaede4; }
  .chip { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 500; }
  .kit-fab { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 50%; background: var(--ajuda); color: #fff; }
  .kit-fab:active { transform: scale(0.96); }
}

/* ═════════════ Camada viva (v3) ═════════════
   Regras: a estrutura vem de linhas finas (1px), não de sombras. Cada área tem UM tom (--tom) usado em fundos suaves.
   Cor cheia só na ação principal. Movimento só onde responde a um gesto, ou numa única ação por ecrã (aura). */
@property --aura-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }

/* Tom da área: marca (estudar), conquista (pontos, ranking, sequência), ajuda (biblioteca), assistente (Jonas), aviso (atenção). */
.tom-marca { --tom: var(--marca); --tom-suave: var(--marca-suave); --tom-texto: var(--marca); --tom-linha: #cfe0d5; }
.tom-conquista { --tom: var(--conquista); --tom-suave: #fffaea; --tom-texto: var(--conquista-texto); --tom-linha: #f3e1a6; }
.tom-ajuda { --tom: var(--ajuda); --tom-suave: var(--ajuda-suave); --tom-texto: #1e40af; --tom-linha: #c7d8fb; }
.tom-assistente { --tom: var(--assistente); --tom-suave: var(--assistente-suave); --tom-texto: #3730a3; --tom-linha: #d4d8fb; }
.tom-neutro { --tom: #6b716c; --tom-suave: #f1f3ed; --tom-texto: #4d5851; --tom-linha: #dde1d6; }
.tom-aviso { --tom: var(--aviso); --tom-suave: var(--aviso-suave); --tom-texto: var(--aviso-texto); --tom-linha: #f6d9ad; }

@layer components {
  /* Aura: um anel de cor a rodar à volta da ação principal. Usar em UMA ação por ecrã. */
  .btn-aura { position: relative; isolation: isolate; border: 0; background: transparent; color: #fff; filter: drop-shadow(0 4px 10px rgba(29, 77, 65, 0.18)); }
  .btn-aura::before { content: ''; position: absolute; inset: -2px; z-index: -2; border-radius: 16px; background: conic-gradient(from var(--aura-angle), #1d4d41 0deg, #4fae8f 80deg, #d99a06 150deg, #6d63e0 225deg, #4fae8f 300deg, #1d4d41 360deg); animation: aura-giro 5s linear infinite; }
  .btn-aura::after { content: ''; position: absolute; inset: 0; z-index: -1; border-radius: 14px; background: var(--marca); transition: background-color 0.15s ease; }
  .btn-aura:hover:not(:disabled)::after { background: var(--marca-escura); }
  .btn-aura:hover:not(:disabled)::before, .btn-aura:focus-visible::before { animation-duration: 1.6s; }
  .btn-aura:active:not(:disabled) { transform: translateY(1px) scale(0.99); }
  .btn-aura:disabled::before { animation: none; opacity: 0.4; }
  @keyframes aura-giro { to { --aura-angle: 360deg; } }

  /* Botão tonal com a cor da área (ex.: «Ver mais» azul na Biblioteca). */
  .btn-tom { background: var(--tom-suave, var(--marca-suave)); color: var(--tom-texto, var(--marca)); box-shadow: inset 0 0 0 1px var(--tom-linha, #cfe0d5); }
  .btn-tom:hover:not(:disabled) { filter: brightness(0.97); }

  /* Superfícies: três níveis. Linha fina por omissão; sombra só em elementos que flutuam. */
  .sf { background: #fff; border: 1px solid var(--linha); border-radius: 18px; }
  .sf-tom { background: var(--tom-suave, var(--marca-suave)); border: 1px solid var(--tom-linha, #cfe0d5); border-radius: 18px; }
  .sf-noite { position: relative; isolation: isolate; overflow: hidden; border-radius: 20px; color: #fff; background: radial-gradient(120% 90% at 100% 0%, rgba(79, 174, 143, 0.30), transparent 55%), linear-gradient(160deg, #20594a 0%, #12362d 100%); }
  .sf-noite::before { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none; background-image: radial-gradient(rgba(255, 255, 255, 0.13) 1px, transparent 1px); background-size: 16px 16px; -webkit-mask-image: linear-gradient(to bottom left, #000, transparent 72%); mask-image: linear-gradient(to bottom left, #000, transparent 72%); }
  .sf-flutua { box-shadow: 0 1px 2px rgba(20, 50, 40, 0.06), 0 12px 32px -16px rgba(20, 50, 40, 0.28); }
  .sf-toque { transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.08s ease; }
  .sf-toque:hover { border-color: var(--tom, var(--marca)); }
  .sf-toque:active { transform: scale(0.988); }

  /* Ícone num quadrado com a cor da área. */
  .ic-tom { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: var(--tom-suave, var(--marca-suave)); color: var(--tom-texto, var(--marca)); box-shadow: inset 0 0 0 1px var(--tom-linha, #cfe0d5); }
  .ic-tom-sm { width: 32px; height: 32px; border-radius: 10px; }
  .ic-tom-lg { width: 52px; height: 52px; border-radius: 16px; }

  /* Seletor segmentado: partes iguais, o texto nunca parte. */
  .seg { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 2px; padding: 3px; border-radius: 14px; background: #e8ebe3; }
  .seg > * { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 0 12px; border-radius: 11px; font-size: 14px; font-weight: 600; white-space: nowrap; color: var(--texto-2); text-decoration: none; transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease; }
  .seg > *:hover { color: var(--marca); }
  .seg > [aria-current='page'], .seg > [aria-pressed='true'] { background: #fff; color: var(--marca); box-shadow: 0 1px 2px rgba(20, 50, 40, 0.12); }

  /* Número tabular: pontos e posições alinham-se em coluna. */
  .num { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
}

/* O único momento de movimento do Ranking: os pilares do pódio crescem uma vez. */
@keyframes pilar-sobe { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.pilar { transform-origin: bottom; animation: pilar-sobe 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; animation-delay: var(--atraso, 0s); }
@keyframes cartao-entra { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }
.cartao-entra { animation: cartao-entra 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .btn-aura::before { animation: none; }
  .pilar, .cartao-entra { animation: none; }
}

/* Global route loader */
.global-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: #f8f8f5;
  color: #202321;
}
.global-loader__content { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.global-loader__mark { position: relative; display: grid; place-items: center; width: 84px; height: 84px; }
.global-loader__mark img { position: relative; z-index: 1; width: 70px; height: 56px; object-fit: contain; }
.global-loader__orbit { position: absolute; inset: -8px; border: 2px solid #dce7df; border-top-color: #1d4d41; border-radius: 999px; animation: estuda-spin .9s linear infinite; }

.global-loader__caption { color: #7a827b; font-size: 12px; }
@keyframes estuda-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .global-loader__orbit { animation-duration: 2.5s; } }

/* ───────────── Convite: envelope e carta ───────────── */
.env { position: relative; width: min(300px, 78vw); aspect-ratio: 3 / 2; perspective: 900px; filter: drop-shadow(0 18px 22px rgba(35, 54, 44, 0.16)); }
.env-back { position: absolute; inset: 0; border-radius: 10px; background: #e6dcc6; }
.env-paper { position: absolute; left: 7%; right: 7%; top: 8%; bottom: 8%; border-radius: 6px; background: #fff; transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.55s; }
.env-paper::before { content: ''; position: absolute; left: 12%; right: 12%; top: 22%; height: 3px; border-radius: 2px; background: #e3e8de; box-shadow: 0 12px 0 #e3e8de, 0 24px 0 #e3e8de; }
.env[data-open='true'] .env-paper { transform: translateY(-46%); }
.env-front { position: absolute; inset: 0; border-radius: 10px; background: #f3ecdb; clip-path: polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%); }
.env-flap { position: absolute; left: 0; top: 0; width: 100%; height: 56%; background: #ebe2cd; clip-path: polygon(0 0, 100% 0, 50% 100%); transform-origin: top; z-index: 3; transition: transform 0.6s ease, z-index 0s 0.3s; border-radius: 10px 10px 0 0; }
.env[data-open='true'] .env-flap { transform: rotateX(180deg); z-index: 0; }
.env-seal { position: absolute; left: 50%; top: 52%; z-index: 4; display: flex; width: 42px; height: 42px; align-items: center; justify-content: center; border-radius: 999px; background: #1d4d41; color: #fff; font-weight: 700; transform: translate(-50%, -50%); box-shadow: 0 4px 10px rgba(29, 77, 65, 0.35); transition: opacity 0.25s; }
.env[data-open='true'] .env-seal { opacity: 0; }

@keyframes letter-in { from { opacity: 0; transform: translateY(28px) scale(0.96); } to { opacity: 1; transform: none; } }
.letter-in { animation: letter-in 0.75s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.fade-up { animation: fade-up 0.5s ease both; }

/* A carta consome-se de baixo para cima. */
@keyframes letter-burn {
  0% { mask-position: 0 0; -webkit-mask-position: 0 0; filter: none; }
  45% { filter: sepia(0.85) contrast(1.05) brightness(0.96); }
  100% { mask-position: 0 100%; -webkit-mask-position: 0 100%; filter: sepia(1) brightness(0.55) blur(1.5px); transform: translateY(-6px) scale(0.985); }
}
.letter-burn {
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 33.3%, transparent 66.6%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 33.3%, transparent 66.6%, transparent 100%);
  -webkit-mask-size: 100% 300%; mask-size: 100% 300%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  animation: letter-burn 2.6s ease-in forwards;
}
@media (prefers-reduced-motion: reduce) {
  .env-paper, .env-flap, .env-seal, .letter-in, .fade-up, .letter-burn { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; transition-delay: 0s !important; }
}

/* ===== Twisisa · landing (prefixo tw-) ===== */
.tw{--g:#14704a;--gd:#073b27;--gs:#e8f2ec;--ink:#0d1f17;--mu:#5d6b64;--ln:#e4e8e2;--bg:#fbfbf9;background:var(--bg);color:var(--ink);font-family:'DM Sans',system-ui,sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased}
.tw h1,.tw h2,.tw h3{font-family:'Manrope',system-ui,sans-serif;letter-spacing:-.045em}
.tw-w{width:min(1120px,100% - 40px);margin-inline:auto}
.tw-sec{padding:84px 0}
.tw-tag{display:block;text-align:center;font-size:.74rem;letter-spacing:.15em;text-transform:uppercase;color:var(--g);font-weight:700;margin-bottom:14px}
.tw-h2{font-size:clamp(1.9rem,6vw,3.1rem);line-height:1.08;text-align:center;font-weight:800}
.tw-sub{max-width:560px;margin:16px auto 0;text-align:center;color:var(--mu);font-size:1.02rem;line-height:1.7}
.tw-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--g);color:#fff;font-weight:700;font-size:.92rem;padding:12px 24px;border-radius:99px;border:1px solid transparent;cursor:pointer;transition:transform .25s,box-shadow .25s,background .25s}
.tw-btn:hover{transform:translateY(-2px);box-shadow:0 12px 26px -12px var(--g)}
.tw-btn.lg{padding:16px 32px;font-size:1rem}
.tw-btn.ol{background:#fff;color:var(--ink);border-color:var(--ln)}
.tw-btn.wh{background:#fff;color:var(--gd)}
.tw-head{position:sticky;top:0;z-index:40;background:rgba(251,251,249,.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--ln)}
.tw-bar{display:flex;align-items:center;justify-content:space-between;height:66px}
.tw-brand{display:flex;align-items:center;gap:10px;font:800 1.2rem 'Manrope',sans-serif;letter-spacing:-.05em}
.tw-nav{display:none;gap:30px;font-size:.88rem;font-weight:600;color:var(--mu)}
.tw-nav a:hover{color:var(--g)}
.tw-mob{border-top:1px solid var(--ln);padding:12px 20px 20px;display:grid;gap:2px}
.tw-mob a{padding:12px 0;font-weight:600;border-bottom:1px solid var(--ln)}
.tw-hero{padding:64px 0 24px;text-align:center}
.tw-hero h1{font-size:clamp(2.8rem,11vw,6rem);line-height:1.02;font-weight:800;max-width:14ch;margin-inline:auto}
.tw-hero h1 em{font-style:normal;color:var(--g)}
.tw-hero .tw-sub{font-size:clamp(1.02rem,2.6vw,1.2rem);max-width:600px}
.tw-cta{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:32px}
.tw-duel{display:grid;gap:14px;margin-top:54px;text-align:left}
.tw-pn{background:#fff;border:1px solid var(--ln);border-radius:24px;padding:22px;min-height:200px;overflow:hidden}
.tw-pn.ok{border-color:var(--g)}
.tw-pn h3{font:700 .72rem 'DM Sans',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--mu)}
.tw-pn.ok h3{color:var(--g)}
.tw-pn p{margin:6px 0 16px;font-size:.92rem;color:var(--mu)}
.tw-words{display:flex;flex-wrap:wrap;gap:8px}
.tw-words span{padding:6px 12px;border-radius:99px;background:var(--gs);font-size:.85rem;animation:tw-forget 5s infinite;animation-delay:calc(var(--i)*.45s)}
@keyframes tw-forget{0%,25%{opacity:1;filter:none}75%,100%{opacity:.07;filter:blur(3px)}}
.tw-pn svg{width:100%;height:140px}
.tw-pn svg line{stroke:var(--g);stroke-width:2;stroke-dasharray:4 5;animation:tw-flow 1.4s linear infinite}
@keyframes tw-flow{to{stroke-dashoffset:-18}}
.tw-pn svg circle{fill:var(--g);animation:tw-pulse 2.4s infinite ease-in-out;transform-box:fill-box;transform-origin:center;animation-delay:calc(var(--i)*.4s)}
@keyframes tw-pulse{50%{transform:scale(1.35)}}
.tw-pn svg text{fill:var(--ink);font-size:12px}
.tw-chart{margin-top:40px;background:#fff;border:1px solid var(--ln);border-radius:24px;padding:18px 12px 8px}
.tw-chart svg{width:100%;height:auto;display:block}
.tw-chart path{fill:none;stroke-width:4;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 2.2s cubic-bezier(.3,.6,.2,1)}
.tw-chart.tw-in path{stroke-dashoffset:0}
.tw-chart .a{stroke:#9aa59e}.tw-chart .b{stroke:var(--g);transition-delay:.5s}
.tw-chart text{font-size:13px;fill:var(--mu)}.tw-chart .tg{fill:var(--g);font-weight:700}
.tw-grid3{display:grid;gap:12px;margin-top:20px}
.tw-card{background:#fff;border:1px solid var(--ln);border-radius:20px;padding:22px}
.tw-card i{font-style:normal;width:44px;height:44px;border-radius:50%;background:var(--gs);color:var(--g);display:grid;place-items:center;font-size:1.25rem;margin-bottom:14px}
.tw-card h3{font-size:1.08rem;font-weight:800;letter-spacing:-.03em}
.tw-card p{margin-top:6px;color:var(--mu);font-size:.93rem;line-height:1.65}
.tw-lab{background:#fff;border:1px solid var(--ln);border-radius:26px;padding:28px 18px;margin-top:36px;text-align:center}
.tw-eq{font:800 2.2rem 'Manrope',sans-serif;letter-spacing:-.04em;margin-bottom:26px}
.tw-scale{max-width:460px;margin:0 auto}
.tw-beam{height:6px;background:var(--ink);border-radius:9px}
.tw-pans{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tw-pan{min-height:100px;border:2px solid var(--ink);border-top:0;border-radius:0 0 42px 42px;padding:14px 8px;display:flex;flex-wrap:wrap;gap:8px;align-content:center;justify-content:center}
.tw-bx{width:44px;height:44px;border-radius:10px;background:var(--g);color:#fff;font:800 1.2rem 'Manrope',sans-serif;display:grid;place-items:center;transition:all .5s}
.tw-dt{width:20px;height:20px;border-radius:50%;background:var(--gd);transition:all .5s}
.tw-gone{opacity:0;transform:scale(.2);width:0!important;margin:0 -4px}
.tw-base{width:4px;height:34px;background:var(--ink);margin:0 auto}
.tw-lab .tw-cta{margin-top:20px}
.tw-lab small{display:block;margin-top:16px;color:var(--mu);font-size:.88rem}
.tw-steps{display:grid;gap:12px;margin-top:40px}
.tw-step b{font:800 .85rem 'Manrope',sans-serif;color:var(--g);letter-spacing:.1em}
.tw-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.tw-chips span{padding:6px 12px;border:1px solid var(--ln);border-radius:99px;font-size:.82rem;font-weight:600;background:var(--bg)}
.tw-tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:36px}
.tw-tabs button{border:1px solid var(--ln);background:#fff;font:700 .85rem 'DM Sans',sans-serif;color:var(--mu);padding:10px 18px;border-radius:99px;cursor:pointer}
.tw-tabs button.on{background:var(--g);border-color:var(--g);color:#fff}
.tw-in-win{margin-top:22px;background:#fff;border:1px solid var(--ln);border-radius:26px;overflow:hidden;box-shadow:0 40px 80px -46px rgba(7,59,39,.35);display:grid;animation:tw-up .5s}
@keyframes tw-up{from{opacity:0;transform:translateY(10px)}}
.tw-tx{padding:28px 24px}
.tw-tx h3{font-size:1.5rem;font-weight:800}
.tw-tx p{margin-top:10px;color:var(--mu);line-height:1.7}
.tw-tx ul{list-style:none;margin-top:18px;display:grid;gap:10px;padding:0}
.tw-tx li{display:flex;gap:10px;font-size:.95rem}
.tw-tx li::before{content:"✓";color:var(--g);font-weight:800}
.tw-tx .tw-btn{margin-top:22px}
.tw-vis{background:var(--gs);padding:24px;display:grid;gap:12px;align-content:center;min-height:280px}
.tw-row{display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:12px 14px;font-weight:600;font-size:.92rem}
.tw-row b{width:34px;height:34px;border-radius:10px;background:var(--gs);flex:none}
.tw-row small{margin-left:auto;color:var(--mu);font-weight:500}
.tw-bub{max-width:84%;padding:12px 16px;border-radius:18px;font-size:.9rem;line-height:1.5}
.tw-me{background:#fff;justify-self:end;border-bottom-right-radius:4px}
.tw-jo{background:var(--g);color:#fff;border-bottom-left-radius:4px}
.tw-dots{display:flex;gap:6px}.tw-dots i{flex:1;height:8px;border-radius:9px;background:#c9ddd1}.tw-dots i.f{background:var(--g)}
.tw-ring{width:96px;height:96px;border-radius:50%;margin:0 auto;display:grid;place-items:center;background:conic-gradient(var(--g) 70%,#c9ddd1 0);font:800 1.5rem 'Manrope',sans-serif}
.tw-ring span{width:74px;height:74px;border-radius:50%;background:#fff;display:grid;place-items:center}
.tw-art{display:grid;gap:12px;margin-top:36px}
.tw-art a{display:block;background:#fff;border:1px solid var(--ln);border-radius:20px;padding:22px;transition:transform .25s,border-color .25s}
.tw-art a:hover{transform:translateY(-3px);border-color:var(--g)}
.tw-art small{color:var(--g);font-weight:700;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase}
.tw-art h3{margin-top:8px;font-size:1.15rem;font-weight:800;line-height:1.25}
.tw-art p{margin-top:8px;color:var(--mu);font-size:.92rem;line-height:1.6}
.tw-plan{max-width:520px;margin:40px auto 0;background:#fff;border:2px solid var(--g);border-radius:28px;padding:32px 26px}
.tw-plan .pr{font:800 3rem 'Manrope',sans-serif;letter-spacing:-.05em;margin-top:14px}
.tw-plan .pr small{font-size:1rem;color:var(--mu);font-weight:600;letter-spacing:0}
.tw-plan ul{list-style:none;padding:0;margin:20px 0 26px;display:grid;gap:10px}
.tw-plan li{display:flex;gap:10px}.tw-plan li::before{content:"✓";color:var(--g);font-weight:800}
.tw-plan .tw-btn{width:100%}.tw-plan .fn{margin-top:14px;text-align:center;font-size:.8rem;color:var(--mu)}
.tw-close{padding:110px 0;text-align:center;color:#f1f7f3;background:linear-gradient(rgba(7,59,39,.84),rgba(7,59,39,.94)),url('/images/estudantes-estudo.jpg') center/cover}
.tw-close h2{font-size:clamp(2rem,7vw,3.6rem);font-weight:800;line-height:1.05;color:#fff}
.tw-close p{margin:16px auto 0;max-width:460px;color:#b9cfc3;line-height:1.7}
.tw-foot{padding:48px 0 30px;font-size:.88rem;color:var(--mu)}
.tw-ft{display:grid;gap:30px;padding-bottom:30px;border-bottom:1px solid var(--ln)}
.tw-ft h4{font-weight:700;color:var(--ink);margin-bottom:12px;font-size:.85rem}
.tw-ft a{display:block;margin:9px 0}.tw-ft a:hover{color:var(--g)}
.tw-bot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;padding-top:22px;font-size:.78rem}
.tw-rv{opacity:0;transform:translateY(28px);transition:opacity .9s cubic-bezier(.2,.7,.2,1),transform .9s cubic-bezier(.2,.7,.2,1);transition-delay:var(--d,0s)}
.tw-rv.tw-in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.tw-rv{opacity:1;transform:none;transition:none}.tw *{animation:none!important}.tw-chart path{stroke-dashoffset:0}}
@media (min-width:820px){
  .tw-nav{display:flex}.tw-menu{display:none!important}
  .tw-sec{padding:120px 0}.tw-hero{padding:110px 0 40px}
  .tw-duel{grid-template-columns:1fr 1fr}.tw-grid3,.tw-steps,.tw-art{grid-template-columns:repeat(3,1fr)}
  .tw-in-win{grid-template-columns:1fr 1fr}.tw-tx{padding:44px 40px}.tw-vis{padding:40px}
  .tw-ft{grid-template-columns:1.6fr 1fr 1fr 1fr}
}

/* Estado de processamento: botões de envio dentro de um formulário ocupado (aria-busy) */
form[aria-busy="true"] button[type="submit"] { cursor: progress; }
form[aria-busy="true"] button[type="submit"]::before {
  content: "";
  display: inline-block;
  flex-shrink: 0;
  width: 1em;
  height: 1em;
  margin-right: 0.5em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 9999px;
  vertical-align: -0.15em;
  animation: estuda-spin 0.7s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  form[aria-busy="true"] button[type="submit"]::before { animation-duration: 2s; }
}

/* [twisisa-ux] variantes de botão. O btn-aura deixa de girar: fica sólido, com sombra suave. */
.btn-aura { position: relative; border: 0; background: var(--marca); color: #fff; box-shadow: 0 6px 16px -8px rgba(29, 77, 65, 0.55); filter: none; isolation: auto; }
.btn-aura::before, .btn-aura::after { content: none; display: none; }
.btn-aura:hover:not(:disabled) { background: var(--marca-escura); }
.btn-aura:active:not(:disabled) { transform: translateY(1px); }
.btn-contorno { background: #fff; color: var(--marca); box-shadow: inset 0 0 0 1.5px var(--marca); }
.btn-contorno:hover:not(:disabled) { background: var(--marca-suave); }
.btn-escuro { background: var(--texto, #202321); color: #fff; }
.btn-escuro:hover:not(:disabled) { filter: brightness(1.15); }
.btn-destaque { background: var(--conquista, #d99a06); color: #fff; }
.btn-destaque:hover:not(:disabled) { filter: brightness(0.94); }

/* ───────── Movimento das páginas públicas (exames, simulado, blog) ─────────
   .rv / .rv-in: entrada ao fazer scroll (components/ui/reveal.tsx). .rv-hero: entrada do topo ao abrir.
   .ex-card: cartões que sobem ao passar o rato. Tudo desligado com «reduzir movimento». */
.rv { opacity: 0; transform: translateY(22px); transition: opacity 0.6s cubic-bezier(0.2, 0.7, 0.2, 1), transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1); transition-delay: var(--d, 0s); }
.rv.rv-in { opacity: 1; transform: none; }
@keyframes rv-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
.rv-hero > * { animation: rv-up 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both; animation-delay: calc(var(--i, 0) * 0.08s); }
.rv-hero > *:nth-child(2) { --i: 1; }
.rv-hero > *:nth-child(3) { --i: 2; }
.rv-hero > *:nth-child(4) { --i: 3; }
.rv-hero > *:nth-child(5) { --i: 4; }
.ex-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
.ex-card:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -20px rgba(20, 50, 40, 0.4); border-color: var(--marca); }
.ex-card:active { transform: translateY(-1px); }
@media (prefers-reduced-motion: reduce) {
  .rv, .rv.rv-in { opacity: 1; transform: none; transition: none; }
  .rv-hero > * { animation: none; }
  .ex-card, .ex-card:hover, .ex-card:active { transform: none; transition: none; }
}


/* [twisisa-home] movimento e botões da página inicial (skills de design engineering) */
.tw-btn{border:2px solid transparent;transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .2s ease,background-color .2s ease,border-color .2s ease,color .2s ease}
.tw-btn:hover{transform:none;box-shadow:none}
.tw-btn.sm{padding:9px 18px;font-size:.88rem}
.tw-btn.lg{font-size:1.02rem}
.tw-btn.ol{background:#fff;color:var(--g);border-color:var(--g)}
@media (hover:hover) and (pointer:fine){.tw-btn:hover{transform:translateY(-2px);box-shadow:0 12px 26px -12px var(--g)}.tw-btn.ol:hover{background:var(--g);color:#fff}.tw-btn.wh:hover{box-shadow:0 12px 26px -12px #000}}
.tw-btn:active{transform:scale(.97)}
.tw a:focus-visible,.tw button:focus-visible{outline:3px solid var(--g);outline-offset:3px;border-radius:10px}
.tw-nav{gap:26px;font-size:.95rem;font-weight:700;color:var(--ink)}
.tw-nav a{position:relative;padding:8px 2px;transition:color .2s ease}
.tw-nav a::after{content:"";position:absolute;left:0;right:0;bottom:2px;height:2px;border-radius:2px;background:var(--g);transform:scaleX(0);transform-origin:left;transition:transform .2s cubic-bezier(.23,1,.32,1)}
@media (hover:hover) and (pointer:fine){.tw-nav a:hover::after{transform:scaleX(1)}}
.tw-burger{padding:10px 12px;font-size:1.15rem;font-weight:700;color:var(--g);border-radius:12px;transition:background-color .2s ease,transform .16s cubic-bezier(.23,1,.32,1)}
.tw-burger:active{transform:scale(.95);background:var(--gs)}
.tw-mob{opacity:1;transform:none;transition:opacity .2s cubic-bezier(.23,1,.32,1),transform .2s cubic-bezier(.23,1,.32,1)}
@starting-style{.tw-mob{opacity:0;transform:translateY(-8px)}}
.tw-mob a{padding:14px 0;font-size:1.05rem;font-weight:700}
@keyframes tw-hero-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.tw-hero h1{animation:tw-hero-in .6s cubic-bezier(.23,1,.32,1) both}
.tw-hero .tw-cta{animation:tw-hero-in .5s cubic-bezier(.23,1,.32,1) .09s both}
.tw-pn h3{font:800 1.5rem 'Manrope',sans-serif;letter-spacing:-.04em;text-transform:none;color:var(--ink);margin-bottom:18px}
.tw-pn.ok h3{color:var(--g)}
@keyframes tw-forget{0%,25%{opacity:1}75%,100%{opacity:.1}}
.tw-pn:not(.tw-in) *{animation-play-state:paused}
.tw-step b{font:800 1rem 'Manrope',sans-serif;color:var(--g);letter-spacing:.1em}
.tw-step h3{margin-top:8px;font-size:1.3rem}
.tw-chips a{padding:10px 16px;border-radius:99px;font-size:.92rem;font-weight:700;background:var(--gs);color:var(--g);transition:transform .16s cubic-bezier(.23,1,.32,1),background-color .2s ease,color .2s ease}
@media (hover:hover) and (pointer:fine){.tw-chips a:hover{background:var(--g);color:#fff}}
.tw-chips a:active{transform:scale(.96)}
.tw-art a{transition:transform .2s cubic-bezier(.23,1,.32,1),border-color .2s ease}
.tw-art a:hover{transform:none;border-color:var(--ln)}
@media (hover:hover) and (pointer:fine){.tw-art a:hover{transform:translateY(-3px);border-color:var(--g)}}
.tw-art a:active{transform:scale(.98)}
.tw-rv{opacity:1;transform:none;transition:none}
.tw-js .tw-rv{opacity:0;transform:translateY(16px);transition:opacity .5s cubic-bezier(.23,1,.32,1),transform .5s cubic-bezier(.23,1,.32,1);transition-delay:var(--d,0s)}
.tw-js .tw-rv.tw-in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.tw-js .tw-rv{transform:none;transition:opacity .3s ease}.tw-hero h1,.tw-hero .tw-cta{animation:none}}

/* [twisisa-home-2] apresentação com imagem em círculo, problemas (escuro) e promessas (amarelo) */
.tw{--am:#ffcf33;--co:#ff6b4a;--dk:#0a1a14}
.tw-btn.dk{background:var(--ink);color:#fff}
@media (hover:hover) and (pointer:fine){.tw-btn.dk:hover{background:var(--gd)}}

.tw2-hero{padding:40px 0 64px}
.tw2-hero .tw-w{display:grid;gap:44px;align-items:center}
.tw2-copy{display:grid;justify-items:start;align-content:start}
.tw2-hero h1{margin:0;font-size:clamp(2.9rem,12vw,5rem);line-height:1;font-weight:800;animation:tw-hero-in .6s cubic-bezier(.23,1,.32,1) both}
.tw2-hero h1 em{display:block;font-style:normal;color:var(--g);white-space:nowrap}
.tw2-lead{margin:22px 0 0;font-size:clamp(1.15rem,3.4vw,1.45rem);font-weight:700;color:var(--ink);animation:tw-hero-in .5s cubic-bezier(.23,1,.32,1) .06s both}
.tw2-copy .tw-cta{justify-content:flex-start;animation:tw-hero-in .5s cubic-bezier(.23,1,.32,1) .12s both}
@keyframes tw2-pop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
.tw2-photo{position:relative;width:min(76vw,460px);aspect-ratio:1;margin-inline:auto}
.tw2-img{position:absolute;inset:0;border-radius:50%;overflow:hidden;border:8px solid #fff;box-shadow:0 30px 70px -30px rgba(7,59,39,.6);animation:tw2-pop .7s cubic-bezier(.23,1,.32,1) .1s both}
.tw2-img img{object-fit:cover;object-position:46% 38%}
.tw2-photo::before{content:"";position:absolute;inset:-16px;border-radius:50%;border:3px solid var(--am);animation:tw2-pop .7s cubic-bezier(.23,1,.32,1) .18s both}
.tw2-pill{position:absolute;display:inline-flex;align-items:center;padding:12px 20px;border-radius:99px;background:#fff;color:var(--ink);font-weight:800;font-size:.98rem;border:2px solid var(--ink);box-shadow:0 12px 26px -14px rgba(0,0,0,.5);transition:transform .16s cubic-bezier(.23,1,.32,1),background-color .2s ease,color .2s ease;animation:tw-hero-in .5s cubic-bezier(.23,1,.32,1) both}
.tw2-pill.p1{top:6%;left:-4%;animation-delay:.3s}
.tw2-pill.p2{top:46%;right:-6%;animation-delay:.38s}
.tw2-pill.p3{bottom:6%;left:2%;animation-delay:.45s}
@media (hover:hover) and (pointer:fine){.tw2-pill:hover{background:var(--g);border-color:var(--g);color:#fff;transform:translateY(-2px)}}
.tw2-pill:active{transform:scale(.96)}

.tw2-dark{background:var(--dk);color:#fff;padding:80px 0}
.tw2-sun{background:var(--am);color:var(--ink);padding:80px 0}
.tw2-h{margin:0;font:800 clamp(1.9rem,6vw,3.1rem)/1.08 'Manrope',system-ui,sans-serif;letter-spacing:-.045em}
.tw2-dark .tw2-h{color:#fff}
.tw2-list{list-style:none;margin:36px 0 0;padding:0}
.tw2-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 18px;padding:22px 0;border-top:2px solid rgba(255,255,255,.16);font:800 clamp(1.55rem,5.4vw,2.7rem)/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.045em}
.tw2-row i{font:800 1rem 'Manrope',sans-serif;font-style:normal;letter-spacing:.06em;min-width:2.2ch}
.tw2-row span{flex:1 1 14ch}
.tw2-dark .tw2-row i,.tw2-dark .tw2-row b{color:var(--co)}
.tw2-dark .tw2-row b{font-weight:800}
.tw2-sun .tw2-row{border-top-color:rgba(13,31,23,.22)}
.tw2-sun .tw2-row i{color:var(--gd)}
.tw2-sun .tw2-row b{font-weight:800;box-shadow:inset 0 -.32em 0 rgba(255,255,255,.7)}
.tw2-row .tw-btn{font:700 .95rem 'DM Sans',system-ui,sans-serif;letter-spacing:0}
.tw2-sun .tw-btn{margin-top:6px}
@media (min-width:820px){
  .tw2-hero{padding:84px 0 110px}
  .tw2-hero .tw-w{grid-template-columns:1.05fr .95fr;gap:64px}
  .tw2-dark,.tw2-sun{padding:110px 0}
  .tw2-row{flex-wrap:nowrap;align-items:center}
  .tw2-sun .tw-btn{margin-top:0;margin-left:auto}
}

.tw2-blog h2{font:800 clamp(1.5rem,4.5vw,2.1rem)/1.1 'Manrope',sans-serif;letter-spacing:-.04em;margin-bottom:8px}
.tw2-blog a{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 0;border-top:1px solid var(--ln);font-weight:700;font-size:1.05rem;color:var(--ink);transition:color .2s ease}
.tw2-blog a b{color:var(--g);font-size:1.3rem;transition:transform .2s cubic-bezier(.23,1,.32,1)}
@media (hover:hover) and (pointer:fine){.tw2-blog a:hover{color:var(--g)}.tw2-blog a:hover b{transform:translateX(4px)}}
.tw2-blog a:active{color:var(--g)}

.tw2-close{padding:96px 0;text-align:center;background:var(--g);color:#fff}
.tw2-close h2{font:800 clamp(2rem,7vw,3.6rem)/1.05 'Manrope',sans-serif;letter-spacing:-.045em;color:#fff}
@media (prefers-reduced-motion:reduce){.tw2-hero h1,.tw2-lead,.tw2-copy .tw-cta,.tw2-img,.tw2-photo::before,.tw2-pill{animation:none}}

/* [twisisa-home-3] números, plataforma por dentro, passos e perguntas */
.tw3-nums{background:var(--g);color:#fff;padding:34px 0}
.tw3-nums .tw-w{display:flex;flex-wrap:wrap;justify-content:space-around;gap:22px;text-align:center}
.tw3-nums b{display:block;font:800 clamp(2.4rem,9vw,3.6rem)/1 'Manrope',system-ui,sans-serif;letter-spacing:-.05em}
.tw3-nums span{font-weight:800;font-size:1.05rem;color:var(--am)}
.tw3-in{padding:84px 0;background:#eaf4ee}
.tw3-feat{display:grid;gap:30px;align-items:center;margin-top:52px}
.tw3-txt i{font-style:normal;font-weight:800;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;color:var(--g)}
.tw3-txt h3{margin:10px 0 22px;font:800 clamp(1.8rem,5.5vw,2.6rem)/1.06 'Manrope',system-ui,sans-serif;letter-spacing:-.045em}
.tw3-mock{background:#fff;border:2px solid var(--ink);border-radius:24px;padding:22px;box-shadow:9px 9px 0 var(--am)}
.tw3-top{display:flex;gap:8px;margin-bottom:8px}
.tw3-top span{padding:7px 15px;border-radius:99px;font-weight:800;font-size:.85rem;background:var(--gs);color:var(--g)}
.tw3-top span:first-child{background:var(--g);color:#fff}
.tw3-li{display:flex;align-items:center;gap:12px;padding:15px 0;border-top:1px solid var(--ln)}
.tw3-li b{flex:1;font-weight:800;font-size:1.05rem}
.tw3-li em{font-style:normal;font-weight:800;color:var(--g)}
.tw3-li u{text-decoration:none;padding:7px 15px;border-radius:99px;background:var(--g);color:#fff;font-weight:800;font-size:.85rem}
.tw3-q{margin:0 0 14px;font:800 1.25rem/1.3 'Manrope',system-ui,sans-serif;letter-spacing:-.03em}
.tw3-op{padding:13px 16px;margin-top:8px;border:2px solid var(--ln);border-radius:14px;font-weight:700}
.tw3-op.ok{border-color:var(--g);background:var(--gs);color:var(--gd)}
.tw3-nota{display:flex;align-items:baseline;justify-content:space-between;margin-top:18px;padding:16px 20px;border-radius:16px;background:var(--ink);color:#fff}
.tw3-nota span{font-weight:700}
.tw3-nota b{font:800 2.6rem/1 'Manrope',system-ui,sans-serif;color:var(--am);letter-spacing:-.04em}
.tw3-nota small{font-size:1.1rem;color:#fff;font-weight:700}
.tw3-b{max-width:90%;margin-top:10px;padding:13px 16px;border-radius:18px;font-weight:600;line-height:1.45}
.tw3-b.me{margin-left:auto;background:var(--g);color:#fff;border-bottom-right-radius:6px}
.tw3-b.ai{background:var(--am);color:var(--ink);border-bottom-left-radius:6px}
.tw3-b strong{display:block;margin-bottom:4px;font-weight:800}
.tw3-how{padding:84px 0;text-align:center}
.tw3-how ol{list-style:none;margin:44px 0 36px;padding:0;display:grid;gap:22px}
.tw3-how li{display:flex;flex-direction:column;align-items:center;gap:14px}
.tw3-how li b{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:var(--ink);color:#fff;font:800 1.6rem 'Manrope',system-ui,sans-serif}
.tw3-how li span{font:800 1.3rem/1.2 'Manrope',system-ui,sans-serif;letter-spacing:-.03em}
.tw3-how .tw-cta{justify-content:center}
.tw3-faq{padding:24px 0 84px}
.tw3-faq details{border-top:2px solid var(--ink);padding:20px 0}
.tw3-faq details:last-child{border-bottom:2px solid var(--ink)}
.tw3-faq summary{display:flex;justify-content:space-between;gap:16px;cursor:pointer;list-style:none;font:800 1.2rem/1.3 'Manrope',system-ui,sans-serif;letter-spacing:-.03em}
.tw3-faq summary::-webkit-details-marker{display:none}
.tw3-faq summary b{color:var(--g);font-size:1.7rem;line-height:1;transition:transform .2s cubic-bezier(.23,1,.32,1)}
.tw3-faq details[open] summary b{transform:rotate(45deg)}
.tw3-faq p{margin:12px 0 0;font-size:1.05rem;line-height:1.6;color:var(--ink)}
@media (min-width:820px){
  .tw3-in,.tw3-how{padding:110px 0}
  .tw3-feat{grid-template-columns:1fr 1fr;gap:72px;margin-top:84px}
  .tw3-feat.rev .tw3-txt{order:2}
  .tw3-how ol{grid-template-columns:repeat(3,1fr);gap:28px}
}

/* [twisisa-home-4] imagem primeiro, botões na mesma linha, cores suaves e mais conteúdo */
.tw{--am:#e8c872}
.tw2-hero .tw-w{grid-template-columns:1fr}
.tw2-copy .tw-cta{flex-wrap:nowrap;gap:10px;width:100%}
.tw2-copy .tw-btn.lg{flex:1 1 0;min-width:0;padding:15px 12px;font-size:.98rem;white-space:nowrap}
.tw2-photo::before{border:3px solid #b9d9c7}
.tw2-sun{background:#f2ede1}
.tw2-sun .tw2-row{border-top-color:rgba(13,31,23,.18)}
.tw2-sun .tw2-row b{box-shadow:inset 0 -.32em 0 #cfe5d8}
.tw3-nums span{color:#e3f3ea}
.tw3-mock{box-shadow:9px 9px 0 #cfe5d8}
.tw3-b.ai{background:#e3f1e8;color:var(--ink)}
.tw3-nota b{color:#f0d78c}
.tw4-modes{padding:84px 0 24px}
.tw4-modes ul{list-style:none;margin:32px 0 0;padding:0}
.tw4-modes li{display:grid;gap:6px;padding:22px 0;border-top:2px solid var(--ink)}
.tw4-modes li:last-child{border-bottom:2px solid var(--ink)}
.tw4-modes li b{font:800 clamp(1.5rem,5vw,2rem)/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.04em}
.tw4-modes li span{font-weight:600;font-size:1.05rem;line-height:1.45}
.tw4-modes li em{justify-self:start;font-style:normal;font-weight:800;font-size:.88rem;padding:6px 14px;border-radius:99px;background:var(--gs);color:var(--g)}
.tw4-all{padding:72px 0}
.tw4-all ul{list-style:none;margin:36px 0 0;padding:0;display:grid;gap:26px 40px}
.tw4-all li{display:flex;align-items:flex-start;gap:16px}
.tw4-all .ic{display:grid;place-items:center;flex:none;width:48px;height:48px;border-radius:14px;background:var(--g);color:#fff}
.tw4-all li b{display:block;font:800 1.15rem/1.25 'Manrope',system-ui,sans-serif;letter-spacing:-.02em}
.tw4-all li div span{display:block;margin-top:3px;font-weight:600;line-height:1.45}
.tw4-for{padding:24px 0 84px}
.tw4-for>.tw-w>div{display:grid;gap:18px;margin-top:32px}
.tw4-for a{display:block;padding:26px 24px;border-radius:22px;border:2px solid var(--ink);background:#fff;border-top-width:10px;transition:transform .2s cubic-bezier(.23,1,.32,1)}
.tw4-for a.g{border-top-color:var(--g)}.tw4-for a.k{border-top-color:var(--ink)}.tw4-for a.o{border-top-color:var(--am)}
.tw4-for h3{margin:0 0 14px;font:800 1.6rem/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.04em}
.tw4-for ul{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px}
.tw4-for li{font-weight:600;padding-left:22px;position:relative}
.tw4-for li::before{content:"✓";position:absolute;left:0;color:var(--g);font-weight:800}
.tw4-for .go{font-weight:800;color:var(--g)}
@media (hover:hover) and (pointer:fine){.tw4-for a:hover{transform:translateY(-3px)}}
.tw4-for a:active{transform:scale(.98)}
.tw4-find{padding:64px 0;background:var(--dk);color:#fff;text-align:center}
.tw4-find .tw-w{display:grid;justify-items:center;gap:24px}
.tw4-find h2{margin:0;font:800 clamp(1.7rem,5.5vw,2.6rem)/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.045em;max-width:20ch}
@media (min-width:820px){
  .tw2-hero .tw-w{grid-template-columns:.95fr 1.05fr}
  .tw2-copy .tw-cta{width:auto}
  .tw2-copy .tw-btn.lg{flex:0 0 auto;padding:16px 32px}
  .tw4-modes{padding:110px 0 30px}
  .tw4-modes li{grid-template-columns:.7fr 1.5fr auto;align-items:center;gap:28px}
  .tw4-all{padding:96px 0}
  .tw4-all ul{grid-template-columns:1fr 1fr}
  .tw4-for>.tw-w>div{grid-template-columns:repeat(3,1fr)}
}

/* [twisisa-home-5] páginas secundárias no mesmo estilo da página inicial */
.tw{--color-texto-2:#34453b}
.tw-nav a[aria-current=page]{color:var(--g)}
.tw-nav a[aria-current=page]::after{transform:scaleX(1)}
.tw-mob a[aria-current=page]{color:var(--g)}
.tw5-skip{position:absolute;left:-9999px;top:8px;z-index:60;padding:10px 16px;border-radius:10px;background:#fff;color:var(--g);font-weight:800}
.tw5-skip:focus{left:16px}
.tw5{max-width:1040px;margin:0 auto;padding:26px 20px 24px}
.tw5-back{display:flex;align-items:center;flex-wrap:wrap;gap:12px 18px;margin-bottom:30px}
.tw5-back nav{display:none;align-items:center;gap:8px;font-weight:700;font-size:.92rem}
.tw5-back nav a{color:var(--g)}
.tw5-back nav i{font-style:normal;color:var(--ink);opacity:.4}
.tw5-back nav b{font-weight:800;color:var(--ink)}
.tw5-h1{margin:0;font:800 clamp(2.2rem,7.5vw,4rem)/1.02 'Manrope',system-ui,sans-serif;letter-spacing:-.05em}
.tw5-h1 em{font-style:normal;color:var(--g)}
.tw5-sub{margin:14px 0 0;font-weight:700;font-size:1.15rem;color:var(--ink)}
.tw5-top{animation:tw-hero-in .55s cubic-bezier(.23,1,.32,1) both}
.tw5-sec{margin-top:60px}
.tw5-h2{margin:0 0 20px;font:800 clamp(1.5rem,4.8vw,2.2rem)/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.045em}
.tw5-search{display:flex;gap:10px;margin-top:26px;max-width:640px}
.tw5-search div{flex:1;min-width:0}
.tw5-search input{width:100%;height:56px;padding:0 22px;border:2px solid var(--ink);border-radius:99px;background:#fff;color:var(--ink);font:600 1rem 'DM Sans',system-ui,sans-serif;outline:none;transition:border-color .2s ease,box-shadow .2s ease}
.tw5-search input::placeholder{color:#4f6157}
.tw5-search input:focus{border-color:var(--g);box-shadow:0 0 0 4px var(--gs)}
.tw5-search .tw-btn{height:56px;padding:0 26px}
.tw5-tiles{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.tw5-tile{display:flex;flex-direction:column;gap:6px;height:100%;padding:22px;border:2px solid var(--ink);border-top:8px solid var(--g);border-radius:20px;background:#fff;color:var(--ink);transition:transform .2s cubic-bezier(.23,1,.32,1)}
.tw5-tile b{font:800 1.6rem/1.1 'Manrope',system-ui,sans-serif;letter-spacing:-.04em}
.tw5-tile small{font-weight:600;font-size:.95rem;line-height:1.4}
.tw5-tile span{margin-top:auto;padding-top:10px;font-weight:800;color:var(--g)}
@media (hover:hover) and (pointer:fine){.tw5-tile:hover{transform:translateY(-3px)}}
.tw5-tile:active{transform:scale(.98)}
.tw5-rows{list-style:none;margin:0;padding:0;border-bottom:2px solid var(--ink)}
.tw5-row{display:flex;align-items:center;gap:14px;padding:18px 6px;border-top:2px solid var(--ink);color:var(--ink);transition:background-color .2s ease}
.tw5-row b{flex:1;font:800 1.1rem/1.25 'Manrope',system-ui,sans-serif;letter-spacing:-.02em}
.tw5-row em{font-style:normal;font-weight:800;color:var(--g)}
.tw5-row u{text-decoration:none;padding:8px 18px;border-radius:99px;background:var(--g);color:#fff;font-weight:800;font-size:.88rem;transition:transform .16s cubic-bezier(.23,1,.32,1)}
@media (hover:hover) and (pointer:fine){.tw5-row:hover{background:var(--gs)}}
.tw5-row:active u{transform:scale(.95)}
.tw5-chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px}
.tw5-chips a,.tw5-chips span{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:99px;background:var(--gs);color:var(--g);font-weight:800;font-size:.95rem;transition:transform .16s cubic-bezier(.23,1,.32,1),background-color .2s ease,color .2s ease}
.tw5-chips span{color:var(--ink)}
@media (hover:hover) and (pointer:fine){.tw5-chips a:hover{background:var(--g);color:#fff}}
.tw5-chips a:active{transform:scale(.96)}
.tw5-actions{display:flex;gap:10px;margin-top:26px}
.tw5-actions .tw-btn{flex:1 1 0;min-width:0;white-space:nowrap}
@media (max-width:480px){.tw5-actions .tw-btn{padding:0 14px;height:50px;font-size:.88rem}.tw5-actions .tw-btn svg{width:16px;height:16px;flex:none}}
@media (min-width:480px){.tw5-actions .tw-btn{flex:0 0 auto}}
.tw5-topic{padding:24px 0;border-top:2px solid var(--ink)}
.tw5-topic:last-child{border-bottom:2px solid var(--ink)}
.tw5-topic h3{margin:0;font:800 1.35rem/1.2 'Manrope',system-ui,sans-serif;letter-spacing:-.03em}
.tw5-topic h3 i{font-style:normal;color:var(--g);margin-right:8px}
.tw5-topic p{margin:10px 0 0;font-size:1.02rem;line-height:1.65;white-space:pre-line}
.tw5-topic .dica{margin-top:14px;padding:12px 16px;border-radius:14px;background:var(--gs);font-weight:700;color:var(--gd)}
.tw5-view{display:block;width:100%;height:62dvh;margin-top:30px;border:2px solid var(--ink);border-radius:20px;background:#fff}
.tw5-band{margin-top:60px;padding:34px 26px;border-radius:24px;background:var(--g);color:#fff;display:grid;gap:18px;justify-items:start}
.tw5-band h2{margin:0;font:800 clamp(1.6rem,5vw,2.3rem)/1.08 'Manrope',system-ui,sans-serif;letter-spacing:-.045em;color:#fff}
.tw5-band .tw-cta{margin:0;justify-content:flex-start}
.tw5-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:34px;font-weight:800}
.tw5-faq details{border-top:2px solid var(--ink);padding:20px 0}
.tw5-faq details:last-child{border-bottom:2px solid var(--ink)}
.tw5-faq summary{display:flex;justify-content:space-between;gap:16px;cursor:pointer;list-style:none;font:800 1.15rem/1.3 'Manrope',system-ui,sans-serif;letter-spacing:-.03em}
.tw5-faq summary::-webkit-details-marker{display:none}
.tw5-faq summary b{color:var(--g);font-size:1.7rem;line-height:1;transition:transform .2s cubic-bezier(.23,1,.32,1)}
.tw5-faq details[open] summary b{transform:rotate(45deg)}
.tw5-faq p{margin:12px 0 0;font-size:1.02rem;line-height:1.6;color:var(--ink)}
.tw5-vazio{padding:26px;border:2px dashed var(--ink);border-radius:20px;font-weight:700}
@media (min-width:640px){.tw5-tiles{grid-template-columns:repeat(2,1fr)}}
@media (min-width:900px){
  .tw5{padding-top:34px}
  .tw5-back nav{display:flex}
  .tw5-tiles{grid-template-columns:repeat(3,1fr)}
  .tw5-view{height:78dvh}
  .tw5-band{grid-template-columns:1fr auto;align-items:center;padding:40px 44px}
}
@media (prefers-reduced-motion:reduce){.tw5-top{animation:none}}
.tw5-back nav span{display:inline-flex;align-items:center;gap:8px}
.tw-ft{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.tw-ft a{color:var(--ink);font-weight:600}
.tw-ft h4{color:var(--ink)}
TWISISA_FASE0_EOF

echo "A escrever components/aluno/desafios/parts.tsx"
cat > "components/aluno/desafios/parts.tsx" <<'TWISISA_FASE0_EOF'
import Link from 'next/link'
import { ArrowRight, Check, ChevronDown, Flame, X, type LucideIcon } from 'lucide-react'
import { CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DesafiosSnapshot } from '@/lib/desafios'
import {
  DAILY_ACCURACY, DAILY_SUBJECT_GOAL, MIN_SAMPLE, READY_VOLUME, WEAK_BELOW, WEEK_CLASS_SUBJECTS, WEEK_CLASS_SUBJECT_QUESTIONS,
  WEEK_DAYS_GOAL, WEEK_POINTS_GOAL, WEEK_SUBJECT_QUESTIONS, formatLeft, plural, streakNeed, type Mission,
} from '@/lib/desafios-regras'
import { formatPoints } from '@/lib/simulator-shared'

const card = 'sf'

function Bar({ value, tone = 'green' }: { value: number; tone?: 'green' | 'red' | 'sand' }) {
  const color = tone === 'red' || tone === 'sand' ? 'bg-aviso' : 'bg-marca'
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#e8ebe3]" role="presentation">
      <div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

/** Sequência: número grande, melhor marca e a meta de hoje com a hora a que o dia acaba. */
export function StreakCard({ s }: { s: DesafiosSnapshot }) {
  const pct = Math.round((Math.min(s.todayAnswered, s.goal) / s.goal) * 100)
  return (
    <section aria-label="Sequência" className="sf-noite p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-[#ffd479]" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
            <Flame size={24} aria-hidden="true" />
          </span>
          <p className="flex items-baseline gap-2">
            <span className="num text-[44px] font-semibold leading-none tracking-[-0.05em]">{s.streak.current}</span>
            <span className="text-[15px] font-semibold">{s.streak.current === 1 ? 'dia seguido' : 'dias seguidos'}</span>
          </p>
        </div>
        <p className="shrink-0 whitespace-nowrap rounded-full bg-white/12 px-3 py-1 text-xs font-semibold">Melhor: {s.streak.best}</p>
      </div>
      <div className="mt-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2.5 truncate whitespace-nowrap text-[13px] leading-5 text-white/85">
          {s.streak.todayCounted ? 'Sequência de hoje garantida.' : `Faltam ${Math.max(0, streakNeed(s.goal) - s.todayAnswered)} para a sequência de hoje.`}
        </p>
        <p className="truncate whitespace-nowrap text-[13px] leading-5 text-white/85">
          {s.streak.todayMet ? 'Meta de hoje cumprida.' : `Meta: ${s.todayAnswered} de ${s.goal} · acaba em ${formatLeft(s.secondsLeft)}`}
        </p>
      </div>
    </section>
  )
}

function MissionRow({ mission }: { mission: Mission }) {
  const done = mission.status === 'feita'
  const failed = mission.status === 'falhada'
  const pct = Math.round((mission.current / mission.target) * 100)
  const value = mission.unit === '%' ? `${mission.current}% de ${mission.target}%` : `${mission.unit === 'pts' ? formatPoints(mission.current) : mission.current} de ${mission.target} ${mission.unit}`
  const body = (
    <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
      <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-marca text-white' : failed ? 'bg-aviso text-white' : 'border-[1.5px] border-dashed border-[#b9c0b4]'}`} role="img" aria-label={done ? 'Feita' : failed ? 'Falhada' : 'Por fazer'}>
        {done && <Check size={13} strokeWidth={3} aria-hidden="true" />}
        {failed && <X size={13} strokeWidth={3} aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${done ? 'text-texto-2' : 'text-texto'}`}>{mission.title}</span>
        {mission.detail && <span className={`mt-0.5 block text-xs ${failed ? 'font-medium text-[#9a3412]' : 'text-texto-2'}`}>{mission.detail}</span>}
        <span className="mt-2 block"><Bar value={pct} tone={failed ? 'red' : 'green'} /></span>
        <span className="mt-1 block text-xs text-texto-2">{value}</span>
      </span>
    </div>
  )
  return !done && !failed && mission.href ? <Link href={mission.href} className="block no-underline transition-colors hover:bg-fundo">{body}</Link> : body
}

export function MissionList({ title, hint, missions, icon: Icon = CalendarCheck, tone = 'marca' }: { title: string; hint: string; missions: Mission[]; icon?: LucideIcon; tone?: 'marca' | 'conquista' | 'ajuda' | 'assistente' | 'aviso' }) {
  const done = missions.filter((m) => m.status === 'feita').length
  return (
    <section aria-label={title} className={`tom-${tone}`}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-texto">
          <span className="ic-tom ic-tom-sm"><Icon size={16} aria-hidden="true" /></span>
          {title}
        </h2>
        <p className="shrink-0 whitespace-nowrap text-xs text-texto-2"><span className="num font-semibold text-[color:var(--tom-texto)]">{done}/{missions.length}</span> · {hint}</p>
      </div>
      <div className={cn(card, 'divide-y divide-linha overflow-hidden')}>{missions.map((mission) => <MissionRow key={mission.id} mission={mission} />)}</div>
    </section>
  )
}

function Anel({ percent }: { percent: number }) {
  const raio = 30
  const volta = 2 * Math.PI * raio
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`${percent}% preparado`} className="shrink-0 text-marca">
      <circle cx="38" cy="38" r={raio} fill="none" stroke="#e1e8de" strokeWidth="7" />
      <circle cx="38" cy="38" r={raio} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(volta * Math.max(0, Math.min(100, percent))) / 100} ${volta}`} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor" className="num">{percent}%</text>
    </svg>
  )
}

/** Prontidão para o curso escolhido (admissão): a razão para voltar todos os dias. */
export function ReadinessCard({ s }: { s: DesafiosSnapshot }) {
  if (!s.admission) return null
  if (!s.course) {
    return (
      <section aria-label="Curso alvo" className={`${card} p-5`}>
        <h2 className="text-base font-semibold tracking-[-0.02em]">Escolhe o teu curso</h2>
        <p className="mt-1 text-sm text-texto-2">Cada curso exige provas diferentes. Com o curso escolhido, os desafios passam a treinar essas disciplinas e vês quão perto estás.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/aluno/perfil#percurso" className="btn btn-primario">Escolher curso</Link>
          <Link href="/aluno/descobrir-curso" className="btn btn-secundario">Não sei: teste vocacional</Link>
        </div>
      </section>
    )
  }
  const percent = s.readiness ?? 0
  return (
    <section aria-label="Prontidão para o curso" className={`${card} p-5`}>
      <div className="flex items-center gap-4">
        <Anel percent={percent} />
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold leading-5 tracking-[-0.01em]">{s.course.name}</h2>
          <p className="mt-0.5 text-xs leading-4 text-texto-2">{[s.course.unit, s.course.institution].filter(Boolean).join(' · ')}</p>
          <p className="mt-1.5 text-[13px] font-medium text-marca">Prontidão para o curso</p>
        </div>
      </div>
      {s.subjects.length === 0 ? (
        <p className="mt-4 text-sm text-texto-2">Ainda não há questões para as provas deste curso.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {s.subjects.map((subject) => (
            <li key={subject.id}>
              <Link href={`/aluno/simulador?d=${encodeURIComponent(subject.id)}`} className="block no-underline">
                <span className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium text-texto">{subject.name}</span><span className="text-xs text-texto-2">{subject.accuracy === null ? 'sem respostas' : `${subject.accuracy}% de acertos · ${subject.answered} questões`}</span></span>
                <span className="mt-1.5 block"><Bar value={subject.readiness} tone={subject.accuracy !== null && subject.answered >= MIN_SAMPLE && subject.accuracy < WEAK_BELOW ? 'red' : 'green'} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs leading-5 text-texto-2">Mede acertos e volume dos últimos 30 dias: {READY_VOLUME} questões numa disciplina contam como 100% de volume. Não garante a entrada.</p>
    </section>
  )
}

/** Regras à vista, para ninguém ser apanhado de surpresa. Os números vêm de lib/desafios-regras.ts. */
export function Regras({ admission, goal }: { admission: boolean; goal: number }) {
  const rules = [
    `Um dia só conta se responderes a ${goal} questões. O dia vai da meia-noite à meia-noite, hora de Maputo.`,
    'A sequência são os dias seguidos com a meta cumprida. Falhar um dia inteiro põe-na a zero. Não há exceções nem «congelar».',
    `A disciplina do dia é a tua mais fraca: ${DAILY_SUBJECT_GOAL} questões. Se ainda não há dados, roda por dia.`,
    `A missão de precisão pede ${DAILY_ACCURACY}% de acertos, a partir de ${goal} respostas no dia.`,
    `Semana (segunda a domingo): ${WEEK_DAYS_GOAL} dias com a meta, ${WEEK_POINTS_GOAL} pontos e ${admission ? `${WEEK_SUBJECT_QUESTIONS} questões em cada disciplina do teu curso` : `${plural(WEEK_CLASS_SUBJECTS, 'disciplina', 'disciplinas')} com ${WEEK_CLASS_SUBJECT_QUESTIONS} questões cada`}.`,
    'Quando já não dá para cumprir uma missão da semana, fica falhada. Na segunda-feira tudo recomeça: nada transita.',
    'Os pontos vêm das questões certas e questões repetidas valem menos. Tudo é calculado a partir das tuas respostas no Simulador.',
  ]
  return (
    <details className={`${card} group`}>
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-texto marker:hidden sm:px-5 [&::-webkit-details-marker]:hidden">
        Regras
        <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-[#9aa29c] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <ul className="space-y-2.5 border-t border-[#eceee7] px-4 py-4 text-sm leading-6 text-texto-2 sm:px-5">
        {rules.map((rule) => <li key={rule} className="flex gap-2"><ArrowRight size={14} className="mt-1.5 shrink-0 text-marca" aria-hidden="true" /><span>{rule}</span></li>)}
      </ul>
    </details>
  )
}
TWISISA_FASE0_EOF

echo "A escrever components/aluno/escolher-curso-flow.tsx"
cat > "components/aluno/escolher-curso-flow.tsx" <<'TWISISA_FASE0_EOF'
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { ListaEscolha, type ItemEscolha } from '@/components/ui/lista-escolha'
import { listCourseCombos, saveCourse } from '@/app/aluno/bem-vindo/actions'

type Combo = { optionId: string; label: string }

// Curso e, se o curso aceitar mais de uma combinação, a combinação de provas. Só botões. Guardado, segue para onde o aluno ia.
export function EscolherCursoFlow({ courses, initialCourseId, initialCombos, onConcluido, orientacaoHref }: { courses: ItemEscolha[]; initialCourseId: string | null; initialCombos: Combo[]; onConcluido: () => void; orientacaoHref: string | null }) {
  const feedback = useFeedback()
  const [courseId, setCourseId] = useState<string | null>(initialCourseId)
  const [combos, setCombos] = useState<Combo[]>(initialCombos)
  const [optionId, setOptionId] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<'curso' | 'combo'>(initialCourseId && initialCombos.length > 1 ? 'combo' : 'curso')
  const [pending, setPending] = useState(false)

  const concluir = onConcluido

  async function continuar() {
    if (pending || !courseId) return
    setPending(true)
    try {
      if (etapa === 'combo') {
        const res = await saveCourse({ courseId, optionId })
        if (res.ok) return concluir()
        return feedback.error(res.message)
      }
      const list = await listCourseCombos(courseId)
      if (!list.ok) return feedback.error(list.message)
      if (list.combos.length > 1) {
        setCombos(list.combos)
        setOptionId(null)
        return setEtapa('combo')
      }
      const res = await saveCourse({ courseId, optionId: list.combos[0]?.optionId ?? null })
      if (res.ok) return concluir()
      feedback.error(res.message)
    } catch {
      feedback.error('Não foi possível guardar. Tenta outra vez.')
    } finally {
      setPending(false)
    }
  }

  if (etapa === 'combo') {
    return (
      <div className="grid gap-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Que provas vais fazer?</h2>
          <p className="mt-1 text-[14px] leading-5 text-texto-2">Este curso aceita mais do que uma combinação. O Simulador passa a mostrar só as disciplinas que escolheres.</p>
        </div>
        <ListaEscolha rotulo="Combinação de provas" valor={optionId} onChange={setOptionId} itens={combos.map((combo) => ({ id: combo.optionId, label: combo.label }))} />
        <button type="button" onClick={continuar} disabled={pending || !optionId} aria-busy={pending} className="btn btn-primario btn-grande w-full">{pending ? <><Spinner />A guardar…</> : 'Continuar'}</button>
        <button type="button" onClick={() => setEtapa('curso')} disabled={pending} className="btn btn-terciario w-full">Mudar de curso</button>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <p className="text-[14px] leading-5 text-texto-2">Assim treinas só as disciplinas das provas dele.</p>
      <ListaEscolha rotulo="Curso" valor={courseId} onChange={setCourseId} itens={courses} vazio="Ainda não há cursos desta instituição na plataforma." />
      <button type="button" onClick={continuar} disabled={pending || !courseId} aria-busy={pending} className="btn btn-primario btn-grande w-full">{pending ? <><Spinner />A guardar…</> : 'Continuar'}</button>
      {orientacaoHref && <Link href={orientacaoHref} className="btn btn-secundario w-full">Não sei: teste vocacional</Link>}
    </div>
  )
}
TWISISA_FASE0_EOF

echo "A escrever components/student-nav.tsx"
cat > "components/student-nav.tsx" <<'TWISISA_FASE0_EOF'
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Bookmark, ClipboardCheck, Flame, LayoutDashboard, Library, Sparkles, Trophy, UserRound } from 'lucide-react'

// Menu único do estudante: o computador (StudentSidebar) e o telemóvel (StudentMobileSidebar) usam esta mesma lista,
// por isso todas as páginas do estudante têm as mesmas ligações, na mesma ordem e com a página atual marcada.
const MAIN = [
  { href: '/aluno', label: 'Hoje', icon: LayoutDashboard, exact: true },
  { href: '/aluno/simulador', label: 'Treinar', icon: ClipboardCheck },
  { href: '/exames', label: 'Exames', icon: BookOpen },
  { href: '/aluno/desafios', label: 'Desafios', icon: Flame },
  { href: '/aluno/ranking', label: 'Ranking', icon: Trophy },
  { href: '/jonas', label: 'Jonas', icon: Sparkles },
] as const

// O que o aluno guardou: questões para rever e materiais da Biblioteca.
const SAVED = [
  { href: '/aluno/estudar-depois', label: 'Estudar depois', icon: Bookmark },
  { href: '/aluno/favoritos', label: 'Materiais guardados', icon: Library },
] as const

const PERSONAL = [
  { href: '/aluno/perfil', label: 'Eu', icon: UserRound },
] as const

type Item = { href: string; label: string; icon: typeof BookOpen; exact?: boolean }

function isActive(pathname: string, item: Item) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function Group({ label, items, onNavigate }: { label: string; items: readonly Item[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div>
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-2">{label}</p>
      <nav className="mt-3 flex flex-col gap-1" aria-label={label}>
        {items.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-marca font-medium text-white'
                  : 'text-texto-2 hover:bg-white hover:text-marca'
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function StudentNavGroups({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <Group label="Estudar" items={MAIN} onNavigate={onNavigate} />
      <Group label="Guardado" items={SAVED} onNavigate={onNavigate} />
      <Group label="A minha conta" items={PERSONAL} onNavigate={onNavigate} />
    </div>
  )
}
TWISISA_FASE0_EOF

echo "A escrever lib/avisos.ts"
cat > "lib/avisos.ts" <<'TWISISA_FASE0_EOF'
import { WEEK_DAYS_GOAL, formatLeft, plural, streakNeed } from '@/lib/desafios-regras'
import type { DesafiosSnapshot } from '@/lib/desafios'

// Avisos e lembretes do aluno: cartões dinâmicos calculados a partir dos desafios (sem guardar nada).
// Ordem = prioridade. Cada aviso diz o que está a acontecer e dá uma ação.

export type AvisoTone = 'urgent' | 'warning' | 'info' | 'success'
export type AvisoIcon = 'flame' | 'clock' | 'target' | 'book' | 'alert' | 'check' | 'calendar'
export type Aviso = { id: string; tone: AvisoTone; icon: AvisoIcon; title: string; text: string; href: string; cta: string }

const PRACTICE = '/aluno/simulador'

export function buildAvisos(s: DesafiosSnapshot): Aviso[] {
  const avisos: Aviso[] = []
  const goal = s.goal
  const left = Math.max(0, goal - s.todayAnswered)
  const keep = Math.max(0, streakNeed(goal) - s.todayAnswered)
  const hoursLeft = s.secondsLeft / 3600

  if (s.streak.current > 0 && !s.streak.todayCounted) {
    avisos.push({
      id: 'streak-risk',
      tone: hoursLeft <= 6 ? 'urgent' : 'warning',
      icon: 'flame',
      title: 'Sequência em risco',
      text: `Faltam ${plural(keep, 'questão', 'questões')} hoje para manteres ${plural(s.streak.current, 'dia seguido', 'dias seguidos')}. O dia acaba em ${formatLeft(s.secondsLeft)}.`,
      href: PRACTICE,
      cta: 'Praticar agora',
    })
  }

  const lost = s.streak.lost
  const lostRecently = lost && s.daysSinceActive !== null && s.daysSinceActive <= 14
  if (s.streak.current === 0 && lostRecently && lost) {
    avisos.push({
      id: 'streak-lost',
      tone: 'warning',
      icon: 'flame',
      title: 'Perdeste a sequência',
      text: `Chegaste a ${plural(lost.length, 'dia seguido', 'dias seguidos')}, e isso conta. Hoje ${plural(streakNeed(goal), 'questão chega', 'questões chegam')} para recomeçar.`,
      href: PRACTICE,
      cta: 'Recomeçar',
    })
  } else if (s.daysSinceActive === null) {
    avisos.push({ id: 'first', tone: 'info', icon: 'target', title: 'Ainda não praticaste', text: `Faz as primeiras ${goal} questões. Leva poucos minutos.`, href: PRACTICE, cta: 'Começar' })
  } else if (s.daysSinceActive >= 2) {
    avisos.push({ id: 'inactive', tone: 'warning', icon: 'clock', title: `Há ${plural(s.daysSinceActive, 'dia', 'dias')} sem praticar`, text: `O teu ritmo está a cair. Faz as ${goal} questões de hoje.`, href: PRACTICE, cta: 'Praticar' })
  }

  if (s.admission && !s.course) {
    avisos.push({ id: 'course', tone: 'info', icon: 'target', title: 'Escolhe o teu curso', text: 'Sem curso, não sabemos que provas tens de fazer. Escolhe um, ou faz o teste vocacional.', href: '/aluno/perfil#percurso', cta: 'Escolher curso' })
  }

  if (s.weak) {
    avisos.push({ id: 'weak', tone: 'warning', icon: 'alert', title: `${s.weak.name}: ${s.weak.accuracy}% de acertos`, text: 'É a tua disciplina mais fraca. Treina hoje.', href: `${PRACTICE}?d=${encodeURIComponent(s.weak.id)}`, cta: 'Treinar' })
  }

  const dias = s.weekly.find((mission) => mission.id === 'w-dias')
  if (dias && dias.status === 'em_curso' && s.weekday >= 4) {
    const need = WEEK_DAYS_GOAL - s.weekGoalDays
    avisos.push({ id: 'week', tone: 'warning', icon: 'calendar', title: 'A semana está a acabar', text: `Faltam ${plural(s.weekDaysLeft, 'dia', 'dias')} e ainda precisas de ${plural(need, 'dia', 'dias')} com a meta cumprida.`, href: PRACTICE, cta: 'Praticar' })
  }

  if (s.errorCount >= 5) {
    avisos.push({ id: 'errors', tone: 'info', icon: 'book', title: `${plural(s.errorCount, 'erro', 'erros')} por rever`, text: 'Quem não revê os erros repete-os no exame.', href: PRACTICE, cta: 'Rever erros' })
  }

  if (s.streak.todayMet) {
    avisos.push({ id: 'done', tone: 'success', icon: 'check', title: 'Meta de hoje cumprida', text: `Sequência: ${plural(s.streak.current, 'dia', 'dias')}. Amanhã a meta volta a ser ${goal} questões.`, href: '/aluno/desafios', cta: 'Ver desafios' })
  } else if (s.streak.current === 0 && s.todayAnswered > 0) {
    avisos.push({ id: 'daily', tone: 'info', icon: 'target', title: 'Meta de hoje', text: `${s.todayAnswered} de ${goal} questões. Faltam ${left}.`, href: PRACTICE, cta: 'Continuar' })
  }
  return avisos
}
TWISISA_FASE0_EOF

echo "A escrever lib/desafios-regras.ts"
cat > "lib/desafios-regras.ts" <<'TWISISA_FASE0_EOF'
// Regras dos Desafios (puras, sem base de dados). Mudar um número aqui muda a plataforma toda.
// Os dias contam no fuso de Maputo (CAT, UTC+2, sem hora de verão). Um dia é uma data «AAAA-MM-DD».

export const TZ = 'Africa/Maputo'

/** Meta diária por omissão: questões respondidas num dia para cumprir a meta (barra de progresso, missões, semana). */
export const DAILY_GOAL = 10
/** Sequência: acção mínima do dia (3 questões) para o dia contar. É separada da meta diária: cumprir a meta não é preciso para manter a sequência. */
export const STREAK_MIN = 3
/** Questões necessárias para o dia contar na sequência: nunca mais do que a meta do aluno. */
export const streakNeed = (goal: number = DAILY_GOAL) => Math.max(1, Math.min(STREAK_MIN, goal))
export const DAILY_SUBJECT_GOAL = 5
/** Percentagem de acertos pedida na missão de precisão (com pelo menos DAILY_GOAL respostas no dia). */
export const DAILY_ACCURACY = 70
export const WEEK_DAYS_GOAL = 5
export const WEEK_POINTS_GOAL = 40
/** Por disciplina do curso (admissão) e por semana. */
export const WEEK_SUBJECT_QUESTIONS = 10
/** Nas classes (10.ª e 12.ª): passar por pelo menos N disciplinas, com M questões cada. */
export const WEEK_CLASS_SUBJECTS = 3
export const WEEK_CLASS_SUBJECT_QUESTIONS = 5
/** Prontidão de uma disciplina = acertos × volume; 30 questões em 30 dias dão 100 % de volume. */
export const READY_VOLUME = 30
/** Mínimo de respostas para avaliar uma disciplina, e limite abaixo do qual é «fraca». */
export const MIN_SAMPLE = 10
export const WEAK_BELOW = 50

export type DayRow = { day: string; answered: number; correct: number; points: number }

const MS_DAY = 86_400_000
const toMs = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)))
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export const addDays = (day: string, n: number) => toDay(toMs(day) + n * MS_DAY)
export const diffDays = (later: string, earlier: string) => Math.round((toMs(later) - toMs(earlier)) / MS_DAY)
/** 0 = segunda … 6 = domingo. */
export const weekdayIndex = (day: string) => (new Date(toMs(day)).getUTCDay() + 6) % 7
export const weekStartOf = (day: string) => addDays(day, -weekdayIndex(day))

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function formatLeft(seconds: number) {
  const minutes = Math.max(0, Math.floor(seconds / 60))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export type Streak = {
  current: number
  best: number
  /** Meta diária de hoje cumprida (barra de progresso). Não decide a sequência. */
  todayMet: boolean
  /** O dia de hoje já conta na sequência (acção mínima feita). */
  todayCounted: boolean
  /** A última sequência que acabou (quando a atual é 0). */
  lost: { length: number; endedOn: string } | null
  lastActiveDay: string | null
}

// Sequência = dias seguidos com a acção mínima feita (`streakNeed`), separada da meta diária (`todayMet`).
// Continua «viva» até ao fim do dia de hoje: se hoje ainda não contou mas ontem sim, conta até à meia-noite.
// Falhar um dia inteiro põe tudo a zero.
export function computeStreak(days: DayRow[], today: string, goal: number = DAILY_GOAL): Streak {
  const need = streakNeed(goal)
  const goalDays = days.filter((row) => row.answered >= need).map((row) => row.day).sort()
  const set = new Set(goalDays)
  const runs: { length: number; end: string }[] = []
  for (const day of goalDays) {
    const last = runs[runs.length - 1]
    if (last && diffDays(day, last.end) === 1) {
      last.length++
      last.end = day
    } else runs.push({ length: 1, end: day })
  }
  const todayCounted = set.has(today)
  const todayMet = (days.find((row) => row.day === today)?.answered ?? 0) >= goal
  const yesterday = addDays(today, -1)
  const aliveEnd = todayCounted ? today : set.has(yesterday) ? yesterday : null
  const alive = aliveEnd ? runs.find((run) => run.end === aliveEnd) : undefined
  const current = alive?.length ?? 0
  const finished = alive ? null : runs[runs.length - 1]
  const lastActive = days.filter((row) => row.answered > 0).map((row) => row.day).sort().pop() ?? null
  return {
    current,
    best: runs.reduce((max, run) => Math.max(max, run.length), 0),
    todayMet,
    todayCounted,
    lost: current === 0 && finished ? { length: finished.length, endedOn: finished.end } : null,
    lastActiveDay: lastActive,
  }
}

export type SubjectStat = { id: string; name: string; weight: number; answered30: number; correct30: number; answeredWeek: number; answeredToday: number }

export const accuracyOf = (s: Pick<SubjectStat, 'answered30' | 'correct30'>) => (s.answered30 > 0 ? s.correct30 / s.answered30 : 0)
export const readinessOf = (s: SubjectStat) => accuracyOf(s) * Math.min(1, s.answered30 / READY_VOLUME)

/** 0 a 100: média das disciplinas ponderada pelo peso nas provas do curso. */
export function totalReadiness(subjects: SubjectStat[]) {
  const total = subjects.reduce((sum, s) => sum + Math.max(0, s.weight), 0)
  if (subjects.length === 0) return null
  if (total <= 0) return Math.round((subjects.reduce((sum, s) => sum + readinessOf(s), 0) / subjects.length) * 100)
  return Math.round((subjects.reduce((sum, s) => sum + Math.max(0, s.weight) * readinessOf(s), 0) / total) * 100)
}

// Disciplina do dia: a mais fraca (a que mais pesa, se empatar). Sem dados para distinguir, roda por dia.
export function pickSubjectOfDay(subjects: SubjectStat[], today: string): SubjectStat | null {
  if (subjects.length === 0) return null
  const ordered = [...subjects].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'pt'))
  const values = ordered.map(readinessOf)
  if (Math.max(...values) === Math.min(...values)) return ordered[Math.floor(toMs(today) / MS_DAY) % ordered.length]
  let best = 0
  for (let i = 1; i < ordered.length; i++) if (values[i] < values[best]) best = i
  return ordered[best]
}

export type Mission = {
  id: string
  title: string
  detail: string | null
  current: number
  target: number
  unit: string
  status: 'feita' | 'em_curso' | 'falhada'
  href: string | null
}

export type MissionInput = {
  today: string
  days: DayRow[]
  subjects: SubjectStat[]
  /** true: as disciplinas vêm das provas do curso escolhido (admissão). */
  fromCourse: boolean
  subjectOfDay: SubjectStat | null
  /** Meta diária do aluno (escolhida no onboarding). Sem valor, usa DAILY_GOAL. */
  goal?: number
}

export function buildMissions(input: MissionInput): { daily: Mission[]; weekly: Mission[]; weekDaysLeft: number; todayAnswered: number; todayCorrect: number; weekPoints: number; weekGoalDays: number } {
  const { today, days, subjects, fromCourse, subjectOfDay } = input
  const goal = input.goal ?? DAILY_GOAL
  const todayRow = days.find((row) => row.day === today)
  const answered = todayRow?.answered ?? 0
  const correct = todayRow?.correct ?? 0
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0

  const daily: Mission[] = [
    { id: 'd-meta', title: `Responder a ${goal} questões`, detail: null, current: Math.min(answered, goal), target: goal, unit: 'questões', status: answered >= goal ? 'feita' : 'em_curso', href: '/aluno/simulador' },
  ]
  if (subjectOfDay) {
    daily.push({ id: 'd-disciplina', title: `${subjectOfDay.name}: ${DAILY_SUBJECT_GOAL} questões`, detail: 'Disciplina do dia', current: Math.min(subjectOfDay.answeredToday, DAILY_SUBJECT_GOAL), target: DAILY_SUBJECT_GOAL, unit: 'questões', status: subjectOfDay.answeredToday >= DAILY_SUBJECT_GOAL ? 'feita' : 'em_curso', href: `/aluno/simulador?d=${encodeURIComponent(subjectOfDay.id)}` })
  }
  const precisionDone = answered >= goal && accuracy >= DAILY_ACCURACY
  daily.push({ id: 'd-precisao', title: `Acertar ${DAILY_ACCURACY}% hoje`, detail: answered >= goal ? `${correct} certas em ${answered}` : `Conta a partir de ${goal} respostas`, current: answered >= goal ? accuracy : 0, target: DAILY_ACCURACY, unit: '%', status: precisionDone ? 'feita' : 'em_curso', href: '/aluno/simulador' })

  const weekStart = weekStartOf(today)
  const weekRows = days.filter((row) => row.day >= weekStart && row.day <= today)
  const weekGoalDays = weekRows.filter((row) => row.answered >= goal).length
  const weekPoints = Math.round(weekRows.reduce((sum, row) => sum + row.points, 0) * 10) / 10
  // Dias que ainda podem contar: os que faltam até domingo, sem repetir hoje se já está cumprido.
  const todayMet = answered >= goal
  const weekDaysLeft = 6 - weekdayIndex(today) + (todayMet ? 0 : 1)
  const impossible = weekGoalDays + weekDaysLeft < WEEK_DAYS_GOAL

  const weekly: Mission[] = [
    { id: 'w-dias', title: `${WEEK_DAYS_GOAL} dias com a meta cumprida`, detail: impossible ? 'Já não dá para chegar a tempo. Recomeças segunda-feira.' : null, current: Math.min(weekGoalDays, WEEK_DAYS_GOAL), target: WEEK_DAYS_GOAL, unit: 'dias', status: weekGoalDays >= WEEK_DAYS_GOAL ? 'feita' : impossible ? 'falhada' : 'em_curso', href: '/aluno/simulador' },
    { id: 'w-pontos', title: `${WEEK_POINTS_GOAL} pontos esta semana`, detail: null, current: Math.min(weekPoints, WEEK_POINTS_GOAL), target: WEEK_POINTS_GOAL, unit: 'pts', status: weekPoints >= WEEK_POINTS_GOAL ? 'feita' : 'em_curso', href: '/aluno/simulador' },
  ]
  if (subjects.length > 0) {
    if (fromCourse) {
      const done = subjects.filter((s) => s.answeredWeek >= WEEK_SUBJECT_QUESTIONS)
      const missing = subjects.filter((s) => s.answeredWeek < WEEK_SUBJECT_QUESTIONS).map((s) => s.name)
      weekly.push({ id: 'w-cobertura', title: `Todas as disciplinas do curso (${WEEK_SUBJECT_QUESTIONS} questões cada)`, detail: missing.length > 0 ? `Faltam: ${missing.join(', ')}` : null, current: done.length, target: subjects.length, unit: 'disciplinas', status: missing.length === 0 ? 'feita' : 'em_curso', href: '/aluno/simulador' })
    } else {
      const target = Math.min(WEEK_CLASS_SUBJECTS, subjects.length)
      const done = subjects.filter((s) => s.answeredWeek >= WEEK_CLASS_SUBJECT_QUESTIONS).length
      weekly.push({ id: 'w-cobertura', title: `${target} disciplinas diferentes (${WEEK_CLASS_SUBJECT_QUESTIONS} questões cada)`, detail: null, current: Math.min(done, target), target, unit: 'disciplinas', status: done >= target ? 'feita' : 'em_curso', href: '/aluno/simulador' })
    }
  }
  return { daily, weekly, weekDaysLeft, todayAnswered: answered, todayCorrect: correct, weekPoints, weekGoalDays }
}
TWISISA_FASE0_EOF

echo "A escrever lib/push-motor.ts"
cat > "lib/push-motor.ts" <<'TWISISA_FASE0_EOF'
import 'server-only'

import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { getCourseGate, getStudentSubjectIds } from '@/lib/combinacoes'
import { getDesafios } from '@/lib/desafios'
import { markCounts } from '@/lib/kit'
import { isTrack } from '@/lib/percurso'
import { pushToUser } from '@/lib/push'
import { maputoNow, mergeConfig, pickPush, type PushConfig, type PushContext, type PushKind } from '@/lib/push-regras'

// Motor de notificações push. Corre a cada 30 minutos (agendador externo, ver docs): para cada aluno que permitiu push,
// vê o que lhe interessa agora e envia, no máximo, UMA mensagem, respeitando intervalo, limite diário e horas de silêncio.

export async function getPushConfig(): Promise<PushConfig> {
  const row = (await pool.query(`SELECT value FROM app_settings WHERE key = 'push'`).catch(() => ({ rows: [] }))).rows[0]
  return mergeConfig(row?.value)
}

type Row = { user_id: string; track: string | null; institution_id: string | null; target_course_id: string | null; daily_goal: number | null }

async function buildContext(row: Row, now: ReturnType<typeof maputoNow>): Promise<PushContext> {
  const logs = (
    await pool.query(
      `SELECT kind, ref, (sent_at AT TIME ZONE 'Africa/Maputo')::date::text AS day, extract(epoch FROM (now() - sent_at)) / 60 AS ago
       FROM push_log WHERE user_id = $1 AND sent_at > now() - interval '7 days'`,
      [row.user_id],
    )
  ).rows
  const lastByKind: Partial<Record<PushKind, number>> = {}
  let minutesSinceLast: number | null = null
  let sentToday = 0
  for (const log of logs) {
    const ago = Number(log.ago)
    minutesSinceLast = minutesSinceLast === null ? ago : Math.min(minutesSinceLast, ago)
    lastByKind[log.kind as PushKind] = Math.min(lastByKind[log.kind as PushKind] ?? Infinity, ago)
    if (log.day === now.date) sentToday++
  }
  const history = { sentToday, minutesSinceLast, lastByKind, refs: logs.map((log) => `${log.kind}:${log.ref}`) }
  const empty: PushContext = { now, userSeed: row.user_id, needsCourse: false, goal: 0, answered: 0, todayMet: true, streak: 0, daysSinceActive: null, hot: 0, openAttempt: null, newMaterials: [], history }

  if ((await getCourseGate(row.user_id)).need) return { ...empty, needsCourse: true }
  if (!isTrack(row.track)) return empty

  const scope = { userId: row.user_id, track: row.track, institutionId: row.institution_id }
  const snapshot = await getDesafios({ scope, targetCourseId: row.target_course_id, dailyGoal: row.daily_goal })
  const { due } = await markCounts(row.user_id)

  const open = (
    await pool.query(
      `SELECT a.id, a.total,
              (SELECT count(*)::int FROM attempt_items i WHERE i.attempt_id = a.id AND i.answered_at IS NOT NULL) AS answered,
              extract(epoch FROM (now() - greatest(a.started_at, coalesce((SELECT max(i.answered_at) FROM attempt_items i WHERE i.attempt_id = a.id), a.started_at)))) / 60 AS idle
       FROM attempts a WHERE a.user_id = $1 AND a.status = 'em_curso' AND a.mode <> 'rapido' ORDER BY a.started_at DESC LIMIT 1`,
      [row.user_id],
    )
  ).rows[0]

  // Matéria nova (últimos 3 dias, aprovada) nas disciplinas das provas do aluno e ainda não avisada.
  const subjectIds = (await getStudentSubjectIds(row.user_id)) ?? snapshot.subjects.map((subject) => subject.id)
  const newMaterials = subjectIds.length === 0 ? [] : (
    await pool.query(
      `SELECT m.id, m.title, s.name AS subject
       FROM academic_materials m LEFT JOIN library_subjects s ON s.id = m.subject_id
       WHERE m.status = 'approved' AND m.subject_id = ANY($2::text[])
         AND coalesce(m.published_at, m.created_at) > now() - interval '3 days'
         AND NOT EXISTS (SELECT 1 FROM push_log l WHERE l.user_id = $1 AND l.kind = 'materia-nova' AND l.ref = m.id)
       ORDER BY coalesce(m.published_at, m.created_at) DESC LIMIT 5`,
      [row.user_id, subjectIds],
    )
  ).rows.map((material) => ({ id: material.id as string, title: material.title as string, subject: (material.subject as string | null) ?? null }))

  return {
    ...empty,
    goal: snapshot.goal,
    answered: snapshot.todayAnswered,
    todayMet: snapshot.streak.todayMet,
    streakSafe: snapshot.streak.todayCounted,
    streak: snapshot.streak.current,
    daysSinceActive: snapshot.daysSinceActive,
    hot: snapshot.errorCount + due,
    openAttempt: open ? { id: open.id as string, answered: Number(open.answered), total: Number(open.total), idleMinutes: Number(open.idle) } : null,
    newMaterials,
  }
}

export async function runPushTick(limit = 300) {
  const cfg = await getPushConfig()
  const now = maputoNow()
  const rows = (
    await pool.query(
      `SELECT p.user_id, sp.track, sp.institution_id, sp.target_course_id, sp.daily_goal
       FROM notification_prefs p
       JOIN student_profiles sp ON sp.user_id = p.user_id AND sp.onboarded_at IS NOT NULL
       WHERE p.push_enabled AND coalesce((p.categories->>'study')::boolean, false)
         AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = p.user_id)
       ORDER BY coalesce((SELECT max(l.sent_at) FROM push_log l WHERE l.user_id = p.user_id), 'epoch'::timestamptz)
       LIMIT $1`,
      [limit],
    )
  ).rows as Row[]

  let sent = 0
  for (const row of rows) {
    try {
      const message = pickPush(await buildContext(row, now), cfg)
      if (!message) continue
      const delivered = await pushToUser(row.user_id, { title: message.title, body: message.body, url: message.url, tag: message.kind })
      if (delivered === 0) continue
      for (const ref of message.refs) {
        await pool.query(`INSERT INTO push_log (id, user_id, kind, ref, title) VALUES ($1, $2, $3, $4, $5)`, [randomUUID(), row.user_id, message.kind, ref, message.title])
      }
      sent++
    } catch (error) {
      console.error('[PUSH-MOTOR] aluno', row.user_id, error)
    }
  }
  // O registo só serve para os limites: guarda 14 dias.
  await pool.query(`DELETE FROM push_log WHERE sent_at < now() - interval '14 days'`).catch(() => undefined)
  return { pushChecked: rows.length, pushSent: sent }
}
TWISISA_FASE0_EOF

echo "A escrever lib/push-regras.ts"
cat > "lib/push-regras.ts" <<'TWISISA_FASE0_EOF'
import { streakNeed } from '@/lib/desafios-regras'

// Regras do motor de notificações push. Puro (sem base de dados nem rede): decide QUAL mensagem enviar, ou nenhuma.
// Os números (intervalo, limite diário, horas de silêncio, cooldowns) vêm da tabela app_settings, chave «push»; estes são só os valores por defeito.

export type PushKind = 'desafio-prazo' | 'retomar' | 'materia-nova' | 'questoes-quentes' | 'voltar' | 'escolher-curso'

export type PushConfig = {
  minGapMinutes: number
  maxPerDay: number
  quietFromHour: number
  quietToHour: number
  deadlineTiers: number[]
  resumeAfterMinutes: number
  comebackAfterDays: number
  cooldownHours: Record<PushKind, number>
}

export const PUSH_DEFAULTS: PushConfig = {
  minGapMinutes: 30,
  maxPerDay: 6,
  quietFromHour: 22,
  quietToHour: 7,
  deadlineTiers: [3, 4, 8],
  resumeAfterMinutes: 120,
  comebackAfterDays: 3,
  cooldownHours: { 'desafio-prazo': 0, retomar: 12, 'materia-nova': 6, 'questoes-quentes': 8, voltar: 72, 'escolher-curso': 24 },
}

const num = (value: unknown, fallback: number, min: number, max: number) => (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback)

/** Junta o que está na base de dados aos valores por defeito, ignorando o que não faz sentido. */
export function mergeConfig(raw: unknown): PushConfig {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const cooldowns = (source.cooldownHours && typeof source.cooldownHours === 'object' ? source.cooldownHours : {}) as Record<string, unknown>
  const tiers = Array.isArray(source.deadlineTiers) ? source.deadlineTiers.filter((t): t is number => typeof t === 'number' && t > 0 && t <= 23) : []
  return {
    minGapMinutes: num(source.minGapMinutes, PUSH_DEFAULTS.minGapMinutes, 5, 1440),
    maxPerDay: num(source.maxPerDay, PUSH_DEFAULTS.maxPerDay, 1, 48),
    quietFromHour: num(source.quietFromHour, PUSH_DEFAULTS.quietFromHour, 0, 23),
    quietToHour: num(source.quietToHour, PUSH_DEFAULTS.quietToHour, 0, 23),
    deadlineTiers: tiers.length ? [...new Set(tiers)].sort((a, b) => a - b) : PUSH_DEFAULTS.deadlineTiers,
    resumeAfterMinutes: num(source.resumeAfterMinutes, PUSH_DEFAULTS.resumeAfterMinutes, 15, 2880),
    comebackAfterDays: num(source.comebackAfterDays, PUSH_DEFAULTS.comebackAfterDays, 1, 60),
    cooldownHours: Object.fromEntries((Object.keys(PUSH_DEFAULTS.cooldownHours) as PushKind[]).map((kind) => [kind, num(cooldowns[kind], PUSH_DEFAULTS.cooldownHours[kind], 0, 720)])) as Record<PushKind, number>,
  }
}

/** Data (AAAA-MM-DD) e minutos desde a meia-noite, hora de Maputo. */
export function maputoNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

export type PushContext = {
  now: { date: string; minutes: number }
  userSeed: string
  needsCourse: boolean
  goal: number
  answered: number
  todayMet: boolean
  /** A sequência de hoje já está garantida (acção mínima feita). Sem valor, conta como não garantida. */
  streakSafe?: boolean
  streak: number
  daysSinceActive: number | null
  hot: number
  openAttempt: { id: string; answered: number; total: number; idleMinutes: number } | null
  newMaterials: { id: string; title: string; subject: string | null }[]
  history: { sentToday: number; minutesSinceLast: number | null; lastByKind: Partial<Record<PushKind, number>>; refs: string[] }
}

export type PushMessage = { kind: PushKind; refs: string[]; title: string; body: string; url: string }

function hash(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}
const variant = <T,>(ctx: PushContext, kind: string, options: T[]): T => options[hash(`${ctx.userSeed}|${ctx.now.date}|${kind}`) % options.length]
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function isQuiet(minutes: number, cfg: PushConfig) {
  const hour = minutes / 60
  return cfg.quietFromHour > cfg.quietToHour ? hour >= cfg.quietFromHour || hour < cfg.quietToHour : hour >= cfg.quietFromHour && hour < cfg.quietToHour
}

/** Escolhe no máximo uma mensagem. Prioridade: prazo do desafio > prática a meio > matéria nova > questões quentes > voltar. */
export function pickPush(ctx: PushContext, cfg: PushConfig): PushMessage | null {
  if (isQuiet(ctx.now.minutes, cfg)) return null
  const h = ctx.history
  if (h.sentToday >= cfg.maxPerDay) return null
  if (h.minutesSinceLast !== null && h.minutesSinceLast < cfg.minGapMinutes) return null
  const cooled = (kind: PushKind) => {
    const ago = h.lastByKind[kind]
    return ago === undefined || ago >= cfg.cooldownHours[kind] * 60
  }

  if (ctx.needsCourse) {
    if (!cooled('escolher-curso')) return null
    return { kind: 'escolher-curso', refs: [ctx.now.date], title: 'Escolhe o teu curso', body: variant(ctx, 'curso', ['Falta só isso para começares a praticar.', 'Diz-nos o curso e preparamos as disciplinas das tuas provas.']), url: '/aluno?curso=1' }
  }

  // 1. Prazo do desafio diário: um aviso por patamar de horas (ex.: faltam 8, 4 e 3 horas).
  if (ctx.goal > 0 && !ctx.todayMet) {
    const hoursLeft = (24 * 60 - ctx.now.minutes) / 60
    const tier = cfg.deadlineTiers.find((t) => hoursLeft <= t)
    if (tier !== undefined && hoursLeft > 0 && !h.refs.includes(`desafio-prazo:${ctx.now.date}:${tier}`)) {
      const left = Math.max(1, ctx.goal - ctx.answered)
      const keep = Math.max(1, streakNeed(ctx.goal) - ctx.answered)
      const hours = Math.max(1, Math.ceil(hoursLeft))
      const body = ctx.streak > 0 && !ctx.streakSafe
        ? `Faltam ${plural(keep, 'questão', 'questões')} para não perderes a tua sequência de ${plural(ctx.streak, 'dia', 'dias')}.`
        : variant(ctx, 'prazo', [`Faltam ${plural(left, 'questão', 'questões')} para cumprires a meta de hoje.`, `Com ${plural(left, 'questão', 'questões')} cumpres o desafio de hoje.`])
      return { kind: 'desafio-prazo', refs: [`${ctx.now.date}:${tier}`], title: `Faltam ${hours} ${hours === 1 ? 'hora' : 'horas'} para fechar o teu desafio diário`, body, url: '/aluno/simulador' }
    }
  }

  // 2. Começou e não continuou.
  const open = ctx.openAttempt
  if (open && open.answered > 0 && open.answered < open.total && open.idleMinutes >= cfg.resumeAfterMinutes && open.idleMinutes < 48 * 60 && cooled('retomar') && !h.refs.includes(`retomar:${open.id}`)) {
    return { kind: 'retomar', refs: [open.id], title: 'Deixaste uma prática a meio', body: `Respondeste a ${open.answered} de ${open.total}. Faltam só ${open.total - open.answered}.`, url: `/aluno/simulador/sessao/${open.id}` }
  }

  // 3. Matéria nova nas disciplinas do aluno.
  if (ctx.newMaterials.length > 0 && cooled('materia-nova')) {
    const [first] = ctx.newMaterials
    const many = ctx.newMaterials.length > 1
    return {
      kind: 'materia-nova',
      refs: ctx.newMaterials.map((item) => item.id),
      title: many ? `${ctx.newMaterials.length} novos materiais no teu curso` : 'Nova matéria no teu curso',
      body: many ? `${first.title} e mais ${ctx.newMaterials.length - 1} já estão disponíveis.` : `${first.title}${first.subject ? ` · ${first.subject}` : ''} já está disponível.`,
      url: '/exames',
    }
  }

  // 4. Questões quentes: erros para rever e guardadas para hoje.
  if (ctx.hot > 0 && cooled('questoes-quentes')) {
    const n = Math.min(10, ctx.hot)
    return { kind: 'questoes-quentes', refs: [ctx.now.date], title: `${plural(n, 'questão quente', 'questões quentes')} à tua espera`, body: variant(ctx, 'quentes', ['Erros para rever e questões que guardaste. Uns minutos chegam.', 'É o que mais te vai render. Dez minutos e ficas a ganhar.']), url: '/aluno/simulador' }
  }

  // 5. Há dias sem praticar.
  if (ctx.daysSinceActive !== null && ctx.daysSinceActive >= cfg.comebackAfterDays && cooled('voltar')) {
    return { kind: 'voltar', refs: [ctx.now.date], title: `Já não praticas há ${plural(ctx.daysSinceActive, 'dia', 'dias')}`, body: 'Dez questões chegam para voltar ao ritmo.', url: '/aluno/simulador' }
  }
  return null
}
TWISISA_FASE0_EOF

echo "A escrever lib/push.ts"
cat > "lib/push.ts" <<'TWISISA_FASE0_EOF'
import 'server-only'

import { randomBytes, randomUUID } from 'node:crypto'
import webpush from 'web-push'
import { pool } from '@/lib/db'
import { siteBaseUrl } from '@/lib/email'

// Web push: o aluno liga no telemóvel (modal de permissão e interruptor no perfil) e o servidor envia com as chaves VAPID.
// Variáveis: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e, opcional, VAPID_SUBJECT (mailto: ou https:).

/** `tag` agrupa notificações do mesmo tipo (a nova substitui a anterior do mesmo tipo, não as de outros tipos). */
export type PushPayload = { title: string; body: string; url: string; tag?: string }
export type PushReport = { total: number; ok: number; removed: number; statuses: number[] }

let configured = false
let configError: string | null = null

function vapidSubject() {
  const given = process.env.VAPID_SUBJECT?.trim()
  if (given) return given
  const replyTo = process.env.EMAIL_REPLY_TO?.trim()
  return replyTo ? `mailto:${replyTo}` : siteBaseUrl()
}

export function pushConfigured() {
  if (configured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!publicKey || !privateKey) {
    configError = 'Chaves VAPID em falta no servidor.'
    return false
  }
  try {
    webpush.setVapidDetails(vapidSubject(), publicKey, privateKey)
    configured = true
    configError = null
    return true
  } catch (error) {
    configError = error instanceof Error ? error.message : 'Chaves VAPID inválidas.'
    console.error('[PUSH] configuração inválida:', configError)
    return false
  }
}

export function pushConfigError() {
  return configError
}

/** Envia a todos os aparelhos do aluno e devolve o detalhe. Aparelhos mortos (404/410) são apagados. */
export async function pushToUserReport(userId: string, payload: PushPayload): Promise<PushReport> {
  const report: PushReport = { total: 0, ok: 0, removed: 0, statuses: [] }
  if (!pushConfigured()) return report
  const subs = (await pool.query(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, [userId])).rows as { id: string; endpoint: string; p256dh: string; auth: string }[]
  report.total = subs.length
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 })
      await pool.query(`UPDATE push_subscriptions SET last_ok_at = now(), failures = 0 WHERE id = $1`, [sub.id])
      report.ok++
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode
      if (typeof status === 'number') report.statuses.push(status)
      if (status === 404 || status === 410) {
        await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id])
        report.removed++
      } else if (status === 401 || status === 403) {
        // Chaves VAPID que o serviço de push não aceita: problema de configuração, não do aparelho. Não apagar.
        console.error('[PUSH] chaves recusadas pelo serviço de push', status, (error as { body?: string })?.body ?? '')
      } else {
        console.error('[PUSH] falha', status ?? error)
        await pool.query(`UPDATE push_subscriptions SET failures = failures + 1 WHERE id = $1`, [sub.id])
        await pool.query(`DELETE FROM push_subscriptions WHERE id = $1 AND failures >= 5`, [sub.id])
      }
    }
  }
  return report
}

/** Envia a todos os aparelhos do aluno. Devolve quantos receberam. */
export async function pushToUser(userId: string, payload: PushPayload): Promise<number> {
  return (await pushToUserReport(userId, payload)).ok
}

export async function saveSubscription(userId: string, input: { endpoint: string; p256dh: string; auth: string; userAgent: string | null }) {
  await pool.query(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = $2, p256dh = $4, auth = $5, user_agent = $6, failures = 0`,
    [randomUUID(), userId, input.endpoint, input.p256dh, input.auth, input.userAgent],
  )
  await pool.query(
    `INSERT INTO notification_prefs (user_id, email_enabled, push_enabled, categories, unsubscribe_token) VALUES ($1, false, true, $2::jsonb, $3)
     ON CONFLICT (user_id) DO UPDATE SET push_enabled = true, categories = notification_prefs.categories || '{"study": true}'::jsonb, updated_at = now()`,
    [userId, JSON.stringify({ study: true, summary: true, promo: false }), randomBytes(24).toString('hex')],
  )
}

export async function removeSubscription(userId: string, endpoint: string) {
  await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [userId, endpoint])
  await pool.query(
    `UPDATE notification_prefs SET push_enabled = EXISTS (SELECT 1 FROM push_subscriptions WHERE user_id = $1), updated_at = now() WHERE user_id = $1`,
    [userId],
  )
}

export async function removeAllSubscriptions(userId: string) {
  await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId])
}
TWISISA_FASE0_EOF

echo "A escrever public/sw.js"
cat > "public/sw.js" <<'TWISISA_FASE0_EOF'
// Service worker do Twisisa: só trata notificações push.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//') ? data.url : '/aluno'
  event.waitUntil(
    self.registration.showNotification(data.title || 'Twisisa', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: typeof data.tag === 'string' && data.tag ? data.tag.slice(0, 64) : 'twisisa-lembrete',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/aluno'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) return client.navigate(url).then(() => client.focus())
      }
      return self.clients.openWindow(url)
    }),
  )
})
TWISISA_FASE0_EOF

echo "A escrever tests/desafios.test.ts"
cat > "tests/desafios.test.ts" <<'TWISISA_FASE0_EOF'
import test from 'node:test'
import assert from 'node:assert/strict'
import { DAILY_GOAL, buildMissions, computeStreak, formatLeft, pickSubjectOfDay, totalReadiness, weekStartOf, weekdayIndex, type DayRow, type SubjectStat } from '../lib/desafios-regras'
import { buildAvisos } from '../lib/avisos'
import type { DesafiosSnapshot } from '../lib/desafios'

const row = (day: string, answered = DAILY_GOAL, correct = 7, points = 3): DayRow => ({ day, answered, correct, points })
const subject = (id: string, over: Partial<SubjectStat> = {}): SubjectStat => ({ id, name: id, weight: 50, answered30: 0, correct30: 0, answeredWeek: 0, answeredToday: 0, ...over })

test('datas: semana começa na segunda-feira (Maputo)', () => {
  assert.equal(weekdayIndex('2026-11-02'), 0)
  assert.equal(weekdayIndex('2026-10-31'), 5)
  assert.equal(weekStartOf('2026-10-31'), '2026-10-26')
})

test('sequência: viva até à meia-noite e zero depois de um dia falhado', () => {
  const days = [row('2026-10-28'), row('2026-10-29'), row('2026-10-30')]
  const alive = computeStreak(days, '2026-10-31')
  assert.equal(alive.current, 3)
  assert.equal(alive.todayMet, false)
  assert.equal(computeStreak([...days, row('2026-10-31')], '2026-10-31').current, 4)
  const dead = computeStreak(days, '2026-11-01')
  assert.equal(dead.current, 0)
  assert.deepEqual(dead.lost, { length: 3, endedOn: '2026-10-30' })
})

test('sequência: conta o dia com a acção mínima (3), não com a meta; guarda a melhor', () => {
  const days = [row('2026-10-01'), row('2026-10-02'), row('2026-10-03'), row('2026-10-04'), row('2026-10-20', 9), row('2026-10-30')]
  const s = computeStreak(days, '2026-10-30')
  assert.equal(s.best, 4)
  assert.equal(s.current, 1)
  assert.equal(s.lastActiveDay, '2026-10-30')
  assert.equal(computeStreak([], '2026-10-30').lost, null)
})

test('missões: a semana falha quando já não dá para chegar aos 5 dias', () => {
  // sábado, 2 dias cumpridos, hoje por cumprir: só sobram sábado e domingo
  const days = [row('2026-10-26'), row('2026-10-27')]
  const { weekly, weekDaysLeft } = buildMissions({ today: '2026-10-31', days, subjects: [], fromCourse: false, subjectOfDay: null })
  assert.equal(weekDaysLeft, 2)
  assert.equal(weekly.find((m) => m.id === 'w-dias')?.status, 'falhada')
  const ok = buildMissions({ today: '2026-10-29', days: [row('2026-10-26'), row('2026-10-27')], subjects: [], fromCourse: false, subjectOfDay: null })
  assert.equal(ok.weekly.find((m) => m.id === 'w-dias')?.status, 'em_curso')
})

test('missões: disciplina do dia e cobertura por curso', () => {
  const subjects = [subject('mat', { answeredWeek: 12, answeredToday: 5, answered30: 20, correct30: 18 }), subject('fis', { answeredWeek: 3 })]
  const out = buildMissions({ today: '2026-10-29', days: [row('2026-10-29', 12, 10)], subjects, fromCourse: true, subjectOfDay: subjects[1] })
  assert.equal(out.daily.find((m) => m.id === 'd-disciplina')?.title.startsWith('fis'), true)
  const cob = out.weekly.find((m) => m.id === 'w-cobertura')
  assert.equal(cob?.current, 1)
  assert.equal(cob?.target, 2)
  assert.match(cob?.detail ?? '', /fis/)
  assert.equal(out.daily.find((m) => m.id === 'd-precisao')?.status, 'feita')
})

test('disciplina do dia: a mais fraca; sem dados, roda por dia', () => {
  const strong = subject('mat', { answered30: 30, correct30: 27 })
  const weak = subject('fis', { answered30: 30, correct30: 9 })
  assert.equal(pickSubjectOfDay([strong, weak], '2026-10-31')?.id, 'fis')
  const a = pickSubjectOfDay([subject('a'), subject('b')], '2026-10-31')?.id
  const b = pickSubjectOfDay([subject('a'), subject('b')], '2026-11-01')?.id
  assert.notEqual(a, b)
  assert.equal(pickSubjectOfDay([], '2026-10-31'), null)
})

test('prontidão: acertos × volume, ponderada pelo peso', () => {
  const full = subject('mat', { weight: 70, answered30: 30, correct30: 30 })
  const empty = subject('fis', { weight: 30 })
  assert.equal(totalReadiness([full, empty]), 70)
  assert.equal(totalReadiness([]), null)
  assert.equal(totalReadiness([subject('x', { weight: 50, answered30: 15, correct30: 15 })]), 50)
})

test('formatLeft', () => {
  assert.equal(formatLeft(3600 * 6 + 60 * 20), '6 h 20 min')
  assert.equal(formatLeft(2400), '40 min')
  assert.equal(formatLeft(7200), '2 h')
})

function snapshot(over: Partial<DesafiosSnapshot> = {}): DesafiosSnapshot {
  return {
    today: '2026-10-30', weekday: 4, secondsLeft: 3 * 3600,
    streak: { current: 0, best: 0, todayMet: false, todayCounted: false, lost: null, lastActiveDay: '2026-10-30' },
    daysSinceActive: 0, todayAnswered: 0, todayCorrect: 0, weekPoints: 0, weekGoalDays: 0, weekDaysLeft: 3,
    daily: [], weekly: [{ id: 'w-dias', title: '', detail: null, current: 0, target: 5, unit: 'dias', status: 'em_curso', href: null }],
    admission: false, course: null, subjects: [], readiness: null, weak: null, errorCount: 0, goal: 10, ...over,
  }
}

test('avisos: sequência em risco vem primeiro e é urgente perto da meia-noite', () => {
  const avisos = buildAvisos(snapshot({ streak: { current: 5, best: 5, todayMet: false, todayCounted: false, lost: null, lastActiveDay: '2026-10-29' }, daysSinceActive: 1, todayAnswered: 1 }))
  assert.equal(avisos[0].id, 'streak-risk')
  assert.equal(avisos[0].tone, 'urgent')
  assert.match(avisos[0].text, /Faltam 2 questões/)
})

test('avisos: perdeu a sequência, inatividade, curso por escolher e sem prática', () => {
  const lost = buildAvisos(snapshot({ streak: { current: 0, best: 7, todayMet: false, todayCounted: false, lost: { length: 7, endedOn: '2026-10-25' }, lastActiveDay: '2026-10-26' }, daysSinceActive: 4 }))
  assert.equal(lost[0].id, 'streak-lost')
  assert.ok(!lost.some((a) => a.id === 'inactive'))
  assert.equal(buildAvisos(snapshot({ daysSinceActive: 3, streak: { current: 0, best: 0, todayMet: false, todayCounted: false, lost: null, lastActiveDay: '2026-10-27' } }))[0].title, 'Há 3 dias sem praticar')
  assert.ok(buildAvisos(snapshot({ admission: true, course: null })).some((a) => a.id === 'course'))
  assert.equal(buildAvisos(snapshot({ daysSinceActive: null, streak: { current: 0, best: 0, todayMet: false, todayCounted: false, lost: null, lastActiveDay: null } }))[0].id, 'first')
  const done = buildAvisos(snapshot({ streak: { current: 3, best: 3, todayMet: true, todayCounted: true, lost: null, lastActiveDay: '2026-10-30' }, todayAnswered: 10 }))
  assert.equal(done[done.length - 1].id, 'done')
})

test('sequência separada da meta: 3 questões mantêm a sequência sem cumprir a meta', () => {
  const days = [row('2026-10-29'), row('2026-10-30', 3)]
  const s = computeStreak(days, '2026-10-30')
  assert.equal(s.current, 2)
  assert.equal(s.todayCounted, true)
  assert.equal(s.todayMet, false)
  const two = computeStreak([row('2026-10-29'), row('2026-10-30', 2)], '2026-10-30')
  assert.equal(two.todayCounted, false)
  assert.equal(two.current, 1)
  assert.equal(computeStreak([row('2026-10-30', 2)], '2026-10-30', 2).todayCounted, true)
  const safe = buildAvisos(snapshot({ streak: { current: 4, best: 4, todayMet: false, todayCounted: true, lost: null, lastActiveDay: '2026-10-30' }, daysSinceActive: 0, todayAnswered: 3 }))
  assert.ok(!safe.some((a) => a.id === 'streak-risk'))
})
TWISISA_FASE0_EOF

echo "A escrever tests/push-regras.test.ts"
cat > "tests/push-regras.test.ts" <<'TWISISA_FASE0_EOF'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isQuiet, maputoNow, mergeConfig, pickPush, PUSH_DEFAULTS, type PushContext } from '../lib/push-regras'

const cfg = PUSH_DEFAULTS
const base = (over: Partial<PushContext> = {}): PushContext => ({
  now: { date: '2026-11-04', minutes: 14 * 60 },
  userSeed: 'u1',
  needsCourse: false,
  goal: 10,
  answered: 4,
  todayMet: false,
  streak: 0,
  daysSinceActive: 0,
  hot: 0,
  openAttempt: null,
  newMaterials: [],
  history: { sentToday: 0, minutesSinceLast: null, lastByKind: {}, refs: [] },
  ...over,
})

test('horas de silêncio e limites', () => {
  assert.equal(isQuiet(23 * 60, cfg), true)
  assert.equal(isQuiet(6 * 60, cfg), true)
  assert.equal(isQuiet(12 * 60, cfg), false)
  assert.equal(pickPush(base({ now: { date: '2026-11-04', minutes: 23 * 60 }, hot: 5 }), cfg), null)
  assert.equal(pickPush(base({ hot: 5, history: { sentToday: 6, minutesSinceLast: 500, lastByKind: {}, refs: [] } }), cfg), null)
  assert.equal(pickPush(base({ hot: 5, history: { sentToday: 1, minutesSinceLast: 10, lastByKind: {}, refs: [] } }), cfg), null)
})

test('prazo do desafio: um aviso por patamar e só se a meta não estiver cumprida', () => {
  const tarde = { date: '2026-11-04', minutes: 20 * 60 + 30 } // faltam 3,5 h: patamar 4
  const msg = pickPush(base({ now: tarde, streak: 5 }), cfg)
  assert.equal(msg?.kind, 'desafio-prazo')
  assert.match(msg!.title, /Faltam 4 horas/)
  assert.match(msg!.body, /sequência de 5 dias/)
  assert.equal(pickPush(base({ now: tarde, history: { sentToday: 1, minutesSinceLast: 60, lastByKind: {}, refs: ['desafio-prazo:2026-11-04:4'] } }), cfg), null)
  assert.equal(pickPush(base({ now: tarde, todayMet: true }), cfg), null)
  assert.equal(pickPush(base({ now: { date: '2026-11-04', minutes: 12 * 60 } }), cfg), null)
})

test('começou e não continuou', () => {
  const open = { id: 'a1', answered: 4, total: 10, idleMinutes: 200 }
  const msg = pickPush(base({ openAttempt: open }), cfg)
  assert.equal(msg?.kind, 'retomar')
  assert.equal(msg?.url, '/aluno/simulador/sessao/a1')
  assert.equal(pickPush(base({ openAttempt: { ...open, idleMinutes: 30 } }), cfg), null)
  assert.equal(pickPush(base({ openAttempt: open, history: { sentToday: 1, minutesSinceLast: 90, lastByKind: {}, refs: ['retomar:a1'] } }), cfg), null)
})

test('matéria nova, questões quentes e voltar, por prioridade', () => {
  const mat = [{ id: 'm1', title: 'Limites', subject: 'Matemática' }]
  assert.equal(pickPush(base({ newMaterials: mat, hot: 8 }), cfg)?.kind, 'materia-nova')
  assert.equal(pickPush(base({ hot: 14 }), cfg)?.title, '10 questões quentes à tua espera')
  assert.equal(pickPush(base({ hot: 1 }), cfg)?.title, '1 questão quente à tua espera')
  assert.equal(pickPush(base({ daysSinceActive: 5 }), cfg)?.kind, 'voltar')
  assert.equal(pickPush(base({ hot: 3, history: { sentToday: 1, minutesSinceLast: 120, lastByKind: { 'questoes-quentes': 60 }, refs: [] } }), cfg), null)
})

test('sem curso só se lembra de escolher o curso', () => {
  const msg = pickPush(base({ needsCourse: true, hot: 9 }), cfg)
  assert.equal(msg?.kind, 'escolher-curso')
  assert.equal(pickPush(base({ needsCourse: true, history: { sentToday: 1, minutesSinceLast: 90, lastByKind: { 'escolher-curso': 90 }, refs: [] } }), cfg), null)
})

test('configuração: valores inválidos voltam ao defeito', () => {
  assert.deepEqual(mergeConfig(null), PUSH_DEFAULTS)
  const c = mergeConfig({ minGapMinutes: 60, maxPerDay: -3, deadlineTiers: [2, 6, 'x'], cooldownHours: { voltar: 24 } })
  assert.equal(c.minGapMinutes, 60)
  assert.equal(c.maxPerDay, PUSH_DEFAULTS.maxPerDay)
  assert.deepEqual(c.deadlineTiers, [2, 6])
  assert.equal(c.cooldownHours.voltar, 24)
  assert.equal(c.cooldownHours.retomar, PUSH_DEFAULTS.cooldownHours.retomar)
})

test('hora de Maputo', () => {
  const t = maputoNow(new Date('2026-11-04T18:30:00Z'))
  assert.equal(t.date, '2026-11-04')
  assert.equal(t.minutes, 20 * 60 + 30)
})

test('prazo do desafio: com a sequência garantida, fala da meta e não da sequência', () => {
  const tarde = { date: '2026-11-04', minutes: 20 * 60 + 30 }
  const msg = pickPush(base({ now: tarde, streak: 5, streakSafe: true, answered: 4 }), cfg)
  assert.equal(msg?.kind, 'desafio-prazo')
  assert.doesNotMatch(msg!.body, /sequência/)
  const risk = pickPush(base({ now: tarde, streak: 5, answered: 1 }), cfg)
  assert.match(risk!.body, /Faltam 2 questões para não perderes/)
})
TWISISA_FASE0_EOF

echo "A escrever State.md"
cat > "State.md" <<'TWISISA_FASE0_EOF'
# State.md — Twisisa

Última actualização: 08/11/2026.
Este ficheiro é o único documento vivo do estado do projecto. O registo detalhado dos 171 itens anteriores (até 27/10/2026) está no histórico do git: `git log -p -- State.md`.

## Como usar
- Uma página só passa a FEITO E TESTADO depois de ser usada por uma pessoa num telemóvel (não basta compilar).
- Dado sem fonte real não se mostra: usa-se "—" ou um estado vazio. Nunca um número escrito no código.
- Tabela sem quem escreva nela, ou sem quem leia, é dívida: regista-se aqui.
- Nenhuma pasta de cópia de segurança dentro do repositório: o git é a cópia.
- Ao acabar uma alteração, actualizar a linha da página ou do item afectado.

Estados: FEITO E TESTADO · FEITO, FALTA TESTE · FICTÍCIO (dados inventados) · NÃO FEITO.

## Comandos
- `npm run build` (`next build --webpack`), `npm run migrate`, `npm run migrate:status`, `npm test`.
- O `State.md` antigo falava em `pnpm`; o repositório tem `package-lock.json` e `pnpm-workspace.yaml` ao mesmo tempo. Decidir um gestor de pacotes (ver Decisões).

## Páginas do estudante

| Página | Estado | Nota |
|---|---|---|
| `/sign-up`, `/sign-in` | FEITO, FALTA TESTE | Registo de 1 ecrã: e-mail, palavra-passe, caixa dos Termos (versão e data em `account_consents`). Validação em tempo real e repetida no servidor (`hooks.before` em `lib/auth.ts`). Botão Google desactivado até existirem `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Sessão de 30 dias; «Computador partilhado» na entrada (`rememberMe: false`, a confirmar em ensaio); depois de entrar volta ao sítio de origem (`?next=`). Limite de pedidos na base de dados (tabela `rateLimit`). |
| `/aluno/bem-vindo` (onboarding) | FEITO, FALTA TESTE | Passos curtos, só botões: Sobre ti (nome, data DD/MM/AAAA, Termos), O que preparas (percurso e, na admissão, instituição), Curso (lista com procura; «Ainda não sei» leva ao teste vocacional no painel), Combinação de provas (só se o curso tiver mais de uma), Meta diária. No fim, um modal pergunta «Queres praticar agora?»: nunca abre um quiz sozinho. Os lembretes ficam ligados por defeito (e-mail). |
| `/esqueci-a-senha`, `/redefinir-senha` | FEITO, FALTA TESTE | Depende do domínio no Resend (`docs/EMAIL.md`). |
| `/aluno/percurso` | FEITO, FALTA TESTE | 10ª, 12ª ou admissão (com instituição). |
| `/aluno` (painel) | FEITO, FALTA TESTE | Linha discreta «Hoje 4/10 · 3 dias seguidos» com dados reais de `study_days` (escritos pelo simulador, pela Biblioteca e pelo Jonas). Parabéns no aniversário (dia e mês, fuso de Maputo; 29/02 celebra a 28/02 nos anos não bissextos). |
| `/aluno/simulador` (+ sessão, histórico, configurações) | FEITO, FALTA TESTE | Servidor avalia respostas, valida o dono da tentativa, fecha o tempo do modo rápido, limita inícios por hora. Testes de unidade só do motor (`tests/quiz-engine.test.ts`). Precisa de questões publicadas. |
| `/exames` (antiga Biblioteca) | FEITO, FALTA TESTE | Pública, sem login. Hub, pesquisa, universidade, disciplina, ano e exame (`docs/EXAMES-PUBLICOS-E-JONAS.md`). `/biblioteca`, `/biblioteca/exames`, `/explorar` e `/pesquisa` redirecionam para `/exames`; ficam só `/biblioteca/livros` e `/guias` (com conta), ligados a partir de `/exames`. Entrega de PDF pelo Cloudinary por confirmar. |
| `/simulado` | FEITO, FALTA TESTE | Página pública do Simulador (modos, regra de pontos e nota, FAQ). |
| `/aluno/perfil` | FEITO, FALTA TESTE | Foto no Cloudinary com upload assinado. |
| `/aluno/ranking` | FEITO, FALTA TESTE | Real (pontos de `attempt_items`). `show_in_ranking` é verdadeiro por omissão. |
| `/jonas` | FEITO, FALTA TESTE | Groq. Só travão de 25 mensagens por minuto; sem limites por plano. |
| `/aluno/notificacoes` | FEITO, FALTA TESTE | Lembretes criados pelo cron (`lib/lembretes.ts`) e a mensagem de boas-vindas; mais recentes primeiro, com ação e «marcar tudo como lido». |
| `/aluno/estudar-depois` | FEITO, FALTA TESTE | Questões guardadas no Kit ou no resultado, por data; «Praticar este tema» inicia uma Prática. |
| `/aluno/favoritos` | FEITO, FALTA TESTE | Lista real de `library_favorites` (só materiais aprovados). |
| `/aluno/desafios` | FEITO, FALTA TESTE | Sequência, missões do dia e da semana, prontidão por curso e avisos, tudo calculado a partir das respostas do Simulador (`lib/desafios.ts`). Curso alvo escolhido no perfil ou no resultado do teste vocacional (`student_profiles.target_course_id`, migração 0026). |
| `/aluno/descobrir-curso` | NÃO VERIFICADO | |
| `/planos` | FEITO | Mostra 197 MT/mês (`lib/plano.ts`). Sem Stripe. O pagamento por meios locais ainda não existe; nada na plataforma é reservado a quem paga. |
| `/blog` | FEITO, FALTA TESTE | Artigos reais da base de dados (`blog_posts`, migração 0039), escritos em `/admin/blog`. Listagem em `/blog`, artigo em `/blog/[slug]`, pré-visualização em `/blog/pre-visualizar/[id]`, RSS em `/blog/feed.xml`. Sem artigos publicados mostra o estado vazio. |

## Administração (`/admin`)
Instituições, Disciplinas, Temas, Classificação (categorias e níveis), Módulos, Materiais, Banco de questões, Variantes, Cursos, Equipa, Jonas (modelo), Blog (artigos). Todas FEITO, FALTA TESTE no telemóvel.
- Formulários usam `FeedbackForm`: durante o envio os campos ficam desactivados e o botão de envio mostra um indicador (CSS em `app/globals.css`, marcador `Estado de processamento`).
- Acções em linha usam `RowMenu` (já tem estado de processamento).
- O botão de confirmação do diálogo em `components/admin/question-bulk-form.tsx` desactiva-se durante o processamento, mas não mostra indicador: por fazer.

## Regras do projecto
- Nunca passar componentes (ícones) como propriedade de uma página de servidor para um componente de cliente. Passar o nome (texto) ou usar um componente de servidor.
- Acções de servidor devolvem `ActionResult` (`lib/action-result.ts`, `runAction`, `AppError`); o erro aparece no modal de feedback. Não lançar erros para o cliente.
- Páginas de lista do admin seguem `components/admin/page-parts.tsx`.
- Um módulo só pode estar "Ativo" quando tem `ready: true` em `lib/exam-modules.ts`.
- Anos vêm de `lib/years.ts`; a ordem de listas de `lib/reorder.ts`.
- Fórmulas em KaTeX por `lib/math-text.tsx` (`$...$` e `$$...$$`); o texto fora das fórmulas nunca é HTML.
- As pastas do Cloudinary `estuda-mz/materiais` e `estuda-mz/logotipos` mantêm-se (já há ficheiros nelas).
- Sem emojis na interface nova.

## Kit de ferramentas do Simulador (novo)
Botão flutuante no quiz (`components/simulador/toolbox.tsx`, atalho `T`). No Modo rápido só aparece depois de responder.
| Ferramenta | Quando | Como funciona |
|---|---|---|
| Dica (3 níveis) | antes de responder | Níveis 1 e 2 pela IA (Groq, mesmas definições do Jonas, sem revelar a resposta); nível 3 elimina uma opção errada (servidor). Cada dica custa 25 % dos pontos (`hint_events`, mínimo 25 %). Sem dicas no Modo rápido. |
| Porque errei | depois de errar | Ação `porque` do Jonas (`/api/jonas/explicar`), guardada na conversa da questão. |
| Questão parecida | depois de responder | A IA cria uma questão nova (JSON validado em `lib/kit-pure.ts`); o servidor guarda a certa em `ai_practice` e só a revela após a resposta. Não conta para pontos nem ranking; marcada «Criada por IA». |
| Matéria relacionada | sempre | Materiais aprovados da mesma disciplina; os que falam do tema (título ou descrição) vêm primeiro. Sem ligação tema-material explícita. |
| Estudar depois | sempre | `study_marks` (hoje, amanhã, fim de semana, sem data). Alimenta `/aluno/estudar-depois`, o Plano de hoje e os lembretes. |
| Reportar questão | sempre | `question_reports`; lido em `/admin/reportes`. |

## Lembretes
- Não há página de lembretes. Os lembretes vêm **ligados por defeito** (e-mail, criado no fim do onboarding: `saveGoal`). O push pede-se num **modal simples** no painel (`components/aluno/notificacoes-modal.tsx`, botão «Permitir notificações»), só se o navegador ainda não decidiu.
- No **perfil**, secção «Lembretes», um interruptor liga ou desliga tudo (`LembretesSwitch` → `setReminders`; ao desligar apagam-se os aparelhos registados).
- No máximo **uma janela por dia** por aparelho (`reservarModalHoje` em `lib/dispensar.ts`): notificações, depois instalar a app, depois novidade.
- Hora do lembrete: `notification_prefs.study_hour` (padrão `DEFAULT_STUDY_HOUR`, hora de Maputo). `/lembretes/cancelar?token=` desliga com um botão de confirmação.
- Cron (`/api/cron/lembretes`), regras em `lib/lembretes-shared.ts`; envia e-mail e push.

## Cores (`app/globals.css`)
Marca (ação principal), sucesso, erro (só erros), aviso (atenção e tempo a acabar), ajuda (azul), assistente e revisão (índigo), conquista (dourado). Classes `.btn-primario/-secundario/-terciario/-perigo/-icone` e `.chip`. Pílula só para etiquetas.

## Enunciado das questões (regra de apresentação)
`lib/statement-parse.ts` separa o enunciado por linhas e `components/simulador/question-statement.tsx` desenha-o. A regra, que também aparece no formulário de questões do admin («Como o enunciado aparece ao aluno»):
1. **Uma ideia por linha.**
2. **Contexto**: as primeiras linhas, em texto normal. Se vêm dados a seguir, a linha termina em `:`.
3. **Dados**: uma linha por dado, logo a seguir aos dois pontos, num cartão com marcador. Linhas só com fórmula (`$...$`) aparecem maiores, em bloco; o `;` ou `.` final é retirado.
4. **Pergunta**: a última linha, se terminar em `?` ou começar por Qual, Calcule, Determine, Indique, Assinale, etc. É a única em negrito. Enunciado de uma só linha = pergunta.
Pontuação solta numa linha (ex.: um `.` sozinho) junta-se à linha anterior, também nas opções. No simulador o enunciado fica num cartão com borda e fundo branco; o resultado (certo/errado) aparece depois das opções, para a questão não encolher.

## Painel do aluno (/aluno)
Cada bloco tem forma própria: destaque escuro «Hoje» (`hoje-hero.tsx`: anel da meta + continuar), faixa fina de aviso que se fecha (`aviso-faixa.tsx`, um por vez, «+N» abre janela pequena, volta no dia seguinte), fichas «Para hoje» (`plano-hoje.tsx`), três atalhos em grelha, cartão de orientação que se fecha (`fechavel.tsx`, volta ao fim de 14 dias) e uma janela de novidade única (`novidade-modal.tsx`, muda o ID em `ID` para anunciar outra). O «fechado» fica só no aparelho (`lib/dispensar.ts`, localStorage).

## Web push
Ficheiros: `public/sw.js` (service worker), `lib/push.ts` (envio), `lib/push-client.ts` (navegador), `app/api/push` (registar/apagar aparelho), `app/api/push/teste` (diagnóstico). **Motor de 30 em 30 minutos** (tipos, limites, definições em `app_settings`, agendador no GitHub Actions): `docs/NOTIFICACOES-PUSH.md`; código em `lib/push-regras.ts` (puro, testado) e `lib/push-motor.ts`. Variáveis: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (opcional), `CRON_SECRET`. No iPhone só funciona com a app instalada no ecrã principal.

## Percurso, exames e calendário
Especificação, mapa do fluxo entre cursos e disciplinas e estado das fases em `docs/EXAMES-E-PERCURSO.md`. Feito: modal «Praticar agora?», modal de instalar a app, curso e combinação de provas (onboarding, perfil, `/aluno/escolher-curso`), bloqueio «sem curso não se começa nada» para candidatos, Simulador só com as disciplinas da combinação (botões), notificações em modal. Por fazer: exame com regras, calendário, UEM integrado, seletores do admin e da Biblioteca. Regra de ouro: nada de listas fixas no código; tudo na base de dados e no admin; sem `<select>`, `alert` ou `confirm` nativos.

## Editais de admissão carregados
Edital 2027 da UP-Maputo, UniLicungo, UniPúnguè e UniRovuma: 184 cursos, 248 opções, vagas e provas por curso (`database/migrations/0033` e `0034`). Datas, regras, confirmações em falta e mapa de provas: `docs/EDITAL-UP-2027.md`. Cursos por concurso documental não entram (não há exame). A UEM 2027 falta carregar.

## Correções de 08/11/2026 (SEO, nomes, pontuação)
- **Causa de as páginas públicas nunca serem vistas:** `next.config.mjs` tinha `/exames → /biblioteca` (permanente), que exige login. Removido. Se o navegador guardou o redirecionamento antigo, testar num separador privado.
- Biblioteca passou a «Exames» (menu, painel, avisos, página inicial). Cabeçalho e rodapé públicos comuns (`components/site/site-frame.tsx`) ligam exames, simulado, blog e as universidades em todas as páginas públicas.
- Blog: moldura partilhada, páginas indexáveis `/blog/disciplina/<slug>` e `/blog/etiqueta/<tag>`, ligações para os exames, sitemap com tudo.
- SEO dos exames: FAQ com dados estruturados, páginas por ano (`/exames/<uni>/ano/<ano>`), ligações internas, sitemap em poucas consultas, instituição reconhecida pelo nome curto ou completo.
- Movimento ao fazer scroll: `components/ui/reveal.tsx` + classes `.rv`, `.rv-hero`, `.ex-card` em `globals.css`.
- Pontos e nota: ver `docs/PONTUACAO.md` (nota = 20 × pontos ganhos ÷ possíveis; dicas descontam aos dois).
- Por fazer: questões de exemplo públicas (testar sem conta), páginas por curso, `getHub` e `components/biblioteca/{category-tiles,section-row}.tsx` sem uso (remover), testar tudo num telemóvel.

## Exames públicos, temas e importação com o Jonas
Páginas públicas `/exames` (Google), temas principais (`/admin/temas-principais`), importação de exames com o Jonas (`/admin/importar`): `docs/EXAMES-PUBLICOS-E-JONAS.md`. Depende de `unpdf` e `pdf-lib`. Migrações 0037 e 0038.

## Fase 0 (09/11/2026), FEITO, FALTA TESTE
- **Sequência separada da meta:** a sequência conta com 3 questões (`STREAK_MIN`, `streakNeed` em `lib/desafios-regras.ts`); a meta diária continua a ser a barra e as missões. Novo campo `streak.todayCounted`. Avisos, push e cartão da Sequência em `/aluno/desafios` usam os dois conceitos em separado. O «congelar» não faz parte da Fase 0.
- **Push:** a notificação de teste abria `/aluno/lembretes` (404) e agora abre `/aluno/notificacoes`. O `sw.js` usa a `tag` enviada no push (o motor envia o tipo da mensagem) em vez de uma fixa: tipos diferentes já não se substituem. Diagnóstico em `scripts/diagnostico-push.sh`. Por confirmar com o site real: execuções do GitHub Actions, `CRON_SECRET`, migrações 0027, 0028 e 0032.
- **Nomes no menu do estudante:** Hoje (antes «Visão geral»), Treinar (antes «Simulador»), Exames, Desafios, Ranking, Jonas, Eu (antes «O meu perfil»). «Simulado» só entra no menu quando o módulo `simulados` abrir (hoje «Em breve»). Faltam os títulos de página e textos que ainda dizem «Simulador».
- **Texto que não quebra:** `.btn` passou a `white-space: nowrap` (antes `text-wrap: balance`). Os dois rótulos longos encontrados foram encurtados («Não sei: teste vocacional»). Cards ainda por auditar. Regras novas em `DESIGN.md` e `PRODUTO.md`.
- `components/feature-card.tsx` não é usado em nenhuma página (a pesquisa dizia que era igual com e sem ligação, mas está morto): apagar quando houver aval.

## Pendentes, por prioridade
P0 (antes de receber estudantes)
1. Ensaio completo com 3 a 5 estudantes reais num telemóvel (conta, e-mail, percurso, simulado, ranking, Jonas, Biblioteca).
2. Conteúdo mínimo carregado: instituições, disciplinas, temas, questões publicadas, materiais.
3. Confirmar a entrega de PDF no Cloudinary.
4. Verificar o domínio no Resend e testar a recuperação de conta com e-mail real.
5. FEITO: Comunidade e Convites retirados; Notificações e Favoritos ligados a dados reais. Falta correr `npm run migrate` (0027 e 0028) e definir `CRON_SECRET`.

P1
6. Registo: FEITO (idade, Termos, validação). Falta ligar o Google: criar as credenciais, registar `<BETTER_AUTH_URL>/api/auth/callback/google`, preencher as duas variáveis e passar a aplicação a «In production» na Google.
7. FEITO: guarda única `requireStudent()` (`lib/require-student.ts`) nas páginas do estudante, `/jonas`, `/biblioteca` e `/comunidade`. Faltam as acções de servidor e rotas de API, que continuam a validar a sessão uma a uma.
8. FEITO: ranking oculto por omissão para menores de 18 (decisão: idade mínima 13).
9. Ligação à base com pooler; monitorização de erros; eventos de utilização (primeiro simulado, primeira mensagem ao Jonas).
10. Jonas: limites por plano, tecto diário, estado quando a Groq recusa por quota, política de dados da Groq nos Termos.
11. Pagamento local (M-Pesa, e-Mola…): decidir os meios e o fluxo (confirmação manual no admin ou API); a tabela `subscriptions` já tem `provider`, `reference` e `current_period_end`.

P2
12. FEITO por outra via: `study_days` (`lib/study-days.ts`). A tabela `study_progress` ficou sem leitura nem escrita: remover (ver 16).
13. FEITO: notificações e e-mail de lembretes (`lib/lembretes.ts`, cron `/api/cron/lembretes`, fila `notification_outbox`). Falta testar com e-mail real.
14. FEITO: `/aluno/favoritos` lê `library_favorites`.
15. Remover as dependências sem uso (`ai`, `@ai-sdk/react`, `@base-ui/react`, `class-variance-authority`): script à parte, depois do build passar.
16. FEITO: a migração 0028 remove `study_progress`, `quiz_attempts`, `posts`, `follows` e `post_likes` (apaga dados). Ficam as linhas antigas de `exam_modules`.

Herdado do registo anterior (número do item antigo)
- #7 dados reais das instituições (sigla, nome, descrição, logótipo).
- #10 `/planos` sem ligação em nenhuma página.
- #11 depois de entrar, vai sempre para `/aluno` (perde o contexto de onde veio).
- #13 PNGs comprimidos (OG de 1,6 MB para 0,7 MB); `images.unoptimized: true` mantém-se.
- #50 eliminar tema não verifica uso.
- #61 o envio de material cria a disciplina por texto livre.
- #127 CSV gravado pelo Excel com `;` falha; só aceita vírgulas.
- #134 revisor sem percurso é enviado para `/aluno/percurso`.
- #138 confirmar pesos no edital da UEM (`docs/CURSOS-UEM-2026.md`).
- #139 ligação aluno-curso: o curso-alvo é texto livre; materiais e questões sem marca de prova.
- #146 as secções da Biblioteca dependem do `slug` das categorias (`MAIN_SECTIONS` em `lib/library-shared.ts`).
- #147 instituição dos materiais é texto livre.

## Identidade, onboarding e retenção (docs/IDENTIDADE-ONBOARDING-RETENCAO.md)
Feito (fases A a D, ainda por testar com estudantes): guarda central, limite de pedidos em base de dados, chaves estrangeiras com CASCADE (`student_profiles`, `notifications`, `quiz_attempts`, `posts`), registo de 1 ecrã, onboarding de 3 ecrãs, regras de idade, `study_days`, saudação de aniversário. Migração `0024_identidade_onboarding.sql`: correr `npm run migrate` antes de publicar.
Por fazer:
- Fase C (resto): lista de dispositivos com sessão aberta e «terminar sessão» no perfil; mudar e-mail; apagar conta e exportar dados.
- Fase E: marcos na plataforma, banner de anúncios do admin, barra de cookies com Aceitar e Recusar para o Google Analytics.
- Fase F (feito): lembrete diário por e-mail na hora escolhida, `notification_outbox`, cron, desligar com confirmação. Por fazer: pré-visualização no admin, e-mail de aniversário. Hoje `notification_prefs` só guarda a escolha do ecrã 3: nada a lê.
- Fase G: Web Push (o botão «No telemóvel» do onboarding está desactivado).
- Fase H: datas de exame por instituição e contagem no painel.
- Estudantes que já tinham conta passam pelo onboarding no próximo acesso (falta-lhes data de nascimento, meta e escolha de lembretes).
- Quem entra por Google, com consentimento por registar, vê a caixa dos Termos no ecrã 1 do onboarding.

## Decisões por tomar
- Pagamento: moeda, meio (cartão ou carteira móvel) e o que o plano pago desbloqueia. Sugestão: lançar gratuito e cobrar depois.
- Menores de idade: decidido idade mínima de conta 13 (`MIN_AGE` em `lib/identity.ts`) e predefinições de privacidade abaixo de 18. Falta confirmar com quem conheça a lei local.
- Desafios: manter ou simplificar até haver estudantes (a Comunidade foi retirada).
- Conteúdo mínimo para lançar (percursos, disciplinas, número de questões).
- Gestor de pacotes: npm ou pnpm.
- Origens de questão jogáveis (`PLAYABLE_ORIGINS` em `lib/simulator.ts`).
- Decisões em aberto de `SIMULADOR.md` (secção 11) e `JONAS.md` (secção 7).

## Documentos
- `docs/IDENTIDADE-ONBOARDING-RETENCAO.md`: desenho final de identidade, onboarding, actividade e retenção (fases A a H).
- `SIMULADOR.md`, `JONAS.md`, `CONVITES.md`, `ADMIN-MATERIAIS.md`, `docs/EMAIL.md`, `docs/CURSOS-UEM-2026.md`, `docs/prompt-csv-questoes.md`: mantidos; ainda não foram revistos contra o código.
TWISISA_FASE0_EOF

echo "A escrever DESIGN.md"
cat > "DESIGN.md" <<'TWISISA_FASE0_EOF'
# DESIGN.md — Twisisa

Fonte de verdade dos valores: `app/globals.css`. Aqui ficam as regras de uso.

## Cores com propósito (uma cor, um significado)
- Marca `--marca`: acção principal e identidade. Um botão primário por ecrã.
- Sucesso: resposta certa, meta cumprida.
- Erro: só resposta errada, falha, erro de formulário e acções destrutivas.
- Aviso: atenção (sequência em risco, tempo a acabar, disciplina fraca).
- Ajuda (azul): dicas, matéria relacionada, informação.
- Assistente e revisão (índigo): Jonas, Estudar depois, revisão.
- Conquista (dourado): sequência, pontos, ranking.
- Não introduzir cinzentos novos. Texto de apoio usa `--texto-2`. O que é dispensável afasta-se das acções principais (canto de cima à direita ou em baixo à esquerda) e tem cor visível.

## Botões e etiquetas
- Botão = cantos de 14 px (`.btn`). Primário `.btn-primario` (um por ecrã), `.btn-secundario`, `.btn-terciario`, `.btn-perigo`, `.btn-icone`.
- Etiqueta = pílula (`.chip`). Só etiquetas e estados. Nunca parece botão.
- Rótulo de botão: verbo, até 24 caracteres.

## Texto que não quebra
- Botões e cards: uma linha por texto, sem quebra. `.btn` usa `white-space: nowrap`. Em cards, cada linha é um elemento com `white-space: nowrap`.
- Por isso os textos têm de caber: escrever curto, testar a 360 px e a 320 px. Se não cabe, encurta-se o texto; não se deixa quebrar.
- Texto corrido fora de botões e cards (parágrafos) pode quebrar.

## Clicável ou informativo
| Elemento | Parece assim | Nunca |
|---|---|---|
| Botão | Preenchido na cor da marca, texto em verbo | Só texto sem contentor |
| Link | Cor da marca, sublinhado no texto corrido | Igual ao texto normal |
| Cartão clicável | Borda mais forte, seta ou chevron, estado de toque e de foco, o cartão inteiro é a área | Parecer igual a um cartão informativo |
| Cartão informativo | Sem borda forte, sem seta, fundo neutro, cursor normal | Ter seta ou «Abrir» |
| Ícone sozinho | Só se for universal; senão com rótulo | Ícone sem texto numa acção nova |
| Etiqueta (chip) | Pílula, sem estado de toque | Parecer botão |

Regra: a cor da marca só aparece em coisas que se tocam.

## Textos
- Instruções até 12 palavras. Textos de ajuda instruem; nunca explicam razões técnicas ou internas.
- Específico em vez de genérico: «UEM 2025 · Matemática», nunca «Bem-vindo à tua jornada».
- Sem emojis. Sem sombras em cartões: a estrutura vem de linhas de 1 px.

## Tipografia
- Corpo: DM Sans. Títulos: Manrope.
TWISISA_FASE0_EOF

echo "A escrever PRODUTO.md"
cat > "PRODUTO.md" <<'TWISISA_FASE0_EOF'
# PRODUTO.md — Twisisa

Contexto-mestre. Cola este ficheiro no início de qualquer conversa de design ou de produto.

PRODUTO: Twisisa, plataforma de estudo (hoje Moçambique; desenhada para qualquer país).
PÚBLICO: 13–24 anos, Android, ecrã de 360px, dados caros, rede instável.
PROMESSA: em 10 segundos o aluno sabe O QUE fazer, PORQUÊ e QUE GANHO tem.

REGRAS
- Uma acção principal por ecrã.
- Instruções até 12 palavras.
- Nada de dados inventados: usar «—» ou estado vazio.
- O que é clicável parece clicável; o informativo não.
- Só tokens de `app/globals.css`.
- Sem emojis. Sem cartões com sombra.
- Nenhum texto dentro de botões ou cards quebra de linha (ver DESIGN.md).

VOZ: português de Moçambique, directo, sem culpa («faltam 6», não «falhaste»).

PROIBIDO (cara de IA): gradiente roxo, Inter por defeito, cartões dentro de cartões, número gigante a brilhar, tudo centrado, ícone num círculo colorido em todos os cartões.

MÉTRICAS: CURR (percentagem dos activos de hoje que também estiveram activos na semana anterior), tempo até ao primeiro estudo, percentagem que activa push, partilhas por canal.

NOMES (um por coisa)
- Treinar: praticar questões, sem pressão (hoje `/aluno/simulador`).
- Simulado: prova completa com tempo e nota (módulo ainda «Em breve»; não entra no menu até abrir).
- Exames: arquivo de exames reais por universidade e ano (`/exames`).

SEQUÊNCIA E META (decidido na Fase 0)
- Sequência = 1 acção mínima por dia (3 questões, `STREAK_MIN` em `lib/desafios-regras.ts`, nunca mais do que a meta do aluno).
- Meta diária = barra à parte (`DAILY_GOAL` ou a meta escolhida no onboarding).
TWISISA_FASE0_EOF

echo "A escrever scripts/diagnostico-push.sh"
cat > "scripts/diagnostico-push.sh" <<'TWISISA_FASE0_EOF'
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
TWISISA_FASE0_EOF

chmod +x scripts/diagnostico-push.sh

echo ""
echo "A correr os testes…"
npm test

echo ""
echo "A correr o build…"
npm run build

echo ""
echo "Testes e build passaram. A fazer commit e push…"
git add app/api/push/teste/route.ts app/globals.css components/aluno/desafios/parts.tsx components/aluno/escolher-curso-flow.tsx components/student-nav.tsx lib/avisos.ts lib/desafios-regras.ts lib/push-motor.ts lib/push-regras.ts lib/push.ts public/sw.js tests/desafios.test.ts tests/push-regras.test.ts State.md DESIGN.md PRODUTO.md scripts/diagnostico-push.sh
git commit -m "Fase 0: sequência separada da meta, push sem 404 e com tag por tipo, menu Hoje/Treinar/Eu, botões sem quebra, DESIGN.md e PRODUTO.md"
git push

echo ""
echo "Concluído. Depois do deploy, corre: CONFIRMAR=sim SITE_URL=... CRON_SECRET=... bash scripts/diagnostico-push.sh"
