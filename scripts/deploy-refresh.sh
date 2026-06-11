#!/usr/bin/env bash
set -euo pipefail
PROJECT='/c/Users/azozb/saudi-word-challenge'
PAGES='/c/Users/azozb/saudi-word-challenge-gh-pages-work'
cd "$PROJECT"
npm run update:data >/tmp/saudi-stock-update.log 2>&1
npm test >>/tmp/saudi-stock-update.log 2>&1
npm run build >>/tmp/saudi-stock-update.log 2>&1
rm -rf "$PAGES/assets" "$PAGES/data" "$PAGES/icons"
cp -R "$PROJECT/dist/"* "$PAGES/"
cd "$PAGES"
git add -A
if git diff --cached --quiet; then
  exit 0
fi
git commit -m "deploy refreshed Saudi stock data $(date -u +%Y-%m-%dT%H:%MZ)" >>/tmp/saudi-stock-update.log 2>&1
git push origin gh-pages >>/tmp/saudi-stock-update.log 2>&1
exit 0
