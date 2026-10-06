"""Temporal: baja las fotos elegidas de Commons a 1600 px con autor y licencia."""
import json, os, re, html, urllib.parse, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "FundosWeb/1.0 (https://fundos.biplot.cl)"}
out = {}
for linea in open(os.path.join(AQUI, "elegidas.txt"), encoding="utf-8"):
    if "|" not in linea:
        continue
    pid, titulo = [s.strip() for s in linea.split("|", 1)]
    q = {"action": "query", "format": "json", "prop": "imageinfo", "titles": titulo, "iiprop": "url|extmetadata", "iiurlwidth": 1600}
    r = json.load(urllib.request.urlopen(urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(q), headers=UA), timeout=60))
    ii = next(iter(r["query"]["pages"].values()))["imageinfo"][0]
    em = ii["extmetadata"]
    v = lambda k: html.unescape(re.sub(r"<[^>]+>", "", em.get(k, {}).get("value", ""))).strip()
    data = urllib.request.urlopen(urllib.request.Request(ii["thumburl"], headers=UA), timeout=120).read()
    open(os.path.join(AQUI, "candidatas", pid + "-1600.jpg"), "wb").write(data)
    out[pid] = {"titulo": titulo, "autor": v("Artist"), "licencia": v("LicenseShortName"), "licenciaUrl": v("LicenseUrl"),
                "pagina": ii["descriptionurl"], "credito": v("Credit")}
json.dump(out, open(os.path.join(AQUI, "candidatas", "elegidas.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
