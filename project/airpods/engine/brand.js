// Reusable KROZO brand scenes.
function outroScene(s, e) {
  return {
    s, e, fi: .2, fo: .5,
    focus: lt => ({ x: 540, y: 900, r: 700, a: .10 + .1 * ease.out(prog(lt, 0, 1)) }),
    build(root) {
      root.appendChild(el(`<div style="position:absolute;left:0;right:0;top:760px;text-align:center;direction:ltr">
        <div class="wm" style="font-family:PlexLatin;font-weight:700;font-size:150px;letter-spacing:34px;color:${C.ink};padding-left:34px"></div>
        <div class="ln" style="height:3px;margin:34px auto 30px;background:linear-gradient(90deg,transparent,${C.blue},${C.cyan},transparent)"></div>
        <div class="tg" style="font-family:PlexLatin;font-weight:500;font-size:38px;letter-spacing:18px;color:${C.cyan};padding-left:18px">BEYOND TECH</div>
      </div>`));
    },
    update(root, lt) {
      const word = 'KROZO';
      const wm = root.querySelector('.wm');
      wm.innerHTML = [...word].map((ch, i) => {
        const k = ease.out(prog(lt, .1 + i * .07, .55 + i * .07));
        return `<span style="display:inline-block;opacity:${k};transform:translateY(${(1 - k) * 40}px);filter:blur(${(1 - k) * 8}px)">${ch}</span>`;
      }).join('');
      root.querySelector('.ln').style.width = (ease.inOut(prog(lt, .45, 1.1)) * 640) + 'px';
      const tg = root.querySelector('.tg');
      const k = ease.out(prog(lt, .8, 1.4));
      tg.style.opacity = k; tg.style.letterSpacing = (18 + (1 - k) * 14) + 'px';
    },
  };
}
