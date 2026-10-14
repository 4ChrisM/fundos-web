#!/usr/bin/env python3
"""Fotos de la ficha de cada proyecto en "Fundos en todo Chile" (galería que se despliega al tocar un fundo).

Arma assets/img/galeria/<proyecto>-<n>.webp (1000 px de ancho) y su miniatura <proyecto>-<n>-mini.webp (240 px) a partir
de material que ya está en el repo (vistas aéreas de los tours, portadas de los videos del cliente y satelitales) y
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


def guardar(im, ancho, destino, calidad):
    if im.width > ancho:
        im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    im.save(destino, "WEBP", quality=calidad, method=6)


def main():
    out = RAIZ / "assets" / "img" / "galeria"
    out.mkdir(parents=True, exist_ok=True)
    for pid, fuentes in FUENTES.items():
        for n, f in enumerate(fuentes, 1):
            im = Image.open(RAIZ / f).convert("RGBA")
            fondo = Image.new("RGBA", im.size, (36, 56, 42, 255))
            fondo.alpha_composite(im)
            im = fondo.convert("RGB")
            guardar(im, 1000, out / f"{pid}-{n}.webp", 74)
            guardar(im, 240, out / f"{pid}-{n}-mini.webp", 62)
            print(pid, n, f)


if __name__ == "__main__":
    main()
