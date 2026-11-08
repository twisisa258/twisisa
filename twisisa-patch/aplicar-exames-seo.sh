#!/usr/bin/env bash
# Uso (na pasta do projecto):  cd ~/twisisa && bash ~/downloads/twisisa-patch/aplicar-exames-seo.sh
set -e
AQUI="$(cd "$(dirname "$0")" && pwd)"
cp -r "$AQUI"/app "$AQUI"/components "$AQUI"/lib "$AQUI"/tests "$AQUI"/docs "$AQUI"/State.md "$AQUI"/next.config.mjs .
# Páginas da antiga Biblioteca que passaram a redireccionar para /exames
rm -f "app/biblioteca/(catalogo)/page.tsx" "app/biblioteca/(catalogo)/loading.tsx"
rm -rf app/biblioteca/explorar app/biblioteca/pesquisa
echo "Aplicado. Agora: npm test && npm run build"
