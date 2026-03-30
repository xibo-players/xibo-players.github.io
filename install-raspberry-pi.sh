#!/bin/bash
# Xibo Player — Raspberry Pi Quick Install
# Installs xiboplayer-chromium on Raspberry Pi OS 64-bit (bookworm)
# or any Debian/Ubuntu-based system.
#
# Usage:
#   curl -fsSL https://dl.xiboplayer.org/install-raspberry-pi.sh | bash
set -euo pipefail

echo "Installing Xibo Player..."

# Detect distro
CODENAME=$(. /etc/os-release 2>/dev/null && printf '%s' "${VERSION_CODENAME:-noble}")
case "$CODENAME" in
  trixie)   SUITE="debian/trixie" ;;
  bookworm) SUITE="debian/12" ;;
  noble)    SUITE="ubuntu/24.04" ;;
  *)        SUITE="debian/trixie" ;;
esac
echo "Detected: $CODENAME → using APT suite $SUITE"

# Install GPG key
curl -fsSL https://dl.xiboplayer.org/deb/GPG-KEY.asc \
  | sudo tee /usr/share/keyrings/xiboplayer.asc > /dev/null

# Add APT source
cat <<EOF | sudo tee /etc/apt/sources.list.d/xiboplayer.sources
Types: deb
URIs: https://dl.xiboplayer.org/deb/${SUITE}
Suites: stable
Components: main
Signed-By: /usr/share/keyrings/xiboplayer.asc
EOF

sudo apt-get update
sudo apt-get install -y xiboplayer-chromium

echo ""
echo "Xibo Player installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Start the player:  xiboplayer-chromium"
echo "  2. Configure CMS URL in the setup screen"
echo "  3. Enable auto-start: systemctl --user enable --now xiboplayer-chromium.service"
echo ""
echo "Documentation: https://xiboplayer.org"
