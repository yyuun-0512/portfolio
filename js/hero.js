(() => {
  'use strict';

  const DATA = window.HERO_LOOP;
  const root = document.documentElement;
  const body = document.body;
  const stageEl = document.getElementById('stage');

  /* ───────── 1920×1080 아트보드 스케일 ───────── */
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    root.style.setProperty('--scale', s);
  }
  fit();
  window.addEventListener('resize', fit);

  /* ───────── 히어로 요소 생성 ───────── */
  const make = (parent, cls, text) => {
    const el = document.createElement(text == null ? 'div' : 'p');
    el.className = cls;
    if (text != null) el.textContent = text;
    parent.appendChild(el);
    return el;
  };
  const linesEl = document.getElementById('hero-lines');
  const dotsEl = document.getElementById('hero-dots');
  const enEl = document.getElementById('hero-en');
  const krEl = document.getElementById('hero-kr');

  const lineNodes = DATA.stages[0].lines.map(() => make(linesEl, 'hero-line'));
  const dotNodes = DATA.dotIds.map(() => make(dotsEl, 'hero-dot'));
  const enNodes = DATA.en.map(t => make(enEl, 'hero-word', t));
  const krNodes = DATA.kr.map((t, i) => {
    const el = make(krEl, 'hero-word', t);
    el.style.fontSize = DATA.krSize[i] + 'px';
    return el;
  });

  /* ───────── 이징 (Figma custom cubic-bezier) ───────── */
  function bezier(t, c) {
    if (!c || t <= 0 || t >= 1) return Math.min(Math.max(t, 0), 1);
    const [x1, y1, x2, y2] = c;
    const sample = (a, b, u) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (sample(x1, x2, mid) < t) lo = mid; else hi = mid;
    }
    return sample(y1, y2, (lo + hi) / 2);
  }
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ───────── 한 프레임 그리기: stage a → b, 진행도 t ───────── */
  function render(a, b, t) {
    lineNodes.forEach((el, i) => {
      const A = a.lines[i], B = b.lines[i];
      const cx = lerp(A[0], B[0], t), cy = lerp(A[1], B[1], t);
      const len = lerp(A[2], B[2], t), rot = lerp(A[3], B[3], t);
      const th = lerp(A[4], B[4], t);
      el.style.width = len + 'px';
      el.style.height = th + 'px';
      el.style.transform = `translate(${cx - len / 2}px, ${cy - th / 2}px) rotate(${rot}deg)`;
      el.style.opacity = lerp(A[5], B[5], t);
    });
    DATA.dotIds.forEach((id, i) => {
      const A = a.dots[id], B = b.dots[id] || A;
      const el = dotNodes[i];
      el.style.transform = `translate(${lerp(A[0], B[0], t)}px, ${lerp(A[1], B[1], t)}px)`;
      el.style.opacity = lerp(A[2], B[2], t);
    });
    const words = (nodes, key) => nodes.forEach((el, i) => {
      const A = a[key][i], B = b[key][i];
      el.style.transform = `translate(${lerp(A[0], B[0], t)}px, ${lerp(A[1], B[1], t)}px)`;
      el.style.opacity = lerp(A[2], B[2], t);
    });
    words(enNodes, 'en');
    words(krNodes, 'kr');
  }

  /* ───────── 8단계 루프 (Stage 08 → 01 반복) ───────── */
  const stages = DATA.stages;
  const cycle = stages.reduce((n, s) => n + s.hold + s.dur, 0);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // 확인용: ?t=3.4 → 루프의 3.4초 지점에서 시작, ?tone=7 → 톤 7로 시작
  const params = new URLSearchParams(location.search);
  let elapsed = Number(params.get('t')) || 0, last = null;
  function frame(now) {
    if (last != null) elapsed += Math.min((now - last) / 1000, 0.1); // 탭 복귀 시 점프 방지
    last = now;

    if (reduceMotion.matches) {
      render(stages[0], stages[0], 0);
    } else {
      let r = elapsed % cycle;
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        if (r < s.hold + s.dur) {
          const p = Math.max(0, (r - s.hold) / s.dur);
          render(s, stages[(i + 1) % stages.length], bezier(p, s.ease));
          break;
        }
        r -= s.hold + s.dur;
      }
    }
    requestAnimationFrame(frame);
  }

  /* ───────── 삼각형 톤 컨트롤 ─────────
     포인터를 따라 점 하나가 연속으로 움직이고, 위치에 따라 배경 밝기가
     흰색 → 회색 → 검정으로 연속 변화. 삼각형 밖에서는 마지막 상태 유지.
     좌표계: 56×56 박스, 삼각형 = 오른쪽 위(56,0) · 왼쪽 아래(0,56) · 오른쪽 아래(56,56) */
  const SIZE = 56;
  const MARK_CX = 50, MARK_CY = 9;            // position-01.svg 안의 원 중심
  const toneEl = document.getElementById('tone');
  const markEl = document.getElementById('tone-mark');

  const inside = (x, y) => x <= SIZE && y <= SIZE && x + y >= SIZE;
  // 어둡기 0(흰색)~1(검정): 아래로 갈수록, 같은 높이에선 오른쪽일수록 어두움.
  // Figma Position 01(흰색, 원 중심 50,9) ~ 10(검정, 49,49) 톤 배열에 맞춘 곡선
  // (예: Position 02 ≈ #e0e0e0, 05 ≈ #909090, 09 ≈ #151515)
  const RAW_WHITE = 0.145, RAW_BLACK = 0.856;
  const darknessAt = (x, y) => {
    const raw = (0.85 * y + 0.15 * (x + y - SIZE)) / SIZE;
    const s = Math.min(1, Math.max(0, (raw - RAW_WHITE) / (RAW_BLACK - RAW_WHITE)));
    return Math.pow(s, 1.6);
  };

  // point = 포인터가 가리키는 목표 위치, dot = 화면의 점 위치(목표를 이징으로 따라감)
  // 참고: 점이 포인터로 순간이동하지 않고, 매번 목표를 다시 잡으며 감속하며 따라붙는 방식
  let point = { x: MARK_CX, y: MARK_CY };   // 기본 = Position 01(흰색)
  let dot = { ...point };
  let current = 0;               // 화면에 적용된 어둡기 (점보다 한 박자 늦게 따라감)
  let dark = null;
  const DOT_TAU = 0.11;          // 점 추종 시간상수(초) ≈ 0.4초 ease-out 느낌
  const BG_TAU = 0.09;           // 배경이 점을 따라가는 추가 지연(초)

  function placeMark() {
    markEl.style.transform = `translate(${dot.x - MARK_CX}px, ${dot.y - MARK_CY}px)`;
  }

  function applyDarkness(d) {
    const v = Math.round(255 * (1 - d));
    root.style.setProperty("--background", `rgb(${v}, ${v}, ${v})`);
    const isDark = d > 0.55;                 // 이 지점부터 글자·아이콘을 흰색으로 (CSS에서 0.7초 전환)
    if (isDark !== dark) {
      dark = isDark;
      root.style.setProperty("--foreground", isDark ? "#ffffff" : "#000000");
      root.style.setProperty("--invert", isDark ? 1 : 0);
    }
    toneEl.setAttribute("aria-valuenow", Math.round(d * 100));
  }

  function setPoint(x, y, save = true) {
    point = { x, y };
    if (save) { try { localStorage.setItem("hero-tone-point", JSON.stringify(point)); } catch (e) { /* noop */ } }
  }

  function localPoint(evt) {
    const r = toneEl.getBoundingClientRect();
    return [(evt.clientX - r.left) / r.width * SIZE, (evt.clientY - r.top) / r.height * SIZE];
  }

  function onMove(evt) {
    const [x, y] = localPoint(evt);
    if (inside(x, y)) setPoint(x, y);
  }
  toneEl.addEventListener("pointermove", onMove);
  toneEl.addEventListener("pointerdown", e => {
    onMove(e);
    if (e.pointerType !== "mouse") toneEl.setPointerCapture(e.pointerId); // 터치로 드래그
  });
  // 호버하면 삼각형과 점이 살짝 커짐 (CSS .tone.is-hover)
  toneEl.addEventListener("pointerenter", () => toneEl.classList.add("is-hover"));
  toneEl.addEventListener("pointerleave", () => toneEl.classList.remove("is-hover"));

  // 키보드: 방향키로 점 이동 (삼각형 안에서만)
  toneEl.addEventListener("keydown", e => {
    const step = e.shiftKey ? 8 : 2;
    const d = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[e.key];
    if (!d) return;
    e.preventDefault();
    let x = Math.min(SIZE, Math.max(0, point.x + d[0]));
    let y = Math.min(SIZE, Math.max(0, point.y + d[1]));
    if (x + y < SIZE) { if (d[0]) y = SIZE - x; else x = SIZE - y; }  // 빗변에 붙여 이동
    setPoint(x, y);
  });

  // 매 프레임: 점 → 포인터, 배경 → 점 위치의 밝기 (둘 다 지수 감쇠, 방향을 바꿔도 현재 값에서 이어짐)
  let toneLast = null;
  function toneFrame(now) {
    const dt = toneLast == null ? 0 : Math.min((now - toneLast) / 1000, 0.1);
    toneLast = now;
    const instant = reduceMotion.matches;
    const kDot = instant ? 1 : 1 - Math.exp(-dt / DOT_TAU);
    const kBg = instant ? 1 : 1 - Math.exp(-dt / BG_TAU);
    const dx = point.x - dot.x, dy = point.y - dot.y;
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      dot.x += dx * kDot; dot.y += dy * kDot;
      placeMark();
    }
    const target = darknessAt(dot.x, dot.y);
    if (Math.abs(target - current) > 0.0005) {
      current += (target - current) * kBg;
      applyDarkness(current);
    }
    requestAnimationFrame(toneFrame);
  }

  // 초기 상태: 저장된 위치 → ?tone=0~1 (확인용) → 기본(흰색)
  try {
    const p = JSON.parse(localStorage.getItem("hero-tone-point") || "null");
    if (p && inside(p.x, p.y)) point = p;
  } catch (e) { /* noop */ }
  const qTone = parseFloat(params.get("tone"));
  if (qTone >= 0 && qTone <= 1) point = { x: 50, y: 9 + 40 * qTone };
  dot = { ...point };
  placeMark();
  current = darknessAt(dot.x, dot.y);
  applyDarkness(current);
  requestAnimationFrame(toneFrame);

  /* ───────── 서체 로딩 후 시작 (대체 서체로 잠깐 보이는 것 방지) ───────── */
  render(stages[0], stages[0], 0);
  window.outline?.();   // 글자 → 외곽선 (js/outline.js)
  const start = () => { body.classList.add('is-ready'); requestAnimationFrame(frame); };
  (document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]) : Promise.resolve()).then(start);
})();
