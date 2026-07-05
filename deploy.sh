#!/bin/bash
# 本地构建 VitePress 并部署到 gh-pages 分支(对外发布,手动触发)
set -e

PAGES_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE=$(git -C "$PAGES_DIR" remote get-url origin)

echo "=== 1/3 构建 VitePress ==="
cd "$PAGES_DIR"
npm run build

DIST="$PAGES_DIR/docs/.vitepress/dist"
if [ ! -d "$DIST" ]; then
  echo "✗ 构建产物不存在:$DIST"
  exit 1
fi

echo "=== 2/3 推送构建产物到 gh-pages 分支 ==="
TMP=$(mktemp -d)
cp -r "$DIST"/. "$TMP"/
cd "$TMP"
git init -q
git checkout -b gh-pages
git add -A
git -c user.name="ziogn" -c user.email="ziogn@users.noreply.github.com" \
  commit -qm "deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push -f "$REMOTE" gh-pages
cd "$PAGES_DIR"
rm -rf "$TMP"

echo "=== 3/3 完成 ==="
echo "✓ 已部署到 gh-pages 分支"
echo "首次需在 GitHub Settings → Pages → Source 选 gh-pages 分支(/root)"
