#!/usr/bin/env bash
# Deixa o SVG do Galaga em preto e branco:
# - troca os 4 verdes de contribuição do GitHub por tons de cinza (o mais forte vira branco)
# - aplica um filtro sem saturação nas imagens (a nave e os inimigos são PNGs coloridos)
set -euo pipefail
for f in "$@"; do
  sed -i \
    -e 's/#0e4429/#2e2e2e/gI; s/#006d32/#5e5e5e/gI; s/#26a641/#a8a8a8/gI; s/#39d353/#ffffff/gI' \
    -e 's/#9be9a8/#2e2e2e/gI; s/#40c463/#5e5e5e/gI; s/#30a14e/#a8a8a8/gI; s/#216e39/#ffffff/gI' \
    -e 's/<image /<image filter="url(#bw)" /g' \
    -e '0,/<rect /s//<defs><filter id="bw"><feColorMatrix type="saturate" values="0"\/><\/filter><\/defs><rect /' \
    "$f"
  echo "P&B: $f"
done
