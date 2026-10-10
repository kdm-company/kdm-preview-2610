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
