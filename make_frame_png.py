"""Turn a frame JPEG with a solid white centre into a PNG with a transparent centre.

Flood-fills from the image centre over near-white pixels, then feathers the edge so the
anti-aliased rim blends instead of leaving a white halo.
usage: python make_frame_png.py frame.jpg frame.png
"""
import sys
from collections import deque
from PIL import Image, ImageDraw, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
w, h = im.size
px = im.load()
inside = bytearray(w * h)
q = deque([(w // 2, h // 2)])
while q:
    x, y = q.popleft()
    i = y * w + x
    if inside[i] or min(px[x, y]) < 200:
        continue
    inside[i] = 1
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not inside[ny * w + nx]:
            q.append((nx, ny))

mask = Image.frombytes("L", (w, h), bytes(255 if v else 0 for v in inside))
# grow the hole by ~1px and feather it to eat the light anti-aliasing fringe
mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
alpha = Image.eval(mask, lambda v: 255 - v)
# outside the ring (the white corners) is transparent too: keep only the disc
disc = Image.new("L", (w, h), 0)
ImageDraw.Draw(disc).ellipse((1, 1, w - 2, h - 2), fill=255)
out = im.convert("RGBA")
out.putalpha(Image.composite(alpha, Image.new("L", (w, h), 0), disc))
out.save(dst)
print(dst, out.size)
