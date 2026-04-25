#!/usr/bin/env bash
# Copy Godot Web export files from repo root into apps/web/public/game/ when present.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/apps/web/public/game"
mkdir -p "$DEST"
for f in \
  CyberCrime.html CyberCrime.js CyberCrime.wasm CyberCrime.pck \
  CyberCrime.png CyberCrime.icon.png CyberCrime.apple-touch-icon.png \
  CyberCrime.audio.worklet.js CyberCrime.audio.position.worklet.js
do
  if [[ -f "$ROOT/$f" ]]; then
    cp "$ROOT/$f" "$DEST/"
    echo "copied $f"
  fi
done
echo "Done. Missing .wasm/.pck is normal until you export from Godot."
