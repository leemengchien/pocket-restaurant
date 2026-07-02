-- 為餐廳記錄加上「地區 / 行政區」欄位（例如 信義區），與城市分開篩選
-- 在 Supabase Dashboard → SQL Editor 貼上執行

alter table public.restaurants
  add column if not exists district text;
