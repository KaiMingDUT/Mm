"""Erase a baked-in title from a generated cover so it can be re-laid out.

usage: python3 erase_text.py IN.png OUT.png Y0 Y1   (Y0/Y1 = band as fraction of height)

Everything bright-white or bright-cyan inside the band is treated as text,
dilated, and inpainted from the surrounding background. Output is 1080x1920.
"""
import sys
import cv2
import numpy as np

src, dst, y0, y1 = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
im = cv2.imread(src)
im = cv2.resize(im, (1080, 1920), interpolation=cv2.INTER_CUBIC)
H = im.shape[0]
b, g, r = [im[..., i].astype(int) for i in range(3)]
white = np.minimum(np.minimum(b, g), r) > 150
cyan = (b > 150) & (g > 110) & (r < 140)
mask = np.zeros(im.shape[:2], np.uint8)
a, z = int(H * y0), int(H * y1)
mask[a:z] = ((white | cyan)[a:z] * 255).astype(np.uint8)
mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=6)
out = cv2.inpaint(im, mask, 9, cv2.INPAINT_TELEA)
cv2.imwrite(dst, out)
