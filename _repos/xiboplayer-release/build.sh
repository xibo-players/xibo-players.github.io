#!/bin/bash
# Build the xiboplayer-release RPM
# Usage: ./build.sh
#
# Output: ~/rpmbuild/RPMS/noarch/xiboplayer-release-43-1.fc43.noarch.rpm

set -euo pipefail

SPEC_DIR="$(cd "$(dirname "$0")" && pwd)"

# Setup rpmbuild tree
mkdir -p ~/rpmbuild/{SPECS,SOURCES,BUILD,RPMS,SRPMS}

# Copy sources
cp "$SPEC_DIR/xiboplayer.repo" ~/rpmbuild/SOURCES/
cp "$SPEC_DIR/../../rpm/RPM-GPG-KEY" ~/rpmbuild/SOURCES/RPM-GPG-KEY-xiboplayer

# Build
rpmbuild -bb "$SPEC_DIR/xiboplayer-release.spec"

echo ""
echo "Built:"
ls -la ~/rpmbuild/RPMS/noarch/xiboplayer-release-*.rpm
echo ""
echo "Install with:"
echo "  sudo dnf install ~/rpmbuild/RPMS/noarch/xiboplayer-release-43-1.fc43.noarch.rpm"
echo ""
echo "To publish, copy to the noarch repo dir:"
echo "  cp ~/rpmbuild/RPMS/noarch/xiboplayer-release-*.rpm ../rpm/fedora/43/noarch/"
echo "  cd ../rpm/fedora/43/noarch && createrepo_c --update ."
