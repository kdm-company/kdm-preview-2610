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
   「土地・発電・エネルギー」を一つの絵にする。
   ・土地：丘の等高線。輪の形がごくゆっくり変わる
   ・発電：南向きの斜面に、等高線に沿ってパネルを段々に並べる（斜面に建つ実際の発電所と同じ並べ方）
   ・日差し：帯を横切り、当たったセルが少しずつずれて光る。色は朝の琥珀→昼の白→夕方の琥珀
   ・エネルギー：光ったセルから粒が生まれ、そのパネル列（＝等高線）に沿って流れて消える
   見出し側（左）は CSS のマスクで消す。画面外では止め、動きを減らす設定では静止画にする */
(() => {
  const hero = document.querySelector('.page-head');
  if (!hero) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'ph-canvas'; cv.setAttribute('aria-hidden', 'true');
  hero.insertBefore(cv, hero.querySelector('.wrap'));
  const c = cv.getContext('2d');
  const AMBER = [232, 168, 80], NOON = [214, 242, 246], TEAL = [159, 211, 218];
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const m = { x: null, px: -999, py: -999 };
  let W = 0, H = 0, mob = false, G = null, rings = [], ps = [], raf = 0, vis = true, last = 0, s = 0.7, T = 0;

  // 丘の形：中心・横長の比率・等高線の間隔
  const init = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight; mob = W < 768;
    cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0);
    G = mob
      ? { cx: W * 0.84, cy: H * 0.26, ex: 1.3, ey: 0.78, step: 13, r0: 14 }
      : { cx: W * 0.76, cy: H * 0.24, ex: 1.6, ey: 0.8, step: 17, r0: 20 };
    const far = Math.hypot(W, H) / Math.min(G.ex, G.ey) * 0.8;
    rings = [];
    for (let k = 0, r = G.r0; r < far; k++, r += G.step) {
      // パネルを置くのは中腹の段（1段おき）。外周は等高線だけ
      const panel = k >= 2 && k % 2 === 0 && r < (mob ? 160 : 240);
      rings.push({ k, r, panel, seed: k * 12.9898 });
    }
    ps = [];
  };

  // 等高線 k の角度 th の位置。輪ごとに少しずつ位相をずらして、自然な起伏にする
  const pos = (ring, th) => {
    const k = ring.k;
    const dd = 0.12 * Math.sin(2 * th + T * 1.0 + k * 0.05) + 0.07 * Math.sin(3 * th - T * 0.7 - k * 0.08) + 0.04 * Math.sin(5 * th + T * 1.3 + k * 0.13);
    const R = ring.r * (1 + dd);
    return [G.cx + R * Math.cos(th) * G.ex, G.cy + R * Math.sin(th) * G.ey];
  };
  const sun = (x, y) => Math.exp(-((x / W + (y / H - 0.5) * 0.12 - s) ** 2) / 0.02);

  const draw = (t) => {
    const dt = Math.min(48, t - (last || t)); last = t;
    T = t * 0.00004;
    c.clearRect(0, 0, W, H);
    const target = m.x ?? (0.35 + ((t * 0.000022) % 0.9));
    s = Math.abs(target - s) > 0.5 ? target : s + (target - s) * 0.04;
    const kk = Math.min(1, Math.max(0, (s - 0.45) / 0.6)), lit = mix(AMBER, NOON, Math.sin(kk * Math.PI)), litS = lit.join(',');

    // 等高線
    for (const ring of rings) {
      const n = Math.max(48, Math.round(ring.r * 0.7));
      c.beginPath();
      for (let i = 0; i <= n; i++) { const p = pos(ring, (i / n) * 6.2832); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
      const emph = ring.k % 5 === 0;
      c.strokeStyle = emph ? 'rgba(206,236,240,.26)' : 'rgba(206,236,240,.11)';
      c.lineWidth = emph ? 0.9 : 0.6;
      c.stroke();
    }

    // パネル：南向き（下側）の斜面だけ、等高線に沿ってセルを並べる。8枚ごとに少し間をあける
    const cl = mob ? 5 : 6, cw = mob ? 4 : 5, gap = 1.2;
    const base = new Path2D();
    for (const ring of rings) {
      if (!ring.panel) continue;
      const rr = ring.r * (G.ex + G.ey) / 2, dth = (cl + gap) / rr;
      let idx = 0;
      for (let th = 0.25; th < Math.PI - 0.25; th += dth, idx++) {
        if (idx % 9 === 8) continue;
        const p = pos(ring, th), q = pos(ring, th + 0.002);
        const a = Math.atan2(q[1] - p[1], q[0] - p[0]), ca = Math.cos(a), sa = Math.sin(a);
        const hx = ca * cl / 2, hy = sa * cl / 2, vx = -sa * cw / 2, vy = ca * cw / 2;
        const quad = (path) => { path.moveTo(p[0] - hx - vx, p[1] - hy - vy); path.lineTo(p[0] + hx - vx, p[1] + hy - vy); path.lineTo(p[0] + hx + vx, p[1] + hy + vy); path.lineTo(p[0] - hx + vx, p[1] - hy + vy); path.closePath(); };
        quad(base);
        const L = sun(p[0], p[1]);
        if (L < 0.03) continue;
        const ph = Math.sin(ring.seed * idx * 0.7) * 43758.5453, rnd = ph - Math.floor(ph);
        const sh = 0.55 + 0.45 * Math.sin(t * 0.0011 + rnd * 6.283);
        c.beginPath(); quad(c);
        c.fillStyle = `rgba(${litS},${L * sh * (mob ? 0.6 : 0.75)})`; c.fill();
        // 光ったセルからエネルギーの粒が生まれる
        if (!reduce && ps.length < (mob ? 28 : 56) && Math.random() < L * sh * dt * 0.00012) {
          ps.push({ ring, th, dir: Math.random() < 0.5 ? -1 : 1, sp: (0.018 + Math.random() * 0.02) / rr, age: 0, life: 3500 + Math.random() * 3000, r: 0.8 + Math.random() * 1.2, col: lit, ox: 0, oy: 0 });
        }
      }
    }
    c.fillStyle = 'rgba(160,210,224,.2)'; c.fill(base);

    // エネルギーの粒：生まれた列に沿って流れ、やがて消える。マウスの近くはよける
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      if (!reduce) { p.age += dt; p.th += p.dir * p.sp * dt; }
      if (p.age > p.life) { ps.splice(i, 1); continue; }
      const [bx, by] = pos(p.ring, p.th);
      const dx = bx - m.px, dy = by - m.py, dd = Math.hypot(dx, dy), push = dd < 100 ? (100 - dd) / 100 : 0;
      p.ox += ((dx / (dd || 1)) * push * 22 - p.ox) * 0.08; p.oy += ((dy / (dd || 1)) * push * 22 - p.oy) * 0.08;
      const x = bx + p.ox, y = by + p.oy;
      const life = Math.min(1, p.age / 500, (p.life - p.age) / 1200);
      const col = mix(TEAL, p.col, Math.max(0.25, 1 - p.age / p.life)).join(',');
      c.fillStyle = `rgba(${col},${life * 0.22})`; c.beginPath(); c.arc(x, y, p.r * 3.4, 0, 6.283); c.fill();
      c.fillStyle = `rgba(255,250,238,${life * 0.9})`; c.beginPath(); c.arc(x, y, p.r, 0, 6.283); c.fill();
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
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (hero.clientWidth === W && hero.clientHeight === H) return; init(); if (reduce) draw(0); }, 150); });
  init();
  if (reduce) draw(0); else start();
})();
