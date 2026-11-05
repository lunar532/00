// 녹턴: 누르면 잉크가 피어나고, 끌면 비단 같은 흐름이 손끝을 따라가요.
// 입자는 부드러운 노이즈 흐름을 따라 움직이고, 지난 자취가 천천히 사라지며 번져 보여요.
(function () {
  const wrap = document.getElementById('garden-wrap');
  const cv = document.getElementById('garden');
  if (!wrap || !cv) return;
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  const PALETTES = {
    rose:   { bg: [10, 3, 7],  inks: ['#ff4d8d', '#ff8fb1', '#c2185b', '#ffd6e4'] },
    amber:  { bg: [10, 5, 3],  inks: ['#ffb766', '#ff7a45', '#ffd9a8', '#c2410c'] },
    velvet: { bg: [6, 3, 12],  inks: ['#b06bff', '#ff5ca8', '#6d28d9', '#e9d5ff'] },
  };
  let pal = 'rose', W = 0, H = 0, dpr = 1, parts = [], rings = [], t = 0, visible = true;
  let sound = false, audio = null, pointer = null, down = null, last = performance.now();

  function resize() {
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBg(1);
  }
  function paintBg(a) {
    const [r, g, b] = PALETTES[pal].bg;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- 부드러운 흐름 (값 노이즈) ---------- */
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, k) => a + (b - a) * k;
    const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
    return l(l(l(c(0,0,0), c(1,0,0), u), l(c(0,1,0), c(1,1,0), u), v), l(l(c(0,0,1), c(1,0,1), u), l(c(0,1,1), c(1,1,1), u), v), w);
  }
  const flow = (x, y) => noise(x * 0.0022, y * 0.0022, t * 0.05) * Math.PI * 4;

  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  function spawn(x, y, vx, vy, n, spread, life) {
    const inks = PALETTES[pal].inks;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * spread;
      parts.push({ x, y, px: x, py: y, vx: vx + Math.cos(a) * s, vy: vy + Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.6), max: 0, rgb: hexRgb(inks[Math.floor(Math.random() * inks.length)]), w: 0.6 + Math.random() * 1.6 });
      parts[parts.length - 1].max = parts[parts.length - 1].life;
    }
    if (parts.length > 2600) parts.splice(0, parts.length - 2600);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible && !document.hidden) {
      t += dt;
      paintBg(reduce ? 1 : 0.06);                 // 지난 자취를 아주 천천히 지워서 번지는 느낌
      // 늘 조금씩 흐르는 잉크
      if (!reduce && Math.random() < dt * 30) spawn(Math.random() * W, H * (0.55 + Math.random() * 0.45), 0, -0.2, 1, 0.3, 7);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        const ang = flow(p.x, p.y);
        p.vx = p.vx * 0.965 + Math.cos(ang) * 0.06;
        p.vy = p.vy * 0.965 + Math.sin(ang) * 0.06 - 0.008;
        p.px = p.x; p.py = p.y;
        p.x += p.vx * 60 * dt; p.y += p.vy * 60 * dt;
        p.life -= dt;
        if (p.life <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) { parts.splice(i, 1); continue; }
        const k = p.life / p.max, a = Math.sin(k * Math.PI) * 0.55;
        ctx.strokeStyle = `rgba(${p.rgb[0]},${p.rgb[1]},${p.rgb[2]},${a})`;
        ctx.lineWidth = p.w;
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      // 눌렀을 때 퍼지는 물결
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.age += dt;
        const k = r.age / 2.4; if (k >= 1) { rings.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(${r.rgb[0]},${r.rgb[1]},${r.rgb[2]},${(1 - k) * 0.35})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(r.x, r.y, 8 + k * 160, 0, Math.PI * 2); ctx.stroke();
      }
      // 손끝의 은은한 빛
      if (pointer) {
        const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 90);
        const c = hexRgb(PALETTES[pal].inks[0]);
        g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.06)`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 90, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 소리: 낮고 긴 울림 ---------- */
  const MINOR = [0, 3, 5, 7, 10, 12, 15];
  function tone(y) {
    if (!sound) return;
    if (!audio) {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const master = ac.createGain(); master.gain.value = 0.16;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const delay = ac.createDelay(); delay.delayTime.value = 0.42;
      const fb = ac.createGain(); fb.gain.value = 0.45;
      master.connect(lp); lp.connect(ac.destination); delay.connect(fb); fb.connect(delay); delay.connect(lp);
      audio = { ac, master, delay };
    }
    const { ac, master, delay } = audio;
    if (ac.state === 'suspended') ac.resume();
    const step = MINOR[Math.min(MINOR.length - 1, Math.floor((1 - y / H) * MINOR.length))];
    const f = 146.83 * Math.pow(2, step / 12);
    const t0 = ac.currentTime;
    [[f, 'sine', 1], [f * 1.5, 'sine', 0.25], [f * 2.005, 'triangle', 0.12]].forEach(([fr, type, lvl]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = fr;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(lvl, t0 + 0.25); g.gain.exponentialRampToValueAtTime(0.001, t0 + 4.5);
      o.connect(g); g.connect(master); g.connect(delay);
      o.start(t0); o.stop(t0 + 4.6);
    });
  }

  /* ---------- 조작 ---------- */
  const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function bloom(x, y) {
    spawn(x, y, 0, 0, 220, 3.2, 6);
    rings.push({ x, y, age: 0, rgb: hexRgb(PALETTES[pal].inks[1]) });
    tone(y);
  }
  cv.addEventListener('pointerdown', e => { down = { ...local(e), moved: 0 }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    const p = local(e);
    if (down && pointer) {
      const dx = p.x - pointer.x, dy = p.y - pointer.y;
      down.moved += Math.abs(dx) + Math.abs(dy);
      spawn(p.x, p.y, dx * 0.08, dy * 0.08, 6, 0.6, 5);
    }
    pointer = p;
  });
  cv.addEventListener('pointerup', e => { if (down && down.moved < 10) { const p = local(e); bloom(p.x, p.y); } down = null; });
  cv.addEventListener('pointerleave', () => { if (!down) pointer = null; });

  document.querySelectorAll('#pal-seg button').forEach(b => b.addEventListener('click', () => {
    pal = b.dataset.pal; wrap.dataset.pal = pal;
    document.querySelectorAll('#pal-seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    try { localStorage.setItem('bm-pal', pal); } catch (e) {}
  }));
  $('sound-btn').addEventListener('click', () => {
    sound = !sound;
    $('sound-btn').setAttribute('aria-pressed', String(sound));
    $('sound-btn').textContent = sound ? '소리 끄기' : '소리 켜기';
    if (sound) tone(H * 0.5);
  });
  $('bloom-btn').addEventListener('click', () => bloom(W * (0.2 + Math.random() * 0.6), H * (0.3 + Math.random() * 0.45)));
  $('clear-btn').addEventListener('click', () => { parts = []; rings = []; paintBg(1); });

  /* ---------- 시작 ---------- */
  try { const p = localStorage.getItem('bm-pal'); if (PALETTES[p]) { pal = p; } } catch (e) {}
  wrap.dataset.pal = pal;
  document.querySelectorAll('#pal-seg button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.pal === pal)));
  new ResizeObserver(resize).observe(cv);
  resize();
  // 처음부터 잉크가 번져 있도록 몇 군데 피워 둬요
  [[0.28, 0.55], [0.62, 0.42], [0.8, 0.68]].forEach(([x, y], i) => setTimeout(() => { spawn(W * x, H * y, 0, 0, 260, 3, 7); }, i * 400));
  if (reduce) { for (let i = 0; i < 120; i++) frame(performance.now() + i * 16); }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cv);
  requestAnimationFrame(frame);
})();
