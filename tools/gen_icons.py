# Genereert de PWA-iconen: kompas-silhouet, koper op paper.
# Pure Python (zlib/struct), geen dependencies.
import struct, zlib, os

PAPER = (247, 245, 240)   # #f7f5f0
COPPER = (196, 125, 44)   # #c47d2c

def cross(ox, oy, ax, ay, bx, by):
    return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox)

def in_tri(px, py, a, b, c):
    d1 = cross(a[0], a[1], b[0], b[1], px, py)
    d2 = cross(b[0], b[1], c[0], c[1], px, py)
    d3 = cross(c[0], c[1], a[0], a[1], px, py)
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)

def make_shape(size):
    cx = cy = size / 2.0
    r_out = 0.46 * size
    r_in = r_out - 0.062 * size
    hub = 0.075 * size
    long_l = 0.36 * size
    short_l = 0.26 * size
    w = 0.085 * size
    tris = []
    for (dx, dy, L) in ((0, -1, long_l), (0, 1, long_l), (1, 0, short_l), (-1, 0, short_l)):
        tip = (cx + dx * L, cy + dy * L)
        # basis loodrecht op de richting
        bx, by = -dy * w, dx * w
        tris.append((tip, (cx + bx, cy + by), (cx - bx, cy - by)))

    def covered(px, py):
        ddx, ddy = px - cx, py - cy
        d2 = ddx * ddx + ddy * ddy
        if r_in * r_in <= d2 <= r_out * r_out:
            return True
        if d2 <= hub * hub:
            return True
        for t in tris:
            if in_tri(px, py, *t):
                return True
        return False
    return covered

def render(size):
    covered = make_shape(size)
    ss = 3  # 3x3 supersampling
    rows = []
    for y in range(size):
        row = bytearray([0])  # filter type 0
        for x in range(size):
            hits = 0
            for sy in range(ss):
                for sx in range(ss):
                    px = x + (sx + 0.5) / ss
                    py = y + (sy + 0.5) / ss
                    if covered(px, py):
                        hits += 1
            a = hits / (ss * ss)
            for i in range(3):
                row.append(round(PAPER[i] + (COPPER[i] - PAPER[i]) * a))
        rows.append(bytes(row))
    return b"".join(rows)

def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

def write_png(path, size):
    raw = render(size)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(path, size, "ok")

out = os.path.join(os.path.dirname(__file__), "..")
write_png(os.path.join(out, "icon-192.png"), 192)
write_png(os.path.join(out, "icon-512.png"), 512)
write_png(os.path.join(out, "apple-touch-icon.png"), 180)
