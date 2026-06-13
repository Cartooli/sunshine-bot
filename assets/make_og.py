#!/usr/bin/env python3
"""Render the Sunshine Bot OG image (1280x640) with a real sunrise gradient."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 640
FONT = "/usr/share/fonts/truetype/dejavu"

def font(name, size):
    return ImageFont.truetype(f"{FONT}/{name}", size)

def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

# Vertical sunrise gradient: deep dusk -> plum -> warm amber.
top, mid, bot = (28, 23, 64), (104, 49, 92), (255, 132, 61)
img = Image.new("RGB", (W, H), top)
px = img.load()
for y in range(H):
    t = y / (H - 1)
    c = lerp(top, mid, t / 0.55) if t < 0.55 else lerp(mid, bot, (t - 0.55) / 0.45)
    for x in range(W):
        px[x, y] = c
draw = ImageDraw.Draw(img, "RGBA")

# Sun with soft glow.
cx, cy, r = 980, 320, 150
for gr in range(r + 90, r, -2):
    a = int(90 * (1 - (gr - r) / 90))
    draw.ellipse([cx - gr, cy - gr, cx + gr, cy + gr], fill=(255, 211, 107, max(a, 0)))
for i in range(r, 0, -1):
    t = i / r
    c = lerp((255, 179, 71), (255, 243, 196), t)
    draw.ellipse([cx - i, cy - i, cx + i, cy + i], fill=c + (255,))

# Rays.
import math
for k in range(8):
    ang = math.radians(k * 45)
    x1, y1 = cx + math.cos(ang) * (r + 26), cy + math.sin(ang) * (r + 26)
    x2, y2 = cx + math.cos(ang) * (r + 74), cy + math.sin(ang) * (r + 74)
    draw.line([x1, y1, x2, y2], fill=(255, 211, 107, 220), width=10)

# Title + tagline.
draw.text((90, 150), "Sunshine Bot", font=font("DejaVuSans-Bold.ttf", 96), fill=(255, 255, 255))
draw.text((92, 270), "Specific, earned praise — read from your own git history.",
          font=font("DejaVuSans.ttf", 33), fill=(255, 231, 194))

# Sample compliment chip.
draw.rounded_rectangle([90, 360, 800, 516], radius=18, fill=(0, 0, 0, 80))
draw.text((118, 380), "simplicity · a6b639b", font=font("DejaVuSansMono.ttf", 24), fill=(255, 211, 107))
draw.text((118, 420), '"Chose subtraction — deleting code is', font=font("DejaVuSans.ttf", 25), fill=(255, 255, 255))
draw.text((118, 454), 'underrated craft."', font=font("DejaVuSans.ttf", 25), fill=(255, 255, 255))

# Footer.
draw.text((90, 575), "github.com/dwellchecker/sunshine-bot",
          font=font("DejaVuSans.ttf", 25), fill=(255, 231, 194))

img.save("og-image.png")
print("wrote og-image.png", img.size)
