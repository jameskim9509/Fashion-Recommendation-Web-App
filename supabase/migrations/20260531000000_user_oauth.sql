-- 사용자(일반) OAuth 인증 + 즐겨찾기
-- 관리자(admins/sessions)와는 별개의 테이블. 자체 세션 방식(Supabase Auth 미사용).
-- 적용: supabase db push (또는 supabase migration up)

create extension if not exists "pgcrypto";

-- OAuth 로 로그인한 일반 사용자.
-- (provider, provider_user_id) 조합이 사용자 식별자. 동일인이 Google/Kakao 를
-- 따로 쓰면 별개 계정으로 취급한다(계정 병합은 범위 외).
create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    provider text not null check (provider in ('google', 'kakao')),
    provider_user_id text not null,
    email text,
    name text,
    avatar_url text,
    created_at timestamptz not null default now(),
    last_login_at timestamptz not null default now(),
    unique (provider, provider_user_id)
);

create table if not exists public.user_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index if not exists user_sessions_expires_at_idx on public.user_sessions (expires_at);
create index if not exists user_sessions_user_id_idx on public.user_sessions (user_id);

-- 즐겨찾기(찜). fashion_item_id 는 Sheet 백엔드의 문자열 id (FK 아님 — 패션 데이터는
-- Supabase 가 아니라 Apps Script/Sheets 에 있음).
create table if not exists public.user_favorites (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    fashion_item_id text not null,
    created_at timestamptz not null default now(),
    unique (user_id, fashion_item_id)
);

create index if not exists user_favorites_user_id_idx on public.user_favorites (user_id);

-- RLS: 본 앱은 service_role 키로만 접근하므로 RLS 우회됨.
-- anon/authed 키의 우발적 노출에 대비해 RLS 활성화 + 정책 없음 (= 차단).
alter table public.users          enable row level security;
alter table public.user_sessions  enable row level security;
alter table public.user_favorites enable row level security;
