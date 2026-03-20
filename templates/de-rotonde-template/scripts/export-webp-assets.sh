#!/usr/bin/env bash
#
# export-webp-assets.sh — build responsive WebP assets for de-rotonde-template
#
# Purpose
#   Writes width variants used by templates/de-rotonde-template/index.html (img srcset and
#   picture source srcset). Re-run after changing hires sources or hero/mobile/tablet masters.
#
# Requirements
#   - ImageMagick 7+ (`magick` on PATH)
#   - ICC profile at SRGB (Ghostscript path below; change the variable if your distro differs)
#
# Paths (adjust if the template moves)
#   SRC — high-res inputs: portrait JPGs, map.png
#   DST — site assets; existing WebPs are inputs for hero rescales and logo derivatives
#
# Output naming
#   Team:  <base>-web-{320,576,800}w.webp; then cp 800w → <base>-web.webp for stable src URLs
#   Hero:  cover-desktop-{1200,1600}w.webp; cover-mobile-480w.webp; cover-tablet-{960,1200}w.webp
#   Map:   map-{640,960,1280,1516}w.webp. This script does not overwrite map.webp; after changing
#          map.png, copy or re-export map-1516w.webp → map.webp if you want src to match.
#   Logo:  logo-{256,384}w.webp
#
# Encoding
#   export_webp — JPG/PNG → WebP: embed SRGB, -define webp:lossless=true, -strip metadata.
#   export_webp_rescale — WebP → smaller WebP: -quality 92. Lossless re-encode of photo WebPs
#     often produces files larger than the full-size master; q92 keeps size reasonable.
#
# Team: source file in SRC → output base name (blur before resize only where noted)
#   dr-dries-taelman.jpg, dr-robbe-de-bruyn.jpg — Gaussian blur 0x0.8 (team_blur)
#   de-jelle-van-nieuwenhuyze.jpg → dr-jelle-van-nieuwenhuyze
#   dr-tinewienetrampoline.jpg    → dr-tine-konings
#   kelly-snoeck.jpg, saartje-de-maesschalck.jpg — resize only (team_plain)
#
# Hero (masters must already exist in DST)
#   Desktop variants resize cover-web-1774010847279.webp (same crop as the live hero image).
#   Mobile/tablet extras resize cover-mobile.webp and cover-tablet.webp; this script does not
#   rebuild those from assets-hires/cover.jpg.
#
# Usage: ./export-webp-assets.sh  (from scripts/ or with absolute path)
#
set -euo pipefail

SRGB=/usr/share/ghostscript/iccprofiles/srgb.icc
SRC=/home/victor/Projects/web_editor/templates/de-rotonde-template/assets-hires
DST=/home/victor/Projects/web_editor/templates/de-rotonde-template/assets

if [[ ! -f "$SRGB" ]]; then
  echo "Missing ICC profile: $SRGB" >&2
  exit 1
fi

# Args: input output [magick-read-options…]  (options apply before -profile … -strip output)
export_webp() {
  local input="$1"
  local output="$2"
  shift 2
  magick "$input" "$@" -profile "$SRGB" -define webp:lossless=true -strip "$output"
}

# Args: input output [magick-read-options…]  — no ICC embed; photo WebP rescale only.
export_webp_rescale() {
  local input="$1"
  local output="$2"
  shift 2
  magick "$input" "$@" -strip -define webp:method=6 -quality 92 "$output"
}

# --- Team portraits (320 / 576 / 800 for srcset) ---
team_blur() {
  local in_file="$1" base="$2"
  for w in 320 576 800; do
    export_webp "$SRC/$in_file" "$DST/${base}-web-${w}w.webp" \
      -filter Gaussian -blur 0x0.8 -resize "${w}x"
  done
}

team_plain() {
  local in_file="$1" base="$2"
  for w in 320 576 800; do
    export_webp "$SRC/$in_file" "$DST/${base}-web-${w}w.webp" -resize "${w}x"
  done
}

team_blur dr-dries-taelman.jpg dr-dries-taelman
team_blur dr-robbe-de-bruyn.jpg dr-robbe-de-bruyn
team_plain dr-jelle-van-nieuwenhuyze.jpg dr-jelle-van-nieuwenhuyze
team_plain dr-tinewienetrampoline.jpg dr-tine-konings
team_plain kelly-snoeck.jpg kelly-snoeck
team_plain saartje-de-maesschalck.jpg saartje-de-maesschalck

# Stable img src / deep links: duplicate 800w row as <base>-web.webp
for base in dr-dries-taelman dr-robbe-de-bruyn dr-jelle-van-nieuwenhuyze dr-tine-konings kelly-snoeck saartje-de-maesschalck; do
  cp -f "$DST/${base}-web-800w.webp" "$DST/${base}-web.webp"
done

# --- Hero cover (desktop crop: same as cover-web-1774010847279.webp) ---
DESKTOP_COVER="$DST/cover-web-1774010847279.webp"
for w in 1200 1600; do
  export_webp_rescale "$DESKTOP_COVER" "$DST/cover-desktop-${w}w.webp" -resize "${w}x"
done

# Mobile / tablet: extra widths from existing exports (same crop per file)
export_webp_rescale "$DST/cover-mobile.webp" "$DST/cover-mobile-480w.webp" -resize 480x
export_webp_rescale "$DST/cover-tablet.webp" "$DST/cover-tablet-960w.webp" -resize 960x
export_webp_rescale "$DST/cover-tablet.webp" "$DST/cover-tablet-1200w.webp" -resize 1200x

# --- Map ---
export_webp "$SRC/map.png" "$DST/map-640w.webp" -resize 640x
export_webp "$SRC/map.png" "$DST/map-960w.webp" -resize 960x
export_webp "$SRC/map.png" "$DST/map-1280w.webp" -resize 1280x
export_webp "$SRC/map.png" "$DST/map-1516w.webp" -resize 1516x

# --- Logo (from current web logo) ---
LOGO_SRC="$DST/logo.webp"
export_webp "$LOGO_SRC" "$DST/logo-256w.webp" -resize 256x
export_webp "$LOGO_SRC" "$DST/logo-384w.webp" -resize 384x

echo "Done. Team / cover / map / logo responsive WebPs in $DST"
