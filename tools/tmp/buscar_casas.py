# Temporal: busca fotos de casas en parcelas (Wikimedia Commons por categorías y Unsplash) con licencia de uso comercial
import json, os, re, urllib.parse, urllib.request
UA = {"User-Agent": "FundosPropuesta/1.0 (biplot.cl; contacto@biplot.cl)"}
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
out = []
os.makedirs("tools/tmp/candidatas", exist_ok=True)
def guardar(thumb, meta):
    i = len(out)
    try:
        open("tools/tmp/candidatas/%03d.jpg" % i, "wb").write(get(thumb))
    except Exception as e:
        print("thumb", e); return
    meta["i"] = i; out.append(meta)
# 1) Unsplash (licencia Unsplash: uso comercial libre, sin atribución obligatoria)
for q in ["chile countryside house", "southern chile house", "puerto varas house", "patagonia house field", "house volcano field",
          "wooden house countryside", "modern country house lawn", "farmhouse green field mountains", "cabin field mountains chile",
          "casa campo chile", "house on large lot lawn", "rural home meadow volcano"]:
    try:
        d = json.loads(get("https://unsplash.com/napi/search/photos?" + urllib.parse.urlencode({"query": q, "per_page": 12, "orientation": "landscape"})))
    except Exception as e:
        print("unsplash", q, e); continue
    for r in d.get("results", []):
        if r.get("premium") or r.get("plus"): continue
        loc = ((r.get("user") or {}).get("location") or "")
        guardar(r["urls"]["small"], {"fuente": "unsplash", "q": q, "id": r["id"], "autor": (r.get("user") or {}).get("name", ""),
             "desc": (r.get("alt_description") or r.get("description") or "")[:160], "w": r.get("width"), "h": r.get("height"),
             "url": r["urls"]["raw"], "pagina": r["links"]["html"], "lugar": loc})
# 2) Wikimedia Commons por categorías
OK = re.compile(r"^(CC BY|CC BY-SA|CC0|Public domain|PD)", re.I)
for cat in ["Houses in Los Lagos Region", "Houses in Llanquihue Province", "Houses in Puerto Varas", "Houses in Frutillar",
            "Rural houses in Chile", "Farmhouses in Chile", "Houses in Araucanía Region", "Wooden houses in Chile", "Houses in Chiloé Province"]:
    try:
        d = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
            "action": "query", "format": "json", "generator": "categorymembers", "gcmtitle": "Category:" + cat, "gcmtype": "file", "gcmlimit": 40,
            "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 640})))
    except Exception as e:
        print("commons", cat, e); continue
    for p in (d.get("query", {}).get("pages", {}) or {}).values():
        if "imageinfo" not in p: continue
        ii = p["imageinfo"][0]; md = ii.get("extmetadata", {})
        lic = md.get("LicenseShortName", {}).get("value", "")
        if not OK.match(lic) or ii.get("width", 0) < 1600 or ii.get("width", 0) < ii.get("height", 0): continue
        guardar(ii["thumburl"], {"fuente": "commons", "q": cat, "titulo": p["title"], "licencia": lic,
             "autor": re.sub("<[^>]+>", "", md.get("Artist", {}).get("value", "")).strip(),
             "desc": re.sub("<[^>]+>", "", md.get("ImageDescription", {}).get("value", "")).strip()[:160],
             "w": ii["width"], "h": ii["height"], "url": ii["url"], "pagina": ii.get("descriptionurl", "")})
json.dump(out, open("tools/tmp/candidatas.json", "w"), ensure_ascii=False, indent=1)
print(len(out), "candidatas")
