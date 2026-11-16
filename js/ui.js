(() => {
  'use strict';

  /* ───────── 로고 호버 → HOME · WORK · ABOUT ───────── */
  const brand = document.getElementById('brand');
  const logo = document.getElementById('logo');
  let closeTimer = null;

  function setOpen(open) {
    clearTimeout(closeTimer);
    brand.classList.toggle('is-open', open);
    logo.setAttribute('aria-expanded', String(open));
  }
  // 로고에 올리면 열림 → 로고·메뉴 영역에 있는 동안 유지 → 벗어나면 잠시 뒤 닫힘
  logo.addEventListener('pointerenter', () => setOpen(true));
  brand.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  brand.addEventListener('pointerleave', () => {
    closeTimer = setTimeout(() => setOpen(false), 300);
  });
  // 키보드: 로고나 메뉴에 포커스가 있으면 열림
  brand.addEventListener('focusin', () => setOpen(true));
  brand.addEventListener('focusout', e => { if (!brand.contains(e.relatedTarget)) setOpen(false); });
  brand.addEventListener('keydown', e => { if (e.key === 'Escape') { setOpen(false); logo.focus(); } });
  logo.addEventListener('click', e => {
    // 터치에서는 탭으로 열고 닫기
    if (!matchMedia('(hover: hover)').matches) { e.preventDefault(); setOpen(!brand.classList.contains('is-open')); }
  });

  /* ───────── 커스텀 마우스 포인터 ───────── */
  const cursor = document.getElementById('cursor');
  const cursorLine = document.getElementById('cursor-line');
  const parts = [cursor, cursorLine];
  const toggle = (cls, on) => parts.forEach(el => el.classList.toggle(cls, on));
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  if (!finePointer.matches) return;
  document.documentElement.classList.add('has-cursor');

  // 포인터(tx,ty)를 화면의 점(x,y)이 짧게 감속하며 따라감 → 딱딱하게 붙지 않고 자연스럽게
  const TAU = 0.045;   // 시간상수(초): 작을수록 바로 붙음
  let tx = -100, ty = -100, x = -100, y = -100, last = null, running = false, first = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  function tick(now) {
    const dt = last == null ? 0 : Math.min((now - last) / 1000, 0.1);
    last = now;
    const k = reduce.matches ? 1 : 1 - Math.exp(-dt / TAU);
    x += (tx - x) * k; y += (ty - y) * k;
    parts.forEach(el => { el.style.transform = `translate(${x}px, ${y}px)`; });
    trailAdd(x, y, now);
    if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) requestAnimationFrame(tick);
    else { running = false; last = null; }
  }

  // 포인터 아래 요소에 따라 모양 결정: 프로젝트(data-cursor="detail") → Detail 원 · 링크 → 삼각형 · 톤 → 작은 점
  function shapeFor(t) {
    const d = t?.closest('[data-cursor^="detail"]');
    const detail = !!d;
    toggle('is-detail', detail);
    toggle('is-detail-dark', d?.dataset.cursor === 'detail-dark');   // 밝은 바탕(목록·글자 링크)에서는 검은 원
    toggle('is-link', !detail && !!t?.closest('a, button'));
    toggle('is-tone', !!t?.closest('.tone'));
  }

  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (first) { x = tx; y = ty; first = false; trailBreak(); }   // 처음 나타날 때는 제자리에서
    toggle('is-visible', true);
    shapeFor(e.target instanceof Element ? e.target : null);
    if (!running) { running = true; requestAnimationFrame(tick); }
  }, { passive: true });

  /* ───────── 커서 궤적 ─────────
     · 선: 최근 0.4초 동안 지나온 길을 1px 선으로, 오래된 쪽부터 흐려짐
     · 점: 빠르게 움직일 때만 일정 간격(36px)마다 3px 네모 점을 떨어뜨리고 0.9초에 걸쳐 사라짐
     색은 현재 글자색(--foreground)을 따라감 → 배경 톤이 바뀌어도 자연스럽게 맞춰짐 */
  const canvas = document.getElementById('cursor-trail');
  const ctx = canvas.getContext('2d');
  const LINE_LIFE = 400, DOT_LIFE = 900, DOT_GAP = 36, DOT_MIN_SPEED = 0.6; // ms, ms, px, px/ms
  let line = [], dots = [], travelled = 0, prev = null, trailRunning = false, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  }
  resize();
  window.addEventListener('resize', resize);

  function trailBreak() { prev = null; line.push(null); }

  function trailAdd(px, py, now) {
    if (reduce.matches) return;
    if (prev) {
      const d = Math.hypot(px - prev.x, py - prev.y);
      if (d < 0.5) return;
      const speed = d / Math.max(now - prev.t, 1);
      travelled += d;
      if (travelled >= DOT_GAP) {
        travelled = 0;
        if (speed > DOT_MIN_SPEED && !cursor.classList.contains('is-tone') && !cursor.classList.contains('is-detail')) dots.push({ x: px, y: py, t: now });
      }
    }
    prev = { x: px, y: py, t: now };
    line.push(prev);
    if (!trailRunning) { trailRunning = true; requestAnimationFrame(trailFrame); }
  }

  function trailFrame(now) {
    // 수명이 끝난 점·선 정리
    while (line.length && (line[0] === null || now - line[0].t > LINE_LIFE)) line.shift();
    dots = dots.filter(d => now - d.t < DOT_LIFE);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = ctx.strokeStyle = getComputedStyle(document.body).color;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      if (!a || !b) continue;
      const life = 1 - (now - b.t) / LINE_LIFE;            // 1(방금) → 0(사라짐)
      if (life <= 0) continue;
      ctx.globalAlpha = 0.55 * life * life;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const d of dots) {
      const life = 1 - (now - d.t) / DOT_LIFE;
      ctx.globalAlpha = 0.7 * life;
      const s = 3 * (0.6 + 0.4 * life);                    // 사라지며 살짝 작아짐
      ctx.fillRect(d.x - s / 2, d.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;

    if (line.length || dots.length) requestAnimationFrame(trailFrame);
    else { trailRunning = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  // 화면이 바뀌어 포인터 아래 요소가 달라지면(WORK 보기 전환 등) 커서 모양을 다시 맞춤
  window.addEventListener('hashchange', () => setTimeout(() => {
    shapeFor(document.elementFromPoint(tx, ty));
  }, 700));

  window.addEventListener('pointerdown', () => toggle('is-down', true));
  window.addEventListener('pointerup', () => toggle('is-down', false));
  document.documentElement.addEventListener('pointerleave', () => { toggle('is-visible', false); first = true; });
  window.addEventListener('blur', () => toggle('is-visible', false));
})();
