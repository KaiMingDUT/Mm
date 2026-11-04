# Messaging cover ("كيف توصل رسالتك لآخر العالم في ثواني؟")

Art is a three.js scene (`art.js`): dotted globe (Natural Earth land from
`project/airtag/engine/assets/land-50m.json`, decoded inline), approximate undersea
cable routes, a light pulse on the Riyadh → Red Sea → Med → Atlantic → New York
route, a phone sending "وصلتك؟", and a cut fibre-optic cable in the foreground.
Chip fact: ~14,000 km of cable at ~200,000 km/s in glass ≈ 0.07 s → "أقل من 0.1 ثانية".

```
cd project/tools/cover
node shoot.mjs ../../messaging/cover/index.html art.png
node cover_title.mjs art.png ../../../output/messaging/KROZO_Messaging_Cover.png "كيف توصل رسالتك" "لآخر العالم" "في [ثواني]؟"
```
