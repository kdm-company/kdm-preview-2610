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

/* 下層ページの見出し帯
   漂う光（CSS）の上に、1枚の canvas で三層を重ねる。
   ・等高線：用地・地域。なだらかな起伏の等高線がごくゆっくり形を変える（3フレームに1回だけ描き直す）
   ・パネル：真上から見た発電所。日差しの帯が横切り、当たったセルが少しずつずれて光る。光の色は朝の琥珀→昼の白→夕方の琥珀
   ・エネルギーの粒：右へ流れ、日差しの帯を通るときだけ同じ色に灯る。マウスを近づけると粒がよける
   見出し側（左）は CSS のマスクで消す。画面外では止め、動きを減らす設定では静止画にする */
(() => {
  const hero = document.querySelector('.page-head');
  if (!hero) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'ph-canvas'; cv.setAttribute('aria-hidden', 'true');
  hero.insertBefore(cv, hero.querySelector('.wrap'));
  const c = cv.getContext('2d'), topo = document.createElement('canvas'), tc = topo.getContext('2d');
  const AMBER = [232, 168, 80], NOON = [214, 242, 246], BASE = [233, 251, 253];
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const m = { x: null, px: -999, py: -999 };
  let W = 0, H = 0, mob = false, ps = [], rnd = null, raf = 0, vis = true, last = 0, frame = 0, s = 0.7;

  const init = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight; mob = W < 768;
    for (const [el, ctx] of [[cv, c], [topo, tc]]) { el.width = W * d; el.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
    ps = Array.from({ length: Math.round(W * H / (mob ? 3400 : 4000)) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: 0.7 + Math.random() * 1.5, v: 0.12 + Math.random() * 0.38, ph: Math.random() * 6.28, ox: 0, oy: 0,
    }));
    rnd = new Float32Array(4000).map(() => Math.random());
  };

  // 等高線（マーチングスクエア）。起伏の式をゆっくり動かす
  const contour = (T) => {
    tc.clearRect(0, 0, W, H);
    const S = 8, nx = Math.ceil(W / S) + 1, ny = Math.ceil(H / S) + 1, f = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = i * S / 260, y = j * S / 260;
      f[j * nx + i] = Math.sin(x * 1.3 + T * 3) * Math.cos(y * 1.7 - T * 2) + 0.6 * Math.sin(x * 2.1 - y * 1.4 + T * 4 + 1.3)
        + 0.35 * Math.cos(x * 3.7 + y * 2.9 - T * 5) + 0.5 * Math.cos(Math.hypot(x - 3.2 - Math.sin(T) * 0.4, y - 0.6) * 2.4 - T * 2);
    }
    const at = (a, b, l) => (l - a) / (b - a);
    for (let L = -2, n = 0; L <= 2; L += 0.2, n++) {
      tc.beginPath();
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = f[j * nx + i], b = f[j * nx + i + 1], d = f[(j + 1) * nx + i], e = f[(j + 1) * nx + i + 1];
        const k = (a > L) | ((b > L) << 1) | ((e > L) << 2) | ((d > L) << 3);
        if (k === 0 || k === 15) continue;
        const x = i * S, y = j * S, p = [];
        if ((a > L) !== (b > L)) p.push([x + S * at(a, b, L), y]);
        if ((b > L) !== (e > L)) p.push([x + S, y + S * at(b, e, L)]);
        if ((d > L) !== (e > L)) p.push([x + S * at(d, e, L), y + S]);
        if ((a > L) !== (d > L)) p.push([x, y + S * at(a, d, L)]);
        tc.moveTo(p[0][0], p[0][1]); tc.lineTo(p[1][0], p[1][1]);
        if (p.length === 4) { tc.moveTo(p[2][0], p[2][1]); tc.lineTo(p[3][0], p[3][1]); }
      }
      const emph = n % 5 === 0;
      tc.strokeStyle = emph ? 'rgba(206,236,240,.3)' : 'rgba(206,236,240,.12)';
      tc.lineWidth = emph ? 1 : 0.7;
      tc.stroke();
    }
  };

  // 日差しの強さ（画面上の位置 0〜1 で判定。少し斜めに傾ける）
  const sun = (x, y) => Math.exp(-((x / W + (y / H - 0.5) * 0.12 - s) ** 2) / 0.02);

  // 真上から見たパネル。帯の右側に、縁がぼける「敷地」として置く
  const panels = (t, col) => {
    const cs = mob ? 4 : 5, mw = cs * 10, mh = cs * 6, gap = 2, aisle = mob ? 8 : 12, tableH = mh * 2 + gap;
    const cx = W * (mob ? 0.86 : 0.75), cy = H * 0.5, ang = -0.16, RC = Math.cos(ang), RS = Math.sin(ang);
    const cols = Math.max(2, Math.floor(W * (mob ? 0.4 : 0.38) / (mw + gap)));
    const rows = Math.max(1, Math.round((H * 1.05 + aisle) / (tableH + aisle)));
    const hw = cols * (mw + gap) / 2, hh = (rows * (tableH + aisle) - aisle) / 2;
    c.save(); c.translate(cx, cy); c.rotate(ang); c.lineWidth = 0.6;
    let ci = 0;
    for (let r = 0; r < rows; r++) for (let mr = 0; mr < 2; mr++) for (let q = 0; q < cols; q++) {
      const x = -hw + q * (mw + gap), y = -hh + r * (tableH + aisle) + mr * (mh + gap), mx = x + mw / 2, my = y + mh / 2;
      const edge = Math.min(1, Math.max(0, (1 - Math.max(Math.abs(mx) / hw, Math.abs(my) / hh)) / 0.3));
      ci += 60;
      if (edge <= 0) continue;
      c.fillStyle = `rgba(8,26,44,${0.38 * edge})`; c.fillRect(x, y, mw, mh);
      c.strokeStyle = `rgba(206,236,240,${0.2 * edge})`; c.strokeRect(x + 0.5, y + 0.5, mw - 1, mh - 1);
      const sx = cx + mx * RC - my * RS, sy = cy + mx * RS + my * RC;
      if (sun(sx, sy) < 0.01 && sun(sx + mw, sy) < 0.01 && sun(sx - mw, sy) < 0.01) continue;
      for (let j = 0; j < 6; j++) for (let i = 0; i < 10; i++) {
        const L = sun(sx + (i - 4.5) * cs * RC, sy + (i - 4.5) * cs * RS);
        if (L < 0.03) continue;
        const sh = 0.55 + 0.45 * Math.sin(t * 0.0011 + rnd[(ci + j * 10 + i) % 4000] * 6.283);
        c.fillStyle = `rgba(${col},${L * sh * (mob ? 0.36 : 0.52) * edge})`;
        c.fillRect(x + i * cs + 0.6, y + j * cs + 0.6, cs - 1.2, cs - 1.2);
      }
    }
    c.restore();
  };

  const draw = (t) => {
    const dt = Math.min(48, t - (last || t)); last = t;
    if (frame++ % 3 === 0) contour(t * 0.000045);
    c.clearRect(0, 0, W, H);
    c.drawImage(topo, 0, 0, W, H);
    // 日差しは約40秒で敷地を横切る。マウスがあればその位置へゆっくり寄せる
    const target = m.x ?? (0.3 + ((t * 0.000022) % 0.9));
    s = Math.abs(target - s) > 0.5 ? target : s + (target - s) * 0.04;
    const k = Math.min(1, Math.max(0, (s - 0.45) / 0.6)), lit = mix(AMBER, NOON, Math.sin(k * Math.PI));
    panels(t, lit.join(','));
    for (const p of ps) {
      if (!reduce) { p.x += p.v * dt * 0.06; p.ph += dt * 0.002; if (p.x > W + 10) { p.x = -10; p.y = Math.random() * H; } }
      const dx = p.x - m.px, dy = p.y - m.py, dd = Math.hypot(dx, dy), push = dd < 110 ? (110 - dd) / 110 : 0;
      p.ox += ((dx / (dd || 1)) * push * 28 - p.ox) * 0.08; p.oy += ((dy / (dd || 1)) * push * 28 - p.oy) * 0.08;
      const x = p.x + p.ox, y = p.y + p.oy + Math.sin(p.ph) * 3, L = sun(x, y);
      const a = (0.3 + 0.5 * x / W) * (0.6 + 0.4 * Math.sin(p.ph)) * (1 + L * 0.6);
      const glow = mix([159, 211, 218], lit, L).join(','), core = mix(BASE, lit, L).join(',');
      c.fillStyle = `rgba(${glow},${a * 0.25})`; c.beginPath(); c.arc(x, y, p.r * 3.2, 0, 6.283); c.fill();
      c.fillStyle = `rgba(${core},${Math.min(1, a)})`; c.beginPath(); c.arc(x, y, p.r, 0, 6.283); c.fill();
    }
    if (!reduce && vis) raf = requestAnimationFrame(draw);
  };
  const start = () => { if (reduce) return; cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(draw); };

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    m.px = e.clientX - r.left; m.py = e.clientY - r.top; m.x = m.px / r.width;
  });
  hero.addEventListener('pointerleave', () => { m.x = null; m.px = m.py = -999; });
  new IntersectionObserver((en) => { vis = en[0].isIntersecting; if (vis) start(); }).observe(hero);
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (hero.clientWidth === W && hero.clientHeight === H) return; init(); frame = 0; if (reduce) draw(0); }, 150); });
  init();
  if (reduce) draw(0); else start();
})();
