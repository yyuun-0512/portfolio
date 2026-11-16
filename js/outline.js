/* 글자 → 외곽선(SVG) 교체
   AG 최정호 민부리 서체 파일을 웹에 올리지 않기 위해, 사이트에 쓰인 문구를 미리 외곽선 도형으로 만들어 두고
   (js/outline-data.js · tools/outline-build.mjs로 생성) 화면의 글자를 같은 크기의 SVG로 바꿔 넣습니다.
   - 색은 currentColor라 배경 톤·호버 색 전환이 그대로 적용됨
   - 줄 높이 = 글자 크기 × 1.3, 기준선 = 글자 크기 (서체의 ascender 1000 / descender 300 기준)
   - 데이터에 없는 문구는 글자 그대로 둠 (설치된 서체 또는 기본 고딕으로 보임) */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const SKIP = 'script, style, svg, title, .sr-only, [data-no-outline]';

  // 텍스트 노드 → 키 "굵기|크기|자간(em)|문구"
  function keyFor(node) {
    const el = node.parentElement;
    if (!el || el.closest(SKIP)) return null;
    const cs = getComputedStyle(el);
    const pre = cs.whiteSpace.startsWith('pre');
    let text = pre ? node.data : node.data.replace(/\s+/g, ' ').trim();
    if (!text.trim()) return null;
    const size = parseFloat(cs.fontSize);
    const ls = cs.letterSpacing === 'normal' ? 0 : Math.round(parseFloat(cs.letterSpacing) / size * 1000) / 1000;
    const weight = Number(cs.fontWeight) >= 500 ? 500 : 400;
    return `${weight}|${+size.toFixed(2)}|${ls}|${text}`;
  }

  function textNodes(root) {
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }

  // 빌드용: 페이지에 있는 모든 키 목록
  window.outlineKeys = (root = document.body) => [...new Set(textNodes(root).map(keyFor).filter(Boolean))];

  window.outline = (root = document.body) => {
    const data = window.OUTLINES;
    if (!data || /[?&]outline=off/.test(location.search)) return;   // 확인·빌드용: ?outline=off 면 글자 그대로
    textNodes(root).forEach(node => {
      const key = keyFor(node);
      const hit = key && data[key];
      if (!hit) return;
      const size = +key.split('|')[1];
      const h = +(size * 1.3).toFixed(2);
      const [w, d] = hit;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'ol');
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', key.slice(key.indexOf('|', key.indexOf('|', key.indexOf('|') + 1) + 1) + 1));
      svg.style.verticalAlign = `${-(h - size).toFixed(2)}px`;   // SVG 아래끝 = 글자 아래끝 → 기준선이 주변 글자와 일치
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      svg.append(path);
      node.replaceWith(svg);
    });
  };
})();
