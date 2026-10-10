/* =========================================================
   サイト共通の動き
   ・メニュー開閉、ヒーローのスライド切替、控えめなフェードイン … 現行デザイン（V1）と同じ
   ・製品カードの傾きと反射 … 折衷案（V3）から
   ・「動きを減らす」設定の端末では、すべて止めて完成形で表示する
   ========================================================= */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- メニュー開閉 ---------- */
  const burger = document.querySelector('.burger');
  const gnav = document.querySelector('.gnav');
  if (burger && gnav) {
    const set = (open) => {
      gnav.classList.toggle('is-open', open);
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.documentElement.classList.toggle('is-menu-open', open);
      document.body.classList.toggle('is-menu-open', open);
    };
    burger.addEventListener('click', () => set(!gnav.classList.contains('is-open')));
    gnav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* ---------- ヒーローのスライド切替（6秒ごと） ---------- */
  (() => {
    const slides = [...document.querySelectorAll('.hero__slide')];
    const dots = [...document.querySelectorAll('.hero__dots li')];
    if (slides.length < 2) return;
    let i = 0, timer = null;
    const show = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => { stop(); timer = setInterval(() => show(i + 1), 6000); };
    dots.forEach((d, k) => {
      d.setAttribute('role', 'button');
      d.setAttribute('tabindex', '0');
      d.setAttribute('aria-label', (k + 1) + '枚目の画像を表示');
      d.addEventListener('click', () => { show(k); start(); });
      d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(k); start(); } });
    });
    document.addEventListener('visibilitychange', () => { document.hidden || reduce ? stop() : start(); });
    if (!reduce) start();
  })();

  /* ---------- 控えめなフェードイン ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    const sel = '.slg .wrap,.hd8,.hd8__lead,.svc__lead,.svc__item,.works,.rec__box,.posts,.about__intro,.about__story,.cta__inner,.prods,.apps,.ems-sec,.tl__year,.mvv__item,.ptable,.cinfo,.pd,.pd__body,.article';
    const els = [...document.querySelectorAll(sel)];
    els.forEach((el) => el.classList.add('rv'));
    els.forEach((el) => {
      const sibs = [...el.parentElement.children].filter((n) => n.classList.contains('rv'));
      el.style.transitionDelay = Math.min(sibs.indexOf(el), 4) * 70 + 'ms';
    });
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    els.forEach((el) => io.observe(el));
    setTimeout(() => els.forEach((el) => el.classList.add('is-in')), 8000);
  }

  /* ---------- 製品カード：傾きと反射（PCのみ） ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const media = card.querySelector('.work__media');
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - y) * 5).toFixed(2) + 'deg');
        if (media) media.style.setProperty('--sx', (120 - x * 140).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
        if (media) media.style.setProperty('--sx', '120%');
      });
    });
  }
})();

/* 下層ページの見出し帯：地形の等高線
   漂う光（CSS）の上に、立体に見える等高線を重ねる。
   ・斜面の向きと光の向きで線の明るさを変える（光の当たる斜面は明るく、陰は暗く）。5本ごとの主曲線は太く
   ・地形はごくゆっくり形を変え、光の向きも数分かけて一周する。動いていると気づかない程度の速さに抑える
   ・マウスを置くと、その場所の地面がわずかに盛り上がる（ゆっくり追従）
   見出し側（左）は CSS のマスクで消す。画面外では止め、動きを減らす設定では静止画にする */
(() => {
  const hero = document.querySelector('.page-head');
  if (!hero) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'ph-canvas'; cv.setAttribute('aria-hidden', 'true');
  hero.insertBefore(cv, hero.querySelector('.wrap'));
  const c = cv.getContext('2d');
  const m = { on: false, px: 0, py: 0 };
  let W = 0, H = 0, raf = 0, vis = true, frame = 0, bx = -1, by = -1, bh = 0;

  const init = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0);
  };

  const B = 6, S = 8;
  const at = (a, b, l) => (l - a) / (b - a);
  const draw = (t) => {
    // 2フレームに1回だけ描き直す（動きが遅いので見た目は変わらない）
    if (frame++ % 2 === 0 || reduce) {
      c.clearRect(0, 0, W, H);
      const T = t * 0.000015, nx = Math.ceil(W / S) + 1, ny = Math.ceil(H / S) + 1, f = new Float32Array(nx * ny);
      if (m.on) { bx = bx < 0 ? m.px : bx + (m.px - bx) * 0.03; by = by < 0 ? m.py : by + (m.py - by) * 0.03; }
      bh += ((m.on ? 0.6 : 0) - bh) * 0.02;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = i * S / 260, y = j * S / 260;
        let v = Math.sin(x * 1.3 + T * 3) * Math.cos(y * 1.7 - T * 2) + 0.6 * Math.sin(x * 2.1 - y * 1.4 + T * 4 + 1.3)
          + 0.35 * Math.cos(x * 3.7 + y * 2.9 - T * 5) + 0.5 * Math.cos(Math.hypot(x - 3.2 - Math.sin(T) * 0.4, y - 0.6) * 2.4 - T * 2);
        if (bh > 0.01) v += bh * Math.exp(-(((i * S - bx) ** 2) + ((j * S - by) ** 2)) / 5200);
        f[j * nx + i] = v;
      }
      const la = 0.6 + t * 0.00003, lx = Math.cos(la), ly = Math.sin(la);
      const lines = Array.from({ length: B }, () => new Path2D()), main = Array.from({ length: B }, () => new Path2D());
      for (let L = -2, n = 0; L <= 2.6; L += 0.2, n++) {
        const set = n % 5 === 0 ? main : lines;
        for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
          const a = f[j * nx + i], b = f[j * nx + i + 1], d = f[(j + 1) * nx + i], e = f[(j + 1) * nx + i + 1];
          const k = (a > L) | ((b > L) << 1) | ((e > L) << 2) | ((d > L) << 3);
          if (k === 0 || k === 15) continue;
          const x = i * S, y = j * S, p = [];
          if ((a > L) !== (b > L)) p.push([x + S * at(a, b, L), y]);
          if ((b > L) !== (e > L)) p.push([x + S, y + S * at(b, e, L)]);
          if ((d > L) !== (e > L)) p.push([x + S * at(d, e, L), y + S]);
          if ((a > L) !== (d > L)) p.push([x, y + S * at(a, d, L)]);
          const gx = (b - a + e - d) / 2, gy = (d - a + e - b) / 2, gl = Math.hypot(gx, gy) || 1;
          const q = Math.min(B - 1, Math.floor(Math.max(0, (gx * lx + gy * ly) / gl) * B));
          set[q].moveTo(p[0][0], p[0][1]); set[q].lineTo(p[1][0], p[1][1]);
          if (p.length === 4) { set[q].moveTo(p[2][0], p[2][1]); set[q].lineTo(p[3][0], p[3][1]); }
        }
      }
      for (let q = 0; q < B; q++) {
        const k = q / (B - 1);
        c.strokeStyle = `rgba(206,236,240,${0.09 + k * 0.3})`; c.lineWidth = 0.75; c.stroke(lines[q]);
        c.strokeStyle = `rgba(${Math.round(206 + 38 * k * 0.5)},${Math.round(236 - 22 * k * 0.5)},${Math.round(240 - 80 * k * 0.5)},${0.2 + k * 0.5})`;
        c.lineWidth = 1.2; c.stroke(main[q]);
      }
    }
    if (!reduce && vis) raf = requestAnimationFrame(draw);
  };
  const start = () => { if (reduce) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };

  hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); m.on = true; m.px = e.clientX - r.left; m.py = e.clientY - r.top; });
  hero.addEventListener('pointerleave', () => { m.on = false; });
  new IntersectionObserver((en) => { vis = en[0].isIntersecting; if (vis) start(); }).observe(hero);
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (hero.clientWidth === W && hero.clientHeight === H) return; init(); if (reduce) draw(0); }, 150); });
  init();
  if (reduce) draw(0); else start();
})();
