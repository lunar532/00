// 지하 이동 전환(갱도 엘리베이터)과 도트 생존자 아바타.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const page = document.body.dataset.page || 'index';

  /* ================= 갱도 엘리베이터 전환 ================= */
  // 페이지마다 깊이가 있어서, 더 깊은 곳으로 가면 내려가고 얕은 곳으로 가면 올라가요.
  const DEPTH = {
    account: [40, '계정'], map: [20, '지도'], index: [120, '홈'],
    viewer: [180, '3D 뷰어'], board: [240, '게시판'], refs: [310, '참고자료'],
  };
  const pageOfPath = path => {
    const f = (path.split('/').pop() || 'index.html').replace(/\.html$/, '');
    return DEPTH[f] ? f : 'index';
  };

  function buildShaft(dir, dest) {
    const el = document.createElement('div');
    el.className = 'shaft ' + dir;
    el.style.clipPath = dir === 'down' ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="strata"></div>
      <div class="rail l"></div><div class="rail r"></div>
      <div class="readout"><span class="arrow">${dir === 'down' ? '▼' : '▲'}</span><b class="depth"></b><span class="dest">${dest}</span></div>`;
    document.body.append(el);
    return el;
  }
  // 덮개 움직임: clip-path의 위/아래 % 값을 직접 움직여요.
  function clipTo(el, from, to, ms, done) {
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / ms);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const top = from[0] + (to[0] - from[0]) * e, bot = from[1] + (to[1] - from[1]) * e;
      el.style.clipPath = `inset(${top}% 0 ${bot}% 0)`;
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    })(t0);
  }
  function countDepth(el, from, to, ms) {
    const d = el.querySelector('.depth');
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      d.textContent = '-' + Math.round(from + (to - from) * e) + ' m';
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // 도착: 이전 페이지에서 남긴 표시가 있으면 이어서 연출
  let arrive = null;
  try { arrive = JSON.parse(sessionStorage.getItem('ul-arrive') || 'null'); sessionStorage.removeItem('ul-arrive'); } catch (e) {}
  if (!reduce && arrive && Date.now() - arrive.t < 4000 && DEPTH[arrive.to]) {
    const [fromD] = DEPTH[arrive.from] || DEPTH.index;
    const [toD, label] = DEPTH[arrive.to];
    const el = buildShaft(arrive.dir, label);
    el.style.clipPath = 'inset(0 0 0 0)';
    countDepth(el, (fromD + toD) / 2, toD, 420);
    // 내려왔으면 덮개가 위로, 올라왔으면 아래로 빠져요
    setTimeout(() => clipTo(el, [0, 0], arrive.dir === 'down' ? [0, 100] : [100, 0], 380, () => el.remove()), 430);
  }
  addEventListener('pageshow', e => { if (e.persisted) document.querySelectorAll('.shaft').forEach(x => x.remove()); });

  // 떠나기: 사이트 안 링크를 누르면 엘리베이터를 타고 이동
  const tri = document.body.dataset.layout === 'tri';
  document.addEventListener('click', e => {
    if (tri || reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const from = page, to = pageOfPath(url.pathname);
    if (from === to) return;
    e.preventDefault();
    const [fromD] = DEPTH[from] || DEPTH.index;
    const [toD, label] = DEPTH[to];
    const dir = toD >= fromD ? 'down' : 'up';
    const el = buildShaft(dir, label);
    el.style.pointerEvents = 'auto';
    clipTo(el, dir === 'down' ? [100, 0] : [0, 100], [0, 0], 340);
    countDepth(el, fromD, (fromD + toD) / 2, 620);
    try { sessionStorage.setItem('ul-arrive', JSON.stringify({ from, to, dir, t: Date.now() })); } catch (err) {}
    setTimeout(() => { location.href = url.href; }, 640);
  });

  /* ================= 도트 생존자 ================= */
  if (page === 'viewer' || page === 'map' || tri) return;

  let off = false;
  try { off = localStorage.getItem('ul-survivor') === 'off'; } catch (e) {}

  const LW = 44, LH = 34;            // 도트 캔버스 크기 (논리 픽셀)
  const BX = 18, BY0 = 4;            // 몸 기준점
  const scale = innerWidth < 600 ? 2.5 : 3;

  const C = {
    K: '#17110d', S: '#d9a27c', s: '#a9714f', H: '#2a1a12', h: '#5a3a26',
    L: '#fff1b8', B: '#2f7bff', b: '#1b4cb8', P: '#5b4a38', p: '#3b3026', O: '#2a211c',
    D: '#6e4a2f', d: '#8a6040', E: '#120c09', M: '#a9b3c7', T: '#7a5232', W: '#ffffff', m: '#8a4a3a', G: '#c9a24a',
  };

  const wrap = document.createElement('div');
  wrap.className = 'survivor';
  wrap.innerHTML = '<div class="beam"></div><div class="bubble" hidden></div>';
  const cv = document.createElement('canvas');
  cv.width = LW; cv.height = LH;
  cv.style.width = LW * scale + 'px'; cv.style.height = LH * scale + 'px';
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', '지하 생존자. 누르면 말을 걸어요.');
  cv.tabIndex = 0;
  wrap.append(cv);
  document.body.append(wrap);
  const beam = wrap.querySelector('.beam');
  const bubble = wrap.querySelector('.bubble');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 숨기기/보이기 버튼 (바닥글)
  const footer = document.getElementById('site-footer');
  if (footer) {
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'btn small ghost survivor-toggle';
    const label = () => { t.textContent = off ? '생존자 보이기' : '생존자 숨기기'; };
    label();
    t.addEventListener('click', () => {
      off = !off; wrap.hidden = off; label();
      try { localStorage.setItem('ul-survivor', off ? 'off' : 'on'); } catch (e) {}
    });
    footer.append(' ', t);
  }
  wrap.hidden = off;

  // 상태
  let x = Math.max(16, innerWidth * 0.08);
  let face = 1;                       // 1 = 오른쪽, -1 = 왼쪽
  let state = 'walk', stateT = 4, animT = 0, frame = 0, bob = 0;
  let blinkT = 2.5, blinking = 0, shineT = 0, lastStrike = -1;
  const parts = [];                   // 땀방울, 불꽃, 흙먼지

  const LINES = [
    '흙 냄새 좋다.', '이 아래에 사파이어 광맥이 있어.', '땀이 비 오듯 하네.',
    '산소 수치 정상.', '같이 더 파 볼래?', '램프 배터리 아직 괜찮아.', '지상은 아직 잿빛이래.',
  ];

  function R(px, py, w, h, c) {
    const X = face > 0 ? BX + px : LW - (BX + px) - w;
    ctx.fillStyle = C[c] || c;
    ctx.fillRect(X, BY0 + bob + py, w, h);
  }
  function line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) R(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1, c);
  }
  function pickaxe(hx, hy, angle) {
    // 손잡이 끝(hx,hy)에서 angle 방향으로 손잡이, 끝에 쇠머리
    const len = 9, dx = Math.cos(angle), dy = Math.sin(angle);
    const ex = hx + dx * len, ey = hy + dy * len;
    line(hx, hy, Math.round(ex), Math.round(ey), 'T');
    const px = -dy, py = dx; // 수직 방향
    line(Math.round(ex - px * 3), Math.round(ey - py * 3), Math.round(ex + px * 3), Math.round(ey + py * 3), 'M');
    R(Math.round(ex + px * 3), Math.round(ey + py * 3), 1, 1, 'W');
    return [ex + px * 3, ey + py * 3];
  }

  function draw() {
    ctx.clearRect(0, 0, LW, LH);
    const walking = state === 'walk';
    const f = frame % 4;
    const legB = walking ? [0, -1, 0, 1][f] : 0, legF = walking ? [0, 1, 0, -1][f] : 0;
    const armSw = walking ? [0, 1, 0, -1][f] : 0;
    const sway = walking ? [0, 1, 0, 1][f] : (Math.sin(animT * 2) > 0 ? 1 : 0);

    // 포니테일 (뒤쪽)
    R(-2, 2 + sway, 2, 3, 'H'); R(-3, 4 + sway, 1, 3, 'H'); R(-2, 3 + sway, 1, 1, 'h');
    // 뒤쪽 팔
    R(-1 - armSw, 10, 2, 6, 's'); R(-1 - armSw, 13, 1, 1, 'D');
    // 등에 멘 곡괭이 (걷기·쉬기)
    if (state === 'walk' || state === 'idle') { line(-1, 17, 4, 7, 'T'); line(2, 6, 6, 9, 'M'); }
    // 뒤쪽 다리
    R(1 + legB, 19, 2, 6, 's'); R(1 + legB, 22, 1, 1, 'D');
    R(0 + legB, 25, 3, 2, 'O'); R(0 + legB, 27, 4, 1, 'K');
    // 몸통: 어깨, 비키니 상의, 허리
    R(0, 9, 7, 1, 'S'); R(0, 9, 1, 1, 'D');
    R(1, 9, 1, 1, 'b'); R(5, 9, 1, 1, 'b');
    R(0, 10, 7, 3, 'B'); R(0, 12, 7, 1, 'b'); R(3, 11, 1, 1, 'b');
    R(1, 13, 5, 3, 'S'); R(1, 13, 1, 3, 's'); R(3, 15, 1, 1, 's');
    R(4, 14, 1, 1, 'D'); R(2, 14, 1, 1, 'd');
    // 반바지 + 벨트
    R(0, 16, 7, 3, 'P'); R(0, 16, 7, 1, 'K'); R(3, 16, 1, 1, 'G'); R(0, 18, 7, 1, 'p'); R(5, 17, 1, 1, 'D');
    // 앞쪽 다리
    R(4 + legF, 19, 2, 6, 'S'); R(4 + legF, 19, 1, 6, 's'); R(5 + legF, 23, 1, 1, 'D');
    R(4 + legF, 25, 3, 2, 'O'); R(4 + legF, 27, 4, 1, 'K');
    // 목, 머리
    R(2, 8, 3, 1, 's');
    R(0, 0, 7, 2, 'H'); R(0, 2, 1, 4, 'H'); R(1, 1, 3, 1, 'h');
    R(1, 3, 6, 5, 'S'); R(1, 7, 1, 1, 's'); R(6, 3, 1, 2, 'H');
    R(0, 2, 7, 1, 'K'); R(6, 1, 2, 2, 'L');                    // 헤드램프
    if (blinking > 0) { R(3, 4, 1, 1, 's'); R(5, 4, 1, 1, 's'); }
    else { R(3, 4, 1, 1, 'E'); R(5, 4, 1, 1, 'E'); }
    R(5, 6, 1, 1, 'm'); R(2, 6, 1, 1, 'D'); R(4, 3, 1, 1, 'd');  // 입, 흙 묻은 뺨·이마

    // 앞쪽 팔과 손에 든 곡괭이
    if (state === 'dig') {
      const k = frame % 4;
      if (k === 0) { R(6, 4, 2, 6, 'S'); pickaxe(7, 4, -2.2); }
      else if (k === 1) { R(6, 9, 4, 2, 'S'); pickaxe(9, 9, -0.7); }
      else { R(6, 11, 3, 2, 'S'); const tip = pickaxe(8, 12, 0.6); if (k === 2 && lastStrike !== frame) { lastStrike = frame; burst(tip); } }
    } else if (state === 'wipe') {
      R(5, 4, 2, 6, 'S'); R(5, 3, 2, 1, 'S');
    } else if (state === 'wave') {
      const up = frame % 2;
      R(6, up ? 1 : 3, 2, 7, 'S'); R(7, up ? 0 : 2, 1, 1, 'S');
    } else {
      R(6 + armSw, 10, 2, 6, 'S'); R(7 + armSw, 12, 1, 1, 'D');
    }

    // 피부에 맺힌 땀 반짝임
    if (shineT > 0) { R(1, 9, 1, 1, 'W'); R(4, 13, 1, 1, 'W'); R(2, 5, 1, 1, 'W'); }

    // 파티클
    parts.forEach(p => { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); });
  }

  function screenX(px) { return face > 0 ? BX + px : LW - (BX + px) - 1; }
  function sweat() {
    parts.push({ x: screenX(2), y: BY0 + bob + 4, vx: face * -0.05, vy: 0.1, c: '#bfe0ff', life: 1.6, g: 0.06 });
  }
  function burst(tip) {
    const tx = screenX(Math.round(tip[0])), ty = BY0 + bob + Math.round(tip[1]);
    for (let i = 0; i < 6; i++) parts.push({ x: tx, y: ty, vx: face * (0.3 + Math.random() * 0.9), vy: -0.6 - Math.random() * 0.8, c: i % 2 ? '#ffd27a' : '#ff9a4a', life: 0.6, g: 0.08 });
    for (let i = 0; i < 4; i++) parts.push({ x: tx, y: ty, vx: face * Math.random() * 0.6, vy: -0.3 - Math.random() * 0.4, c: '#7a5a40', life: 1, g: 0.05 });
  }

  function say(text) {
    bubble.textContent = text; bubble.hidden = false;
    clearTimeout(say.t); say.t = setTimeout(() => { bubble.hidden = true; }, 2600);
  }

  function pick() {
    const r = Math.random();
    if (r < 0.45) { state = 'walk'; stateT = 3 + Math.random() * 5; if (Math.random() < 0.5) face = -face; }
    else if (r < 0.7) { state = 'dig'; stateT = 2.4 + Math.random() * 2.5; }
    else if (r < 0.85) { state = 'wipe'; stateT = 1.4; for (let i = 0; i < 3; i++) setTimeout(sweat, i * 300); }
    else { state = 'idle'; stateT = 1.5 + Math.random() * 2; }
    frame = 0;
  }

  function place() {
    const w = LW * scale;
    const maxX = innerWidth - w - 8;
    if (x > maxX) { x = maxX; face = -1; }
    if (x < 8) { x = 8; face = 1; }
    wrap.style.transform = `translateX(${x}px)`;
    beam.classList.toggle('left', face < 0);
    beam.classList.toggle('down', state === 'dig');
  }

  cv.addEventListener('click', () => { state = 'wave'; stateT = 1.6; frame = 0; say(LINES[Math.floor(Math.random() * LINES.length)]); });
  cv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cv.click(); } });

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!off && !document.hidden) {
      animT += dt; stateT -= dt;
      const fps = state === 'walk' ? 8 : state === 'dig' ? 6 : 4;
      frame = Math.floor(animT * fps);
      bob = state === 'walk' ? ([0, -1, 0, -1][frame % 4]) : (state === 'idle' && Math.floor(animT * 1.2) % 2 ? -1 : 0);
      if (state === 'walk') x += face * 26 * dt * scale / 3;
      blinkT -= dt; if (blinkT < 0) { blinking = 0.14; blinkT = 2 + Math.random() * 3; }
      if (blinking > 0) blinking -= dt;
      shineT = (animT % 2.2) < 0.25 ? 1 : 0;
      if (state === 'dig' && Math.random() < dt * 0.6) sweat();
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life -= dt;
        if (p.life <= 0 || p.y > LH) parts.splice(i, 1);
      }
      if (stateT <= 0) pick();
      place();
      draw();
    }
    if (!reduce) requestAnimationFrame(tick);
  }
  addEventListener('resize', place);
  place(); draw();
  if (!reduce) requestAnimationFrame(tick);
})();
