#!/bin/bash
# Build xiboplayer-release RPMs for multiple Fedora versions
# Usage: ./build.sh [version...]
# Default: builds for Fedora 43 and 44

set -euo pipefail

SPEC_DIR="$(cd "$(dirname "$0")" && pwd)"
VERSIONS=("${@:-43 44}")

# Setup rpmbuild tree
mkdir -p ~/rpmbuild/{SPECS,SOURCES,BUILD,RPMS,SRPMS}

# Copy sources
cp "$SPEC_DIR/xiboplayer.repo" ~/rpmbuild/SOURCES/
cp "$SPEC_DIR/../../rpm/RPM-GPG-KEY" ~/rpmbuild/SOURCES/RPM-GPG-KEY-xiboplayer

for ver in "${VERSIONS[@]}"; do
  echo "==> Building xiboplayer-release for Fedora $ver"
  rpmbuild -bb "$SPEC_DIR/xiboplayer-release.spec" --define "_version $ver"
done

echo ""
echo "Built:"
ls -la ~/rpmbuild/RPMS/noarch/xiboplayer-release-*.rpm
