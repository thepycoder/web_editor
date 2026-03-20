#!/usr/bin/env bash
# WebP exports for De Rotonde template (responsive variants; index.html uses srcset/sizes).
#
# Team portraits + map + logo: lossless from assets-hires JPG/PNG (matches your magick -define webp:lossless=true pipeline).
# Hero + extra mobile/tablet widths: rescale existing WebP with quality 92 — lossless re-encode of photos is often larger than the 1920 master.
set -euo pipefail

SRGB=/usr/share/ghostscript/iccprofiles/srgb.icc
SRC=/home/victor/Projects/web_editor/templates/de-rotonde-template/assets-hires
DST=/home/victor/Projects/web_editor/templates/de-rotonde-template/assets

if [[ ! -f "$SRGB" ]]; then
  echo "Missing ICC profile: $SRGB" >&2
  exit 1
fi

# magick INPUT …operations… OUTPUT — lossless, for JPG/PNG sources (portraits, map, logo).
export_webp() {
  local input="$1"
  local output="$2"
  shift 2
  magick "$input" "$@" -profile "$SRGB" -define webp:lossless=true -strip "$output"
}

# WebP → smaller WebP: lossless re-encode of photos explodes file size; use high-quality lossy.
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
team_plain de-jelle-van-nieuwenhuyze.jpg dr-jelle-van-nieuwenhuyze
team_plain dr-tinewienetrampoline.jpg dr-tine-konings
team_plain kelly-snoeck.jpg kelly-snoeck
team_plain saartje-de-maesschalck.jpg saartje-de-maesschalck

# Legacy filenames (800w) expected by older links — copy largest variant
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
