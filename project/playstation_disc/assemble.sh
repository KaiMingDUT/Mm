#!/bin/bash
# concat the 16 render segments → x264 crf 19 (maxrate 4.2M) → mux both mixes → output/playstation_disc/
set -e
cd "$(dirname "$0")"
W=../work_ps; O=../../output/playstation_disc; mkdir -p $O
for i in $(seq 0 15); do echo "file 'seg/s$i.mp4'"; done > $W/list.txt
ffmpeg -nostdin -v error -y -f concat -safe 0 -i $W/list.txt -c copy $W/video.mp4
ffmpeg -nostdin -v error -y -i $W/video.mp4 -c:v libx264 -preset slow -crf 19 -maxrate 4.2M -bufsize 8.4M -pix_fmt yuv420p -an $W/video_enc.mp4
for k in music nomusic; do
  n=KROZO_PlayStation_Disc_Reel; [ $k = nomusic ] && n=${n}_NoMusic
  ffmpeg -nostdin -v error -y -i $W/video_enc.mp4 -i audio/final_$k.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart $O/$n.mp4
done
cp playstation.ar.srt $O/
ffmpeg -nostdin -v error -y -i $O/KROZO_PlayStation_Disc_Reel.mp4 -vf "fps=1/2,scale=216:384,tile=8x4" -frames:v 1 $O/contact_sheet.png
