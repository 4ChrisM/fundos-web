# Propuesta de sitio · Fundos Inmobiliaria

Rediseño del sitio público de Fundos Inmobiliaria (fundosinmobiliaria.com), construido sobre el **Manual de Marca Fundos 360°** (septiembre 2026): verde bosque y dorado tierra, Cormorant Garamond + Mulish.

Sitio estático (HTML, CSS y JavaScript, sin build ni dependencias). Funciona abriendo `index.html` directo o desde cualquier hosting.

## Cómo verla

- **Local:** desde la raíz del repo, `python3 -m http.server 8080` y abre http://localhost:8080/
- **Publicada:** https://fundos.biplot.cl/ (GitHub Pages desde `main` de este repo, dominio en `CNAME`; lleva `noindex`, no aparece en buscadores). La dirección anterior, `biplot.cl/propuestas/fundos-inmobiliaria/`, redirige aquí.

## Qué propone

| Sección | Qué gana el cliente |
|---|---|
| **Portada con el equipo** | La foto real del equipo de Fundos, con la polera de la marca, junto al titular. Transmite desde el primer segundo que detrás hay personas; enlace directo a "Conoce a nuestro equipo". |
| **Buscador** | Destino + presupuesto con conteo en vivo y desglose por proyecto ("14 en Malalcahuello · 12 en Marchigüe"). Lleva directo al plano ya filtrado y avisa si hay más en otros proyectos. Si nada entra en el presupuesto, dice desde cuánto parten y ofrece verlas igual. |
| **Proyectos comparables** | Misma ficha para los tres: desde, superficie, reserva y disponibilidad. Apartado "Conoce cada proyecto" (pestaña Proyectos, `#proyecto-ID`) con foto, datos, características, cercanías y acciones, armado desde el manifiesto: agregar un proyecto es solo sumar sus datos. |
| **Recorrido virtual 360°** ★ | Los tours de cada proyecto se ven dentro de la página: una lente "Entrar" abre el recorrido como un portal, se cambia de proyecto sin salir, hay pantalla completa y, al terminar, "Ver lotes", "Agendar visita" o "Compartir" por WhatsApp. Accesos desde el hero, cada tarjeta ("Recorrido 360°"), el plano (botón 360°) y el apartado de cada proyecto. Enlace directo: `#recorrido-puerto-varas`. |
| **Plano interactivo de lotes** ★ | La función estrella. Planos nítidos con bordes compartidos, números siempre legibles y zoom real (botones, pellizco, arrastre, doble clic y Ctrl + rueda). Chips de precio que resaltan su categoría, filtros por estado y precio, vista de lista ordenable, favoritos que se envían por WhatsApp y enlace directo a un lote (`#lote-malalcahuello-12`). En el celular el detalle abre como hoja inferior sin tapar el lote. "Reservar este lote" precarga el formulario; en un lote vendido se ofrecen los disponibles más cercanos. |
| **Videos (listo para usar)** | Soporte para video de portada en el hero y visor de video por proyecto (YouTube, Vimeo o archivo propio). No se muestra nada hasta cargar un video en `lib/manifest.js`. |
| **Todo sobre tu compra** (pestañas) | Una sola sección con cuatro pestañas y su barra fija arriba: **Cómo comprar** en 6 pasos (el embudo de Fundos 360°: reserva → validación → gastos → escritura → inscripción en el CBR), **Simulador** (contado o financiamiento, reparto visual y envío por WhatsApp), **Preguntas** frecuentes y **Mi compra** (portal del comprador con avance, documentos e hitos). Los enlaces `#como-comprar`, `#simulador`, `#preguntas` y `#portal` abren su pestaña. Sin JavaScript se ven las cuatro seguidas. |
| **Quiénes somos y equipo** | Texto y valores del sitio actual en versión corta junto a la foto grupal, y el equipo en carrusel con **una tarjeta por persona** (flechas en computador, deslizar en celular): cada una abre su ficha (ventana) con foto grande, qué hace por ti, WhatsApp y "Agendar visita", y flechas o caras para pasar a la siguiente. La ficha que tiene video muestra su saludo con sonido. Enlace directo a cada ficha: `#equipo-3`. Las caras del equipo acompañan también la agenda de visita, la ayuda del plano y la vista previa de "Mi compra". |
| **Agenda tu visita** | Formulario validado que abre WhatsApp con el mensaje listo: nombre, proyecto, fecha y horario. Desde "Reservar este lote" llega con la reserva a la vista ("Reserva: lote 18 de Malalcahuello") y el mensaje pide reservar ese lote. |

Página corta para no cansar con el scroll: unas 10 pantallas en computador y 14 en celular (antes 14,6 y 23,3). En celular los proyectos también van en carrusel, y arriba se indica la sección en que estás con una barra de avance.

Además: barra de acción fija en móvil (WhatsApp + Agendar visita), botón flotante de WhatsApp en escritorio y sitio legible sin JavaScript. Accesibilidad revisada con lector de pantalla y teclado: plano recorrible con flechas (Inicio/Fin saltan al lote más barato y al más caro), foco visible en fondos claros y oscuros, objetivos táctiles de 44 px, contraste AA y ningún control tapado por la barra móvil.

## Antes de publicar: qué validar con Fundos

Todo lo editable está en `lib/manifest.js`.

- [ ] **Contacto:** número de WhatsApp, correo y horario. Hoy es un placeholder (`+56 9 0000 0000`).
- [ ] **Lotes, precios y estados:** son referenciales, basados en ejemplos del manual. Lo ideal es leerlos desde Fundos 360° (módulo Parcelas) para mostrar la disponibilidad real.
- [ ] **Superficie por lote:** se asume 5.000 m² en todos los proyectos (confirmar, sobre todo Puerto Varas).
- [ ] **Financiamiento:** tasa (0,9 % mensual), pie mínimo (30 %) y plazos son supuestos. Si no hay crédito directo, usar `financiamiento.habilitado = false`.
- [ ] **Preguntas frecuentes:** revisar las respuestas (condiciones de devolución de la reserva, construcción, plazos).
- [ ] **Destacados y cercanías:** las distancias se miden desde cada pueblo, no desde el proyecto. Reemplazar por los tiempos reales.
- [ ] **Mi compra:** es un módulo nuevo que se propone sobre Fundos 360°. Hoy la sección lo muestra como vista previa.
- [ ] **Fotos:** las ilustraciones son intencionales, pero se pueden sumar fotos de dron reales: hoy la portada de cada apartado (`foto` en el manifiesto) usa fotos de Wikimedia Commons con crédito; reemplazarlas por fotos del cliente.
- [ ] **Equipo:** fotos, nombres y presentaciones del equipo real (uso autorizado), en `lib/manifest.js` (`equipo`). Falta, si se quiere: el cargo de cada persona (hoy "Equipo comercial"), y su WhatsApp propio. El video no tiene subtítulos: conviene agregarlos (o enviarnos el texto) para quienes lo vean sin sonido.
- [ ] **Videos:** la propuesta no incluye videos. El sitio ya está preparado: basta con subir el archivo o pegar el enlace (ver "Videos" más abajo).
- [ ] **Concurso:** el sitio actual tiene una página de concurso; se puede sumar como banner o sección cuando esté definido.
- [ ] **Al publicarlo en el dominio de Fundos:** quitar la etiqueta "Propuesta" del menú, quitar `noindex` y cambiar la URL de `og:image`.

## Estado y próximos pasos

Publicada en https://fundos.biplot.cl/ (cada cambio entra por un pull request a `main`).


- [ ] **Conectar con Fundos 360° (`4ChrisM/fundos-os`):** que el formulario de visita cree el lead en Fundos 360° (además de abrir WhatsApp) y que el plano lea la disponibilidad real de las parcelas. El webhook actual (`/api/leads/webhook`) pide una clave secreta y no sirve para una página pública: hay que agregar en Fundos 360° una ruta pública para la web (p. ej. `/api/leads/web`) con campo trampa, límite de envíos y solo desde fundos.biplot.cl, que cree el lead con origen "Sitio web", proyecto y parcela, en "pendiente de llamado"; y otra de solo lectura con la disponibilidad por proyecto.

- [ ] **Mapa "Descubre tu entorno" (`entorno.html`):** imagen satelital ya reemplazada por Sentinel-2 cloudless 2016 (libre para uso comercial con crédito). Falta bajar las fotos de Wikimedia Commons (requiere que la red permita `commons.wikimedia.org` y `upload.wikimedia.org`; fotos propias del cliente, si las tiene, son mejores). Videos del cliente ya integrados en 9 lugares (Alerce, parque, Puerto Varas, Frutillar, lago, Puerto Montt, Osorno, Petrohué y Calbuco); faltan los demás si los tiene (Todos los Santos, Angelmó, Alerce Andino…). El de Frutillar podría ser una muestra recortada del convertidor: confirmar con el original. El cliente debe aprobar los textos de los lugares nuevos (marcados con `"revisar": true`).
- [ ] **Mapas del entorno de Malalcahuello y Marchigüe** (`entorno.html?p=malalcahuello`, `?p=marchigue`, publicados en octubre 2026): confirmar con el cliente todos los textos de lugares (todos `"revisar": true`); la coordenada de Malalcahuello está en el sector Lolén (Lonquimay), a 20 min de Lonquimay y 50 min del pueblo, así que el chip "Cerca de Corralco" de la tarjeta (1 h 10 min) conviene revisarlo; confirmar el nombre del sector de Marchigüe y la frase "a una hora de Pichilemu" (antes decía "40 minutos"; la ruta calculada da 1 h). Sin videos ni fotos todavía: si el cliente tiene tomas de dron de esas zonas, se integran como las de Puerto Varas.
- [ ] **WhatsApp y precios:** el número de contacto y los precios de `lib/manifest.js` son de ejemplo (`+56 9 0000 0000`).
- [ ] **Planos en SVG:** el cliente enviará los planos vectoriales de Malalcahuello y Puerto Varas (y después Marchigüe) para calcarlos exactos. Hoy la geometría sale de las imágenes de los masterplan, enderezada con `tools/enderezar_planos.py`. Al llegar: revisar que cada lote sea su propia forma (no una imagen incrustada), asociar cada forma a su número de lote y reemplazar la geometría de ese proyecto en `lib/planos.js`, manteniendo el formato `{d, l, r}`.
- [ ] **Cargos del equipo:** hoy todos dicen "Equipo comercial" en `lib/manifest.js` (`equipo`); falta el cargo y WhatsApp propio de cada persona, si los hay.

## Estructura

```
index.html        Todo el contenido (se lee completo sin JavaScript)
styles.css        Tokens del manual + estilos, mobile-first
main.js           Interacciones: plano, filtros, favoritos, simulador, formulario, paralaje
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

- **Video de portada (hero):** poner el archivo en `assets/video/` y escribir su ruta en `lib/manifest.js`: `videoPortada: { mp4: "assets/video/portada.mp4", webm: "assets/video/portada.webm", poster: "", mp4Movil: "assets/video/portada-movil.mp4", webmMovil: "" }`. El video ocupa el marco de la foto del equipo (a la derecha en computador, arriba en el celular) y la foto queda de respaldo mientras carga. Recomendado: 8 a 15 segundos que funcionen en bucle y sin sonido (se reproduce silenciado), sin texto encima, con lo importante al centro; H.264 de 1920 px y menos de 6 MB. La versión `Movil` (vertical, 1080 px de ancho) es opcional. No se carga con ahorro de datos, en conexiones más lentas que 4G ni con movimiento reducido, se pausa fuera de pantalla y tiene botón de pausa.
- **Video de cada proyecto:** `video: "https://youtu.be/XXXXXXXXXXX"` (también `youtube.com/watch?v=…`, `shorts/…`, Vimeo o `assets/video/archivo.mp4`). Aparece el botón "Ver video" en la tarjeta y en el apartado del proyecto, y se abre en un visor dentro de la página.
- Para un video largo o con sonido, conviene YouTube o Vimeo: no consume el ancho de banda del hosting y se adapta a la conexión de cada persona.

### Recorridos 360°

- Las URL están en `lib/manifest.js`, campo `tour` de cada proyecto (y repetidas en el HTML para que los enlaces funcionen sin JavaScript).
- El recorrido **no se carga hasta que la persona entra**: la página sigue liviana y en el celular no se consumen datos sin permiso. Al acercarse a la sección se hace una conexión anticipada con cada servidor para que abra más rápido.
- Si el sitio donde se publique prohíbe incrustar otras páginas (política de seguridad), la sección lo detecta y ofrece abrir el recorrido en una pestaña nueva. Esto pasa, por ejemplo, en la vista previa de Claude; en biplot.cl o el hosting de Fundos se ve incrustado.
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
