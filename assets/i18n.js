/* =========================================================
   言語切り替え（日本語 / English / 简体中文）
   ・ページの日本語をそのまま原文として持ち、英語は下の辞書で差し替える
   ・中国語（簡体字）は本番実装で辞書を追加する想定（デモでは「準備中」）
   ・言語は ?lang=en または前回の選択（localStorage）を引き継ぐ
   ========================================================= */
(function () {
  // 英語の辞書はページ側（暗号化されたHTMLの中）で window.I18N_EN として渡す
  var EN = window.I18N_EN || {};
  var DICT = { en: EN };
  var SUPPORTED = ['ja', 'en'];      // デモで切り替えられる言語
  var PLANNED = ['zh'];              // 本番で追加する言語
  var STORE = 'preview-site-lang';
  var ATTRS = ['aria-label', 'alt', 'title', 'placeholder', 'content'];

  var current = 'ja';
  var touched = [];

  function pick() {
    var q = new URLSearchParams(location.search).get('lang');
    if (SUPPORTED.indexOf(q) >= 0) return q;
    try { var s = localStorage.getItem(STORE); if (SUPPORTED.indexOf(s) >= 0) return s; } catch (e) {}
    return 'ja';
  }

  function restore() {
    for (var i = touched.length - 1; i >= 0; i--) {
      var t = touched[i];
      if (t.type === 'text') t.node.nodeValue = t.orig;
      else if (t.type === 'attr') t.node.setAttribute(t.name, t.orig);
      else if (t.type === 'html') t.node.innerHTML = t.orig;
    }
    touched = [];
  }

  function translate(root) {
    var dict = DICT[current];
    if (!dict) return;
    root = root || document;
    // data-en を持つ要素は中身ごと差し替え（住所など改行を含むもの）
    Array.prototype.forEach.call(root.querySelectorAll('[data-en]'), function (el) {
      touched.push({ type: 'html', node: el, orig: el.innerHTML });
      el.innerHTML = el.getAttribute('data-en');
    });
    // テキスト
    var base = root === document ? document.documentElement : root;
    var walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('[data-i18n-skip],[data-en]')) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var v = n.nodeValue, key = v.trim();
      if (dict[key] == null) return;
      touched.push({ type: 'text', node: n, orig: v });
      n.nodeValue = v.replace(key, dict[key]);
    });
    // 属性（alt・aria-label・meta description など）
    var scope = root === document ? document : root;
    ATTRS.forEach(function (name) {
      Array.prototype.forEach.call(scope.querySelectorAll('[' + name + ']'), function (el) {
        if (el.closest('[data-i18n-skip]')) return;
        if (name === 'content' && el.getAttribute('name') !== 'description') return;
        var v = el.getAttribute(name);
        if (dict[v] == null) return;
        touched.push({ type: 'attr', node: el, name: name, orig: v });
        el.setAttribute(name, dict[v]);
      });
    });
  }

  function syncButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === current));
    });
  }

  function set(lang, opts) {
    if (SUPPORTED.indexOf(lang) < 0) return;
    restore();
    current = lang;
    document.documentElement.lang = lang;
    if (lang !== 'ja') translate(document);
    syncButtons();
    try { localStorage.setItem(STORE, lang); } catch (e) {}
    if (!opts || !opts.silentUrl) {
      var u = new URL(location.href);
      if (lang === 'ja') u.searchParams.delete('lang'); else u.searchParams.set('lang', lang);
      history.replaceState(null, '', u);
    }
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  /* 後から描画した部分（ブログ一覧など）にも現在の言語を当てる */
  function apply(root) { if (current !== 'ja') translate(root); }
  function t(ja) { var d = DICT[current]; return d && d[ja] != null ? d[ja] : ja; }

  var toastTimer;
  function toast(msg) {
    var el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-show'); }, 3200);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]');
    if (!b) return;
    var lang = b.getAttribute('data-lang');
    if (PLANNED.indexOf(lang) >= 0) { toast(t('中国語（簡体字）は本番実装で追加します。デモでは日本語と英語を切り替えられます。')); return; }
    set(lang);
  });

  window.I18N = { set: set, apply: apply, t: t, toast: toast, get lang() { return current; } };
  document.addEventListener('DOMContentLoaded', function () { set(pick(), { silentUrl: true }); });
})();
