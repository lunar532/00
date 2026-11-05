// 하단 갱도: three.js로 그린 지하 터널과 생존자 캐릭터.
// 메뉴를 누르면 캐릭터가 그 구역까지 달려간 뒤 페이지가 바뀌어요.
// 캐릭터는 2D 애니풍 그림이에요. assets/models/survivor.glb 가 있으면 그 3D 모델을 대신 써요.
import * as THREE from 'three';
import { createSurvivor2D } from './survivor2d.js';

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
  STATIONS.forEach(([, label], i) => {
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
  });

  // 떠다니는 흙먼지
  const dustN = 500, dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = X0 + Math.random() * L; dustPos[i * 3 + 1] = Math.random() * 4; dustPos[i * 3 + 2] = -1.8 + Math.random() * 3.6; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#ffdcb0', size: 0.025, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- character ---------- */
  const hero = await loadModel().catch(() => null) || make2D();
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
  const setCap = i => { capEl.innerHTML = `지금 위치 <b>${STATIONS[i][1]}</b>`; };
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
    camera.position.set(camX + facing * 0.4, 1.3, narrow ? 5 : 5.8);
    camera.lookAt(camX + facing * 0.4, 1.0, 0);
    keyLight.position.set(x + 0.8, 1.9, 2.2);
    if (hero.after) hero.after(camera);

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

  /* ---------- 캐릭터: 2D 애니풍 그림 (3D 장면 위에 겹쳐 그려요) ---------- */
  function make2D() {
    const sv = createSurvivor2D(host);
    const root = new THREE.Group(); root.position.z = 0.4;
    const lamp = new THREE.SpotLight('#ffe8b8', 30, 10, 0.5, 0.6, 1.5);
    lamp.position.set(0, 1.6, 0); root.add(lamp, lamp.target);
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    return {
      root, wipe: sv.wipe, wave: sv.wave,
      update(dt, spd, face, px) {
        root.position.x = px;
        lamp.target.position.set(face * 3, spd > 0.05 ? 1.0 : 0.6, 0.6);
        sv.update(dt, spd, face);
      },
      // 3D 위치(발, 머리)를 화면 좌표로 바꿔서 그림 크기와 위치를 맞춰요
      after(cam) {
        const W = host.clientWidth, Hh = host.clientHeight;
        a.set(root.position.x, 0, 0.4).project(cam);
        b.set(root.position.x, 2.0, 0.4).project(cam);   // 잘 보이게 실제보다 조금 크게
        const feet = (-a.y * 0.5 + 0.5) * Hh, top = (-b.y * 0.5 + 0.5) * Hh;
        const k = (feet - top) / 330;
        const left = (a.x * 0.5 + 0.5) * W - 110 * k;
        sv.el.style.width = 220 * k + 'px';
        sv.el.style.height = 350 * k + 'px';
        sv.el.style.transform = `translate(${left}px, ${feet - 338 * k}px)`;
      },
    };
  }
}
