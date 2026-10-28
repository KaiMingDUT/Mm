# PlayStation cover

Art is a three.js scene (`art.js`): console, iridescent disc read by a laser, data
voxels rising into a holographic game world, controller in front. Title uses the
fixed cover layout (`project/tools/cover/`).

```
cd project/tools/cover
node shoot.mjs ../../playstation/cover/index.html art.png
node cover_title.mjs art.png ../../../output/playstation/KROZO_PlayStation_Cover.png "كيف البلايستيشن" "يحوّل الـCD" "إلى [لعبة كاملة]؟"
```
