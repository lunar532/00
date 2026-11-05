// 2D 애니풍 생존자 캐릭터 (오리지널 디자인).
// SVG 조각(머리, 몸, 팔, 다리)을 관절에서 돌려서 걷기·달리기·땀 닦기·손 흔들기를 만들어요.
const NS = 'http://www.w3.org/2000/svg';

const SKIN = '#f1c4a4', SKIN_SH = '#d99c7f', SKIN_DK = '#c48468';
const HAIR = '#1d1424', HAIR_HI = '#4a2f5a';
const TOP = '#1f5fd6', TOP_HI = '#5f95ff', TOP_SH = '#123f9c';
const SHORTS = '#3d3129', SHORTS_SH = '#2a211c', BELT = '#1a1310', BOOT = '#211915', GLOVE = '#2a2220';
const DIRT = 'rgba(120, 82, 48, 0.3)';

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
const g = (parent, attrs = {}) => el('g', attrs, parent);
const path = (parent, d, fill, extra = {}) => el('path', { d, fill, ...extra }, parent);
const sweat = (parent, x, y, s = 1) => {
  path(parent, `M ${x} ${y - 3.2 * s} C ${x + 2.2 * s} ${y}, ${x + 2 * s} ${y + 2.6 * s}, ${x} ${y + 2.6 * s} C ${x - 2 * s} ${y + 2.6 * s}, ${x - 2.2 * s} ${y}, ${x} ${y - 3.2 * s} Z`, 'rgba(210, 232, 255, 0.75)');
  el('circle', { cx: x - 0.6 * s, cy: y + 0.2 * s, r: 0.7 * s, fill: '#fff' }, parent);
};
const dirt = (parent, x, y, rx, ry, rot = 0) => el('ellipse', { cx: x, cy: y, rx, ry, fill: DIRT, transform: `rotate(${rot} ${x} ${y})`, filter: 'url(#sv-blur)' }, parent);

// 관절(회전 중심)이 있는 그룹
function joint(parent, x, y) {
  const outer = g(parent, { transform: `translate(${x} ${y})` });
  const inner = g(outer);
  return { outer, inner, set(deg) { inner.setAttribute('transform', `rotate(${deg})`); } };
}

function limbLeg(parent, x, y, dark) {
  const tone = dark ? SKIN_DK : SKIN, sh = dark ? '#a86d55' : SKIN_SH;
  const hip = joint(parent, x, y);
  path(hip.inner, 'M -12 0 C -13 26, -10 50, -7 70 L 7 70 C 10 50, 13 26, 12 0 Z', tone);
  path(hip.inner, 'M 5 6 C 8 28, 8 50, 6 68 L 7 70 C 10 50, 13 26, 12 0 Z', sh, { opacity: 0.6 });
  dirt(hip.inner, -2, 40, 5, 8, 10);
  const knee = joint(hip.inner, 0, 68);
  path(knee.inner, 'M -7 0 C -8 22, -6 44, -5 58 L 5 58 C 6 44, 8 22, 7 0 Z', tone);
  path(knee.inner, 'M -7 0 C -4 4, 4 4, 7 0 C 6 6, -6 6, -7 0 Z', sh, { opacity: 0.7 });
  dirt(knee.inner, 1, 8, 5, 4);
  // 부츠
  path(knee.inner, 'M -8 44 L 8 44 L 9 64 C 16 64, 22 66, 23 71 C 23 74, 20 75, 16 75 L -9 75 Z', BOOT);
  path(knee.inner, 'M -8 44 L 8 44 L 8 49 L -8 49 Z', '#3a2c24');
  path(knee.inner, 'M -9 72 L 23 72 L 23 75 L -9 75 Z', '#0f0b09');
  return { hip, knee };
}

function limbArm(parent, x, y, dark) {
  const tone = dark ? SKIN_DK : SKIN, sh = dark ? '#a86d55' : SKIN_SH;
  const sh0 = joint(parent, x, y);
  path(sh0.inner, 'M -7 -3 C -8 18, -6 38, -5 52 L 5 52 C 6 38, 8 18, 7 -3 C 4 -7, -4 -7, -7 -3 Z', tone);
  path(sh0.inner, 'M 3 4 C 5 20, 5 38, 4 50 L 5 52 C 6 38, 8 18, 7 -3 Z', sh, { opacity: 0.55 });
  dirt(sh0.inner, -1, 18, 3.5, 6);
  const elbow = joint(sh0.inner, 0, 50);
  path(elbow.inner, 'M -5 0 C -6 16, -5 32, -4 44 L 4 44 C 5 32, 6 16, 5 0 Z', tone);
  // 손가락 없는 장갑 + 손
  path(elbow.inner, 'M -5 38 L 5 38 L 6 52 C 6 57, 2 59, -1 59 C -5 59, -7 56, -6 52 Z', GLOVE);
  path(elbow.inner, 'M -4 55 C -3 60, 3 60, 5 55 L 5 58 C 3 62, -3 62, -4 58 Z', tone);
  return { sh: sh0, elbow };
}

export function createSurvivor2D(host) {
  const svg = el('svg', { viewBox: '0 0 220 350', class: 'sv2d', 'aria-hidden': 'true' });
  host.appendChild(svg);
  const defs = el('defs', {}, svg);
  const blur = el('filter', { id: 'sv-blur', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  el('feGaussianBlur', { stdDeviation: '1.6' }, blur);
  const skinGrad = el('linearGradient', { id: 'sv-skin', x1: '0', x2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': SKIN_SH }, skinGrad); el('stop', { offset: '.45', 'stop-color': SKIN }, skinGrad); el('stop', { offset: '1', 'stop-color': '#f7d3b8' }, skinGrad);
  const topGrad = el('linearGradient', { id: 'sv-top', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': TOP_SH }, topGrad); el('stop', { offset: '.55', 'stop-color': TOP }, topGrad); el('stop', { offset: '1', 'stop-color': TOP_HI }, topGrad);
  const lampGrad = el('radialGradient', { id: 'sv-lamp' }, defs);
  el('stop', { offset: '0', 'stop-color': '#fffbe6' }, lampGrad); el('stop', { offset: '.4', 'stop-color': '#ffe39a', 'stop-opacity': '.8' }, lampGrad); el('stop', { offset: '1', 'stop-color': '#ffd27a', 'stop-opacity': '0' }, lampGrad);

  const flip = g(svg);                 // 좌우 방향
  const body = g(flip);                // 위아래 흔들림·기울기

  // 그림자
  const shadow = el('ellipse', { cx: 110, cy: 338, rx: 46, ry: 6, fill: 'rgba(0,0,0,.55)', filter: 'url(#sv-blur)' }, flip);
  flip.insertBefore(shadow, body);

  // 포니테일 (뒤)
  const tail = joint(body, 92, 34);
  path(tail.inner, 'M 0 0 C -18 10, -30 40, -26 78 C -24 96, -30 112, -38 124 C -22 118, -12 100, -12 80 C -10 52, -2 22, 8 4 Z', HAIR);
  path(tail.inner, 'M -4 8 C -16 26, -20 52, -18 76', 'none', { stroke: HAIR_HI, 'stroke-width': 2, opacity: 0.6, 'stroke-linecap': 'round' });

  // 뒤쪽 팔·다리
  const armB = limbArm(body, 92, 100, true);
  // 등에 멘 곡괭이
  const pick = g(body, { transform: 'rotate(-38 100 130)' });
  el('rect', { x: 97, y: 70, width: 5, height: 120, rx: 2, fill: '#6b4a2e' }, pick);
  path(pick, 'M 78 74 C 90 64, 110 64, 124 72 L 122 78 C 110 72, 92 72, 80 80 Z', '#9aa3b5');
  const legB = limbLeg(body, 98, 186, true);

  // 몸통
  const torso = g(body);
  path(torso, 'M 96 80 L 110 80 L 112 96 L 94 96 Z', SKIN_SH);                                 // 목
  path(torso, 'M 86 96 C 94 90, 116 90, 124 97 L 126 108 C 128 124, 122 136, 117 146 C 114 156, 117 168, 122 184 L 84 184 C 87 168, 91 156, 90 146 C 86 134, 82 120, 84 108 Z', 'url(#sv-skin)');
  path(torso, 'M 102 138 C 104 148, 104 158, 103 166', 'none', { stroke: SKIN_SH, 'stroke-width': 1.4, opacity: 0.7 });   // 복근선
  el('ellipse', { cx: 104, cy: 162, rx: 1.4, ry: 2, fill: SKIN_DK }, torso);                      // 배꼽
  path(torso, 'M 92 98 C 98 102, 108 102, 116 98', 'none', { stroke: SKIN_SH, 'stroke-width': 1.2, opacity: 0.7 });       // 쇄골
  // 크롭 탑
  path(torso, 'M 85 104 C 92 97, 116 97, 125 104 C 128 116, 126 128, 119 135 C 108 139, 96 139, 88 134 C 84 124, 83 113, 85 104 Z', 'url(#sv-top)');
  path(torso, 'M 90 104 L 92 94 M 118 104 L 116 94', 'none', { stroke: TOP_SH, 'stroke-width': 3, 'stroke-linecap': 'round' });
  path(torso, 'M 110 106 C 118 110, 121 120, 118 130', 'none', { stroke: TOP_HI, 'stroke-width': 2, opacity: 0.55, 'stroke-linecap': 'round' });
  // 반바지 + 벨트 + 주머니
  path(torso, 'M 83 176 L 123 176 L 126 204 L 106 207 L 103 196 L 100 207 L 81 204 Z', SHORTS);
  path(torso, 'M 100 196 L 103 196 L 106 207 L 100 207 Z', SHORTS_SH);
  path(torso, 'M 82 174 L 124 174 L 124 181 L 82 181 Z', BELT);
  el('rect', { x: 100, y: 174, width: 7, height: 7, rx: 1, fill: '#c9a24a' }, torso);
  path(torso, 'M 112 180 L 126 180 L 127 194 L 113 195 Z', '#4a3a2c');
  // 흙과 땀
  dirt(torso, 96, 152, 7, 5, -20); dirt(torso, 118, 160, 4, 6); dirt(torso, 88, 112, 4, 3);
  sweat(torso, 108, 100, 0.9); sweat(torso, 97, 146, 1); sweat(torso, 114, 152, 0.8); sweat(torso, 120, 120, 0.7);

  // 앞쪽 다리
  const legF = limbLeg(body, 112, 186, false);

  // 머리
  const head = joint(body, 104, 80);
  const H = head.inner;
  // 뒷머리
  path(H, 'M -22 -40 C -26 -62, -4 -78, 16 -72 C 32 -66, 36 -48, 32 -30 C 30 -20, 26 -12, 20 -6 L -20 -10 C -26 -20, -24 -30, -22 -40 Z', HAIR);
  // 얼굴
  path(H, 'M -18 -42 C -18 -62, -2 -70, 12 -66 C 24 -62, 28 -50, 26 -36 C 25 -26, 20 -16, 12 -10 C 6 -6, -2 -5, -8 -10 C -14 -16, -18 -28, -18 -42 Z', SKIN);
  path(H, 'M -18 -42 C -18 -30, -14 -18, -8 -10 C -12 -18, -14 -30, -12 -44 Z', SKIN_SH, { opacity: 0.6 });
  // 귀
  path(H, 'M -16 -40 C -22 -42, -23 -32, -17 -29 Z', SKIN_SH);
  // 눈 (앞쪽 큰 눈, 뒤쪽 작은 눈)
  const eyes = g(H);
  path(eyes, 'M 6 -42 C 8 -48, 18 -49, 21 -43 C 21 -36, 16 -32, 12 -32 C 8 -32, 5 -36, 6 -42 Z', '#ffffff');
  el('ellipse', { cx: 13.5, cy: -38.5, rx: 4.6, ry: 5.8, fill: '#2b6cff' }, eyes);
  el('ellipse', { cx: 13.5, cy: -38, rx: 2.4, ry: 3.4, fill: '#0b1433' }, eyes);
  el('circle', { cx: 11.6, cy: -41, r: 1.6, fill: '#fff' }, eyes);
  el('circle', { cx: 15.4, cy: -35.6, r: 0.8, fill: '#bfe0ff' }, eyes);
  path(eyes, 'M 4 -42 C 8 -50, 19 -51, 23 -43', 'none', { stroke: '#1a1020', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
  path(eyes, 'M -7 -42 C -6 -47, 0 -47, 1 -42 C 1 -37, -2 -34, -4 -34 C -6 -34, -8 -37, -7 -42 Z', '#ffffff');
  el('ellipse', { cx: -2.6, cy: -39, rx: 2.6, ry: 4.6, fill: '#2b6cff' }, eyes);
  el('ellipse', { cx: -2.4, cy: -38.6, rx: 1.4, ry: 2.6, fill: '#0b1433' }, eyes);
  path(eyes, 'M -8 -42 C -6 -48, 0 -48, 2 -43', 'none', { stroke: '#1a1020', 'stroke-width': 2, 'stroke-linecap': 'round' });
  const lids = g(H, { opacity: 0 });   // 눈 감기
  path(lids, 'M 5 -42 C 9 -40, 17 -40, 22 -42', 'none', { stroke: '#1a1020', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
  path(lids, 'M -8 -41 C -5 -39, -1 -39, 2 -41', 'none', { stroke: '#1a1020', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
  // 눈썹, 코, 입, 볼
  path(H, 'M 7 -52 C 11 -55, 17 -55, 21 -52 M -7 -51 C -5 -53, -1 -53, 1 -51', 'none', { stroke: '#2a1a24', 'stroke-width': 1.6, 'stroke-linecap': 'round' });
  path(H, 'M 22 -30 L 24 -26 L 21 -25', 'none', { stroke: SKIN_SH, 'stroke-width': 1.3, 'stroke-linecap': 'round' });
  const mouth = path(H, 'M 12 -18 C 15 -16, 19 -16, 21 -19', 'none', { stroke: '#b4505a', 'stroke-width': 2, 'stroke-linecap': 'round' });
  el('ellipse', { cx: 17, cy: -27, rx: 5, ry: 2.4, fill: '#ff8a9a', opacity: 0.35 }, H);
  dirt(H, -8, -24, 4, 3); dirt(H, 20, -58, 4, 2.4);
  sweat(H, 23, -55, 0.8); sweat(H, -12, -50, 0.7);
  // 앞머리
  path(H, 'M -20 -46 C -22 -68, 2 -80, 20 -72 C 32 -66, 34 -52, 30 -42 C 28 -50, 24 -56, 20 -58 C 22 -50, 20 -44, 16 -40 C 16 -48, 12 -54, 8 -56 C 8 -48, 4 -44, 0 -42 C 0 -50, -4 -54, -8 -56 C -10 -50, -14 -46, -20 -46 Z', HAIR);
  path(H, 'M -8 -70 C 2 -74, 14 -72, 22 -66', 'none', { stroke: HAIR_HI, 'stroke-width': 2.4, opacity: 0.7, 'stroke-linecap': 'round' });
  path(H, 'M -18 -44 C -22 -30, -20 -16, -16 -6 C -20 -14, -22 -28, -22 -40 Z', HAIR);
  // 헤드램프
  path(H, 'M -21 -58 C -6 -66, 16 -66, 31 -58 L 31 -53 C 16 -60, -6 -60, -21 -53 Z', '#15100d');
  el('rect', { x: 24, y: -64, width: 11, height: 9, rx: 2.5, fill: '#2a2a33' }, H);
  el('circle', { cx: 33, cy: -59.5, r: 3.4, fill: '#fff6d0' }, H);
  const lampGlow = el('circle', { cx: 34, cy: -59.5, r: 14, fill: 'url(#sv-lamp)', opacity: 0.9 }, H);

  // 앞쪽 팔
  const armF = limbArm(body, 118, 100, false);

  /* ---------- 움직임 ---------- */
  let phase = 0, facing = 1, wipeT = 0, waveT = 0, blinkT = 2, t = 0, lean = 0;
  const lerp = (a, b, k) => a + (b - a) * k;

  return {
    el: svg,
    wipe() { wipeT = 1.5; },
    wave() { waveT = 1.8; },
    update(dt, spd, face) {
      t += dt;
      facing = face;
      const moving = spd > 0.05, run = Math.min(1, spd / 6);
      phase += Math.min(spd, 7.5) * dt * 2.8;
      const s = Math.sin(phase), c = Math.cos(phase);
      const amp = moving ? 26 + run * 16 : 0;

      legF.hip.set(-s * amp); legB.hip.set(s * amp);
      legF.knee.set(moving ? Math.max(0, Math.sin(phase - 1.1)) * (34 + run * 36) : 0);
      legB.knee.set(moving ? Math.max(0, -Math.sin(phase - 1.1)) * (34 + run * 36) : 0);

      let fsh = moving ? s * amp * 0.9 : Math.sin(t * 1.3) * 2, fel = moving ? -18 - run * 40 : -8;
      let bsh = moving ? -s * amp * 0.9 : -Math.sin(t * 1.3) * 2, bel = moving ? -18 - run * 40 : -6;
      if (!moving && wipeT > 0) {                       // 이마 땀 닦기
        wipeT -= dt; const k = Math.sin(Math.min(1, (1.5 - wipeT) / 1.5) * Math.PI);
        fsh = lerp(fsh, -150, k); fel = lerp(fel, -95, k);
      }
      if (waveT > 0) {                                  // 손 흔들기
        waveT -= dt; fsh = -160; fel = -20 + Math.sin(t * 16) * 22;
      }
      armF.sh.set(fsh); armF.elbow.set(fel);
      armB.sh.set(bsh); armB.elbow.set(bel);

      const bob = moving ? -Math.abs(c) * (4 + run * 5) + 2 : Math.sin(t * 1.6) * 0.8;
      lean += ((moving ? 4 + run * 8 : 0) - lean) * Math.min(1, dt * 6);
      body.setAttribute('transform', `translate(0 ${bob}) rotate(${lean} 110 330)`);
      tail.set(moving ? 10 + c * 10 + run * 14 : Math.sin(t * 1.4) * 4);
      head.set(moving ? -lean * 0.4 : Math.sin(t * 0.5) * 3);
      torso.setAttribute('transform', moving ? '' : `translate(0 ${-Math.sin(t * 1.6) * 0.5})`);

      blinkT -= dt;
      if (blinkT < 0) { blinkT = 2.5 + Math.random() * 3; }
      const closed = blinkT < 0.13;
      eyes.setAttribute('opacity', closed ? 0 : 1); lids.setAttribute('opacity', closed ? 1 : 0);
      mouth.setAttribute('d', waveT > 0 ? 'M 12 -19 C 15 -14, 19 -14, 21 -19 Z' : 'M 12 -18 C 15 -16, 19 -16, 21 -19');
      lampGlow.setAttribute('opacity', 0.75 + Math.sin(t * 7) * 0.08);

      flip.setAttribute('transform', facing < 0 ? 'translate(220 0) scale(-1 1)' : '');
    },
  };
}
