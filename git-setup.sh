#!/usr/bin/env bash
# 口袋餐廳 — 一鍵初始化 git 並建立首次 commit
# 用法：在終端機 cd 到本資料夾後執行  bash git-setup.sh
set -e
cd "$(dirname "$0")"

echo "▶ 清掉先前殘留的 .git（若有）"
rm -rf .git

echo "▶ 初始化 git"
git init -q
git config user.email "leemengchien@gmail.com"
git config user.name "Ken Lee"
git branch -M main

echo "▶ 加入檔案並確認敏感檔已排除"
git add -A
if git check-ignore -q .env.local; then
  echo "  ✅ .env.local 已被忽略，不會上傳"
else
  echo "  ⚠️ 警告：.env.local 未被忽略！請先檢查 .gitignore 再繼續"
  exit 1
fi

echo "▶ 建立首次 commit"
git commit -q -m "口袋餐廳多使用者版：Next.js + Supabase 初始 commit"

echo ""
echo "✅ 完成！目前檔案："
git ls-files | sed 's/^/   /'
echo ""
echo "下一步：把它推上 GitHub（擇一）"
echo "  A. 已裝 GitHub CLI：  gh repo create pocket-restaurant --private --source=. --push"
echo "  B. 手動：到 github.com 建一個空 repo，再執行："
echo "       git remote add origin https://github.com/<你的帳號>/pocket-restaurant.git"
echo "       git push -u origin main"
