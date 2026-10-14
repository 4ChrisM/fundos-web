#!/usr/bin/env python3
"""Mapa de Chile completo por regiones para la sección "Fundos en todo Chile" (lib/mapa-chile.js).

Fuente: límites regionales de la Biblioteca del Congreso Nacional de Chile (BCN, Mapas Vectoriales), en GeoJSON
tal como los publica github.com/fcortes/Chile-GeoJSON (Regional.geojson, lon/lat). Se simplifican con shapely y se
proyectan en equirectangular (x = (lon − LON0) · cos 37,5° · K, y = (−lat − LAT0) · K), así el sitio puede ubicar
cualquier proyecto con su lat/lon con la misma fórmula (`proy` en el archivo generado).

Chile continental de Arica a Magallanes (el cliente quiere ver el país completo aunque no haya proyectos en todo
Chile), sin islas oceánicas ni islotes chicos. El sitio lo muestra entero y además en grande alrededor de cada fundo
(la "lupa" de la Sala de cine), por eso se simplifica poco.

Uso: python3 tools/mapa_chile_build.py [ruta/Regional.geojson]   (sin ruta, lo baja de GitHub)
Requiere: pip install shapely
"""
import json
import math
import sys
import urllib.request
from pathlib import Path

from shapely.geometry import box, shape

RAIZ = Path(__file__).resolve().parent.parent
URL = "https://raw.githubusercontent.com/fcortes/Chile-GeoJSON/master/Regional.geojson"
LAT0, LAT1 = 17.3, 56.1            # grados sur
LON0, LON1 = -76.0, -66.0
K = 20.0                          # unidades por grado de latitud
C = math.cos(math.radians(37.5))

NOMBRES = {
    15: "Arica y Parinacota", 1: "Tarapacá", 2: "Antofagasta", 3: "Atacama", 4: "Coquimbo", 5: "Valparaíso",
    13: "Metropolitana", 6: "O'Higgins", 7: "Maule", 16: "Ñuble", 8: "Biobío", 9: "La Araucanía", 14: "Los Ríos",
    10: "Los Lagos", 11: "Aysén", 12: "Magallanes",
}


def xy(lon, lat):
    return [round((lon - LON0) * C * K, 1), round((-lat - LAT0) * K, 1)]


def anillos(geom, f, min_area):
    out = []
    polys = [geom] if geom.geom_type == "Polygon" else list(getattr(geom, "geoms", []))
    for p in polys:
        if p.is_empty or p.area < min_area:
            continue
        out.append([f(x, y) for x, y in list(p.exterior.coords)[:-1]])
    return out


def main():
    fuente = sys.argv[1] if len(sys.argv) > 1 else None
    data = json.load(open(fuente, encoding="utf-8")) if fuente else json.load(urllib.request.urlopen(URL))
    regiones = []
    recorte = box(LON0, -LAT1, LON1, -LAT0)
    for ft in data["features"]:
        cod = ft["properties"].get("codregion")
        if cod not in NOMBRES:
            continue
        d = shape(ft["geometry"]).buffer(0).intersection(recorte)
        if d.is_empty:
            continue
        r = anillos(d.simplify(0.018, preserve_topology=True), xy, 0.004)
        if r:
            regiones.append({"cod": cod, "nombre": NOMBRES[cod], "anillos": r})
    W = round((LON1 - LON0) * C * K, 1)
    H = round((LAT1 - LAT0) * K, 1)
    out = {
        "fuente": "Límites regionales: Biblioteca del Congreso Nacional de Chile (BCN)",
        "proy": {"lon0": LON0, "lat0": LAT0, "k": K, "c": round(C, 6)},
        "viewBox": [0, 0, W, H],
        "regiones": regiones,
    }
    js = ("/* GENERADO por tools/mapa_chile_build.py — no editar a mano. Regiones de Chile (BCN) simplificadas y proyectadas\n"
          "   para el mapa de \"Fundos en todo Chile\" (#mas-proyectos). */\n"
          "(function () {\n  \"use strict\";\n  var B = window.__BRAND__ = window.__BRAND__ || {};\n  B.mapaChile = "
          + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n})();\n")
    (RAIZ / "lib" / "mapa-chile.js").write_text(js, encoding="utf-8")
    print("lib/mapa-chile.js", len(js) // 1024, "KB ·", len(regiones), "regiones ·", sum(len(a) for r in regiones for a in r["anillos"]), "puntos")


if __name__ == "__main__":
    main()
