"""Draw the app icons (a simple pot on terracotta) with only the standard library.

Run from the repository root:  python3 scripts/make_icons.py
"""
import os
import struct
import zlib

BG = (138, 75, 42)
FG = (244, 228, 208)
SS = 3  # supersampling per axis, for smooth edges


def inside_pot(x, y):
    """True when the unit-square point (x, y) lies on the pot."""
    body = ((x - 0.5) / 0.29) ** 2 + ((y - 0.6) / 0.25) ** 2 <= 1
    neck = 0.38 <= x <= 0.62 and 0.28 <= y <= 0.42
    rim = 0.33 <= x <= 0.67 and 0.23 <= y <= 0.30
    return body or neck or rim


def pixel(px, py, size, scale):
    hits = 0
    for sy in range(SS):
        for sx in range(SS):
            u = (px + (sx + 0.5) / SS) / size
            v = (py + (sy + 0.5) / SS) / size
            # scale about the centre so a maskable icon keeps its safe zone
            x = (u - 0.5) / scale + 0.5
            y = (v - 0.5) / scale + 0.5
            hits += inside_pot(x, y)
    t = hits / (SS * SS)
    return tuple(round(BG[i] + (FG[i] - BG[i]) * t) for i in range(3))


def write_png(path, size, scale=1.0):
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            row.extend(pixel(px, py, size, scale))
        rows.append(bytes(row))

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    out = os.path.join("public", "icons")
    os.makedirs(out, exist_ok=True)
    write_png(os.path.join(out, "icon-512.png"), 512)
    write_png(os.path.join(out, "icon-192.png"), 192)
    write_png(os.path.join(out, "apple-touch-icon.png"), 180)
    write_png(os.path.join(out, "icon-maskable-512.png"), 512, scale=0.75)
