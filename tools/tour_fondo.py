"""Fondo del recorrido 360°: proyecta las caras de un cubo 3DVista a una vista rectilínea.

Las caras salen del propio tour: media/panorama_<ID>_0/{f,r,b,l,u,d}/3/{fila}_{col}.webp (nivel 3 = 2x2 teselas de
512 px). Guardarlas en <carpeta>/l3/<cara>_<fila>_<col>.webp y correr:
  python3 tools/tour_fondo.py <carpeta> <giro> <inclinación> <campo> 1600 1000 salida.png
Usados: Malalcahuello 20 -14 100 · Marchigüe 15 -16 100 · Puerto Varas -12 -9 100. Luego WebP 1600, 800 y miniatura
160 px cuadrada (assets/img/tour-ID-*), referidos en tourFoto del manifiesto.
"""
import sys, math, numpy as np
from PIL import Image

def caras(d):
    F = {}
    for f in "frblud":
        im = Image.new("RGB", (1024, 1024))
        for r in range(2):
            for c in range(2):
                im.paste(Image.open(f"{d}/l3/{f}_{r}_{c}.webp").convert("RGB"), (c * 512, r * 512))
        F[f] = np.asarray(im).astype(np.float32)
    return F

def vista(F, yaw, pitch, hfov, W, H):
    f = (W / 2) / math.tan(math.radians(hfov) / 2)
    xs = (np.arange(W) - W / 2 + .5) / f
    ys = -(np.arange(H) - H / 2 + .5) / f
    x, y = np.meshgrid(xs, ys); z = np.ones_like(x)
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
    y, z = y * cp + z * sp, -y * sp + z * cp
    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    x, z = x * cy + z * sy, -x * sy + z * cy
    ax, ay, az = np.abs(x), np.abs(y), np.abs(z)
    out = np.zeros((H, W, 3), np.float32)
    N = 1024
    def put(m, face, u, v):
        px = np.clip(((u + 1) / 2 * N - .5), 0, N - 1); py = np.clip(((v + 1) / 2 * N - .5), 0, N - 1)
        x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int); x1 = np.minimum(x0 + 1, N - 1); y1 = np.minimum(y0 + 1, N - 1)
        fx = (px - x0)[..., None]; fy = (py - y0)[..., None]; I = F[face]
        val = I[y0, x0] * (1 - fx) * (1 - fy) + I[y0, x1] * fx * (1 - fy) + I[y1, x0] * (1 - fx) * fy + I[y1, x1] * fx * fy
        out[m] = val[m]
    m = (az >= ax) & (az >= ay) & (z > 0); put(m, "f", x / az, -y / az)
    m = (az >= ax) & (az >= ay) & (z <= 0); put(m, "b", -x / az, -y / az)
    m = (ax > az) & (ax >= ay) & (x > 0); put(m, "r", -z / ax, -y / ax)
    m = (ax > az) & (ax >= ay) & (x <= 0); put(m, "l", z / ax, -y / ax)
    m = (ay > ax) & (ay > az) & (y > 0); put(m, "u", x / ay, z / ay)
    m = (ay > ax) & (ay > az) & (y <= 0); put(m, "d", x / ay, -z / ay)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

if __name__ == "__main__":
    d, yaw, pitch, hfov, W, H, out = sys.argv[1], *map(float, sys.argv[2:5]), *map(int, sys.argv[5:7]), sys.argv[7]
    vista(caras(d), yaw, pitch, hfov, W, H).save(out, quality=88)
