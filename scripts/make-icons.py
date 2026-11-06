"""Writes the app icons in public/icons (pure Python, no image library).

Palette: amber background, a solid deep-purple mug (no black anywhere).
"""
import struct
import zlib

AMBER = (0xFF, 0xBF, 0x00)
PURPLE = (0x6A, 0x3F, 0xA0)
SAMPLES = 3  # SAMPLES x SAMPLES samples per pixel, for smooth edges


def in_round_rect(x, y, x0, y0, x1, y1, r_base=0.0, r_right=0.0):
    """True if (x, y) is inside the box.

    r_base rounds both bottom corners; r_right rounds the two right-hand corners.
    """
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    corners = (
        (x0 + r_base, y1 - r_base, r_base, x < x0 + r_base and y > y1 - r_base),
        (x1 - r_base, y1 - r_base, r_base, x > x1 - r_base and y > y1 - r_base),
        (x1 - r_right, y0 + r_right, r_right, x > x1 - r_right and y < y0 + r_right),
    )
    if r_right:
        # the right-hand corners are the rounded ones, not the base
        corners = (
            (x1 - r_right, y1 - r_right, r_right, x > x1 - r_right and y > y1 - r_right),
            corners[2],
        )
    return all(not inside or (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2 for cx, cy, r, inside in corners)


def colour_at(x, y, k):
    """x, y are in 0..1 units of the icon; k scales the glyph about the centre.

    The mug (body plus handle) spans x 0.215..0.785 and y 0.245..0.755, so it is centred.
    """
    x = (x - 0.5) / k + 0.5
    y = (y - 0.5) / k + 0.5
    # body: straight sides, open top, rounded base
    body = in_round_rect(x, y, 0.215, 0.245, 0.615, 0.755, r_base=0.12)
    # handle on the right: a rounded ring, its opening left as ground
    outer = in_round_rect(x, y, 0.58, 0.32, 0.785, 0.57, r_right=0.08)
    inner = in_round_rect(x, y, 0.58, 0.385, 0.715, 0.505, r_right=0.03)
    handle = outer and not inner
    return PURPLE if (body or handle) else AMBER


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
