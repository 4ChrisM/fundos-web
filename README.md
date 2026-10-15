# Propuesta de sitio · Fundos Inmobiliaria

Rediseño del sitio público de Fundos Inmobiliaria (fundosinmobiliaria.com), construido sobre el **Manual de Marca Fundos 360°** (septiembre 2026): verde bosque y dorado tierra, Cormorant Garamond + Mulish.

Sitio estático (HTML, CSS y JavaScript, sin build ni dependencias). Funciona abriendo `index.html` directo o desde cualquier hosting.

## Cómo verla

- **Local:** desde la raíz del repo, `python3 -m http.server 8080` y abre http://localhost:8080/
- **Publicada:** https://fundosinmobiliaria.com/ (GitHub Pages desde `main` de este repo, dominio en `CNAME`). Desde oct-2026 reemplaza al sitio de Squarespace y se deja indexar (`robots.txt`, `sitemap.xml`, `canonical`). Antes vivió en `fundos.biplot.cl` y en `biplot.cl/propuestas/fundos-inmobiliaria/`.

## Qué propone

| Sección | Qué gana el cliente |
|---|---|
| **Inicio con todos los proyectos** | La pestaña de entrada se llama Inicio (antes "Puerto Varas"): título general, los tres proyectos nombrados desde el primer vistazo, Puerto Varas como "Nuevo", franja "Nuestros proyectos" con desde y disponibles, y el formulario de contacto arriba con selector de proyecto (feedback del equipo de ventas). |
| **Proyectos: Fundos en todo Chile** ★ | La pestaña Proyectos es solo el mapa (lo pidió el cliente; el equipo votó entre una versión vertical y una horizontal y ganó la vertical): a la izquierda un mapa largo de Chile con un punto y el nombre de cada fundo, a la derecha la galería de los 13 fundos de norte a sur por región, con el emblema de cada uno. Tocar un fundo abre su ficha en una ventana: fotos, datos, características, cercanías y acciones (ver lotes, cotizar, recorrido 360° o "Quiero información"), con flechas para pasar al siguiente. Enlace directo: `#proyecto-marchigue`. |
| **Recorrido virtual 360°** | El tour de cada proyecto se abre en su mapa del entorno como un portal desde la parcela (`entorno.html#tour-360`, `entorno.html?p=marchigue#tour-360`), con "Desde aquí" para ver las rutas a los lugares cercanos. Accesos desde el plano (botón 360°), la ficha de cada fundo, el menú y el pie. |
| **Plano interactivo de lotes** ★ | La función estrella. Planos nítidos con bordes compartidos, números siempre legibles y zoom real (botones, pellizco, arrastre, doble clic y Ctrl + rueda). Chips de precio que resaltan su categoría, filtros por estado y precio, vista de lista ordenable, favoritos que se envían por WhatsApp y enlace directo a un lote (`#lote-malalcahuello-12`). En el celular el detalle abre como hoja inferior sin tapar el lote. "Reservar este lote" precarga el formulario; en un lote vendido se ofrecen los disponibles más cercanos. |
| **Videos (listo para usar)** | Portada de Inicio en video (Puerto Varas) y visor de video por proyecto (YouTube, Vimeo o archivo propio): con `video` en `lib/manifest.js` aparece "Ver video" en la ficha del fundo. |
| **Todo sobre tu compra** (pestañas) | Una sola sección con pestañas en una fila liviana (no fija): **Cómo comprar** en 6 pasos (el embudo de Fundos 360°: reserva → validación → gastos → escritura → inscripción en el CBR), **Preguntas** frecuentes y **Mi compra** (portal del comprador con avance, documentos e hitos). Los enlaces `#como-comprar`, `#tu-casa`, `#preguntas` y `#portal` abren su pestaña. El cotizador (contado o en cuotas) vive en el detalle de cada lote, en «Cómo pagarlo»; la reserva de $1.000.000 cubre los gastos de escritura y no se descuenta del precio. Sin JavaScript se ven las cuatro seguidas. |
| **Tu casa (diseña tu parcela)** | Pestaña nueva en "Todo sobre tu compra": el cliente elige proyecto y lote, ve la forma real del lote a escala en una vista 3D (isométrica, con pasto, árboles y sombras; también en planta) y ubica una casa genérica (de uno o dos pisos), piscina, quincho, bodega, etc. con cotas en metros (mover, girar, cambiar medidas, zoom y pantalla completa). Un medidor muestra cuánto lleva construido contra el máximo del 10 % de la superficie (500 m² en 5.000 m²) y el diseño se envía a un asesor por WhatsApp. Se llega desde "Diseña tu casa" (Nuevo) en la barra y el menú, desde un aviso con imagen en Inicio, y desde el detalle de cada lote ("Dibuja tu casa en este lote"). La piscina se muestra pero no suma a lo construido; la casa de dos pisos cuenta ambos pisos. Techo plano o a dos aguas, camino de acceso automático desde el deslinde que da a la calle, y autos y personas de ambientación. Sol según la hora y la época del año (sombras, luz dorada, noche con ventanas encendidas) con brújula. El aviso usa una foto real de una casa de campo del sur (Wikimedia Commons, con crédito) y una miniatura del diseño en 3D. Los accesos guían primero a elegir la parcela en el plano (paso 1 y 2) y desde ahí se abre la herramienta en ese lote. |
| **Quiénes somos y equipo** | Texto y valores del sitio actual en versión corta junto a un mosaico con las fotos del equipo actual (la foto grupal salió: incluía a Marjorie, que ya no está), y el equipo en galería con **una tarjeta por persona** (tarjetas grandes en filas; en computador reproducen el saludo en video al pasar el cursor): cada una abre su ficha (ventana) con foto grande, qué hace por ti, WhatsApp y "Agendar visita", y flechas o caras para pasar a la siguiente. La ficha que tiene video muestra su saludo con sonido. Enlace directo a cada ficha: `#equipo-3`. Las caras del equipo acompañan también la agenda de visita, la ayuda del plano y la vista previa de "Mi compra". |
| **Agenda tu visita** | Formulario validado que abre WhatsApp con el mensaje listo: nombre, proyecto, fecha y horario. Desde "Reservar este lote" llega con la reserva a la vista ("Reserva: lote 18 de Malalcahuello") y el mensaje pide reservar ese lote. |

Página corta para no cansar con el scroll: unas 10 pantallas en computador y 14 en celular (antes 14,6 y 23,3). En celular, arriba se indica la sección en que estás con una barra de avance.

Además: barra de acción fija en móvil (WhatsApp + Agendar visita), botón flotante de WhatsApp en escritorio y sitio legible sin JavaScript. Accesibilidad revisada con lector de pantalla y teclado: plano recorrible con flechas (Inicio/Fin saltan al lote más barato y al más caro), foco visible en fondos claros y oscuros, objetivos táctiles de 44 px, contraste AA y ningún control tapado por la barra móvil.

## Antes de publicar: qué validar con Fundos

Todo lo editable está en `lib/manifest.js`.

- [x] **Contacto:** WhatsApp general +56 9 9292 2429 y ventas@fundosinmobiliaria.com (dados por el cliente, oct-2026). Horario: martes a viernes de 10:00 a 19:00; visitas a terreno los fines de semana.
- [x] **Lotes, precios y estados:** se leen en vivo desde el plano comercial de Fundos 360° (`/api/planos/disponibilidad`); los del manifiesto quedan de respaldo.
- [ ] **Superficie por lote:** se asume 5.000 m² en todos los proyectos (confirmar, sobre todo Puerto Varas).
- [x] **Financiamiento:** Fundos aún no tiene; el cotizador muestra solo el pago al contado (`financiamiento.habilitado = false`). Si se habilita, confirmar tasa, pie mínimo y plazos.
- [ ] **Preguntas frecuentes:** revisar las respuestas (condiciones de devolución de la reserva, construcción, plazos).
- [ ] **Destacados y cercanías:** las distancias se miden desde cada pueblo, no desde el proyecto. Reemplazar por los tiempos reales.
- [ ] **Google Analytics (activo desde el 15-oct-2026, `G-Q5JZT7NZP3`):** marcar `generate_lead` como evento clave en Administrar → Eventos cuando aparezca.
- [ ] **Vercel y repositorio de Biplot:** mover `fundos-web` a la organización de Biplot y publicarlo en Vercel (cambiar de nuevo los 5 registros DNS en Squarespace).
- [ ] **Mi compra:** es un módulo nuevo que se propone sobre Fundos 360°. Hoy la sección lo muestra como vista previa.
- [ ] **Fotos:** las ilustraciones son intencionales, pero se pueden sumar fotos de dron reales: hoy las fotos de cada proyecto son vistas aéreas sacadas de sus recorridos 360° (`foto` y `tourFoto` en el manifiesto).
- [ ] **Equipo:** fotos, nombres y presentaciones del equipo real (uso autorizado), en `lib/manifest.js` (`equipo`). Teléfono, correo y WhatsApp propio de cada persona ya cargados. Falta, si se quiere: el cargo de cada persona (hoy "Equipo comercial"). El video no tiene subtítulos: conviene agregarlos (o enviarnos el texto) para quienes lo vean sin sonido.
- [ ] **Videos:** la propuesta no incluye videos. El sitio ya está preparado: basta con subir el archivo o pegar el enlace (ver "Videos" más abajo).
- [ ] **Concurso:** el sitio actual tiene una página de concurso; se puede sumar como banner o sección cuando esté definido.

## Estado y próximos pasos

Publicada en https://fundosinmobiliaria.com/ (cada cambio entra por un pull request a `main`).


- [x] **Conectar con Fundos 360° (`4ChrisM/fundos-os`):** los formularios crean el lead (`/api/leads/web`, origen "Sitio web") y el plano lee la disponibilidad comercial (`/api/planos/disponibilidad`: solo lotes disponibles y su precio, nada más).

- [ ] **Mapa "Descubre tu entorno" (`entorno.html`):** imagen satelital ya reemplazada por Sentinel-2 cloudless 2016 (libre para uso comercial con crédito). Falta bajar las fotos de Wikimedia Commons (requiere que la red permita `commons.wikimedia.org` y `upload.wikimedia.org`; fotos propias del cliente, si las tiene, son mejores). Videos del cliente ya integrados en 10 lugares (Alerce, parque, Puerto Varas, Frutillar, lago, Puerto Montt, Osorno, Petrohué, Calbuco y Caleta Angelmó, que también está en "Míralo en video" de la portada); faltan los demás si los tiene (Todos los Santos, Alerce Andino…). El de Frutillar podría ser una muestra recortada del convertidor: confirmar con el original. El cliente debe aprobar los textos de los lugares nuevos (marcados con `"revisar": true`).
- [ ] **Mapas del entorno de Malalcahuello y Marchigüe** (`entorno.html?p=malalcahuello`, `?p=marchigue`, publicados en octubre 2026): confirmar con el cliente todos los textos de lugares (todos `"revisar": true`); la coordenada de Malalcahuello está en el sector Lolén (Lonquimay), a 20 min de Lonquimay y 50 min del pueblo, así que el chip "Cerca de Corralco" de la tarjeta (1 h 10 min) conviene revisarlo; confirmar el nombre del sector de Marchigüe y la frase "a una hora de Pichilemu" (antes decía "40 minutos"; la ruta calculada da 1 h). Sin videos ni fotos todavía: si el cliente tiene tomas de dron de esas zonas, se integran como las de Puerto Varas.
- [x] **WhatsApp:** número real desde oct-2026. Los precios salen de los PDF comerciales de Fundos 360°.
- [ ] **Tu casa:** confirmar con el cliente la regla del 10 % (si se mide sobre la huella o sobre lo construido en todos los pisos, y si la piscina suma) (y si quieren mostrar distanciamientos a los deslindes); la forma de cada lote sale del plano actual (se afinará con los SVG).
- [ ] **Más proyectos ("Fundos en todo Chile"):** ya están los 10 proyectos "Fundos de …" (sin precios) en `masProyectos` de `lib/manifest.js`. Se muestran en la pestaña Proyectos (mapa largo de Chile y galería de norte a sur; ficha con fotos al tocar un fundo). Falta revisar los textos resumidos y los emblemas dibujados (también los de Puerto Varas, Marchigüe y Malalcahuello), y confirmar los títulos de las fotos de cada fundo (`galeria`).
- [ ] **Tu casa con pendientes:** más adelante, mostrar la pendiente del lote según su ubicación (modelo de elevación por coordenadas).
- [ ] **Tu casa agroresidencial:** confirmar con el cliente las especies sugeridas de frutales y de conservación por proyecto (`AGRO` en `main.js`).
- [ ] **Cargos del equipo:** hoy todos dicen "Equipo comercial" en `lib/manifest.js` (`equipo`); falta el cargo de cada persona (teléfono, correo y WhatsApp ya están).

## Estructura

```
index.html        Todo el contenido (se lee completo sin JavaScript)
styles.css        Tokens del manual + estilos, mobile-first
main.js           Interacciones: plano, filtros, favoritos, cotizador del lote, formulario, paralaje
lib/manifest.js   Datos: contacto, proyectos, lotes, financiamiento
assets/img/       Isotipo (del manual, también en 174 px para el menú), logos de proyectos, fotos (nosotros y equipo), favicon y og-fundos.jpg
assets/fonts/     Cormorant Garamond y Mulish (woff2, latín)
assets/video/     Videos propios: el saludo del equipo (MP4 + WebM de respaldo y su imagen) y, si se usan, portada y proyectos
.htaccess         Caché para hosting Apache/Hostinger
tools/            enderezar_planos.py (geometría de los planos), artefacto_build.py (vista previa en Claude),
                  entorno_build.py + entorno/ (mapas del entorno), portada_puerto_varas.py (video de portada)
tools/pruebas/    Pruebas automáticas con Playwright (ver su LEEME.md)
CLAUDE.md         Contexto para retomar el trabajo con Claude: publicación, datos, planos, pruebas y decisiones
```

### Videos

Todo se configura en `lib/manifest.js`; si un campo queda vacío, no aparece nada.

- **Video de portada de Inicio:** `videoDestacado` en `lib/manifest.js` (mp4/webm y versión `Movil`, vertical). Recomendado: 8 a 15 segundos que funcionen en bucle y sin sonido (se reproduce silenciado), sin texto encima; H.264 de 1920 px y menos de 6 MB, con WebM de respaldo. No se carga con ahorro de datos, en conexiones más lentas que 4G ni con movimiento reducido, se pausa fuera de pantalla y tiene botón de pausa.
- **Video de cada proyecto:** `video: "https://youtu.be/XXXXXXXXXXX"` (también `youtube.com/watch?v=…`, `shorts/…`, Vimeo o `assets/video/archivo.mp4`). Aparece el botón "Ver video" en la ficha del fundo (pestaña Proyectos) y se abre en un visor dentro de la página.
- Para un video largo o con sonido, conviene YouTube o Vimeo: no consume el ancho de banda del hosting y se adapta a la conexión de cada persona.

### Recorridos 360°

- Las URL están en `lib/manifest.js`, campo `tour` de cada proyecto. Se abren dentro del mapa del entorno del proyecto (`entorno.html[?p=ID]#tour-360`): el mapa vuela a la parcela y el tour aparece como un portal. Ya no hay un visor en la página principal.
- Si el sitio donde se publique prohíbe incrustar otras páginas (política de seguridad) o el tour no carga, el mapa ofrece abrirlo en una pestaña nueva.
- Los recorridos están en Netlify y GitHub Pages, que por defecto permiten incrustarlos. Si algún día se les agrega `X-Frame-Options` o `frame-ancestors`, hay que permitir el dominio de Fundos.

### Planos y lotes

Los tres planos (**Malalcahuello**, **Marchigüe** y **Puerto Varas**) replican la geometría de sus masterplan y comparten un **formato estándar Fundos**:

- **Mismas piezas en todos:** predio gris con borde blanco, lotes con el color de su categoría de precio, vendidas en gris con una etiqueta "V 12", reservadas con trama, servidumbres y caminos en arena con borde punteado y agua en azul. Los disponibles llevan su número en un círculo blanco con el anillo del color de su precio; al acercarse aparece además el precio corto ("$14,99M"), para no depender solo del color.
- **Siempre legible:** los números se dibujan a tamaño de pantalla constante, no del plano, así que se leen igual en un celular que en un monitor. Si los lotes quedan muy chicos, se ocultan los números de las vendidas para dar aire a las disponibles. En el celular el plano parte acercado sobre los lotes disponibles.
- **Misma leyenda:** encabezado "Plano de loteo · Fundos de …" con disponibles, vendidas y total, y precios por categoría con el precio anterior tachado y cuántos lotes quedan ("Agotado" si no queda ninguno). El título es "Precio oferta" cuando hay precio rebajado y "Precios" si no.
- **Qué se edita y dónde:** el formato vive en `main.js` (`PLANO`, `svgPlan`, `catsHtml`, `legendHtml`) y `styles.css`. Por proyecto solo cambian las categorías, precios y estados (`lib/manifest.js`) y la geometría (`lib/planos.js`). Cada lote es `[número, categoría, estado]` (`disponible`, `reservada` o `vendida`).
- **Geometría:** se generó automáticamente desde las imágenes de los masterplan (segmentación de bordes de lotes, servidumbres y agua) y se limpió como una cobertura continua: lotes vecinos comparten el mismo borde, sin huecos ni solapes, con líneas rectas y ríos suavizados. Cada lote guarda su forma, el punto de su etiqueta y cuánto espacio libre tiene (`{d, l, r}`). Si cambia un loteo, conviene regenerarla desde el nuevo plano.

## Notas de marca y técnicas

- Paleta y tipografías del manual. Se agregaron dos tonos derivados solo para texto pequeño sobre fondo claro, para cumplir contraste AA: dorado `#7A5D33` y neutro `#5E584E`.
- El isotipo se extrajo del PDF del manual, con transparencia, y se usa sin alterar.
- Sin librerías ni servicios externos: JavaScript propio en patrón IIFE, `defer` y cada módulo aislado con `safe()`. Las tipografías (Cormorant Garamond y Mulish, licencia OFL) se sirven desde `assets/fonts/`, precargadas y con respaldos del sistema ajustados a sus medidas, así el texto aparece de inmediato y no salta al cargar.
- Al subir cambios de CSS/JS, actualiza el `?v=AAAAMMDD` en `index.html`: el `.htaccess` guarda esos archivos por un año. `lib/manifest.js` (precios y disponibilidad) es la excepción: se revalida en cada visita, así que un cambio de precios se ve de inmediato.
- Rendimiento: el plano se arma cuando se acerca a la pantalla, sin filtros SVG (el zoom va fluido en el celular); las animaciones continuas se pausan fuera de pantalla y el video de portada no se descarga en conexiones lentas.
- Con *movimiento reducido* activo se apagan el paralaje, las entradas animadas, el cinturón de valores, los trazos y las transiciones del plano. El cinturón también se pausa al pasar el cursor.
- El formulario hoy abre WhatsApp. En producción conviene enviar también cada solicitud al módulo **Leads** de Fundos 360°.
