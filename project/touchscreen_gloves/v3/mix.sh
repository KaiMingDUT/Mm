#!/bin/bash
# usage: mix.sh  → final_music.wav, final_nomusic.wav (two-pass loudnorm −14 LUFS / −1.5 dBTP)
set -e
V=${VOICE:-../work/voice_timed.wav}
ffmpeg -nostdin -v error -y -i $V -i m_eq.wav -i sfx.wav -filter_complex "
[0:a]aresample=48000,apad=whole_dur=108.1,asplit=3[v][sc1][sc2];
[1:a]volume=-19.1dB[m0];[m0][sc1]sidechaincompress=threshold=0.05:ratio=3:attack=20:release=450[m];
[2:a]aresample=48000,volume=-5dB[s0];[s0][sc2]sidechaincompress=threshold=0.03:ratio=2.5:attack=10:release=300[s];
[v][m][s]amix=inputs=3:normalize=0:duration=longest" pre_music.wav
ffmpeg -nostdin -v error -y -i $V -i sfx.wav -filter_complex "
[0:a]aresample=48000,apad=whole_dur=108.1,asplit=2[v][sc2];
[1:a]aresample=48000,volume=-5dB[s0];[s0][sc2]sidechaincompress=threshold=0.03:ratio=2.5:attack=10:release=300[s];
[v][s]amix=inputs=2:normalize=0:duration=longest" pre_nomusic.wav
for k in music nomusic; do
  J=$(ffmpeg -nostdin -hide_banner -i pre_$k.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  g(){ echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
  ffmpeg -nostdin -v error -y -i pre_$k.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" -ar 48000 final_$k.wav
done
