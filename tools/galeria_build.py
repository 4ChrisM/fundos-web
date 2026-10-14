#!/usr/bin/env python3
"""Fotos de la ficha de cada proyecto en "Fundos en todo Chile" (galería que se despliega al tocar un fundo).

Arma assets/img/galeria/<proyecto>-<n>.webp (1000 px el lado más largo) y su miniatura <proyecto>-<n>-mini.webp (240 px) a partir
de material que ya está en el repo (vistas aéreas de los tours, portadas de los videos del cliente y satelitales) o
de fotos del cliente subidas a subidas/ (si el original ya no está, se deja lo convertido) y
deja la lista en `galeria` de cada proyecto en lib/manifest.js (eso se escribe a mano: ver FUENTES abajo). Las imágenes
con transparencia (satelital recortado del plano) se apoyan sobre el verde de la marca.

Uso: python3 tools/galeria_build.py
"""
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
V = "assets/entorno/videos/"
FUENTES = {
    "puerto-varas": ["assets/img/tour-puerto-varas-1600.webp", V + "osorno.webp", V + "calbuco.webp", V + "lago.webp",
                     V + "petrohue.webp", V + "frutillar.webp"],
    "malalcahuello": ["assets/img/tour-malalcahuello-1600.webp", "assets/planos/malalcahuello-satelite.webp",
                      "assets/entorno/malalcahuello/sat-detalle.webp"],
    "marchigue": ["assets/img/tour-marchigue-1600.webp", "assets/planos/marchigue-satelite.webp",
                  "assets/entorno/marchigue/sat-detalle.webp"],
}
# Fotos del cliente: se suben a subidas/ en la rama de trabajo como "NN. Nombre del fundo.ext" (el número da el orden;
# la primera de cada fundo es la del resumen bajo el carrusel). Los originales no van a main: tras convertirlas se borran
# y este script deja lo ya convertido. Los títulos (`alt`) se escriben a mano en `galeria` del manifiesto.
ALIAS = {"santo domingo": "santo-domingo", "rapel": "lago-rapel", "lago rapel": "lago-rapel", "bucalemu": "bucalemu",
         "talca": "talca", "retiro": "retiro", "san fabian": "san-fabian", "san fabial": "san-fabian",
         "cobquecura": "cobquecura", "liucura": "rio-liucura", "rio liucura": "rio-liucura", "rio negro": "rio-negro",
         "puerto montt": "puerto-montt"}


def subidas():
    import re
    import unicodedata
    out = {}
    for f in sorted((RAIZ / "subidas").glob("*"), key=lambda x: x.name):
        m = re.match(r"^(\d+)\.\s*(.+?)\.(webp|jpe?g|png)$", f.name, re.I)
        if not m:
            continue
        clave = unicodedata.normalize("NFD", m.group(2)).encode("ascii", "ignore").decode().lower().strip()
        if clave not in ALIAS:
            print("sin fundo:", f.name)
            continue
        out.setdefault(ALIAS[clave], []).append((int(m.group(1)), str(f.relative_to(RAIZ))))
    return {k: [f for _, f in sorted(v)] for k, v in out.items()}


def guardar(im, ancho, destino, calidad):
    lado = max(im.width, im.height)   # el lado más largo (las verticales no crecen de alto)
    if lado > ancho:
        im = im.resize((round(im.width * ancho / lado), round(im.height * ancho / lado)), Image.LANCZOS)
    im.save(destino, "WEBP", quality=calidad, method=6)


def main():
    out = RAIZ / "assets" / "img" / "galeria"
    out.mkdir(parents=True, exist_ok=True)
    for pid, fuentes in list(FUENTES.items()) + list(subidas().items()):
        for n, f in enumerate(fuentes, 1):
            if not (RAIZ / f).exists():   # original ya borrado: se deja lo convertido
                continue
            im = Image.open(RAIZ / f).convert("RGBA")
            fondo = Image.new("RGBA", im.size, (36, 56, 42, 255))
            fondo.alpha_composite(im)
            im = fondo.convert("RGB")
            guardar(im, 1000, out / f"{pid}-{n}.webp", 72)
            guardar(im, 240, out / f"{pid}-{n}-mini.webp", 62)
            print(pid, n, f)


if __name__ == "__main__":
    main()
