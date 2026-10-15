# Propuesta Fundos Inmobiliaria — contexto para Claude

Rediseño del sitio de Fundos Inmobiliaria (parcelas en Malalcahuello, Marchigüe y Puerto Varas), hecho por BiPlot
según el **Manual de Marca Fundos 360°**. Sitio estático: HTML, CSS y JavaScript sin build ni dependencias.
Toda la interfaz y los textos van en **español de Chile**. Lee también `README.md` (qué propone la página y la lista
"Estado y próximos pasos").

## Dónde está publicado
- **Sitio público:** https://fundos.biplot.cl/ (GitHub Pages desde `main` de `4ChrisM/fundos-web`, dominio en `CNAME`;
  DNS: CNAME `fundos` de biplot.cl → `4chrism.github.io`). Lleva `noindex`. **Pasará a fundosinmobiliaria.com**
  (reemplaza al sitio de Squarespace; el cliente lo dejó para después): cambio listo en el commit `80c7385`, paso a paso
  y orden en `docs/cambio-dominio.md` (primero los DNS, después fusionar). Hasta octubre 2026 vivió en
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
- **Pestañas** (`initVistas` en `main.js`): Inicio (`#puerto-varas`, portada con Puerto Varas destacado) · Proyectos · Tu compra · Equipo. Cada sección dice
  en `data-vista` en qué pestañas aparece (`#plano` solo en Inicio; `#visita` en todas menos Proyectos; los botones 360°
  abren `entorno.html…#tour-360` del proyecto) y el
  CSS esconde el resto (`html.js[data-vista=…]`). Sin JavaScript se ve todo seguido. Un script en el `<head>` fija la
  pestaña según el `#` para que no parpadee. Los enlaces internos (`#simulador`, `#plano`, `#equipo-4`…) cambian de
  pestaña solos; las pestañas llevan al comienzo (`#puerto-varas`, `#mas-proyectos`, `#tu-compra`, `#nosotros`).
  En celular y tablet (< 1024 px) las pestañas van en una franja bajo la barra (`--tabs-h`; usar `navBottomPx()` para
  medir la barra). Al cambiar de pestaña se dispara `resize` (el plano y el mapa de Chile se reacomodan) y `fundos:vista`.
- **Inicio** (feedback del equipo de ventas, octubre 2026): la pestaña se llamaba "Puerto Varas" y la gente creía que
  solo vendían ahí. Ahora se llama **Inicio**; la portada tiene un título general ("Tu lugar en el campo, a tu nombre"),
  nombra los tres proyectos y presenta Puerto Varas como "Nuevo"; al pie, la franja **Nuestros proyectos** (`.pv-proys`,
  `[data-pv-proy]`, desde/disponibles del manifiesto) lleva a cada uno, y el formulario de la portada tiene selector de
  proyecto (el destacado primero). El formulario va arriba a propósito: el equipo pidió que el contacto esté al
  principio y no solo al final.
- **El entorno en Inicio** (`#entorno`): para que la gente pinche (pedido del cliente), el mapa en miniatura lleva la
  etiqueta "Mapa interactivo" con punto que late, el botón centrado "Explora el mapa interactivo · Rutas, tiempos y videos"
  con pulso dorado, "Tu parcela" con anillo que late, acercamiento y borde dorado al pasar el mouse, y el botón principal
  "Explorar el entorno" grande con un brillo que lo recorre (sin animaciones con movimiento reducido). Regenerar
  `vitrina.html` si cambia.
- **Destacado** (`destacado` en `lib/manifest.js`, hoy Puerto Varas): abre la página con su portada en video
  (`videoDestacado`, bucle sin texto armado con los videos del cliente: lago, Frutillar, Petrohué, Osorno y Puerto
  Varas; versión vertical para celular), datos (desde, disponibles), la vitrina del entorno (mapa en miniatura con
  las rutas de `lib/entorno-datos.js`, que se carga al acercarse; tiempos y videos que abren `entorno.html#lugar`) y
  es el proyecto con que parte el plano. Al final de esa pestaña, "Cotiza también nuestros otros
  proyectos" (`#otros-proyectos`, `[data-otro]`): Malalcahuello y Marchigüe con desde/disponibles del manifiesto,
  "Cotizar" (precarga el formulario de visita) y "Ver lotes". El plano de Puerto Varas (ancho, `.plan.is-wide`) va con
  el detalle a la derecha y baja de alto (`layoutPlan`); el panel toma el alto del plano y muestra 3 lotes más baratos. Las pruebas usan `tools/pruebas/_vista.js` (`clasica()` deja
  la pestaña Inicio con el plano en Malalcahuello).
- **Pestaña Proyectos = solo el mapa "Fundos en todo Chile"** (`#mas-proyectos`; pedido del cliente, oct-2026: "que la
  página de proyectos sea solo de los proyectos"; el equipo votó entre una versión vertical y una horizontal y **ganó la
  vertical**). Se quitaron de esa pestaña la portada con el video de caballos, el buscador, la franja de valores, las
  tarjetas de proyectos, el aviso de Tu casa, "Conoce cada proyecto" y el recorrido 360° en la página (con sus módulos
  `initHero`, `initFinder`, `initProjects`, `initFichas` e `initTour`, y su CSS). Los enlaces viejos (`#proyectos`,
  `#proyectos-inicio`, `#conoce`, `#recorrido`, `#inicio`, `#buscador`, `#recorrido-ID`) llevan al mapa y `#proyecto-ID`
  ("Conocer el proyecto" de Inicio) abre la ficha de ese fundo en la ventana. El recorrido 360° de cada proyecto se abre
  en su mapa del entorno (`entorno.html[?p=ID]#tour-360`), también desde el menú y el pie. `videoPortada` del manifiesto
  y `assets/video/portada*` ya no se usan.
- `index.html` todo el contenido (se lee sin JS) · `styles.css` tokens del manual + estilos · `main.js` módulos IIFE
  (`initPlan`, `initVisit`, `initSellers`, `initVideo`, `initCompra`, `initMapaChile`, …) aislados con `safe()`.
- `lib/manifest.js` **único lugar de datos**: contacto, proyectos, lotes (`[n, categoría, estado]`), categorías de
  precio (color, precio, precio lista), financiamiento, `equipo` (nombre, apodo, cargo, foto, bio, whatsapp, video)
  y `videoPortada` (mp4/webm y versión `Movil`). Contacto general real (oct-2026): WhatsApp +56 9 9292 2429 y
  ventas@fundosinmobiliaria.com (también escritos en los `href` de `index.html` para la página sin JavaScript); horario
  martes a viernes de 10:00 a 19:00 y visitas a terreno los fines de semana (`contacto.horario` y `contacto.visitas`,
  `[data-horario]`/`[data-visitas]`); en `#visita`, si eligen un día de semana sin videollamada, `[data-fecha-nota]` avisa
  (no bloquea). `masProyectos`: proyectos genéricos "Fundos de …" (ver "Trabaja con nosotros y Más proyectos").
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
    (ficha del fundo en Proyectos) y enlaces "Descubre el entorno" en las tarjetas de "otros proyectos".
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
    mitad). Los originales no van en `main` (pesan ~100 MB): Angelmó en `ba2889f` de este repo; el resto en el commit `b65d98e` de `Biplot/biplot`, rama
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
- **Tu casa** (`#tu-casa`, pestaña de "Tu compra", `initCasa` en `main.js`, pedido del cliente oct-2026, "para vender
  el sueño"): el lote real (forma de `lib/planos.js` escalada a su superficie en m², con su lado más largo horizontal)
  en **vista isométrica** (`P()`/`suelo()` proyectan y devuelven al suelo; botón "Planta" para verlo desde arriba),
  pasto con cuadrícula de 5/10 m, largo de cada deslinde, árboles de ambientación (siempre los mismos por lote; se
  apartan donde se construye) y construcciones genéricas en volumen con sombra (`TIPOS`: casa, **casa de dos pisos**
  (ventanas por piso y faja; cuenta la huella × 2 pisos), casa de visitas, quincho y estacionamiento como pérgola, bodega y
  **piscina** (borde, muros interiores y agua; `cuenta: false`: se muestra pero no suma a lo construido). Las viviendas y la bodega
  tienen **techo plano o a dos aguas** (`it.dos`, selector "Techo"; cumbrera por el lado mayor, 25°, alero 35 cm,
  frontones en los lados cortos). **Camino de acceso** (botón que lo enciende/apaga, `camino()`): ripio de 3,6 m con
  postes de portón desde el deslinde de acceso hasta la primera vivienda; el deslinde de acceso es el del lote más
  cercano a una calle o servidumbre de `lib/planos.js` (`acceso()`, `tramos()` lee M/L/H/V/Z) y su largo dice "· acceso". **Autos y personas**
  (botón "Autos y personas", `escena()`, `auto()`, `persona()`; ambientación que no cuenta ni se elige): un auto
  estacionado frente a la casa y otro entrando por el portón (si el camino es largo), una pareja junto al auto, gente al
  borde de la piscina y en el quincho; se reubican al mover las construcciones y tienen sombra según el sol. La elegida muestra cotas en metros, la esquina
  dorada (tamaño, centro fijo, 2 a 40 m, pasos de 0,5 m) y el círculo (giro, 5°); se arrastra con mouse o dedo (sin
  desplazar la página). Zoom, "ver el lote completo", pantalla completa; parte acercada a la casa (`acercar()`).
  Teclado: flechas (siguen la pantalla en 3D; Mayús = 5 m), R gira, Supr quita. Medidor contra el **10 % de la
  superficie** (regla que dio el cliente; `PCT`), aviso si se pasa o si algo queda fuera, y "Enviar mi diseño a un
  asesor" por WhatsApp. Desde el detalle del lote: "Dibuja tu casa en este lote" (`[data-d-casa]`, `Casa.set`). Solo
  lotes no vendidos. Texto legal: referencial, la DOM fija superficie, distanciamientos y permiso. Prueba: `tools/pruebas/casa.js`.
  **Diseño en computador** (pedidos del cliente: "que se vean todas las variables" y luego "más armónico"): desde 960 px
  el encabezado va en una franja; columna izquierda de 320 px con lote, medidor, construcción elegida y envío; **"Agrega a
  tu parcela" es una franja de herramientas sobre el dibujo** (`.casa-add`, con medidas y los botones de camino y autos a la
  derecha); el dibujo toma el resto del alto (`--casa-h` = 100vh − 262 px; svg = `--casa-h` − 196 px, mín. 300). Medido:
  todo a la vista en 1920×1080, 1440×900 y 1366×768.
  **Sol según la hora** (`sol()`): latitud del proyecto (`LAT`), época del año (verano/otoño/invierno, `DECL`) y hora
  de reloj (hora solar ≈ reloj − 0,85 h; en verano − 1,85 h), suponiendo el **norte hacia arriba del plano** (dicho en el
  texto legal). Da la dirección y el largo de las sombras (también en planta), la luz de cada muro y agua del techo
  (`cara()`), y el tono del ambiente (`amb()`, que `mk()` aplica a todo `fill`: día, hora dorada, crepúsculo, noche con
  ventanas encendidas). Barra bajo el lote (`.casa-sol`: hora, ▶ "ver el día" de 6:30 a 21:30, época) y brújula con el
  norte y el sol (`.casa-brujula`). Parte en verano a las 17:00.
  **Guiado a elegir parcela** (pedido del cliente): "Diseña tu casa" de la barra y el menú, el aviso y "Elegir mi lote en
  el plano" (`[data-casa-guia]`) llevan a `#plano` con la guía (`Plan.guia`, `[data-plan-guia]`): paso 1 "toca un lote
  disponible" (los disponibles destellan), paso 2 con "Diseñar mi casa aquí" (`[data-d-guia]`, primero en el detalle del
  lote) que abre la herramienta en ese lote. El aviso ofrece además "o pruébalo con un lote de ejemplo" (`#tu-casa`).
  **Acceso visible** (el cliente lo encontraba escondido): "Diseña tu casa" con etiqueta "Nuevo" en la barra (`.nl-casa`;
  en la franja de celular, "Tu casa" con un punto) y en el menú (`.menu-casa`), y un aviso con imagen (`.casa-promo`,
  `#disena-inicio` en Inicio tras "Por qué"). La imagen del aviso
  es una **foto real** de una casa de campo en Puyuhuapi, Aysén (Wikimedia Commons, LBM1948, CC BY-SA 4.0, recortada;
  `assets/img/casa-parcela-800/1400.webp`, crédito obligatorio en el pie) con una miniatura del diseño en 3D encima
  (`assets/img/tu-casa-800.webp`, captura de la herramienta). Se bajó con un flujo temporal de GitHub Actions, ya borrado.
- **Parcela agroresidencial en Tu casa** (pedidos del cliente, oct-2026): **máximo 2 viviendas** (`MAXCASAS`; casa, casa de
  dos pisos y cabaña; los botones se desactivan y el medidor dice "Casas: n de 2") que juntas con lo demás no pasan del 10 %;
  **la mitad del lote va con frutales (25 %) y conservación natural (25 %)** para mostrar que es agroresidencial: `agro()`
  corta el lote (ya girado con su lado largo horizontal) con una línea vertical en la mitad lejos del acceso (`recorte()`
  y `corte()`), los frutales van en hileras cada 6 m más cerca de la casa y la conservación al fondo, con árboles nativos
  irregulares (`arbolAgro()`); especies y color de la fruta por proyecto en `AGRO` (Puerto Varas: manzanos, cerezos,
  avellanos / maqui, arrayán, canelo; Malalcahuello: manzanos, guindos, castaños / ñirres, coigües, notros; Marchigüe:
  olivos, almendros, nogales / quillayes, peumos, litres; por confirmar). **No se construye ahí** (aviso en el panel y en el
  texto legal): una construcción encima se marca en rojo (`enAgro()`, `malo()`) y `ubicar()` pone lo nuevo en la mitad
  libre. **Casas de campo** (para vender una vida de campo): madera en tinglado (`tablas`), ventanas con marco blanco y
  cruz, techo de zinc a dos aguas por defecto, **corredor** con piso de madera y pilares en el lado largo del frente
  (`corredor()`) y chimenea (`chimenea`). **Pendiente para más adelante:** pendientes del terreno según la ubicación.
- **Trabaja con nosotros y Más proyectos** (oct-2026): en la pestaña Equipo, `#trabaja-con-nosotros` con dos formularios
  (`[data-mini-form]`, `initMiniForms`): **"Vende tu campo a Fundos"** (`#vende-tu-campo`: Fundos compra campos para
  parcelar) y **"Ofrece tus servicios"** (`#proveedores`: red de proveedores). Arman el mensaje con los campos que tienen
  `data-label`, lo muestran y lo envían por WhatsApp (`[data-mini-wa]`, evento `generate_lead` con el formulario) o por
  correo. Enlaces en el menú y en el pie ("Trabaja con nosotros"). **Más proyectos** (`#mas-proyectos`, "Fundos en todo
  Chile", pestaña Proyectos, `initMasProyectos`, clases `.mp-*`): proyectos heredados que Fundos tomó de otra empresa;
  **el cliente pidió que sea sutil: nunca nombrar la marca anterior ni presentarlos como una línea aparte**, y cada uno se
  llama "Fundos de …". Tarjetas genéricas desde `masProyectos` del manifiesto (nombre, región, zona, descripción,
  `datos` (etiquetas), `paisaje` y `lat`, estado opcional; **sin precios ni plano ni 360°**, pedido del cliente) con "Quiero
  información" por WhatsApp; en celular, franja que se desliza. **Diseño de emblema** (al cliente le gustaban los logos de sus proyectos, oct-2026): cada
  tarjeta parte con un emblema crema dibujado en línea al estilo de esos logos (escena propia por proyecto en `EMB` de
  `main.js`, por `id`: portón de piedra con olivo, lago con velero, costa con eucaliptos, torre de Talca, cipreses y
  tractor, cordillera, roquerío, río con álamos, pescador en bote, alerce con helechos; arco de sol dorado), "FUNDOS DE",
  el nombre en mayúsculas espaciadas, adorno dorado y `lema` (frases de los logos del cliente). Un proyecto nuevo necesita
  su escena. Abajo: ubicación, texto, etiquetas y "Quiero información". Con la lista
  vacía la sección y su enlace del pie no se ven. Desde oct-2026 tiene los 10 proyectos del sitio actual del cliente:
  Santo Domingo, Lago Rapel, Bucalemu, Talca, Retiro, San Fabián de Alico, Cobquecura, Río Liucura, Río Negro y Puerto
  Montt (textos resumidos de su sitio; los nombres antiguos dentro de esos textos, como "Fundo Río Mar" o "La Gran
  Reserva", no se usan).
- **Mapa "Fundos en todo Chile"** (`[data-mch]` en `#mas-proyectos`, `initMapaChile`; pedido del cliente: "jugar con la
  latitud"; es toda la pestaña Proyectos). Historia: el cliente descartó Chile acostado ("no es representativo") y el
  fondo negro ("opacaba la figura del país"), eligió la paleta **Arena** y después pasó por una "sala de cine" (Chile
  completo + lupa + carrusel que avanzaba solo + resumen); el equipo votó entre dos propuestas y **ganó la vertical**
  (oct-2026), que es la actual: a la izquierda un **mapa largo y fijo** (`[data-mch-mapa]`, `armarV()`): tramo de Chile
  con punto y nombre por fundo a los costados con línea corta (el lado según el ancho de Chile a esa latitud: costa a la
  izquierda, cordillera a la derecha), latitudes cada 2°; una búsqueda binaria elige cuántos grados mostrar para que el
  mapa llegue al final de la galería (hasta Chile entero) y se rehace al cambiar el alto de la galería (`ResizeObserver`);
  textos y puntos a tamaño fijo en pantalla con `--fs`; en celular, un largo fijo (dos veces el ancho). Chile sale de
  `lib/mapa-chile.js`, **generado** por `tools/mapa_chile_build.py` (límites de la BCN vía github.com/fcortes/Chile-GeoJSON,
  simplificados con shapely, proyección equirectangular `proy`). A la derecha, la **galería de norte a sur agrupada por
  región** (`.mch-row`, `.mch-grupo`; 3 columnas en computador, 2 en celular), mitad y mitad con el mapa. Al bajar se marca
  el fundo que está a media pantalla (punto, nombre y región). **Todas las tarjetas llevan emblema dibujado** (escenas en
  `EMB` a partir de los logos del cliente), los tres con plano con el sello "Plano y recorrido 360°"; al pasar el mouse la
  tarjeta se eleva con borde dorado y "Ver ficha". Tocar una tarjeta, un punto o un nombre del mapa abre la **ficha en una
  ventana sobre la página** (`<dialog>` con `showModal`, `[data-mch-ficha]`, pedido del cliente: "que muestre todo el
  proyecto"), con **flechas a los costados** (`.mf-flecha`, en los márgenes en computador y abajo en celular), flechas del
  teclado, deslizar la foto en celular y "Anterior/Siguiente" al final para pasar por los 13 fundos; se cierra con ×,
  Escape o tocando fuera, y "Ver lotes" y "Cotizar" la cierran antes de ir (a Inicio). Estilo oscuro con las clases
  `.py-*` (foto grande con el nombre, miniaturas, franja de datos, características con íconos, "Cerca de tu parcela" y
  acciones; sin fotos, el emblema en un recuadro crema). Fotos con miniaturas (`galeria` del proyecto en el manifiesto,
  armadas por `tools/galeria_build.py` en `assets/img/galeria/`; el satelital del entorno lleva crédito Sentinel-2/EOX).
  **Los 13 fundos tienen fotos** (oct-2026): los 10 de `masProyectos` con fotos del cliente, subidas a `subidas/` como
  "NN. Nombre.webp" (el número da el orden; `ALIAS` del script reconoce el fundo), convertidas y borradas de la rama; los
  títulos (`alt`) se escribieron a mano según lo que se ve en cada foto (por confirmar con el cliente). Los 3 con plano
  muestran descripción, datos (desde, disponibles, 5.000 m², reserva), destacados, cercanías y "Ver lotes y precios" /
  "Cotizar" / "Recorrido 360°" (al mapa del entorno); los de `masProyectos`, emblema, lema, etiquetas y "Quiero
  información" por WhatsApp / "Agendar una conversación". Un punto por proyecto (dorado los 3 con plano: lat/lon del
  enlace `mapa` del manifiesto; claros los de `masProyectos`: `lat`/`lon` aproximados); la región sale de dónde cae el
  punto. Sin `lib/mapa-chile.js`, las tarjetas van en la grilla simple (`[data-mp-list]`, `mpCard`). Crédito "Chile
  continental · límites regionales: BCN". Prueba: `tools/pruebas/fundos-chile.js`.
- **Formulario de la portada** (`[data-pv-lead]`, `initPvLead`): translúcido (vidrio con desenfoque),
  a la derecha del título desde 1100 px (ahí la pausa del video pasa a la izquierda) y bajo los botones en pantallas
  menores. Proyecto (selector armado desde el manifiesto), nombre, teléfono, correo opcional y autorización; arma el
  mensaje ("plano y precios", "de lanzamiento" si es el destacado), lo muestra y lo envía con un enlace de WhatsApp, igual que `#visita`.
- **Fotos de las parcelas** (`assets/img/tour-ID-*`, 800/1600 px y miniatura): vistas aéreas reales sacadas de la
  panorámica de cada tour 3DVista (material del cliente, sin crédito). Se usan en las tarjetas de "otros proyectos" y en la
  franja "Nuestros proyectos" de Inicio (`tourFoto`, `foto`; antes también en el recorrido 360° en la página y "Conoce
  cada proyecto", ya quitados). Antes
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
- **Medición de visitas** (`lib/analitica.js`, cargado en `index.html`, `entorno.html` y `vitrina.html`): Google
  Analytics 4 y/o Microsoft Clarity, solo si `analitica.ga4` / `analitica.clarity` del manifiesto tienen ID (vacío =
  no se carga nada). Eventos con un solo escucha de clics: `generate_lead` (se abre WhatsApp desde un formulario),
  `contacto_whatsapp`, `tour_360`, `ver_lotes`, `ver_entorno`; dentro de un iframe marca `incrustado`.
- `assets/img` fotos y logos (WebP) · `assets/video` saludo del equipo (MP4 H.264 + WebM de respaldo + portada) ·
  `assets/fonts` Cormorant Garamond y Mulish autoalojadas.

## Planos: de dónde salen
- **Desde oct-2026 son los planos comerciales de Fundos 360°** (pedido del cliente: "replicarlos tal cual"). Fundos 360°
  (`4ChrisM/fundos-os`) los extrae de los PDF comerciales de Illustrator (`scripts/planos/extraer_planos_pdf.py` →
  `lib/planos/datos.ts`): forma exacta de cada lote por su número, servidumbres, agua, camino principal, contorno, la foto
  satelital del PDF con su matriz, la leyenda de precios y qué lotes aparecían disponibles. Para traerlos:
  `python3 tools/planos_fundos360.py <ruta a fundos-os>` (clonarlo al lado), que escribe `lib/planos.js` (coordenadas del
  PDF en puntos; las curvas pasan a tramos rectos para "Tu casa"), copia las fotos a `assets/planos/` y **reescribe en
  `lib/manifest.js` las `categorias` (colores y precios de la leyenda) y los `lotes` (disponible/vendida)** de cada
  proyecto. Volver a correrlo cuando Fundos 360° extraiga PDF nuevos; no editar esos bloques a mano.
- **Fondo satelital** (`P.fondo`, `<image class="pl-sat">` con `transform="matrix(…)"`): parte encendido, como los PDF;
  botón "Satélite / Plano" junto al zoom (`[data-fondo-ui]`, `sessionStorage` "plano-fondo"). Con satélite se esconde
  la base gris del predio y los lotes quedan translúcidos. Esteros como línea (`agua[].trazo`) y camino principal
  relleno (`caminoPrincipalRelleno`, Puerto Varas).
- Antes (hasta oct-2026) salían de segmentar las imágenes de los masterplan (`tools/enderezar_planos.py`, ya en desuso).
- Las pruebas usan lotes disponibles según los PDF (Malalcahuello: 5, 18-20, 25, 30-32, 41, 45, 46; Marchigüe: 31, 32,
  37, 40, 42, 44, 45, 59, 60, 67): si cambia la disponibilidad, revisar los números en `tools/pruebas/`.
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
- **Sin "Propuesta" ni Fundos 360° a la vista** (pedido del cliente, oct-2026): se quitó la etiqueta "Propuesta · datos de
  ejemplo" de la barra, el pie dice "Diseño · BiPlot" y el mapa del entorno "Volver al sitio". **Mi compra** (`#portal`)
  queda como **"Próximamente"** (etiqueta `.pronto` en la barra, el menú, la pestaña y la sección; sello en el celular de
  muestra; botón "Avísame cuando esté listo" por WhatsApp). No nombrar Fundos 360° en textos visibles hasta que el
  cliente lo pida (el sitio sigue con `noindex` hasta el cambio de dominio).
- La portada con el video de caballos (pestaña Proyectos) se quitó cuando Proyectos pasó a ser solo el mapa de Chile. La foto grupal del equipo se quitó (incluía a Marjorie, que salió): en Nosotros va un mosaico con las fotos actuales (`.team-mosaic`, actualizarlo si cambia el equipo).
- Una tarjeta y una ficha (ventana) por persona del equipo, con su presentación en sus palabras (sin reescribirla).
  Saludos en video (octubre 2026): todo el equipo (Mari, Valentina, Jeanette, Stefy, Diego, Geonela y Elvis; grabados por el cliente en la misma oficina). Todas las
  fotos (`assets/img/equipo-ID.webp`, **cuerpo completo**, 3:4 como las tarjetas) son de una sesión del cliente en la misma
  oficina; foto y saludo de la tarjeta (`video.tarjeta`) se recortan con la misma ventana (90 % del cuadro) y la cara en
  el mismo lugar para que el cambio foto→video no salte; esa foto
  completa es también la portada del video en la ficha: al pasar el cursor (computador) la foto se vuelve video con sonido; si el navegador aún no deja sonar,
  parte en silencio con "Haz clic para verlo con sonido" y el clic abre la ficha con el saludo completo. Videos
  originales en el historial (`0475102`, `2eafd5d`, `d0152bd`, `679a800`; Valentina, Diego y Geonela en `bfd319b`);
  fotos originales en `f87e740`. El equipo es una **galería en filas** (el cliente no quería deslizar ni paneles chicos):
  tarjetas grandes, 4 por fila en computador ("Conversemos" en el último lugar), 3 en tablet y 2 en celular; el
  saludo se reproduce en la misma tarjeta. **Marjorie Castellón salió del equipo** (pedido del cliente). Elvis Jiménez aún sin
  presentación escrita. **Contacto de cada asesor** (dado por el cliente, oct-2026): `whatsapp`, `telefono` y `correo` en
  `equipo` del manifiesto; la ficha muestra teléfono (tel:) y correo (mailto:), "Escribir por WhatsApp" va a su número y
  "Agendar con…" envía el formulario de visita a su WhatsApp (mientras el mensaje lo nombre). Los archivos de Elvis siguen
  llamándose `equipo-elvys.*`. Material nuevo: el cliente lo sube a `subidas/` en la rama de trabajo (los
  originales no van a `main`; se convierten con ffmpeg a MP4 + WebM con `loudnorm`).
  No suponer género ni cargos: hoy todos dicen "Equipo comercial" hasta tener los cargos reales.
- Santo Domingo fuera de la propuesta principal (plano, cotizador, 360°); desde oct-2026 aparece solo como tarjeta en Más proyectos (lo pidió el cliente). No bajar videos de internet: solo material propio del cliente.
- Planos con líneas rectas como el masterplan. En computador la herramienta completa (proyectos, filtros, chips,
  plano y leyenda en franja baja) cabe en la pantalla: el plano mide entre 380 y 480 px de alto y no pasa del 47 % de la ventana (`layoutPlan`); los
  chips de precio van en una sola fila (precio arriba, precio lista y disponibles abajo); el
  detalle del lote toma el mismo alto (`--stage-h`) y los enlaces a `#plano` llevan directo a la herramienta.
  En celular el plano parte acercado (lotes tocables) con botón para ver completo.
- **Cotizador dentro del lote** (oct-2026, pedido del cliente: "no vale la pena tenerlo aparte"): ya no hay pestaña
  Simulador; el detalle de cada lote trae **"Cómo pagarlo"** (`[data-d-pago]`, `pagar()` en `initPlan`): Contado o En cuotas
  (pie desde `financiamiento.pieMinimo`, plazos de `financiamiento.plazos`, tasa referencial), filas y "Enviarme esta
  simulación" por WhatsApp. `#simulador` (enlaces viejos) lleva al plano.
- **La reserva de $1.000.000 cubre todos los gastos de escritura** (notaría y Conservador) y **no se descuenta del precio**
  (confirmado por el cliente): al contado se paga reserva + valor de la parcela; en cuotas, reserva + pie + cuotas. Así lo
  dicen los pasos de "Cómo comprar", las preguntas frecuentes, las fichas de proyecto ("incluye escritura") y el cotizador.
- Puerto Varas (textos del cliente, octubre 2026): parcelas **planas**, con rol propio (SAG) y vista a los volcanes
  Osorno (a la derecha) y Calbuco (a la izquierda, al fondo), en el Pasaje El Encanto (Ruta La Colonia); acceso
  controlado, caminos estabilizados, factibilidad eléctrica en la entrada y agua por noria o pozo. **No decir "bosque
  nativo"** (hay poco) y el estero **cruza la parcelación** (no "entre bosque y estero").
- **Descartado (octubre 2026):** mini mapa de servicios por ciudad (hospital, supermercados, etc. al llegar a una ciudad
  en el mapa del entorno). El usuario lo dejó de lado; no retomarlo salvo que lo pida.
- Página en pestañas (pedido del cliente): Puerto Varas, el proyecto que están empujando (con su folleto), es lo más
  atractivo del inicio; el resto (proyectos, compra, equipo) va en otras pestañas.
- Página corta por secciones (el cliente sintió que tanto scroll cansa): Cómo comprar, Tu casa, Preguntas y Mi compra
  van como pestañas en `#tu-compra` (`initCompra`; los enlaces a esos `#id` abren su pestaña). Desde oct-2026 esas
  pestañas son una **fila liviana** de texto con subrayado dorado, clara y **no fija** (`.tc-bar`; el título "Todo sobre tu
  compra" queda solo para lectores de pantalla): el cliente sentía que la barra oscura fija con píldoras congestionaba; Nosotros compacto con
  valores cortos y el equipo en galería (antes carrusel); indicador de sección (`[data-nav-where]`)
  y barra de avance (`--avance` en `.nav`). Medir el largo con `tools/pruebas/largo.js` si se agregan secciones.
