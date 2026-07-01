# 🍽️ 口袋餐廳（多使用者版）

原本的單檔版（`口袋餐廳.html`）資料只存在單一裝置的瀏覽器裡。這個版本改成 Next.js + Supabase：

- **Google 登入**：每個人用自己的 Google 帳號登入，免註冊
- **雲端同步**：餐廳記錄與自訂選項存在 Supabase，換手機不會掉資料，每個人只看得到自己的資料（RLS 保護）
- **共用 Places key**：Google 搜尋走後端代理（`/api/places`），你的 API key 只存在伺服器環境變數，前端拿不到；未登入者無法呼叫，防止盜刷

功能與舊版相同：附近清單、口袋名單搜尋＋Google 高評價搜尋、查 50m 停車、記錄／編輯、自訂選項、JSON 備份、Google Maps Takeout CSV 匯入。

---

## 設定步驟總覽

需要設定三樣東西：①Supabase（資料庫＋登入）②Google OAuth（讓使用者能用 Google 登入）③Google Places API key（共用搜尋）。

### 1. Supabase 專案

1. https://supabase.com → New project（Region 選 Northeast Asia (Tokyo)，Free 方案即可）
2. **跑資料庫 migration**：Dashboard → SQL Editor → New query → 貼上 `supabase/migrations/001_init.sql` 全部內容 → RUN。成功後 Table Editor 會看到 `restaurants`、`user_settings` 兩張表
3. **拿金鑰**：Project Settings → API，複製 `Project URL` 和 `anon public` key

### 2. Google OAuth（Google 登入）

這步是讓使用者可以「用 Google 帳號登入你的網站」，在 Google Cloud Console 操作：

1. https://console.cloud.google.com → 選你的專案（可沿用 food-map）
2. ☰ → **APIs & Services → OAuth consent screen**：
   - User Type 選 **External** → 填 App 名稱（口袋餐廳）、support email → 一路下一步建立
   - Publishing status 先用 Testing 也行（要把使用者 email 加進 Test users），正式開放再按 Publish
3. ☰ → **APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID**：
   - Application type：**Web application**
   - **Authorized redirect URIs** 加入：`https://你的supabase專案ref.supabase.co/auth/v1/callback`
     （這個網址在 Supabase Dashboard → Authentication → Providers → Google 頁面有寫，直接複製）
   - 建立後拿到 **Client ID** 和 **Client Secret**
4. 回 Supabase Dashboard → **Authentication → Providers → Google**：
   - Enable 打開，貼上 Client ID / Client Secret → Save
5. Supabase → **Authentication → URL Configuration**：
   - Site URL 填你的正式網址（部署後的 `https://xxx.vercel.app`）
   - Redirect URLs 加 `http://localhost:3001`（本機開發用）

> 注意：Google 登入只會拿到使用者的 email／名字／頭像，**不會**也**不能**讀取使用者的 Google Maps 帳號內容。匯入個人的 Google Maps「已儲存」清單仍是走 Takeout CSV。

### 3. Google Places API key（共用搜尋）

沿用舊版的 key 即可，但因為現在 key 只在**後端**使用，限制方式要調整：

1. Google Cloud Console → APIs & Services → Credentials → 你的 API key
2. **Application restrictions：選 None**（後端發出的請求沒有 referrer，設 Websites 反而會被擋）
3. **API restrictions：Restrict key**，只勾 **Places API (New)** —— 這是主要防護
4. Billing → Budgets & alerts 設預算警示（多人使用後用量會比以前高，建議設 $10–20）

### 4. 本機開發

```bash
cd pocket-restaurant
cp .env.local.example .env.local   # 填入三個值
npm install
npm run dev                        # http://localhost:3001
```

### 5. 部署到 Vercel

1. 把 `pocket-restaurant` push 到 GitHub
2. https://vercel.com → Add New → Project → Import 該 repo
3. Environment Variables 貼三個變數：
   `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`GOOGLE_PLACES_API_KEY`
4. Deploy，拿到 `https://xxx.vercel.app`
5. 回 Supabase → Authentication → URL Configuration，把 Site URL 改成這個網址

---

## 從舊版搬資料

1. 開舊版 `口袋餐廳.html` → 設定 → **匯出備份**（下載 JSON）
2. 開新版網站 → 登入 → 設定 → **匯入備份** → 選那個 JSON

自訂選項（狀態／價位／停車）不在備份裡，需在新版設定頁重加一次。

---

## 架構速覽

```
app/page.js              前端主程式（登入、附近、搜尋、記錄、設定）
app/api/places/route.js  Places API 後端代理（驗證 Supabase 登入、白名單參數、共用 key）
lib/supabase.js          Supabase 瀏覽器端 client
supabase/migrations/     資料表 + Row Level Security
```

費用：Supabase Free 方案即可；Places API 有 $200/月免費額度，由所有使用者共用，記得設預算警示。
