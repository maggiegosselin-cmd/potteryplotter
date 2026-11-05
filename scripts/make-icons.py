"""Writes the app icons in public/icons (pure Python, no image library)."""
import struct
import zlib

BG = (181, 88, 58)
CREAM = (244, 230, 208)


def inside_pot(x, y, k):
    """x, y, k are in 0..1 units of the icon; k scales the glyph about the centre."""
    x = (x - 0.5) / k + 0.5
    y = (y - 0.5) / k + 0.5
    body = 0.22 <= x <= 0.78 and 0.36 <= y <= 0.80
    # round the bottom corners
    if body and y > 0.66:
        cx = 0.36 if x < 0.5 else 0.64
        if abs(x - 0.5) > 0.14 and (x - cx) ** 2 + (y - 0.66) ** 2 > 0.14 ** 2:
            body = False
    neck = 0.34 <= x <= 0.66 and 0.22 <= y <= 0.38
    mouth = 0.40 <= x <= 0.60 and 0.27 <= y <= 0.35
    return (body or neck) and not mouth


def png(path, size, k):
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            c = CREAM if inside_pot((px + 0.5) / size, (py + 0.5) / size, k) else BG
            row += bytes(c)
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    data = b"\x89PNG\r\n\x1a\n"
    data += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    data += chunk(b"IDAT", zlib.compress(raw, 9))
    data += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(data)


png("public/icons/icon-192.png", 192, 1.0)
png("public/icons/icon-512.png", 512, 1.0)
png("public/icons/icon-maskable-512.png", 512, 0.7)
png("public/icons/apple-touch-icon.png", 180, 1.0)
