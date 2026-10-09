#!/usr/bin/env python3
"""Planos comerciales desde Fundos 360° (4ChrisM/fundos-os).

Fundos 360° extrae cada plano de su PDF comercial (Illustrator, vectorial) con
scripts/planos/extraer_planos_pdf.py y lo deja en lib/planos/datos.ts: la forma exacta de
cada lote por su número, servidumbres, agua, camino principal, contorno, la foto satelital
del PDF con la matriz que la ubica, las categorías de precio de la leyenda y qué lotes
aparecían disponibles (y a qué precio). Este script lo trae a la web tal cual:

  - lib/planos.js            geometría (coordenadas del PDF, en puntos) + fondo satelital
  - assets/planos/*.webp     fotos satelitales (copiadas de public/planos/)
  - lib/manifest.js          `categorias` (colores y precios de la leyenda) y `lotes`
                             (disponible con su categoría / vendida) de cada proyecto

Las curvas (C) se pasan a tramos rectos para que "Tu casa" y el acceso lean los lotes como
polígonos (M/L/Z). Uso:

  python3 tools/planos_fundos360.py [ruta/a/fundos-os]     (por defecto ../fundos-os)
"""
import json
import re
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
OS = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ.parent / "fundos-os"


def constante(fuente, nombre):
    m = re.search(r"export const " + nombre + r"[^=]*= (\{.*?\});\n", fuente, re.S)
    if not m:
        sys.exit("No encontré " + nombre + " en datos.ts")
    return json.loads(m.group(1))


def r1(v):
    v = round(v, 1)
    return str(int(v)) if v == int(v) else str(v)


def aplanar(d, pasos=6):
    """Path SVG absoluto (M, L, H, V, C, Z) → solo M/L/Z (curvas muestreadas)."""
    tok = re.findall(r"[MLHVCZmlhvcz]|-?\d*\.?\d+(?:e-?\d+)?", d)
    out, i, cmd, x, y, x0, y0 = [], 0, None, 0.0, 0.0, 0.0, 0.0

    def nums(n):
        nonlocal i
        v = [float(t) for t in tok[i:i + n]]
        i += n
        return v

    while i < len(tok):
        t = tok[i]
        if re.match(r"[A-Za-z]", t):
            cmd = t
            i += 1
            if cmd in "Zz":
                out.append("Z")
                x, y = x0, y0
                continue
        if cmd != cmd.upper():
            sys.exit("Path relativo no soportado: " + d[:60])
        if cmd == "M":
            x, y = nums(2)
            x0, y0 = x, y
            out.append("M" + r1(x) + " " + r1(y))
            cmd = "L"
        elif cmd == "L":
            x, y = nums(2)
            out.append("L" + r1(x) + " " + r1(y))
        elif cmd == "H":
            (x,) = nums(1)
            out.append("L" + r1(x) + " " + r1(y))
        elif cmd == "V":
            (y,) = nums(1)
            out.append("L" + r1(x) + " " + r1(y))
        elif cmd == "C":
            x1, y1, x2, y2, x3, y3 = nums(6)
            for k in range(1, pasos + 1):
                t_ = k / pasos
                a, b, c, e = (1 - t_) ** 3, 3 * (1 - t_) ** 2 * t_, 3 * (1 - t_) * t_ ** 2, t_ ** 3
                out.append("L" + r1(a * x + b * x1 + c * x2 + e * x3) + " " + r1(a * y + b * y1 + c * y2 + e * y3))
            x, y = x3, y3
        else:
            sys.exit("Comando no soportado: " + cmd)
    # Quitar puntos repetidos seguidos
    limpio = []
    for s in out:
        if limpio and s[1:] == limpio[-1][1:] and s[0] == "L":
            continue
        limpio.append(s)
    return "".join(limpio)


def main():
    datos = OS / "lib" / "planos" / "datos.ts"
    if not datos.exists():
        sys.exit("No existe " + str(datos) + " (clona 4ChrisM/fundos-os al lado de este repo o pasa su ruta)")
    fuente = datos.read_text(encoding="utf-8")
    planos = constante(fuente, "PLANOS")
    categorias = constante(fuente, "CATEGORIAS_PRECIO")
    referencia = constante(fuente, "PLANO_COMERCIAL_REFERENCIA")

    destino = RAIZ / "assets" / "planos"
    destino.mkdir(parents=True, exist_ok=True)
    web = {}
    for pid, p in planos.items():
        q = {"viewBox": p["viewBox"]}
        if p.get("contorno"):
            q["contorno"] = aplanar(p["contorno"])
        q["calles"] = [{"tipo": c["tipo"], "d": aplanar(c["d"])} for c in p.get("calles", [])]
        q["agua"] = [dict(a, d=aplanar(a["d"])) for a in p.get("agua", [])]
        if p.get("caminoPrincipal"):
            q["caminoPrincipal"] = aplanar(p["caminoPrincipal"])
            if p.get("caminoPrincipalRelleno"):
                q["caminoPrincipalRelleno"] = True
        f = p.get("fondo")
        if f:
            nombre = Path(f["src"]).name
            shutil.copyfile(OS / "public" / f["src"].lstrip("/"), destino / nombre)
            q["fondo"] = {"src": "assets/planos/" + nombre, "ancho": f["ancho"], "alto": f["alto"], "matriz": f["matriz"]}
        q["lotes"] = {n: {"d": aplanar(l["d"]), "l": l["l"], "r": l["r"]} for n, l in sorted(p["lotes"].items(), key=lambda kv: int(kv[0]))}
        web[pid] = q

    js = (
        "/* Planos comerciales de Fundos — GENERADO por tools/planos_fundos360.py desde Fundos 360° (4ChrisM/fundos-os,\n"
        "   lib/planos/datos.ts, extraído de los PDF comerciales de cada proyecto). No editar a mano.\n"
        "   Coordenadas del PDF (puntos): lotes por número {d, l, r} (forma, marcador del número, holgura), servidumbres,\n"
        "   agua (`trazo` = estero dibujado como línea), camino principal y la foto satelital del PDF (`fondo.matriz`\n"
        "   ubica la imagen unitaria sobre el plano, así calza exacta con los lotes).\n"
        "   Precios, categorías y estados van en lib/manifest.js (este mismo script los toma de los PDF). */\n"
        "(function () {\n  \"use strict\";\n  var B = window.__BRAND__ = window.__BRAND__ || {};\n  B.planos = "
        + json.dumps(web, ensure_ascii=False, separators=(",", ":"))
        + ";\n})();\n"
    )
    (RAIZ / "lib" / "planos.js").write_text(js, encoding="utf-8")

    # Manifiesto: categorías de la leyenda y estado de cada lote según el PDF
    man_p = RAIZ / "lib" / "manifest.js"
    man = man_p.read_text(encoding="utf-8")
    for pid, cats in categorias.items():
        ini = man.index('id: "' + pid + '"')
        fin = man.find('\n        id: "', ini + 10)
        fin = len(man) if fin < 0 else fin
        bloque = man[ini:fin]
        # Conservar los nombres de categoría que ya existían (por precio)
        viejos = {}
        for m in re.finditer(r"(\w+):\s*\{\s*color:\s*\"#\w+\",(?:\s*lista:\s*(\d+),)?\s*precio:\s*(\d+)\s*\}", bloque):
            viejos[int(m.group(3))] = m.group(1)
        claves = []
        for i, c in enumerate(cats):
            claves.append(viejos.get(c["precio"], "c" + str(i + 1)))
        ancho = max(len(k) for k in claves) + 1
        lineas = []
        for k, c in zip(claves, cats):
            lista = ' lista: ' + str(c["lista"]) + ',' if c.get("lista") else ""
            lineas.append("          " + (k + ":").ljust(ancho) + ' { color: "' + c["color"] + '",' + lista + " precio: " + str(c["precio"]) + " }")
        nuevo_cats = "categorias: {\n" + ",\n".join(lineas) + "\n        }"
        bloque = re.sub(r"categorias: \{.*?\n        \}", lambda _: nuevo_cats, bloque, count=1, flags=re.S)

        ref = referencia[pid]["lotes"]
        filas = []
        for n in sorted(ref, key=int):
            x = ref[n]
            if x["disponible"]:
                k = next((k for k, c in zip(claves, cats) if x.get("precio") in (c["precio"], c.get("lista"))), None)
                if not k:
                    sys.exit(pid + " lote " + n + ": precio " + str(x.get("precio")) + " sin categoría")
                filas.append("[" + n + ', "' + k + '", D]')
            else:
                filas.append("[" + n + ", null, V]")
        filas_txt = ",\n".join("          " + ", ".join(filas[i:i + 6]) for i in range(0, len(filas), 6))
        bloque = re.sub(r"lotes: lotes\(\[.*?\n        \]\)", lambda _: "lotes: lotes([\n" + filas_txt + "\n        ])", bloque, count=1, flags=re.S)
        man = man[:ini] + bloque + man[fin:]
        disp = sum(1 for x in ref.values() if x["disponible"])
        print(pid + ": " + str(len(ref)) + " lotes, " + str(disp) + " disponibles (" + referencia[pid]["archivo"] + ")")
    man_p.write_text(man, encoding="utf-8")


if __name__ == "__main__":
    main()
