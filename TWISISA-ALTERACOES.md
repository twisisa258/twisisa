# Twisisa — alterações desta entrega

- Renomeado para **Twisisa** em todo o código, textos, e-mails, SEO, manifest e documentação.
- Nova marca: `public/images/twisisa-mark(.png|-white.png)`, ícones PWA, `app/icon.png`, `app/apple-icon.png`, `favicon.ico`, `public/og/twisisa-og.png`, `email-logo.png`.
- Nova página inicial: `components/home-page.tsx` + estilos `.tw-*` no fim de `app/globals.css`.
- Foto da landing: `public/images/estudantes-estudo.jpg`.
- Não alterado de propósito: pastas do Cloudinary (`estuda-mz/materiais`, `estuda-mz/logotipos`), para não separar ficheiros já carregados.
- Preço: a landing mostra 197 MT/mês; o checkout (`lib/products.ts`) continua em USD 9,99 até decidires a moeda no Stripe.
- Testar: `pnpm install && pnpm build`.
