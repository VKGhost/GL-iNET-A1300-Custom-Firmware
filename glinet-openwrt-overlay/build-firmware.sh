#!/usr/bin/env bash
#
# Build script to repack OpenWrt 25.12.6 vanilla sysupgrade image with GL.iNet Feature Suite overlay
# Target: GL.iNet GL-A1300 (Slate Plus) [ipq40xx/generic]
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -n "${1:-}" ]]; then
    VANILLA_IMG="$1"
else
    VANILLA_IMG="$(find "${BASE_DIR}/openwrt" -maxdepth 1 -type f -name 'openwrt-*-glinet_gl-a1300-squashfs-sysupgrade*.bin' 2>/dev/null | sort | head -n1 || true)"
    if [[ -z "${VANILLA_IMG}" ]]; then
        VANILLA_IMG="${BASE_DIR}/openwrt/openwrt-25.12.6-ipq40xx-generic-glinet_gl-a1300-squashfs-sysupgrade.bin"
    fi
fi
OUTPUT_DIR="${BASE_DIR}/output"
OUTPUT_BIN="${OUTPUT_DIR}/openwrt-25.12.6-ipq40xx-generic-glinet_gl-a1300-with-glinet-suite.bin"
OVERLAY_FILES="${SCRIPT_DIR}/files"

echo "=========================================================="
echo " GL.iNet GL-A1300 OpenWrt 25.12 Custom Firmware Repacker"
echo "=========================================================="
echo "Base image:    ${VANILLA_IMG}"
echo "Overlay files: ${OVERLAY_FILES}"
echo "Output image:  ${OUTPUT_BIN}"

if [[ ! -f "${VANILLA_IMG}" ]]; then
    echo "Error: Vanilla OpenWrt sysupgrade image not found at ${VANILLA_IMG}" >&2
    echo "Download it first:" >&2
    echo "  mkdir -p \"${BASE_DIR}/openwrt\"" >&2
    echo "  curl -fL -o \"${BASE_DIR}/openwrt/openwrt-25.12.6-ipq40xx-generic-glinet_gl-a1300-squashfs-sysupgrade.bin\" \\" >&2
    echo "    https://downloads.openwrt.org/releases/25.12.6/targets/ipq40xx/generic/openwrt-25.12.6-ipq40xx-generic-glinet_gl-a1300-squashfs-sysupgrade.bin" >&2
    exit 1
fi

if [[ ! -d "${OVERLAY_FILES}" ]]; then
    echo "Error: Overlay files directory not found at ${OVERLAY_FILES}" >&2
    exit 1
fi

BUILD_DIR="$(mktemp -d /tmp/gl-build-XXXXXX)"
trap 'rm -rf "${BUILD_DIR}"' EXIT

mkdir -p "${OUTPUT_DIR}"

echo "[1/6] Extracting sysupgrade tar archive..."
tar -xf "${VANILLA_IMG}" -C "${BUILD_DIR}"

SUBDIR=$(find "${BUILD_DIR}" -mindepth 1 -maxdepth 1 -type d | head -n1)
if [[ -z "${SUBDIR}" || ! -f "${SUBDIR}/root" ]]; then
    echo "Error: Failed to find sysupgrade directory or root squashfs in image" >&2
    exit 1
fi

echo "[2/6] Unsquashing rootfs..."
UNSQUASH_DIR="${BUILD_DIR}/rootfs"
# Ignore dev/console creation error code (2) for non-root users
unsquashfs -d "${UNSQUASH_DIR}" "${SUBDIR}/root" >/dev/null 2>&1 || true

PACKAGES_DIR="${SCRIPT_DIR}/packages"
if [[ -d "${PACKAGES_DIR}" && $(ls -A "${PACKAGES_DIR}"/*.apk 2>/dev/null) ]]; then
    echo "[2.5/6] Installing offline packages (WireGuard, OpenVPN, Tethering, SQM, etc.)..."
    cp "${UNSQUASH_DIR}/etc/apk/world" "${BUILD_DIR}/world.vanilla"
    qemu-arm -E LD_LIBRARY_PATH="${UNSQUASH_DIR}/usr/lib:${UNSQUASH_DIR}/lib" \
             -L "${UNSQUASH_DIR}" \
             "${UNSQUASH_DIR}/usr/bin/apk" \
             --root "${UNSQUASH_DIR}" \
             --no-scripts --no-network --allow-untrusted --force-non-repository \
             add "${PACKAGES_DIR}"/*.apk >/dev/null

    # Passing local .apk paths to 'apk add' writes SHA1 hash pins (pkg><Q1...=) into
    # /etc/apk/world, which freezes base libraries (e.g. libucode, libubox) during future
    # 'apk upgrade' runs and causes ABI/symbol crashes (502 Bad Gateway in LuCI).
    # Strip all hash pins and restore only the vanilla image's exact '=' pins (base-files, kernel, libc).
    python3 - "${BUILD_DIR}/world.vanilla" "${UNSQUASH_DIR}/etc/apk/world" <<'PYEOF'
import sys

vanilla_path, world_path = sys.argv[1], sys.argv[2]
vanilla_pins = {}
with open(vanilla_path) as f:
    for line in f:
        s = line.strip()
        if "=" in s and "><" not in s:
            name = s.split("=", 1)[0]
            vanilla_pins[name] = s

cleaned = []
seen = set()
with open(world_path) as f:
    for line in f:
        s = line.strip()
        if not s:
            continue
        if "><" in s:
            s = s.split("><", 1)[0]
        name = s.split("=", 1)[0]
        entry = vanilla_pins.get(name, s)
        if entry not in seen:
            seen.add(entry)
            cleaned.append(entry)

with open(world_path, "w") as f:
    for entry in sorted(cleaned):
        f.write(entry + "\n")
PYEOF
fi

echo "[3/6] Extracting fwtool metadata from base image..."
META_FILE="${BUILD_DIR}/metadata.json"
qemu-arm -L "${UNSQUASH_DIR}" "${UNSQUASH_DIR}/usr/bin/fwtool" -i "${META_FILE}" "${VANILLA_IMG}"

echo "[4/6] Copying GL.iNet overlay files into rootfs..."
cp -a "${OVERLAY_FILES}"/* "${UNSQUASH_DIR}/"

# Ensure script permissions
chmod 755 "${UNSQUASH_DIR}/usr/sbin/"* 2>/dev/null || true
chmod 755 "${UNSQUASH_DIR}/etc/rc.button/"* 2>/dev/null || true
chmod 755 "${UNSQUASH_DIR}/etc/gl-switch.d/"* 2>/dev/null || true
chmod 755 "${UNSQUASH_DIR}/etc/init.d/"* 2>/dev/null || true
chmod 644 "${UNSQUASH_DIR}/etc/uci-defaults/"* 2>/dev/null || true

echo "[5/6] Building new squashfs filesystem with xz compression..."
rm -f "${SUBDIR}/root"
mksquashfs "${UNSQUASH_DIR}" "${SUBDIR}/root" \
    -comp xz -b 256k -noappend -root-owned \
    -p '/dev d 755 0 0' -p '/dev/console c 600 0 0 5 1' >/dev/null

echo "[6/6] Packing sysupgrade tar and signing with fwtool..."
TAR_DIR_NAME="$(basename "${SUBDIR}")"
tar -C "${BUILD_DIR}" -cf "${OUTPUT_BIN}" "${TAR_DIR_NAME}"

qemu-arm -L "${UNSQUASH_DIR}" "${UNSQUASH_DIR}/usr/bin/fwtool" -I "${META_FILE}" "${OUTPUT_BIN}"

# Verify metadata readback
echo "Verifying firmware metadata..."
qemu-arm -L "${UNSQUASH_DIR}" "${UNSQUASH_DIR}/usr/bin/fwtool" -i - "${OUTPUT_BIN}" >/dev/null

FINAL_SIZE=$(stat -c%s "${OUTPUT_BIN}")

UBOOT_IMG="${OUTPUT_DIR}/openwrt-25.12.6-ipq40xx-generic-glinet_gl-a1300-with-glinet-suite_uboot.img"
echo "[7/7] Generating U-Boot Web Failsafe UBI image (${UBOOT_IMG})..."
python3 - "${SUBDIR}/kernel" "${SUBDIR}/root" "${UBOOT_IMG}" <<'PYEOF'
import struct, zlib, math, sys

kernel_path, rootfs_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
PEB_SIZE = 0x20000
VID_OFS  = 2048
DATA_OFS = 4096
LEB_SIZE = PEB_SIZE - DATA_OFS
IMAGE_SEQ = 0x620d5e96

def ubi_crc32(buf):
    return (~zlib.crc32(buf)) & 0xffffffff

def make_ec_hdr(image_seq=IMAGE_SEQ):
    hdr = struct.pack(">4sB3sQIII32s", b"UBI#", 1, b"\x00"*3, 0, VID_OFS, DATA_OFS, image_seq, b"\x00"*32)
    return hdr + struct.pack(">I", ubi_crc32(hdr))

def make_vid_hdr(vol_id, lnum, vtype=1, compat=0):
    hdr = struct.pack(">4sBBBBII4sIIII4sQ12s", b"UBI!", 1, vtype, 0, compat, vol_id, lnum, b"\x00"*4, 0, 0, 0, 0, b"\x00"*4, 0, b"\x00"*12)
    return hdr + struct.pack(">I", ubi_crc32(hdr))

def make_vtbl_rec(name, reserved_pebs, vol_type=1, flags=0, align=1, data_pad=0):
    if name:
        name_bytes = name.encode("ascii")
        name_len = len(name_bytes)
        name_field = name_bytes + b"\x00" * (128 - name_len)
    else:
        name_len = 0
        name_field = b"\x00" * 128
    rec = struct.pack(">IIIBBH128sB23s", reserved_pebs, align, data_pad, vol_type, 0, name_len, name_field, flags, b"\x00"*23)
    return rec + struct.pack(">I", ubi_crc32(rec))

def make_peb(ec_hdr, vid_hdr, payload):
    buf = bytearray(b"\xff" * PEB_SIZE)
    buf[0:64] = ec_hdr
    buf[VID_OFS:VID_OFS+64] = vid_hdr
    buf[DATA_OFS:DATA_OFS+len(payload)] = payload
    return bytes(buf)

with open(kernel_path, "rb") as fk: kernel_data = fk.read()
with open(rootfs_path, "rb") as fr: rootfs_data = fr.read()

# Trim trailing 0x00 mksquashfs block padding so unused NAND bytes remain 0xFF (matches official OpenWrt ubinize)
if rootfs_data[:4] == b"hsqs":
    sq_used = int.from_bytes(rootfs_data[40:48], "little")
    if sq_used <= len(rootfs_data) and all(b == 0 for b in rootfs_data[sq_used:]):
        rootfs_data = rootfs_data[:sq_used]

kern_pebs = math.ceil(len(kernel_data) / LEB_SIZE)
root_pebs = math.ceil(len(rootfs_data) / LEB_SIZE)

vtbl = bytearray()
vtbl += make_vtbl_rec("kernel", kern_pebs, vol_type=1, flags=0, align=1)
vtbl += make_vtbl_rec("rootfs", root_pebs, vol_type=1, flags=0, align=1)
vtbl += make_vtbl_rec("rootfs_data", 9, vol_type=1, flags=1, align=1)
# Empty volume table records MUST be all-zero (align=0, CRC=0xf116c36b) to pass UBI vtbl_check()
for _ in range(3, 128):
    vtbl += make_vtbl_rec("", 0, vol_type=0, flags=0, align=0)

ec = make_ec_hdr()
with open(out_path, "wb") as f:
    f.write(make_peb(ec, make_vid_hdr(0x7fffefff, 0, vtype=1, compat=5), vtbl))
    f.write(make_peb(ec, make_vid_hdr(0x7fffefff, 1, vtype=1, compat=5), vtbl))
    for lnum in range(kern_pebs):
        f.write(make_peb(ec, make_vid_hdr(0, lnum, vtype=1, compat=0), kernel_data[lnum*LEB_SIZE:(lnum+1)*LEB_SIZE]))
    for lnum in range(root_pebs):
        f.write(make_peb(ec, make_vid_hdr(1, lnum, vtype=1, compat=0), rootfs_data[lnum*LEB_SIZE:(lnum+1)*LEB_SIZE]))
PYEOF
UBOOT_SIZE=$(stat -c%s "${UBOOT_IMG}")

echo "=========================================================="
echo " BUILD SUCCESSFUL!"
echo " Sysupgrade Image (LuCI/SSH): ${OUTPUT_BIN} (${FINAL_SIZE} bytes)"
echo " U-Boot Failsafe UBI Image:   ${UBOOT_IMG} (${UBOOT_SIZE} bytes)"
echo "=========================================================="
