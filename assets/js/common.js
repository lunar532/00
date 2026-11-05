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

  const BACKDROP = `
  <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="uvA" x1="0" x2="1"><stop offset="0" stop-color="#63f0ff"/><stop offset="1" stop-color="#8b4dff"/></linearGradient>
      <linearGradient id="uvB" x1="0" x2="1"><stop offset="0" stop-color="#8b4dff"/><stop offset="1" stop-color="#ff4fd8"/></linearGradient>
      <linearGradient id="uvC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4fd8" stop-opacity="0"/><stop offset=".5" stop-color="#ff4fd8"/><stop offset="1" stop-color="#4d86ff" stop-opacity="0"/></linearGradient>
      <filter id="uvglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path class="contour" stroke="url(#uvA)" d="M -50 140 C 300 90, 420 430, 640 470 S 980 300, 1180 520 S 1500 900, 1700 860"/>
    <path class="contour" stroke="url(#uvB)" style="animation-duration:52s" d="M -50 320 C 220 270, 380 650, 700 650 S 1100 430, 1320 610 S 1560 980, 1700 1010"/>
    <path class="contour" stroke="url(#uvA)" style="animation-duration:46s;animation-direction:reverse" d="M 1650 70 C 1300 150, 1260 390, 1040 430 S 700 370, 520 570 S 260 910, -60 970"/>
    <path class="contour solid" stroke="url(#uvC)" d="M 1210 -40 C 1110 150, 1105 290, 1170 400 C 1240 520, 1290 640, 1200 790 C 1130 905, 1160 980, 1210 1060"/>
    <path class="contour solid" stroke="url(#uvC)" style="animation-delay:-4.5s" d="M 1390 -40 C 1470 150, 1475 290, 1415 400 C 1350 520, 1305 640, 1390 790 C 1455 905, 1430 980, 1390 1060"/>
  </svg>`;


  function renderChrome() {
    const page = document.body.dataset.page || '';
    const bg = document.createElement('div');
    bg.className = 'abyss';
    bg.innerHTML = BACKDROP;
    document.body.prepend(bg);

    const header = document.getElementById('site-header');
    if (header) {
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

  const start = () => { renderChrome(); gate(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
