# Cover title — fixed layout (client-approved, use on EVERY cover)

Reference: `reference_apple_watch.png`. The title block always sits at the same
place, as fractions of the 1080×1920 frame:

| element | style | top → bottom | width |
|---|---|---|---|
| line 1 | white, Alexandria 900 | 8.8 % → 17.4 % | fit to 84 % |
| line 2 | cyan gradient + glow | 18.3 % → 25.9 % | fit to 84 % |
| box | dark pill, glowing cyan frame; `[words]` in cyan | 26.4 % → 32.6 % | 8 % inset each side |

Lines are shrunk to fit; they never move. Split the title like the reference:
question start (line 1), the hook (line 2), the rest in the box.

```
# only if the background already has text baked in (AI-generated art):
python3 erase_text.py IN.png clean.png 0.065 0.225
node cover_title.mjs clean.png OUT.png "ايش هو الكوكيز" "الي يظهر لك" "في [كل موقع] تدخل له؟"
```

Font: Alexandria (SIL OFL 1.1, Google Fonts).
