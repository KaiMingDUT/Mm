#!/bin/bash
# Resumable render: 16 segments, 4 workers; a segment counts only once its .done marker exists.
cd "$(dirname "$0")"
W=../work_ps/seg; mkdir -p $W
N=16; F=1833   # 61.1 s × 30 fps
seg() { python3 -c "print(f'{round($F*$1/$N)/30:.6f}')"; }
run() {
  i=$1; a=$(seg $i); b=$(seg $((i+1)))
  [ -f $W/s$i.done ] && return
  PAGE="index.html?rs=${RS:-1}" node ../tools/render.mjs engine $W/s$i.mp4 30 $a $b > $W/s$i.log 2>&1 && touch $W/s$i.done
}
export -f run seg; export W N F RS
seq 0 $((N-1)) | xargs -P 4 -I{} bash -c 'run {}'
