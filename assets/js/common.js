// 모든 페이지가 같이 쓰는 코드: 오로라 하늘, 머리글, 밝기 테마, Supabase 연결, 작은 도우미 함수.
(function () {
  const cfg = window.UL_CONFIG || {};
  const hasKeys = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const client = hasKeys && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  const NAV = [
    ['index.html', '녹턴'],
    ['viewer.html', '3D 뷰어'],
    ['map.html', '지도'],
    ['board.html', '게시판'],
    ['refs.html', '참고자료'],
    ['account.html', '계정'],
  ];

  // 밝기 테마: 어둡게(기본) → 밝게 → 시스템 순서로 바뀌어요
  const THEMES = ['dark', 'light', 'system'];
  const ICON = {
    system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  };
  const THEME_NAME = { system: '시스템 설정 따르기', light: '밝게', dark: '어둡게' };
  function getTheme() { try { return localStorage.getItem('bm-theme') || 'dark'; } catch (e) { return 'dark'; } }
  function applyTheme(t) {
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }
  applyTheme(getTheme());

  const MARK = '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fb1"/><stop offset=".5" stop-color="#ff4d8d"/><stop offset="1" stop-color="#ffb766"/></linearGradient></defs><circle cx="16" cy="16" r="15" fill="url(#bm-g)"/><path d="M16 26c0-6 0-9 0-12" stroke="#3a0a1e" stroke-width="2" stroke-linecap="round"/><path d="M16 14c-4-1-6-4-6-7 4 0 6 3 6 7zM16 14c4-1 6-4 6-7-4 0-6 3-6 7z" fill="#3a0a1e"/><circle cx="16" cy="12" r="2.4" fill="#ffe3ec"/></svg>';

  function renderChrome() {
    const page = document.body.dataset.page || '';
    const sky = document.createElement('div');
    sky.className = 'sky'; sky.setAttribute('aria-hidden', 'true');
    sky.innerHTML = '<i></i><i></i><i></i><i></i>';
    document.body.prepend(sky);

    const header = document.getElementById('site-header');
    if (header) {
      header.className = 'site-header';
      header.innerHTML = `
        <div class="inner">
          <a class="wordmark" href="index.html">${MARK}<b>빛마루</b><span>BITMARU</span></a>
          <nav class="nav" aria-label="사이트 메뉴">
            ${NAV.map(([href, label]) => `<a href="${href}" ${href.startsWith(page) && page ? 'aria-current="page"' : ''} ${href === 'account.html' ? 'id="nav-account"' : ''}>${label}</a>`).join('')}
          </nav>
          <button class="theme-btn" type="button" id="theme-btn"></button>
        </div>`;
      const btn = header.querySelector('#theme-btn');
      const paint = () => { const t = getTheme(); btn.innerHTML = ICON[t]; btn.setAttribute('aria-label', '화면 밝기: ' + THEME_NAME[t]); btn.title = '화면 밝기: ' + THEME_NAME[t]; };
      paint();
      btn.addEventListener('click', () => {
        const next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
        try { localStorage.setItem('bm-theme', next); } catch (e) {}
        applyTheme(next); paint();
      });
    }
    const footer = document.getElementById('site-footer');
    if (footer) {
      footer.className = 'site-footer';
      footer.textContent = '빛마루 — Nocturne';
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
