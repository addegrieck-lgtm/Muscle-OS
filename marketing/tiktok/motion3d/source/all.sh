#!/bin/bash
# rendu complet : 4 processus par plan
render() { s=$1; n=$2; mkdir -p out/$s; q=$(( (n+3)/4 )); for k in 0 1 2 3; do a=$((k*q)); b=$((a+q)); [ $b -gt $n ] && b=$n; node shoot.js $s out/$s $n $a $b > out/$s.log$k 2>&1 & done; wait; echo "$s $(ls out/$s | wc -l)/$n $(date +%T)"; }
rm -rf out; mkdir out
render spawn 135; render ile 120; render fosse 120; render totem 120; render koth 150
