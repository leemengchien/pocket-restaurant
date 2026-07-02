#!/usr/bin/env bash
# 口袋餐廳 — 推送變更，觸發 Vercel 自動重新部署
# 用法：bash deploy.sh ["這次的更新說明"]
set -e
cd "$(dirname "$0")"
git add -A
git commit -m "${1:-更新：匯入筆記修正、Google 星等、查部落格按鈕}"
git push
echo ""
echo "✅ 已推送到 GitHub，Vercel 會自動重新部署（約 1–2 分鐘）。"
echo "   到 vercel.com 專案頁可看部署進度。"
