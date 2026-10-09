/* =============================================================
   Fundos Inmobiliaria — datos del sitio
   Único lugar donde se editan proyectos, lotes, precios y contacto.
   Todos los valores son REFERENCIALES para la propuesta: en la versión
   final se leen desde Fundos 360° (módulo Parcelas) para que el plano
   muestre la disponibilidad real.
   ============================================================= */
(function () {
  "use strict";

  var D = "disponible", R = "reservada", V = "vendida";

  // Lote compacto: [número, categoría de precio (null si está vendido), estado, m² opcional]
  // El precio sale de la categoría; la superficie por defecto es 5.000 m².
  function lotes(rows) {
    return rows.map(function (r) {
      return { n: r[0], cat: r[1], estado: r[2], m2: r[3] || 5000 };
    });
  }

  window.__BRAND__ = {
    marca: "Fundos Inmobiliaria",

    // Medición de visitas (servicios externos). Vacío = no se carga nada. Lo lee lib/analitica.js.
    // ga4: ID de medición de Google Analytics 4 ("G-XXXXXXXXXX", en Administrar → Flujos de datos).
    // clarity: ID del proyecto de Microsoft Clarity (10 caracteres, en Configuración → Instalación).
    analitica: { ga4: "", clarity: "" },

    contacto: {
      whatsapp: "56900000000",              // Reemplazar: número real, formato internacional sin "+"
      whatsappVisible: "+56 9 0000 0000",   // Reemplazar
      email: "contacto@fundosinmobiliaria.com", // Confirmar
      horario: "Lunes a sábado, 9:00 a 19:00"   // Confirmar
    },

    // Video de portada del hero (opcional). Un archivo liviano, sin sonido, de 10 a 20 segundos:
    // assets/video/portada.mp4 (H.264, 1920 px, menos de 8 MB) y, si se puede, una versión .webm.
    // Mientras esté vacío se muestra la ilustración animada. Con "ahorro de datos" o movimiento
    // reducido activos, tampoco se carga.
    // Equipo comercial: una tarjeta y una ventana por persona (en el orden de la galería).
    // "bio": párrafos de su presentación; "apodo": cómo saludarla en WhatsApp (si no, el primer nombre). "whatsapp" es opcional (si queda vacío se usa el número de contacto).
    // "video" muestra un saludo en su ficha (MP4 + WebM de respaldo; "dur" en segundos). "video.tarjeta" es el mismo saludo
    // recortado como la foto de la tarjeta: se reproduce con sonido al pasar el cursor (computador).
    equipo: [
      { nombre: "María del Mar Silva", apodo: "Mari", cargo: "Equipo comercial", foto: "assets/img/equipo-mari.webp", whatsapp: "56920692060", telefono: "+56 9 2069 2060", correo: "m.silva@fundosinmobiliaria.com",
        bio: ["Hola, soy Mari 🌿", "Para mí, encontrar una parcela es mucho más que comprar un terreno. Es encontrar ese lugar donde construir un proyecto, compartir en familia o simplemente desconectarse y disfrutar. 🏡✨", "Me gusta escucharte, entender qué buscas y ayudarte a encontrar un lugar que realmente haga sentido para ti.", "Si estás pensando en tener tu lugar, conversemos. 🏔️💚"],
        video: { mp4: "assets/video/equipo-mari.mp4", webm: "assets/video/equipo-mari.webm", poster: "assets/video/equipo-mari.webp", dur: 8,
                 tarjeta: { mp4: "assets/video/equipo-mari-tarjeta.mp4", webm: "assets/video/equipo-mari-tarjeta.webm" } } },
      { nombre: "Valentina Medina Zapata", apodo: "Valentina", cargo: "Equipo comercial", foto: "assets/img/equipo-valentina.webp", whatsapp: "56977034503", telefono: "+56 9 7703 4503", correo: "v.medina@fundosinmobiliaria.com",
        bio: ["Soy Valentina, asesora especializada en convertir sueños en oportunidades reales. Mi compromiso es brindarte una asesoría cercana, transparente y personalizada, acompañándote en cada etapa para que tomes decisiones con confianza y tranquilidad. Porque detrás de cada proyecto hay una meta importante, estaré encantada de apoyarte.", "¿Hablamos y damos juntos el siguiente paso?"],
        video: { mp4: "assets/video/equipo-valentina.mp4", webm: "assets/video/equipo-valentina.webm", poster: "assets/video/equipo-valentina.webp", dur: 12,
                 tarjeta: { mp4: "assets/video/equipo-valentina-tarjeta.mp4", webm: "assets/video/equipo-valentina-tarjeta.webm" } } },
      { nombre: "Jeanette Astudillo", cargo: "Equipo comercial", foto: "assets/img/equipo-jeanette.webp", whatsapp: "56977033933", telefono: "+56 9 7703 3933", correo: "j.astudillo@fundosinmobiliaria.com",
        bio: ["Soy Jeanette, y me apasiona ayudar a las personas a encontrar su lugar ideal en la naturaleza.", "Te acompaño de forma cercana y transparente en cada etapa, para que tomes una decisión segura al elegir tu parcela.", "¡Conversemos y hagamos realidad tu próximo proyecto!"],
        video: { mp4: "assets/video/equipo-jeanette.mp4", webm: "assets/video/equipo-jeanette.webm", poster: "assets/video/equipo-jeanette.webp", dur: 11,
                 tarjeta: { mp4: "assets/video/equipo-jeanette-tarjeta.mp4", webm: "assets/video/equipo-jeanette-tarjeta.webm" } } },
      { nombre: "Stefany Villalobos", apodo: "Stefy", cargo: "Equipo comercial", foto: "assets/img/equipo-stefy.webp", whatsapp: "56920237119", telefono: "+56 9 2023 7119", correo: "s.villalobos@fundosinmobiliaria.com",
        bio: ["Comprar una parcela es una decisión importante, y mi objetivo no es simplemente venderte un terreno, sino ayudarte a tomar una buena decisión para ti y tu familia.", "Me gusta conocer qué estás buscando, responder tus dudas con claridad y acompañarte durante todo el proceso, sin presiones y con información transparente. 🏡", "Si estás pensando en dar el paso hacia tu parcela, conversemos.", "📲 Escríbeme y cuéntame qué tienes en mente. Yo me encargo de orientarte."],
        video: { mp4: "assets/video/equipo-stefy.mp4", webm: "assets/video/equipo-stefy.webm", poster: "assets/video/equipo-stefy.webp", dur: 11,
                 tarjeta: { mp4: "assets/video/equipo-stefy-tarjeta.mp4", webm: "assets/video/equipo-stefy-tarjeta.webm" } } },
      { nombre: "Diego Navarrete", cargo: "Equipo comercial", foto: "assets/img/equipo-diego.webp", whatsapp: "56983627968", telefono: "+56 9 8362 7968", correo: "d.navarrete@fundosinmobiliaria.com",
        bio: ["¿Cansado de cotizar parcelas y que ninguna sea la indicada?", "Buscar el terreno ideal puede ser frustrante: promesas que no se cumplen, precios ocultos o lugares que no se adaptan a lo que realmente sueñas. ¡No tienes que pasar por eso solo!", "Te puedo ayudar a encontrar lo que deseas.", "Mi objetivo no es solo venderte, sino escucharte, entender lo que buscas y brindarte el asesoramiento transparente que necesitas.", "Escríbeme hoy mismo y encontremos juntos tu próximo refugio o inversión."],
        video: { mp4: "assets/video/equipo-diego.mp4", webm: "assets/video/equipo-diego.webm", poster: "assets/video/equipo-diego.webp", dur: 12,
                 tarjeta: { mp4: "assets/video/equipo-diego-tarjeta.mp4", webm: "assets/video/equipo-diego-tarjeta.webm" } } },
      { nombre: "Geonela Roeder", cargo: "Equipo comercial", foto: "assets/img/equipo-geonela.webp", whatsapp: "56921600297", telefono: "+56 9 2160 0297", correo: "g.roeder@fundosinmobiliaria.com",
        bio: ["Hola, soy Geonela Roeder, asesora de Fundos Inmobiliaria. Quiero acompañarte en cada paso para que encuentres la parcela que realmente se ajuste a ti, con la información y orientación necesarias para tomar una decisión segura, informada e inteligente. Porque no se trata solo de comprar un terreno, sino de elegir bien dónde construir tus próximos sueños."],
        video: { mp4: "assets/video/equipo-geonela.mp4", webm: "assets/video/equipo-geonela.webm", poster: "assets/video/equipo-geonela.webp", dur: 17,
                 tarjeta: { mp4: "assets/video/equipo-geonela-tarjeta.mp4", webm: "assets/video/equipo-geonela-tarjeta.webm" } } },
      // Elvis: sin cargo ni presentación escrita todavía (por confirmar con el cliente). Fotos de todo el equipo: sesión del cliente en la oficina (octubre 2026), recortadas como el saludo en video.
      { nombre: "Elvis Jiménez", apodo: "Elvis", cargo: "Equipo comercial", foto: "assets/img/equipo-elvys.webp", whatsapp: "56983637081", telefono: "+56 9 8363 7081", correo: "e.jimenez@fundosinmobiliaria.com",
        video: { mp4: "assets/video/equipo-elvys.mp4", webm: "assets/video/equipo-elvys.webm", poster: "assets/video/equipo-elvys.webp", dur: 10,
                 tarjeta: { mp4: "assets/video/equipo-elvys-tarjeta.mp4", webm: "assets/video/equipo-elvys-tarjeta.webm" } } }
    ],

    // Video de portada (sin sonido, en bucle). Ocupa el marco de la portada de Proyectos; un cuadro del mismo video (portada.webp) queda de respaldo.
    // mp4/webm: versión horizontal o cuadrada; mp4Movil/webmMovil: versión vertical para celular (opcional).
    // Proyecto destacado: abre la página (pestaña "Puerto Varas") y es el que muestran primero el plano y el recorrido
    destacado: "puerto-varas",
    // Portada del destacado: bucle armado con los videos del cliente (lago, Frutillar, Petrohué, Osorno, Puerto Varas)
    videoDestacado: { mp4: "assets/video/puerto-varas.mp4", webm: "assets/video/puerto-varas.webm", poster: "assets/video/puerto-varas.webp", mp4Movil: "assets/video/puerto-varas-movil.mp4", webmMovil: "assets/video/puerto-varas-movil.webm", posterMovil: "assets/video/puerto-varas-movil.webp" },

    videoPortada: { mp4: "assets/video/portada.mp4", webm: "assets/video/portada.webm", poster: "assets/video/portada.webp", mp4Movil: "assets/video/portada-movil.mp4", webmMovil: "assets/video/portada-movil.webm", posterMovil: "assets/video/portada-movil.webp" },

    // Monto de reserva por lote (dato de Fundos 360°)
    reserva: 1000000,

    // Simulador. Si Fundos no ofrece crédito directo: habilitado = false
    financiamiento: {
      habilitado: true,
      tasaMensual: 0.009,   // 0,9 % mensual — referencial, confirmar
      pieMinimo: 0.3,
      plazos: [12, 24, 36, 48]
    },

    proyectos: [
      {
        id: "malalcahuello",
        nombre: "Malalcahuello",
        estado: "venta",
        region: "La Araucanía",
        zona: "Cordillera",
        resumen: "Bosque nativo, volcanes y el río Lolén. Nieve en invierno; pesca, senderos y termas el resto del año.",
        descripcion: "Un proyecto en plena cordillera de La Araucanía, con parcelas frente al río Lolén y rodeadas de bosque nativo. Ideal para una casa de montaña, un refugio familiar o un proyecto turístico propio.",
        destacados: ["Parcelas frente al río Lolén", "Entorno de bosque nativo y volcanes", "Temporada de nieve, pesca y termas", "Plano y antecedentes legales a la vista"],
        // Por camino desde la parcela (sector Lolén, Lonquimay; ver tools/entorno/malalcahuello/lugares.json)
        cercanias: [["Lonquimay", "17 km · 20 min"], ["Lago Icalma", "59 km · 55 min"], ["Corralco", "60 km · 1 h 10 min"], ["Curacautín", "79 km · 1 h 15 min"]],
        cercaniasNota: "Por camino desde la parcela, en auto y sin tráfico.",
        mapa: "https://www.google.com/maps/search/?api=1&query=-38.4743056,-71.2566389",
        // Mapa interactivo del entorno (página aparte)
        entorno: "entorno.html?p=malalcahuello",
        // Recorrido virtual 360° (se incrusta en la sección #recorrido)
        tour: "https://cmaulenb.github.io/fundoslonquimaynieve/",
        // Fondo del recorrido 360° (antes de entrar) y miniatura del selector: vista aérea sacada de la panorámica del propio tour
        tourFoto: { src: "assets/img/tour-malalcahuello-800.webp", src2x: "assets/img/tour-malalcahuello-1600.webp", mini: "assets/img/tour-malalcahuello-mini.webp" },
        // Video del proyecto (opcional): enlace de YouTube o Vimeo, o un archivo en assets/video/.
        // Ej.: "https://youtu.be/XXXXXXXXXXX" · "https://vimeo.com/123456789" · "assets/video/malalcahuello.mp4"
        video: "",
        logo: "assets/img/logo-malalcahuello.webp",
        // Apartado "Conoce cada proyecto" (pestaña Proyectos, #proyecto-ID): foto de portada (vista aérea del propio tour;
        // si se usa una foto ajena, agregar credito y url) y características.
        // Íconos: los <symbol id="i-…"> de index.html. Textos por aprobar con el cliente.
        foto: { src: "assets/img/tour-malalcahuello-800.webp", src2x: "assets/img/tour-malalcahuello-1600.webp", w: 1600, h: 1000, pos: "40% 50%",
                alt: "Vista aérea de la parcelación de Malalcahuello y su entorno", lugar: "Vista aérea de la parcela" },
        caracteristicas: [
          { icono: "drop", titulo: "Junto al río Lolén", texto: "Parcelas frente al río, en plena cordillera de La Araucanía." },
          { icono: "volcan", titulo: "Bosque nativo y volcanes", texto: "Araucarias, bosque y cumbres nevadas como paisaje de todos los días." },
          { icono: "snow", titulo: "Cuatro estaciones", texto: "Nieve en invierno; pesca, senderos y termas el resto del año." },
          { icono: "shield", titulo: "Todo a la vista", texto: "Plano y antecedentes legales disponibles antes de reservar." }
        ],
        // Categorías de precio: colores y valores de cada masterplan (lista = precio anterior tachado)
        categorias: {
          oro:     { color: "#bb9800", lista: 30990000, precio: 20990000 },
          celeste: { color: "#009fe3", lista: 28990000, precio: 18990000 },
          azul:    { color: "#263687", lista: 24990000, precio: 14990000 },
          verde:   { color: "#89c168", lista: 19990000, precio: 9990000 },
          lila:    { color: "#b10bff", lista: 10990000, precio: 7990000 }
        },
        lotes: lotes([
          [1, null, V], [2, null, V], [3, null, V], [4, null, V], [5, "oro", D], [6, null, V],
          [7, null, V], [8, null, V], [9, null, V], [10, null, V], [11, null, V], [12, null, V],
          [13, null, V], [14, null, V], [15, null, V], [16, null, V], [17, null, V], [18, "azul", D],
          [19, "azul", D], [20, "azul", D], [21, null, V], [22, null, V], [23, null, V], [24, null, V],
          [25, "azul", D], [26, null, V], [27, null, V], [28, null, V], [29, null, V], [30, "azul", D],
          [31, "azul", D], [32, "azul", D], [33, null, V], [34, null, V], [35, null, V], [36, null, V],
          [37, null, V], [38, null, V], [39, null, V], [40, null, V], [41, "verde", D], [42, null, V],
          [43, null, V], [44, null, V], [45, "azul", D], [46, "azul", D], [47, null, V], [48, null, V],
          [49, null, V], [50, null, V], [51, null, V], [52, null, V], [53, null, V], [54, null, V],
          [55, null, V], [56, null, V], [57, null, V], [58, null, V]
        ])
      },
      {
        id: "marchigue",
        nombre: "Marchigüe",
        estado: "venta",
        region: "O'Higgins",
        zona: "Valle de Colchagua",
        resumen: "Lomajes suaves, viñedos y cielos despejados. Clima templado todo el año, a una hora de Pichilemu.",
        descripcion: "Parcelas entre lomajes y viñedos del valle de Colchagua, con clima templado y cielos despejados casi todo el año. Cerca de la costa y de la ruta del vino, para vivir con calma o invertir en una zona que crece.",
        destacados: ["Zona vitivinícola de Colchagua", "Clima templado y soleado", "Cerca de Pichilemu y Santa Cruz", "Plano y antecedentes legales a la vista"],
        // Por camino desde la parcela (ver tools/entorno/marchigue/lugares.json)
        cercanias: [["Marchigüe", "15 km · 20 min"], ["Santa Cruz", "52 km · 55 min"], ["Pichilemu", "53 km · 1 h"], ["Lago Rapel", "61 km · 1 h 5 min"]],
        cercaniasNota: "Por camino desde la parcela, en auto y sin tráfico.",
        mapa: "https://www.google.com/maps/search/?api=1&query=-34.4661944,-71.7074722",
        // Mapa interactivo del entorno (página aparte)
        entorno: "entorno.html?p=marchigue",
        // Recorrido virtual 360° (se incrusta en la sección #recorrido)
        tour: "https://marchigue.netlify.app/",
        // Fondo del recorrido 360° (antes de entrar) y miniatura del selector: vista aérea sacada de la panorámica del propio tour
        tourFoto: { src: "assets/img/tour-marchigue-800.webp", src2x: "assets/img/tour-marchigue-1600.webp", mini: "assets/img/tour-marchigue-mini.webp" },
        // Video del proyecto (opcional): enlace de YouTube o Vimeo, o un archivo en assets/video/.
        // Ej.: "https://youtu.be/XXXXXXXXXXX" · "https://vimeo.com/123456789" · "assets/video/malalcahuello.mp4"
        video: "",
        logo: "assets/img/logo-marchigue.webp",
        foto: { src: "assets/img/tour-marchigue-800.webp", src2x: "assets/img/tour-marchigue-1600.webp", w: 1600, h: 1000, pos: "35% 60%",
                alt: "Vista aérea de la parcelación de Marchigüe y su entorno", lugar: "Vista aérea de la parcela" },
        caracteristicas: [
          { icono: "leaf", titulo: "Tierra de viñedos", texto: "En la zona vitivinícola del valle de Colchagua, entre lomajes suaves." },
          { icono: "sun", titulo: "Clima templado", texto: "Cielos despejados y temperaturas amables casi todo el año." },
          { icono: "road", titulo: "Cerca de la costa", texto: "A una hora de Pichilemu y de Santa Cruz y su ruta del vino." },
          { icono: "shield", titulo: "Todo a la vista", texto: "Plano y antecedentes legales disponibles antes de reservar." }
        ],
        sectores: [],
        // Categorías de precio: colores y valores de cada masterplan (lista = precio anterior tachado)
        categorias: {
          lima:  { color: "#bbcf15", lista: 15990000, precio: 10990000 },
          verde: { color: "#7fbd61", lista: 13990000, precio: 8990000 },
          azul:  { color: "#00a0ce", lista: 12990000, precio: 7990000 }
        },
        lotes: lotes([
          [1, null, V], [2, null, V], [3, null, V], [4, null, V], [5, null, V], [6, null, V],
          [7, null, V], [8, null, V], [9, null, V], [10, null, V], [11, null, V], [12, null, V],
          [13, null, V], [14, null, V], [15, null, V], [16, null, V], [17, null, V], [18, null, V],
          [19, null, V], [20, null, V], [21, null, V], [22, null, V], [23, null, V], [24, null, V],
          [25, null, V], [26, null, V], [27, null, V], [28, null, V], [29, null, V], [30, null, V],
          [31, "lima", D], [32, "lima", D], [33, null, V], [34, null, V], [35, null, V], [36, null, V],
          [37, "verde", D], [38, null, V], [39, null, V], [40, "verde", D], [41, null, V], [42, "verde", D],
          [43, null, V], [44, "lima", D], [45, "lima", D], [46, null, V], [47, null, V], [48, null, V],
          [49, null, V], [50, null, V], [51, null, V], [52, null, V], [53, null, V], [54, null, V],
          [55, null, V], [56, null, V], [57, null, V], [58, null, V], [59, "lima", D], [60, "lima", D],
          [61, null, V], [62, null, V], [63, null, V], [64, null, V], [65, null, V], [66, null, V],
          [67, "lima", D], [68, null, V], [69, null, V], [70, null, V], [71, null, V], [72, null, V],
          [73, null, V], [74, null, V], [75, null, V], [76, null, V], [77, null, V]
        ])
      },
      {
        id: "puerto-varas",
        nombre: "Puerto Varas",
        estado: "venta",
        region: "Los Lagos",
        zona: "Entre mar y lago",
        resumen: "Parcelas planas con rol propio y vista a los volcanes Osorno y Calbuco, en el Pasaje El Encanto. A 25 min de Puerto Montt y de Puerto Varas.",
        descripcion: "Fundos de Puerto Varas: 79 parcelas planas en el Pasaje El Encanto (Ruta La Colonia), entre Puerto Montt y Puerto Varas, con vista despejada a los volcanes Osorno y Calbuco. Un estero cruza la parcelación. Acceso controlado, caminos interiores estabilizados, factibilidad eléctrica en la entrada y agua por captación subterránea individual.",
        destacados: ["Vista despejada a los volcanes Osorno y Calbuco", "Topografía 100 % plana", "Roles propios aprobados por el SAG, listos para escriturar", "Acceso controlado y caminos estabilizados", "Factibilidad eléctrica y agua por noria o pozo"],
        // Por camino desde la parcela (OSRM/OpenStreetMap, ver tools/entorno/lugares.json); tiempos sin tráfico
        cercanias: [["Alerce", "5 km · 8 min"], ["Puerto Montt", "16 km · 25 min"], ["Puerto Varas", "18 km · 25 min"], ["Aeropuerto El Tepual", "37 km · 45 min"]],
        cercaniasNota: "Por camino desde la parcela, en auto y sin tráfico.",
        mapa: "https://www.google.com/maps/search/?api=1&query=-41.3700833,-72.8781389",
        // Mapa interactivo del entorno (página aparte)
        entorno: "entorno.html",
        // Recorrido virtual 360° (se incrusta en la sección #recorrido)
        tour: "https://6aab0a2a79cbb906fe66b800--tourspuertovaras.netlify.app/",
        // Fondo del recorrido 360° (antes de entrar) y miniatura del selector: vista aérea sacada de la panorámica del propio tour
        tourFoto: { src: "assets/img/tour-puerto-varas-800.webp", src2x: "assets/img/tour-puerto-varas-1600.webp", mini: "assets/img/tour-puerto-varas-mini.webp" },
        // Video del proyecto (opcional): enlace de YouTube o Vimeo, o un archivo en assets/video/.
        // Ej.: "https://youtu.be/XXXXXXXXXXX" · "https://vimeo.com/123456789" · "assets/video/malalcahuello.mp4"
        video: "",
        sectores: [],
        // Categorías de precio: colores y valores de cada masterplan (lista = precio anterior tachado)
        categorias: {
          morado:      { color: "#6a66ff", precio: 50990000 },
          verdeOscuro: { color: "#1a6614", precio: 45990000 },
          celeste:     { color: "#00c6f4", precio: 40990000 },
          verdeClaro:  { color: "#00ee1a", precio: 35990000 },
          amarillo:    { color: "#d9e021", precio: 27990000 }
        },
        lotes: lotes([
          [1, null, V], [2, "morado", D], [3, "morado", D], [4, "verdeOscuro", D], [5, "morado", D], [6, null, V],
          [7, null, V], [8, "morado", D], [9, "verdeOscuro", D], [10, "amarillo", D], [11, "celeste", D], [12, "verdeClaro", D],
          [13, "verdeClaro", D], [14, "celeste", D], [15, "celeste", D], [16, "celeste", D], [17, "celeste", D], [18, null, V],
          [19, null, V], [20, "celeste", D], [21, "verdeClaro", D], [22, "verdeClaro", D], [23, "amarillo", D], [24, "verdeClaro", D],
          [25, "verdeClaro", D], [26, "amarillo", D], [27, "verdeClaro", D], [28, "celeste", D], [29, "celeste", D], [30, "verdeClaro", D],
          [31, null, V], [32, "celeste", D], [33, "celeste", D], [34, "celeste", D], [35, "celeste", D], [36, null, V],
          [37, null, V], [38, "celeste", D], [39, null, V], [40, null, V], [41, "celeste", D], [42, null, V],
          [43, "verdeClaro", D], [44, "celeste", D], [45, "verdeClaro", D], [46, "verdeClaro", D], [47, "celeste", D], [48, null, V],
          [49, null, V], [50, "celeste", D], [51, null, V], [52, null, V], [53, "celeste", D], [54, null, V],
          [55, null, V], [56, "celeste", D], [57, null, V], [58, null, V], [59, "celeste", D], [60, null, V],
          [61, null, V], [62, "celeste", D], [63, null, V], [64, "celeste", D], [65, "celeste", D], [66, null, V],
          [67, "verdeClaro", D], [68, null, V], [69, "celeste", D], [70, "celeste", D], [71, "verdeClaro", D], [72, "verdeClaro", D],
          [73, "verdeClaro", D], [74, "verdeClaro", D], [75, null, V], [76, "celeste", D], [77, null, V], [78, "celeste", D],
          [79, null, V]
        ])
      }
    ],

    preguntasWhatsApp: "Hola Fundos, tengo una pregunta sobre sus parcelas."
  };
})();
