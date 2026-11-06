"""Writes the app icons in public/icons (pure Python, no image library).

Palette: amber background, a dark-ink pot with a warm-paper mouth.
"""
import struct
import zlib

AMBER = (0xFF, 0xBF, 0x00)
PAPER = (0xF5, 0xF3, 0xDC)
INK = (0x2B, 0x21, 0x1B)
SAMPLES = 3  # SAMPLES x SAMPLES samples per pixel, for smooth edges


def colour_at(x, y, k):
    """x, y are in 0..1 units of the icon; k scales the glyph about the centre."""
    x = (x - 0.5) / k + 0.5
    y = (y - 0.5) / k + 0.5 + 0.01  # the glyph spans y 0.22..0.80, so nudge it to the centre
    body = 0.22 <= x <= 0.78 and 0.36 <= y <= 0.80
    # round the bottom corners
    if body and y > 0.66:
        cx = 0.36 if x < 0.5 else 0.64
        if abs(x - 0.5) > 0.14 and (x - cx) ** 2 + (y - 0.66) ** 2 > 0.14 ** 2:
            body = False
    neck = 0.34 <= x <= 0.66 and 0.22 <= y <= 0.38
    if not (body or neck):
        return AMBER
    if 0.40 <= x <= 0.60 and 0.27 <= y <= 0.35:
        return PAPER
    return INK


def pixel(px, py, size, k):
    total = [0, 0, 0]
    for sy in range(SAMPLES):
        for sx in range(SAMPLES):
            c = colour_at((px + (sx + 0.5) / SAMPLES) / size, (py + (sy + 0.5) / SAMPLES) / size, k)
            for i in range(3):
                total[i] += c[i]
    n = SAMPLES * SAMPLES
    return bytes(round(t / n) for t in total)


def png(path, size, k):
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            row += pixel(px, py, size, k)
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
png("public/icons/icon-maskable-512.png", 512, 0.7)  # glyph inside the maskable safe zone
png("public/icons/apple-touch-icon.png", 180, 1.0)
