"""Genera vitrina.html: la sección "El entorno" de la pestaña Puerto Varas como página aparte, para incrustarla
en otro sitio (por ejemplo Squarespace) con un <iframe>. Toma la sección #entorno y los íconos que usa desde
index.html, así que basta con volver a correrlo si cambia esa sección:  python3 tools/vitrina_build.py
Los enlaces se abren en una pestaña nueva y la página avisa su alto al sitio que la contiene (postMessage
{fundosVitrina: alto}) para que el iframe se ajuste solo."""
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(RAIZ, "index.html"), encoding="utf-8").read()

sec = re.search(r'<section class="section dark pv-entorno" id="entorno".*?</section>', html, re.S).group(0)
sec = sec.replace(' data-vista="inicio"', "")
version = re.search(r'main\.js\?v=(\w+)', html).group(1)
usados = sorted(set(re.findall(r'href="#(i-[\w-]+)"', sec)))
simbolos = "\n".join(re.search(r'  <symbol id="%s".*?</symbol>' % s, html, re.S).group(0) for s in usados)

pagina = f'''<!DOCTYPE html>
<html lang="es-CL">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>El entorno · Fundos Puerto Varas</title>
<meta name="robots" content="noindex, nofollow">
<base target="_blank">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="styles.css?v={version}">
<style>
  /* Generado por tools/vitrina_build.py desde index.html: no editar a mano */
  html, body {{ background: var(--g900); }}
  body {{ margin: 0; overflow-x: hidden; }}
  .pv-entorno {{ padding-block: clamp(2rem, 5vw, 3.5rem); }}
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
{simbolos}
</svg>
{sec}
<script src="lib/manifest.js?v={version}"></script>
<script src="main.js?v={version}"></script>
<script>
  // Avisa el alto al sitio que incrusta esta página (el iframe se ajusta solo)
  (function () {{
    if (window.parent === window) return;
    var last = 0;
    function send() {{
      var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
      if (h !== last) {{ last = h; window.parent.postMessage({{ fundosVitrina: h }}, "*"); }}
    }}
    if ("ResizeObserver" in window) new ResizeObserver(send).observe(document.documentElement);
    window.addEventListener("load", send);
    window.addEventListener("resize", send);
    send();
  }})();
</script>
</body>
</html>
'''
open(os.path.join(RAIZ, "vitrina.html"), "w", encoding="utf-8").write(pagina)
print("vitrina.html", len(pagina), "bytes ·", ", ".join(usados))
