#!/bin/bash
# aperçu basse définition : ./pv.sh shot1 shot2 ...
for s in "$@"; do mkdir -p pv/$s; for f in 0 5 9; do node shoot.js $s pv/$s 10 $f $((f+1)) 0.25 >/dev/null 2>&1 & done; done; wait
python3 - "$@" <<'PY'
import sys
from PIL import Image
ss=sys.argv[1:]
c=Image.new('RGB',(len(ss)*3*272,484))
for i,s in enumerate(ss):
  for j,f in enumerate([0,5,9]):
    c.paste(Image.open(f'pv/{s}/f{f:04d}.png'),((i*3+j)*272,2))
c.save('pv.png')
PY
