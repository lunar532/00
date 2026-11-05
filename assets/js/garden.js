// 밤의 정원: 누르면 꽃이 피고, 끌면 꿀처럼 끈적한 빛줄기가 남아 천천히 흘러내려요.
// 정원은 이 브라우저에 저장되고, 링크(#g=...)로 그대로 나눌 수 있어요.
(function () {
  const wrap = document.getElementById('garden-wrap');
  const cv = document.getElementById('garden');
  if (!wrap || !cv) return;
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  const COLORS = ['#ff4d8d', '#ff8fb1', '#d36bff', '#ffb766', '#ffd6e4'];
  const KIND_NAME = ['별꽃', '이슬꽃', '나선꽃'];
  const SKY = {
    dawn:  { top: '#3b1430', mid: '#a8456e', low: '#ffb39a', hill1: '#5a1d3a', hill2: '#3d1128', stem: '#ff9fbf', glow: 0.7, tower: 'rgba(60,10,35,.5)', win: 'rgba(255,210,170,.85)' },
    day:   { top: '#5a1a3f', mid: '#c0487a', low: '#ffc3b0', hill1: '#7a2a4f', hill2: '#541a37', stem: '#ffb3cc', glow: 0.55, tower: 'rgba(80,20,50,.42)', win: 'rgba(255,230,210,.8)' },
    dusk:  { top: '#1d0618', mid: '#7a1440', low: '#ff8a5c', hill1: '#3a0b25', hill2: '#240617', stem: '#ff7aa8', glow: 0.85, tower: 'rgba(30,5,20,.65)', win: 'rgba(255,190,120,.95)' },
    night: { top: '#07020a', mid: '#2a0718', low: '#5c0f33', hill1: '#1c0510', hill2: '#0f0209', stem: '#ff5c95', glow: 1, tower: 'rgba(15,3,10,.85)', win: 'rgba(255,120,170,.95)' },
  };

  let W = 0, H = 0, dpr = 1, blooms = [], pollen = [], stars = [], towers = [];
  let kind = 0, time = null, wind = 0, pointer = null, sound = false, audio = null, visible = true;
  let trails = [], drips = [], curTrail = null;

  /* ---------- 크기와 배경 요소 ---------- */
  function rand(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function resize() {
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = rand(42);
    stars = Array.from({ length: Math.round(W * H / 4000) }, () => ({ x: R() * W, y: R() * H * 0.6, r: 0.4 + R() * 1.2, p: R() * 6 }));
    towers = [];
    for (let x = -20; x < W + 40;) {
      const w = 18 + R() * 34, h = H * (0.12 + R() * 0.26);
      const wins = Array.from({ length: Math.round(h / 16) }, () => R() > 0.45);
      towers.push({ x, w, h, dome: R() > 0.5, wins });
      x += w + 10 + R() * 40;
    }
  }
  const groundAt = x => H * 0.86 + Math.sin(x / W * Math.PI * 2 + 0.6) * H * 0.025 + Math.sin(x / W * 9) * H * 0.008;
  const topLimit = () => H * 0.3;

  /* ---------- 그리기 ---------- */
  function drawSky(now) {
    const s = SKY[time];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, s.top); g.addColorStop(0.55, s.mid); g.addColorStop(1, s.low);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (time === 'night' || time === 'dusk') {
      stars.forEach(st => {
        const a = (time === 'night' ? 0.8 : 0.35) * (0.5 + 0.5 * Math.sin(now / 900 + st.p));
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill();
      });
    }
    // 해·달
    const orb = { dawn: [0.78, 0.62, '#fff3d6'], day: [0.82, 0.2, '#fffdf0'], dusk: [0.22, 0.6, '#ffd7a8'], night: [0.84, 0.18, '#eef3ff'] }[time];
    const ox = orb[0] * W, oy = orb[1] * H, or = Math.min(W, H) * 0.06;
    const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, or * 5);
    og.addColorStop(0, orb[2]); og.addColorStop(0.18, orb[2]); og.addColorStop(0.2, 'rgba(255,255,255,.35)'); og.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ox, oy, or * 5, 0, 7); ctx.fill();
    // 멀리 보이는 유리 탑과 돔
    const base = H * 0.8;
    towers.forEach(t => {
      ctx.fillStyle = s.tower;
      ctx.beginPath();
      if (t.dome) { ctx.moveTo(t.x, base); ctx.lineTo(t.x, base - t.h * 0.7); ctx.quadraticCurveTo(t.x + t.w / 2, base - t.h * 1.15, t.x + t.w, base - t.h * 0.7); ctx.lineTo(t.x + t.w, base); }
      else { ctx.roundRect ? ctx.roundRect(t.x, base - t.h, t.w, t.h, [t.w / 2, t.w / 2, 0, 0]) : ctx.rect(t.x, base - t.h, t.w, t.h); }
      ctx.fill();
      ctx.fillStyle = s.win;
      t.wins.forEach((on, i) => { if (on) ctx.fillRect(t.x + t.w / 2 - 1.5, base - 10 - i * 14, 3, 5); });
    });
    // 언덕 두 겹
    [[s.hill1, 0.82, 0.03, 1.3], [s.hill2, 0.86, 0.025, 2.1]].forEach(([c, y0, amp, f]) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H * y0 + Math.sin(x / W * Math.PI * f + y0 * 10) * H * amp);
      ctx.lineTo(W, H); ctx.fill();
    });
  }

  function drawBloom(b, now) {
    const s = SKY[time];
    const age = (now - b.t) / 1000;
    const g = Math.min(1, Math.max(0, age / 1.8));
    const ease = 1 - Math.pow(1 - g, 3);
    const bx = b.rx * W, gy = groundAt(bx);
    const full = b.rh * (gy - topLimit());
    const h = full * ease;
    const sway = reduce ? 0 : (Math.sin(now * 0.0011 + b.seed * 6) * 6 + wind * 16) * (h / 220);
    const tipX = bx + sway + b.lean * h * 0.18, tipY = gy - h;
    const cx = bx + b.lean * h * 0.3 + sway * 0.35, cy = gy - h * 0.55;
    const col = COLORS[b.c];

    // 줄기
    ctx.strokeStyle = s.stem; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    if (s.glow > 0.6) { ctx.shadowColor = s.stem; ctx.shadowBlur = 8; }
    ctx.beginPath(); ctx.moveTo(bx, gy); ctx.quadraticCurveTo(cx, cy, tipX, tipY); ctx.stroke();
    ctx.shadowBlur = 0;
    // 잎
    if (ease > 0.3) {
      [[0.35, 1], [0.6, -1]].forEach(([k, side]) => {
        const lx = (1 - k) * (1 - k) * bx + 2 * (1 - k) * k * cx + k * k * tipX;
        const ly = (1 - k) * (1 - k) * gy + 2 * (1 - k) * k * cy + k * k * tipY;
        const ls = Math.min(1, (ease - 0.3) / 0.4) * (7 + b.size * 6);
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(side * 0.9 + sway * 0.01);
        ctx.fillStyle = s.stem; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(side * ls, 0, ls, ls * 0.38, 0, 0, 7); ctx.fill();
        ctx.restore();
      });
    }
    // 꽃
    const open = Math.min(1, Math.max(0, (g - 0.55) / 0.45));
    if (open <= 0) return;
    const r = (11 + b.size * 15) * (0.3 + 0.7 * open);
    const halo = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, r * 3.2);
    halo.addColorStop(0, hexA(col, 0.55 * (0.4 + s.glow))); halo.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(tipX, tipY, r * 3.2, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(tipX, tipY);
    const spin = reduce ? 0 : now * 0.0003 + b.seed * 10;
    if (s.glow > 0.6) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
    if (b.k === 0) {
      for (let i = 0; i < 5; i++) {
        const a = spin + i * Math.PI * 2 / 5;
        ctx.save(); ctx.rotate(a); ctx.fillStyle = hexA(col, 0.9);
        ctx.beginPath(); ctx.ellipse(r * 0.55 * open, 0, r * 0.58, r * 0.22, 0, 0, 7); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, 7); ctx.fill();
    } else if (b.k === 1) {
      for (let ring = 0; ring < 2; ring++) {
        const n = ring ? 6 : 8, d = r * (ring ? 0.32 : 0.62) * open, pr = r * (ring ? 0.26 : 0.36);
        for (let i = 0; i < n; i++) {
          const a = spin * 0.5 + i * Math.PI * 2 / n + ring * 0.3;
          ctx.fillStyle = hexA(ring ? '#ffffff' : col, ring ? 0.55 : 0.75);
          ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, pr, 0, 7); ctx.fill();
        }
      }
      const pulse = 0.22 + Math.sin(now / 500 + b.seed * 9) * 0.04;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, 7); ctx.fill();
    } else {
      const n = 34;
      for (let i = 1; i <= n; i++) {
        const a = i * 2.39996 + spin * 0.6, d = r * Math.sqrt(i / n) * open;
        ctx.fillStyle = hexA(i % 3 ? col : '#ffffff', 0.85);
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.13 * (1.1 - i / n * 0.5), 0, 7); ctx.fill();
      }
    }
    ctx.restore();
    ctx.shadowBlur = 0;
    b.tip = [tipX, tipY, open];
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  }

  function drawPollen(dt) {
    if (reduce) return;
    blooms.forEach(b => {
      if (b.tip && b.tip[2] >= 1 && Math.random() < dt * 0.35) {
        pollen.push({ x: b.tip[0], y: b.tip[1], vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 14, life: 4 + Math.random() * 3, c: COLORS[b.c] });
      }
    });
    for (let i = pollen.length - 1; i >= 0; i--) {
      const p = pollen[i];
      p.x += (p.vx + wind * 30) * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0 || p.y < -10) { pollen.splice(i, 1); continue; }
      ctx.fillStyle = hexA(p.c, Math.min(1, p.life / 2) * 0.9);
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 7); ctx.fill();
    }
  }

  // 끌면 남는 꿀빛 자국: 윤기 있는 굵은 선, 그 아래로 천천히 맺혀 떨어지는 방울
  function drawTrails(dt, now) {
    for (let i = trails.length - 1; i >= 0; i--) {
      const tr = trails[i];
      const age = (now - tr.t) / 1000;
      const a = Math.max(0, 1 - Math.max(0, age - 8) / 6);
      if (a <= 0) { trails.splice(i, 1); continue; }
      if (tr.pts.length < 2) continue;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = a;
      ctx.shadowColor = tr.c; ctx.shadowBlur = 18 * SKY[time].glow;
      ctx.strokeStyle = hexA(tr.c, 0.85); ctx.lineWidth = tr.w;
      ctx.beginPath(); tr.pts.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,240,245,.45)'; ctx.lineWidth = tr.w * 0.28;
      ctx.beginPath(); tr.pts.forEach((p, k) => k ? ctx.lineTo(p.x - tr.w * 0.18, p.y - tr.w * 0.2) : ctx.moveTo(p.x - tr.w * 0.18, p.y - tr.w * 0.2)); ctx.stroke();
      ctx.restore();
      // 방울이 맺혀요
      if (!reduce && a > 0.5 && Math.random() < dt * 2.6) {
        const p = tr.pts[Math.floor(Math.random() * tr.pts.length)];
        drips.push({ x: p.x, y0: p.y, len: 0, v: 4 + Math.random() * 6, r: tr.w * (0.36 + Math.random() * 0.22), c: tr.c, hold: 0.4 + Math.random() * 1.2, free: false, y: p.y, a: 1 });
      }
    }
    for (let i = drips.length - 1; i >= 0; i--) {
      const d = drips[i];
      if (!d.free) {
        if (d.hold > 0) d.hold -= dt; else { d.v += 9 * dt; d.len += d.v * dt; }
        if (d.len > 40 + d.r * 8) { d.free = true; d.y = d.y0 + d.len; d.fv = d.v * 3; }
        // 늘어나는 끈적한 줄기 + 끝의 둥근 방울
        const g = ctx.createLinearGradient(d.x, d.y0, d.x, d.y0 + d.len + d.r);
        g.addColorStop(0, hexA(d.c, 0.9)); g.addColorStop(1, hexA(d.c, 0.75));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(d.x - d.r * 0.55, d.y0);
        ctx.quadraticCurveTo(d.x - d.r * 0.18, d.y0 + d.len * 0.6, d.x - d.r * 0.3, d.y0 + d.len);
        ctx.lineTo(d.x + d.r * 0.3, d.y0 + d.len);
        ctx.quadraticCurveTo(d.x + d.r * 0.18, d.y0 + d.len * 0.6, d.x + d.r * 0.55, d.y0);
        ctx.fill();
        ctx.beginPath(); ctx.arc(d.x, d.y0 + d.len, d.r, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,245,248,.7)'; ctx.beginPath(); ctx.arc(d.x - d.r * 0.35, d.y0 + d.len - d.r * 0.35, d.r * 0.28, 0, 7); ctx.fill();
      } else {
        d.fv += 600 * dt; d.y += d.fv * dt; d.a -= dt * 0.8;
        if (d.y > groundAt(d.x) || d.a <= 0) { drips.splice(i, 1); continue; }
        ctx.fillStyle = hexA(d.c, 0.8 * d.a);
        ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * 0.8, d.r * 1.15, 0, 0, 7); ctx.fill();
      }
    }
    if (drips.length > 160) drips.splice(0, drips.length - 160);
  }

  function drawPointer() {
    if (!pointer) return;
    const s = SKY[time];
    const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 70);
    g.addColorStop(0, `rgba(255,190,215,${0.2 + s.glow * 0.2})`); g.addColorStop(1, 'rgba(255,190,215,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 70, 0, 7); ctx.fill();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible && !document.hidden) {
      wind *= Math.pow(0.35, dt);
      drawSky(now);
      blooms.forEach(b => drawBloom(b, now));
      drawTrails(dt, now);
      drawPollen(dt);
      drawPointer();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 소리 ---------- */
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  function chime(height) {
    if (!sound) return;
    if (!audio) {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const master = ac.createGain(); master.gain.value = 0.18; master.connect(ac.destination);
      const delay = ac.createDelay(); delay.delayTime.value = 0.28;
      const fb = ac.createGain(); fb.gain.value = 0.35;
      delay.connect(fb); fb.connect(delay); delay.connect(master);
      audio = { ac, master, delay };
    }
    const { ac, master, delay } = audio;
    if (ac.state === 'suspended') ac.resume();
    const step = SCALE[Math.min(SCALE.length - 1, Math.floor(height * SCALE.length))];
    const f = 392 * Math.pow(2, step / 12);
    const t0 = ac.currentTime;
    [[f, 'sine', 1], [f * 2, 'triangle', 0.25]].forEach(([fr, type, lvl]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = fr;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(lvl, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t0 + 2);
      o.connect(g); g.connect(master); g.connect(delay);
      o.start(t0); o.stop(t0 + 2.1);
    });
  }

  /* ---------- 저장·공유 ---------- */
  const enc = (n, len) => Math.max(0, Math.min(Math.pow(36, len) - 1, Math.round(n))).toString(36).padStart(len, '0');
  function encode() {
    return Object.keys(SKY).indexOf(time) + blooms.map(b => enc(b.rx * 1295, 2) + enc(b.rh * 1295, 2) + b.k + b.c + enc(b.size * 9, 1) + enc((b.lean + 0.5) * 9, 1)).join('');
  }
  function decode(str) {
    if (!/^[0-3]([0-9a-z]{8})*$/.test(str)) return null;
    const t = Object.keys(SKY)[+str[0]];
    const out = [];
    for (let i = 1; i < str.length; i += 8) {
      const c = str.slice(i, i + 8);
      out.push({ rx: parseInt(c.slice(0, 2), 36) / 1295, rh: parseInt(c.slice(2, 4), 36) / 1295, k: Math.min(2, +c[4]), c: Math.min(4, +c[5]), size: parseInt(c[6], 36) / 9, lean: parseInt(c[7], 36) / 9 - 0.5, seed: Math.random() });
    }
    return { t, blooms: out };
  }
  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem('bm-garden', encode()); } catch (e) {} }, 300);
    $('count').textContent = blooms.length + '송이';
  }
  function load(str) {
    const d = decode(str); if (!d) return false;
    setTime(d.t, false);
    const now = performance.now();
    blooms = d.blooms.slice(0, 60).map((b, i) => ({ ...b, t: now + i * 140 }));
    return true;
  }

  /* ---------- 심기 ---------- */
  function plant(x, y, quiet) {
    const gy = groundAt(x);
    const rh = Math.min(1, Math.max(0.15, (gy - y) / (gy - topLimit())));
    const b = { rx: x / W, rh, k: kind, c: Math.floor(Math.random() * COLORS.length), size: Math.random(), lean: Math.random() - 0.5, seed: Math.random(), t: performance.now() };
    blooms.push(b);
    if (blooms.length > 60) blooms.shift();
    if (!quiet) setTimeout(() => chime(rh), 900);
    save();
  }

  /* ---------- 조작 ---------- */
  let down = null;
  const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => { down = { ...local(e), moved: 0 }; curTrail = null; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    const p = local(e);
    if (down) {
      const dx = p.x - (pointer ? pointer.x : p.x);
      down.moved += Math.abs(dx) + Math.abs(p.y - (pointer ? pointer.y : p.y));
      wind = Math.max(-3, Math.min(3, wind + dx * 0.02));
      if (down.moved > 10) {
        if (!curTrail) {
          curTrail = { pts: [{ x: down.x, y: down.y }], t: performance.now(), c: COLORS[Math.floor(Math.random() * COLORS.length)], w: 10 + Math.random() * 7 };
          trails.push(curTrail); if (trails.length > 8) trails.shift();
        }
        const lp = curTrail.pts[curTrail.pts.length - 1];
        if (Math.hypot(p.x - lp.x, p.y - lp.y) > 4) { curTrail.pts.push(p); curTrail.t = performance.now(); if (curTrail.pts.length > 240) curTrail.pts.shift(); }
      }
    }
    pointer = p;
  });
  cv.addEventListener('pointerup', e => {
    if (down && down.moved < 10) { const p = local(e); plant(p.x, p.y); }
    down = null;
  });
  cv.addEventListener('pointerleave', () => { if (!down) pointer = null; });

  function toast(text) {
    const t = $('toast'); t.textContent = text; t.hidden = false;
    clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function setTime(t, store = true) {
    time = t; wrap.dataset.time = t;
    document.querySelectorAll('#time-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.time === t)));
    if (store) save();
  }
  document.querySelectorAll('#time-seg button').forEach(b => b.addEventListener('click', () => setTime(b.dataset.time)));
  document.querySelectorAll('#kind-seg button').forEach(b => b.addEventListener('click', () => {
    kind = +b.dataset.kind;
    document.querySelectorAll('#kind-seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('sound-btn').addEventListener('click', () => {
    sound = !sound;
    $('sound-btn').setAttribute('aria-pressed', String(sound));
    $('sound-btn').textContent = sound ? '소리 끄기' : '소리 켜기';
    if (sound) chime(0.5);
  });
  $('wind-btn').addEventListener('click', () => {
    wind = Math.random() > 0.5 ? 2.6 : -2.6;
    blooms.forEach(b => { if (b.tip) for (let i = 0; i < 3; i++) pollen.push({ x: b.tip[0], y: b.tip[1], vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 20, life: 3, c: COLORS[b.c] }); });
  });
  $('plant-btn').addEventListener('click', () => {
    const x = W * (0.08 + Math.random() * 0.84);
    plant(x, groundAt(x) - (0.25 + Math.random() * 0.7) * (groundAt(x) - topLimit()));
    toast(KIND_NAME[kind] + '을 심었어요.');
  });
  let clearArmed = false;
  $('clear-btn').addEventListener('click', () => {
    if (!clearArmed) { clearArmed = true; $('clear-btn').textContent = '한 번 더 누르면 비워요'; setTimeout(() => { clearArmed = false; $('clear-btn').textContent = '비우기'; }, 3000); return; }
    blooms = []; pollen = []; trails = []; drips = []; save(); clearArmed = false; $('clear-btn').textContent = '비우기'; toast('정원을 비웠어요.');
  });
  $('share-btn').addEventListener('click', async () => {
    const url = location.origin + location.pathname + '#g=' + encode();
    history.replaceState(null, '', '#g=' + encode());
    try { await navigator.clipboard.writeText(url); toast('링크를 복사했어요. 받은 사람에게 이 정원이 그대로 보여요.'); }
    catch (e) { toast('주소창의 링크를 복사해서 보내 주세요.'); }
  });

  /* ---------- 시작 ---------- */
  const hour = new Date().getHours();
  const autoTime = hour >= 5 && hour < 8 ? 'dawn' : hour < 17 ? 'day' : hour < 20 ? 'dusk' : 'night';
  new ResizeObserver(resize).observe(cv);
  resize();
  setTime(autoTime, false);
  const fromHash = (location.hash.match(/#g=([0-9a-z]+)/) || [])[1];
  let stored = null; try { stored = localStorage.getItem('bm-garden'); } catch (e) {}
  if (!(fromHash && load(fromHash)) && !(stored && load(stored))) {
    // 처음 오면 예시로 몇 송이 심어 둬요
    const now = performance.now();
    [[0.12, 0.45, 0], [0.22, 0.75, 2], [0.34, 0.35, 1], [0.48, 0.6, 0], [0.62, 0.85, 1], [0.74, 0.5, 2], [0.86, 0.68, 0], [0.94, 0.3, 1]]
      .forEach(([rx, rh, k], i) => blooms.push({ rx, rh, k, c: i % COLORS.length, size: 0.3 + (i * 0.13) % 0.7, lean: ((i * 0.37) % 1) - 0.5, seed: i / 8, t: now + i * 180 }));
  }
  $('count').textContent = blooms.length + '송이';
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cv);
  requestAnimationFrame(frame);
})();
