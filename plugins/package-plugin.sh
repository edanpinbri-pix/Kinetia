#!/bin/bash
# package-plugin.sh — Packages ae-kinetia as a signed .zxp
# Requires ZXPSignCmd in PATH (download from Adobe Exchange)
#
# Usage:  bash plugins/package-plugin.sh
# Output: plugins/kinetia.zxp

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$DIR/ae-kinetia"
CERT_FILE="$DIR/kinetia-cert.p12"
CERT_PASS="kinetia2026"
OUTPUT="$DIR/kinetia.zxp"

# Generate self-signed cert if not present
if [ ! -f "$CERT_FILE" ]; then
  echo "→ Generating self-signed certificate..."
  ZXPSignCmd -selfSignedCert US CA Kinetia kinetia "$CERT_PASS" "$CERT_FILE"
fi

# Remove old .zxp
[ -f "$OUTPUT" ] && rm "$OUTPUT"

# Sign and package
echo "→ Packaging $PLUGIN_DIR → $OUTPUT"
ZXPSignCmd -sign "$PLUGIN_DIR" "$OUTPUT" "$CERT_FILE" "$CERT_PASS" \
  -tsa http://timestamp.digicert.com

echo "✓ Done: $OUTPUT"
echo ""
echo "Install with ZXP Installer (aescripts.com/zxpinstaller)"
echo "Or copy ae-kinetia/ directly to:"
echo "  Mac: ~/Library/Application Support/Adobe/CEP/extensions/com.kinetia.panel"
echo "  Win: %APPDATA%\\Adobe\\CEP\\extensions\\com.kinetia.panel"
