-- 口袋餐廳 多使用者版 初始 schema
-- 在 Supabase Dashboard → SQL Editor 貼上全部執行

-- ===== 餐廳記錄 =====
create table public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null default '',
  status      text not null default 'want',
  price       text not null default '',
  parking     text not null default 'unknown',
  dishes      text[] not null default '{}',
  notes       text not null default '',
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz not null default now()
);

create index restaurants_user_idx on public.restaurants (user_id);

alter table public.restaurants enable row level security;

-- 每個人只能讀寫自己的記錄
create policy "select own" on public.restaurants
  for select using (auth.uid() = user_id);
create policy "insert own" on public.restaurants
  for insert with check (auth.uid() = user_id);
create policy "update own" on public.restaurants
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.restaurants
  for delete using (auth.uid() = user_id);

-- ===== 個人化設定（自訂狀態／價位／停車選項） =====
create table public.user_settings (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  cfg         jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "select own settings" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "update own settings" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
