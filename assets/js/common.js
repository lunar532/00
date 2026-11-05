// 모든 페이지가 같이 쓰는 코드: 배경, 머리글, Supabase 연결, 작은 도우미 함수.
(function () {
  const cfg = window.UL_CONFIG || {};
  const hasKeys = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const client = hasKeys && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  const NAV = [
    ['index.html', '홈'],
    ['viewer.html', '3D 뷰어'],
    ['map.html', '지도'],
    ['board.html', '게시판'],
    ['refs.html', '참고자료'],
    ['account.html', '계정'],
  ];

  // 동굴 벽: 노이즈에 빛을 비춰 울퉁불퉁한 암벽을 만들고, 그 위에 사파이어 광맥과 블랙라이트에 빛나는 금을 그어요.
  const BACKDROP = `
  <svg class="rock" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <filter id="rockwall" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.0085 0.014" numOctaves="6" seed="11" result="n"/>
        <feDiffuseLighting in="n" surfaceScale="9" diffuseConstant="1.15" lighting-color="#9fb4ff" result="lit">
          <feDistantLight azimuth="250" elevation="34"/>
        </feDiffuseLighting>
        <feComposite in="lit" in2="SourceGraphic" operator="arithmetic" k1="1" k2="0" k3="0" k4="0"/>
      </filter>
      <filter id="grit" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
        <feColorMatrix values="0 0 0 0 0.36  0 0 0 0 0.27  0 0 0 0 0.2  0 0 0 -1.6 1.15"/>
      </filter>
      <filter id="jag" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="turbulence" baseFrequency="0.035" numOctaves="3" seed="5" result="t"/>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="26" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feGaussianBlur in="d" stdDeviation="2.6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="d"/></feMerge>
      </filter>
      <linearGradient id="strata" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a2130"/><stop offset=".35" stop-color="#3a2c26"/>
        <stop offset=".6" stop-color="#2b2a3c"/><stop offset="1" stop-color="#1a2348"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="1000" fill="url(#strata)" filter="url(#rockwall)"/>
    <rect width="1600" height="1000" filter="url(#grit)" opacity=".55"/>
    <g filter="url(#jag)" fill="none" stroke-linecap="round">
      <path class="vein" stroke="#2f7bff" stroke-width="2.2" d="M -40 610 C 180 560, 260 700, 460 650 S 760 520, 900 610 S 1180 760, 1320 690 S 1520 560, 1660 600"/>
      <path class="vein v2" stroke="#9b5cff" stroke-width="1.4" d="M 980 -20 C 940 120, 1060 220, 1010 360 S 900 520, 960 640"/>
      <path class="vein v3" stroke="#ff4fd8" stroke-width="1.1" d="M 120 -20 C 160 140, 60 260, 140 380 S 260 520, 200 700"/>
      <path class="vein" stroke="#63f0ff" stroke-width="1" d="M 1600 220 C 1440 260, 1380 180, 1240 250 S 1080 330, 1000 300"/>
    </g>
  </svg>
  <canvas class="drops" aria-hidden="true"></canvas>
  <div class="lamp"></div>`;

  // 헤드램프(마우스/손가락을 따라가는 불빛), 떠다니는 흙먼지, 벽을 타고 흐르는 물방울·땀방울
  function initCave(root) {
    const lamp = root.querySelector('.lamp');
    const setLamp = (x, y) => { lamp.style.setProperty('--mx', x + 'px'); lamp.style.setProperty('--my', y + 'px'); };
    setLamp(innerWidth * 0.62, innerHeight * 0.28);
    addEventListener('pointermove', e => setLamp(e.clientX, e.clientY), { passive: true });

    const cv = root.querySelector('canvas.drops');
    const ctx = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, drops = [], dust = [];
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = W * H / 100000;
      drops = Array.from({ length: Math.round(8 + area * 2.2) }, () => newDrop(true));
      dust = Array.from({ length: Math.round(20 + area * 4) }, newDust);
    }
    function newDrop(anyY) {
      return { x: Math.random() * W, y: anyY ? Math.random() * H : -10, r: 1.6 + Math.random() * 3.2, v: 0, hold: Math.random() * 200, trail: [] };
    }
    function newDust() {
      return { x: Math.random() * W, y: Math.random() * H, r: 0.4 + Math.random() * 1.4, vx: (Math.random() - 0.5) * 0.12, vy: -0.03 - Math.random() * 0.1, a: 0.15 + Math.random() * 0.45 };
    }
    function drawDrop(d) {
      // 꼬리 자국
      if (d.trail.length > 1) {
        ctx.beginPath(); ctx.moveTo(d.trail[0][0], d.trail[0][1]);
        d.trail.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.strokeStyle = 'rgba(170, 200, 255, 0.07)'; ctx.lineWidth = d.r * 0.9; ctx.lineCap = 'round'; ctx.stroke();
      }
      // 물방울 몸통 (위는 가늘고 아래는 둥글게)
      const g = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.2, d.r * 0.1, d.x, d.y, d.r * 1.4);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.25, 'rgba(160,190,255,0.28)');
      g.addColorStop(1, 'rgba(40,70,160,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r, d.r * 1.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      const mx = parseFloat(lamp.style.getPropertyValue('--mx')) || 0, my = parseFloat(lamp.style.getPropertyValue('--my')) || 0;
      dust.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < -5) p.x = W + 5; if (p.x > W + 5) p.x = -5;
        const near = Math.max(0, 1 - Math.hypot(p.x - mx, p.y - my) / 380);
        ctx.fillStyle = `rgba(255, 226, 190, ${p.a * (0.25 + near * 1.2)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      drops.forEach((d, i) => {
        if (d.hold > 0) d.hold -= 1;
        else {
          d.v = Math.min(d.v + 0.02 * d.r, 2.4);
          d.y += d.v; d.x += Math.sin(d.y * 0.05) * 0.15;
          d.trail.push([d.x, d.y]); if (d.trail.length > 40) d.trail.shift();
          if (Math.random() < 0.012) { d.hold = 30 + Math.random() * 160; d.v = 0; }
        }
        drawDrop(d);
        if (d.y > H + 20) drops[i] = newDrop(false);
      });
      if (!reduce && !document.hidden) requestAnimationFrame(frame);
    }
    resize();
    addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) requestAnimationFrame(frame); });
    frame();
  }


  function renderChrome() {
    const page = document.body.dataset.page || '';
    const bg = document.createElement('div');
    bg.className = 'abyss';
    bg.innerHTML = BACKDROP;
    document.body.prepend(bg);
    try { if (!['viewer', 'map'].includes(page)) initCave(bg); } catch (e) { /* 효과가 안 돼도 사이트는 그대로 */ }

    const header = document.getElementById('site-header');
    const tri = document.body.dataset.layout === 'tri';
    if (header && tri) {
      // 삼분할: 왼쪽 메뉴 / 오른쪽 위 내용 / 아래 갱도
      const DEPTHS = { 'index.html': 120, 'viewer.html': 180, 'map.html': 20, 'board.html': 240, 'refs.html': 310, 'account.html': 40 };
      header.className = 'site-side';
      header.innerHTML = `
        <a class="wordmark" href="index.html"><b>Underlume</b></a>
        <nav class="side-nav" aria-label="사이트 메뉴">
          ${NAV.map(([href, label], i) => `<a href="${href}" data-station="${i}" ${href.startsWith(page) && page ? 'aria-current="page"' : ''} ${href === 'account.html' ? 'id="nav-account"' : ''}>
            <span class="st">${String(i + 1).padStart(2, '0')}</span><span class="lb">${label}</span><span class="dp">-${DEPTHS[href]}m</span></a>`).join('')}
        </nav>`;
      const scroll = document.createElement('div');
      scroll.className = 'content-scroll';
      [...document.body.children].forEach(el => {
        if (el.matches('main, footer, #site-footer')) scroll.append(el);
      });
      header.after(scroll);
      const strip = document.createElement('div');
      strip.className = 'tunnel-strip'; strip.id = 'tunnel';
      strip.innerHTML = '<div class="tunnel-cap"><span id="tunnel-here"></span></div><div class="tunnel-bubble" id="tunnel-bubble" hidden></div>';
      scroll.after(strip);
    } else if (header) {
      header.className = 'site-header';
      header.innerHTML = `
        <div class="inner">
          <a class="wordmark" href="index.html"><b>Underlume</b></a>
          <nav class="nav" aria-label="사이트 메뉴">
            ${NAV.map(([href, label]) => `<a href="${href}" ${href.startsWith(page) && page ? 'aria-current="page"' : ''} ${href === 'account.html' ? 'id="nav-account"' : ''}>${label}</a>`).join('')}
          </nav>
        </div>
        `;
    }
    const footer = document.getElementById('site-footer');
    if (footer) {
      footer.className = 'site-footer';
      footer.textContent = 'UNDERLUME';
    }
    refreshAccountLink();
  }

  async function getUser() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session ? data.session.user : null;
  }
  async function getProfile() {
    const user = await getUser();
    if (!user) return null;
    const { data } = await client.from('profiles').select('id, nickname, role, created_at').eq('id', user.id).maybeSingle();
    return { id: user.id, email: user.email, nickname: (data && data.nickname) || user.email, role: (data && data.role) || 'member' };
  }
  async function getSettings() {
    if (!client) return null;
    const { data } = await client.from('site_settings').select('*').eq('id', 1).maybeSingle();
    return data;
  }
  async function refreshAccountLink() {
    const a = document.getElementById('nav-account');
    if (!a || !client) return;
    const p = await getProfile();
    if (p) a.textContent = p.role === 'admin' ? `${p.nickname} · 관리자` : p.nickname;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function setupNotice() {
    return `<div class="notice-box">
      <b>아직 데이터베이스가 연결되지 않았어요.</b><br>
      게시판과 가입 기능은 Supabase(무료)를 연결해야 동작해요.
      저장소의 <code>README.md</code>에 있는 순서대로 프로젝트를 만들고,
      <code>assets/js/config.js</code>에 주소와 anon 키를 넣어 주세요.
    </div>`;
  }

  // 회원 전용 모드: 관리자가 켜 두면 로그인하지 않은 사람은 계정 페이지로 보내요.
  // (화면 가림은 편의 기능이고, 실제 글 보호는 데이터베이스 RLS가 해요.)
  async function gate() {
    const page = document.body.dataset.page || '';
    if (!client || page === 'account') return;
    try {
      const [s, user] = await Promise.all([getSettings(), getUser()]);
      if (s && s.members_only && !user) {
        const here = location.pathname.split('/').pop() || 'index.html';
        location.replace('account.html?locked=1&next=' + encodeURIComponent(here + location.search));
        return;
      }
    } catch (e) { /* 설정을 못 읽으면 그냥 보여줘요 */ }
    document.documentElement.classList.remove('ul-gating');
  }
  if (client) document.documentElement.classList.add('ul-gating');

  window.UL = { client, configured: !!client, getUser, getProfile, getSettings, refreshAccountLink, esc, fmtDate, setupNotice };

  // 이 스크립트는 페이지 본문 뒤에서 읽혀서 바로 화면을 꾸밀 수 있어요.
  const start = () => { renderChrome(); gate(); };
  if (document.body && document.getElementById('site-header')) start();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
