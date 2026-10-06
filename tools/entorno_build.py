#!/usr/bin/env python3
"""Genera los datos del mapa "Descubre tu entorno" (lib/entorno-datos.js).

Entrada: tools/entorno/lugares.json (proyecto, lugares, textos, fotos, créditos) y la configuración de imagen
que trae ese mismo archivo. Salida: lib/entorno-datos.js con todo en píxeles de la imagen base.

Pasos (cada uno se puede saltar si ya está hecho; los resultados quedan en caché en tools/entorno/):
  --teselas   descarga el mosaico Sentinel-2 cloudless 2016 de EOX (CC BY 4.0) y arma las capas WebP
  --locales   igual que --teselas, pero desde imágenes ya descargadas (GetMap WMS de EOX en EPSG:3857, ver
              "original" en lugares.json): recorta cada capa de su bbox, la lleva a su tamaño y ajusta el color
  --videos    convierte los videos del cliente ("video.original" en lugares.json, en tools/entorno/videos/) a
              MP4 H.264 + WebM VP9 de 1280 px (~2,5 Mb/s), a la mitad de cuadros, con audio, y una portada WebP
  --fotos     descarga las fotos de Wikimedia Commons (miniatura 1280 px) y las deja en assets/entorno/fotos/
  --rutas     calcula las rutas por camino con OSRM (router.project-osrm.org, datos © OpenStreetMap)
Sin opciones solo regenera lib/entorno-datos.js con lo que haya en caché.

Uso: python3 tools/entorno_build.py [--proyecto ID] [--rutas] [--locales | --teselas] [--videos] [--fotos]
Sin --proyecto es Puerto Varas (tools/entorno/lugares.json → lib/entorno-datos.js). Con --proyecto ID se usa
tools/entorno/ID/lugares.json y la salida va a lib/entorno-ID.js (la página: entorno.html?p=ID).
"""
import io
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DIR = os.path.join(AQUI, "entorno")
PROY = ""
if "--proyecto" in sys.argv:
    PROY = sys.argv[sys.argv.index("--proyecto") + 1]
    DIR = os.path.join(AQUI, "entorno", PROY)
UA = "biplot-fundos-entorno/1.0 (https://biplot.cl; propuesta Fundos Inmobiliaria)"
TESELA = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg"
OSRM = "https://router.project-osrm.org/route/v1/driving/{o};{d}?overview=full&geometries=geojson"


def leer(nombre, defecto=None):
    p = os.path.join(DIR, nombre)
    if not os.path.exists(p):
        return defecto
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def guardar(nombre, datos):
    with open(os.path.join(DIR, nombre), "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=1)


def bajar(url, intentos=4):
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - reintento simple con espera creciente
            if i == intentos - 1:
                raise
            print("  reintento", url[:90], e)
            time.sleep(2 ** (i + 1))


# ---------------------------------------------------------------- proyección Web Mercator
def merc(lat, lon, z):
    n = 256 * 2 ** z
    r = math.radians(lat)
    return (lon + 180) / 360 * n, (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n


def haversine(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


# ---------------------------------------------------------------- teselas → capas WebP
def mosaico(bbox, z, salida, calidad):
    """bbox = [lon0, lat0, lon1, lat1]. Devuelve (ancho, alto) del recorte exacto del bbox en píxeles de zoom z."""
    from PIL import Image
    x0, y0 = merc(bbox[3], bbox[0], z)   # esquina noroeste
    x1, y1 = merc(bbox[1], bbox[2], z)   # esquina sureste
    tx0, ty0, tx1, ty1 = int(x0 // 256), int(y0 // 256), int(x1 // 256), int(y1 // 256)
    cache = os.path.join(DIR, "teselas", str(z))
    os.makedirs(cache, exist_ok=True)
    img = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    total, n = (tx1 - tx0 + 1) * (ty1 - ty0 + 1), 0
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            f = os.path.join(cache, "%d_%d.jpg" % (tx, ty))
            if not os.path.exists(f):
                with open(f, "wb") as out:
                    out.write(bajar(TESELA.format(z=z, x=tx, y=ty)))
                time.sleep(1.0)   # una petición por segundo: servicio compartido
            n += 1
            img.paste(Image.open(f).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
        print("  z%d fila %d/%d (%d/%d teselas)" % (z, ty - ty0 + 1, ty1 - ty0 + 1, n, total))
    caja = (round(x0 - tx0 * 256), round(y0 - ty0 * 256), round(x1 - tx0 * 256), round(y1 - ty0 * 256))
    img = img.crop(caja)
    img.save(os.path.join(RAIZ, salida), "WEBP", quality=calidad, method=6)
    print("  ->", salida, img.size, os.path.getsize(os.path.join(RAIZ, salida)) // 1024, "KB")
    return img.size


def teselas(cfg):
    im = cfg["imagen"]
    zb = im["zoom"]
    w, h = mosaico(im["bbox"], zb, im["src"], im.get("calidad", 72))
    capas = []
    for c in im.get("capas", []):
        cw, ch = mosaico(c["bbox"], c["zoom"], c["src"], c.get("calidad", 70))
        capas.append({"src": c["src"], "bbox": c["bbox"], "zoom": c["zoom"], "w": cw, "h": ch, "desde": c.get("desde", 1.6)})
    guardar("imagen-cache.json", {"w": w, "h": h, "capas": capas})


# ---------------------------------------------------------------- imágenes descargadas a mano → capas WebP
_LUT = {}


def color(img, ref):
    """Ajuste para la interfaz oscura, igual para todas las capas (si no, se notan los bordes): niveles por canal
    al 0,4 % y contraste medidos en la imagen de referencia, un poco más de brillo y de saturación."""
    from PIL import Image, ImageEnhance
    if ref not in _LUT:
        base = Image.open(os.path.join(AQUI, ref)).convert("RGB")
        lut, medias = [], []
        for h in (base.histogram()[i * 256:(i + 1) * 256] for i in range(3)):
            n, acc, lo, hi = sum(h), 0, 0, 255
            for v in range(256):
                acc += h[v]
                if acc > n * 0.004:
                    lo = v
                    break
            acc = 0
            for v in range(255, -1, -1):
                acc += h[v]
                if acc > n * 0.004:
                    hi = v
                    break
            medias.append(sum(v * c for v, c in enumerate(h)) / n)
            lut.append((lo, max(hi, lo + 1)))
        m = 255 * (sum((mm - lo) / (hi - lo) for mm, (lo, hi) in zip(medias, lut)) / 3) ** 0.86
        tabla = []
        for lo, hi in lut:
            for v in range(256):
                t = 255 * min(1, max(0, (v - lo) / (hi - lo))) ** 0.86
                tabla.append(max(0, min(255, round(m + 1.06 * (t - m)))))
        _LUT[ref] = tabla
    return ImageEnhance.Color(img.point(_LUT[ref])).enhance(1.12)


def recorte(orig, bbox, z, salida, calidad, ancho_max=None, ref=None):
    """orig = {"archivo", "bbox"}: imagen lineal en Web Mercator. Recorta bbox; tamaño = el del zoom z o el nativo."""
    from PIL import Image
    img = Image.open(os.path.join(AQUI, orig["archivo"])).convert("RGB")
    ob = orig["bbox"]
    nx0, ny0 = merc(ob[3], ob[0], 20)
    nx1, ny1 = merc(ob[1], ob[2], 20)
    sx, sy = img.width / (nx1 - nx0), img.height / (ny1 - ny0)
    x0, y0 = merc(bbox[3], bbox[0], 20)
    x1, y1 = merc(bbox[1], bbox[2], 20)
    caja = ((x0 - nx0) * sx, (y0 - ny0) * sy, (x1 - nx0) * sx, (y1 - ny0) * sy)
    if caja[0] < -1 or caja[1] < -1 or caja[2] > img.width + 1 or caja[3] > img.height + 1:
        sys.exit("El bbox %s se sale de %s" % (bbox, orig["archivo"]))
    w, h = caja[2] - caja[0], caja[3] - caja[1]
    if z is not None:
        zx0, zy0 = merc(bbox[3], bbox[0], z)
        zx1, zy1 = merc(bbox[1], bbox[2], z)
        w, h = zx1 - zx0, zy1 - zy0
    if ancho_max and w > ancho_max:
        w, h = ancho_max, h * ancho_max / w
    out = img.resize((round(w), round(h)), Image.LANCZOS, box=caja)
    out = color(out, ref or orig["archivo"])
    os.makedirs(os.path.dirname(os.path.join(RAIZ, salida)), exist_ok=True)
    out.save(os.path.join(RAIZ, salida), "WEBP", quality=calidad, method=6)
    print("  ->", salida, out.size, os.path.getsize(os.path.join(RAIZ, salida)) // 1024, "KB")
    return out.size


def locales(cfg):
    im = cfg["imagen"]
    origs = im["originales"]
    ref = origs[im["original"]]["archivo"]
    w, h = recorte(origs[im["original"]], im["bbox"], im["zoom"], im["src"], im.get("calidad", 72), ref=ref)
    capas = []
    for c in im.get("capas", []):
        cw, ch = recorte(origs[c["original"]], c["bbox"], c.get("zoom"), c["src"], c.get("calidad", 70), c.get("anchoMax"), ref)
        capas.append({"src": c["src"], "bbox": c["bbox"], "zoom": c.get("zoom"), "w": cw, "h": ch, "desde": c.get("desde", 1.6)})
    guardar("imagen-cache.json", {"w": w, "h": h, "capas": capas})


# ---------------------------------------------------------------- videos del cliente
def videos(cfg):
    import subprocess
    try:
        import imageio_ffmpeg
        ff = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("Falta ffmpeg: pip install imageio-ffmpeg")
    meta = leer("videos-cache.json", {})
    dest = os.path.join(RAIZ, "assets/entorno/videos")
    os.makedirs(dest, exist_ok=True)
    for l in cfg["lugares"]:
        v = l.get("video")
        if not v:
            continue
        orig = os.path.join(AQUI, v["original"])
        base = os.path.join(dest, l["id"])
        if not os.path.exists(orig):
            print("  sin original (se usa lo ya convertido):", v["original"]) if l["id"] in meta else print("  ¡falta!", v["original"])
            continue
        info = subprocess.run([ff, "-hide_banner", "-i", orig], capture_output=True, text=True).stderr
        import re
        m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
        dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
        fps = float(re.search(r"([\d.]+) fps", info).group(1))
        r = "30000/1001" if fps > 55 else ("25" if fps > 45 else "%g" % fps)
        audio = "Audio:" in info and not v.get("sinAudio")
        vf = "fps=%s,scale=1280:-2:flags=lanczos,format=yuv420p" % r
        a_mp4 = ["-c:a", "aac", "-b:a", "128k"] if audio else ["-an"]
        a_webm = ["-c:a", "libopus", "-b:a", "96k"] if audio else ["-an"]
        print("  video", l["id"], "%.1f s" % dur)
        subprocess.run([ff, "-v", "error", "-y", "-i", orig, "-vf", vf, "-c:v", "libx264", "-profile:v", "high", "-preset", "slow",
                        "-crf", "25", "-maxrate", "2800k", "-bufsize", "5600k", "-movflags", "+faststart"] + a_mp4 + [base + ".mp4"], check=True)
        subprocess.run([ff, "-v", "error", "-y", "-i", orig, "-vf", vf, "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "2400k", "-row-mt", "1",
                        "-deadline", "good", "-cpu-used", "2"] + a_webm + [base + ".webm"], check=True)
        t = v.get("portadaSeg", round(dur * 0.5, 2))
        subprocess.run([ff, "-v", "error", "-y", "-ss", str(t), "-i", orig, "-frames:v", "1", "-vf", "scale=1280:-2:flags=lanczos",
                        base + "-portada.png"], check=True)
        from PIL import Image
        im = Image.open(base + "-portada.png")
        im.save(base + ".webp", "WEBP", quality=78, method=6)
        os.remove(base + "-portada.png")
        meta[l["id"]] = {"mp4": "assets/entorno/videos/%s.mp4" % l["id"], "webm": "assets/entorno/videos/%s.webm" % l["id"],
                         "poster": "assets/entorno/videos/%s.webp" % l["id"], "w": im.width, "h": im.height,
                         "dur": round(dur, 1), "audio": audio}
        print("   ->", ", ".join("%s %d KB" % (e, os.path.getsize(base + "." + e) // 1024) for e in ("mp4", "webm", "webp")))
    guardar("videos-cache.json", meta)


# ---------------------------------------------------------------- fotos de Wikimedia Commons
def fotos(cfg):
    from PIL import Image
    meta = leer("fotos-cache.json", {})
    os.makedirs(os.path.join(RAIZ, "assets/entorno/fotos"), exist_ok=True)
    for l in cfg["lugares"]:
        f = l.get("foto")
        if not f or not f.get("commons"):
            continue
        titulo = f["commons"]
        api = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
            "action": "query", "format": "json", "prop": "imageinfo", "titles": titulo,
            "iiprop": "url|size|extmetadata", "iiurlwidth": 1280})
        info = json.loads(bajar(api))
        pag = next(iter(info["query"]["pages"].values()))
        if "imageinfo" not in pag:
            print("  sin imagen:", titulo)
            continue
        ii = pag["imageinfo"][0]
        em = ii.get("extmetadata", {})
        def val(k):
            import html
            import re
            v = em.get(k, {}).get("value", "")
            return html.unescape(re.sub(r"<[^>]+>", "", v)).strip()
        url = ii.get("thumburl") or ii["url"]
        dest = "assets/entorno/fotos/%s.webp" % l["id"]
        im = Image.open(io.BytesIO(bajar(url))).convert("RGB")
        if im.width > 1200:
            im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
        im.save(os.path.join(RAIZ, dest), "WEBP", quality=78, method=6)
        meta[l["id"]] = {"src": dest, "w": im.width, "h": im.height, "autor": val("Artist") or f.get("autor", ""),
                         "licencia": val("LicenseShortName") or f.get("licencia", ""), "licenciaUrl": val("LicenseUrl"),
                         "pagina": ii.get("descriptionurl", ""), "titulo": titulo}
        print("  foto", l["id"], im.size, meta[l["id"]]["autor"], "·", meta[l["id"]]["licencia"])
        time.sleep(1.0)
    guardar("fotos-cache.json", meta)


# ---------------------------------------------------------------- rutas por camino (OSRM)
def clave_ruta(o, l):
    """Clave de caché de la ruta; con "via" (puntos intermedios, p. ej. para forzar el túnel) también entra en la clave."""
    k = "%.6f,%.6f>%.6f,%.6f" % (o["lat"], o["lon"], l["destino"][0], l["destino"][1])
    for v in l.get("via", []):
        k += "|%.6f,%.6f" % (v[0], v[1])
    return k


def rutas(cfg):
    cache = leer("rutas-cache.json", {})
    o = cfg["proyecto"]
    for l in cfg["lugares"]:
        if not l.get("destino"):
            continue
        clave = clave_ruta(o, l)
        if clave in cache:
            continue
        via = "".join(";%f,%f" % (v[1], v[0]) for v in l.get("via", []))
        url = OSRM.format(o="%f,%f" % (o["lon"], o["lat"]) + via, d="%f,%f" % (l["destino"][1], l["destino"][0]))
        r = json.loads(bajar(url))
        rt = r["routes"][0]
        fin = r["waypoints"][-1]
        cache[clave] = {"km": rt["distance"] / 1000, "min": rt["duration"] / 60, "coords": rt["geometry"]["coordinates"],
                        "llegada": fin["name"], "desvio_m": fin["distance"]}
        print("  ruta", l["id"], round(rt["distance"] / 1000, 1), "km", round(rt["duration"] / 60), "min ->",
              fin["name"], round(fin["distance"]), "m")
        time.sleep(1.1)
    guardar("rutas-cache.json", cache)


def simplificar(pts, eps):
    """Douglas-Peucker en píxeles."""
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    L = math.hypot(dx, dy) or 1e-9
    dmax, imax = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dx * (pts[i][1] - ay) - dy * (pts[i][0] - ax)) / L
        if d > dmax:
            dmax, imax = d, i
    if dmax > eps:
        return simplificar(pts[:imax + 1], eps)[:-1] + simplificar(pts[imax:], eps)
    return [pts[0], pts[-1]]


# ---------------------------------------------------------------- salida
def construir(cfg):
    im = cfg["imagen"]
    capas = []
    if im.get("modo") == "afin":
        # Imagen sin georreferencia (captura): ajuste afín con puntos de control, ver tools/entorno/lugares.json
        a = im["afin"]
        c41 = math.cos(math.radians(a["lat_ref"]))

        def px(lat, lon):
            X, Y = lon * 111.32 * c41, -lat * 110.57
            return (round(a["px"][0] * X + a["px"][1] * Y + a["px"][2], 2), round(a["py"][0] * X + a["py"][1] * Y + a["py"][2], 2))
        ic = {"w": im["w"], "h": im["h"]}
        mpp = im["mpp"]
    else:
        ic = leer("imagen-cache.json")
        if not ic:
            sys.exit("Falta el mosaico: corre primero con --teselas")
        zb = im["zoom"]
        ox, oy = merc(im["bbox"][3], im["bbox"][0], zb)

        def px(lat, lon):
            x, y = merc(lat, lon, zb)
            return round(x - ox, 2), round(y - oy, 2)

        lat_c = (im["bbox"][1] + im["bbox"][3]) / 2
        mpp = 156543.03392 * math.cos(math.radians(lat_c)) / 2 ** zb
        for c in ic["capas"]:
            x0, y0 = px(c["bbox"][3], c["bbox"][0])
            x1, y1 = px(c["bbox"][1], c["bbox"][2])
            capas.append({"src": c["src"], "x": x0, "y": y0, "w": round(x1 - x0, 2), "h": round(y1 - y0, 2), "desde": c["desde"]})

    rc = leer("rutas-cache.json", {})
    fc = leer("fotos-cache.json", {})
    vc = leer("videos-cache.json", {})
    o = cfg["proyecto"]
    proyecto = dict(o)
    proyecto["x"], proyecto["y"] = px(o["lat"], o["lon"])
    salida = []
    for l in cfg["lugares"]:
        d = {k: v for k, v in l.items() if k not in ("foto", "video")}
        if l.get("video") and vc.get(l["id"]):
            d["video"] = dict(vc[l["id"]], titulo=l["video"].get("titulo", l["nombre"]))
        d["x"], d["y"] = px(l["lat"], l["lon"])
        d["recta"] = round(haversine((o["lat"], o["lon"]), (l["lat"], l["lon"])), 1)
        if l.get("destino"):
            r = rc.get(clave_ruta(o, l))
            if r:
                pts = [px(la, lo) for lo, la in r["coords"]]
                s = simplificar(pts, cfg.get("simplificar_px", 0.35))
                xs, ys = [p[0] for p in pts], [p[1] for p in pts]
                d["ruta"] = {"d": "M" + " L".join("%.1f %.1f" % p for p in s), "km": round(r["km"], 1), "min": round(r["min"], 1),
                             "fin": [round(pts[-1][0], 1), round(pts[-1][1], 1)], "caja": [min(xs), min(ys), max(xs), max(ys)]}
            else:
                print("  ¡sin ruta en caché para", l["id"], "! corre con --rutas")
        f = l.get("foto")
        if f:
            m = fc.get(l["id"])
            if m:
                lic = m["licencia"]
                d["foto"] = {"src": m["src"], "w": m["w"], "h": m["h"], "alt": f.get("alt", l["nombre"]), "url": m["pagina"],
                             "credito": "Foto: %s" % (m["autor"] or "autor desconocido"), "licencia": lic, "licUrl": m.get("licenciaUrl", "")}
            elif f.get("src"):
                d["foto"] = {k: f[k] for k in ("src", "w", "h", "alt", "credito", "url") if k in f}
        salida.append(d)

    creditos = list(cfg.get("creditos", []))
    if im.get("credito"):
        creditos.insert(0, im["credito"])
    for l in cfg["lugares"]:
        m = fc.get(l["id"])
        if m:
            creditos.append({"texto": "%s: foto de %s, %s, vía Wikimedia Commons (recortada)" % (l["nombre"], m["autor"] or "autor desconocido", m["licencia"]),
                             "url": m["pagina"], "enlace": "ver original", "licUrl": m.get("licenciaUrl", "")})
    ids = {l["id"] for l in cfg["lugares"]}
    for r in cfg.get("resumen", []):
        if r not in ids:
            print("  AVISO: el resumen pide un lugar que no existe:", r)
    pend = [l["id"] for l in cfg["lugares"] if l.get("revisar")]
    if pend:
        print("  AVISO: textos por aprobar con el cliente:", ", ".join(pend))
    paisaje = []
    for s in cfg.get("paisaje", []):
        x, y = px(s["lat"], s["lon"])
        paisaje.append({"nombre": s["nombre"], "x": x, "y": y, "tam": s.get("tam", "")})
    datos = {
        "imagen": {"src": im["src"], "w": ic["w"], "h": ic["h"], "mpp": round(mpp, 3), "zoomMax": im.get("zoomMax", 6), "capas": capas},
        "creditoCorto": im.get("creditoCorto", cfg.get("creditoCorto", [])), "creditos": creditos, "metodo": cfg.get("metodo", []), "categorias": cfg["categorias"],
        "anillos": cfg.get("anillos", []), "dato": cfg.get("dato"), "resumen": cfg.get("resumen", []), "paisaje": paisaje,
        "proyecto": proyecto, "lugares": salida, "pagina": cfg.get("pagina", {}),
    }
    fuente = "tools/entorno/" + (PROY + "/" if PROY else "") + "lugares.json"
    js = "/* Generado por tools/entorno_build.py: no editar a mano (editar " + fuente + "). */\nwindow.__ENTORNO__ = " + \
         json.dumps(datos, ensure_ascii=False, separators=(",", ":")) + ";\n"
    out = "lib/entorno-%s.js" % PROY if PROY else "lib/entorno-datos.js"
    with open(os.path.join(RAIZ, out), "w", encoding="utf-8") as f:
        f.write(js)
    print(out, len(js) // 1024, "KB ·", len(salida), "lugares")


if __name__ == "__main__":
    cfg = leer("lugares.json")
    if "--teselas" in sys.argv:
        teselas(cfg)
    if "--locales" in sys.argv:
        locales(cfg)
    if "--videos" in sys.argv:
        videos(cfg)
    if "--fotos" in sys.argv:
        fotos(cfg)
    if "--rutas" in sys.argv:
        rutas(cfg)
    construir(cfg)
