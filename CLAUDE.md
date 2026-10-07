# Propuesta Fundos Inmobiliaria — contexto para Claude

Rediseño del sitio de Fundos Inmobiliaria (parcelas en Malalcahuello, Marchigüe y Puerto Varas), hecho por BiPlot
según el **Manual de Marca Fundos 360°**. Sitio estático: HTML, CSS y JavaScript sin build ni dependencias.
Toda la interfaz y los textos van en **español de Chile**. Lee también `README.md` (qué propone la página y la lista
"Estado y próximos pasos").

## Dónde está publicado
- **Sitio público:** https://fundos.biplot.cl/ (GitHub Pages desde `main` de `4ChrisM/fundos-web`, dominio en `CNAME`;
  DNS: CNAME `fundos` de biplot.cl → `4chrism.github.io`). Lleva `noindex`. Hasta octubre 2026 vivió en
  `Biplot/biplot` (`propuestas/fundos-inmobiliaria/`, donde queda su historial de cambios). Esa dirección redirige
  aquí desde el 6-oct-2026 (Biplot/biplot#49), conservando `?p=` y `#`.
- **Sistema del cliente:** Fundos 360° (`4ChrisM/fundos-os`, Next.js + Supabase, módulo de leads). Ver en README el
  pendiente de conectar el formulario y la disponibilidad.
- **Vista previa privada (artefacto de Claude):** https://claude.ai/artifact/NthH9NFHsid6PzqL8HN9wU
  (se actualiza con `tools/artefacto_build.py`, ver abajo). Ahí los recorridos 360° no se ven: el visor bloquea iframes.

## Cómo se publica un cambio
1. Trabajar en una rama nacida del `main` actual (`git fetch origin main && git checkout -B <rama> origin/main`).
2. Probar (ver "Pruebas") y subir `?v=AAAAMMDDx` en `index.html` si cambió CSS/JS/datos (el `.htaccess` guarda un año).
3. Commit, push, pull request a `main` y fusionar: GitHub Pages despliega en 1-2 minutos. El cliente ya autorizó
   publicar esta propuesta (incluidas las fotos y el video del equipo).
4. Actualizar el artefacto: `cd <carpeta temporal> && python3 <repo>/tools/artefacto_build.py propuesta-fundos.html`
   imprime el mapa de archivos; publicar ese HTML con esos archivos en la URL del artefacto de arriba.

## Estructura y datos
- **Pestañas** (`initVistas` en `main.js`): Puerto Varas (inicio) · Proyectos · Tu compra · Equipo. Cada sección dice
  en `data-vista` en qué pestañas aparece (`#plano` en "inicio proyectos"; `#recorrido` solo en Proyectos: en la
  pestaña Puerto Varas los botones 360° abren `entorno.html#tour-360`; `#visita` en todas) y el
  CSS esconde el resto (`html.js[data-vista=…]`). Sin JavaScript se ve todo seguido. Un script en el `<head>` fija la
  pestaña según el `#` para que no parpadee. Los enlaces internos (`#simulador`, `#plano`, `#equipo-4`…) cambian de
  pestaña solos; las pestañas llevan al comienzo (`#puerto-varas`, `#proyectos-inicio`, `#tu-compra`, `#nosotros`).
  En celular y tablet (< 1024 px) las pestañas van en una franja bajo la barra (`--tabs-h`; usar `navBottomPx()` para
  medir la barra). Al cambiar de pestaña se dispara `resize` (plano y recorrido se reacomodan) y `fundos:vista`.
- **Destacado** (`destacado` en `lib/manifest.js`, hoy Puerto Varas): abre la página con su portada en video
  (`videoDestacado`, bucle sin texto armado con los videos del cliente: lago, Frutillar, Petrohué, Osorno y Puerto
  Varas; versión vertical para celular), datos (desde, disponibles), la vitrina del entorno (mapa en miniatura con
  las rutas de `lib/entorno-datos.js`, que se carga al acercarse; tiempos y videos que abren `entorno.html#lugar`) y
  es el proyecto con que parten el plano y el recorrido. Al final de esa pestaña, "Cotiza también nuestros otros
  proyectos" (`#otros-proyectos`, `[data-otro]`): Malalcahuello y Marchigüe con desde/disponibles del manifiesto,
  "Cotizar" (precarga el formulario de visita) y "Ver lotes". El plano de Puerto Varas (ancho, `.plan.is-wide`) va con
  el detalle a la derecha y baja de alto (`layoutPlan`); el panel toma el alto del plano y muestra 3 lotes más baratos. Las pruebas usan `tools/pruebas/_vista.js` (`clasica()` deja
  la página como antes: pestaña Proyectos con el plano en Malalcahuello).
- **Conoce cada proyecto** (`#conoce`, pestaña Proyectos, `initFichas` en `main.js`): un apartado por proyecto, más
  chico que la pestaña Puerto Varas (foto de portada con crédito, desde/disponibles/superficie/reserva, características,
  "Cerca de tu parcela" con enlace al mapa del entorno, "Ver lotes", "Cotizar", 360° y video). Se arma **solo desde el
  manifiesto** (`foto`, `caracteristicas` con `icono` = `<symbol id="i-…">`, `descripcion`, `cercanias`, `tour`, `video`,
  `entorno`): un proyecto nuevo aparece en el selector sin tocar HTML. El cliente no quiere una pestaña por proyecto
  (vendrán muchos): el selector es una franja que se desliza. El destacado no se repite (su botón lleva a su pestaña).
  Enlace directo `#proyecto-ID` (abre la pestaña y elige el proyecto); "Conocer el proyecto" de las tarjetas y de "otros
  proyectos" lleva ahí. Reemplazó la antigua ficha en ventana (`#proyecto`, `data-open-project`). Sin JavaScript no se ve.
- `index.html` todo el contenido (se lee sin JS) · `styles.css` tokens del manual + estilos · `main.js` módulos IIFE
  (`initPlan`, `initTour`, `initSim`, `initVisit`, `initSellers`, `initVideo`, `initCompra`, …) aislados con `safe()`.
- `lib/manifest.js` **único lugar de datos**: contacto, proyectos, lotes (`[n, categoría, estado]`), categorías de
  precio (color, precio, precio lista), financiamiento, `equipo` (nombre, apodo, cargo, foto, bio, whatsapp, video)
  y `videoPortada` (mp4/webm y versión `Movil`). Precios y contacto son de ejemplo (placeholder `+56 9 0000 0000`).
- `lib/planos.js` **generado, no editar a mano**: por proyecto `viewBox`, `contorno`, `calles` (servidumbres),
  `agua`, opcional `caminoPrincipal`, y `lotes[n] = {d, l, r}` (path SVG, punto de etiqueta, radio libre). Lotes y
  servidumbres forman una cobertura continua (bordes compartidos, sin huecos ni traslapes).
- `entorno.html` mapa "Descubre tu entorno" de Fundos Puerto Varas (página aparte; sin build ni dependencias).
  Datos **generados** en `lib/entorno-datos.js` por `tools/entorno_build.py` a partir de `tools/entorno/lugares.json`
  (único lugar a editar: lugares, textos, fotos, categorías, créditos, método). El script proyecta lat/lon a píxeles
  de la imagen, calcula las rutas por camino con OSRM (`router.project-osrm.org`, datos © OpenStreetMap; caché en
  `tools/entorno/rutas-cache.json`) y, cuando hay red, baja el mosaico Sentinel-2 y las fotos de Wikimedia Commons.
  Uso: `python3 tools/entorno_build.py [--proyecto ID] [--rutas] [--locales | --teselas] [--videos] [--fotos]`; sin opciones solo regenera con la caché.
  - **Otros proyectos** (`--proyecto malalcahuello|marchigue`): leen `tools/entorno/ID/lugares.json` (con su caché de
    rutas y sus `originales/`) y escriben `lib/entorno-ID.js` y `assets/entorno/ID/`. Se abren con
    `entorno.html?p=ID` (lista blanca en el cargador al final de `entorno.html`; sin `p` es Puerto Varas) y la llave
    `pagina` pone marca, bajada, texto y enlace de vuelta. En el sitio: `entorno` del proyecto en el manifiesto
    (apartado "Conoce cada proyecto") y enlaces "Descubre el entorno" en las tarjetas de proyectos y de "otros proyectos".
    La coordenada que dio el cliente para **Malalcahuello está en el sector Lolén (comuna de Lonquimay)**, a 20 min de
    Lonquimay y 50 min del pueblo de Malalcahuello; el mapa incluye el pueblo y el volcán Batea Mahuida (pedido del
    cliente). En Marchigüe el nombre del sector no está confirmado. Todos los textos de lugares de estos dos mapas
    llevan `"revisar": true` (por aprobar con el cliente) y no tienen videos ni fotos aún (la ficha usa el satelital).
    Fuera de la imagen el mapa muestra su borde reflejado y apagado (`img.espejo`) y `clampTo` deja pasar la vista un
    poco del borde (18 % del ancho, 30 % del alto): en estos dos la parcela y varios lugares quedan cerca del borde.
    Revisión: `tools/pruebas/entorno.js [ID]` (todos los lugares en los mismos 7 tamaños; correr también Puerto Varas).
  - Imagen: Sentinel-2 cloudless **2016** de EOX (CC BY 4.0, uso comercial con crédito; las ediciones posteriores
    son no comerciales). **No usar Google Earth** (la captura del folleto): sus Geo Guidelines no lo permiten en sitios
    comerciales. Como la red del entorno bloquea `tiles.maps.eox.at`, el usuario bajó dos GetMap WMS en EPSG:3857
    (`tools/entorno/originales/`, bbox y parámetros en `imagen.originales` de `lugares.json`) y `--locales` arma las
    capas: base z11, capa z12 desde `desde: 1.5` y detalle nativo (~9 m/px) alrededor de la parcela desde 2.4, con un
    mismo ajuste de color para todas (si no, se notan los bordes). Con red, `--teselas` hace lo mismo desde las teselas.
  - Videos del cliente (tomas de dron de 4 a 9 s con música): `video.original` en `lugares.json`; `--videos` los
    convierte a `assets/entorno/videos/<id>.mp4|.webm|.webp` (1280 px, ~2,5 Mb/s, portada en `portadaSeg` o a la
    mitad). Los originales no van en `main` (pesan ~100 MB): están en el commit `b65d98e` de `Biplot/biplot`, rama
    `claude/modest-feynman-vqi1ih` ("Add files via upload") y el cliente los tiene; sin original, `--videos` deja lo
    ya convertido. En el mapa, al terminar la animación de la ruta aparece "Ver video" bajo la píldora (`vBtn`,
    ubicado en `labels()`); la ficha muestra la portada con botón; la ventana flotante (`openVideo`) va entre el panel
    y la ficha en computador y es modal con fondo en celular; Escape la cierra y al terminar se cierra sola (el foco vuelve al botón que la abrió).
    La primera vez que se llega a cada lugar (por sesión, `sessionStorage` "entorno-videos") el video se abre solo
    al terminar la ruta; después, con el botón. No se abre solo en "Recorrer el entorno" ni con movimiento reducido.
    Si el navegador no deja partir con sonido, parte en silencio con "Activar sonido" (`[data-vp-snd]`).
  - Fotos: títulos de Wikimedia Commons en `foto.commons`; `--fotos` las baja (1200 px) con autor y licencia para el
    crédito (requiere `commons.wikimedia.org` y `upload.wikimedia.org`). Sin foto, la ficha usa un recorte del satelital.
  - Coordenadas verificadas con al menos dos fuentes (Sernageomin, Conaf, EFE, municipio, Wikipedia, OSM). "Parque
    Vivo Alerces" del folleto es el **Parque y Vivero Alerce** (así dice el letrero en el video del cliente). Textos de lugares que
    no están en el folleto llevan `"revisar": true` en `lugares.json`.
  - Interfaz: estrella de rutas tenues desde el proyecto, lista agrupada por tiempo, ficha con resumen inicial,
    enlaces directos `entorno.html#pvaras`, modo "Recorrer el entorno", zoom con la rueda (en computador sin Ctrl:
    la página no tiene más contenido bajo el mapa; bajo 1100 px pide Ctrl), pellizco y teclado. El cliente pidió
    quitar las secciones "Cifras con método" y "Fuentes y créditos": el crédito obligatorio (OpenStreetMap y
    Sentinel-2, CC BY 4.0) queda en el pie del mapa; `metodo` y `creditos` siguen en los datos.
    Los rótulos se ubican sin choques en `labels()` (interfaz, píldora, trazo de la ruta y pines; lo que no cabe se
    esconde). La píldora del lugar elegido se abre hacia el lado libre y, si no cabe, pierde el tiempo (`is-short`).
    En celular un dedo en vertical desplaza la página (no el mapa) y el aviso "Ver ficha" queda en la parte visible.
    Paneles compactos (el mapa manda): en computador el panel de lugares (`--pw` 284/300 px) se pliega a su cabecera
    (`[data-pmin]`, `.panel.is-min`) y la ficha (`--cw` 304/324 px, alto automático, texto en 3 líneas con "Leer más")
    se minimiza a una barra con el lugar y su tiempo (`[data-cmin]`/`[data-cmax]`, `S.cmin`); `free()` y `slack()`
    usan esos estados y `reframe()` reacomoda la vista. Filtros en 4 columnas (ícono y nombre) en computador.
  - Tour virtual 360° de la parcela: la URL sale de `tour` del proyecto en `lib/manifest.js` (`P.manifiesto` o
    "puerto-varas"). Se abre con "Tour virtual 360°" bajo la parcela (`tBtn`, sin lugar elegido), con el 360° de la
    ficha de la parcela o con `entorno.html#tour-360`: el mapa vuela a la parcela y el tour se abre como un portal
    circular desde ella (`openT360`/`closeT360`, `clip-path` animado), sobre todo el escenario en computador y a
    pantalla completa bajo la barra en celular. Barra con "Volver al mapa", pantalla completa y pestaña nueva; abajo,
    "Desde aquí" con los lugares del resumen: al tocar uno se cierra el tour y se dibuja esa ruta. Si el navegador
    no deja incrustarlo (CSP) o no carga en 15 s, ofrece abrirlo aparte. El proxy de la nube bloquea netlify: probar
    con `page.route` que responda una página simulada.
    Revisión: `tools/pruebas/entorno.js` (los 17 lugares en 1920, 1440, 1280, 1100, 390, 320 y 844×390; `MIN=1` con paneles minimizados).
- **Formulario de la portada de Puerto Varas** (`[data-pv-lead]`, `initPvLead`): translúcido (vidrio con desenfoque),
  a la derecha del título desde 1100 px y bajo los botones en pantallas menores (ahí la pausa del video pasa a la
  izquierda). Nombre, teléfono, correo opcional y autorización; arma el mensaje ("plano y precios de lanzamiento" del
  destacado), lo muestra y lo envía con un enlace de WhatsApp, igual que `#visita`.
- **Fotos de las parcelas** (`assets/img/tour-ID-*`, 800/1600 px y miniatura): vistas aéreas reales sacadas de la
  panorámica de cada tour 3DVista (material del cliente, sin crédito). Se usan en el fondo del recorrido 360° y su
  selector (`tourFoto`; sin él, la ilustración de la tarjeta), en las tarjetas de "otros proyectos" y en el apartado
  "Conoce cada proyecto" (`foto`; si alguna vez se usa una foto ajena, `credito` y `url` muestran el crédito). Antes
  hubo fotos de Wikimedia Commons; se reemplazaron por estas. Se arman con `tools/tour_fondo.py` (ver su encabezado). Los tours
  no se alcanzan desde la nube: las caras se bajaron con un flujo temporal de GitHub Actions, ya borrado.
- **Vitrina para otros sitios** (`vitrina.html`, generada por `tools/vitrina_build.py` desde la sección `#entorno` de
  `index.html`; volver a correrlo si esa sección cambia): la sección "El entorno" sola, para incrustarla con un
  `<iframe>` (por ejemplo en Squarespace). Enlaces en pestaña nueva y avisa su alto con `postMessage({fundosVitrina})`.
  Código para pegar en un Bloque de código de Squarespace: `docs/squarespace-vitrina.html` (con alto de respaldo si
  el script no corre; los scripts en bloques de código requieren plan Business o superior).
  El **mapa interactivo** completo también se incrusta: `entorno.html?embed=1` (se combina con `p=`) quita la barra
  superior, fija el alto (mapa 720 px en computador, 440 px en angosto) para que nada dependa del alto del iframe,
  pide Ctrl para la rueda (la página de afuera sigue bajando), abre el video y el tour sobre el mapa en pantallas
  angostas, abre en pestaña nueva los enlaces que salen del mapa y avisa su alto con `postMessage({fundosEntorno})`.
  Código para Squarespace: `docs/squarespace-mapa.html`.
- `assets/img` fotos y logos (WebP) · `assets/video` saludo del equipo (MP4 H.264 + WebM de respaldo + portada) ·
  `assets/fonts` Cormorant Garamond y Mulish autoalojadas.

## Planos: cómo se hicieron y cómo reemplazarlos
- Hoy salen de segmentar las imágenes de los masterplan (OpenCV + shapely) y enderezarlos con
  `tools/enderezar_planos.py` (cobertura simplificada: tolerancia 16 en Malalcahuello, 12 en Marchigüe). Puerto Varas
  son rectángulos. Marchigüe lotes 1-4 y 49-51 se retrazaron a mano con las líneas del masterplan.
- **Pendiente:** el cliente enviará los planos en **SVG** (Malalcahuello y Puerto Varas primero, Marchigüe después) para
  calcarlos exactos. Al llegar: verificar que cada lote sea su propia forma vectorial (no una imagen incrustada),
  asociar cada forma a su número de lote (por posición de la etiqueta o comparando con la geometría actual),
  llevar las coordenadas al `viewBox` del proyecto y regenerar `lotes`, `calles`, `agua` y `contorno` manteniendo el
  formato `{d, l, r}` (`l` con `shapely.ops.polylabel`, `r` = distancia de `l` al borde). No cambiar el render.
- El render (formato estándar Fundos) vive en `main.js`: `PLANO`, `svgPlan`, `catsHtml`, `legendHtml`; pins a tamaño
  constante en pantalla vía `--u`; zoom y encuadre en `layoutPlan`, `applyView`, `reveal`, `frameLots`.

## Pruebas
Servidor local desde la raíz del repo: `python3 -m http.server 8765 --bind 127.0.0.1`. Pruebas Playwright en
`tools/pruebas/` (ver su `LEEME.md`); correrlas desde una carpeta temporal con `mkdir ux` porque guardan capturas.
Mínimo antes de publicar: `interacciones.js`, `plano.js`, `qa.js`, `anchos.js` (sin desborde de 320 a 1920 px).

## Particularidades del entorno (sesiones en la nube)
- Chromium de Playwright: `executablePath: "/opt/pw-browsers/chromium"`, `NODE_PATH=/opt/node22/lib/node_modules`,
  `--proxy-server=$HTTPS_PROXY`. **No reproduce H.264**: los videos deben tener también WebM (y así se prueban).
- El proxy bloquea biplot.cl (verificar el despliegue por GitHub Actions "pages build and deployment"), Hugging Face
  (no hay transcripción de audio) y algunos CDN.
- También bloquea Overpass (`overpass-api.de` y espejos), Nominatim y las teselas de OpenStreetMap; OSRM sí funciona.
  Desde el navegador del usuario, `overpass-api.de` responde 406 a las consultas por enlace (GET): usar el espejo
  `overpass.kumi.systems` u Overpass Turbo (Exportar → datos sin procesar). El usuario sube los archivos por la web
  de GitHub ("Add files via upload") a la rama de trabajo.
- Git: no reescribir la rama de trabajo (el entorno bloquea el push forzado). Tras fusionar un PR, seguir sobre la misma
  rama: subir encima, fusionar `main` en la rama (`git merge origin/main`; si choca solo por la fusión squash,
  quedarse con la versión de la rama tras verificar que `main` no trae nada más) y abrir otro PR.
- Fotos HEIC del iPhone: `pip install pillow-heif`. ffmpeg: `pip install imageio-ffmpeg`. Videos del iPhone son HDR
  (HLG): convertir a SDR con `zscale` + `tonemap` antes de codificar.

## Decisiones tomadas con el cliente
- Portada: video de caballos pastando (entregado por el cliente, `assets/video/portada*`: bucle sin salto con fundido, sin audio, versión vertical para celular) en el marco de la foto del equipo, que queda de respaldo.
- Una tarjeta y una ficha (ventana) por persona del equipo, con su presentación en sus palabras (sin reescribirla).
  No suponer género ni cargos: hoy todos dicen "Equipo comercial" hasta tener los cargos reales.
- Santo Domingo fuera de la propuesta. No bajar videos de internet: solo material propio del cliente.
- Planos con líneas rectas como el masterplan. En computador la herramienta completa (proyectos, filtros, chips,
  plano y leyenda en franja baja) cabe en la pantalla: el plano mide entre 380 y 480 px de alto y no pasa del 47 % de la ventana (`layoutPlan`); los
  chips de precio van en una sola fila (precio arriba, precio lista y disponibles abajo); el
  detalle del lote toma el mismo alto (`--stage-h`) y los enlaces a `#plano` llevan directo a la herramienta.
  En celular el plano parte acercado (lotes tocables) con botón para ver completo.
- Cotizador compacto: la cotización completa visible en computador; en celular, franja con la cuota bajo los controles.
- Puerto Varas (textos del cliente, octubre 2026): parcelas **planas**, con rol propio (SAG) y vista a los volcanes
  Osorno (a la derecha) y Calbuco (a la izquierda, al fondo), en el Pasaje El Encanto (Ruta La Colonia); acceso
  controlado, caminos estabilizados, factibilidad eléctrica en la entrada y agua por noria o pozo. **No decir "bosque
  nativo"** (hay poco) y el estero **cruza la parcelación** (no "entre bosque y estero").
- **Descartado (octubre 2026):** mini mapa de servicios por ciudad (hospital, supermercados, etc. al llegar a una ciudad
  en el mapa del entorno). El usuario lo dejó de lado; no retomarlo salvo que lo pida.
- Página en pestañas (pedido del cliente): Puerto Varas, el proyecto que están empujando (con su folleto), es lo más
  atractivo del inicio; el resto (proyectos, compra, equipo) va en otras pestañas.
- Página corta por secciones (el cliente sintió que tanto scroll cansa): Cómo comprar, Simulador, Preguntas y Mi compra
  van como pestañas en `#tu-compra` (`initCompra`; los enlaces a esos `#id` abren su pestaña); Nosotros compacto con
  valores cortos y el equipo en carrusel; proyectos en carrusel en celular; indicador de sección (`[data-nav-where]`)
  y barra de avance (`--avance` en `.nav`). Medir el largo con `tools/pruebas/largo.js` si se agregan secciones.
