#!/usr/bin/env bash
#
# Fast deployment script to push GL.iNet Feature Suite overlay to a running OpenWrt router over SSH
# Usage: ./deploy-overlay.sh [ROUTER_IP] [SSH_PORT]
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROUTER_IP="${1:-192.168.8.1}"
SSH_PORT="${2:-22}"
OVERLAY_FILES="${SCRIPT_DIR}/files"

echo "=== Deploying GL.iNet Overlay to root@${ROUTER_IP}:${SSH_PORT} ==="

if ! command -v ssh >/dev/null 2>&1; then
    echo "Error: ssh command not found on host." >&2
    exit 1
fi

echo "[1/4] Transferring overlay files to router rootfs..."
tar -C "${OVERLAY_FILES}" -cf - . | ssh -p "${SSH_PORT}" "root@${ROUTER_IP}" "tar -C / -xvf -"

if [[ -d "${SCRIPT_DIR}/packages" && $(ls -A "${SCRIPT_DIR}/packages"/*.apk 2>/dev/null) ]]; then
    echo "[1.5/4] Installing pre-compiled packages on router via apk..."
    tar -C "${SCRIPT_DIR}/packages" -cf - . | ssh -p "${SSH_PORT}" "root@${ROUTER_IP}" '
        cp /etc/apk/world /tmp/world.pre &&
        mkdir -p /tmp/gl-pkgs &&
        tar -C /tmp/gl-pkgs -xf - &&
        apk add --allow-untrusted --force-non-repository /tmp/gl-pkgs/*.apk;
        sed -i "s/><.*$//" /etc/apk/world;
        for pkg in base-files kernel libc; do
            pin=$(grep -E "^${pkg}=" /tmp/world.pre | head -n1)
            [ -n "$pin" ] && sed -i "s|^${pkg}$|${pin}|" /etc/apk/world
        done;
        rm -rf /tmp/gl-pkgs /tmp/world.pre
    ' || true
fi

echo "[2/4] Setting script execution permissions..."
ssh -p "${SSH_PORT}" "root@${ROUTER_IP}" "chmod 755 /usr/sbin/gl-* /etc/rc.button/* /etc/gl-switch.d/* /etc/init.d/gl-* /etc/hotplug.d/iface/* 2>/dev/null || true"

echo "[3/4] Running initial uci-defaults setup..."
ssh -p "${SSH_PORT}" "root@${ROUTER_IP}" "/bin/sh /etc/uci-defaults/99-glinet-defaults || true"

echo "[4/4] Restarting rpcd, uhttpd, and GL daemons..."
ssh -p "${SSH_PORT}" "root@${ROUTER_IP}" "/etc/init.d/rpcd restart; /etc/init.d/uhttpd restart; /etc/init.d/gl-led restart; /etc/init.d/gl-mwan restart; /etc/init.d/gl-repeater restart; /etc/init.d/gl-vpnpolicy restart"

echo "=== DEPLOYMENT COMPLETE ==="
echo "Navigate to http://${ROUTER_IP}/cgi-bin/luci/admin/glinet/dashboard"
