#!/bin/bash
# Resumable render: 16 segments, 4 workers; a segment counts only once its .done marker exists.
cd "$(dirname "$0")"
W=../work_airtag/seg; mkdir -p $W
END=118.7; N=16
seg() { python3 -c "print(f'{round(3561*$1/$N)/30:.6f}')"; }   # on the 30 fps frame grid (3561 frames)
run() {
  i=$1; a=$(seg $i); b=$(seg $((i+1)))
  [ -f $W/s$i.done ] && return
  PAGE='index.html?rs=0.6667' node ../tools/render.mjs engine $W/s$i.mp4 30 $a $b > $W/s$i.log 2>&1 && touch $W/s$i.done
}
export -f run seg; export W END N
seq 0 $((N-1)) | xargs -P 4 -I{} bash -c 'run {}'
