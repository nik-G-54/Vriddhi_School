/* =========================================================
   Vriddhi School — interactions & scroll storytelling
   Plain JavaScript, no libraries.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(pointer: fine)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- 1. Intro (once per visit) ---------- */
  var introDone = false;
  function endIntro() {
    if (introDone) return;
    introDone = true;
    var intro = $('#intro');
    root.classList.add('ready');
    if (intro && !root.classList.contains('no-intro')) {
      intro.classList.add('out');
      setTimeout(function () { intro.remove(); }, 1200);
    } else if (intro) { intro.remove(); }
    try { sessionStorage.setItem('vr-intro', '1'); } catch (e) {}
  }
  if (root.classList.contains('no-intro')) {
    requestAnimationFrame(function () { requestAnimationFrame(endIntro); });
  } else {
    var t0 = performance.now();
    var go = function () { setTimeout(endIntro, Math.max(0, 1400 - (performance.now() - t0))); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    setTimeout(endIntro, 3200); // never keep anyone waiting
  }

  /* ---------- 2. Header + mobile menu ---------- */
  var hdr = $('[data-hdr]');
  var mnav = $('[data-mnav]');
  var openBtn = $('[data-menu-open]');
  var closeBtn = $('[data-menu-close]');
  function setMenu(open) {
    mnav.classList.toggle('is-o', open);
    mnav.setAttribute('aria-hidden', open ? 'false' : 'true');
    openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) setTimeout(function () { closeBtn.focus(); }, 300); else openBtn.focus({ preventScroll: true });
  }
  openBtn.addEventListener('click', function () { setMenu(true); });
  closeBtn.addEventListener('click', function () { setMenu(false); });
  $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mnav.classList.contains('is-o')) setMenu(false); });

  /* ---------- 3. Scroll reveals ---------- */
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 4. Day Care clothesline (pinned horizontal scroll) ---------- */
  var daycare = $('#daycare');
  var pin = $('[data-pin]');
  var track = $('[data-track]');
  var view = $('[data-view]');
  var cards = $$('.cl-in', track);
  var pinOn = false, clX = 0, clTarget = 0, clMax = 0, swing = 0, lastX = 0;
  function layoutPin() {
    var want = !reduce && innerWidth > 760 && innerHeight >= 640;
    pinOn = want;
    daycare.classList.toggle('is-pin', want);
    if (want) {
      clMax = Math.max(0, track.scrollWidth - view.clientWidth);
      pin.style.height = (innerHeight + clMax) + 'px';
    } else {
      pin.style.height = '';
      track.style.transform = '';
      clX = clTarget = 0;
    }
  }

  /* ---------- 5. Parallax, tilt, day dial ---------- */
  var speedEls = $$('[data-speed]').map(function (el) {
    return { el: el, speed: parseFloat(el.getAttribute('data-speed')) || 0, y: 0 };
  });
  var dial = $('.dial');
  var clockEl = $('[data-clock]');
  var lastClock = '';

  function onFrame() {
    var vh = innerHeight;
    var sy = scrollY;
    var range = root.scrollHeight - vh;
    var p = range > 0 ? clamp(sy / range, 0, 1) : 0;

    // story progress (sun → moon)
    root.style.setProperty('--vp', p.toFixed(4));
    var mins = 420 + Math.round((p * 780) / 15) * 15;
    var h = Math.floor(mins / 60), m = mins % 60;
    var label = (((h + 11) % 12) + 1) + ':' + (m < 10 ? '0' + m : m) + (h >= 12 ? ' pm' : ' am');
    if (label !== lastClock) { lastClock = label; clockEl.textContent = label; }
    dial.classList.toggle('show', sy > vh * 0.4);
    dial.classList.toggle('is-night', p > 0.86);
    hdr.classList.toggle('is-s', sy > 16);

    if (!reduce) {
      // parallax layers (lerped for a soft, floaty feel)
      for (var i = 0; i < speedEls.length; i++) {
        var o = speedEls[i];
        var host = o.el.parentElement.getBoundingClientRect();
        if (host.bottom < -200 || host.top > vh + 200) continue;
        var target = (host.top + host.height / 2 - vh / 2) * o.speed;
        o.y = lerp(o.y, target, 0.12);
        o.el.style.setProperty('--py', o.y.toFixed(2) + 'px');
      }
      // clothesline
      if (pinOn) {
        var r = pin.getBoundingClientRect();
        var prog = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
        clTarget = -prog * clMax;
        clX = lerp(clX, clTarget, 0.09);
        track.style.transform = 'translate3d(' + clX.toFixed(2) + 'px,0,0)';
        var v = clX - lastX; lastX = clX;
        swing = lerp(swing, clamp(v * 0.35, -9, 9), 0.08);
        for (var c = 0; c < cards.length; c++) cards[c].style.setProperty('--swing', (swing * (1 + (c % 3) * 0.18)).toFixed(2) + 'deg');
      }
    }
    requestAnimationFrame(onFrame);
  }

  // 3D tilt on cards (mouse only)
  if (finePointer && !reduce) {
    $$('[data-tilt]').forEach(function (el) {
      var rx = 0, ry = 0, tx = 0, ty = 0, raf = 0;
      function step() {
        rx = lerp(rx, tx, 0.14); ry = lerp(ry, ty, 0.14);
        el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        if (Math.abs(rx - tx) > 0.02 || Math.abs(ry - ty) > 0.02) raf = requestAnimationFrame(step); else raf = 0;
      }
      el.addEventListener('pointermove', function (e) {
        var b = el.getBoundingClientRect();
        var px = (e.clientX - b.left) / b.width - 0.5;
        var py = (e.clientY - b.top) / b.height - 0.5;
        tx = -py * 12; ty = px * 14;
        if (!raf) raf = requestAnimationFrame(step);
      });
      el.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(step); });
    });
  }

  /* ---------- 6. Testimonials ---------- */
  var bubbles = $$('[data-quotes] .bubble');
  var dotsWrap = $('[data-q-dots]');
  var qi = 0, qPaused = false;
  var dots = bubbles.map(function (_, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Show review ' + (i + 1));
    b.addEventListener('click', function () { qPaused = true; showQ(i); });
    dotsWrap.appendChild(b);
    return b;
  });
  function showQ(i) {
    qi = (i + bubbles.length) % bubbles.length;
    bubbles.forEach(function (b, j) { b.classList.toggle('is-on', j === qi); });
    dots.forEach(function (d, j) { d.setAttribute('aria-current', j === qi ? 'true' : 'false'); });
  }
  showQ(0);
  $('[data-q-prev]').addEventListener('click', function () { qPaused = true; showQ(qi - 1); });
  $('[data-q-next]').addEventListener('click', function () { qPaused = true; showQ(qi + 1); });
  var area = $('.bubble-area');
  area.addEventListener('mouseenter', function () { qPaused = true; });
  area.addEventListener('focusin', function () { qPaused = true; });
  if (!reduce) setInterval(function () { if (!qPaused && !document.hidden) showQ(qi + 1); }, 6500);

  /* ---------- 7. Enquiry form → WhatsApp ---------- */
  var form = $('[data-form]');
  var body = $('[data-form-body]', form);
  var ok = $('[data-form-ok]', form);
  function setErr(name, msg) {
    var p = $('[data-err="' + name + '"]', form);
    var field = form.elements[name];
    if (p) { p.textContent = msg || ''; p.hidden = !msg; }
    if (field) field.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name.value.trim();
    var digits = form.elements.phone.value.replace(/\D/g, '');
    if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
    var prog = form.elements.prog.value;
    var age = form.elements.age.value;
    var bad = false;
    setErr('name', name.length < 2 ? (bad = true, 'Please tell us your name.') : '');
    setErr('phone', digits.length !== 10 ? (bad = true, 'Please enter a 10-digit mobile number.') : '');
    setErr('prog', !prog ? (bad = true, 'Please choose a program.') : '');
    if (bad) { var first = $('[aria-invalid="true"]', form); if (first) first.focus(); return; }
    var msg = 'Hello Vriddhi School! I am ' + name + '. I would like to book a visit for ' + prog +
      (age ? ' (child’s age: ' + age + ')' : '') + '. My number is ' + digits + '.';
    var url = 'https://wa.me/918010114585?text=' + encodeURIComponent(msg);
    $('[data-wa]', form).href = url;
    window.open(url, '_blank', 'noopener');
    body.hidden = true; ok.hidden = false;
  });
  $('[data-again]', form).addEventListener('click', function () {
    form.reset(); ok.hidden = true; body.hidden = false;
    ['name', 'phone', 'prog'].forEach(function (n) { setErr(n, ''); });
  });

  /* ---------- Boot ---------- */
  layoutPin();
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layoutPin, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutPin);
  requestAnimationFrame(onFrame);
})();
