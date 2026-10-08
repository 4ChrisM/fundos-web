# Temporal: busca en Wikimedia Commons fotos de casas en parcelas del sur de Chile con licencia libre
import json, os, re, urllib.parse, urllib.request
UA = {"User-Agent": "FundosPropuesta/1.0 (biplot.cl)"}
Q = ["casa rural Llanquihue", "casa campo Frutillar", "Puerto Varas casa campo", "casa de campo Los Lagos Chile",
     "Chiloé casa campo", "house countryside Llanquihue", "farmhouse Los Lagos Region Chile", "casa volcán Osorno campo",
     "casa madera sur de Chile", "parcela Puerto Varas", "rural house Chile volcano", "casa Puerto Octay", "casa Ensenada Llanquihue",
     "cabaña sur de Chile", "casa campo Araucanía", "house Pucón countryside"]
OK = re.compile(r"^(CC BY|CC BY-SA|CC0|Public domain|PD)", re.I)
out, seen = [], set()
os.makedirs("tools/tmp/candidatas", exist_ok=True)
for q in Q:
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search", "gsrsearch": q + " filetype:bitmap", "gsrnamespace": 6, "gsrlimit": 25,
        "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 640})
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30))
    except Exception as e:
        print("error", q, e); continue
    for p in (d.get("query", {}).get("pages", {}) or {}).values():
        t = p["title"]
        if t in seen or "imageinfo" not in p: continue
        seen.add(t)
        ii = p["imageinfo"][0]; md = ii.get("extmetadata", {})
        lic = md.get("LicenseShortName", {}).get("value", "")
        if not OK.match(lic) or ii.get("width", 0) < 1600 or ii.get("width", 0) < ii.get("height", 0): continue
        autor = re.sub("<[^>]+>", "", md.get("Artist", {}).get("value", "")).strip()
        desc = re.sub("<[^>]+>", "", md.get("ImageDescription", {}).get("value", "")).strip()[:200]
        i = len(out)
        fn = "tools/tmp/candidatas/%02d.jpg" % i
        try:
            urllib.request.urlretrieve(ii["thumburl"], fn) if False else open(fn, "wb").write(urllib.request.urlopen(urllib.request.Request(ii["thumburl"], headers=UA), timeout=30).read())
        except Exception as e:
            print("thumb", t, e); continue
        out.append({"i": i, "titulo": t, "q": q, "licencia": lic, "autor": autor, "desc": desc, "w": ii["width"], "h": ii["height"],
                    "url": ii["url"], "pagina": ii.get("descriptionurl", "")})
        if len(out) >= 90: break
    if len(out) >= 90: break
json.dump(out, open("tools/tmp/candidatas.json", "w"), ensure_ascii=False, indent=1)
print(len(out), "candidatas")
