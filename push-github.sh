#!/usr/bin/env bash
# 口袋餐廳 — 安裝 GitHub CLI、登入、建 repo 並推送
# 用法：在終端機執行  bash push-github.sh
set -e
cd "$(dirname "$0")"

# 1. 確認 / 安裝 gh
if ! command -v gh >/dev/null 2>&1; then
  echo "▶ 偵測到沒有 gh，準備安裝…"
  if command -v brew >/dev/null 2>&1; then
    brew install gh
  else
    echo ""
    echo "⚠️  你的電腦沒有 Homebrew，無法自動安裝 gh。"
    echo "    請先安裝 Homebrew（把下面這一行貼到終端機執行，約 3–5 分鐘）："
    echo ""
    echo '    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    echo ""
    echo "    裝完後，再重新執行本腳本： bash push-github.sh"
    exit 1
  fi
fi

# 2. 登入 GitHub（若尚未登入，會開瀏覽器讓你授權）
if ! gh auth status >/dev/null 2>&1; then
  echo "▶ 接下來要登入 GitHub。"
  echo "  提示選擇時：帳號選 GitHub.com、協定選 HTTPS、認證方式選 Login with a web browser。"
  gh auth login --git-protocol https --web
fi

# 3. 建立 private repo 並推送目前的 commit
echo "▶ 建立 GitHub repo 並推送…"
gh repo create pocket-restaurant --private --source=. --push

echo ""
echo "✅ 完成！你的 repo 網址："
gh repo view --json url -q .url
echo ""
echo "下一步：到 vercel.com 用這個 repo 部署，並貼上三個環境變數。"
