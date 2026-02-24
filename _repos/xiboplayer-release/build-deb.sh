#!/bin/bash
# Build the xiboplayer-release .deb package
# Usage: ./build-deb.sh
#
# Uses dpkg-deb directly (no debuild needed, works on Fedora)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERSION="1.0.2"
PKG_NAME="xiboplayer-release"
PKG_DIR="/tmp/${PKG_NAME}_${VERSION}_all"

rm -rf "$PKG_DIR"

# Package structure
mkdir -p "$PKG_DIR/DEBIAN"
mkdir -p "$PKG_DIR/etc/apt/sources.list.d"
mkdir -p "$PKG_DIR/usr/share/keyrings"

# Control file
cat > "$PKG_DIR/DEBIAN/control" <<EOF
Package: ${PKG_NAME}
Version: ${VERSION}
Architecture: all
Maintainer: Pau Aliagas <linuxnow@gmail.com>
Description: Xibo Players repository configuration
 This package contains the Xibo Players APT repository configuration
 and the GPG key used to sign packages.
Homepage: https://dl.xiboplayer.org
Section: misc
Priority: optional
EOF

# Install sources list and GPG key
install -pm 0644 "$SCRIPT_DIR/xiboplayer.sources" "$PKG_DIR/etc/apt/sources.list.d/xiboplayer.sources"
install -pm 0644 "$SCRIPT_DIR/xiboplayer.gpg" "$PKG_DIR/usr/share/keyrings/xiboplayer.gpg"

# Build
dpkg-deb --build --root-owner-group "$PKG_DIR"

mv "/tmp/${PKG_NAME}_${VERSION}_all.deb" "$SCRIPT_DIR/"

echo ""
echo "Built: ${SCRIPT_DIR}/${PKG_NAME}_${VERSION}_all.deb"
echo ""
echo "Install with:"
echo "  sudo apt install ./${PKG_NAME}_${VERSION}_all.deb"
echo ""
echo "To publish, copy to the deb repo dir:"
echo "  cp ${PKG_NAME}_${VERSION}_all.deb ../../deb/ubuntu/24.04/all/"
echo "  Then rebuild deb repo metadata"
