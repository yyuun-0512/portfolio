(() => {
  'use strict';

  /* ───────── 1920×1080 아트보드 스케일 (홈과 동일) ───────── */
  const root = document.documentElement;
  function fit() { root.style.setProperty('--scale', Math.min(innerWidth / 1920, innerHeight / 1080)); }
  fit();
  addEventListener('resize', fit);

  const WORKS = window.WORKS;   // js/works-data.js
  const FILTERS = { 'ui-ux': 'UI/UX', branding: 'BRANDING', web: 'WEB', graphic: 'GRAPHIC' };

  const stage = document.getElementById('stage');
  const listEl = document.getElementById('work-list');
  const cardsEl = document.getElementById('work-cards');
  const track = document.getElementById('work-track');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  /* 회전하며 떠오르기: 삼각형 꼭짓점에서 열림 (Web Animations · 전체 구간에 하나의 이징) */
  const CLIP_HIDE = 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)';
  const CLIP_TRI  = 'polygon(100% 0%, 100% 0%, 100% 100%, 0% 100%)';
  const CLIP_FULL = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
  const TURN_FROM = 'translateY(30%) rotateX(-25deg) rotateZ(25deg)';
  const TURN_TO = 'translateY(0%) rotateX(0deg) rotateZ(0deg)';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function spinIn(node, opts = {}) {
    if (reduceMotion.matches || !node.animate) return null;
    return node.animate([
      { clipPath: CLIP_HIDE, transform: TURN_FROM, offset: 0 },
      { clipPath: CLIP_TRI, offset: 0.5 },
      { clipPath: CLIP_FULL, transform: TURN_TO, offset: 1 }
    ], { duration: 1100, easing: 'cubic-bezier(.165, .84, .44, 1)', fill: 'both', ...opts });   // easeOutQuart
  }
  function spinOut(node) {
    if (reduceMotion.matches || !node.animate) return null;
    const cs = getComputedStyle(node);
    const from = { clipPath: cs.clipPath, transform: cs.transform === 'none' ? TURN_TO : cs.transform };
    node.getAnimations().forEach(a => a.cancel());
    return node.animate([
      { ...from, offset: 0 },
      { clipPath: CLIP_TRI, offset: 0.5 },
      { clipPath: CLIP_HIDE, transform: TURN_FROM, offset: 1 }
    ], { duration: 800, easing: 'cubic-bezier(.77, 0, .175, 1)', fill: 'forwards' });           // easeInOutQuart
  }

  // LIST: 줄마다 프로젝트 링크 + 호버하면 옆에 회전하며 떠오르는 사진(미리보기)
  const previewEl = document.getElementById('work-preview');
  const rows = WORKS.map((w, i) => {
    const row = el('li', 'work-row');
    row.style.setProperty('--i', i);
    const a = el('a', 'row-link');
    a.href = 'project.html?id=' + w.no;
    a.dataset.cursor = 'detail-dark';
    a.append(el('span', 'no', w.no), el('span', 'year', w.year), el('span', 'cat', w.cat), el('span', 'title', w.title));
    row.append(a);
    listEl.append(row);
    const pv = el('div', 'preview');
    const pic = el('div', 'pic');
    if (w.img) { const img = el('img'); img.src = w.img; img.alt = ''; pic.append(img); }
    else pic.append(el('span', 'pic-cat', w.cat));
    pv.append(pic);
    previewEl.append(pv);
    row._pv = pv;
    return row;
  });
  // 줄 단위 마스크: 바깥은 잘라내고 안쪽 줄만 위아래로 움직임
  const masked = (cls, text) => { const m = el('span', cls + ' mask'); m.append(el('span', 'line', text)); return m; };
  const cards = WORKS.map((w, i) => {
    // 카드 전체가 프로젝트 링크 (호버하면 커서가 Detail 원으로 바뀜)
    const card = el('a', 'work-card');
    card.href = 'project.html?id=' + w.no;
    card.dataset.cursor = 'detail';
    card.setAttribute('aria-label', w.no + ' ' + w.title + ' — 자세히 보기');
    const label = el('div', 'label');
    label.append(el('span', 'no', w.no), masked('title', w.title));

    // 사진 영역: thumb-move(시차) > thumb(축소) > pic-move(시차) > pic-x > pic-y(젤리 확대) > pic
    const thumbMove = el('div', 'thumb-move');
    const thumb = el('div', 'thumb');
    const picMove = el('div', 'pic-move');
    const picX = el('div', 'pic-x');
    const picY = el('div', 'pic-y');
    const pic = el('div', 'pic');
    pic.setAttribute('role', 'img');
    pic.setAttribute('aria-label', w.title + ' 이미지 자리');
    if (w.img) { const img = el('img'); img.src = w.img; img.alt = ''; pic.append(img); }
    else pic.append(el('span', 'pic-cat', w.cat));
    picY.append(pic); picX.append(picY); picMove.append(picX); thumb.append(picMove); thumbMove.append(thumb);
    // 등장할 때 삼각형 꼭짓점(오른쪽 아래)을 축으로 회전하며 떠오름: thumb-spin(원근 · 삼각형 → 사각형 클립) > thumb-turn(회전)
    const thumbSpin = el('div', 'thumb-spin');
    const thumbTurn = el('div', 'thumb-turn');
    thumbTurn.append(thumbMove); thumbSpin.append(thumbTurn);

    // 사진 아래: 호버하면 연도 · 분류가 줄 단위로 올라옴
    const caption = el('div', 'caption');
    caption.append(masked('no', w.year), masked('title', w.cat));

    card.append(label, thumbSpin, caption);
    card.dataset.cat = w.cat;
    card._parts = { thumbMove, thumb, picMove, thumbTurn };
    track.append(card);
    return card;
  });

  window.outline?.();   // 글자 → 외곽선 (js/outline.js)

  /* ───────── 화면 상태: intro(WORK1) → menu(WORK2) · list · all(+분류) ─────────
     주소의 #으로 상태를 정해서 뒤로가기로도 부드럽게 돌아감 */
  let view = 'intro';
  function stateFromHash() {
    const h = location.hash.slice(1);
    if (h === 'list') return { view: 'list' };
    if (h === 'all') return { view: 'all', cat: null };
    if (FILTERS[h]) return { view: 'all', cat: FILTERS[h] };
    return { view: 'menu' };
  }

  function showCards(cat) {
    const wasAll = view === 'all';
    stage.classList.toggle('is-refilter', wasAll);
    let slot = 0, order = 0;
    cards.forEach(card => {
      const on = !cat || card.dataset.cat === cat;
      card.classList.toggle('is-in', on);
      card.setAttribute('aria-hidden', String(!on));
      if (on) {
        card.style.setProperty('--slot', slot++);
        const fresh = !(wasAll && card.dataset.wasIn);
        const ord = fresh ? order++ : 0;
        card.style.setProperty('--order', ord);
        if (fresh) {
          card._parts.thumbTurn.getAnimations().forEach(a => a.cancel());
          spinIn(card._parts.thumbTurn, { delay: ord * 70 + 300, fill: 'backwards' });   // 끝나면 원래 상태(효과 없음)로
        }
      }
      card.dataset.wasIn = on ? '1' : '';
    });
    count = slot;
    target = 0;   // 분류를 바꾸면 처음 카드로
  }

  function apply(state) {
    if (state.view === 'all') showCards(state.cat);
    else { cards.forEach(c => { c.classList.remove('is-in'); c.dataset.wasIn = ''; }); stage.classList.remove('is-refilter'); }
    view = state.view;
    stage.dataset.view = view;
  }

  addEventListener('hashchange', () => apply(stateFromHash()));
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && view !== 'menu' && !document.getElementById('brand').contains(document.activeElement)) location.hash = 'work';
  });

  /* ───────── ALL: 휠·드래그·방향키로 카드 가로 이동 (감속하며 따라감) ───────── */
  const PITCH = 419, CARD = 377, RIGHT_EDGE = 1880 - 960;  // 마지막 카드가 오른쪽 여백 40px에서 멈춤
  let count = 0, target = 0, offset = 0, last = null, raf = 0;
  const maxOffset = () => Math.max(0, (count - 1) * PITCH + CARD - RIGHT_EDGE);
  const clamp = v => Math.min(maxOffset(), Math.max(0, v));
  const scale = () => parseFloat(getComputedStyle(root).getPropertyValue('--scale')) || 1;

  function step(now) {
    const dt = last == null ? 0.016 : Math.min((now - last) / 1000, 0.1);
    last = now;
    target = clamp(target);
    offset += (target - offset) * (1 - Math.exp(-dt / 0.12));
    track.style.transform = `translateX(${-offset}px)`;
    if (Math.abs(target - offset) > 0.1) raf = requestAnimationFrame(step);
    else { offset = target; track.style.transform = `translateX(${-offset}px)`; raf = 0; last = null; }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };

  addEventListener('wheel', e => {
    if (view !== 'all') return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    target = clamp(target + d / scale());
    kick();
  }, { passive: true });

  let drag = null, dragged = false;
  cardsEl.addEventListener('pointerdown', e => {
    if (view !== 'all') return;
    drag = { x: e.clientX, start: target, id: e.pointerId, moved: false };
  });
  cardsEl.addEventListener('pointermove', e => {
    if (!drag) return;
    // 5px 넘게 끌었을 때만 드래그로 처리 (그냥 누르면 프로젝트로 이동)
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.x) < 5) return;
      drag.moved = true; dragged = true;
      cardsEl.setPointerCapture(drag.id);
    }
    target = clamp(drag.start - (e.clientX - drag.x) / scale());
    kick();
  });
  const endDrag = () => { drag = null; setTimeout(() => { dragged = false; }, 0); };
  // 카드를 누르면: 나머지는 사라지고 누른 카드만 남았다가 프로젝트 페이지로
  cardsEl.addEventListener('click', e => {
    const card = e.target.closest('.work-card');
    if (!card) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) { if (dragged) e.preventDefault(); return; }   // 새 탭 열기는 그대로
    e.preventDefault();
    if (dragged || stage.classList.contains('is-leaving')) return;
    if (reduce.matches) { location.href = card.href; return; }
    card.classList.add('is-chosen');
    stage.classList.add('is-leaving');
    setTimeout(() => { location.href = card.href; }, 650);
  });
  // 뒤로가기로 돌아왔을 때(bfcache) 떠나던 상태 풀기
  addEventListener('pageshow', () => {
    stage.classList.remove('is-leaving');
    cards.forEach(c => c.classList.remove('is-chosen'));
  });
  cardsEl.addEventListener('pointerup', endDrag);
  cardsEl.addEventListener('pointercancel', endDrag);
  addEventListener('keydown', e => {
    if (view !== 'all') return;
    if (e.key === 'ArrowRight') { target = clamp(target + PITCH); kick(); }
    if (e.key === 'ArrowLeft') { target = clamp(target - PITCH); kick(); }
  });
  // 분류가 바뀌어 target이 0이 되면 같이 돌아감
  new MutationObserver(kick).observe(stage, { attributes: true, attributeFilter: ['data-view'] });

  /* ───────── ALL 카드 호버 ─────────
     1) 프로젝트(카드)에 올리면: 나머지 카드는 사진이 흐려지고 제목이 아래로 접혀 사라짐,
        올린 카드는 사진 아래로 연도 · 분류가 줄 단위로 올라옴 (CSS .has-hover / .is-hover)
     2) 사진에 올리면: 사진 틀이 살짝 줄고, 안쪽 사진은 젤리처럼 커지며 포인터 반대 방향으로 미세하게 따라 움직임 */
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const hover = { card: null, media: null };
  function setCardHover(card) {
    if (hover.card === card) return;
    if (hover.card) hover.card.classList.remove('is-hover');
    hover.card = card;
    if (card) card.classList.add('is-hover');
    cardsEl.classList.toggle('has-hover', !!card);
  }

  // 사진 시차를 매 프레임 갱신 (지수 감쇠 ≈ power3.out 0.8초)
  let mediaRaf = 0, mediaLast = null;
  function mediaTick(now) {
    const dt = mediaLast == null ? 0.016 : Math.min((now - mediaLast) / 1000, 0.1);
    mediaLast = now;
    const k = 1 - Math.exp(-dt / 0.18);
    let busy = false;
    cards.forEach(card => {
      const m = card._m;
      if (!m) return;
      m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k;
      card._parts.picMove.style.transform = `translate(${m.x}%, ${m.y}%)`;

      card._parts.thumbMove.style.transform = `translate(${m.x * 0.5}%, ${m.y * 0.5}%)`;
      if (Math.abs(m.tx - m.x) > 0.005 || Math.abs(m.ty - m.y) > 0.005) busy = true;
      else if (m.leaving) card._m = null;
    });
    if (busy) mediaRaf = requestAnimationFrame(mediaTick);
    else { mediaRaf = 0; mediaLast = null; }
  }
  const mediaKick = () => { if (!mediaRaf) mediaRaf = requestAnimationFrame(mediaTick); };

  function mediaEnter(card) {
    hover.media = card;
    card.classList.add('is-media');
    const m = card._m || (card._m = { x: 0, y: 0, tx: 0, ty: 0 });
    m.leaving = false;
    mediaKick();
  }
  function mediaMove(card, e) {
    const m = card._m; if (!m) return;
    const r = card._parts.thumbMove.getBoundingClientRect();
    const J = (Math.min(Math.max(e.clientX - r.left, 0), r.width) / r.width - 0.5) * 2;
    const E = (Math.min(Math.max(e.clientY - r.top, 0), r.height) / r.height - 0.5) * 2;
    m.tx = -J * 2; m.ty = -E * 2;           // 사진: 포인터 반대로 최대 2%, 틀: 그 절반
    mediaKick();
  }
  function mediaLeave(card) {
    if (hover.media === card) hover.media = null;
    card.classList.remove('is-media');
    const m = card._m; if (!m) return;
    m.leaving = true; m.tx = 0; m.ty = 0;
    mediaKick();
  }

  if (finePointer.matches) {
    cards.forEach(card => {
      card.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && view === 'all') setCardHover(card); });
      card.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && hover.card === card) setCardHover(null); });
      const tm = card._parts.thumbMove;
      tm.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && view === 'all' && !reduce.matches) mediaEnter(card); });
      tm.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && hover.media === card && !drag) mediaMove(card, e); });
      tm.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') mediaLeave(card); });
    });
    // 보기를 바꾸면 호버 상태 정리
    new MutationObserver(() => {
      if (view !== 'all') { setCardHover(null); if (hover.media) mediaLeave(hover.media); }
    }).observe(stage, { attributes: true, attributeFilter: ['data-view'] });
  }

  /* ───────── LIST 미리보기 ─────────
     줄에 올리면 그 프로젝트 사진이 목록 왼쪽에서 오른쪽 아래 꼭짓점을 축으로 회전하며 떠오르고(삼각형 → 사각형),
     다른 줄로 옮기면 이전 사진은 회전하며 가라앉음. 세로 위치는 포인터를 감속하며 따라감 */
  let pvActive = null, pvY = null, pvTy = 0, pvRaf = 0, pvLast = null;
  function pvTick(now) {
    const dt = pvLast == null ? 0.016 : Math.min((now - pvLast) / 1000, 0.1);
    pvLast = now;
    pvY += (pvTy - pvY) * (1 - Math.exp(-dt / 0.16));
    previewEl.style.transform = `translateY(${pvY.toFixed(2)}px)`;
    if (Math.abs(pvTy - pvY) > 0.1) pvRaf = requestAnimationFrame(pvTick);
    else { pvRaf = 0; pvLast = null; }
  }
  function pvTarget(clientY) {
    const r = listEl.getBoundingClientRect();
    const y = (clientY - r.top) / scale();                     // 목록 기준 좌표(아트보드 px)
    pvTy = Math.min(Math.max(y - 169, -120), 9 * 63 + 21 - 338 + 120);   // 사진 가운데 = 포인터 높이
    if (pvY == null || !pvActive) { pvY = pvTy; previewEl.style.transform = `translateY(${pvY}px)`; }
    if (!pvRaf) pvRaf = requestAnimationFrame(pvTick);
  }
  function pvShow(row) {
    if (pvActive === row) return;
    if (pvActive) { pvActive._pv.style.zIndex = 0; spinOut(pvActive._pv) || (pvActive._pv.style.opacity = 0); }
    pvActive = row;
    if (row) {
      const pv = row._pv;
      pv.style.zIndex = 1;
      const cs = getComputedStyle(pv);
      const midway = pv.getAnimations().some(a => a.playState === 'running');   // 가라앉는 중이었는지
      pv.getAnimations().forEach(a => a.cancel());
      if (reduceMotion.matches || !pv.animate) { pv.style.clipPath = CLIP_FULL; pv.style.transform = 'none'; pv.style.opacity = 1; }
      else {
        // 가라앉던 중이면 지금 모양에서 이어서 떠오름
        const a = spinIn(pv, { duration: 1500, easing: 'cubic-bezier(.45, .05, .25, 1)', fill: 'forwards' });   // 목록: 삼각형에서 사각형으로 천천히 열림
        if (midway) a.effect.setKeyframes([
          { clipPath: cs.clipPath, transform: cs.transform === 'none' ? TURN_TO : cs.transform, offset: 0 },
          { clipPath: CLIP_FULL, transform: TURN_TO, offset: 1 }
        ]);
      }
    }
  }
  if (finePointer.matches) {
    rows.forEach(row => {
      row.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse' || view !== 'list') return; pvTarget(e.clientY); pvShow(row); });
      row.addEventListener('pointermove', e => { if (pvActive === row) pvTarget(e.clientY); });
    });
    listEl.addEventListener('pointerleave', () => pvShow(null));
    new MutationObserver(() => { if (view !== 'list') pvShow(null); }).observe(stage, { attributes: true, attributeFilter: ['data-view'] });
  }
  // 줄을 누르면 목록이 사라지며 프로젝트로
  listEl.addEventListener('click', e => {
    const a = e.target.closest('.row-link');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (reduce.matches) { location.href = a.href; return; }
    stage.classList.add('is-leaving');
    setTimeout(() => { location.href = a.href; }, 600);
  });

  /* ───────── 시작: 서체 로딩 → WORK1을 잠깐 보여준 뒤 안쪽으로 모임 ───────── */
  const ready = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]) : Promise.resolve();
  ready.then(() => {
    document.body.classList.add('is-ready');
    const first = stateFromHash();
    if (first.view === 'menu') {
      requestAnimationFrame(() => setTimeout(() => apply(first), 700));   // WORK1을 0.7초 보여준 뒤 모임
    } else {
      apply(first);
    }
  });
})();
