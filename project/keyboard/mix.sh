#!/bin/bash
# usage: ./mix.sh → audio/final_music.wav, audio/final_nomusic.wav (two-pass loudnorm −14 LUFS / −1.5 dBTP)
set -e
cd "$(dirname "$0")"
D=46.8
V=voice_timed.wav
ffmpeg -nostdin -v error -y -i audio/music.wav -af "highpass=f=70,equalizer=f=2600:t=q:w=1.4:g=-8,equalizer=f=1200:t=q:w=1:g=-4,equalizer=f=4500:t=q:w=1:g=-4" audio/m_eq.wav
ffmpeg -nostdin -v error -y -i $V -i audio/m_eq.wav -i audio/sfx.wav -filter_complex "
[0:a]aresample=48000,apad=whole_dur=$D,asplit=3[v][sc1][sc2];
[1:a]aresample=48000,volume=-21dB[m0];[m0][sc1]sidechaincompress=threshold=0.05:ratio=3:attack=20:release=450[m];
[2:a]aresample=48000,volume=-5dB[s0];[s0][sc2]sidechaincompress=threshold=0.03:ratio=2.5:attack=10:release=300[s];
[v][m][s]amix=inputs=3:normalize=0:duration=longest,atrim=0:$D,alimiter=limit=0.7:attack=3:release=80:level=false" audio/pre_music.wav
ffmpeg -nostdin -v error -y -i $V -i audio/sfx.wav -filter_complex "
[0:a]aresample=48000,apad=whole_dur=$D,asplit=2[v][sc2];
[1:a]aresample=48000,volume=-5dB[s0];[s0][sc2]sidechaincompress=threshold=0.03:ratio=2.5:attack=10:release=300[s];
[v][s]amix=inputs=2:normalize=0:duration=longest,atrim=0:$D,alimiter=limit=0.7:attack=3:release=80:level=false" audio/pre_nomusic.wav
for k in music nomusic; do
  J=$(ffmpeg -nostdin -hide_banner -i audio/pre_$k.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  g(){ echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
  ffmpeg -nostdin -v error -y -i audio/pre_$k.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" -ar 48000 audio/final_$k.wav
done
