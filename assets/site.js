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
      const label = burger.querySelector('.burger__label');
      if (label) label.textContent = open ? 'CLOSE' : 'MENU';
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

/* 下層ページの見出し帯：エネルギーの粒
   漂う光（CSS）の上に、ゆっくり右へ流れる光の粒を重ねる。
   ・粒は遠・中・近の3つの奥行き。遠いほど小さく淡く、近いほど大きくやわらかくぼける
   ・まっすぐではなく、ゆるやかな気流に乗って波打ちながら進む。速さは気づかない程度に抑える
   ・ときどき混じる太陽色の粒は、短い光の尾を引く
   ・マウスを近づけると、粒がゆっくりよける
   見出し側（左）は CSS のマスクで消す。画面外では止め、動きを減らす設定では静止画にする */
(() => {
  const hero = document.querySelector('.page-head');
  if (!hero) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'ph-canvas'; cv.setAttribute('aria-hidden', 'true');
  hero.insertBefore(cv, hero.querySelector('.wrap'));
  const c = cv.getContext('2d');
  const m = { px: -999, py: -999 };
  let W = 0, H = 0, ps = [], raf = 0, vis = true, last = 0;

  const spawn = (anywhere) => {
    const z = Math.random() < 0.55 ? 0.25 + Math.random() * 0.25 : Math.random() < 0.75 ? 0.55 + Math.random() * 0.25 : 0.85 + Math.random() * 0.15;
    return { x: anywhere ? Math.random() * W : -20, y: Math.random() * H, z, r: 0.5 + z * 1.7, v: 0.004 + z * 0.009, ph: Math.random() * 6.28, sun: Math.random() < 0.07, ox: 0, oy: 0, tr: [] };
  };
  const init = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0);
    ps = Array.from({ length: Math.round(W * H / (W < 768 ? 2600 : 2400)) }, () => spawn(true));
  };

  const draw = (t) => {
    const dt = reduce ? 0 : Math.min(48, t - (last || t)); last = t;
    c.clearRect(0, 0, W, H);
    const T = t * 0.00004;
    for (const p of ps) {
      const vy = (Math.sin(p.x * 0.0045 + T * 2 + p.y * 0.006) + 0.5 * Math.sin(p.x * 0.011 - T * 3)) * 0.004 * p.z;
      p.x += p.v * dt; p.y += vy * dt; p.ph += dt * 0.0006;
      if (p.x > W + 20 || p.y < -20 || p.y > H + 20) { Object.assign(p, spawn(false)); continue; }
      const dx = p.x - m.px, dy = p.y - m.py, dd = Math.hypot(dx, dy), push = dd < 120 ? (1 - dd / 120) ** 2 : 0;
      p.ox += ((dx / (dd || 1)) * push * 34 * p.z - p.ox) * 0.03; p.oy += ((dy / (dd || 1)) * push * 34 * p.z - p.oy) * 0.03;
      const x = p.x + p.ox, y = p.y + p.oy;
      const a = (0.25 + 0.75 * Math.min(1, x / W * 1.4)) * (0.55 + 0.45 * Math.sin(p.ph)) * (0.35 + 0.65 * p.z);
      if (p.sun) {
        p.tr.push([x, y]); if (p.tr.length > 40) p.tr.shift();
        if (p.tr.length > 2) {
          c.beginPath(); c.moveTo(p.tr[0][0], p.tr[0][1]); for (const q of p.tr) c.lineTo(q[0], q[1]);
          const g = c.createLinearGradient(p.tr[0][0], p.tr[0][1], x, y);
          g.addColorStop(0, 'rgba(232,162,58,0)'); g.addColorStop(1, `rgba(240,180,90,${a * 0.6})`);
          c.strokeStyle = g; c.lineWidth = p.r * 0.9; c.lineCap = 'round'; c.stroke();
        }
      }
      const col = p.sun ? '240,180,90' : '170,222,230';
      if (p.z > 0.85) { // 手前の粒はやわらかくぼかす
        const g = c.createRadialGradient(x, y, 0, x, y, p.r * 3.4);
        g.addColorStop(0, `rgba(${col},${a * 0.45})`); g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(x, y, p.r * 3.4, 0, 6.283); c.fill();
      } else {
        c.fillStyle = `rgba(${col},${a * 0.22})`; c.beginPath(); c.arc(x, y, p.r * 2.8, 0, 6.283); c.fill();
        c.fillStyle = `rgba(${p.sun ? '255,226,170' : '236,250,252'},${Math.min(1, a * 1.3)})`; c.beginPath(); c.arc(x, y, p.r * 0.75, 0, 6.283); c.fill();
      }
    }
    if (!reduce && vis) raf = requestAnimationFrame(draw);
  };
  const start = () => { if (reduce) return; cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(draw); };

  hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); m.px = e.clientX - r.left; m.py = e.clientY - r.top; });
  hero.addEventListener('pointerleave', () => { m.px = m.py = -999; });
  new IntersectionObserver((en) => { vis = en[0].isIntersecting; if (vis) start(); }).observe(hero);
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (hero.clientWidth === W && hero.clientHeight === H) return; init(); if (reduce) draw(0); }, 150); });
  init();
  if (reduce) draw(0); else start();
})();
