-- Admin auth: 자체 비밀번호 + DB 세션 (Supabase Auth 미사용)
-- 적용: supabase db push (또는 supabase migration up)

create extension if not exists "pgcrypto";

create table if not exists public.admins (
    id uuid primary key default gen_random_uuid(),
    username text not null unique,
    password_hash text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid not null references public.admins(id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index if not exists sessions_expires_at_idx on public.sessions (expires_at);
create index if not exists sessions_admin_id_idx on public.sessions (admin_id);

-- 테스트 관리자: username=admin, password=admin1234!
-- 해시 포맷: scrypt:<salt-hex>:<derived-hex> (N=16384, r=8, p=1, dkLen=64)
-- 동일 username 으로 INSERT 충돌 시 무시 (idempotent migration).
insert into public.admins (username, password_hash)
values (
    'admin',
    'scrypt:8a9f24e7c0111cc89db88f9dca9d9150:48c7f781bdb605c081d9733cd2bbc1510191c6de3ece2e645d08b7dbe8e28ada6fcc633289e8da7d545fa2cc8f7579e133e97b0fd1aea9ef92b374a080ebf901'
)
on conflict (username) do nothing;

-- RLS: 본 앱은 service_role 키로만 접근하므로 RLS 우회됨.
-- 그래도 anon/authed 키의 우발적 노출에 대비해 RLS 활성화 + 정책 없음 (= 차단).
alter table public.admins  enable row level security;
alter table public.sessions enable row level security;
