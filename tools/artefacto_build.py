# Genera la copia de la página para el artefacto privado de Claude (vista previa) a partir de index.html,
# e imprime el mapa de archivos que hay que publicar junto a ella.
# Uso (desde una carpeta temporal, fuera del repo): python3 <repo>/tools/artefacto_build.py propuesta-fundos.html
import re, pathlib, json, sys
SRC = pathlib.Path(__file__).resolve().parent.parent   # carpeta de la propuesta
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "propuesta-fundos.html")  # escribir fuera del repositorio
html = (SRC / "index.html").read_text()
body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
body = re.sub(r'\s*<script\b(?![^>]*application/ld\+json)[^>]*>\s*</script>', "", body)
head = """<title>Propuesta Fundos Inmobiliaria</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>document.documentElement.classList.add("js");setTimeout(function(){if(!window.__fundosBoot)document.documentElement.classList.remove("js")},8000)</script>
<link rel="preload" as="image" href="assets/video/portada-900.webp" imagesrcset="assets/video/portada-900.webp 900w, assets/video/portada.webp 1600w" imagesizes="(min-width: 960px) 58vw, 100vw" fetchpriority="high">
<link rel="preload" href="assets/fonts/cormorant-garamond.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/cormorant-garamond-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/mulish.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css">
<script defer src="lib/manifest.js"></script>
<script defer src="lib/planos.js"></script>
<script defer src="main.js"></script>
"""
OUT.write_text(head + body.strip() + "\n")
# archivos referenciados por la página y el CSS
refs = set(re.findall(r'(?:src|href|srcset|poster|data-video-webm)="([^"#:]+?)"', body))
for m in re.findall(r'srcset="([^"]+)"', body):
    refs.update(x.strip().split(" ")[0] for x in m.split(","))
css = (SRC / "styles.css").read_text()
refs.update(re.findall(r'url\("?(assets/[^")]+)"?\)', css))
refs.update(re.findall(r'"(assets/(?:img|video)/[^"]+)"', (SRC / "main.js").read_text() + (SRC / "lib/manifest.js").read_text()))
files = {"styles.css": str(SRC / "styles.css"), "main.js": str(SRC / "main.js"), "lib/manifest.js": str(SRC / "lib/manifest.js"), "lib/planos.js": str(SRC / "lib/planos.js")}
missing = []
for r in sorted(refs):
    r = r.split("?")[0]
    if not r.startswith("assets/") or " " in r: continue
    p = SRC / r
    if p.is_file(): files[r] = str(p)
    else: missing.append(r)
print(json.dumps(files, indent=0))
print("missing:", missing, "size:", OUT.stat().st_size)
