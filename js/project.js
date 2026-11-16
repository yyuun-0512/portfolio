(() => {
  'use strict';
  const root = document.documentElement;
  function fit() { root.style.setProperty('--scale', Math.min(innerWidth / 1920, innerHeight / 1080)); }
  fit();
  addEventListener('resize', fit);

  // ?id=01 → 해당 프로젝트 (없으면 01)
  const WORKS = window.WORKS;
  const id = new URLSearchParams(location.search).get('id');
  const i = Math.max(0, WORKS.findIndex(w => w.no === id));
  const w = WORKS[i], next = WORKS[(i + 1) % WORKS.length];
  const $ = s => document.getElementById(s);

  document.title = `${w.title} — Yoonjeong Cho`;
  $('project-no').textContent = w.no;
  $('project-title').textContent = w.title;
  $('project-year').textContent = w.year;
  $('project-cat').textContent = w.cat;
  const pic = $('project-pic');
  pic.setAttribute('aria-label', w.title + ' 이미지 자리');
  if (w.img) { const img = document.createElement('img'); img.src = w.img; img.alt = ''; pic.append(img); }
  const nextLink = $('project-next');
  nextLink.href = 'project.html?id=' + next.no;
  nextLink.querySelector('.line').textContent = `NEXT  ${next.no}`;
  nextLink.setAttribute('aria-label', `다음 프로젝트: ${next.no} ${next.title}`);

  window.outline?.();   // 글자 → 외곽선 (js/outline.js)

  // 페이지를 떠날 때 살짝 흐려지며 이동
  const stage = $('stage');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.project-meta a').forEach(a => a.addEventListener('click', e => {
    if (reduce.matches || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    stage.classList.add('is-leaving');
    setTimeout(() => { location.href = a.href; }, 450);
  }));
  addEventListener('pageshow', () => stage.classList.remove('is-leaving'));

  const ready = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]) : Promise.resolve();
  ready.then(() => {
    document.body.classList.add('is-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-shown')));
  });
})();
