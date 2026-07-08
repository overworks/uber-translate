#!/usr/bin/env bash
# Uber Translate 아이콘 생성 — src/icons/icon.svg 디자인을 PNG로 래스터화.
# ImageMagick(convert)로 그라디언트 타일 + A文 마크를 직접 합성한다.
# (환경에 rsvg-convert 델리게이트가 없어 SVG→PNG 직행 대신 프리미티브로 재현)
set -euo pipefail

OUT="$(cd "$(dirname "$0")/.." && pwd)/src/icons"
S=512
# A와 文을 모두 커버하는 볼드 CJK 폰트
FONT="${ICON_FONT:-/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# 대각선 아이리스 그라디언트 (좌상단 → 우하단)
convert -size ${S}x${S} xc: -sparse-color barycentric \
  '0,0 #6D6DFF 511,511 #7C4DFF' "$TMP/grad.png"
# 라운드 스퀘어 알파 마스크 (약 22% 라운드)
convert -size ${S}x${S} xc:none -fill white \
  -draw "roundrectangle 14,14,497,497,112,112" "$TMP/mask.png"
# 그라디언트를 타일 모양으로 클립
convert "$TMP/grad.png" "$TMP/mask.png" -alpha off \
  -compose CopyOpacity -composite "$TMP/tile.png"
# 흰색 A文 마크
convert "$TMP/tile.png" -font "$FONT" -fill white -kerning -6 \
  -pointsize 200 -gravity center -annotate +0-4 "A文" "$TMP/icon.png"

for s in 16 32 48 128; do
  convert "$TMP/icon.png" -resize ${s}x${s} -strip "$OUT/icon-${s}.png"
  echo "  → src/icons/icon-${s}.png"
done
echo "done."
