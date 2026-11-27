-- PoisonPulse.de database schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','editor')); $$;

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Community',
  excerpt text not null default '',
  body text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.clan_members (
  id uuid primary key default gen_random_uuid(),
  minecraft_name text not null,
  rank text not null default 'Member',
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  minecraft_name text not null,
  discord_name text not null,
  age integer,
  message text not null,
  status text not null default 'new' check (status in ('new','reviewing','accepted','declined')),
  created_at timestamptz not null default now()
);

create table if not exists public.advent_calendar (
  id uuid primary key default gen_random_uuid(),
  day integer not null unique check (day between 1 and 24),
  title text not null,
  content text not null default '',
  reveal_at date not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.news enable row level security;
alter table public.clan_members enable row level security;
alter table public.applications enable row level security;
alter table public.advent_calendar enable row level security;

-- Public visitors can only read published news and active clan members.
create policy "Public reads published news" on public.news for select using (published or public.is_admin());
create policy "Admins manage news" on public.news for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads active clan" on public.clan_members for select using (active or public.is_admin());
create policy "Admins manage clan" on public.clan_members for all using (public.is_admin()) with check (public.is_admin());
create policy "Public submits applications" on public.applications for insert with check (
  char_length(minecraft_name) between 3 and 16 and
  char_length(discord_name) between 2 and 80 and
  char_length(message) between 20 and 2000 and status = 'new'
);
create policy "Admins manage applications" on public.applications for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads revealed calendar" on public.advent_calendar for select using (published and reveal_at <= current_date or public.is_admin());
create policy "Admins manage calendar" on public.advent_calendar for all using (public.is_admin()) with check (public.is_admin());
create policy "Users read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- After creating your first Auth user, promote it in the SQL editor:
-- insert into public.profiles (id, role)
-- select id, 'admin' from auth.users where email = 'YOUR_EMAIL';
