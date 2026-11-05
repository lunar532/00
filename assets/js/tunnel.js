// 하단 갱도: three.js로 그린 지하 터널과 생존자 캐릭터.
// 메뉴를 누르면 캐릭터가 그 구역까지 달려간 뒤 페이지가 바뀌어요.
// assets/models/survivor.glb 가 있으면 그 모델(실사 캐릭터 등)을 대신 써요.
import * as THREE from 'three';

// 하단 칸(#tunnel)은 common.js가 만들어요. 아직 없으면 문서가 다 읽힐 때까지 기다려요.
let host = document.getElementById('tunnel');
const boot = () => { host = document.getElementById('tunnel'); if (host) start().catch(err => { console.error(err); host.classList.add('tunnel-failed'); }); };
if (host || document.readyState === 'complete') boot();
else document.addEventListener('DOMContentLoaded', boot);

async function start() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STATIONS = [
    ['index', '홈', 120], ['viewer', '3D 뷰어', 180], ['map', '지도', 20],
    ['board', '게시판', 240], ['refs', '참고자료', 310], ['account', '계정', 40],
  ];
  const SPACING = 11;
  const sx = i => i * SPACING;
  const page = document.body.dataset.page || 'index';
  const here = Math.max(0, STATIONS.findIndex(s => s[0] === page));
  const L = SPACING * (STATIONS.length - 1) + 24, X0 = -12;

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  host.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '지하 갱도를 지나가는 생존자');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#04050c');
  scene.fog = new THREE.FogExp2('#060918', 0.045);
  const camera = new THREE.PerspectiveCamera(32, 3, 0.1, 80);

  scene.add(new THREE.HemisphereLight('#5a6fc0', '#2a1a10', 1.25));

  /* ---------- noise ---------- */
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y) => { let t = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { t += a * vnoise(x * f, y * f); f *= 2.1; a *= 0.5; } return t; };

  function rockSurface(w, h, segW, segH, displace, colorAt) {
    const g = new THREE.PlaneGeometry(w, h, segW, segH);
    const pos = g.attributes.position, col = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, displace(x, y));
      colorAt(x, y, c); col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  const earth = [new THREE.Color('#3b2c22'), new THREE.Color('#2a2130'), new THREE.Color('#4a3626'), new THREE.Color('#1c2342')];

  /* ---------- tunnel ---------- */
  const back = new THREE.Mesh(rockSurface(L, 6, L * 2, 18,
    (x, y) => fbm(x * 0.32 + 9, y * 0.55) * 1.1 + fbm(x * 1.3, y * 1.7) * 0.28,
    (x, y, c) => { const k = (Math.sin(y * 2.2 + fbm(x * 0.2, y) * 3) + 1) / 2; c.copy(earth[Math.floor(k * 3.99)]).multiplyScalar(0.7 + fbm(x, y * 2) * 0.6); }), rockMat);
  back.position.set(X0 + L / 2, 2.4, -2.3);
  scene.add(back);

  const floor = new THREE.Mesh(rockSurface(L, 6, L * 2, 12,
    (x, y) => (Math.abs(y) < 1.1 ? 0 : fbm(x * 0.6, y * 0.6) * 0.25) + fbm(x * 2, y * 2) * 0.04,
    (x, y, c) => { c.set('#2b221c').multiplyScalar(0.6 + fbm(x * 0.8, y) * 0.7); }), rockMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(X0 + L / 2, 0, 0.6);
  scene.add(floor);

  const ceil = new THREE.Mesh(rockSurface(L, 6, L, 8,
    (x, y) => fbm(x * 0.4, y * 0.5) * 0.9,
    (x, y, c) => { c.set('#1b1716').multiplyScalar(0.6 + fbm(x, y) * 0.6); }), rockMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(X0 + L / 2, 4.3, 0.4);
  scene.add(ceil);

  // 앞쪽 바위 실루엣
  const boulderMat = new THREE.MeshStandardMaterial({ color: '#120e0d', roughness: 1, flatShading: true });
  for (let x = X0; x < X0 + L; x += 2.2 + hash(x, 1) * 3) {
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + hash(x, 2) * 0.5, 0), boulderMat);
    b.position.set(x, -0.35 + hash(x, 3) * 0.2, 2.9 + hash(x, 4) * 0.6);
    b.rotation.set(hash(x, 5) * 3, hash(x, 6) * 3, 0);
    b.scale.y = 0.6;
    scene.add(b);
  }

  // 갱목(나무 버팀목)과 레일
  const wood = new THREE.MeshStandardMaterial({ color: '#4a3324', roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: '#6c7080', roughness: 0.4, metalness: 0.8 });
  for (let x = X0 + 2; x < X0 + L; x += 5.5) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), wood); post.position.set(x, 2, -1.75); scene.add(post);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 4.4), wood); beam.position.set(x, 3.85, 0.3); scene.add(beam);
  }
  [-0.75, -0.25].forEach(z => { const r = new THREE.Mesh(new THREE.BoxGeometry(L, 0.05, 0.05), steel); r.position.set(X0 + L / 2, 0.06, z); scene.add(r); });
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.05, 0.8), wood, Math.ceil(L / 0.7));
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < sleepers.count; i++) { m4.makeTranslation(X0 + i * 0.7, 0.025, -0.5); sleepers.setMatrixAt(i, m4); }
  scene.add(sleepers);

  // 빛 번짐 스프라이트
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const glow = (color, size) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.set(size, size, 1); return s;
  };

  // 사파이어·블랙라이트 결정
  const crystalGeo = new THREE.OctahedronGeometry(1, 0);
  const crystalColors = ['#2f7bff', '#2f7bff', '#4d86ff', '#9b5cff', '#ff4fd8', '#63f0ff'];
  crystalColors.forEach((col, ci) => {
    const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.1 });
    const n = 26;
    const inst = new THREE.InstancedMesh(crystalGeo, mat, n);
    const q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const x = X0 + hash(i, ci * 7 + 1) * L, onWall = hash(i, ci + 30) > 0.35;
      p.set(x, onWall ? 0.3 + hash(i, ci + 40) * 3.4 : 0.05, onWall ? -1.85 - hash(i, ci) * 0.2 : -1.4 + hash(i, ci + 9) * 0.6);
      e.set((hash(i, ci + 2) - 0.5) * 1.2, hash(i, ci + 3) * 3, (hash(i, ci + 4) - 0.5) * 1.2); q.setFromEuler(e);
      const s = 0.05 + hash(i, ci + 5) * 0.09; sc.set(s, s * (2.5 + hash(i, ci + 6) * 3), s);
      m4.compose(p, q, sc); inst.setMatrixAt(i, m4);
      if (i % 5 === 0) { const g = glow(col, 0.9 + s * 6); g.position.copy(p); g.material.opacity = 0.55; scene.add(g); }
    }
    scene.add(inst);
  });
  [[8, '#2f7bff'], [30, '#9b5cff'], [52, '#2f7bff']].forEach(([x, c]) => { const l = new THREE.PointLight(c, 6, 9, 2); l.position.set(x, 1.6, -1.2); scene.add(l); });

  // 구역마다 매달린 램프와 표지판
  function signTexture(text, active) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#3b2a1e'; g.fillRect(0, 0, 512, 160);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.12})`; g.fillRect(0, Math.random() * 160, 512, 1 + Math.random() * 3); }
    g.strokeStyle = '#1a120c'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 150);
    g.font = '900 78px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (active) { g.shadowColor = '#63f0ff'; g.shadowBlur = 24; g.fillStyle = '#c8fbff'; } else { g.fillStyle = '#e6d6bd'; }
    g.fillText(text, 256, 86);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  const signs = [];
  if (document.fonts && document.fonts.load) { try { await document.fonts.load('900 40px "Noto Sans KR"'); } catch (e) {} }
  STATIONS.forEach(([, label, depth], i) => {
    const x = sx(i);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshStandardMaterial({ map: signTexture(label, i === here), roughness: 0.8, emissive: '#ffffff', emissiveIntensity: i === here ? 0.35 : 0.08, emissiveMap: null }));
    board.material.emissiveMap = board.material.map;
    board.position.set(x, 2.55, -1.62);
    scene.add(board); signs.push(board);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd9a0' }));
    bulb.position.set(x + 1.3, 3.25, -0.9); scene.add(bulb);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.55), steel); wire.position.set(x + 1.3, 3.55, -0.9); scene.add(wire);
    const g = glow('#ffc27a', 1.6); g.position.copy(bulb.position); scene.add(g);
    const light = new THREE.PointLight('#ffb36b', 9, 9, 2); light.position.copy(bulb.position); scene.add(light);
    const depthT = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; const gg = c.getContext('2d');
      gg.font = '500 34px monospace'; gg.fillStyle = 'rgba(160,200,255,.85)'; gg.textAlign = 'center'; gg.fillText('-' + depth + ' m', 128, 44);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: depthT, transparent: true, depthWrite: false }));
    dm.position.set(x, 2.18, -1.6); scene.add(dm);
  });

  // 떠다니는 흙먼지
  const dustN = 500, dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = X0 + Math.random() * L; dustPos[i * 3 + 1] = Math.random() * 4; dustPos[i * 3 + 2] = -1.8 + Math.random() * 3.6; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#ffdcb0', size: 0.025, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- character ---------- */
  const hero = await loadModel().catch(() => null) || buildSurvivor();
  scene.add(hero.root);
  // 캐릭터를 따라다니는 부드러운 조명 (얼굴과 몸이 어둠에 묻히지 않게)
  const keyLight = new THREE.PointLight('#ffd2a8', 5, 5, 1.6);
  scene.add(keyLight);

  /* ---------- state ---------- */
  let x = sx(here), target = x, speed = 0, dir = 1, facing = 1, onArrive = null, t = 0, idleT = 4, busy = false;
  let arrive = null;
  try { arrive = JSON.parse(sessionStorage.getItem('ul-walk') || 'null'); sessionStorage.removeItem('ul-walk'); } catch (e) {}
  if (arrive && Date.now() - arrive.t < 5000 && arrive.to === here && !reduce) {
    dir = arrive.dir; facing = dir; x = sx(here) - dir * 3.2; target = sx(here);
  }
  let camX = x;

  const capEl = document.getElementById('tunnel-here');
  const setCap = i => { capEl.innerHTML = `지금 위치 <b>${STATIONS[i][1]}</b> · -${STATIONS[i][2]} m`; };
  setCap(here);

  function travelTo(i, done) {
    if (busy) return;
    const tx = sx(i);
    if (Math.abs(tx - x) < 0.05) { done(); return; }
    busy = true; target = tx; dir = Math.sign(tx - x); onArrive = done;
    setCap(i);
    try { sessionStorage.setItem('ul-walk', JSON.stringify({ to: i, dir, t: Date.now() })); } catch (e) {}
    // 너무 오래 걸리지 않게 최대 1.8초 뒤에는 이동
    setTimeout(() => { if (onArrive) { const f = onArrive; onArrive = null; f(); } }, 1800);
  }

  // 사이트 안 링크를 누르면 달려가기
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const name = (url.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
    const i = STATIONS.findIndex(s => s[0] === name);
    if (i < 0 || i === here || reduce) return;
    e.preventDefault();
    travelTo(i, () => { location.href = url.href; });
  });
  // 메뉴에 마우스를 올리면 그쪽을 바라봐요
  document.querySelectorAll('.side-nav a[data-station]').forEach(a => {
    a.addEventListener('pointerenter', () => { if (!busy) { const d = Math.sign(sx(+a.dataset.station) - x); if (d) facing = d; } });
  });

  // 캐릭터를 누르면 말하기
  const bubble = document.getElementById('tunnel-bubble');
  const LINES = ['흙 냄새 좋다.', '이 아래에 사파이어 광맥이 있어.', '땀이 비 오듯 하네.', '산소 수치 정상.', '어디로 갈까? 왼쪽 메뉴를 눌러.', '램프 배터리 아직 괜찮아.'];
  let bubbleT = 0;
  renderer.domElement.addEventListener('click', () => {
    bubble.textContent = LINES[Math.floor(Math.random() * LINES.length)];
    bubble.hidden = false; bubbleT = 2.6; hero.wave && hero.wave();
  });

  /* ---------- loop ---------- */
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 2 ? 40 : 32;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(host);
  const clock = new THREE.Clock();
  const v3 = new THREE.Vector3();

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    // 이동
    const dist = target - x;
    if (Math.abs(dist) > 0.02) {
      const want = Math.min(Math.max(Math.abs(dist) / 1.1, 2.2), 30);
      speed += (want - speed) * Math.min(1, dt * 4);
      x += Math.sign(dist) * Math.min(Math.abs(dist), speed * dt);
      facing = Math.sign(dist);
    } else {
      x = target; speed *= 0.8; if (speed < 0.05) speed = 0;
      if (onArrive) { const f = onArrive; onArrive = null; busy = false; f(); }
      else busy = false;
    }
    idleT -= dt;
    if (speed === 0 && idleT < 0) { hero.wipe && hero.wipe(); idleT = 6 + Math.random() * 6; }
    hero.update(dt, speed, facing, x);

    // 카메라: 캐릭터를 부드럽게 따라가요
    camX += (x - camX) * Math.min(1, dt * (speed > 6 ? 6 : 3));
    const narrow = camera.aspect < 2;
    camera.position.set(camX + facing * 0.4, 1.3, narrow ? 5.4 : 6.4);
    camera.lookAt(camX + facing * 0.4, 1.0, 0);
    keyLight.position.set(x + 0.8, 1.9, 2.2);

    // 흙먼지
    const pa = dust.geometry.attributes.position;
    for (let i = 0; i < dustN; i++) {
      let y = pa.getY(i) + dt * 0.04; if (y > 4) y = 0; pa.setY(i, y);
      pa.setX(i, pa.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.02);
    }
    pa.needsUpdate = true;

    // 말풍선 위치
    if (bubbleT > 0) {
      bubbleT -= dt;
      v3.set(x, 1.95, 0.4).project(camera);
      bubble.style.left = ((v3.x * 0.5 + 0.5) * host.clientWidth) + 'px';
      bubble.style.top = ((-v3.y * 0.5 + 0.5) * host.clientHeight) + 'px';
      if (bubbleT <= 0) bubble.hidden = true;
    }

    renderer.render(scene, camera);
  }
  function loop() {
    if (visible && !document.hidden) frame();
    if (!reduce) requestAnimationFrame(loop);
  }
  frame();
  if (!reduce) requestAnimationFrame(loop);

  /* ---------- 캐릭터: 파일 모델 ---------- */
  async function loadModel() {
    const url = 'assets/models/survivor.glb';
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) throw new Error('no model');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(url);
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const h = box.max.y - box.min.y || 1;
    model.scale.setScalar(1.7 / h);
    model.position.y = -box.min.y * (1.7 / h);
    const root = new THREE.Group(); root.add(model);
    root.position.z = 0.4;
    const lamp = new THREE.SpotLight('#ffe8b8', 30, 10, 0.5, 0.6, 1.5);
    lamp.position.set(0, 1.62, 0.12); lamp.target.position.set(0, 1.0, 3); root.add(lamp, lamp.target);
    const mixer = new THREE.AnimationMixer(model);
    const clip = re => gltf.animations.find(a => re.test(a.name));
    const idle = clip(/idle|stand/i), walk = clip(/walk/i), run = clip(/run|sprint/i) || walk;
    const aIdle = idle && mixer.clipAction(idle), aWalk = walk && mixer.clipAction(walk), aRun = run && mixer.clipAction(run);
    [aIdle, aWalk, aRun].forEach(a => a && a.play());
    let yaw = 0;
    return {
      root,
      update(dt, spd, face, px) {
        root.position.x = px;
        const wantYaw = spd > 0.05 ? face * Math.PI / 2 * 0.85 : face * 0.5;
        yaw += (wantYaw - yaw) * Math.min(1, dt * 8); root.rotation.y = yaw;
        const w = Math.min(1, spd / 2), r = Math.min(1, Math.max(0, (spd - 3) / 4));
        if (aIdle) aIdle.setEffectiveWeight(1 - w);
        if (aWalk) aWalk.setEffectiveWeight(w * (1 - r));
        if (aRun && aRun !== aWalk) aRun.setEffectiveWeight(w * r);
        mixer.update(dt);
      },
    };
  }

  /* ---------- 캐릭터: 코드로 만든 생존자 ---------- */
  function buildSurvivor() {
    // 흙과 땀이 묻은 피부 질감
    const skinTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      g.fillStyle = '#c98f6c'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * 256, y = Math.random() * 256, r = 6 + Math.random() * 26;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(84,56,34,${0.25 + Math.random() * 0.3})`); gr.addColorStop(1, 'rgba(84,56,34,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.4})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 0.8 + Math.random() * 1.6, 0, 7); g.fill(); }
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
      return tx;
    })();
    const skin = new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.42, metalness: 0.02 });
    const top = new THREE.MeshStandardMaterial({ color: '#1f5fd6', roughness: 0.45, emissive: '#0a2a80', emissiveIntensity: 0.4 });
    const shorts = new THREE.MeshStandardMaterial({ color: '#4f3e2e', roughness: 0.95 });
    const boot = new THREE.MeshStandardMaterial({ color: '#241b16', roughness: 0.8 });
    const hairM = new THREE.MeshStandardMaterial({ color: '#21150e', roughness: 0.6 });
    const strap = new THREE.MeshStandardMaterial({ color: '#15110e', roughness: 0.7 });

    const mesh = (geo, mat, p, s) => { const m = new THREE.Mesh(geo, mat); if (p) m.position.set(...p); if (s) m.scale.set(...s); return m; };
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
    const sph = new THREE.SphereGeometry(1, 24, 16);

    const root = new THREE.Group(); root.position.z = 0.4;
    const hips = new THREE.Group(); hips.position.y = 0.93; root.add(hips);
    hips.add(mesh(sph, shorts, [0, 0, 0], [0.165, 0.12, 0.115]));
    const belt = mesh(new THREE.TorusGeometry(0.15, 0.014, 6, 24), strap, [0, 0.06, 0], [1, 0.72, 1]); belt.rotation.x = Math.PI / 2; hips.add(belt);

    const spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine);
    spine.add(mesh(cap(0.095, 0.16), skin, [0, 0.11, 0], [1.02, 1, 0.78]));
    const chest = new THREE.Group(); chest.position.y = 0.28; spine.add(chest);
    chest.add(mesh(sph, skin, [0, 0, 0], [0.165, 0.13, 0.11]));
    chest.add(mesh(sph, top, [0, 0.005, 0.012], [0.172, 0.08, 0.118]));
    chest.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 12), skin, [0, 0.16, 0]));

    // 등에 멘 곡괭이
    const pick = new THREE.Group(); pick.position.set(0, 0.02, -0.14); pick.rotation.z = 0.7; chest.add(pick);
    pick.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.75, 8), new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.8 })));
    pick.add(mesh(new THREE.BoxGeometry(0.42, 0.05, 0.04), steel, [0, 0.36, 0]));

    // 머리, 머리카락, 포니테일, 헤드램프
    const head = new THREE.Group(); head.position.y = 0.3; chest.add(head);
    head.add(mesh(sph, skin, [0, 0, 0.005], [0.088, 0.108, 0.098]));
    head.add(mesh(sph, hairM, [0, 0.025, -0.012], [0.094, 0.1, 0.1]));
    const tail = new THREE.Group(); tail.position.set(0, 0.03, -0.09); head.add(tail);
    tail.add(mesh(cap(0.028, 0.18), hairM, [0, -0.11, -0.03]));
    const band = mesh(new THREE.TorusGeometry(0.097, 0.011, 6, 28), strap, [0, 0.03, 0]); band.rotation.x = Math.PI / 2; head.add(band);
    const lampBody = mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 12), new THREE.MeshBasicMaterial({ color: '#fff1c0' }), [0, 0.035, 0.1]); lampBody.rotation.x = Math.PI / 2; head.add(lampBody);
    const lampGlow = glow('#ffe7b0', 0.35); lampGlow.position.set(0, 0.035, 0.13); head.add(lampGlow);
    const lamp = new THREE.SpotLight('#ffe8b8', 30, 10, 0.5, 0.6, 1.5);
    lamp.position.set(0, 0.035, 0.1); lamp.target.position.set(0, -0.6, 3); head.add(lamp, lamp.target);

    // 팔
    function arm(side) {
      const sh = new THREE.Group(); sh.position.set(side * 0.19, 0.07, 0); chest.add(sh);
      sh.add(mesh(cap(0.04, 0.22), skin, [0, -0.14, 0]));
      const el = new THREE.Group(); el.position.y = -0.28; sh.add(el);
      el.add(mesh(cap(0.034, 0.2), skin, [0, -0.12, 0]));
      el.add(mesh(sph, skin, [0, -0.26, 0.01], [0.036, 0.045, 0.03]));
      return { sh, el };
    }
    // 다리
    function leg(side) {
      const th = new THREE.Group(); th.position.set(side * 0.085, -0.04, 0); hips.add(th);
      th.add(mesh(cap(0.07, 0.32), skin, [0, -0.2, 0]));
      th.add(mesh(new THREE.CylinderGeometry(0.084, 0.08, 0.12, 14), shorts, [0, -0.05, 0]));
      const kn = new THREE.Group(); kn.position.y = -0.42; th.add(kn);
      kn.add(mesh(cap(0.05, 0.32), skin, [0, -0.2, 0]));
      kn.add(mesh(cap(0.058, 0.14), boot, [0, -0.3, 0]));
      kn.add(mesh(new THREE.BoxGeometry(0.1, 0.07, 0.22), boot, [0, -0.42, 0.04]));
      return { th, kn };
    }
    const aL = arm(-1), aR = arm(1), lL = leg(-1), lR = leg(1);

    let phase = 0, yaw = 0, wipeT = 0, waveT = 0;
    const lerp = (a, b, k) => a + (b - a) * k;
    return {
      root,
      wipe() { wipeT = 1.4; },
      wave() { waveT = 1.6; },
      update(dt, spd, face, px) {
        root.position.x = px;
        const moving = spd > 0.05;
        const wantYaw = moving ? face * Math.PI / 2 * 0.86 : face * 0.55;
        yaw += (wantYaw - yaw) * Math.min(1, dt * 8);
        root.rotation.y = yaw;

        const run = Math.min(1, spd / 6);
        phase += Math.min(spd, 7.5) * dt * 2.7;
        const amp = moving ? 0.45 + run * 0.35 : 0;
        const s = Math.sin(phase), c = Math.cos(phase);
        lL.th.rotation.x = -s * amp; lR.th.rotation.x = s * amp;
        lL.kn.rotation.x = moving ? Math.max(0, Math.sin(phase - 1.2)) * (0.7 + run * 0.6) : 0;
        lR.kn.rotation.x = moving ? Math.max(0, -Math.sin(phase - 1.2)) * (0.7 + run * 0.6) : 0;
        hips.position.y = 0.93 + (moving ? Math.abs(c) * 0.035 * (1 + run) - 0.02 : Math.sin(phase * 0 + performance.now() / 900) * 0.004);
        spine.rotation.x = moving ? 0.08 + run * 0.12 : 0;
        chest.rotation.y = moving ? s * 0.12 : 0;
        const breath = 1 + Math.sin(performance.now() / 700) * 0.012;
        chest.scale.set(1, breath, 1);
        tail.rotation.x = moving ? 0.4 + c * 0.25 : 0.12 + Math.sin(performance.now() / 600) * 0.05;

        let lsx = s * amp * 0.9, rsx = -s * amp * 0.9, lel = moving ? -0.5 - run * 0.6 : -0.15, rel = lel, rsz = -0.06, lsz = 0.06;
        if (!moving && wipeT > 0) {           // 이마 땀 닦기
          wipeT -= dt; const k = Math.sin(Math.min(1, (1.4 - wipeT) / 1.4) * Math.PI);
          rsx = lerp(0, -2.5, k); rel = lerp(-0.15, -1.9, k); rsz = lerp(-0.06, 0.4, k);
        }
        if (waveT > 0) {                      // 손 흔들기
          waveT -= dt; rsx = -2.8; rsz = -0.3 + Math.sin(performance.now() / 90) * 0.35; rel = -0.4;
        }
        aL.sh.rotation.set(lsx, 0, lsz); aR.sh.rotation.set(rsx, 0, rsz);
        aL.el.rotation.x = lel; aR.el.rotation.x = rel;
        head.rotation.y = moving ? -chest.rotation.y : Math.sin(performance.now() / 2400) * 0.25;
      },
    };
  }
}
