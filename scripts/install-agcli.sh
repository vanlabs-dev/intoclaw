#!/usr/bin/env bash
set -euo pipefail

REPO="vanlabs-dev/intoclaw"
ARCH=$(uname -m)

case "$ARCH" in
  x86_64)  BINARY="agcli-linux-amd64" ;;
  *) echo "Unsupported architecture: $ARCH (only x86_64 has pre-built binaries, use cargo install for other architectures)"; exit 1 ;;
esac

echo "Downloading agcli for $ARCH..."
curl -fsSL "https://github.com/$REPO/releases/download/agcli-binaries/$BINARY" -o /tmp/agcli
chmod +x /tmp/agcli
sudo mv /tmp/agcli /usr/local/bin/agcli
echo "agcli installed: $(agcli --version)"
