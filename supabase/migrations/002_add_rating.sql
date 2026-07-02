-- 為餐廳記錄加上 Google 星等欄位
-- 在 Supabase Dashboard → SQL Editor 貼上執行

alter table public.restaurants
  add column if not exists rating       real,
  add column if not exists rating_count integer;
