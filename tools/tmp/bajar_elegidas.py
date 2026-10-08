# Temporal: baja las fotos elegidas de Wikimedia Commons
import json, urllib.request
UA = {"User-Agent": "FundosPropuesta/1.0 (biplot.cl; contacto@biplot.cl)"}
for e in json.load(open("tools/tmp/elegidas.json")):
    try:
        open("tools/tmp/%s.jpg" % e["nombre"], "wb").write(urllib.request.urlopen(urllib.request.Request(e["url"], headers=UA), timeout=60).read())
        print("ok", e["nombre"])
    except Exception as x:
        print("error", e["nombre"], x)
