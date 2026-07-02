#!/usr/bin/env bash
# 口袋餐廳 — 連上帳號下既有的 pocket-restaurant repo 並推送
# 用法：在終端機執行  bash link-push.sh
set -e
cd "$(dirname "$0")"

# 取得既有 repo 的網址
URL="$(gh repo view pocket-restaurant --json url -q .url)"
echo "▶ 目標 repo：$URL"

# 設定 remote（先移除舊的避免重複）
git remote remove origin 2>/dev/null || true
git remote add origin "${URL}.git"

# 若遠端已有內容，先併入再推
git fetch origin >/dev/null 2>&1 || true
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  echo "▶ 遠端已有 commit，先併入…"
  if ! git pull --rebase origin main; then
    echo ""
    echo "⚠️  自動併入失敗。若你確定那個遠端 repo 是空的或內容可覆蓋，執行："
    echo "      git push -u origin main --force"
    exit 1
  fi
fi

echo "▶ 推送…"
git push -u origin main
echo ""
echo "✅ 完成！repo： $URL"
echo "   把這個網址貼給 Claude，接著設定 Vercel。"
