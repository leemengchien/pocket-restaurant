-- 為餐廳記錄加上 Google 地點詳細資訊欄位
-- 在 Supabase Dashboard → SQL Editor 貼上執行

alter table public.restaurants
  add column if not exists place_id   text,
  add column if not exists address    text,
  add column if not exists phone      text,
  add column if not exists hours      text[],
  add column if not exists tags       text[],
  add column if not exists google_uri text;
