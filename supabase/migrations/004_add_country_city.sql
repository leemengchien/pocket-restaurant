-- 為餐廳記錄加上國家 / 城市欄位（依地址自動判斷，可篩選）
-- 在 Supabase Dashboard → SQL Editor 貼上執行

alter table public.restaurants
  add column if not exists country text,
  add column if not exists city    text;
