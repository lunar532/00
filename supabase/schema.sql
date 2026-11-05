-- UNDERLUME 데이터베이스 설정
-- Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요. (한 번만)
--
-- 규칙
--  * 가장 먼저 가입한 사람이 자동으로 관리자(admin)가 됩니다. 그 다음부터는 일반 회원(member).
--  * 게시판은 누구나(로그인 안 해도) 읽고 쓸 수 있습니다. 관리자가 '게시판 열기'를 끄면 쓰기가 막힙니다.
--  * 글/댓글은 쓴 회원 본인 또는 관리자만 지울 수 있습니다. (비회원 글은 관리자만 지울 수 있음)
--  * 회원 등급(role)은 관리자만 set_member_role 함수로 바꿀 수 있습니다.
--  * members_only(기본 켜짐): 로그인한 회원만 게시판을 읽고 쓸 수 있습니다. 관리자가 끄면 누구나 이용.
--  * allow_signup: 관리자가 끄면 새 가입이 데이터베이스에서 거절됩니다. (첫 관리자 가입은 항상 허용)

-- ---------- 테이블 ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default '빛마루',
  notice text not null default '',
  board_open boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.site_settings add column if not exists members_only boolean not null default true;
alter table public.site_settings add column if not exists allow_signup boolean not null default true;
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 10000),
  author_name text not null check (char_length(author_name) between 1 and 30),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  author_name text not null check (char_length(author_name) between 1 and 30),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ---------- 도우미 함수 ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.board_is_open()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select board_open from public.site_settings where id = 1), true);
$$;

create or replace function public.members_only()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select members_only from public.site_settings where id = 1), true);
$$;

-- 가입하면 프로필을 만들고, 관리자가 아직 없으면 그 사람을 관리자로
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(7340);  -- 동시에 두 명이 가입해도 관리자는 한 명만
  if exists (select 1 from public.profiles where role = 'admin')
     and not coalesce((select allow_signup from public.site_settings where id = 1), true) then
    raise exception 'SIGNUP_CLOSED';
  end if;
  insert into public.profiles (id, nickname, role)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''), split_part(new.email, '@', 1)), 30),
    case when exists (select 1 from public.profiles where role = 'admin') then 'member' else 'admin' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 관리자 전용: 회원 등급 변경 (마지막 관리자는 내릴 수 없음)
create or replace function public.set_member_role(target uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception '관리자만 바꿀 수 있어요.'; end if;
  if new_role not in ('admin', 'member') then raise exception '잘못된 등급이에요.'; end if;
  if new_role = 'member'
     and (select role from public.profiles where id = target) = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception '마지막 관리자는 일반 회원으로 바꿀 수 없어요.';
  end if;
  update public.profiles set role = new_role where id = target;
end;
$$;

-- 관리자가 아직 있는지 (가입 화면 안내용)
create or replace function public.has_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where role = 'admin');
$$;

grant execute on function public.has_admin() to anon, authenticated;
grant execute on function public.set_member_role(uuid, text) to authenticated;

-- ---------- 행 수준 보안 ----------
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

-- profiles: 닉네임/등급은 공개, 본인은 닉네임만 수정 가능
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (nickname) on public.profiles to authenticated;

-- site_settings: 누구나 읽기, 관리자만 수정
drop policy if exists "settings read" on public.site_settings;
create policy "settings read" on public.site_settings for select using (true);
drop policy if exists "settings admin update" on public.site_settings;
create policy "settings admin update" on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.site_settings from anon, authenticated;

-- posts: 누구나 읽기/쓰기(게시판이 열려 있을 때), 본인 또는 관리자 삭제
drop policy if exists "posts read" on public.posts;
create policy "posts read" on public.posts for select using (not public.members_only() or auth.uid() is not null);
drop policy if exists "posts write" on public.posts;
create policy "posts write" on public.posts for insert to anon, authenticated
  with check (
    public.board_is_open()
    and (not public.members_only() or auth.uid() is not null)
    and ((auth.uid() is null and user_id is null) or user_id = auth.uid())
  );
drop policy if exists "posts delete" on public.posts;
create policy "posts delete" on public.posts for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
revoke update on public.posts from anon, authenticated;

-- comments: posts와 같은 규칙
drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select using (not public.members_only() or auth.uid() is not null);
drop policy if exists "comments write" on public.comments;
create policy "comments write" on public.comments for insert to anon, authenticated
  with check (
    public.board_is_open()
    and (not public.members_only() or auth.uid() is not null)
    and ((auth.uid() is null and user_id is null) or user_id = auth.uid())
  );
drop policy if exists "comments delete" on public.comments;
create policy "comments delete" on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
revoke update on public.comments from anon, authenticated;
