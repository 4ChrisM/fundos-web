"""Temporal: busca en Wikimedia Commons (categorías y búsqueda de texto de buscar.txt) y baja miniaturas con su licencia."""
import io, json, os, re, html, time, urllib.parse, urllib.request
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AQUI, "candidatas")
API = "https://commons.wikimedia.org/w/api.php?"
UA = {"User-Agent": "FundosWeb/1.0 (https://fundos.biplot.cl; fotos candidatas)"}
LIBRES = ("CC0", "Public domain", "CC BY ", "CC BY-SA", "CC-BY", "PD")


def get(params):
    req = urllib.request.Request(API + urllib.parse.urlencode(dict(params, format="json")), headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=60))


def limpio(v):
    return html.unescape(re.sub(r"<[^>]+>", "", v or "")).strip()


os.makedirs(OUT, exist_ok=True)
meta = {}
for linea in open(os.path.join(AQUI, "buscar.txt"), encoding="utf-8"):
    linea = linea.strip()
    if not linea or linea.startswith("#"):
        continue
    grupo, consulta = [s.strip() for s in linea.split("|", 1)]
    if consulta.startswith("Category:"):
        p = {"action": "query", "generator": "categorymembers", "gcmtitle": consulta, "gcmtype": "file", "gcmlimit": 30}
    else:
        p = {"action": "query", "generator": "search", "gsrsearch": consulta, "gsrnamespace": 6, "gsrlimit": 20}
    p.update(prop="imageinfo", iiprop="url|size|extmetadata|mime", iiurlwidth=900)
    try:
        r = get(p)
    except Exception as e:
        print("error", consulta, e)
        continue
    for pag in (r.get("query", {}).get("pages", {}) or {}).values():
        ii = (pag.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png", "image/webp") or ii.get("width", 0) < 1200:
            continue
        em = ii.get("extmetadata", {})
        lic = limpio(em.get("LicenseShortName", {}).get("value"))
        if not lic.startswith(LIBRES) or "NC" in lic or "ND" in lic:
            continue
        titulo = pag["title"]
        if any(m["titulo"] == titulo for m in meta.values()):
            continue
        n = "%s-%02d" % (grupo, sum(1 for k in meta if k.startswith(grupo + "-")) + 1)
        try:
            req = urllib.request.Request(ii["thumburl"], headers=UA)
            im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert("RGB")
        except Exception as e:
            print("error", titulo, e)
            continue
        im.thumbnail((640, 640))
        im.save(os.path.join(OUT, n + ".jpg"), "JPEG", quality=70)
        meta[n] = {"titulo": titulo, "w": ii["width"], "h": ii["height"], "autor": limpio(em.get("Artist", {}).get("value")),
                   "licencia": lic, "licenciaUrl": limpio(em.get("LicenseUrl", {}).get("value")),
                   "pagina": ii.get("descriptionurl", ""), "descripcion": limpio(em.get("ImageDescription", {}).get("value"))[:200],
                   "consulta": consulta}
        print(n, titulo, lic)
        time.sleep(0.3)
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
