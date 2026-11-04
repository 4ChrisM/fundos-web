(function () {
  "use strict";

  /* =============================================================
     Fundos Inmobiliaria — interacciones
     Todo el contenido crítico está en el HTML; este archivo solo lo enriquece.
     Datos: lib/manifest.js (window.__BRAND__)
     ============================================================= */

  var B = window.__BRAND__ || {};
  var contacto = B.contacto || {};
  var proyectos = B.proyectos || [];
  var RESERVA = B.reserva || 1000000;

  var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; };
  var reduced = mm("(prefers-reduced-motion: reduce)").matches;
  var fineHover = mm("(hover: hover) and (pointer: fine)").matches;
  var desktop = mm("(min-width: 960px)");

  /* ---------- Utilidades ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.warn("[" + name + "]", e); } }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Medición (lib/analitica.js): no hace nada si no hay ID de Google Analytics en el manifiesto
  function medir(nombre, datos) { if (window.fundosEvento) safe(function () { window.fundosEvento(nombre, datos); }, "medir"); }
  // Leads a Fundos 360° (fundos360.leads del manifiesto): los formularios con datos de contacto crean el lead en el CRM
  // además de abrir WhatsApp. Envío silencioso (text/plain: sin preflight); si falla, WhatsApp sigue igual.
  var UTM = (function () {
    try {
      var q = new URLSearchParams(location.search), u = {};
      ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) { if (q.get(k)) u[k] = q.get(k).slice(0, 100); });
      if (Object.keys(u).length) sessionStorage.setItem("fundos-utm", JSON.stringify(u));
      return JSON.parse(sessionStorage.getItem("fundos-utm") || "{}");
    } catch (e) { return {}; }
  })();
  function enviarLead(d, form) {
    var url = (B.fundos360 || {}).leads;
    if (!url || !window.fetch) return;
    var hp = form && form.elements.sitio_web;
    d.sitio_web = hp ? hp.value : "";
    if (UTM.utm_campaign) d.campana = UTM.utm_campaign;
    var utm = [UTM.utm_source, UTM.utm_medium, UTM.utm_campaign].filter(Boolean).join(" / ");
    if (utm) d.utm = utm;
    try {
      fetch(url, { method: "POST", mode: "cors", keepalive: true, credentials: "omit", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(d) })
        .catch(function () { /* sin conexión con Fundos 360°: el contacto sigue por WhatsApp */ });
    } catch (e) { /* idem */ }
  }
  function miles(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function clp(n) { return "$" + miles(n); }
  function m2(n) { return miles(n) + " m²"; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pct(n) { return String(n).replace(".", ",") + "\u00A0%"; }
  function scrollToEl(el) { if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); }
  function waHref(text) {
    return "https://wa.me/" + (contacto.whatsapp || "") + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function proyecto(id) {
    for (var i = 0; i < proyectos.length; i++) if (proyectos[i].id === id) return proyectos[i];
    return null;
  }
  function disponibles(p) { return (p && p.lotes || []).filter(function (l) { return l.estado === "disponible"; }); }
  function desde(p) {
    var d = disponibles(p);
    return d.length ? Math.min.apply(null, d.map(function (l) { return l.precio; })) : 0;
  }
  var ESTADO = { disponible: "Disponible", reservada: "Reservado", vendida: "Vendido" };

  /* El precio de cada lote sale de su categoría (colores del masterplan). Solo el precio real: el "precio lista" de la
     leyenda de los PDF no se muestra en ninguna parte (ni tachado como "precio anterior", ni en la leyenda, la lista,
     el detalle o las alternativas; pedido del cliente, 28-oct-2026), así que se borra aquí, después de que
     aplicarDisponibilidad() lo usó para dar color a un precio nuevo. */
  function prepararLotes() {
    proyectos.forEach(function (p) {
      var cats = p.categorias || {};
      for (var k in cats) delete cats[k].lista;
      (p.lotes || []).forEach(function (l) {
        var c = cats[l.cat];
        l.precio = c ? c.precio : null;
        l.lista = null;
        l.m2 = l.m2 || 5000;
      });
    });
  }

  /* Disponibilidad real desde Fundos 360° (fundos360.disponibilidad del manifiesto): solo lo que muestra su plano
     comercial, por proyecto los lotes disponibles con su precio real, sin promociones ([n, precio, null]; el tercer
     lugar fue el precio sin promoción y desde el 28-oct-2026 llega siempre en null); el resto queda vendido. Si no responde a tiempo se usa la última respuesta guardada (24 h) o, si no hay, el manifiesto. */
  var DISP_KEY = "fundos-disponibilidad", DISP_ESPERA = 1500, DISP_VIGENCIA = 24 * 3600 * 1000;
  var COLORES_EXTRA = ["#bb9800", "#009fe3", "#7fbd61", "#b10bff", "#263687", "#bbcf15", "#00c6f4", "#6a66ff"];
  function pedirDisponibilidad() {
    var url = (B.fundos360 || {}).disponibilidad;
    if (!url || !window.fetch) return null;
    if (window.__fundosDisp) return window.__fundosDisp;   // pedido adelantado en el <head> de index.html
    return fetch(url, { mode: "cors", credentials: "omit" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function aplicarDisponibilidad(d) {
    if (!d || typeof d !== "object" || !d.proyectos || typeof d.proyectos !== "object") return false;
    var cambio = false;
    proyectos.forEach(function (p) {
      var info = d.proyectos[p.id];
      if (!info || !Array.isArray(info.disponibles) || !p.lotes || !p.lotes.length) return;
      var mapa = {};
      info.disponibles.forEach(function (x) {
        if (Array.isArray(x) && x[0] === Math.floor(x[0]) && x[1] >= 100000 && x[1] < 1e10) mapa[x[0]] = { precio: x[1], antes: x[2] > x[1] ? x[2] : null };
      });
      var cats = p.categorias = p.categorias || {}, k = 0;
      function categoria(precio, antes) {
        for (var key in cats) if (cats[key].precio === precio && (!antes || cats[key].lista === antes)) return key;
        var nueva = "f360-" + precio + "-" + (antes || 0);
        if (!cats[nueva]) {
          // Un precio nuevo toma el color de su tramo: el que tenía ese precio como "lista" en la leyenda
          var base = null;
          for (var c in cats) if ((antes && cats[c].precio === antes) || cats[c].lista === precio) base = cats[c].color;
          cats[nueva] = { color: base || COLORES_EXTRA[k++ % COLORES_EXTRA.length], precio: precio, lista: antes };
        }
        return nueva;
      }
      p.lotes.forEach(function (l) {
        var m = mapa[l.n];
        l.estado = m ? "disponible" : "vendida";
        l.cat = m ? categoria(m.precio, m.antes) : null;
      });
      cambio = true;
    });
    return cambio;
  }
  function conDisponibilidad(seguir) {
    var listo = false, pedido = pedirDisponibilidad();
    function guardada() {
      try { var g = JSON.parse(localStorage.getItem(DISP_KEY) || "null"); return g && Date.now() - g.t < DISP_VIGENCIA ? g.d : null; } catch (e) { return null; }
    }
    function fin(d) {
      if (listo) return; listo = true;
      safe(function () { aplicarDisponibilidad(d || guardada()); }, "disponibilidad");
      prepararLotes();
      seguir();
    }
    if (!pedido) return fin(null);
    pedido.then(function (d) {
      if (d && d.proyectos) try { localStorage.setItem(DISP_KEY, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* sin almacenamiento */ }
      fin(d && d.proyectos ? d : null);
    });
    setTimeout(function () { fin(null); }, DISP_ESPERA);
  }
  function precioTxt(l) { return l.precio ? clp(l.precio) : "Vendido"; }

  function paintRange(input) {
    var min = +input.min || 0, max = +input.max || 100, v = +input.value;
    input.style.setProperty("--p", ((v - min) / ((max - min) || 1) * 100) + "%");
  }

  // Favoritos: solo en este navegador (comodidad personal, no dato crítico)
  var FKEY = "fundos-favoritos";
  function loadFavs() {
    try {
      var v = JSON.parse(window.localStorage.getItem(FKEY) || "[]");
      return Array.isArray(v) ? v.filter(function (k) { return typeof k === "string"; }) : [];
    } catch (e) { return []; }
  }
  function saveFavs(list) { try { window.localStorage.setItem(FKEY, JSON.stringify(list)); } catch (e) { /* sin almacenamiento */ } }

  // API compartida entre módulos (se completa en cada init)
  var Visit = { prefill: function () {} };
  var Plan = { apply: function () {}, show: function () {}, current: function () { return (proyectos[0] || {}).id; } };
  var Casa = { set: function () {} };
  var Vista = { set: function () { return false; }, current: function () { return ""; } };
  var Video = { open: function () {} };   // visor de video de un proyecto (initVideo)

  /* Visor de fotos a pantalla completa (fichas de "Fundos en todo Chile"): Visor.abrir(lista, i, alCerrar) con
     lista = [{ src, grande, alt, credito }]. Muestra primero la foto de la galería (ya cargada) y la cambia por la
     grande (1920 px) cuando llega; flechas, teclado, deslizar en el celular y Escape. Un <dialog> propio sobre la ficha. */
  var Visor = (function () {
    var dlg = null, lista = [], i = 0, fin = null, sx = null, sy = 0;
    function ico(n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
    function armar() {
      dlg = document.createElement("dialog");
      dlg.className = "vz";
      dlg.setAttribute("aria-label", "Fotos en grande");
      dlg.innerHTML = '<div class="vz-top"><p class="vz-cuenta" aria-live="polite" data-vz-cuenta></p>' +
        '<button class="vz-x" type="button" data-vz-cerrar aria-label="Cerrar las fotos">' + ico("close") + "</button></div>" +
        '<figure class="vz-fig"><img class="vz-img" data-vz-img alt=""><figcaption class="vz-cap" data-vz-cap></figcaption></figure>' +
        '<button class="vz-flecha is-prev" type="button" data-vz-ir="-1" aria-label="Foto anterior">' + ico("arrow") + "</button>" +
        '<button class="vz-flecha" type="button" data-vz-ir="1" aria-label="Foto siguiente">' + ico("arrow") + "</button>";
      document.body.appendChild(dlg);
      dlg.addEventListener("click", function (e) {
        if (e.target.closest("[data-vz-cerrar]") || e.target === dlg || e.target.classList.contains("vz-fig")) { cerrar(); return; }
        var b = e.target.closest("[data-vz-ir]");
        if (b) ir(+b.getAttribute("data-vz-ir"));
      });
      dlg.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); ir(e.key === "ArrowLeft" ? -1 : 1); }
      });
      dlg.addEventListener("close", function () { var f = fin; fin = null; document.documentElement.classList.remove("vz-abierto"); if (f) f(i); });
      dlg.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
      dlg.addEventListener("touchend", function (e) {
        if (sx == null) return;
        var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) ir(dx < 0 ? 1 : -1);
        else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) cerrar();   // deslizar hacia abajo cierra
      });
    }
    function precargar(k) { var g = lista[(k + lista.length) % lista.length]; if (g && g.grande) { var im = new Image(); im.src = g.grande; } }
    function mostrar() {
      var g = lista[i], img = dlg.querySelector("[data-vz-img]");
      img.src = g.src; img.alt = g.alt || "";
      if (g.grande) {
        var hd = new Image();
        hd.onload = function () { if (lista[i] === g) img.src = g.grande; };
        hd.src = g.grande;
      }
      dlg.querySelector("[data-vz-cap]").innerHTML = "<span>" + esc(g.alt || "") + "</span>" + (g.credito ? "<small>" + esc(g.credito) + "</small>" : "");
      dlg.querySelector("[data-vz-cuenta]").textContent = (i + 1) + " de " + lista.length;
      if (lista.length > 1) { precargar(i + 1); precargar(i - 1); }
    }
    function ir(d) { if (lista.length < 2) return; i = (i + d + lista.length) % lista.length; mostrar(); }
    function cerrar() { if (dlg && dlg.open) { if (typeof dlg.close === "function") dlg.close(); else { dlg.removeAttribute("open"); dlg.dispatchEvent(new Event("close")); } } }
    function abrir(l, k, alCerrar) {
      if (!l || !l.length) return;
      if (!dlg) armar();
      lista = l; i = Math.max(0, Math.min(k || 0, l.length - 1)); fin = alCerrar || null;
      dlg.classList.toggle("is-una", l.length < 2);
      mostrar();
      document.documentElement.classList.add("vz-abierto");
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      var x = dlg.querySelector("[data-vz-cerrar]"); if (x) x.focus();
    }
    return { abrir: abrir, cerrar: cerrar };
  })();
  var DESTACADO = proyecto(B.destacado) ? B.destacado : "";

  // Alto real de la barra superior (con la franja de pestañas en celular y tablet)
  function navBottomPx() {
    var nv = $(".nav"); if (!nv) return 0;
    var b = nv.getBoundingClientRect().bottom, t = $(".nav-links", nv);
    if (t && getComputedStyle(t).position === "absolute") b = Math.max(b, t.getBoundingClientRect().bottom);
    return Math.max(0, b);
  }

  /* =============================================================
     Contacto: un solo lugar para número, correo y horario
     ============================================================= */
  function initContact() {
    var msg = "Hola Fundos, quiero información sobre sus parcelas.";
    $$("[data-wa]").forEach(function (a) { a.href = waHref(a.getAttribute("data-wa-msg") || msg); });
    if (contacto.whatsappVisible) $$("[data-wa-visible]").forEach(function (a) { a.textContent = contacto.whatsappVisible; });
    if (contacto.email) $$("[data-email]").forEach(function (a) { a.href = "mailto:" + contacto.email; a.innerHTML = esc(contacto.email).replace("@", "@<wbr>"); });   // si no cabe, se corta tras la @
    if (contacto.horario) $$("[data-horario]").forEach(function (p) { p.textContent = contacto.horario; });
    if (contacto.visitas) $$("[data-visitas]").forEach(function (p) { p.textContent = contacto.visitas; });
    // Aviso para lectores de pantalla: estos enlaces abren otra pestaña o la app
    $$('a[target="_blank"]').forEach(function (a) {
      var ids = (a.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
      if (ids.indexOf("nueva-pestana") < 0) ids.push("nueva-pestana");
      a.setAttribute("aria-describedby", ids.join(" "));
    });
  }

  /* =============================================================
     Pestañas: Puerto Varas · Proyectos · Tu compra · Equipo
     Cada sección dice en data-vista en qué pestañas aparece. Los enlaces internos (#plano, #tu-casa…)
     cambian de pestaña si hace falta; las pestañas llevan al comienzo de su vista.
     ============================================================= */
  function initVistas() {
    var root = document.documentElement;
    var PRIMERA = { inicio: "puerto-varas", proyectos: "mas-proyectos", compra: "tu-compra", equipo: "nosotros" };
    // La pestaña Proyectos es solo el mapa "Fundos en todo Chile" (ganó la opción vertical, oct-2026). Los enlaces viejos
    // a lo que antes estaba ahí (portada, tarjetas, "Conoce cada proyecto", recorrido 360°) llevan al mapa, y
    // #proyecto-ID abre la ficha de ese fundo
    var VIEJAS = ["inicio", "proyectos-inicio", "buscador", "proyectos", "disena-proyectos", "conoce", "recorrido"];
    var links = $$("[data-vista-link]"), cur = "";
    function targetFor(hash) {
      var id = decodeURIComponent((hash || "").replace(/^#/, ""));
      if (!id) return null;
      if (VIEJAS.indexOf(id) >= 0 || /^(proyecto|recorrido)-/.test(id)) return $("#mas-proyectos");
      var el = document.getElementById(id);
      if (!el && /^lote-/.test(id)) el = $("#plano");
      if (!el && id === "simulador") el = $("#plano");   // el simulador ahora vive dentro del lote
      if (!el && /^equipo-\d+$/.test(id)) el = $("#nosotros");
      return el;
    }
    function vistaPara(hash) {
      var el = targetFor(hash), box = el && el.closest("[data-vista]");
      if (!box) return "";
      var vs = box.getAttribute("data-vista").split(/\s+/);
      return vs.indexOf(cur) >= 0 ? cur : vs[0];
    }
    function set(v) {
      if (!PRIMERA[v] || v === cur) return false;
      cur = v;
      root.setAttribute("data-vista", v);
      links.forEach(function (a) {
        if (a.getAttribute("data-vista-link") === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
      document.dispatchEvent(new CustomEvent("fundos:vista", { detail: v }));
      // Los módulos que miden su espacio (plano, recorrido) se reacomodan
      window.dispatchEvent(new Event("resize"));
      return true;
    }
    function jump(el) {
      var y = el ? window.scrollY + el.getBoundingClientRect().top - navBottomPx() - 8 : 0;
      window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
    }
    Vista.set = set;
    Vista.current = function () { return cur; };
    Vista.paraHash = vistaPara;

    links.forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var v = a.getAttribute("data-vista-link");
        var changed = set(v);
        if (changed || window.scrollY > 0) window.scrollTo({ top: 0, behavior: changed || reduced ? "instant" : "smooth" });
        try { history.pushState(null, "", "#" + PRIMERA[v]); } catch (x) { /* marco sin historial */ }
      });
    });
    // Enlaces internos a otra pestaña: primero se muestra la vista; el salto lo hace el navegador o el módulo
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute("data-vista-link")) return;
      // El recorrido 360° se abre en el mapa del entorno de cada proyecto (portal desde la parcela)
      var to = a.getAttribute("data-tour-open");
      if (to) {
        var tp = proyecto(to === "plan" ? Plan.current() : to);
        if (tp && tp.entorno) { e.preventDefault(); e.stopImmediatePropagation(); window.location.href = tp.entorno + "#tour-360"; return; }
      }
      var v = vistaPara(a.getAttribute("href"));
      if (v && v !== cur) { set(v); window.scrollTo({ top: 0, behavior: "instant" }); }
    }, true);
    function fromHash() {
      var v = vistaPara(location.hash);
      if (v && set(v)) {
        var el = targetFor(location.hash);
        jump(el && el.id === PRIMERA[v] ? null : el);
      }
    }
    window.addEventListener("hashchange", fromHash);
    window.addEventListener("popstate", fromHash);
    var v0 = vistaPara(location.hash) || "inicio";
    set(v0);
    if (location.hash && targetFor(location.hash) && targetFor(location.hash).id !== PRIMERA[v0]) {
      window.setTimeout(function () { jump(targetFor(location.hash)); }, 60);
    }
  }

  /* =============================================================
     Navegación + menú móvil
     ============================================================= */
  function initNav() {
    var nav = $("[data-nav]");
    if (nav) {
      var onScroll = function () {
        nav.classList.toggle("is-solid", window.scrollY > 24);
        var max = document.documentElement.scrollHeight - window.innerHeight;
        nav.style.setProperty("--avance", max > 0 ? Math.min(1, window.scrollY / max).toFixed(3) : 0);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    // Menú móvil (dialog nativo: foco atrapado y Esc gratis)
    var menu = $("#menu"), openBtn = $("[data-menu-open]");
    if (!menu || !openBtn) return;
    var open = function () {
      if (typeof menu.showModal === "function") menu.showModal(); else menu.setAttribute("open", "");
      openBtn.setAttribute("aria-expanded", "true");
    };
    var close = function () {
      if (typeof menu.close === "function") menu.close(); else menu.removeAttribute("open");
      openBtn.setAttribute("aria-expanded", "false");
    };
    openBtn.addEventListener("click", open);
    $$("[data-menu-close], [data-menu-link]", menu).forEach(function (b) { b.addEventListener("click", close); });
    menu.addEventListener("close", function () { openBtn.setAttribute("aria-expanded", "false"); });
    desktop.addEventListener && desktop.addEventListener("change", function (e) { if (e.matches && menu.open) close(); });
  }

  /* =============================================================
     Apariciones al hacer scroll (umbral bajo + red de seguridad)
     ============================================================= */
  function initReveals() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("is-visible"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -4% 0px" });
    els.forEach(function (e) { io.observe(e); });
    setTimeout(function () {
      els.forEach(function (e) {
        if (!e.classList.contains("is-visible") && e.getBoundingClientRect().top < window.innerHeight) e.classList.add("is-visible");
      });
    }, 6000);

    var visit = $(".visit");
    if (visit) {
      var io2 = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { visit.classList.add("is-drawn"); io2.disconnect(); }
      }, { threshold: 0.05 });
      io2.observe(visit);
    }
  }

  /* =============================================================
     Enlaces que eligen un proyecto en el plano (pie de página)
     ============================================================= */
  function initIrAlPlano() {
    $$("[data-goto-plan]").forEach(function (a) {
      a.addEventListener("click", function () { Plan.show(a.getAttribute("data-goto-plan")); });
    });
  }

  /* =============================================================
     Plano interactivo de lotes
     ============================================================= */
  /* ---- Formato estándar de planos Fundos (igual para todos los proyectos) ----
     Solo cambian la geometría (lib/planos.js) y las categorías de precio (lib/manifest.js). */
  var PLANO = {
    predio: "#A2A3A1",     // base del predio bajo los lotes
    vendida: "#A8A8A8",    // lotes vendidos
    marcaVendida: "V",     // marca de vendido, como en los masterplan
    agua: "#3E9FD6"
  };
  var HEART = "M0 3.6C-3.9 1-5.2-.9-5.2-2.5a2.6 2.6 0 0 1 5.2-.8 2.6 2.6 0 0 1 5.2.8C5.2-.9 3.9 1 0 3.6Z";
  // Precio corto para el plano: $20,99M
  function corto(v) { return "$" + String(Math.round(v / 10000) / 100).replace(".", ",") + "M"; }
  function tituloPrecios(p) {
    var cats = p.categorias || {};
    return Object.keys(cats).some(function (k) { return cats[k].lista; }) ? "Precio oferta" : "Precios";
  }
  // Holgura típica de los lotes (percentil 20, en unidades del plano): define la escala legible
  function planR20(P) {
    var rs = Object.keys((P && P.lotes) || {}).map(function (k) { return P.lotes[k].r || 20; }).sort(function (a, b) { return a - b; });
    return rs.length ? rs[Math.floor(rs.length * 0.2)] : 20;
  }
  // Plano con el lenguaje de los masterplan de Fundos: terreno, colores por precio, vendidas y números.
  // Los números (pins) se dibujan a tamaño fijo en pantalla: la variable --u los reescala al hacer zoom.
  function svgPlan(p) {
    var P = (B.planos || {})[p.id];
    if (!P) return '<p class="noscript">El plano de ' + esc(p.nombre) + " estará disponible pronto.</p>";
    var vb = P.viewBox, lots = [];
    p.lotes.forEach(function (l) { var q = P.lotes[l.n]; if (q) lots.push({ l: l, d: q.d, cx: q.l[0], cy: q.l[1] }); });
    var calles = P.calles || [], agua = P.agua || [], camino = P.caminoPrincipal || "", contorno = P.contorno;
    var cats = p.categorias || {};
    var s = [];
    s.push('<svg class="plan-svg" viewBox="' + vb.join(" ") + '" data-base="' + vb.join(" ") + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Plano de lotes de ' + esc(p.nombre) + '. Usa las flechas para moverte entre lotes y Enter para ver el detalle.">');
    // Sin filtros SVG: se recalculaban en cada cuadro de zoom. El terreno es un fondo CSS (.plan-canvas).
    s.push('<defs>' +
      '<pattern id="lot-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#E9E3D7" fill-opacity=".85"/><rect width="2.6" height="7" fill="#8C8474"/></pattern>' +
      (contorno ? '<clipPath id="pl-predio"><path d="' + contorno + '"/></clipPath>' : "") + "</defs>");
    // Foto satelital del plano comercial (PDF), ubicada con su misma matriz: calza exacta con los lotes
    if (P.fondo) s.push('<image class="pl-sat" href="' + esc(P.fondo.src) + '" width="1" height="1" preserveAspectRatio="none" transform="matrix(' + P.fondo.matriz.join(" ") + ')"/>');
    var full = 'x="' + vb[0] + '" y="' + vb[1] + '" width="' + vb[2] + '" height="' + vb[3] + '"';
    // Predio: base uniforme con un halo oscuro (trazo de grosor fijo en pantalla) y borde, igual en todos los planos
    if (contorno) s.push('<path class="pl-halo pl-halo-a" d="' + contorno + '"/><path class="pl-halo pl-halo-b" d="' + contorno + '"/><path class="pl-predio" d="' + contorno + '"/>');
    s.push('<g class="pl-base"' + (contorno ? ' clip-path="url(#pl-predio)"' : "") + '><rect ' + full + ' fill="' + PLANO.predio + '"/></g>');
    s.push('<g class="lots">');
    lots.forEach(function (o) {
      var l = o.l, c = cats[l.cat];
      var fill = l.estado === "vendida" ? PLANO.vendida : (c ? c.color : "#C8A165");
      var aria = "Lote " + l.n + ", " + ESTADO[l.estado].toLowerCase() + (l.precio && l.estado !== "vendida" ? ", " + clp(l.precio) : "");
      s.push('<path class="lot st-' + l.estado + '" style="--c:' + fill + '" data-n="' + l.n + '" tabindex="-1" role="button" aria-label="' + esc(aria) + '" d="' + o.d + '"/>');
    });
    s.push("</g>");
    s.push('<g class="pl-hatch" aria-hidden="true">');
    lots.forEach(function (o) { if (o.l.estado === "reservada") s.push('<path d="' + o.d + '" fill="url(#lot-hatch)" opacity=".75"/>'); });
    s.push("</g>");
    s.push('<g aria-hidden="true">');
    agua.forEach(function (a) {
      // Esteros dibujados como línea en el PDF (trazo) o cuerpos de agua rellenos
      if (a.trazo) s.push('<path class="pl-agua-l" d="' + a.d + '" stroke="' + PLANO.agua + '" stroke-width="' + a.trazo + '"/>');
      else s.push('<path class="pl-agua" d="' + a.d + '" fill-rule="evenodd" fill="' + PLANO.agua + '"/>');
    });
    // Todas las vías con el mismo lenguaje: servidumbres en arena con borde punteado
    calles.forEach(function (k) {
      if (k.tipo === "servidumbre") s.push('<path class="pl-servidumbre" d="' + k.d + '" fill-rule="evenodd"/>');
      else s.push('<path class="pl-via-borde" d="' + k.d + '"/><path class="pl-via" d="' + k.d + '"/>');
    });
    if (camino && P.caminoPrincipalRelleno) s.push('<path class="pl-principal-r" d="' + camino + '"/>');
    else if (camino) s.push('<path class="pl-principal-borde" d="' + camino + '"/><path class="pl-principal" d="' + camino + '"/>');
    if (contorno) s.push('<path class="pl-limite" d="' + contorno + '"/>');
    s.push("</g>");
    s.push('<path class="lot-ring" d="M0 0" style="display:none"/>');
    s.push('<path class="lot-focus lot-focus-o" d="M0 0" style="display:none"/><path class="lot-focus lot-focus-i" d="M0 0" style="display:none"/>');
    // Pins: disponible = disco blanco con el color de su precio; vendida = cápsula discreta "V · n"
    s.push('<g class="pl-pins" aria-hidden="true">');
    lots.forEach(function (o) {
      var l = o.l, n = l.n, c = cats[l.cat];
      var st = 'style="transform:translate(' + o.cx + "px," + o.cy + "px) scale(var(--u,1))" + (c ? ";--c:" + c.color : "") + '"';
      if (l.estado === "vendida") {
        var two = String(n).length > 1, w = two ? 36 : 30;
        s.push('<g class="pin pin-vendida" data-n="' + n + '" ' + st + '><rect class="pin-b" x="' + (-w / 2) + '" y="-9" width="' + w + '" height="18" rx="9"/>' +
          '<text class="pin-v" x="' + (-w / 2 + 9.5) + '">' + PLANO.marcaVendida + '</text><text class="pin-t" x="' + (w / 2 - (two ? 11.5 : 8.5)) + '">' + n + "</text></g>");
        return;
      }
      s.push('<g class="pin pin-' + l.estado + '" data-n="' + n + '" ' + st + '><circle class="pin-sh" r="12.5" cy="1.4"/><circle class="pin-b" r="12"/>' +
        '<text class="pin-t">' + n + '</text><text class="pin-p" y="22">' + (l.precio ? corto(l.precio) : "") + '</text><g class="pin-fav" transform="translate(10.5 -10.5)"><circle r="6.8"/><path d="' + HEART + '"/></g></g>');
    });
    s.push("</g></svg>");
    return s.join("");
  }
  // Barra de precios sobre el plano: cada categoría es un filtro
  function catsHtml(p) {
    var cats = p.categorias || {}, disp = disponibles(p);
    var h = ['<p class="pl-title">' + tituloPrecios(p) + '</p><div class="pl-cats" role="group" aria-label="Filtrar por precio">'];
    Object.keys(cats).forEach(function (k) {
      var c = cats[k], n = disp.filter(function (l) { return l.cat === k; }).length;
      h.push('<button type="button" class="pl-cat" data-cat="' + k + '" aria-pressed="false"' + (n ? "" : " disabled") + ' style="--c:' + c.color + '">' +
        '<i class="sw" aria-hidden="true"></i><span class="pl-price">' + (c.lista ? '<s><span class="sr-only">Antes </span>' + clp(c.lista) + "</s> " : "") + "<b>" + clp(c.precio) + "</b></span>" +
        "<small>" + (n ? n + '<span class="pl-dl">' + (n === 1 ? " disponible" : " disponibles") + '</span><span class="pl-ds" aria-hidden="true"> disp.</span>' : "Agotado") + "</small></button>");
    });
    h.push("</div>");
    return h.join("");
  }
  // Leyenda estándar bajo el plano: encabezado con cifras y simbología
  function legendHtml(p) {
    var P = (B.planos || {})[p.id] || {};
    var nDisp = disponibles(p).length;
    var nVend = p.lotes.filter(function (l) { return l.estado === "vendida"; }).length;
    var nRes = p.lotes.filter(function (l) { return l.estado === "reservada"; }).length;
    var h = ['<div class="pl-head"><div><p class="pl-kicker">Plano de loteo</p><p class="pl-name">Fundos de ' + esc(p.nombre) + "</p></div>" +
      '<p class="pl-stats"><span><b>' + nDisp + "</b> " + (nDisp === 1 ? "disponible" : "disponibles") + "</span>" + (nRes ? "<span><b>" + nRes + "</b> " + (nRes === 1 ? "reservada" : "reservadas") + "</span>" : "") +
      "<span><b>" + nVend + "</b> " + (nVend === 1 ? "vendida" : "vendidas") + "</span><span><b>" + p.lotes.length + "</b> parcelas</span></p></div>"];
    h.push('<ul class="pl-symbols">');
    h.push('<li><i class="sym sym-disp" aria-hidden="true">7</i>Disponible (color según precio)</li>');
    h.push('<li><i class="sym sym-v" aria-hidden="true">' + PLANO.marcaVendida + " 12</i>Vendida</li>");
    if (nRes) h.push('<li><i class="sw sw-reservada" aria-hidden="true"></i>Reservada</li>');
    if ((P.calles || []).length) h.push('<li><i class="sw sw-servidumbre" aria-hidden="true"></i>Servidumbre de tránsito</li>');
    if (P.caminoPrincipal) h.push('<li><i class="sw sw-principal" aria-hidden="true"></i>Camino principal</li>');
    var aguas = [];
    (P.agua || []).forEach(function (a) { if (aguas.indexOf(a.nombre) < 0) aguas.push(a.nombre); });
    aguas.forEach(function (n) { h.push('<li><i class="sw sw-agua" aria-hidden="true"></i>' + esc(n) + "</li>"); });
    h.push('<li><i class="sym sym-fav" aria-hidden="true"><svg viewBox="-7 -7 14 14"><path d="' + HEART + '"/></svg></i>Tu favorito</li></ul>');
    return h.join("");
  }

  function initPlan() {
    var root = $("[data-plan]");
    if (!root) return;
    var canvas = $("[data-canvas]", root), list = $("[data-list]", root), stage = $("[data-stage]", root);
    var tip = $("[data-tip]", root), legend = $("[data-legend]", root), hint = $("[data-hint]", root), othersEl = $("[data-plan-others]", root);
    var cats = $("[data-cats]", root), empty = $("[data-plan-empty]", root), live = $("[data-plan-live]", root);
    var summary = $("[data-summary]", root), clearBtn = $("[data-clear-filters]", root);
    var price = $("[data-price]", root), priceOut = $("[data-price-out]", root);
    var tabs = $$("[data-tab]", root), views = $$("[data-view]", root);
    var viewToggle = $(".view-toggle", root), filtersBox = $("[data-filters]", root), statusBox = $(".status-filter", root);
    var fToggle = $("[data-filters-toggle]", root), fCount = $("[data-filter-count]", root);
    var checks = $$(".status-filter input", root);
    var zoomUi = $("[data-zoom-ui]", root);
    var panel = $("[data-panel]"), pEmpty = $("[data-panel-empty]"), pDetail = $("[data-panel-detail]"), pStats = $("[data-panel-stats]"), pShort = $("[data-panel-short]");
    var backdrop = $("[data-sheet-backdrop]"), grab = $("[data-sheet-grab]");
    var d = {
      project: $("[data-d-project]"), title: $("[data-d-title]"), status: $("[data-d-status]"), sector: $("[data-d-sector]"),
      price: $("[data-d-price]"), m2: $("[data-d-m2]"), reserva: $("[data-d-reserva]"), pago: $("[data-d-pago]"),
      m2price: $("[data-d-m2price]"), reserve: $("[data-d-reserve]"), wa: $("[data-d-wa]"), fav: $("[data-d-fav]"),
      casa: $("[data-d-casa]"), close: $("[data-panel-close]"), facts: $(".lot-facts", pDetail), alts: $("[data-d-alts]"), toast: $("[data-d-toast]")
    };
    var favBox = $("[data-favs]"), favCount = $("[data-favs-count]"), favLabel = $("[data-favs-label]");
    var favList = $("[data-favs-list]"), favSend = $("[data-favs-send]"), favClear = $("[data-favs-clear]");
    var favMain = $("[data-favs-main]"), favUndo = $("[data-favs-undo]"), favRestore = $("[data-favs-restore]");

    var first = proyecto(DESTACADO) && proyecto(DESTACADO).lotes.length ? proyecto(DESTACADO) : proyectos.filter(function (p) { return p.lotes && p.lotes.length; })[0];
    var S = {
      id: first ? first.id : (proyectos[0] && proyectos[0].id),
      est: { disponible: true, reservada: true, vendida: true },
      max: Infinity, sector: "", view: "plano", sel: null, sort: "n", dir: 1,
      nota: "", otros: []      // aviso y otros proyectos cuando se llega desde el buscador
    };
    var favs = loadFavs().filter(function (k) {
      var parts = k.split(":"), p = proyecto(parts[0]);
      return p && p.lotes.some(function (l) { return String(l.n) === parts[1]; });
    });
    var shapes = {}, ring = null, prices = [];

    function P() { return proyecto(S.id); }
    function PL() { return (B.planos || {})[S.id]; }
    function pt(n) { var q = PL() && PL().lotes[n]; return q ? q.l : null; }
    function lotOf(p, n) { for (var i = 0; i < p.lotes.length; i++) if (p.lotes[i].n === n) return p.lotes[i]; return null; }
    // Un lote pasa los filtros; el tope de precio y la categoría solo aplican a lotes con precio (los vendidos no)
    function passes(l) {
      return !!S.est[l.estado] && (S.max === Infinity || (l.precio != null && l.estado !== "vendida" && l.precio <= S.max)) &&
        (S.sector === "" || l.cat === S.sector);
    }
    function filtersActive() { return S.max < Infinity || S.sector !== "" || !S.est.disponible || !S.est.reservada || !S.est.vendida; }
    function isFav(id, n) { return favs.indexOf(id + ":" + n) > -1; }
    function navBottom() { return navBottomPx(); }
    // Salto sin animación (al abrir un enlace directo)
    function jumpTo(y) {
      var html = document.documentElement, prevB = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      html.style.scrollBehavior = prevB;
    }
    function announce(t) { if (live) { live.textContent = ""; window.setTimeout(function () { live.textContent = t; }, 30); } }
    // Enlace directo al lote; dentro de un marco (vista previa) se omite
    function lotLink(p, l) {
      var framed = true;
      try { framed = window.self !== window.top; } catch (e) { framed = true; }
      return framed ? "" : " " + location.href.split("#")[0] + "#lote-" + p.id + "-" + l.n;
    }

    [stage, canvas].forEach(function (el) {
      el.addEventListener("scroll", function () { if (el.scrollLeft || el.scrollTop) { el.scrollLeft = 0; el.scrollTop = 0; } });
    });

    /* ---- Render ---- */
    function renderSvg() {
      var p = P();
      canvas.innerHTML = svgPlan(p);
      if (cats) cats.innerHTML = catsHtml(p);
      if (legend) legend.innerHTML = legendHtml(p);
      var svg = $("svg", canvas);
      shapes = {};
      $$(".lot", svg).forEach(function (el) { shapes[el.getAttribute("data-n")] = { path: el }; });
      $$(".pin", svg).forEach(function (el) { var s = shapes[el.getAttribute("data-n")]; if (s) s.pin = el; });
      ring = $(".lot-ring", svg);
      root.classList.toggle("is-wide", isWide());
      fondo();
      layoutPlan(true);
    }
    // Fondo del plano: la foto satelital del plano comercial (por defecto, como los PDF) o el plano liso
    var fondoUi = $("[data-fondo-ui]", root), conSat = true;
    try { conSat = sessionStorage.getItem("plano-fondo") !== "plano"; } catch (e) {}
    function fondo() {
      var hay = !!(PL() && PL().fondo);
      canvas.classList.toggle("is-sat", hay && conSat);
      if (!fondoUi) return;
      fondoUi.hidden = !hay;
      $$("[data-fondo]", fondoUi).forEach(function (b) { b.setAttribute("aria-pressed", String((b.getAttribute("data-fondo") === "sat") === conSat)); });
    }
    if (fondoUi) fondoUi.addEventListener("click", function (e) {
      var b = e.target.closest("[data-fondo]");
      if (!b) return;
      conSat = b.getAttribute("data-fondo") === "sat";
      try { sessionStorage.setItem("plano-fondo", conSat ? "sat" : "plano"); } catch (er) {}
      fondo();
    });
    function isWide() { var b = (PL() && PL().viewBox) || [0, 0, 1000, 640]; return b[2] / b[3] > 2; }
    // Los planos anchos (Puerto Varas) llevan el detalle al lado: el plano baja a su alto natural (un poco más)

    /* ---- Zoom y desplazamiento del plano ----
       Botones + / − / completo, pellizco, arrastre, doble clic y Ctrl + rueda.
       En pantallas chicas el plano parte a una escala donde cada lote se puede tocar, centrado en los disponibles. */
    var Z = { base: null, W: 0, H: 0, fitW: 0, fitH: 0, k: 1, cx: 0, cy: 0, anim: 0, r20: 20 };
    var MAXK = 6;
    function isSmall() { return window.innerWidth < 720; }
    function layoutPlan(reset) {
      var svg = $("svg", canvas);
      if (!svg || canvas.hidden) return;
      var b = (svg.getAttribute("data-base") || "0 0 1000 640").split(" ").map(Number);
      Z.base = b;
      Z.r20 = planR20(PL());
      var W = canvas.clientWidth || 1;
      var H = W * b[3] / b[2];
      if (isSmall()) H = clamp(H * 1.5, 260, Math.min(window.innerHeight * 0.6, 460));
      else {
        // Toda la herramienta (proyectos, filtros, chips, plano y leyenda) cabe en la pantalla bajo la
        // barra de navegación; el plano nunca pasa de 480 px ni
        // de casi la mitad del alto de la ventana, para no comerse la página.
        var navH = Math.min(navBottom() || 66, 70), catsH = cats && !cats.hidden ? cats.offsetHeight : 0;
        var above = cats ? Math.max(0, cats.getBoundingClientRect().top - root.getBoundingClientRect().top) : 0;
        var legH = legend && !legend.hidden ? legend.offsetHeight : 0;
        H = Math.min(H, clamp(Math.min(window.innerHeight - navH - above - catsH - legH - 24, window.innerHeight * .47), 380, 480));
        if (isWide()) H = clamp(W * b[3] / b[2] * 1.12, 300, 480);
      }
      if (!reset && Z.W === W && Z.H) H = Z.H;    // la barra del navegador móvil cambia innerHeight: la altura no salta
      canvas.style.height = Math.round(H) + "px";
      if (stage) root.style.setProperty("--stage-h", stage.offsetHeight + "px");
      Z.W = W; Z.H = H;
      var a = W / H;
      if (b[2] / b[3] > a) { Z.fitW = b[2]; Z.fitH = b[2] / a; } else { Z.fitH = b[3]; Z.fitW = b[3] * a; }
      if (reset) {
        Z.k = 1; Z.cx = b[0] + b[2] / 2; Z.cy = b[1] + b[3] / 2;
        if (isSmall()) {
          // lotes de ~36 px: se pueden tocar sin errar
          Z.k = clamp((20 / Z.r20) * Z.fitW / W, 1, MAXK);
          var hits = disponibles(P()).filter(passes);
          var pts = (hits.length ? hits : disponibles(P())).map(function (l) { return pt(l.n); }).filter(Boolean);
          if (pts.length) {
            Z.cx = pts.reduce(function (t, q) { return t + q[0]; }, 0) / pts.length;
            Z.cy = pts.reduce(function (t, q) { return t + q[1]; }, 0) / pts.length;
          }
          // los botones de zoom ocupan la esquina inferior: el encuadre se corre para no tapar lotes
          if (zoomUi) Z.cy += (zoomUi.offsetHeight + 16) / H * (Z.fitH / Z.k) / 2;
        }
        var qs = S.sel != null && pt(S.sel);   // si hay un lote elegido, sigue a la vista
        if (qs) { Z.cx = qs[0]; Z.cy = qs[1]; }
      }
      applyView();
    }
    function clampView() {
      var b = Z.base, vw = Z.fitW / Z.k, vh = Z.fitH / Z.k;
      Z.cx = vw >= b[2] ? b[0] + b[2] / 2 : clamp(Z.cx, b[0] + vw / 2, b[0] + b[2] - vw / 2);
      Z.cy = vh >= b[3] ? b[1] + b[3] / 2 : clamp(Z.cy, b[1] + vh / 2, b[1] + b[3] - vh / 2);
    }
    function applyView() {
      var svg = $("svg", canvas);
      if (!svg || !Z.base) return;
      Z.k = clamp(Z.k, 1, MAXK);
      clampView();
      var vw = Z.fitW / Z.k, vh = Z.fitH / Z.k;
      svg.setAttribute("viewBox", [(Z.cx - vw / 2).toFixed(2), (Z.cy - vh / 2).toFixed(2), vw.toFixed(2), vh.toFixed(2)].join(" "));
      // Pins a tamaño constante en pantalla; se achican un poco si los lotes se ven muy chicos
      var upp = vw / Z.W, clearPx = Z.r20 / upp;
      svg.style.setProperty("--u", (upp * clamp(clearPx / 15, 0.62, 1)).toFixed(4));
      svg.classList.toggle("is-dense", clearPx < 11);
      svg.classList.toggle("is-roomy", clearPx >= 30);
      svg.classList.toggle("is-crowded", clearPx < 7.5);   // los números ya no caben: puntos de color
      if (!tip.hidden && !Z.tipKeep) tip.hidden = true;     // un tooltip no queda apuntando a otro lugar tras mover el plano
      canvas.classList.toggle("is-zoomed", Z.k > 1.01);
      if (zoomUi) {
        $('[data-zoom="in"]', zoomUi).disabled = Z.k >= MAXK - 0.01;
        $('[data-zoom="out"]', zoomUi).disabled = Z.k <= 1.01;
        $('[data-zoom="fit"]', zoomUi).disabled = Z.k <= 1.01;
      }
    }
    // Punto de la pantalla -> coordenadas del plano
    function toPlan(clientX, clientY) {
      var r = canvas.getBoundingClientRect(), vw = Z.fitW / Z.k, vh = Z.fitH / Z.k;
      return [Z.cx - vw / 2 + (clientX - r.left) / r.width * vw, Z.cy - vh / 2 + (clientY - r.top) / r.height * vh];
    }
    // Acerca o aleja manteniendo fijo el punto (px, py) del plano
    function zoomAt(k, px, py) {
      var k0 = Z.k;
      k = clamp(k, 1, MAXK);
      if (px == null) { px = Z.cx; py = Z.cy; }
      Z.cx = px - (px - Z.cx) * k0 / k;
      Z.cy = py - (py - Z.cy) * k0 / k;
      Z.k = k;
      applyView();
    }
    function animateTo(k, cx, cy, done) {
      window.cancelAnimationFrame(Z.anim);
      if (reduced) { Z.k = k; Z.cx = cx; Z.cy = cy; applyView(); if (done) done(); return; }
      var s0 = { k: Z.k, cx: Z.cx, cy: Z.cy }, t0 = performance.now();
      (function step(t) {
        var u = Math.min(1, (t - t0) / 260), e = 1 - Math.pow(1 - u, 3);
        Z.k = s0.k + (k - s0.k) * e; Z.cx = s0.cx + (cx - s0.cx) * e; Z.cy = s0.cy + (cy - s0.cy) * e;
        applyView();
        if (u < 1) Z.anim = window.requestAnimationFrame(step); else if (done) done();
      })(t0);
    }
    function zoomBy(f, px, py, done) {
      var k = clamp(Z.k * f, 1, MAXK), k0 = Z.k;
      if (px == null) { px = Z.cx; py = Z.cy; }
      animateTo(k, px - (px - Z.cx) * k0 / k, py - (py - Z.cy) * k0 / k, done);
      hideHint();
    }
    // Encuadra los lotes que calzan con un filtro si alguno quedó fuera de la vista (se aleja solo lo necesario)
    function frameLots(ns) {
      if (!Z.base || canvas.hidden || !ns.length) return;
      var pts = ns.map(pt).filter(Boolean);
      if (!pts.length) return;
      var vw = Z.fitW / Z.k, vh = Z.fitH / Z.k, safe = zoomUi ? (zoomUi.offsetHeight + 16) / Z.H : 0;
      var all = pts.every(function (q) {
        return q[0] > Z.cx - vw / 2 && q[0] < Z.cx + vw / 2 && q[1] > Z.cy - vh / 2 && q[1] < Z.cy + vh / 2 - safe * vh;
      });
      if (all) return;
      var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      pts.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
      var pad = Z.r20 * 2.2, bw = x1 - x0 + 2 * pad, bh = y1 - y0 + 2 * pad;
      var k = clamp(Math.min(Z.k, Z.fitW / bw, Z.fitH * (1 - safe) / bh), 1, MAXK);
      animateTo(k, (x0 + x1) / 2, (y0 + y1) / 2 + safe * (Z.fitH / k) / 2);
    }
    function frameMatches() {
      if (S.view !== "plano") return;
      frameLots(disponibles(P()).filter(passes).map(function (l) { return l.n; }));
    }
    // Lleva un lote a la vista si quedó fuera o bajo los controles (lista, teclado, enlaces, alternativas)
    function reveal(n, done) {
      var q = pt(n);
      if (!q || !Z.base || canvas.hidden) { if (done) done(); return; }
      var vw = Z.fitW / Z.k, vh = Z.fitH / Z.k, x = q[0], y = q[1];
      var safeB = zoomUi ? (zoomUi.offsetHeight + 16) / Z.H * vh : 0;
      var inside = x > Z.cx - vw / 2 + vw * 0.1 && x < Z.cx + vw / 2 - vw * 0.1 &&
        y > Z.cy - vh / 2 + vh * 0.1 && y < Z.cy + vh / 2 - Math.max(vh * 0.1, safeB);
      if (inside) { if (done) done(); return; }
      animateTo(Z.k, x, y, done);
    }
    if (zoomUi) zoomUi.addEventListener("click", function (e) {
      var b = e.target.closest("[data-zoom]");
      if (!b || b.disabled) return;
      var a = b.getAttribute("data-zoom");
      if (a === "in") zoomBy(1.6);
      else if (a === "out") zoomBy(1 / 1.6);
      else { animateTo(1, Z.base[0] + Z.base[2] / 2, Z.base[1] + Z.base[3] / 2); hideHint(); }
    });
    canvas.addEventListener("wheel", function (e) {
      if (!(e.ctrlKey || e.metaKey) || canvas.hidden) return;   // la rueda sola sigue desplazando la página
      e.preventDefault();
      var q = toPlan(e.clientX, e.clientY);
      zoomAt(Z.k * Math.exp(-e.deltaY * 0.0022), q[0], q[1]);
      hideHint();
    }, { passive: false });
    // Doble clic acerca solo con mouse: en pantallas táctiles el primer toque ya abre el lote
    var lastPtr = "mouse";
    canvas.addEventListener("dblclick", function (e) {
      if (lastPtr !== "mouse") return;
      var q = toPlan(e.clientX, e.clientY);
      zoomBy(Z.k >= MAXK - 0.01 ? 1 / MAXK : 2, q[0], q[1]);
    });
    // Arrastre (mouse o un dedo en horizontal) y pellizco (dos dedos)
    var ptrs = {}, drag = null, moved = false;
    canvas.addEventListener("pointerdown", function (e) {
      lastPtr = e.pointerType;
      window.cancelAnimationFrame(Z.anim);
      if (e.pointerType === "mouse" && e.button !== 0) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      moved = false;
      var ids = Object.keys(ptrs);
      if (ids.length === 1) drag = { x: e.clientX, y: e.clientY, cx: Z.cx, cy: Z.cy };
      else if (ids.length === 2) {
        var a = ptrs[ids[0]], c = ptrs[ids[1]];
        drag = { pinch: Math.hypot(a.x - c.x, a.y - c.y), k: Z.k, mid: toPlan((a.x + c.x) / 2, (a.y + c.y) / 2) };
        hideHint();
      }
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!ptrs[e.pointerId] || !drag) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptrs), r = canvas.getBoundingClientRect();
      if (ids.length >= 2 && drag.pinch) {
        var a = ptrs[ids[0]], c = ptrs[ids[1]], dd = Math.hypot(a.x - c.x, a.y - c.y);
        Z.k = clamp(drag.k * dd / drag.pinch, 1, MAXK);
        var vw = Z.fitW / Z.k, vh = Z.fitH / Z.k, mx = (a.x + c.x) / 2 - r.left, my = (a.y + c.y) / 2 - r.top;
        Z.cx = drag.mid[0] - (mx / r.width - 0.5) * vw;
        Z.cy = drag.mid[1] - (my / r.height - 0.5) * vh;
        moved = true;
        applyView();
        return;
      }
      if (Z.k <= 1.01 || drag.pinch) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) { moved = true; hideHint(); try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ } }
      canvas.classList.add("is-dragging");
      Z.cx = drag.cx - dx / r.width * (Z.fitW / Z.k);
      Z.cy = drag.cy - dy / r.height * (Z.fitH / Z.k);
      tip.hidden = true;
      applyView();
    });
    function endPtr(e) {
      delete ptrs[e.pointerId];
      var ids = Object.keys(ptrs);
      if (!ids.length) { drag = null; canvas.classList.remove("is-dragging"); }
      else if (ids.length === 1) { var q = ptrs[ids[0]]; drag = { x: q.x, y: q.y, cx: Z.cx, cy: Z.cy }; }
    }
    canvas.addEventListener("pointerup", endPtr);
    canvas.addEventListener("pointercancel", endPtr);
    // Un arrastre no debe seleccionar el lote donde termina
    canvas.addEventListener("click", function (e) { if (moved) { e.stopPropagation(); moved = false; } }, true);
    var rzT = 0, lastW = window.innerWidth;
    window.addEventListener("resize", function () {
      window.clearTimeout(rzT);
      rzT = window.setTimeout(function () {
        var crossed = (lastW < 720) !== isSmall();
        lastW = window.innerWidth;
        layoutPlan(crossed);
      }, 120);
    });

    // Aviso de gestos (táctil): se oculta con la primera interacción y no vuelve en la sesión
    var hintKey = "fundos-plan-hint";
    function hideHint() {
      if (!hint || hint.hidden) return;
      hint.hidden = true;
      try { window.sessionStorage.setItem(hintKey, "1"); } catch (e) { /* sin almacenamiento */ }
    }
    function showHint() {
      if (!hint) return;
      var seen = false;
      try { seen = window.sessionStorage.getItem(hintKey) === "1"; } catch (e) { seen = false; }
      hint.hidden = seen || S.view !== "plano" || !mm("(pointer: coarse)").matches;
      if (!hint.hidden) armHint();
    }
    // El aviso no tapa lotes por mucho rato: se desvanece a los 5 s de estar a la vista
    var hintArmed = false;
    function armHint() {
      if (hintArmed || !("IntersectionObserver" in window)) return;
      hintArmed = true;
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        window.setTimeout(function () {
          if (hint.hidden) return;
          hint.classList.add("is-fading");
          window.setTimeout(function () { hint.classList.remove("is-fading"); hideHint(); }, reduced ? 0 : 400);
        }, 5000);
      }, { threshold: .6 });
      io.observe(canvas);
    }

    function renderList() {
      var p = P();
      var key = function (l) { return S.sort === "precio" ? (l.estado === "vendida" || !l.precio ? 1e12 : l.precio) : l[S.sort]; };
      var rows = p.lotes.filter(passes).sort(function (a, b) { return (key(a) - key(b)) * S.dir || a.n - b.n; });
      if (!rows.length) { list.innerHTML = '<p class="list-empty">No hay lotes con estos filtros. <button type="button" class="link-btn" data-clear-filters>Limpiar filtros</button></p>'; return; }
      var hasLista = p.lotes.some(function (l) { return l.lista && l.estado !== "vendida"; });
      var m2s = p.lotes.map(function (l) { return l.m2; }), sameM2 = m2s.every(function (v) { return v === m2s[0]; });
      var arrow = function (k) { return S.sort === k ? (S.dir > 0 ? " ↑" : " ↓") : ""; };
      var sortAttr = function (k) { return ' aria-sort="' + (S.sort === k ? (S.dir > 0 ? "ascending" : "descending") : "none") + '"'; };
      var h = ['<table class="lot-table"><caption class="sr-only">Lotes de ' + esc(p.nombre) + (sameM2 ? ", todos de " + m2(m2s[0]) : "") + '</caption><thead><tr>',
        '<th scope="col"' + sortAttr("n") + '><button type="button" data-sort="n">Lote' + arrow("n") + "</button></th>",
        '<th scope="col"' + sortAttr("precio") + '><button type="button" data-sort="precio">Precio' + arrow("precio") + "</button></th>",
        hasLista ? '<th scope="col" class="t-sector">Antes</th>' : "",
        sameM2 ? "" : '<th scope="col" class="t-m2"' + sortAttr("m2") + '><button type="button" data-sort="m2">Superficie' + arrow("m2") + "</button></th>",
        '<th scope="col">Estado</th><th scope="col" class="t-sel"><span class="sr-only">Acción</span></th></tr></thead><tbody>'];
      rows.forEach(function (l) {
        var sold = l.estado === "vendida", c = (p.categorias || {})[l.cat];
        h.push('<tr data-n="' + l.n + '"' + (S.sel === l.n ? ' class="is-active"' : "") + ">" +
          '<td class="t-num">' + l.n + (isFav(p.id, l.n) ? ' <svg class="i t-fav" aria-label="Favorito" role="img"><use href="#i-heart"/></svg>' : "") + "</td>" +
          '<td class="t-price">' + (sold ? '<span class="t-muted">—</span>' : '<i class="t-cat" style="--c:' + (c ? c.color : "transparent") + '"></i>' + clp(l.precio)) + "</td>" +
          (hasLista ? '<td class="t-sector">' + (l.lista && !sold ? "<s>" + clp(l.lista) + "</s>" : "") + "</td>" : "") +
          (sameM2 ? "" : '<td class="t-m2">' + m2(l.m2) + "</td>") +
          '<td><span class="dot st-' + l.estado + '">' + ESTADO[l.estado] + "</span></td>" +
          '<td class="t-sel"><button type="button" data-n="' + l.n + '" aria-label="Ver lote ' + l.n + '">Ver</button></td></tr>');
      });
      h.push("</tbody></table>");
      list.innerHTML = h.join("");
    }

    /* ---- Estado visual ---- */
    function applyFilters() {
      var p = P(), any = false;
      p.lotes.forEach(function (l) {
        var sh = shapes[l.n];
        if (!sh) return;
        var ok = passes(l);
        any = any || ok;
        sh.path.classList.toggle("is-dim", !ok);
        if (ok) sh.path.removeAttribute("aria-hidden"); else sh.path.setAttribute("aria-hidden", "true");
        if (sh.pin) sh.pin.classList.toggle("is-dim", !ok);
      });
      $$(".pl-cat", cats).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-cat") === S.sector ? "true" : "false"); });
      if (empty) empty.hidden = any || S.view !== "plano" || !p.lotes.length;
      if (S.view === "lista") renderList();
      rover();
      updateSummary();
    }
    function updateSummary() {
      var p = P();
      var all = p.lotes.length, disp = disponibles(p).length, act = filtersActive();
      if (!act) summary.textContent = disp + " de " + all + " lotes disponibles · desde " + clp(desde(p));
      else {
        var hits = p.lotes.filter(passes), dh = hits.filter(function (l) { return l.estado === "disponible"; }).length;
        var tope = S.max < Infinity ? " hasta " + clp(S.max) : "";
        summary.textContent = S.est.disponible
          ? (!dh ? "Ningún lote disponible con estos filtros"
            : dh === disp ? "Mostrando " + (disp === 1 ? "el lote disponible" : "los " + disp + " lotes disponibles")
            : dh + (dh === 1 ? " lote disponible" : " lotes disponibles") + tope + " · de " + disp)
          : hits.length + (hits.length === 1 ? " lote" : " lotes") + " con estos filtros";
      }
      if (clearBtn) clearBtn.hidden = !act;
      if (othersEl) {
        var otros = S.otros.filter(function (o) { return o.id !== S.id; });
        othersEl.hidden = !S.nota && !otros.length;
        othersEl.innerHTML = S.nota ? esc(S.nota) : (otros.length ? "También en tu presupuesto:" + otros.map(function (o) {
          return ' <button type="button" data-other="' + o.id + '">' + o.n + " en " + esc(o.nombre) + " →</button>";
        }).join("") : "");
      }
      var n = (S.max < Infinity ? 1 : 0) + (S.sector ? 1 : 0) + (["disponible", "reservada", "vendida"].filter(function (k) { return !S.est[k]; }).length ? 1 : 0);
      if (fCount) fCount.textContent = n ? " · " + n : "";
      var dds = $$("dd", pStats);
      if (dds[0]) dds[0].textContent = disp;
      if (dds[1]) dds[1].textContent = clp(desde(p));
    }
    function syncPrice() {
      var i = prices.length;
      if (S.max < Infinity) {
        i = -1;
        for (var k = 0; k < prices.length; k++) if (prices[k] <= S.max) i = k;
        i = Math.max(i, 0);
        S.max = prices[i];
      }
      price.max = prices.length;
      price.value = i;
      priceOut.textContent = i >= prices.length ? "Sin tope" : "Hasta " + clp(prices[i]);
      price.setAttribute("aria-valuetext", priceOut.textContent);
      paintRange(price);
    }
    function clearFilters() {
      S.nota = ""; S.otros = [];
      S.est = { disponible: true, reservada: true, vendida: true };
      checks.forEach(function (c) { c.checked = true; });
      S.max = Infinity; S.sector = "";
      syncPrice();
      applyFilters();
    }

    /* ---- Teclado: una sola parada de Tab en el plano y flechas que siguen el mapa ---- */
    function rover(n) {
      var p = P(), target = null;
      if (n != null && shapes[n]) target = n;
      else if (S.sel != null && shapes[S.sel] && passes(lotOf(p, S.sel))) target = S.sel;
      else {
        var cands = p.lotes.filter(function (l) { return passes(l) && shapes[l.n]; });
        var av = cands.filter(function (l) { return l.estado === "disponible"; }).sort(function (a, b) { return a.precio - b.precio; });
        target = (av[0] || cands[0] || {}).n;
      }
      Object.keys(shapes).forEach(function (k) { shapes[k].path.setAttribute("tabindex", +k === target ? "0" : "-1"); });
      return target;
    }
    function spatialNext(n, key) {
      var o = pt(n);
      if (!o) return null;
      var dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[key];
      var best = null;
      P().lotes.forEach(function (l) {
        if (l.n === n || !passes(l)) return;
        var q = pt(l.n);
        if (!q) return;
        var vx = q[0] - o[0], vy = q[1] - o[1];
        var along = vx * dir[0] + vy * dir[1], perp = Math.abs(vx * dir[1] - vy * dir[0]);
        if (along <= 0 || perp > along * 1.6) return;
        var score = along + perp * 2.2;
        if (!best || score < best.s) best = { n: l.n, s: score };
      });
      return best && best.n;
    }

    /* ---- Panel de detalle ---- */
    function shortlistHtml(p) {
      var av = disponibles(p).slice().sort(function (a, b) { return a.precio - b.precio || a.n - b.n; }).slice(0, root.classList.contains("is-wide") && desktop.matches ? 3 : 6);
      if (!av.length) return "";
      return '<p class="lot-short-title">Disponibles desde el menor precio</p><div class="lot-short-list">' + av.map(function (l) {
        var c = (p.categorias || {})[l.cat];
        return '<button type="button" class="lot-pick" data-pick="' + l.n + '"><i class="sw" style="--c:' + (c ? c.color : "#C8A165") + '" aria-hidden="true"></i><span>Lote ' + l.n + "</span><b>" + clp(l.precio) + "</b></button>";
      }).join("") + "</div>";
    }
    function alternatives(l, k) {
      var o = pt(l.n);
      return disponibles(P()).map(function (x) {
        var q = pt(x.n);
        return { l: x, dist: o && q ? Math.hypot(q[0] - o[0], q[1] - o[1]) : Math.abs(x.n - l.n) * 40 };
      }).sort(function (a, b) { return a.dist - b.dist; }).slice(0, k || 3).map(function (a) { return a.l; });
    }
    function resetPanel() {
      S.sel = null;
      pDetail.hidden = true;
      pEmpty.hidden = false;
      if (ring) ring.style.display = "none";
      if (pShort) pShort.innerHTML = shortlistHtml(P());
      closeSheet(true);
    }
    function fillPanel(p, l) {
      var sold = l.estado === "vendida";
      pEmpty.hidden = true;
      pDetail.hidden = false;
      d.project.textContent = p.nombre + " · " + p.region;
      d.title.textContent = "Lote " + l.n;
      d.status.textContent = ESTADO[l.estado];
      d.status.setAttribute("data-estado", l.estado);
      d.sector.innerHTML = sold ? "Este lote ya tiene dueño. Estos están disponibles cerca:" : (l.lista ? "Precio anterior <s>" + clp(l.lista) + "</s>" : "Precio de venta");
      d.price.hidden = sold;
      d.price.textContent = sold ? "" : clp(l.precio);
      if (d.facts) d.facts.hidden = sold;
      d.m2.textContent = m2(l.m2);
      if (d.reserva) d.reserva.textContent = clp(RESERVA);
      if (d.pago) { d.pago.hidden = sold; if (!sold) pagar(p, l); }
      d.m2price.textContent = l.precio ? clp(l.precio / l.m2) : "—";
      pDetail.classList.toggle("is-closed", l.estado !== "disponible");
      pDetail.classList.toggle("is-sold", sold);
      d.reserve.hidden = sold;
      if (l.estado === "disponible") d.reserve.textContent = "Reservar este lote";
      else if (l.estado === "reservada") d.reserve.textContent = "Avísame si se libera";
      d.reserve.setAttribute("href", "#visita");
      if (d.alts) {
        d.alts.hidden = !sold;
        d.alts.innerHTML = sold ? alternatives(l, 3).map(function (x) {
          var c = (p.categorias || {})[x.cat];
          return '<button type="button" class="lot-pick" data-pick="' + x.n + '"><i class="sw" style="--c:' + (c ? c.color : "#C8A165") + '" aria-hidden="true"></i><span>Lote ' + x.n + "</span><b>" + clp(x.precio) + "</b></button>";
        }).join("") : "";
      }
      $("span", d.wa).textContent = sold ? "Consultar por lotes similares" : "Consultar";
      d.wa.href = waHref(sold
        ? "Hola Fundos, vi que el lote " + l.n + " de " + p.nombre + " está vendido. ¿Me recomiendan uno similar?"
        : "Hola Fundos, me interesa el lote " + l.n + " de " + p.nombre + " (" + m2(l.m2) + ", " + clp(l.precio) + "). ¿Me pueden dar más información?" + lotLink(p, l));
      d.fav.hidden = sold;
      if (d.casa) d.casa.hidden = sold;
      if (typeof updGuia === "function") updGuia();
      if (d.toast) d.toast.hidden = true;
      syncFavButton();
    }
    function syncFavButton() {
      if (S.sel == null) return;
      var on = isFav(S.id, S.sel);
      d.fav.setAttribute("aria-pressed", on ? "true" : "false");
      var span = $("span", d.fav);
      if (span) span.textContent = on ? "Guardado" : "Guardar";
    }
    var medido = "";
    function select(n, opts) {
      opts = opts || {};
      var p = P(), l = lotOf(p, n);
      if (!l) return;
      if (medido !== p.id + n) { medido = p.id + n; medir("ver_lote", { proyecto: p.nombre, lote: String(n), estado: l.estado }); }
      S.sel = n;
      $$(".lot.is-active", canvas).forEach(function (el) { el.classList.remove("is-active"); el.removeAttribute("aria-current"); });
      $$(".pin.is-active", canvas).forEach(function (el) { el.classList.remove("is-active"); });
      var sh = shapes[n];
      if (sh && ring) {
        sh.path.classList.add("is-active");
        sh.path.setAttribute("aria-current", "true");
        if (sh.pin) sh.pin.classList.add("is-active");
        ring.setAttribute("d", sh.path.getAttribute("d"));
        ring.style.display = "";
      }
      $$("tr.is-active", list).forEach(function (tr) { tr.classList.remove("is-active"); });
      var row = $('tr[data-n="' + n + '"]', list);
      if (row) row.classList.add("is-active");
      fillPanel(p, l);
      rover(n);
      hideHint();
      announce("Lote " + l.n + ", " + ESTADO[l.estado].toLowerCase() + (l.estado !== "vendida" ? ", " + clp(l.precio) : ""));
      if (opts.hash !== false) {
        try { history.replaceState(null, "", "#lote-" + p.id + "-" + n); } catch (e) { /* marco sin historial */ }
      }
      if (!desktop.matches && opts.sheet !== false) openSheet(n);
      else {
        reveal(n);
        if (root.classList.contains("is-wide")) showWidePanel();
      }
    }
    function showWidePanel() {
      var r = panel.getBoundingClientRect(), bar = $(".mbar"), bh = bar && bar.classList.contains("is-visible") ? bar.offsetHeight : 0;
      var need = r.top + Math.min(r.height, 280) - (window.innerHeight - bh - 16);   // título, precio y botones
      if (need > 0) window.scrollBy({ top: need, behavior: reduced ? "auto" : "smooth" });
    }

    /* ---- Hoja inferior (móvil): vista compacta, fondo, bloqueo de scroll, foco y deslizar para cerrar ---- */
    function sheetMode() { return !desktop.matches; }
    function keepVisible(n) {
      // El lote queda a la vista entre la barra superior y la hoja
      var sh = shapes[n];
      if (!sh || !panel.classList.contains("is-open")) return;
      var el = sh.pin || sh.path, r = el.getBoundingClientRect();
      var top = navBottom() + 12, bottom = window.innerHeight - panel.offsetHeight - 12;
      if (bottom - top < 40) return;
      var mid = r.top + r.height / 2;
      if (mid < top || mid > bottom) window.scrollBy({ top: mid - (top + bottom) / 2, behavior: reduced ? "auto" : "smooth" });
    }
    function openSheet(n) {
      tip.hidden = true;
      var was = panel.classList.contains("is-open");
      panel.classList.add("is-open");
      panel.classList.remove("is-expanded");
      if (grab) grab.setAttribute("aria-expanded", "false");
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-labelledby", "lot-title");
      if (backdrop) backdrop.hidden = false;
      document.body.classList.add("sheet-open");
      document.documentElement.classList.add("sheet-lock");
      document.dispatchEvent(new CustomEvent("fundos:sheet"));
      reveal(n, function () { window.setTimeout(function () { keepVisible(n); }, was ? 0 : 380); });
      if (!was) window.setTimeout(function () { if (d.close) d.close.focus({ preventScroll: true }); }, 80);
    }
    function closeSheet(silent) {
      if (!panel.classList.contains("is-open")) return;
      panel.classList.remove("is-open", "is-expanded");
      panel.style.transform = "";
      panel.setAttribute("role", "region");
      panel.removeAttribute("aria-modal");
      panel.removeAttribute("aria-labelledby");
      if (backdrop) backdrop.hidden = true;
      document.body.classList.remove("sheet-open");
      document.documentElement.classList.remove("sheet-lock");
      document.dispatchEvent(new CustomEvent("fundos:sheet"));
      var sh = shapes[S.sel];
      if (!silent && sh && document.activeElement && panel.contains(document.activeElement)) sh.path.focus({ preventScroll: true });
    }
    function expandSheet(on) {
      panel.classList.toggle("is-expanded", on);
      if (grab) grab.setAttribute("aria-expanded", on ? "true" : "false");
    }
    if (backdrop) backdrop.addEventListener("click", function () { closeSheet(); });
    if (grab) {
      grab.addEventListener("click", function () { if (!grabMoved) expandSheet(!panel.classList.contains("is-expanded")); });
      var gy = null, gdy = 0, grabMoved = false;
      grab.addEventListener("pointerdown", function (e) { gy = e.clientY; gdy = 0; grabMoved = false; try { grab.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ } });
      grab.addEventListener("pointermove", function (e) {
        if (gy == null) return;
        gdy = e.clientY - gy;
        if (Math.abs(gdy) > 6) grabMoved = true;
        if (gdy > 0) panel.style.transform = "translateY(" + gdy + "px)";
      });
      var gend = function () {
        if (gy == null) return;
        panel.style.transform = "";
        if (gdy > 70) closeSheet();
        else if (gdy < -30) expandSheet(true);
        gy = null;
        window.setTimeout(function () { grabMoved = false; }, 0);
      };
      grab.addEventListener("pointerup", gend);
      grab.addEventListener("pointercancel", gend);
    }
    panel.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !sheetMode() || !panel.classList.contains("is-open")) return;
      var f = $$("a[href], button:not([disabled])", panel).filter(function (el) { return !el.closest("[hidden]") && el.offsetParent !== null; });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });

    /* ---- Favoritos ---- */
    var undoT = 0, undoCopy = null;
    function refreshFavs() {
      Object.keys(shapes).forEach(function (n) { if (shapes[n].pin) shapes[n].pin.classList.toggle("is-fav", isFav(S.id, +n)); });
      if (S.view === "lista") renderList();
      syncFavButton();
      favBox.hidden = favs.length === 0 && !undoCopy;
      if (favMain) favMain.hidden = !favs.length;
      if (!favs.length) return;
      favCount.textContent = favs.length;
      favLabel.textContent = favs.length === 1 ? "lote guardado" : "lotes guardados";
      var lines = [];
      favList.innerHTML = favs.map(function (k) {
        var parts = k.split(":"), p = proyecto(parts[0]), l = p && lotOf(p, +parts[1]);
        if (!l) return "";
        lines.push("• " + p.nombre + ", lote " + l.n + " (" + m2(l.m2) + ", " + precioTxt(l) + ")" + lotLink(p, l));
        return '<button type="button" class="fav-chip" data-fav="' + esc(k) + '">' + esc(p.nombre) + " " + l.n + "</button>";
      }).join("");
      favSend.href = waHref("Hola Fundos, guardé estos lotes y me gustaría recibir más información:\n" + lines.join("\n"));
    }
    function toggleFav(id, n) {
      var k = id + ":" + n, i = favs.indexOf(k), added = i < 0;
      if (!added) favs.splice(i, 1); else favs.push(k);
      saveFavs(favs);
      refreshFavs();
      if (d.toast) {
        d.toast.hidden = !added;
        if (added) d.toast.innerHTML = "Guardado en tus favoritos. <a href=\"#plan-favs\" data-favs-jump>Ver lista (" + favs.length + ")</a>";
      }
      announce(added ? "Lote " + n + " guardado en favoritos" : "Lote " + n + " quitado de favoritos");
    }

    /* ---- Proyecto activo ---- */
    var built = false;
    function setProject(id, opts) {
      opts = opts || {};
      var p = proyecto(id);
      if (!p) return;
      built = true;
      S.id = id;
      if (!opts.keepFilters) {                     // al cambiar de proyecto todos los filtros vuelven a cero
        S.est = { disponible: true, reservada: true, vendida: true };
        S.max = Infinity; S.sector = ""; S.nota = ""; S.otros = [];
      }
      checks.forEach(function (c) { c.checked = !!S.est[c.value]; });
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-tab") === id;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
        if (on) tabpanel.setAttribute("aria-labelledby", t.id);
      });
      if (!p.lotes.length) return;
      if (zoomUi) zoomUi.hidden = S.view !== "plano";
      if (legend) legend.hidden = S.view !== "plano";
      canvas.hidden = S.view !== "plano";
      list.hidden = S.view !== "lista";
      prices = p.lotes.filter(function (l) { return l.estado !== "vendida"; }).map(function (l) { return l.precio; })
        .filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      syncPrice();
      // solo se muestran los estados que existen en este proyecto
      checks.forEach(function (c) { var lbl = c.closest("label"); if (lbl) lbl.hidden = !p.lotes.some(function (l) { return l.estado === c.value; }); });
      renderSvg();
      resetPanel();
      applyFilters();
      refreshFavs();
      showHint();
    }
    function setView(v) {
      S.view = v;
      views.forEach(function (b) { var on = b.getAttribute("data-view") === v; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
      if (!P().lotes.length) return;
      canvas.hidden = v !== "plano";
      list.hidden = v !== "lista";
      if (legend) legend.hidden = v !== "plano";
      if (zoomUi) zoomUi.hidden = v !== "plano";
      if (v === "lista") { renderList(); if (hint) hint.hidden = true; if (empty) empty.hidden = true; }
      else { layoutPlan(!Z.base); applyFilters(); showHint(); }
    }

    /* ---- Eventos ---- */
    tabs.forEach(function (t, i) {
      t.id = t.id || "tab-" + t.getAttribute("data-tab");
      t.setAttribute("aria-controls", "plan-tabpanel");
      var p = proyecto(t.getAttribute("data-tab"));
      if (p && p.lotes.length && !$("small", t)) t.insertAdjacentHTML("beforeend", '<small aria-hidden="true">' + disponibles(p).length + ' disp.</small><span class="sr-only">, ' + disponibles(p).length + " disponibles</span>");
      t.addEventListener("click", function () { switchTo(t.getAttribute("data-tab")); });
      t.addEventListener("keydown", function (e) {
        var nx = null;
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") nx = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        else if (e.key === "Home") nx = tabs[0];
        else if (e.key === "End") nx = tabs[tabs.length - 1];
        if (!nx) return;
        e.preventDefault();
        nx.focus();
        switchTo(nx.getAttribute("data-tab"));
      });
    });
    var switchR = 0;
    function switchTo(id) {
      tabs.forEach(function (x) {
        var on = x.getAttribute("data-tab") === id;
        x.setAttribute("aria-selected", on ? "true" : "false");
        x.setAttribute("tabindex", on ? "0" : "-1");
      });
      canvas.classList.add("is-switching");
      window.cancelAnimationFrame(switchR);
      switchR = window.requestAnimationFrame(function () {
        window.setTimeout(function () { canvas.classList.remove("is-switching"); setProject(id); }, 0);
      });
    }
    var tabpanel = $("[data-tabpanel]", root) || stage;
    tabpanel.id = "plan-tabpanel";
    tabpanel.setAttribute("role", "tabpanel");
    views.forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-view")); }); });
    checks.forEach(function (c) { c.addEventListener("change", function () { S.est[c.value] = c.checked; S.nota = ""; applyFilters(); }); });
    price.addEventListener("input", function () {
      var i = +price.value;
      S.max = i >= prices.length ? Infinity : prices[i];
      priceOut.textContent = i >= prices.length ? "Sin tope" : "Hasta " + clp(prices[i]);
      price.setAttribute("aria-valuetext", priceOut.textContent);
      paintRange(price);
      S.nota = ""; S.otros = [];
      applyFilters();
    });
    if (cats) cats.addEventListener("focusin", function (e) {
      var b = e.target.closest(".pl-cat");
      if (b) b.scrollIntoView({ inline: "nearest", block: "nearest", behavior: reduced ? "auto" : "smooth" });
    });
    if (cats) cats.addEventListener("click", function (e) {
      var b = e.target.closest(".pl-cat");
      if (!b || b.disabled) return;
      var k = b.getAttribute("data-cat");
      S.sector = S.sector === k ? "" : k;
      applyFilters();
      frameMatches();
    });
    price.addEventListener("change", frameMatches);
    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-clear-filters]")) clearFilters();
      var ot = e.target.closest("[data-other]");
      if (ot) setProject(ot.getAttribute("data-other"), { keepFilters: true });
    });
    if (fToggle) fToggle.addEventListener("click", function () {
      var open = fToggle.getAttribute("aria-expanded") !== "true";
      fToggle.setAttribute("aria-expanded", open ? "true" : "false");
      filtersBox.classList.toggle("is-open", open);
    });

    // Plano: clic, teclado y tooltip
    canvas.addEventListener("click", function (e) {
      var el = e.target.closest && e.target.closest(".lot");
      if (el && !el.classList.contains("is-dim")) select(+el.getAttribute("data-n"));
    });
    canvas.addEventListener("keydown", function (e) {
      var el = e.target.closest && e.target.closest(".lot");
      if (!el) return;
      var n = +el.getAttribute("data-n"), nx = null;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(n); return; }
      if (e.key === "+" || e.key === "=" || e.key === "-") {
        e.preventDefault();
        var q = pt(n);
        zoomBy(e.key === "-" ? 1 / 1.6 : 1.6, q && q[0], q && q[1], function () { if (document.activeElement === el) tipAt(el); });
        return;
      }
      if (/^Arrow/.test(e.key)) nx = spatialNext(n, e.key);
      else if (e.key === "Home" || e.key === "End") {
        var av = disponibles(P()).filter(passes).sort(function (a, b) { return a.precio - b.precio; });
        nx = av.length ? (e.key === "Home" ? av[0] : av[av.length - 1]).n : null;
      } else return;
      e.preventDefault();
      if (nx != null && shapes[nx]) { rover(nx); shapes[nx].path.focus({ preventScroll: true }); }
    });
    // Tooltip siempre dentro del plano (se da vuelta arriba/abajo y se corre en los bordes)
    function tipBox() { return tip.parentNode; }   // .plan-view: el tooltip se posiciona respecto de ella
    function placeTip(x, y) {
      var box = tipBox(), sw = box.clientWidth, shh = box.clientHeight, tw = tip.offsetWidth, th = tip.offsetHeight;
      var cx = clamp(x, tw / 2 + 8, sw - tw / 2 - 8), below = y - th - 18 < 8 && y + 20 + th < shh - 8;
      tip.classList.toggle("is-below", below);
      tip.style.left = cx + "px";
      tip.style.top = (below ? y + 20 : y) + "px";
      tip.style.setProperty("--ax", clamp(x - cx, -tw / 2 + 12, tw / 2 - 12) + "px");
    }
    function showTip(el, x, y) {
      var p = P(), l = lotOf(p, +el.getAttribute("data-n"));
      if (!l) return;
      tip.innerHTML = l.estado === "vendida"
        ? "Lote " + l.n + " · Vendido<small>Haz clic y te mostramos alternativas cerca</small>"
        : "Lote " + l.n + " · " + clp(l.precio) + "<small>" + ESTADO[l.estado] + " · " + m2(l.m2) + (l.lista ? " · antes " + clp(l.lista) : "") + "</small>";
      tip.hidden = false;
      placeTip(x, y);
    }
    function tipAt(el) {
      if (!fineHover) return;
      var sh = shapes[el.getAttribute("data-n")], t = (sh && sh.pin) || el;
      var r = t.getBoundingClientRect(), s = tipBox().getBoundingClientRect();
      Z.tipKeep = true;
      showTip(el, r.left + r.width / 2 - s.left, r.top - s.top - 2);
      Z.tipKeep = false;
    }
    canvas.addEventListener("mouseover", function (e) {
      var el = e.target.closest && e.target.closest(".lot");
      if (el && !el.contains(e.relatedTarget) && !drag) tipAt(el);
    });
    canvas.addEventListener("mousemove", function (e) {
      var el = e.target.closest && e.target.closest(".lot");
      if (!el || tip.hidden) return;
      var s = tipBox().getBoundingClientRect();
      placeTip(e.clientX - s.left, e.clientY - s.top);
    });
    canvas.addEventListener("mouseout", function (e) {
      var el = e.target.closest && e.target.closest(".lot");
      if (el && !el.contains(e.relatedTarget)) tip.hidden = true;
    });
    function focusRing(el) {
      $$(".lot-focus", canvas).forEach(function (f) {
        if (el) { f.setAttribute("d", el.getAttribute("d")); f.style.display = ""; } else f.style.display = "none";
      });
    }
    canvas.addEventListener("focusin", function (e) {
      var el = e.target.closest && e.target.closest(".lot");
      if (!el) return;
      var n = +el.getAttribute("data-n");
      if (!el.matches(":focus-visible")) return;     // con mouse o dedo, select() ya lo muestra
      focusRing(el);
      reveal(n, function () { if (document.activeElement === el) { tipAt(el); document.dispatchEvent(new CustomEvent("fundos:focusvisible", { detail: el })); } });
    });
    canvas.addEventListener("focusout", function () { tip.hidden = true; focusRing(null); });

    // Lista
    list.addEventListener("click", function (e) {
      var sb = e.target.closest("[data-sort]");
      if (sb) {
        var k = sb.getAttribute("data-sort");
        S.dir = S.sort === k ? -S.dir : 1;
        S.sort = k;
        renderList();
        var again = $('[data-sort="' + k + '"]', list);
        if (again) again.focus();
        return;
      }
      var tr = e.target.closest("tr[data-n]");
      if (tr) select(+tr.getAttribute("data-n"));
    });

    // Panel
    panel.addEventListener("click", function (e) {
      var pk = e.target.closest("[data-pick]");
      if (pk) {
        var n = +pk.getAttribute("data-pick");
        select(n, { sheet: sheetMode() });
        if (!sheetMode() && shapes[n]) shapes[n].path.focus({ preventScroll: true });
        return;
      }
      var fj = e.target.closest("[data-favs-jump]");
      if (fj) closeSheet(true);
    });
    d.reserve.addEventListener("click", function () {
      var p = P(), l = lotOf(p, S.sel);
      if (!l) return;
      Visit.prefill(l.estado === "disponible"
        ? { proyecto: p.nombre, mensaje: "", reserva: { n: l.n, proyecto: p.nombre, detalle: m2(l.m2) + ", " + precioTxt(l) }, scroll: true }
        : { proyecto: p.nombre, mensaje: "Me interesa el lote " + l.n + " de " + p.nombre + ". Avísenme si se libera.", scroll: true });
      closeSheet(true);
    });
    d.fav.addEventListener("click", function () { if (S.sel != null) toggleFav(S.id, S.sel); });
    /* ---- Cómo pagarlo (cotizador dentro del lote): la reserva de $1.000.000 cubre los gastos de escritura
       y NO se descuenta del precio; al contado se paga la parcela al escriturar, en cuotas un pie y el resto en cuotas ---- */
    var fin = B.financiamiento || {}, PG = { modo: "contado", pie: Math.round((fin.pieMinimo || 0.3) * 100), n: 0 };
    var pg = d.pago && {
      seg: $$("[data-pago]", d.pago), cfg: $("[data-pago-cfg]", d.pago), pie: $("[data-pago-pie]", d.pago), pieO: $("[data-pago-pie-o]", d.pago),
      plazos: $("[data-pago-plazos]", d.pago), dl: $("[data-pago-dl]", d.pago), nota: $("[data-pago-nota]", d.pago), wa: $("[data-pago-wa]", d.pago)
    };
    if (pg) {
      var plz = fin.plazos && fin.plazos.length ? fin.plazos : [12, 24, 36, 48];
      PG.n = plz[Math.min(2, plz.length - 1)];
      pg.pie.min = PG.pie; pg.pie.value = PG.pie;
      pg.plazos.innerHTML = plz.map(function (n) { return '<button type="button" data-plazo="' + n + '" aria-pressed="' + (n === PG.n) + '" aria-label="' + n + ' meses">' + n + " m</button>"; }).join("");
      if (fin.habilitado === false) { var sg = $(".lot-pago-seg", d.pago); if (sg) sg.hidden = true; }   // solo contado
      pg.seg.forEach(function (b) { b.addEventListener("click", function () { PG.modo = b.getAttribute("data-pago"); pagarSel(); }); });
      pg.pie.addEventListener("input", function () { PG.pie = +pg.pie.value; pagarSel(); });
      pg.plazos.addEventListener("click", function (e) { var b = e.target.closest("[data-plazo]"); if (b) { PG.n = +b.getAttribute("data-plazo"); pagarSel(); } });
    }
    function pagarSel() { var l = lotOf(P(), S.sel); if (l) pagar(P(), l); }
    function pagar(p, l) {
      if (!pg || !l.precio) return;
      var cuotas = PG.modo === "cuotas", v = l.precio, rows, msg;
      pg.seg.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-pago") === PG.modo ? "true" : "false"); });
      pg.cfg.hidden = !cuotas;
      $$("[data-plazo]", pg.plazos).forEach(function (b) { b.setAttribute("aria-pressed", +b.getAttribute("data-plazo") === PG.n ? "true" : "false"); });
      pg.pieO.textContent = pct(PG.pie);
      pg.pie.setAttribute("aria-valuetext", pct(PG.pie));
      paintRange(pg.pie);
      var fila = function (t, sub, val, cls) { return '<div' + (cls ? ' class="' + cls + '"' : "") + "><dt>" + t + (sub ? "<small>" + sub + "</small>" : "") + "</dt><dd>" + val + "</dd></div>"; };
      if (!cuotas) {
        rows = fila("Reserva", "incluye notaría y Conservador", clp(RESERVA)) + fila("Al escriturar", "valor de la parcela", clp(v)) + fila("Total", "", clp(v + RESERVA), "is-total");
        pg.nota.textContent = "Sin gastos adicionales de escritura.";
        msg = "Hola Fundos, simulé el lote " + l.n + " de " + p.nombre + " (" + clp(v) + ") al contado: reserva de " + clp(RESERVA) + " con gastos de escritura incluidos. ¿Me pueden asesorar?";
      } else {
        var i = +fin.tasaMensual || 0, pie = v * PG.pie / 100, f = v - pie;
        var cuota = i ? f * i / (1 - Math.pow(1 + i, -PG.n)) : f / PG.n;
        rows = fila("Reserva", "incluye notaría y Conservador", clp(RESERVA)) + fila("Pie al escriturar", pct(PG.pie) + " del valor", clp(pie)) +
          fila(PG.n + " cuotas de", "aprox., tasa " + pct((i * 100).toFixed(1)) + " mensual", clp(cuota), "is-cuota") + fila("Total aprox.", "", clp(RESERVA + pie + cuota * PG.n), "is-total");
        pg.nota.textContent = "Cuota referencial; las condiciones se evalúan caso a caso.";
        msg = "Hola Fundos, simulé el lote " + l.n + " de " + p.nombre + " (" + clp(v) + ") con pie de " + pct(PG.pie) + " y " + PG.n + " cuotas de aprox. " + clp(cuota) + ". ¿Me pueden asesorar?";
      }
      pg.dl.innerHTML = rows;
      pg.wa.href = waHref(msg);
    }
    if (d.casa) d.casa.addEventListener("click", function () {
      var l = lotOf(P(), S.sel);
      if (l) Casa.set(S.id, l.n);
      closeSheet(true);
    });
    if (d.close) d.close.addEventListener("click", function () { closeSheet(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
    desktop.addEventListener && desktop.addEventListener("change", function () {
      closeSheet(true);
      layoutPlan(false);
      if (S.sel != null) reveal(S.sel);
    });
    favList.addEventListener("click", function (e) {
      var b = e.target.closest("[data-fav]");
      if (!b) return;
      var parts = b.getAttribute("data-fav").split(":");
      if (parts[0] !== S.id) setProject(parts[0]);
      if (S.view !== "plano") setView("plano");
      var r = canvas.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top - navBottom() - 12, behavior: reduced ? "auto" : "smooth" });
      window.setTimeout(function () { select(+parts[1]); }, reduced ? 0 : 350);
    });
    favClear.addEventListener("click", function () {
      undoCopy = favs.slice();
      favs = []; saveFavs(favs);
      if (favUndo) favUndo.hidden = false;
      refreshFavs();
      window.clearTimeout(undoT);
      undoT = window.setTimeout(function () { undoCopy = null; if (favUndo) favUndo.hidden = true; refreshFavs(); }, 6000);
    });
    if (favRestore) favRestore.addEventListener("click", function () {
      if (undoCopy) { favs = undoCopy; saveFavs(favs); }
      undoCopy = null;
      window.clearTimeout(undoT);
      if (favUndo) favUndo.hidden = true;
      refreshFavs();
    });

    function landPlan() {
      var y = window.scrollY + root.getBoundingClientRect().top - navBottom() - 8;
      window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
    }
    // Los enlaces a #plano llevan directo a la herramienta (el plano completo queda a la vista)
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented) return;
      var a = e.target.closest && e.target.closest('a[href="#plano"]');
      if (!a) return;
      e.preventDefault();
      landPlan();
    });

    /* ---- API para otros módulos ---- */
    Plan.land = landPlan;
    Plan.show = function (id) { if (id !== S.id || !built) setProject(id); };

    /* ---- Guía "Diseña tu casa": paso 1, elegir un lote en el plano; paso 2, "Diseñar mi casa aquí" ---- */
    var guia = $("[data-plan-guia]"), gBtn = $("[data-d-guia]"), gPaso = $("[data-plan-guia-paso]"), gTxt = $("[data-plan-guia-txt]");
    function updGuia() {
      if (!guia || !gBtn) return;
      var l = S.sel != null ? lotOf(P(), S.sel) : null, ok = S.guia && l && l.estado !== "vendida";
      guia.hidden = !S.guia;
      root.classList.toggle("is-guia", !!S.guia);
      gBtn.hidden = !ok;
      if (d.casa) d.casa.classList.toggle("is-guia", !!ok);
      if (!S.guia) return;
      gPaso.textContent = ok ? "Paso 2 de 2" : "Paso 1 de 2";
      gTxt.textContent = ok ? "Lote " + l.n + " elegido. Toca «Diseñar mi fundo aquí» para ubicar tu casa en 3D."
        : l && l.estado === "vendida" ? "Ese lote está vendido: elige uno disponible para diseñar tu fundo."
        : "Elige tu parcela: toca un lote disponible en el plano.";
    }
    Plan.guia = function (on) { S.guia = !!on; updGuia(); };
    if (gBtn) gBtn.addEventListener("click", function () {
      var l = lotOf(P(), S.sel);
      if (l) Casa.set(S.id, l.n);
      Plan.guia(false);
      closeSheet(true);
    });
    var gx = $("[data-plan-guia-x]");
    if (gx) gx.addEventListener("click", function () { Plan.guia(false); });
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("[data-casa-guia]")) Plan.guia(true);
    }, true);
    Plan.current = function () { return S.id; };
    Plan.apply = function (o) {
      S.est = o.soloDisponibles ? { disponible: true, reservada: false, vendida: false } : { disponible: true, reservada: true, vendida: true };
      S.max = o.max || Infinity;
      S.sector = "";
      S.nota = o.nota || "";
      S.otros = o.otros || [];
      if (S.view !== "plano") setView("plano");
      setProject(o.id || S.id, { keepFilters: true });
      frameMatches();
    };

    // Enlace directo a un lote: #lote-malalcahuello-12 (al cargar y al hacer clic en enlaces internos)
    function fromHash(atLoad) {
      var m = /^#lote-([a-z0-9-]+)-(\d+)$/.exec(location.hash);
      var p = m && proyecto(m[1]);
      if (!p || !p.lotes.length) return false;
      if (p.id !== S.id || atLoad) setProject(p.id);
      if (S.view !== "plano") setView("plano");
      var n = +m[2], ok = !!lotOf(p, n);
      window.setTimeout(function () {
        var r = (ok ? stage : filtersBox || stage).getBoundingClientRect();
        jumpTo(window.scrollY + r.top - navBottom() - 12);
        if (ok) select(n, { hash: false });
        else summary.textContent = "No encontramos el lote " + m[2] + " de " + p.nombre + ". Elige otro en el plano.";
      }, atLoad ? 120 : 0);
      return true;
    }
    window.addEventListener("hashchange", function () { fromHash(false); });
    if (!fromHash(true)) {
      // Sin enlace a un lote, el plano se arma al acercarse a la pantalla o cuando el navegador está libre:
      // la carga inicial no espera por él
      var build = function () { if (!built) setProject(S.id); };
      if ("IntersectionObserver" in window) {
        var bio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { bio.disconnect(); build(); } }, { rootMargin: "1200px 0px" });
        bio.observe(root);
      }
      if ("requestIdleCallback" in window) window.requestIdleCallback(build, { timeout: 3000 });
      else window.setTimeout(build, 1500);
    }
  }


  /* =============================================================
     Formulario de visita → WhatsApp
     ============================================================= */
  function initVisit() {
    var form = $("[data-visit]");
    if (!form) return;
    var ok = $("[data-visit-ok]", form), fb = $("[data-visit-fallback]", form), again = $("[data-visit-again]", form);
    var okMsg = $("[data-visit-msg]", form), okNote = $("[data-visit-note]", form);
    var intentBox = $("[data-visit-intent]", form), reserva = null;
    function setReserva(r) {
      reserva = r;
      if (!intentBox) return;
      intentBox.hidden = !r;
      if (r) $("[data-visit-intent-txt]", intentBox).textContent = "Reserva: lote " + r.n + " de " + r.proyecto + " · " + r.detalle;
    }
    if (intentBox) $("[data-visit-intent-clear]", intentBox).addEventListener("click", function () { setReserva(null); el.nombre.focus(); });
    var el = form.elements;
    if (el.proyecto) el.proyecto.addEventListener("change", function () { if (reserva && el.proyecto.value !== reserva.proyecto) setReserva(null); });
    var today = new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    if (el.fecha) el.fecha.min = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
    // Las visitas a terreno son los fines de semana: si elige un día de semana sin videollamada, se avisa (no bloquea)
    var fNota = $("[data-fecha-nota]", form), fNotaBase = fNota ? fNota.textContent : "";
    function notaFecha() {
      if (!fNota || !el.fecha) return;
      var v = el.fecha.value, video = (form.querySelector('input[name="horario"]:checked') || {}).value === "videollamada";
      var dow = v ? new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)).getDay() : -1;
      var semana = dow >= 1 && dow <= 5, aviso = semana && !video;
      fNota.textContent = aviso ? "Ese día es de semana: las visitas a terreno son sábado o domingo. Elige un fin de semana o una videollamada." : fNotaBase;
      fNota.classList.toggle("is-aviso", aviso);
    }
    if (el.fecha) el.fecha.addEventListener("change", notaFecha);
    $$('input[name="horario"]', form).forEach(function (r) { r.addEventListener("change", notaFecha); });

    // Mensajes de error asociados a cada campo
    $$("[data-error-for]", form).forEach(function (e, i) {
      var key = e.getAttribute("data-error-for");
      var input = document.getElementById(key) || el[key];
      e.id = e.id || "err-" + i;
    });
    if (el.acepto) el.acepto.setAttribute("aria-invalid", "false");

    var rules = {
      nombre: function (v) { return v.trim().length >= 2; },
      telefono: function (v) { var d = v.replace(/\D/g, ""); return d.length >= 8 && d.length <= 15; },
      correo: function (v) { v = v.trim(); return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
      fecha: function (v) { return !v || !el.fecha.min || v >= el.fecha.min; },
      acepto: function (_, input) { return input.checked; }
    };
    function check(name) {
      var input = el[name];
      if (!input) return true;
      var good = rules[name](input.value || "", input);
      var err = $('[data-error-for="' + (input.id || name) + '"]', form);
      if (err) { if (good) input.removeAttribute("aria-describedby"); else input.setAttribute("aria-describedby", err.id); }
      var field = input.closest(".field");
      if (field) field.classList.toggle("has-error", !good);
      if (err) err.classList.toggle("is-shown", !good);
      input.setAttribute("aria-invalid", good ? "false" : "true");
      return good;
    }
    Object.keys(rules).forEach(function (name) {
      var input = el[name];
      if (!input) return;
      input.addEventListener(input.type === "checkbox" ? "change" : "input", function () {
        if (input.getAttribute("aria-invalid") === "true") check(name);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = Object.keys(rules).filter(function (n) { return !check(n); });
      if (bad.length) { el[bad[0]].focus(); return; }
      var fecha = "";
      if (el.fecha.value) {
        var parts = el.fecha.value.split("-");
        var dt = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        try {
          fecha = dt.toLocaleDateString("es-CL", { weekday: "long" }) + " " + dt.toLocaleDateString("es-CL", { day: "numeric", month: "long" });
        } catch (err) { fecha = el.fecha.value; }
      }
      var horario = (form.querySelector('input[name="horario"]:checked') || {}).value || "";
      var proyectoTxt = el.proyecto.value, nada = proyectoTxt === "Aún no lo sé";
      var que = horario === "videollamada"
        ? "Quiero agendar una videollamada para conocer " + (nada ? "sus proyectos" : proyectoTxt)
        : (nada ? "Quiero agendar una visita para conocer sus proyectos" : "Quiero agendar una visita a " + proyectoTxt);
      var cuando = (fecha ? " el " + fecha : "") + (horario === "mañana" ? " en la mañana" : horario === "tarde" ? " en la tarde" : "");
      var res = reserva && reserva.proyecto === proyectoTxt ? reserva : null;
      if (res) {
        // Reserva: el lote va primero; la visita solo si eligió fecha u horario
        que = "Quiero reservar el lote " + res.n + " de " + res.proyecto + " (" + res.detalle + ")";
        cuando = horario === "videollamada" ? " y conversarlo por videollamada" + (fecha ? " el " + fecha : "") : (cuando ? " y visitarlo" + cuando : "");
      }
      if (okNote) okNote.textContent = res ? "Se abrirá WhatsApp con este texto. Un ejecutivo te confirma la reserva y los pasos a seguir." : "Se abrirá WhatsApp con este texto. Un ejecutivo te confirma la visita.";
      var extra = el.mensaje.value.trim();
      if (extra && !/[.!?…]$/.test(extra)) extra += ".";
      var msg = "Hola Fundos, soy " + el.nombre.value.trim() + ". " + que + cuando + "." +
        (extra ? " " + extra : "") +
        " Mi teléfono: " + el.telefono.value.trim() + "." +
        (el.correo && el.correo.value.trim() ? " Mi correo: " + el.correo.value.trim() + "." : "");
      // Se muestra el mensaje y se envía con un enlace real (sin ventanas emergentes)
      // Si se llegó desde la ficha de un asesor, el mensaje va a su WhatsApp
      fb.href = asesor && asesor.whatsapp && el.mensaje.value.indexOf(asesor.nombre) >= 0
        ? "https://wa.me/" + asesor.whatsapp.replace(/\D/g, "") + "?text=" + encodeURIComponent(msg) : waHref(msg);
      if (okMsg) okMsg.textContent = msg;
      enviarLead({
        formulario: res ? "reserva-lote" : horario === "videollamada" ? "videollamada" : "visita",
        nombre: el.nombre.value, telefono: el.telefono.value, email: el.correo ? el.correo.value : "",
        proyecto: nada ? "" : proyectoTxt, lote: res ? "Lote " + res.n + " de " + res.proyecto + " (" + res.detalle + ")" : "",
        fecha: fecha || "", horario: horario, mensaje: el.mensaje.value,
        asesor: asesor && el.mensaje.value.indexOf(asesor.nombre) >= 0 ? asesor.nombre : ""
      }, form);
      ok.hidden = false;
      inertForm(true);
      ok.focus();
    });
    function inertForm(on) { [].forEach.call(form.children, function (ch) { if (ch !== ok) ch.inert = on; }); }
    if (again) again.addEventListener("click", function () { ok.hidden = true; inertForm(false); el.nombre.focus(); });

    var lastAuto = "", asesor = null;
    Visit.prefill = function (o) {
      setReserva(o.reserva || null);
      asesor = o.asesor || null;
      if (o.scroll && !desktop.matches) {
        // En el celular se llega al formulario, no al título de la sección
        window.setTimeout(function () {
          var nb = $(".nav"), top = nb ? Math.max(0, nb.getBoundingClientRect().bottom) : 0;
          window.scrollTo({ top: window.scrollY + form.getBoundingClientRect().top - top - 12, behavior: reduced ? "auto" : "smooth" });
        }, 0);
      }
      if (o.proyecto) {
        var opt = Array.prototype.filter.call(el.proyecto.options, function (x) { return x.value === o.proyecto; })[0];
        if (opt) el.proyecto.value = o.proyecto;
      }
      // Solo se reemplaza el mensaje si está vacío o si lo escribió la página (nunca lo que escribió la persona)
      if ("mensaje" in o && (!el.mensaje.value.trim() || el.mensaje.value === lastAuto)) {
        el.mensaje.value = o.mensaje || "";
        lastAuto = el.mensaje.value;
      }
      ok.hidden = true;
      inertForm(false);
      form.classList.remove("is-prefilled");
      void form.offsetWidth;
      form.classList.add("is-prefilled");
      // Un solo temporizador aunque se precargue varias veces seguidas
      window.clearTimeout(prefillT);
      prefillT = window.setTimeout(function () { form.classList.remove("is-prefilled"); }, 1600);
      // Con mouse, el cursor queda en "Nombre" al terminar el desplazamiento, salvo que la persona ya esté escribiendo
      if (!fineHover) return;
      window.clearTimeout(focusT);
      if (onScrollEnd) window.removeEventListener("scrollend", onScrollEnd);
      onScrollEnd = function () {
        window.removeEventListener("scrollend", onScrollEnd);
        window.clearTimeout(focusT);
        var ae = document.activeElement;
        if (!ae || ae === document.body || !form.contains(ae)) el.nombre.focus({ preventScroll: true });
      };
      if ("onscrollend" in window) window.addEventListener("scrollend", onScrollEnd);
      focusT = window.setTimeout(onScrollEnd, 1600);
    };
    var prefillT = 0, focusT = 0, onScrollEnd = null;
  }

  /* =============================================================
     Formulario de la portada de Puerto Varas: pocos datos, el mensaje se revisa y se envía por WhatsApp
     ============================================================= */
  /* =============================================================
     Trabaja con nosotros: "Vende tu campo" y "Ofrece tus servicios" (proveedores).
     Arman el mensaje con lo escrito, lo muestran y lo envían con un enlace de WhatsApp (igual que #visita).
     ============================================================= */
  function initMiniForms() {
    $$("[data-mini-form]").forEach(function (form) {
      var el = form.elements, ok = $("[data-mini-ok]", form), wa = $("[data-mini-wa]", form), out = $("[data-mini-msg]", form);
      var tipoF = form.getAttribute("data-mini-form");
      var rules = {
        nombre: function (v) { return v.trim().length >= 2; },
        telefono: function (v) { var d = v.replace(/\D/g, ""); return d.length >= 8 && d.length <= 15; },
        correo: function (v) { v = v.trim(); return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
        acepto: function (_, input) { return input.checked; }
      };
      function check(name) {
        var input = el[name];
        if (!input) return true;
        var good = rules[name](input.value || "", input);
        var err = $('[data-error-for="' + (input.id || name) + '"]', form);
        var field = input.closest(".field");
        if (field) field.classList.toggle("has-error", !good);
        if (err) err.classList.toggle("is-shown", !good);
        input.setAttribute("aria-invalid", good ? "false" : "true");
        return good;
      }
      Object.keys(rules).forEach(function (name) {
        var input = el[name];
        if (input) input.addEventListener(input.type === "checkbox" ? "change" : "input", function () { if (input.getAttribute("aria-invalid") === "true") check(name); });
      });
      function datos() {
        return $$("[data-label]", form).map(function (f) {
          var v = (f.value || "").trim();
          return v ? f.getAttribute("data-label") + ": " + v + (f.getAttribute("data-unidad") || "") : "";
        }).filter(Boolean).join(". ");
      }
      function mensaje() {
        var quien = "Hola Fundos, soy " + el.nombre.value.trim() + ". ";
        var intro = tipoF === "campo" ? "Tengo un campo que me interesa vender." : "Quiero ofrecer mis servicios como proveedor para quienes compran parcelas.";
        var d = datos();
        return quien + intro + (d ? " " + d + "." : "") + " Mi teléfono: " + el.telefono.value.trim() + ".";
      }
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var bad = Object.keys(rules).filter(function (n) { return !check(n); });
        if (bad.length) { el[bad[0]].focus(); return; }
        var msg = mensaje();
        out.textContent = msg;
        wa.href = waHref(msg);
        var mail = $("[data-mini-mail]", form);
        if (mail) mail.href = "mailto:" + (B.contacto && B.contacto.email || "ventas@fundosinmobiliaria.com") + "?subject=" + encodeURIComponent(tipoF === "campo" ? "Quiero vender mi campo" : "Proveedor de servicios") + "&body=" + encodeURIComponent(msg);
        ok.hidden = false;
        [].forEach.call(form.children, function (ch) { if (ch !== ok) ch.inert = true; });
        ok.focus();
      });
      $("[data-mini-again]", form).addEventListener("click", function () {
        ok.hidden = true;
        [].forEach.call(form.children, function (ch) { ch.inert = false; });
        el.nombre.focus();
      });
    });
  }
  /* Más proyectos ("Fundos de …", sin plano ni recorrido): cada tarjeta parte con un emblema en el estilo de los logos de
     los proyectos (pedido del cliente): escena en línea propia con arco de sol dorado, "FUNDOS DE", el nombre en mayúsculas
     espaciadas, adorno y lema. Sin datos en el manifiesto (masProyectos), la sección no se ve */
  var EMB = (function () {
  var T = "#2E3A2C", G = "#C8A165";
    function L(d, w, c) { return '<path d="' + d + '" fill="none" stroke="' + (c || T) + '" stroke-width="' + (w || 1.3) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
    function F(d, c) { return '<path d="' + d + '" fill="' + (c || T) + '"/>'; }
    function sol(cx, cy, r) { return L("M" + (cx - r) + " " + cy + "a" + r + " " + r + " 0 0 1 " + 2 * r + " 0", 1.4, G); }
    // Conífera de capas (como en los logos)
    function pino(x, y, h) {
      var w = h * 0.36, s = L("M" + x + " " + y + "v-" + (h * 0.2), 1.1);
      for (var k = 0; k < 4; k++) {
        var yb = y - h * 0.18 - k * h * 0.2, ww = w * (1 - k * 0.2);
        s += F("M" + (x - ww) + " " + yb + "L" + x + " " + (yb - h * 0.32) + "L" + (x + ww) + " " + yb + "Z");
      }
      return s;
    }
    function cipres(x, y, h) { var w = h * 0.12; return F("M" + x + " " + (y - h) + "C" + (x + w * 1.6) + " " + (y - h * 0.6) + " " + (x + w * 1.4) + " " + (y - h * 0.15) + " " + x + " " + y + "C" + (x - w * 1.4) + " " + (y - h * 0.15) + " " + (x - w * 1.6) + " " + (y - h * 0.6) + " " + x + " " + (y - h) + "Z"); }
    function copa(x, y, h) {   // árbol de copa redonda (hojas en racimos)
      var r = h * 0.22, s = L("M" + x + " " + y + "V" + (y - h * 0.55) + "M" + x + " " + (y - h * 0.4) + "l-" + r * 0.6 + " -" + r * 0.6 + "M" + x + " " + (y - h * 0.45) + "l" + r * 0.7 + " -" + r * 0.5, 1.4);
      [[0, -0.78, 1], [-0.75, -0.62, 0.8], [0.75, -0.62, 0.85], [-0.35, -0.95, 0.75], [0.4, -0.95, 0.75]].forEach(function (c) { s += '<circle cx="' + (x + c[0] * r * 1.2) + '" cy="' + (y + c[1] * h) + '" r="' + r * c[2] * 0.62 + '" fill="' + T + '"/>'; });
      return s;
    }
    function ave(x, y, s) { s = s || 1; return L("M" + x + " " + y + "q" + 2.5 * s + " -2.5 " + 5 * s + " 0q" + 2.5 * s + " -2.5 " + 5 * s + " 0", 0.9); }
    function olas(x, y, w, n) { var d = ""; for (var k = 0; k < (n || 3); k++) d += "M" + (x + k * 6) + " " + (y + k * 5) + "q" + w / 4 + " -3 " + w / 2 + " 0t" + w / 2 + " 0"; return L(d, 1); }
    function juncos(x, y) { return L("M" + x + " " + y + "q-1 -8 -4 -13M" + (x + 2) + " " + y + "q0 -9 2 -15M" + (x + 4) + " " + y + "q2 -7 6 -11M" + (x - 2) + " " + y + "q-3 -5 -8 -7", 1); }
    // Fronda de helecho: tallo curvo con hojitas a ambos lados (dir: −1 izquierda, 1 derecha, magnitud = apertura)
    function helecho(x, y, dir) {
      var ex = x + dir * 26, ey = y - 30 + Math.abs(dir) * 6, cx = x + dir * 4, cy = y - 30, d = "M" + x + " " + y + "Q" + cx + " " + cy + " " + ex + " " + ey;
      var hj = "";
      for (var k = 1; k < 9; k++) {
        var t = k / 9, px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex, py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey;
        var tx = 2 * (1 - t) * (cx - x) + 2 * t * (ex - cx), ty = 2 * (1 - t) * (cy - y) + 2 * t * (ey - cy), l = Math.hypot(tx, ty), nx = -ty / l, ny = tx / l, len = 6 * (1 - t * 0.7);
        hj += "M" + px.toFixed(1) + " " + py.toFixed(1) + "l" + (nx * len + tx / l * 2).toFixed(1) + " " + (ny * len + ty / l * 2).toFixed(1);
        hj += "M" + px.toFixed(1) + " " + py.toFixed(1) + "l" + (-nx * len + tx / l * 2).toFixed(1) + " " + (-ny * len + ty / l * 2).toFixed(1);
      }
      return L(d, 1.2) + L(hj, 1.1);
    }
    function suelo(y) { return L("M30 " + y + "c40 -3 70 -4 90 -4s50 1 90 4", 1.2); }
    var E = {
      "santo-domingo": function () {
        var s = sol(120, 92, 46);
        s += L("M84 100V60h18v40M138 100V60h18v40", 1.3);   // pilares de piedra
        for (var y = 66; y < 100; y += 7) s += L("M84 " + y + "h18M138 " + y + "h18", 0.7);
        s += L("M92 60v7M146 60v7M88 73v7M150 73v7M94 87v7M144 87v7", 0.7);
        s += F("M104 66h32v32h-32z", "#2E3A2C") ;
        for (var x = 108; x < 136; x += 4.5) s += L("M" + x + " 68v28", 0.9, "#F6F2EA");
        s += L("M104 82h32", 0.9, "#F6F2EA");
        s += L("M152 98c2-14 8-26 20-36", 1.1);   // rama de olivo junto al pilar
        [[156, 86, -60], [160, 78, 30], [162, 74, -50], [166, 68, 20], [169, 64, -40], [172, 61, 10], [154, 92, 40]].forEach(function (h) { s += '<ellipse cx="' + h[0] + '" cy="' + h[1] + '" rx="4.2" ry="1.6" transform="rotate(' + h[2] + " " + h[0] + " " + h[1] + ')" fill="' + T + '"/>'; });
        return s + L("M60 100h120", 1.2);
      },
      "lago-rapel": function () {
        var s = sol(122, 86, 40);
        s += L("M40 88c22-4 40-14 58-10s30 8 50 2 40-4 54 2", 1.1);
        s += L("M36 92h168", 1.2) + L("M60 98h40M120 98h60M84 104h70", 0.9);
        s += pino(56, 92, 30) + pino(66, 92, 20);
        s += F("M168 88l9-24v24z") + L("M164 88h20l-3 4h-14z", 1) + L("M177 62v28", 0.9);
        return s + ave(150, 52) + ave(162, 46, 0.8);
      },
      "bucalemu": function () {
        var s = sol(126, 86, 40);
        s += L("M30 92c10-1 18-6 24-16 4 4 10 10 18 16", 1.2) + L("M30 92h180", 1.2);
        s += olas(70, 99, 40, 3) + olas(140, 98, 36, 2);
        s += copa(160, 92, 46) + copa(182, 92, 34);
        return s + ave(96, 50) + ave(106, 44, 0.8);
      },
      "talca": function () {
        var s = sol(120, 84, 38);
        s += L("M40 86l30-16 18 8 26-18 30 20 20-10 36 16", 1.1);
        s += L("M30 96h180", 1.2);
        s += L("M112 96V66h12v30M114 66l4-10 4 10M116 56v-6M114 52h4", 1.2);   // torre de iglesia
        s += L("M112 76h12M115 70h6v4h-6z", 0.8);
        [[70, 96, 10], [82, 96, 14], [96, 96, 8], [134, 96, 12], [148, 96, 9], [160, 96, 13]].forEach(function (b) { s += L("M" + b[0] + " " + b[1] + "v-" + b[2] + "h9v" + b[2], 1); });
        s += L("M60 96v-12M56 86c2-4 6-4 8 0M54 90c3-5 9-5 12 0", 1.1);   // palmera
        return s + L("M150 104c10-3 20-3 30 0M176 104c6-4 14-4 20 0", 0.9);
      },
      "retiro": function () {
        var s = sol(126, 76, 40);
        s += L("M40 84c40-4 100-8 170-2", 1.2);
        for (var k = 0; k < 5; k++) s += L("M" + (112 + k * 8) + " " + (86 + k * 4) + "c25 -2 55 -3 92 -1", 0.9);
        s += L("M76 84c-14 4 6 10-8 16s-30 6-24 12", 1.1) + L("M86 84c-14 4 6 10-8 16s-30 6-24 12", 0.9);
        s += cipres(74, 80, 30) + cipres(82, 80, 34) + cipres(90, 80, 28);
        s += F("M160 64h10v6h-10zM164 60h5v4h-5z") + '<circle cx="161" cy="72" r="3" fill="' + T + '"/><circle cx="170" cy="72" r="2" fill="' + T + '"/>';
        return s + juncos(52, 110);
      },
      "san-fabian": function () {
        var s = sol(118, 84, 40);
        s += L("M40 88l34-26 18 12 24-20 30 24 22-12 32 22", 1.1);
        s += L("M100 54l8 6 6-4", 0.9);
        s += L("M30 92c50-6 120-6 180 0", 1.2) + L("M60 100c40-4 80-4 120 0", 0.9);
        return s + copa(160, 90, 44) + pino(64, 90, 24);
      },
      "cobquecura": function () {
        var s = sol(126, 84, 40);
        s += L("M40 86c14-2 20-10 30-18 6 8 14 14 26 18", 1.2) + pino(52, 82, 16) + pino(60, 82, 12);
        s += L("M30 90h180", 1.2) + olas(96, 98, 44, 3);
        s += L("M168 90c2-6 6-8 10-8s8 4 10 8", 1) + L("M184 92c1-4 4-5 6-5s5 3 6 5", 0.9);   // roquerío
        return s + ave(150, 50) + ave(162, 44, 0.8) + ave(140, 58, 0.7);
      },
      "rio-liucura": function () {
        var s = sol(118, 80, 42);
        s += L("M40 86l30-24 16 10 24-22 34 30 20-12 36 20", 1.1);
        s += L("M30 88c40-3 80-3 180 0", 1.2);
        s += L("M100 112c-10-6 30-10 14-18s24-6 16-10", 1.1) + L("M112 112c-8-6 30-10 14-18s22-6 14-10", 0.9);
        s += cipres(156, 86, 40) + cipres(166, 86, 46) + cipres(176, 86, 38);
        return s + ave(70, 42) ;
      },
      "rio-negro": function () {
        var s = sol(122, 80, 40);
        s += L("M60 82l30-20 22 12 26-16 40 24", 1.1);
        s += L("M30 88h180", 1.2) + L("M60 96h50M130 98h60", 0.9);
        s += pino(48, 86, 26) + pino(58, 86, 18);
        s += F("M140 96h28l-4 5h-20z") + '<circle cx="154" cy="82" r="2.6" fill="' + T + '"/>' + F("M151 86h6v10h-6z");
        s += L("M157 87l14-18q14 4 20 22", 0.8);   // caña y sedal
        return s + juncos(76, 104) + juncos(84, 104);
      },
      // Los tres con plano, dibujados a partir de los logos del cliente (araucaria y volcán; casa de campo con ciprés y viñas)
      "malalcahuello": function () {
        var s = sol(120, 92, 46);
        s += L("M118 96l26-38 5 3 5-4 5 3 22 36", 1.2);   // volcán
        s += F("M139 66l5-8 5 3 5-4 5 3 4 6-5-2-4 3-5-3-5 3z");
        s += L("M86 98V44", 1.6);   // araucaria: tronco alto y copa en paraguas
        s += F("M64 48q22-14 44 0q-22-5-44 0z") + F("M70 56q16-10 32 0q-16-4-32 0z") + F("M76 63q10-7 20 0q-10-3-20 0z");
        s += L("M86 48l-16 8M86 48l16 8M86 56l-12 7M86 56l12 7", 0.9);
        s += pino(150, 98, 18) + pino(160, 98, 22) + pino(170, 98, 16);
        s += L("M40 98h160", 1.2) + L("M104 104c14-3 26 2 40 0s20-4 34-2", 1) + L("M120 109c10-2 18 1 28 0", 0.9);   // río
        return s + ave(56, 40) + ave(66, 35, 0.8);
      },
      "marchigue": function () {
        var s = sol(120, 84, 42);
        s += L("M30 92c30-10 60-12 90-8s60 6 90 0", 1.2);   // loma
        s += L("M44 100c24-6 52-7 76-4M60 106c22-4 44-4 64-2M128 98c22 1 44-1 66-6M140 104c18 0 34-2 50-6", 0.9);   // hileras de viña
        s += L("M100 84V70h30v14", 1.2) + L("M96 71l19-12 19 12", 1.3) + L("M112 84v-8h6v8M104 74h5v4h-5zM121 74h5v4h-5z", 0.9);   // casa de campo
        s += cipres(84, 86, 40);
        s += copa(150, 86, 26);
        return s + ave(160, 48) + ave(170, 43, 0.8);
      },
      "puerto-varas": function () {
        var s = sol(120, 90, 46);
        s += L("M54 88l22-22 4 2 4-3 18 23", 1.1);   // Calbuco (al fondo, a la izquierda)
        s += L("M100 88l30-40 4 2 4-2 4 2 30 38", 1.3);   // Osorno, cono perfecto
        s += F("M124 56l6-8 4 2 4-2 4 2 6 8-5-2-4 3-5-3-5 3-5-3z");
        s += L("M36 92h168", 1.2) + L("M60 97h36M140 97h44M96 101h50", 0.9);   // lago
        s += L("M36 106h168", 1.1);   // campo plano con cerco
        for (var x = 44; x <= 196; x += 19) s += L("M" + x + " 106v-6", 1);
        s += L("M44 102h152", 0.7);
        return s + ave(160, 44) + ave(170, 39, 0.8);
      },
      "puerto-montt": function () {
        var s = L("M74 84a46 46 0 0 1 92 0", 1.3, T);
        s += L("M46 96h60M140 96h56", 1.1);
        s += pino(122, 96, 60);
        s += helecho(108, 96, -1) + helecho(136, 96, 1) + helecho(114, 96, -0.55) + helecho(130, 96, 0.55);
        return s;
      }
    };
    return function (id) { return '<svg class="emb-dib" viewBox="0 0 240 120" aria-hidden="true" focusable="false">' + (E[id] ? E[id]() : "") + "</svg>"; };
  })();
  var EMB_ORN = '<svg class="emb-o" viewBox="0 0 80 10" aria-hidden="true" focusable="false"><path d="M0 5h30M50 5h30" stroke="#C8A165" stroke-width=".8"/><path d="M34 6c2-3 4-4 6-4M40 6c2-3 4-4 6-4M37 7c1-2 3-3 3-5" fill="none" stroke="#C8A165" stroke-width=".9" stroke-linecap="round"/></svg>';
  function mpCard(h) {
    var msg = "Hola Fundos, quiero información del proyecto " + h.nombre + (h.zona ? " (" + h.zona + ")" : "") + ".";
    var m = /^(Fundos de)\s+(.+)$/.exec(h.nombre || "");
    return '<li class="mp-card" id="mp-' + esc(h.id) + '">' +
      '<div class="mp-emb">' + EMB(h.id) + '<p class="emb-pre" aria-hidden="true">Fundos de</p><h3 class="emb-n"><span class="sr-only">Fundos de </span>' + esc(m ? m[2] : h.nombre) + "</h3>" + EMB_ORN +
      (h.lema ? '<p class="emb-l">' + esc(h.lema) + "</p>" : "") + "</div>" +
      '<div class="mp-body">' + (h.estado ? '<span class="mp-estado">' + esc(h.estado) + "</span>" : "") +
      '<p class="mp-k"><svg class="i" aria-hidden="true"><use href="#i-pin"/></svg>' + esc([h.zona, h.region].filter(Boolean).join(", ")) + "</p>" +
      (h.descripcion ? "<p>" + esc(h.descripcion) + "</p>" : "") +
      (h.datos && h.datos.length ? '<ul class="mp-datos">' + h.datos.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul>" : "") +
      '<a class="mp-cta" href="' + esc(waHref(msg)) + '" target="_blank" rel="noopener"><svg class="i" aria-hidden="true"><use href="#i-whatsapp"/></svg>Quiero información<svg class="i i-go" aria-hidden="true"><use href="#i-arrow"/></svg></a></div></li>';
  }
  function initMasProyectos() {
    var sec = $("[data-mas-proyectos]"), list = sec && $("[data-mp-list]", sec), hs = B.masProyectos || [];
    if (!sec || !list || !hs.length) return;
    sec.hidden = false;
    $$("[data-mp-link]").forEach(function (a) { a.hidden = false; });
    var conMapa = false;
    safe(function () { conMapa = initMapaChile(sec, hs); }, "initMapaChile");
    if (!conMapa) list.innerHTML = hs.map(mpCard).join("");
    list.hidden = conMapa;
  }
  /* Fundos en todo Chile (la pestaña Proyectos; ganó la opción vertical en la votación del equipo, oct-2026): a la
     izquierda un mapa largo y fijo de Chile con un punto y un rótulo por fundo a los costados (latitudes cada 2°), que se
     estira hasta el alto de la galería; a la derecha la galería de norte a sur agrupada por región. Tocar un fundo (en la
     galería o en el mapa) abre su ficha en una ventana sobre la página, con flechas para pasar al anterior o siguiente. */
  function initMapaChile(sec, hs) {
    var M = B.mapaChile, box = $("[data-mch]", sec);
    if (!M || !box) return false;
    var zo = $("[data-mch-mapa]", box), row = $("[data-mch-list]", box), ficha = $("[data-mch-ficha]", sec), pr = M.proy;
    if (!zo || !row || !ficha) return false;
    function xy(lat, lon) { return [(lon - pr.lon0) * pr.c * pr.k, (-lat - pr.lat0) * pr.k]; }
    function dentro(p, ring) {
      var c = false;
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var a = ring[i], b = ring[j];
        if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
      }
      return c;
    }
    function region(p) {
      var best = null, dmin = Infinity;
      M.regiones.forEach(function (r) {
        r.anillos.forEach(function (ring) {
          if (dmin < 0) return;
          if (dentro(p, ring)) { best = r; dmin = -1; return; }
          ring.forEach(function (q) { var d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < dmin) { dmin = d; best = r; } });   // en la costa, la más cercana
        });
      });
      return best;
    }
    var pts = [];
    proyectos.forEach(function (p) {
      var m = /query=(-?[\d.]+),(-?[\d.]+)/.exec(p.mapa || "");
      if (m && p.lotes && p.lotes.length) pts.push({ id: p.id, corto: p.nombre, nombre: "Fundos de " + p.nombre, lat: +m[1], lon: +m[2], main: true, p: p });
    });
    hs.forEach(function (h) { if (h.lat && h.lon) pts.push({ id: h.id, corto: h.nombre.replace(/^Fundos de /, ""), nombre: h.nombre, lat: h.lat, lon: h.lon, h: h }); });
    pts.forEach(function (p) { p.xy = xy(p.lat, p.lon); p.reg = region(p.xy); });
    pts = pts.filter(function (p) { return p.reg; }).sort(function (a, b) { return b.lat - a.lat; });
    if (!pts.length) return false;
    var cods = pts.map(function (p) { return p.reg.cod; });
    function porId(id) { return pts.filter(function (q) { return q.id === id; })[0]; }
    function ringD(ring) { return "M" + ring.map(function (q) { return q[0] + " " + q[1]; }).join("L") + "Z"; }
    function lat(p) { return Math.abs(p.lat).toFixed(1).replace(".", ",") + "°S"; }
    function rn(p) { return { 7: "Región del Maule", 8: "Región del Biobío", 13: "Región Metropolitana" }[p.reg.cod] || "Región de " + p.reg.nombre; }
    function datosP(p) { var d = disponibles(p.p), desde = d.length ? Math.min.apply(null, d.map(function (l) { return l.precio || Infinity; })) : 0; return { n: d.length, desde: isFinite(desde) ? desde : 0 }; }
    var regs = M.regiones.map(function (r) { return '<path class="mch-reg' + (cods.indexOf(r.cod) >= 0 ? " is-con" : "") + '" data-cod="' + r.cod + '" d="' + r.anillos.map(ringD).join("") + '"><title>' + esc(r.nombre) + "</title></path>"; }).join("");
    var actual = null;

    // Mapa largo: el tramo de Chile que hace que el mapa mida lo mismo que la galería (búsqueda binaria: los rótulos y el
    // ancho de Chile cambian con el tramo); si ni Chile entero alcanza, se muestra entero. En celular, un largo fijo.
    function armarV() {
      var SV = 4, Wc = zo.clientWidth || 400, rr = row.getBoundingClientRect(), Hc = Math.max(rr.bottom - zo.getBoundingClientRect().top, 700);   // hasta el final de la galería
      var cen = 37.7;
      if (window.innerWidth < 980) Hc = Wc * 2;
      var arma = function (a, b, u) {   // {svg, ancho, alto} para el tramo a..b; u = unidades por píxel (textos y puntos a tamaño fijo en pantalla)
        var y0 = (a - pr.lat0) * pr.k, y1 = (b - pr.lat0) * pr.k, xA = Infinity, xB = -Infinity;
        M.regiones.forEach(function (r) { r.anillos.forEach(function (ring) { ring.forEach(function (q) { if (q[1] >= y0 && q[1] <= y1) { xA = Math.min(xA, q[0]); xB = Math.max(xB, q[0]); } }); }); });
        xA *= SV; xB *= SV;
        var ocup = { i: [], d: [] }, rots = [], pins = [], mw = { i: 0, d: 0 };
        pts.slice().sort(function (p, q) { return p.xy[1] - q.xy[1]; }).forEach(function (p) {
          // lado del rótulo: el más cercano según el ancho de Chile a esa latitud (costa a la izquierda, cordillera a la derecha)
          var lA = Infinity, lB = -Infinity;
          M.regiones.forEach(function (r) { r.anillos.forEach(function (ring) { ring.forEach(function (q) { if (Math.abs(q[1] - p.xy[1]) < 0.6 * pr.k) { lA = Math.min(lA, q[0]); lB = Math.max(lB, q[0]); } }); }); });
          var X = p.xy[0] * SV, Y = p.xy[1] * SV, w = (p.corto.length * 7.6 + 6) * u, lado = p.xy[0] - lA < lB - p.xy[0] ? "i" : "d", ty = Y, k = 0;
          var libre = function (l, y) { return !ocup[l].some(function (o) { return Math.abs(o - y) < 19 * u; }); };
          while (!libre(lado, ty) && k < 30) { k++; ty = Y + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 19 * u; }
          ocup[lado].push(ty); mw[lado] = Math.max(mw[lado], w);
          var lx = lado === "i" ? xA - 16 * u : xB + 16 * u;
          rots.push('<g class="mch-rot" data-p="' + esc(p.id) + '"><polyline points="' + X.toFixed(1) + "," + Y.toFixed(1) + " " + (lado === "i" ? lx + 4 * u : lx - 4 * u).toFixed(1) + "," + ty.toFixed(1) + '"/><text x="' + lx.toFixed(1) + '" y="' + ty.toFixed(1) + '" dy=".35em" class="' + (lado === "i" ? "ta-fin" : "ta-ini") + '">' + esc(p.corto) + "</text></g>");
          pins.push('<g class="mch-pin' + (p.main ? " is-main" : "") + '" data-p="' + esc(p.id) + '" transform="translate(' + X.toFixed(1) + " " + Y.toFixed(1) + ')"><title>' + esc(p.nombre) + '</title><circle r="' + ((p.main ? 8 : 6) * u).toFixed(2) + '"/></g>');
        });
        var vx = xA - (24 * u) - mw.i, vwid = (xB + 24 * u + Math.max(mw.d, 30 * u)) - vx, vy = y0 * SV, vh = (y1 - y0) * SV, lats = "";
        for (var l = Math.ceil(a / 2) * 2; l <= b; l += 2) { var ly = (l - pr.lat0) * pr.k * SV; lats += '<line class="mch-zlat" x1="' + vx + '" x2="' + (vx + vwid) + '" y1="' + ly + '" y2="' + ly + '"/>' + (ly - y0 * SV > 16 * u ? '<text class="mch-hlat ta-fin" x="' + (vx + vwid - 4 * u) + '" y="' + (ly - 5 * u) + '">' + l + "°S</text>" : ""); }   // sin rótulo si quedaría cortado arriba
        return { ancho: vwid, alto: vh, svg: '<svg class="mch-band" style="--fs:' + u.toFixed(3) + '" viewBox="' + vx.toFixed(0) + " " + vy.toFixed(0) + " " + vwid.toFixed(0) + " " + vh.toFixed(0) + '" role="img" aria-label="Chile de norte a sur con los fundos">' +
          lats + '<g transform="scale(' + SV + ')">' + regs + "</g>" + rots.join("") + pins.join("") + "</svg>" };
      };
      var a, b, r, lo = 13, hi = 37.9;
      var prueba = function (span) {
        a = Math.max(17.6, cen - span / 2); b = Math.min(55.5, a + span); a = Math.max(17.6, b - span);
        r = arma(a, b, (b - a) * pr.k * SV / Hc);
        return Wc * r.alto / r.ancho;   // alto con que se dibuja
      };
      if (prueba(hi) < Hc) prueba(hi);
      else {
        for (var it = 0; it < 12; it++) { var mid = (lo + hi) / 2; if (prueba(mid) < Hc) lo = mid; else hi = mid; }
        prueba(lo);
      }
      zo.innerHTML = r.svg;
      if (actual) poner(actual.id, true);
    }

    // Galería de norte a sur agrupada por región, con el emblema de cada fundo (pedido del cliente)
    function tile(p) {
      var art = '<span class="mch-art">' + EMB(p.id) + (p.main ? '<span class="mch-sello"><svg class="i" aria-hidden="true"><use href="#i-360"/></svg>Plano y recorrido 360°</span>' : "") +
        '<span class="emb-pre">Fundos de</span><span class="emb-n">' + esc(p.corto) + "</span></span>";
      return '<li class="mch-tile' + (p.main ? " is-main" : "") + '" data-p="' + esc(p.id) + '"><button type="button" class="mch-tile-b" aria-controls="fundos-ficha" aria-label="' + esc(p.nombre + ": ver ficha y fotos") + '">' + art +
        '<span class="mch-info" aria-hidden="true">Ver ficha →</span></button>' +
        '<p class="mch-tile-sub"><b>' + esc(p.corto) + "</b>" + esc(p.reg.nombre) + "</p></li>";
    }
    var ultima = null;
    row.innerHTML = pts.map(function (p) {
      var h = p.reg.cod !== ultima ? '<li class="mch-grupo" aria-hidden="true">' + esc(rn(p)) + "</li>" : "";
      ultima = p.reg.cod;
      return h + tile(p);
    }).join("");
    var ft = $(".mch-fila-t", box); if (ft) ft.textContent = "Los " + pts.length + " fundos, de norte a sur";

    // Fundo activo: se marca en el mapa (punto, rótulo y región) y en la galería
    function poner(id, ya) {
      var p = porId(id);
      if (!p || (p === actual && !ya)) return;
      actual = p;
      var cod = String(p.reg.cod);
      $$(".mch-reg", box).forEach(function (n) { n.classList.toggle("is-on", n.getAttribute("data-cod") === cod); });
      $$("[data-p]", box).forEach(function (n) { n.classList.toggle("is-on", n.getAttribute("data-p") === id); });
    }

    // Ficha en una ventana sobre la página, con el estilo de "Conoce cada proyecto" (.py-*): foto grande con el nombre
    // encima, miniaturas, franja de datos, características con íconos, "Cerca de tu parcela" y acciones
    var abierta = null;
    function abrirFicha(id, ir) {
      var p = porId(id);
      if (!p) return;
      poner(id);
      var x = p.main ? p.p : p.h, gal = x.galeria || [], d = p.main ? datosP(p) : null;
      var ico = function (n, cls) { return '<svg class="i' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
      var g0 = gal[0];
      var hero = '<div class="py-hero' + (g0 ? "" : " is-emb") + '">' +
        (g0 ? '<img src="' + esc(g0.src) + '" alt="' + esc(g0.alt) + '" decoding="async">' : '<div class="mf-emb" aria-hidden="true">' + EMB(p.id) + "</div>") +
        '<div class="py-hero-in"><p class="kicker">' + esc([rn(p), x.zona].filter(Boolean).join(" · ")) + " · " + lat(p) + "</p>" +
        '<h3 class="mf-t">Fundos de <em>' + esc(p.corto) + "</em></h3>" + (!p.main && x.lema ? '<p class="mf-lema">' + esc(x.lema) + "</p>" : "") +
        '<p class="py-desc">' + esc((p.main ? x.descripcion || x.resumen : x.descripcion) || "").replace(/^Fundos de [^:]+: /, "") + "</p></div>" +
        (g0 ? '<p class="py-cred" data-mf-cap><span>' + esc(g0.alt) + "</span>" + (g0.credito ? "<span>" + esc(g0.credito) + "</span>" : "") + "</p>" +
          '<button class="py-zoom" type="button" data-mf-zoom aria-label="Ver las fotos en grande">' + ico("expand") + "<span>Ver en grande</span>" +
          (gal.length > 1 ? '<small data-mf-zoom-n>1/' + gal.length + "</small>" : "") + "</button>" : "") + "</div>";
      var mini = gal.length > 1 ? '<div class="mf-mini" role="group" aria-label="Fotos de Fundos de ' + esc(p.corto) + '">' + gal.map(function (g, i) { return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === 0) + '" aria-label="' + esc(g.alt) + '"><img src="' + esc(g.mini || g.src) + '" alt="" loading="lazy" decoding="async"></button>'; }).join("") + "</div>"
        : (g0 ? "" : '<p class="mf-pronto">' + ico("sparkle") + "Fotos del proyecto: próximamente</p>");
      var stats = p.main
        ? '<dl class="py-stats">' + (d.desde ? "<div><dt>Desde</dt><dd>" + clp(d.desde) + "</dd></div>" : "") +
          "<div><dt>Disponibles</dt><dd>" + d.n + " <small>de " + x.lotes.length + "</small></dd></div>" +
          "<div><dt>Parcelas</dt><dd>" + m2(x.lotes.length && x.lotes[0].m2 ? x.lotes[0].m2 : 5000) + "</dd></div>" +
          "<div><dt>Reserva</dt><dd>" + clp(RESERVA) + ' <small class="fact-nota">incluye escritura</small></dd></div></dl>'
        : '<dl class="py-stats"><div><dt>Región</dt><dd>' + esc(p.reg.nombre) + "</dd></div><div><dt>Ubicación</dt><dd>" + esc(x.zona || "") + "</dd></div><div><dt>Latitud</dt><dd>" + lat(p) + "</dd></div><div><dt>Parcelas</dt><dd>" + m2(5000) + "</dd></div></dl>";
      var cars = p.main ? (x.caracteristicas || (x.destacados || []).map(function (t) { return { icono: "check", titulo: t }; })) : (x.datos || []).map(function (t) { return { icono: "check", titulo: t }; });
      var why = cars.length ? '<ul class="py-why">' + cars.map(function (c) { return "<li>" + ico(c.icono || "check") + "<div><h4>" + esc(c.titulo) + "</h4>" + (c.texto ? "<p>" + esc(c.texto) + "</p>" : "") + "</div></li>"; }).join("") + "</ul>" : "";
      var near = p.main && (x.cercanias || []).length ? '<div class="py-near"><h4>Cerca de tu parcela</h4><ul>' + x.cercanias.map(function (c) {
          var t = String(c[1]).split(" · ");
          return "<li>" + (t.length > 1 ? "<b>" + esc(t[1]) + "</b><small>" + esc(t[0]) + "</small>" : "<b>" + esc(c[1]) + "</b>") + "<span>" + esc(c[0]) + "</span></li>";
        }).join("") + "</ul>" + (x.cercaniasNota ? "<p>" + esc(x.cercaniasNota) + "</p>" : "") +
        (x.entorno ? '<a class="py-near-map" href="' + esc(x.entorno) + '">' + ico("compass") + "Explorar el mapa del entorno</a>" : "") + "</div>" : "";
      var msg = "Hola Fundos, quiero información del proyecto " + p.nombre + (x.zona ? " (" + x.zona + ")" : "") + ".";
      // el recorrido 360° se abre en el mapa del entorno del proyecto (como en Inicio); sin mapa, el tour en otra pestaña
      var tour = x.tour ? (x.entorno ? '<a class="btn btn-ghost" href="' + esc(x.entorno) + '#tour-360" data-py-act="tour">'
        : '<a class="btn btn-ghost" href="' + esc(x.tour) + '" target="_blank" rel="noopener" data-py-act="tour">') + ico("360") + "Recorrido 360°</a>" : "";
      var acts = '<div class="py-acts">' + (p.main
        ? '<a class="btn btn-gold" href="#plano" data-py-act="plano" data-mf="plano">Ver lotes y precios' + ico("arrow", "i-go") + "</a>" +
          '<a class="btn btn-ghost" href="#visita" data-py-act="cotizar" data-mf="cotizar">' + ico("send") + "Cotizar " + esc(p.corto) + "</a>" + tour +
          (x.entorno ? '<a class="btn btn-ghost" href="' + esc(x.entorno) + '" data-py-act="entorno">' + ico("compass") + "Descubre el entorno</a>" : "") +
          (x.video ? '<button class="btn btn-ghost" type="button" data-mf="video">' + ico("play") + "Ver video</button>" : "")
        : '<a class="btn btn-gold" href="' + esc(waHref(msg)) + '" target="_blank" rel="noopener">' + ico("whatsapp") + "Quiero información</a>" +
          '<a class="btn btn-ghost" href="#visita" data-mf="cotizar">' + ico("calendar") + "Agendar una conversación</a>") + "</div>";
      var i = pts.indexOf(p), ant = pts[(i - 1 + pts.length) % pts.length], sig = pts[(i + 1) % pts.length];
      ficha.innerHTML = '<button class="mf-x" type="button" data-mf-cerrar aria-label="Cerrar la ficha">' + ico("close") + "</button>" +
        '<button class="mf-flecha is-prev" type="button" data-mf-ir="' + esc(ant.id) + '" aria-label="Fundo anterior: ' + esc(ant.nombre) + '">' + ico("arrow") + "</button>" +
        '<button class="mf-flecha" type="button" data-mf-ir="' + esc(sig.id) + '" aria-label="Fundo siguiente: ' + esc(sig.nombre) + '">' + ico("arrow") + "</button>" +
        '<div class="mf-scroll"><article class="py">' + hero + mini + stats + (why || near ? '<div class="py-body">' + why + near + "</div>" : "") + acts +
        '<nav class="mf-nav" aria-label="Otros fundos"><button type="button" data-mf-ir="' + esc(ant.id) + '">' + ico("arrow") + "<span><small>Anterior</small>" + esc(ant.nombre) + "</span></button>" +
        '<span class="mf-cuenta">' + (i + 1) + " de " + pts.length + '</span><button type="button" data-mf-ir="' + esc(sig.id) + '"><span><small>Siguiente</small>' + esc(sig.nombre) + "</span>" + ico("arrow") + "</button></nav></article></div>";
      ficha.setAttribute("aria-label", "Ficha de " + p.nombre);
      medir("ver_ficha", { fundo: p.nombre, con_plano: p.main ? "si" : "no" });
      if (!ficha.open) { if (typeof ficha.showModal === "function") ficha.showModal(); else ficha.setAttribute("open", ""); }
      abierta = id;
      $$(".mch-tile-b", row).forEach(function (b) { b.setAttribute("aria-expanded", String(b.parentNode.getAttribute("data-p") === id)); });
      var mi = $(".mf-mini", ficha), fotoI = 0;
      function verFoto(k) {   // cambia la foto grande de la ficha (miniaturas y al volver del visor)
        var g = gal[k], img = $(".py-hero > img", ficha);
        if (!g || !img) return;
        fotoI = k; img.src = g.src; img.alt = g.alt;
        $("[data-mf-cap]", ficha).innerHTML = "<span>" + esc(g.alt) + "</span>" + (g.credito ? "<span>" + esc(g.credito) + "</span>" : "");
        var n = $("[data-mf-zoom-n]", ficha); if (n) n.textContent = (k + 1) + "/" + gal.length;
        if (mi) $$("button", mi).forEach(function (o) { o.setAttribute("aria-pressed", String(+o.getAttribute("data-i") === k)); });
      }
      if (mi) mi.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-i]");
        if (b) verFoto(+b.getAttribute("data-i"));
      });
      function zoom() { Visor.abrir(gal, fotoI, function (k) { verFoto(k); }); medir("ver_fotos", { fundo: p.nombre }); }
      var zb = $("[data-mf-zoom]", ficha); if (zb) zb.addEventListener("click", zoom);
      var hi = $(".py-hero > img", ficha); if (hi) hi.addEventListener("click", zoom);
      $$("[data-mf]", ficha).forEach(function (a) {
        a.addEventListener("click", function () {
          cerrarFicha();   // las acciones llevan a otra parte de la página: primero se cierra la ventana
          if (a.getAttribute("data-mf") === "plano") Plan.apply({ id: p.id, soloDisponibles: true });
          if (a.getAttribute("data-mf") === "video") Video.open(p.id);
          if (a.getAttribute("data-mf") === "cotizar") Visit.prefill({ proyecto: p.main ? p.corto : p.nombre, mensaje: (p.main ? "Quiero cotizar una parcela en " : "Quiero información de ") + p.nombre + ".", scroll: true });
        });
      });
      $(".mf-scroll", ficha).scrollTop = 0;
      if (ir) { var f0 = $(ir === "sig" ? ".mf-flecha:not(.is-prev)" : ir === "ant" ? ".mf-flecha.is-prev" : ".mf-x", ficha); if (f0) f0.focus(); }
    }
    function cerrarFicha() { if (ficha.open) { if (typeof ficha.close === "function") ficha.close(); else { ficha.removeAttribute("open"); alCerrar(); } } }
    function alCerrar() {
      ficha.innerHTML = ""; abierta = null;
      $$(".mch-tile-b", row).forEach(function (o) { o.setAttribute("aria-expanded", "false"); });
    }
    ficha.addEventListener("close", alCerrar);
    ficha.addEventListener("click", function (e) {
      if (e.target === ficha || e.target.closest("[data-mf-cerrar]")) { cerrarFicha(); return; }   // fuera del panel o ×
      var ir = e.target.closest("[data-mf-ir]");
      if (ir) abrirFicha(ir.getAttribute("data-mf-ir"), ir.classList.contains("is-prev") ? "ant" : ir.classList.contains("mf-flecha") ? "sig" : "");
    });
    ficha.addEventListener("keydown", function (e) {   // flechas del teclado: fundo anterior o siguiente
      if (!abierta || (e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.target.closest(".mf-mini")) return;
      e.preventDefault();
      var b = $(e.key === "ArrowLeft" ? ".mf-flecha.is-prev" : ".mf-flecha:not(.is-prev)", ficha);
      if (b) abrirFicha(b.getAttribute("data-mf-ir"), e.key === "ArrowLeft" ? "ant" : "sig");
    });
    // En el celular, deslizar la foto pasa al fundo anterior o siguiente
    var sx = null, sy = 0;
    ficha.addEventListener("touchstart", function (e) { if (e.target.closest(".py-hero")) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
    ficha.addEventListener("touchend", function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { var b = $(dx < 0 ? ".mf-flecha:not(.is-prev)" : ".mf-flecha.is-prev", ficha); if (b) abrirFicha(b.getAttribute("data-mf-ir")); }
    });

    // Tocar un fundo (galería o mapa) abre su ficha; al bajar, el fundo activo es el que está a media pantalla
    row.addEventListener("click", function (e) {
      var b = e.target.closest(".mch-tile-b"), id = b && b.parentNode.getAttribute("data-p");
      if (id) abrirFicha(id, "x");
    });
    zo.addEventListener("click", function (e) { var g = e.target.closest(".mch-pin, .mch-rot"); if (g) abrirFicha(g.getAttribute("data-p"), "x"); });
    var tick = 0;
    window.addEventListener("scroll", function () {
      if (tick || abierta) return;
      tick = window.requestAnimationFrame(function () {
        tick = 0;
        if (Vista.current && Vista.current() !== "proyectos") return;
        var mid = window.innerHeight * 0.55, best = null, d0 = Infinity;
        $$(".mch-tile", row).forEach(function (t) { var r = t.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid); if (d < d0) { d0 = d; best = t; } });
        if (best) poner(best.getAttribute("data-p"));
      });
    }, { passive: true });
    function alPasar(e) { var g = e.target.closest("[data-p]"); if (g && e.pointerType === "mouse") poner(g.getAttribute("data-p")); }
    row.addEventListener("pointerover", alPasar);
    zo.addEventListener("pointerover", alPasar);
    row.addEventListener("focusin", function (e) { var t = e.target.closest(".mch-tile"); if (t) poner(t.getAttribute("data-p")); });

    box.hidden = false;
    var ley = $("[data-mch-ley]", sec); if (ley) ley.hidden = false;
    armarV();
    poner(pts[0].id, true);
    // el mapa se rehace cuando cambia el alto de la galería (ancho de la ventana, fuentes, pestaña)
    var tRe = 0, ultimoAlto = 0;
    var reArmar = function () { window.clearTimeout(tRe); tRe = window.setTimeout(function () { var h = Math.round(row.getBoundingClientRect().height); if (h && Math.abs(h - ultimoAlto) > 8) { ultimoAlto = h; armarV(); } }, 120); };
    if ("ResizeObserver" in window) new ResizeObserver(reArmar).observe(row);
    window.addEventListener("resize", reArmar);
    window.addEventListener("fundos:vista", reArmar);
    // Los enlaces #proyecto-ID ("Conocer el proyecto") abren la ficha de ese fundo
    var deHash = function () { var m = /^#proyecto-(.+)$/.exec(location.hash); if (m && porId(m[1])) window.setTimeout(function () { abrirFicha(m[1], "x"); }, 80); };
    window.addEventListener("hashchange", deHash);
    deHash();
    return true;
  }

  function initPvLead() {
    var form = $("[data-pv-lead]");
    if (!form) return;
    var done = $("[data-pv-lead-done]", form), wa = $("[data-pv-lead-wa]", form), sel = $("[data-pv-lead-proy]", form);
    var el = form.elements;
    // Selector de proyecto desde el manifiesto: el destacado primero (lanzamiento) y luego el resto
    if (sel) {
      sel.innerHTML = proyectos.slice().sort(function (a, b) { return (b.id === B.destacado) - (a.id === B.destacado); }).map(function (o) {
        return '<option value="' + esc(o.id) + '"' + (o.id === B.destacado ? " selected" : "") + ">" + esc(o.nombre) + (o.id === B.destacado ? " · lanzamiento" : "") + "</option>";
      }).join("");
    }
    var rules = {
      nombre: function (v) { return v.trim().length >= 2; },
      telefono: function (v) { var d = v.replace(/\D/g, ""); return d.length >= 8 && d.length <= 15; },
      correo: function (v) { v = v.trim(); return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
      acepto: function (_, i) { return i.checked; }
    };
    function check(n) {
      var i = el[n], ok = rules[n](i.value || "", i), err = $('[data-err="' + n + '"]', form);
      i.setAttribute("aria-invalid", ok ? "false" : "true");
      if (err) { err.id = err.id || "pl-err-" + n; err.classList.toggle("is-shown", !ok); if (ok) i.removeAttribute("aria-describedby"); else i.setAttribute("aria-describedby", err.id); }
      return ok;
    }
    Object.keys(rules).forEach(function (n) {
      el[n].addEventListener(el[n].type === "checkbox" ? "change" : "input", function () { if (el[n].getAttribute("aria-invalid") === "true") check(n); });
    });
    function inert(on) { form.classList.toggle("is-done", on); [].forEach.call(form.children, function (ch) { if (ch !== done) ch.inert = on; }); }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = Object.keys(rules).filter(function (n) { return !check(n); });
      if (bad.length) { el[bad[0]].focus(); return; }
      var correo = el.correo.value.trim(), p = proyecto(sel ? sel.value : B.destacado) || proyecto(B.destacado);
      var msg = "Hola Fundos, soy " + el.nombre.value.trim() + ". Quiero recibir el plano de disponibilidad y la lista de precios " + (p && p.id === B.destacado ? "de lanzamiento " : "") + "de Fundos " + (p ? p.nombre : "Puerto Varas") + "." +
        " Mi teléfono: " + el.telefono.value.trim() + "." + (correo ? " Mi correo: " + correo + "." : "");
      wa.href = waHref(msg);
      $("[data-pv-lead-msg]", form).textContent = msg;
      enviarLead({ formulario: "portada", nombre: el.nombre.value, telefono: el.telefono.value, email: correo, proyecto: p ? p.nombre : "", mensaje: "Pidió el plano de disponibilidad y la lista de precios." }, form);
      done.hidden = false;
      inert(true);
      done.focus();
    });
    $("[data-pv-lead-edit]", form).addEventListener("click", function () { done.hidden = true; inert(false); el.nombre.focus(); });
  }

  /* =============================================================
     Videos: portada del hero y visor para cada proyecto
     Se configuran en lib/manifest.js (videoDestacado y video de cada proyecto)
     ============================================================= */
  function videoSource(src) {
    var m = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(src);
    if (m) return { frame: "https://www.youtube-nocookie.com/embed/" + m[1] + "?autoplay=1&rel=0&playsinline=1", link: "https://www.youtube.com/watch?v=" + m[1] };
    m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(src);
    if (m) return { frame: "https://player.vimeo.com/video/" + m[1] + "?autoplay=1&title=0&byline=0&portrait=0", link: "https://vimeo.com/" + m[1] };
    return { file: src, link: src };
  }

  function heroVideo(hero, hv, toggle) {
    var heroArt = hero && ($(".hero-photo", hero) || $(".hero-art", hero));
    // En pantallas bajo 960 px se usa la versión para celular, si existe
    if (!desktop.matches && (hv.mp4Movil || hv.webmMovil)) hv = { mp4: hv.mp4Movil, webm: hv.webmMovil, poster: hv.posterMovil || hv.poster };
    var conn = navigator.connection || {};
    // Sin video con ahorro de datos o conexiones más lentas que 4G
    var light = conn.saveData || (!!conn.effectiveType && conn.effectiveType !== "4g");
    if (!(hv.mp4 || hv.webm) || !heroArt || reduced || light) return;
    var made = false;
    function make() {
      if (made || !hero.getClientRects().length) return;
      made = true;
      var v = document.createElement("video");
      v.className = "hero-video";
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
      v.preload = "metadata";
      if (hv.poster) v.poster = hv.poster;
      [["mp4", "video/mp4"], ["webm", "video/webm"]].forEach(function (t) {
        if (!hv[t[0]]) return;
        var so = document.createElement("source");
        so.src = hv[t[0]]; so.type = t[1];
        v.appendChild(so);
      });
      v.addEventListener("playing", function () {
        hero.classList.add("has-video");
        if (toggle) toggle.hidden = false;
      });
      heroArt.appendChild(v);
      var pr = v.play();
      if (pr && pr.catch) pr.catch(function () {});
      // Fuera de pantalla no se decodifica; al volver sigue, salvo que la persona lo haya pausado
      var userPaused = false;
      if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { if (!userPaused) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } }
        else v.pause();
      }).observe(hero);
      if (toggle) toggle.addEventListener("click", function () {
        var paused = !v.paused;
        userPaused = paused;
        if (paused) v.pause(); else v.play();
        toggle.setAttribute("aria-label", paused ? "Reproducir el video de portada" : "Pausar el video de portada");
        $("use", toggle).setAttribute("href", paused ? "#i-play" : "#i-pause");
      });
    }
    make();
    if (!made) document.addEventListener("fundos:vista", make);
  }

  function initVideo() {
    // Portada de Inicio: video de fondo sobre una imagen que queda de respaldo. Se crea cuando su pestaña se ve.
    heroVideo($("[data-pvhero]"), B.videoDestacado || {}, $("[data-pv-toggle]"));

    // Visor
    var dlg = $("[data-vdialog]");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var box = $("[data-vd-frame]", dlg), title = $("[data-vd-title]", dlg);
    var blockedMsg = $("[data-vd-blocked]", dlg), link = $("[data-vd-link]", dlg);
    var loading = false;

    function stop() { box.innerHTML = ""; loading = false; }
    function openSrc(src, titulo, vertical, webm) {
      var s = videoSource(src);
      dlg.classList.toggle("is-vertical", !!vertical);
      title.textContent = titulo;
      link.href = s.link;
      blockedMsg.hidden = true;
      box.hidden = false;
      stop();
      if (s.frame) {
        var f = document.createElement("iframe");
        f.src = s.frame;
        f.title = titulo;
        f.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; encrypted-media");
          f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        loading = true;
        box.appendChild(f);
      } else {
        var v = document.createElement("video");
        // MP4 (H.264) para todos; WebM de respaldo para navegadores sin H.264
        [[s.file, "video/mp4"], [webm, "video/webm"]].forEach(function (x) {
          if (!x[0]) return;
          var so = document.createElement("source");
          so.src = x[0]; so.type = /\.webm$/i.test(x[0]) ? "video/webm" : x[1];
          v.appendChild(so);
        });
        v.controls = true; v.autoplay = true; v.playsInline = true;
        v.setAttribute("playsinline", "");
        box.appendChild(v);
      }
      dlg.showModal();
    }
    Video.open = function (id) { var p = proyecto(id); if (p && p.video) openSrc(p.video, p.nombre + " en video", false); };
    $$("[data-video-file]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        openSrc(a.getAttribute("href"), a.getAttribute("data-video-title") || "Video", a.hasAttribute("data-vertical"), a.getAttribute("data-video-webm"));
      });
    });
    // Si el sitio no permite incrustar reproductores externos, se ofrece el enlace
    document.addEventListener("securitypolicyviolation", function (e) {
      var d = e.effectiveDirective || e.violatedDirective || "";
      if (!loading || !dlg.open || !/^(frame|child|default)-src/.test(d)) return;
      stop();
      box.hidden = true;
      blockedMsg.hidden = false;
    });
    $("[data-vd-close]", dlg).addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", stop);

  }

  /* =============================================================
     Barra de acción móvil
     ============================================================= */
  function initMobileBar() {
    var bar = $("[data-mbar]"), hero = $("[data-pvhero]"), visit = $("#visita"), fab = $(".wa-float");
    if (!bar || !hero || !("IntersectionObserver" in window)) return;
    var pastHero = false, atVisit = false;
    // En pantallas bajas (teléfono horizontal) la barra aparece apenas se desplaza la página
    function short() { return window.innerHeight < 600 && window.scrollY > 40; }
    function update() {
      bar.classList.toggle("is-visible", (pastHero || short()) && !atVisit && !document.body.classList.contains("sheet-open"));
      if (fab) fab.classList.toggle("is-hidden", atVisit);   // el botón flotante no tapa el formulario
    }
    new IntersectionObserver(function (en) { pastHero = en[0].intersectionRatio < 0.3; update(); }, { threshold: [0, 0.3] }).observe(hero);
    if (visit) new IntersectionObserver(function (en) { atVisit = en[0].isIntersecting; update(); }, { threshold: 0.12 }).observe(visit);
    document.addEventListener("fundos:sheet", update);
    window.addEventListener("scroll", function () { if (window.innerHeight < 600) update(); }, { passive: true });
    function unobscure(t) {
      if (!t || !bar.classList.contains("is-visible") || bar.contains(t) || !t.getBoundingClientRect) return;
      var br = bar.getBoundingClientRect();
      if (!br.height || br.top >= window.innerHeight) return;        // barra no dibujada (escritorio, pantalla baja)
      if (t.matches && !t.matches(":focus-visible")) return;         // solo foco de teclado: clics y foco por código no mueven la página
      var r = t.getBoundingClientRect();
      if (r.top >= window.innerHeight || r.bottom <= 0) return;      // fuera de pantalla: lo acomoda quien lo enfoca
      if (r.bottom > br.top - 8) window.scrollBy(0, r.bottom - br.top + 16);
    }
    document.addEventListener("focusin", function (e) { if (!e.target.closest || !e.target.closest(".plan-canvas")) unobscure(e.target); });
    document.addEventListener("fundos:focusvisible", function (e) { unobscure(e.detail); });
  }

  /* =============================================================
     Preguntas: una abierta a la vez
     ============================================================= */
  function initFaq() {
    var items = $$(".faq details");
    items.forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  }

  /* =============================================================
     Arranque
     ============================================================= */
  /* =============================================================
     Equipo: una tarjeta y una ventana (ficha) por persona
     ============================================================= */
  function initSellers() {
    var list = $("[data-sellers]"), gente = B.equipo || [];
    if (!list || !gente.length) return;
    var cta = $(".member-cta", list);
    var arrow = '<svg class="i i-go" aria-hidden="true"><use href="#i-arrow"/></svg>';
    function corto(g) { return g.apodo || (g.nombre || "").split(" ")[0]; }
    function titulo(g) { return g.nombre || g.cargo || "Equipo comercial"; }
    function sub(g) { return g.nombre ? (g.cargo || "Equipo comercial") : "Fundos Inmobiliaria"; }
    gente.forEach(function (g, i) {
      var li = document.createElement("li");
      li.className = "seller reveal is-visible";
      li.innerHTML = '<button type="button" class="seller-card" data-seller="' + i + '" aria-haspopup="dialog">' +
        '<img src="' + esc(g.foto) + '" alt="" width="600" height="800" loading="lazy" decoding="async">' +
        (g.video ? '<span class="seller-badge"><svg class="i" aria-hidden="true"><use href="#i-play"/></svg>Saludo en video</span>' : "") +
        '<span class="seller-info"><strong>' + esc(titulo(g)) + '</strong>' + (g.nombre ? '<span>' + esc(sub(g)) + '</span>' : "") +
        '<span class="seller-more">Ver ficha' + arrow + '</span></span></button>';
      list.insertBefore(li, cta);
    });
    // Saludo al pasar el cursor (computador): el video recortado como la foto reemplaza a la foto, con sonido.
    // Si el navegador aún no deja sonar (nadie ha hecho clic en la página), parte en silencio y avisa.
    var hoverOk = mm("(hover: hover) and (pointer: fine)"), vids = [];
    function hoverVideo(card, g) {
      var t = g.video.tarjeta, v = null, timer = 0, hint = null;
      if (!t || reduced) return;
      function stop() {
        clearTimeout(timer);
        card.classList.remove("is-playing", "is-muted");
        if (v) { v.pause(); }
      }
      function start() {
        if (!v) {
          v = document.createElement("video");
          [[t.mp4, "video/mp4"], [t.webm, "video/webm"]].forEach(function (x) {
            if (!x[0]) return;
            var so = document.createElement("source"); so.src = x[0]; so.type = x[1]; v.appendChild(so);
          });
          v.className = "seller-vid"; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "auto";
          v.setAttribute("aria-hidden", "true"); v.tabIndex = -1;
          v.addEventListener("ended", function () { card.classList.remove("is-playing", "is-muted"); });
          card.insertBefore(v, card.firstChild.nextSibling);
          hint = document.createElement("span");
          hint.className = "seller-snd"; hint.setAttribute("aria-hidden", "true");
          hint.innerHTML = '<svg class="i"><use href="#i-play"/></svg>Haz clic para verlo con sonido';
          card.appendChild(hint);
          vids.push(stop);
        }
        vids.forEach(function (f) { if (f !== stop) f(); });
        try { v.currentTime = 0; } catch (x) { /* aún sin datos */ }
        v.muted = false;
        var go = function () { card.classList.add("is-playing"); };
        var p = v.play();
        if (p && p.then) p.then(go).catch(function () {
          v.muted = true;
          var q = v.play();
          if (q && q.then) q.then(function () { go(); card.classList.add("is-muted"); }).catch(function () {});
        }); else go();
      }
      card.addEventListener("pointerenter", function (e) {
        if (e.pointerType !== "mouse" || !hoverOk.matches) return;
        clearTimeout(timer); timer = setTimeout(start, 140);
      });
      card.addEventListener("pointerleave", stop);
      // Clic mientras se ve el saludo: la ficha lo sigue mostrando completo y con sonido (el clic ya lo permite)
      card.addEventListener("click", function () { card.dataset.saludo = card.classList.contains("is-playing") ? "1" : ""; stop(); });
    }
    gente.forEach(function (g, i) {
      var card = $('[data-seller="' + i + '"]', list);
      if (card && g.video) hoverVideo(card, g);
    });



    var dlg = $("[data-sdialog]");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var media = $("[data-sd-media]", dlg), faces = $("[data-sd-faces]", dlg), cur = 0;
    var bio = $("[data-sd-bio]", dlg), bioBase = bio.innerHTML, ticks = $("[data-sd-list]", dlg);
    var el = { title: $("[data-sd-title]", dlg), role: $("[data-sd-role]", dlg), contacto: $("[data-sd-contacto]", dlg), count: $("[data-sd-count]", dlg), wa: $("[data-sd-wa]", dlg), visit: $("[data-sd-visit]", dlg) };
    faces.innerHTML = gente.map(function (g, i) {
      return '<button type="button" class="sd-face" data-sd-go="' + i + '" aria-label="Ver la ficha de ' + esc(g.nombre || "la persona " + (i + 1) + " del equipo") + '"><img src="' + esc(g.foto) + '" alt="" width="40" height="40" loading="lazy" decoding="async"></button>';
    }).join("");

    function waFor(g) {
      var num = (g.whatsapp || contacto.whatsapp || "").replace(/\D/g, "");
      var txt = g.nombre ? "Hola " + corto(g) + ", vi tu ficha en el sitio de Fundos y quiero conversar sobre las parcelas."
        : "Hola, vi la ficha del equipo comercial en el sitio de Fundos y quiero conversar sobre las parcelas.";
      return "https://wa.me/" + num + "?text=" + encodeURIComponent(txt);
    }
    function photo(g) {
      media.innerHTML = '<img src="' + esc(g.foto) + '" alt="' + esc(g.nombre ? g.nombre + ", del equipo de Fundos" : "Integrante del equipo de Fundos Inmobiliaria") + '" width="600" height="800" decoding="async">' +
        (g.video ? '<button type="button" class="sd-play" data-sd-play><span class="sd-play-dot" aria-hidden="true"><svg class="i"><use href="#i-play"/></svg></span>Ver su saludo<small>' + (g.video.dur ? Math.round(g.video.dur) + " s · " : "") + 'con sonido</small></button>' : "");
    }
    function playVideo(g) {
      var v = document.createElement("video");
      [[g.video.mp4, "video/mp4"], [g.video.webm, "video/webm"]].forEach(function (x) {
        if (!x[0]) return;
        var so = document.createElement("source"); so.src = x[0]; so.type = x[1]; v.appendChild(so);
      });
      v.controls = true; v.autoplay = true; v.playsInline = true; v.setAttribute("playsinline", "");
      if (g.video.poster) v.poster = g.video.poster;
      v.setAttribute("aria-label", "Saludo en video de " + (g.nombre || "una persona del equipo"));
      media.innerHTML = "";
      media.appendChild(v);
      v.focus();
    }
    function show(i) {
      cur = (i + gente.length) % gente.length;
      var g = gente[cur];
      if (g && g.nombre) medir("ver_asesor", { asesor: g.nombre });
      photo(g);
      el.title.textContent = titulo(g);
      el.role.textContent = sub(g);
      // Teléfono y correo de cada asesor (se tocan para llamar o escribir)
      if (el.contacto) {
        el.contacto.innerHTML = (g.telefono ? '<a href="tel:+' + esc((g.whatsapp || g.telefono).replace(/\D/g, "")) + '"><svg class="i" aria-hidden="true"><use href="#i-phone"/></svg>' + esc(g.telefono) + "</a>" : "") +
          (g.correo ? '<a href="mailto:' + esc(g.correo) + '"><svg class="i" aria-hidden="true"><use href="#i-mail"/></svg>' + esc(g.correo) + "</a>" : "");
        el.contacto.hidden = !g.telefono && !g.correo;
      }
      // Su presentación, con sus palabras; sin ella, el texto general del equipo
      bio.innerHTML = g.bio && g.bio.length ? g.bio.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") : bioBase;
      bio.classList.toggle("is-own", !!(g.bio && g.bio.length));
      ticks.hidden = !!(g.bio && g.bio.length);
      bio.scrollTop = 0;
      el.count.textContent = "· " + (cur + 1) + " de " + gente.length;
      el.wa.href = waFor(g);
      el.visit.textContent = "";
      el.visit.insertAdjacentHTML("beforeend", '<svg class="i" aria-hidden="true"><use href="#i-calendar"/></svg>' + (g.nombre ? "Agendar con " + esc(corto(g)) : "Agendar visita"));
      $$(".sd-face", faces).forEach(function (b, k) { b.setAttribute("aria-current", k === cur ? "true" : "false"); });
      try { history.replaceState(null, "", "#equipo-" + (cur + 1)); } catch (e) { /* marco sin historial */ }
    }
    function open(i) { show(i); if (!dlg.open) dlg.showModal(); }
    list.addEventListener("click", function (e) {
      var b = e.target.closest("[data-seller]");
      if (b) {
        open(+b.getAttribute("data-seller"));
        if (b.dataset.saludo === "1" && gente[cur].video) playVideo(gente[cur]);
        b.dataset.saludo = "";
      }
    });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-sd-close]")) { dlg.close(); return; }
      if (e.target.closest("[data-sd-prev]")) show(cur - 1);
      else if (e.target.closest("[data-sd-next]")) show(cur + 1);
      else if (e.target.closest("[data-sd-go]")) show(+e.target.closest("[data-sd-go]").getAttribute("data-sd-go"));
      else if (e.target.closest("[data-sd-play]")) playVideo(gente[cur]);
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.target.tagName === "VIDEO") return;
      if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1); }
    });
    // Deslizar en el celular para pasar a la siguiente persona
    var sx = null;
    media.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    media.addEventListener("touchend", function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50 && !$("video", media)) show(cur + (dx < 0 ? 1 : -1));
    });
    dlg.addEventListener("close", function () {
      media.innerHTML = "";   // detiene el video
      if (/^#equipo-\d+$/.test(location.hash)) {
        try { history.replaceState(null, "", "#equipo"); } catch (e) { /* marco sin historial */ }
      }
    });
    el.visit.addEventListener("click", function () {
      var g = gente[cur];
      dlg.close();
      Visit.prefill({ mensaje: g.nombre ? "Me gustaría que me atienda " + g.nombre + "." : "", scroll: true, asesor: g.whatsapp ? { nombre: g.nombre, whatsapp: g.whatsapp } : null });
    });
    // Enlace directo a la ficha: #equipo-3
    function fromHash() {
      var m = /^#equipo-(\d+)$/.exec(location.hash);
      if (m && gente[+m[1] - 1]) open(+m[1] - 1);
    }
    window.addEventListener("hashchange", fromHash);
    fromHash();
  }

  /* =============================================================
     Animaciones continuas: en pausa mientras no se ven (ahorra CPU y batería)
     ============================================================= */
  function initOffscreen() {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { x.target.classList.toggle("is-offscreen", !x.isIntersecting); });
    }, { rootMargin: "80px 0px" });
    $$(".hero, .phone, .plan-canvas").forEach(function (el) { io.observe(el); });
  }

  /* =============================================================
     Tu compra: Cómo comprar · Simulador · Preguntas · Mi compra en pestañas
     Los enlaces #como-comprar, #tu-casa, #preguntas y #portal abren su pestaña (#simulador lleva al plano).
     ============================================================= */
  function initCompra() {
    var root = $("[data-tc]");
    if (!root) return;
    var tabs = $$("[data-tc-tab]", root), panels = $$("[data-tc-panel]", root);
    var ids = panels.map(function (p) { return p.id; });
    tabs.forEach(function (t) {
      var id = t.getAttribute("data-tc-tab");
      t.setAttribute("aria-controls", id);
      var p = document.getElementById(id);
      if (p) { p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", t.id); p.setAttribute("tabindex", "-1"); }
    });
    function navH() { var nv = $(".nav"); return nv && getComputedStyle(nv).position === "fixed" ? navBottomPx() : 0; }
    function toTop() {
      var y = window.scrollY + root.getBoundingClientRect().top - navH() + 1;
      window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
    }
    function activate(id, o) {
      o = o || {};
      if (ids.indexOf(id) < 0) return;
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-tc-tab") === id;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
        if (on) t.scrollIntoView({ inline: "nearest", block: "nearest" });
      });
      panels.forEach(function (p) {
        p.hidden = p.id !== id;
        if (!p.hidden) $$(".reveal", p).forEach(function (el) { el.classList.add("is-visible"); });
      });
      if (o.hash) { try { history.replaceState(null, "", "#" + id); } catch (e) { /* marco sin historial */ } }
      if (o.scroll || root.getBoundingClientRect().top < navH() - 2) toTop();
      document.dispatchEvent(new CustomEvent("fundos:tab", { detail: id }));
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function (e) { e.preventDefault(); activate(t.getAttribute("data-tc-tab"), { hash: true }); });
      t.addEventListener("keydown", function (e) {
        var nx = null;
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") nx = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        else if (e.key === "Home") nx = tabs[0];
        else if (e.key === "End") nx = tabs[tabs.length - 1];
        if (!nx) return;
        e.preventDefault();
        nx.focus();
        activate(nx.getAttribute("data-tc-tab"), { hash: true });
      });
    });
    // Cualquier enlace del sitio a una de las pestañas la abre y lleva a la sección
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute("data-tc-tab") || e.defaultPrevented) return;
      var id = a.getAttribute("href").slice(1);
      if (ids.indexOf(id) < 0) return;
      e.preventDefault();
      activate(id, { hash: true, scroll: true });
    });
    function fromHash() { var id = location.hash.slice(1); if (ids.indexOf(id) >= 0) activate(id, { scroll: true }); }
    window.addEventListener("hashchange", fromHash);
    activate(ids.indexOf(location.hash.slice(1)) >= 0 ? location.hash.slice(1) : ids[0]);
    if (ids.indexOf(location.hash.slice(1)) >= 0) window.setTimeout(fromHash, 150);
  }

  /* =============================================================
     Tu casa: el lote real (forma de lib/planos.js llevada a su superficie en m²) en vista isométrica, con
     construcciones genéricas a escala (volumen, ventanas, sombra) que se mueven, giran y cambian de tamaño;
     mide lo construido contra el 10 % de la superficie. También en planta (vista desde arriba).
     ============================================================= */
  function initCasa() {
    var root = $("[data-casa]"), planos = B.planos || {};
    if (!root) return;
    var svg = $("[data-c-svg]", root), stage = $(".casa-stage", root), selP = $("[data-c-proyecto]", root), selL = $("[data-c-lote]", root);
    var NS = "http://www.w3.org/2000/svg", PCT = 0.10, CI = Math.cos(Math.PI / 6), SI = 0.5;
    // Estilo rural (pedido del cliente, "vender una vida de campo"): madera en tinglado, techo de zinc a dos aguas,
    // corredor con pilares en el lado largo del frente y chimenea. Máximo 2 viviendas por parcela (MAXCASAS).
    var TIPOS = [
      { id: "casa", corto: "Casa", nombre: "Casa de campo", w: 12, h: 9, alto: 3, forma: "caja", techoOp: true, dosAguas: true, vivienda: true, muro: "#B4865A", techo: "#8E3B2E", ventanas: true, puerta: true, tablas: true, corredor: true, chimenea: true },
      { id: "casa2", corto: "Casa 2 pisos", nombre: "Casa de campo de dos pisos", w: 10, h: 8, alto: 5.8, pisos: 2, forma: "caja", techoOp: true, dosAguas: true, vivienda: true, muro: "#EDE5D3", techo: "#40594A", ventanas: true, puerta: true, faja: "#8C6A44", tablas: true, corredor: true, chimenea: true },
      { id: "visitas", corto: "Cabaña", nombre: "Cabaña de visitas", w: 8, h: 6, alto: 2.8, forma: "caja", techoOp: true, dosAguas: true, vivienda: true, muro: "#9C6E45", techo: "#6E3528", ventanas: true, puerta: true, tablas: true, corredor: true },
      { id: "piscina", nombre: "Piscina", w: 8, h: 4, alto: 0, forma: "piscina", cuenta: false },
      { id: "quincho", nombre: "Quincho", w: 6, h: 5, alto: 2.7, forma: "pergola", muro: "#7E5B3A", techo: "#6E5A43", piso: "#D6C29C" },
      { id: "garaje", nombre: "Cobertizo", w: 6, h: 5, alto: 2.5, forma: "pergola", muro: "#7A5A3C", techo: "#8E3B2E", piso: "#D9D3C6" },
      { id: "bodega", nombre: "Bodega", w: 4, h: 3, alto: 2.4, forma: "caja", techoOp: true, dosAguas: true, muro: "#9A3F2E", techo: "#4B4741", puerta: true, tablas: true }
    ];
    var MAXCASAS = 2;
    // Parcela agroresidencial (pedido del cliente): la mitad del lote, lejos del acceso, va con frutales (25 %) y
    // conservación natural (25 %), con especies según la zona del proyecto. Ahí no se construye.
    var AGRO = {
      "puerto-varas": { frutales: "manzanos, cerezos y avellanos", nativo: "maqui, arrayán y canelo", fruta: "#C8402E" },
      "malalcahuello": { frutales: "manzanos, guindos y castaños", nativo: "ñirres, coigües y notros", fruta: "#B8332A" },
      "marchigue": { frutales: "olivos, almendros y nogales", nativo: "quillayes, peumos y litres", fruta: "#56612E" }
    };
    var S = { p: null, lote: null, poly: [], arboles: [], acceso: null, camino: true, vida: true, ang: 0, hora: 17, estacion: "verano", items: [], sel: -1, seq: 0, vista: "iso", zoom: 1, pan: [0, 0], base: [0, 0, 100, 100] };
    var el = {
      total: $("[data-c-total]", root), max: $("[data-c-max]", root), bar: $("[data-c-bar]", root), msg: $("[data-c-msg]", root),
      meter: $("[data-c-meter]", root), add: $("[data-c-add]", root), box: $("[data-c-sel]", root), name: $("[data-c-sel-name]", root),
      selm2: $("[data-c-sel-m2]", root), w: $("[data-c-w]", root), h: $("[data-c-h]", root), rot: $("[data-c-rot]", root),
      del: $("[data-c-del]", root), casas: $("[data-c-casas]", root), agroM2: $("[data-c-agro-m2]", root), agroF: $("[data-c-agro-f]", root), agroC: $("[data-c-agro-c]", root), wa: $("[data-c-wa]", root), techo: $("[data-c-techo-wrap]", root), camino: $("[data-c-camino]", root), vida: $("[data-c-vida]", root), lbl: $("[data-c-lbl]", root), full: $("[data-c-full]", root)
    };
    var con = proyectos.filter(function (p) { return planos[p.id] && p.lotes && p.lotes.length; })
      .sort(function (a, b) { return (b.id === DESTACADO) - (a.id === DESTACADO); });
    if (!con.length) return;
    selP.innerHTML = con.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.nombre) + "</option>"; }).join("");

    function num(v) { return Math.round(v * 100) / 100; }
    function snap(v) { return Math.round(v * 2) / 2; }
    function fmt(n) { return String(Math.round(n * 10) / 10).replace(".", ","); }
    function tipo(id) { return TIPOS.filter(function (x) { return x.id === id; })[0]; }
    // Superficie construida: la huella por cada piso; la piscina (sin techo) se muestra pero no suma
    function pisos(it) { return tipo(it.tipo).pisos || 1; }
    function area(it) { return it.w * it.h * pisos(it); }
    function cuenta(it) { return tipo(it.tipo).cuenta !== false; }
    function total() { return S.items.reduce(function (a, it) { return a + (cuenta(it) ? area(it) : 0); }, 0); }
    function m2Txt(it) { return fmt(area(it)) + " m²" + (pisos(it) > 1 ? " en " + pisos(it) + " pisos" : "") + (cuenta(it) ? "" : " (no suma)"); }
    function limite() { return (S.lote ? S.lote.m2 : 5000) * PCT; }
    function lotes(p) { return p.lotes.filter(function (l) { return l.estado !== "vendida" && planos[p.id].lotes[l.n]; }); }
    function parse(d) {
      var pts = [], re = /([ML])\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g, m;
      while ((m = re.exec(d))) pts.push([+m[2], +m[3]]);
      return pts;
    }
    function polyArea(pts) {
      var a = 0;
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
      return a / 2;
    }
    function inside(pt, pts) {
      var c = false;
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var a = pts[i], b = pts[j];
        if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
      }
      return c;
    }
    function distSeg(p, a, b) {
      var dx = b[0] - a[0], dy = b[1] - a[1], t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    }
    function distBorde(p) { var d = Infinity; for (var i = 0; i < S.poly.length; i++) d = Math.min(d, distSeg(p, S.poly[i], S.poly[(i + 1) % S.poly.length])); return d; }
    function corners(it, m) {
      m = m || 0;
      var r = it.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), hw = it.w / 2 + m, hh = it.h / 2 + m;
      return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(function (q) { return [it.x + q[0] * c - q[1] * s, it.y + q[0] * s + q[1] * c]; });
    }
    function local(it, x, y) {
      var r = -it.rot * Math.PI / 180, dx = x - it.x, dy = y - it.y;
      return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)];
    }
    function fuera(it) {
      var cs = corners(it);
      if (!cs.every(function (q) { return inside(q, S.poly); })) return true;
      return S.poly.some(function (v) { return inside(v, cs); });
    }
    function choca(ca, cb) { return ca.some(function (q) { return inside(q, cb); }) || cb.some(function (q) { return inside(q, ca); }); }
    function enAgro(it) { return !!(S.agro && choca(corners(it), S.agro.mitad)); }
    function malo(it) { return fuera(it) || enAgro(it); }
    function nCasas() { return S.items.filter(function (x) { return tipo(x.tipo).vivienda; }).length; }
    // Parte del polígono con lado·(x − c) ≥ 0 (Sutherland–Hodgman contra un semiplano vertical)
    function recorte(poly, c, lado) {
      var out = [];
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i], b = poly[(i + 1) % poly.length], da = lado * (a[0] - c), db = lado * (b[0] - c);
        if (da >= 0) out.push(a);
        if ((da >= 0) !== (db >= 0)) { var t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      return out;
    }
    function areaDe(poly) { return poly.length < 3 ? 0 : Math.abs(polyArea(poly)); }
    // x del corte que deja `frac` de la superficie del lado elegido
    function corte(lado, frac) {
      var xs = S.poly.map(function (q) { return q[0]; }), lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs), A = areaDe(S.poly);
      for (var i = 0; i < 40; i++) {
        var m = (lo + hi) / 2, a = areaDe(recorte(S.poly, m, lado));
        if ((a > frac * A) === (lado > 0)) lo = m; else hi = m;
      }
      return (lo + hi) / 2;
    }
    function centro(poly) { var x = 0, y = 0; poly.forEach(function (q) { x += q[0]; y += q[1]; }); return [x / poly.length, y / poly.length]; }
    function distPoly(p, poly) { var d = Infinity; for (var i = 0; i < poly.length; i++) d = Math.min(d, distSeg(p, poly[i], poly[(i + 1) % poly.length])); return d; }
    function agro(n) {
      var cfg = AGRO[S.p.id] || AGRO["puerto-varas"], cx = centro(S.poly)[0];
      var acc = S.acceso ? (S.acceso[0][0] + S.acceso[1][0]) / 2 : cx - 1, lado = acc <= cx ? 1 : -1;   // la mitad lejos del acceso
      var c1 = corte(lado, 0.5), c2 = corte(lado, 0.25);
      var A = { cfg: cfg, mitad: recorte(S.poly, c1, lado), cons: recorte(S.poly, c2, lado), libre: recorte(S.poly, c1, -lado), arboles: [] };
      A.frut = recorte(A.mitad, c2, -lado);
      A.m2 = areaDe(A.mitad);
      // Frutales en hileras cada 6 m; conservación con árboles nativos irregulares (siempre los mismos por lote)
      var b = function (poly) { var xs = poly.map(function (q) { return q[0]; }), ys = poly.map(function (q) { return q[1]; }); return [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)]; };
      var bf = b(A.frut);
      for (var x = bf[0] + 3; x < bf[2]; x += 6) for (var y = bf[1] + 3; y < bf[3]; y += 6) {
        if (inside([x, y], A.frut) && distPoly([x, y], A.frut) > 1.8) A.arboles.push({ x: x, y: y, h: 3.2, k: "f" });
      }
      var seed = n * 7919 + 104729, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      var bc = b(A.cons), nat = [], meta = Math.min(55, Math.round(areaDe(A.cons) / 26));
      for (var i = 0; i < 1500 && nat.length < meta; i++) {
        var q = [bc[0] + rnd() * (bc[2] - bc[0]), bc[1] + rnd() * (bc[3] - bc[1])];
        if (!inside(q, A.cons) || distPoly(q, A.cons) < 1.4) continue;
        if (nat.some(function (t) { return Math.hypot(t.x - q[0], t.y - q[1]) < 3.6; })) continue;
        nat.push({ x: q[0], y: q[1], h: 4.4 + rnd() * 3.6, k: "n", v: rnd() });
      }
      A.arboles = A.arboles.concat(nat);
      S.agro = A;
    }
    // Ubica una construcción en un lugar libre de la parte construible, con 4 m de holgura
    function ubicar(it) {
      var c0 = S.agro ? centro(S.agro.libre) : [0, 0];
      for (var i = 0; i < 140; i++) {
        var a = i * 2.4, r = i * 1.4;
        it.x = snap(c0[0] + Math.cos(a) * r); it.y = snap(c0[1] + Math.sin(a) * r);
        var cs = corners(it, 4);
        if (!malo(it) && !S.items.some(function (o) { return o !== it && choca(corners(o), cs); })) return;
      }
    }

    // Proyección: isométrica (suelo en z = 0) o planta; "prof" ordena lo que se dibuja (lo más cercano, al final)
    function P(x, y, z) { return S.vista === "iso" ? [(x - y) * CI, (x + y) * SI - (z || 0)] : [x, y]; }
    function suelo(sx, sy) { if (S.vista !== "iso") return [sx, sy]; var a = sx / CI, b = sy / SI; return [(a + b) / 2, (b - a) / 2]; }
    function prof(x, y) { return x + y; }
    function pts(list) { return list.map(function (q) { var s = q.length === 2 ? P(q[0], q[1], 0) : P(q[0], q[1], q[2]); return num(s[0]) + "," + num(s[1]); }).join(" "); }

    // Lote en metros, con su lado más largo horizontal (el plano no indica el norte; la forma no cambia)
    function setLote(n) {
      var g = planos[S.p.id].lotes[n];
      S.lote = S.p.lotes.filter(function (l) { return l.n === n; })[0];
      if (!g || !S.lote) return;
      var raw = parse(g.d), k = Math.sqrt(S.lote.m2 / Math.abs(polyArea(raw))), l0 = g.l;
      var poly = raw.map(function (q) { return [(q[0] - l0[0]) * k, (q[1] - l0[1]) * k]; });
      var acc = acceso(raw, planos[S.p.id]);
      var best = 0, ang = 0;
      poly.forEach(function (a, i) { var b = poly[(i + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } });
      var c = Math.cos(-ang), s = Math.sin(-ang);
      S.ang = ang;
      S.poly = poly.map(function (q) { return [q[0] * c - q[1] * s, q[0] * s + q[1] * c]; });
      S.acceso = acc ? acc.map(function (q) { var x = (q[0] - l0[0]) * k, y = (q[1] - l0[1]) * k; return [x * c - y * s, x * s + y * c]; }) : null;
      if (polyArea(S.poly) > 0) S.poly.reverse();   // mismo sentido que las construcciones: la normal (dy, −dx) apunta hacia afuera
      selL.value = String(n);
      agro(n);
      arboles(n);
      S.items.forEach(function (it) { if (malo(it)) { it.rot = 0; ubicar(it); } });
      if (!S.items.length) add("casa");
      encuadre();
      acercar();
      draw();
    }
    // Vista inicial: acercada a la construcción elegida (el botón de la casa muestra el lote completo)
    function acercar() {
      var it = S.items[S.sel] || S.items[0];
      S.zoom = 1; S.pan = [0, 0];
      if (!it) return;
      var c = P(it.x, it.y, 0), b = S.base, z = S.vista === "iso" ? 2.1 : 1.6;
      S.zoom = z;
      S.pan = [c[0] - (b[0] + b[2] / 2), c[1] - (b[1] + b[3] / 2)];
    }
    // Segmentos de las calles del plano (servidumbres como polígonos; en Puerto Varas, líneas con H y V)
    function tramos(d) {
      var out = [], cur = null, ini = null, re = /([MLHVZ])([^MLHVZ]*)/gi, m;
      while ((m = re.exec(d))) {
        var c = m[1].toUpperCase(), v = m[2].trim() ? m[2].trim().split(/[ ,]+/).map(Number) : [];
        if (c === "M") { cur = [v[0], v[1]]; ini = cur; for (var i = 2; i + 1 < v.length; i += 2) { var q = [v[i], v[i + 1]]; out.push([cur, q]); cur = q; } }
        else if (c === "L") for (var j = 0; j + 1 < v.length; j += 2) { var q2 = [v[j], v[j + 1]]; out.push([cur, q2]); cur = q2; }
        else if (c === "H") v.forEach(function (x) { var q3 = [x, cur[1]]; out.push([cur, q3]); cur = q3; });
        else if (c === "V") v.forEach(function (y) { var q4 = [cur[0], y]; out.push([cur, q4]); cur = q4; });
        else if (c === "Z" && cur && ini) { out.push([cur, ini]); cur = ini; }
      }
      return out;
    }
    // El acceso es el deslinde del lote más cercano a una calle o servidumbre (lo que mejor lo toca en todo su largo)
    function acceso(raw, pl) {
      var segs = [];
      (pl.calles || []).forEach(function (c) { segs = segs.concat(tramos(c.d)); });
      if (pl.caminoPrincipal) segs = segs.concat(tramos(pl.caminoPrincipal));
      if (!segs.length) return null;
      var best = null, bd = Infinity;
      raw.forEach(function (a, i) {
        var b = raw[(i + 1) % raw.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 4) return;
        var d = 0;
        [0.25, 0.5, 0.75].forEach(function (f) {
          var q = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], m2v = Infinity;
          segs.forEach(function (sg) { m2v = Math.min(m2v, distSeg(q, sg[0], sg[1])); });
          d += m2v;
        });
        if (d < bd) { bd = d; best = [a, b]; }
      });
      return best;
    }
    function setProyecto(id, n) {
      S.p = proyecto(id) || con[0];
      selP.value = S.p.id;
      var ls = lotes(S.p);
      selL.innerHTML = ls.map(function (l) {
        return '<option value="' + l.n + '">Lote ' + l.n + (l.m2 !== 5000 ? " · " + m2(l.m2) : "") + (l.estado === "reservada" ? " (reservado)" : "") + "</option>";
      }).join("");
      var lo = ls.filter(function (l) { return l.n === n; })[0] || ls.filter(function (l) { return l.estado === "disponible"; })[0] || ls[0];
      if (lo) setLote(lo.n);
    }
    // Árboles de ambientación cerca de los deslindes (siempre los mismos para cada lote); no cuentan como construcción
    function arboles(n) {
      var seed = n * 9301 + 49297, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      var xs = S.poly.map(function (q) { return q[0]; }), ys = S.poly.map(function (q) { return q[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      S.arboles = [];
      for (var i = 0; i < 400 && S.arboles.length < 14; i++) {
        var p = [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)];
        if (!inside(p, S.poly) || (S.agro && inside(p, S.agro.mitad))) continue;
        var d = distBorde(p);
        if (d < 2.5 || d > 9) continue;
        if (S.arboles.some(function (t) { return Math.hypot(t[0] - p[0], t[1] - p[1]) < 8; })) continue;
        S.arboles.push([p[0], p[1], 3.6 + rnd() * 2.4]);
      }
    }
    function encuadre() {
      var ps = [];
      S.poly.forEach(function (q) { ps.push(P(q[0], q[1], 0)); ps.push(P(q[0], q[1], 6)); });
      var xs = ps.map(function (q) { return q[0]; }), ys = ps.map(function (q) { return q[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var pad = Math.max(x1 - x0, y1 - y0) * 0.07 + 3;
      S.base = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
    }
    function viewBox() {
      var b = S.base, w = b[2] / S.zoom, h = b[3] / S.zoom, cx = b[0] + b[2] / 2 + S.pan[0], cy = b[1] + b[3] / 2 + S.pan[1];
      return [cx - w / 2, cy - h / 2, w, h];
    }

    function add(id) {
      var t = tipo(id);
      if (!t) return;
      if (t.vivienda && nCasas() >= MAXCASAS) { S.aviso = "Máximo " + MAXCASAS + " casas por parcela: quita una para agregar otra."; return false; }
      var it = { key: ++S.seq, tipo: t.id, nombre: t.nombre, w: t.w, h: t.h, x: 0, y: 0, rot: 0, dos: !!t.dosAguas };
      ubicar(it);
      S.items.push(it);
      S.sel = S.items.length - 1;
      return true;
    }

    function mk(tag, at, parent) {
      var n = document.createElementNS(NS, tag);
      if (at.fill) { n.style.fill = at.raw ? at.fill : amb(at.fill); delete at.fill; delete at.raw; }
      for (var k in at) n.setAttribute(k, at[k]);
      if (parent) parent.appendChild(n);
      return n;
    }
    function rgb(c) {
      if (c.charAt(0) === "#") { var n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
      return c.replace(/[^\d,]/g, "").split(",").slice(0, 3).map(Number);
    }
    function tono(hex, f) {   // aclara (f > 0) u oscurece (f < 0) un color
      var m = function (v) { return Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)); };
      return "rgb(" + rgb(hex).map(m).join(",") + ")";
    }
    // Luz ambiente según la altura del sol: día, hora dorada, crepúsculo y noche
    function amb(c) {
      var L = S.luz || { k: 0, dark: 0 }, v = rgb(c);
      if (!L.k && !L.dark) return c;
      return "rgb(" + v.map(function (x, i) { return Math.round((x + (L.tint[i] - x) * L.k) * (1 - L.dark)); }).join(",") + ")";
    }

    /* ---- Sol: posición según latitud del proyecto, estación y hora (el norte del plano se supone hacia arriba) ---- */
    var LAT = { "puerto-varas": -41.4, "malalcahuello": -38.4, "marchigue": -34.4 };
    var DECL = { verano: -23.44, otono: 0, invierno: 23.44 };   // hemisferio sur: verano en diciembre
    function sol() {
      var rad = Math.PI / 180, phi = (LAT[S.p && S.p.id] || -38) * rad, dec = DECL[S.estacion] * rad;
      // Hora solar ≈ hora de reloj − 0,85 h (UTC−4, 72,8° O); en verano hay una hora más de adelanto
      var hs = S.hora - (S.estacion === "verano" ? 1.85 : 0.85), H = (hs - 12) * 15 * rad;
      var alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
      var az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H));   // desde el norte, hacia el este
      var c = Math.cos(-S.ang), s = Math.sin(-S.ang), N = [s, -c], E = [c, s];   // norte y este del plano en el marco del lote
      var dir = [Math.sin(az) * E[0] + Math.cos(az) * N[0], Math.sin(az) * E[1] + Math.cos(az) * N[1]];
      var altG = alt / rad, largo = altG > 0 ? Math.min(5, 1 / Math.tan(Math.max(alt, 0.17))) : 0;
      S.sd = altG > 0 ? dir : [0, 0];
      S.N = N;
      SOL = [-dir[0] * largo, -dir[1] * largo];
      S.alt = altG;
      S.luz = altG <= -4 ? { fase: "noche", k: 0.3, dark: 0.55, tint: [40, 60, 120] }
        : altG <= 0 ? { fase: "crepusculo", k: 0.28, dark: 0.3, tint: [190, 110, 100] }
        : altG <= 12 ? { fase: "dorada", k: 0.2, dark: 0.04, tint: [255, 168, 92] }
        : { fase: "dia", k: 0, dark: 0, tint: [0, 0, 0] };
    }
    function hull(p) {
      p = p.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      var cr = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
      var lo = [], up = [];
      p.forEach(function (q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
      p.slice().reverse().forEach(function (q) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); });
      return lo.slice(0, -1).concat(up.slice(0, -1));
    }
    var SOL = [-0.2, 0.85];   // sombra por metro de alto (la calcula sol())
    function cara(n) {   // luz de una cara según hacia dónde mira respecto del sol
      if (S.alt <= 0) return -0.12;
      return (n[0] * S.sd[0] + n[1] * S.sd[1]) > 0 ? 0.12 : -0.22;
    }

    // Volumen genérico: muros visibles con sombreado, ventanas, puerta y techo
    function volumen(g, it, t, bad) {
      var cs = corners(it), H = t.alto, iso = S.vista === "iso";
      var techo = bad ? "#E9A08C" : t.techo;
      if (t.forma === "piscina") { piscina(g, it, cs, bad); return; }
      if (!iso && dosAguas(it, t)) { mk("polygon", { points: pts(cs), class: "casa-planta", fill: techo, "data-act": "move" }, g); techoDos(g, it, dosAguas(it, t), 0, techo); if (t.corredor) corredor(g, it, t, 0, techo); return; }
      if (!iso) {
        mk("polygon", { points: pts(cs), fill: t.forma === "pergola" ? tono(t.techo, 0.25) : techo, class: "casa-planta", "data-act": "move" }, g);
        if (t.forma === "pergola") for (var k = 1; k < 4; k++) {
          var a = [cs[0][0] + (cs[1][0] - cs[0][0]) * k / 4, cs[0][1] + (cs[1][1] - cs[0][1]) * k / 4], b = [cs[3][0] + (cs[2][0] - cs[3][0]) * k / 4, cs[3][1] + (cs[2][1] - cs[3][1]) * k / 4];
          mk("line", { x1: num(a[0]), y1: num(a[1]), x2: num(b[0]), y2: num(b[1]), class: "casa-viga" }, g);
        }
        return;
      }
      if (t.piso) mk("polygon", { points: pts(cs), fill: t.piso, "data-act": "move" }, g);
      var caras = [];
      for (var i = 0; i < 4; i++) {
        var a2 = cs[i], b2 = cs[(i + 1) % 4], nx = b2[1] - a2[1], ny = -(b2[0] - a2[0]);   // normal hacia afuera (esquinas en sentido horario en pantalla)
        var L = Math.hypot(nx, ny);
        caras.push({ a: a2, b: b2, n: [nx / L, ny / L], L: L, i: i });
      }
      var vis = caras.filter(function (c) { return c.n[0] + c.n[1] > 0.01; });
      if (t.forma === "pergola") {
        var e = 0.22, post = cs.map(function (q) { return [q[0] + (it.x - q[0]) * e / (it.w / 2), q[1] + (it.y - q[1]) * e / (it.h / 2)]; });
        post.slice().sort(function (p1, p2) { return prof(p1[0], p1[1]) - prof(p2[0], p2[1]); }).forEach(function (q) {
          var s0 = P(q[0], q[1], 0), s1 = P(q[0], q[1], H);
          mk("line", { x1: num(s0[0]), y1: num(s0[1]), x2: num(s1[0]), y2: num(s1[1]), stroke: tono(t.muro, -0.15), "stroke-width": 0.3, "data-act": "move" }, g);
        });
        vis.forEach(function (c) {
          mk("polygon", { points: pts([[c.a[0], c.a[1], H - 0.3], [c.b[0], c.b[1], H - 0.3], [c.b[0], c.b[1], H], [c.a[0], c.a[1], H]]), fill: tono(t.techo, -0.25), "data-act": "move" }, g);
        });
        mk("polygon", { points: pts(cs.map(function (q) { return [q[0], q[1], H]; })), fill: techo, class: "casa-techo", "data-act": "move" }, g);
        return;
      }
      var dos = dosAguas(it, t), frontones = dos ? (dos.alongX ? [1, 3] : [0, 2]) : [];
      var puerta = t.puerta ? vis.slice().sort(function (c1, c2) { return (c2.n[0] + c2.n[1]) - (c1.n[0] + c1.n[1]); })[0] : null;
      vis.forEach(function (c) {
        var luz = cara(c.n);   // la cara que mira al sol recibe más luz
        var muro = [[c.a[0], c.a[1], 0], [c.b[0], c.b[1], 0], [c.b[0], c.b[1], H]];
        if (frontones.indexOf(c.i) >= 0) muro.push([(c.a[0] + c.b[0]) / 2, (c.a[1] + c.b[1]) / 2, H + dos.R]);   // frontón
        muro.push([c.a[0], c.a[1], H]);
        mk("polygon", { points: pts(muro), fill: bad ? "#C9705A" : tono(t.muro, luz), "data-act": "move" }, g);
        var at = function (d, z) { return [c.a[0] + (c.b[0] - c.a[0]) * d / c.L, c.a[1] + (c.b[1] - c.a[1]) * d / c.L, z]; };
        if (t.tablas) {   // tinglado de madera: tablas horizontales cada 30 cm
          var tl = "";
          for (var zt = 0.3; zt < H - 0.1; zt += 0.3) { var t1 = P.apply(null, at(0, zt)), t2 = P.apply(null, at(c.L, zt)); tl += "M" + num(t1[0]) + " " + num(t1[1]) + "L" + num(t2[0]) + " " + num(t2[1]); }
          mk("path", { d: tl, class: "casa-tabla", stroke: tono(bad ? "#C9705A" : t.muro, luz - 0.18) }, g);
        }
        var desde = 0.8;
        if (c === puerta && c.L > 2.6) {
          mk("polygon", { points: pts([at(0.8, 0), at(1.85, 0), at(1.85, Math.min(2.2, H - 0.4)), at(0.8, Math.min(2.2, H - 0.4))]), fill: "#6E4426", class: "casa-puerta" }, g);
          desde = 2.6;
        }
        var np = t.pisos || 1, hp = H / np;
        if (t.faja) for (var f = 1; f < np; f++) {
          mk("polygon", { points: pts([at(0, f * hp - 0.12), at(c.L, f * hp - 0.12), at(c.L, f * hp + 0.18), at(0, f * hp + 0.18)]), fill: bad ? "#A85843" : tono(t.faja, luz), class: "casa-faja" }, g);
        }
        if (!t.ventanas) return;
        for (var pf = 0; pf < np; pf++) {
          var ini = pf === 0 ? desde : 0.8, libre = c.L - ini - 0.8, nV = Math.floor((libre + 0.9) / 3.1);
          if (nV < 1) continue;
          var vw = Math.min(2.4, (libre - (nV - 1) * 0.9) / nV), paso = (libre - nV * vw) / Math.max(1, nV - 1);
          for (var v = 0; v < nV; v++) {
            var d0 = ini + (nV === 1 ? (libre - vw) / 2 : v * (vw + paso)), z0 = pf * hp + hp * 0.3, z1 = pf * hp + hp * 0.78;
            mk("polygon", S.alt <= 0 ? { points: pts([at(d0, z0), at(d0 + vw, z0), at(d0 + vw, z1), at(d0, z1)]), class: "casa-vidrio is-luz", fill: "#FFD27A", raw: 1 }
              : { points: pts([at(d0, z0), at(d0 + vw, z0), at(d0 + vw, z1), at(d0, z1)]), class: "casa-vidrio", fill: "#D7E7EE" }, g);
            if (t.tablas) {   // ventana de campo: marco blanco con cruz
              var m1 = P.apply(null, at(d0 + vw / 2, z0)), m2 = P.apply(null, at(d0 + vw / 2, z1)), m3 = P.apply(null, at(d0, (z0 + z1) / 2)), m4 = P.apply(null, at(d0 + vw, (z0 + z1) / 2));
              mk("path", { d: "M" + num(m1[0]) + " " + num(m1[1]) + "L" + num(m2[0]) + " " + num(m2[1]) + "M" + num(m3[0]) + " " + num(m3[1]) + "L" + num(m4[0]) + " " + num(m4[1]), class: "casa-marco" }, g);
            }
          }
        }
      });
      if (dos) techoDos(g, it, dos, H, techo);
      else mk("polygon", { points: pts(cs.map(function (q) { return [q[0], q[1], H]; })), fill: techo, class: "casa-techo", "data-act": "move" }, g);
      if (t.chimenea) {   // chimenea de ladrillo sobre la cumbrera (o el techo plano), hacia un extremo
        var ex = it.w >= it.h ? [it.w * 0.28, 0] : [0, it.h * 0.28], ch = aMundo(it, ex[0], ex[1], 0), zc = H + (dos ? dos.R : 0);
        caja(g, ch[0], ch[1], 0.75, 0.75, it.rot, zc - 0.5, zc + 0.9, bad ? "#C9705A" : "#8C5A43", "#3A2C24");
      }
      if (t.corredor) corredor(g, it, t, H, techo);
    }
    // Corredor de campo: piso de madera, pilares y techo de zinc en el lado largo que mira al frente
    function corredor(g, it, t, H, techo) {
      var cs = corners(it), iso = S.vista === "iso", lados = it.w >= it.h ? [0, 2] : [1, 3], D = 2.2, best = null;
      lados.forEach(function (i) {
        var a = cs[i], b = cs[(i + 1) % 4], nx = b[1] - a[1], ny = -(b[0] - a[0]), L = Math.hypot(nx, ny), n = [nx / L, ny / L];
        if (!best || n[0] + n[1] > best.n[0] + best.n[1]) best = { a: a, b: b, n: n, L: L };
      });
      var a = best.a, b = best.b, n = best.n, fa = [a[0] + n[0] * D, a[1] + n[1] * D], fb = [b[0] + n[0] * D, b[1] + n[1] * D];
      if (!iso) {
        mk("polygon", { points: pts([a, b, fb, fa]), class: "casa-corredor-p", fill: tono(techo, 0.22), "data-act": "move" }, g);
        return;
      }
      var zp = 0.2, zt = H - 0.18, zl = Math.max(2.2, zt - 0.55);
      mk("polygon", { points: pts([[a[0], a[1], zp], [b[0], b[1], zp], [fb[0], fb[1], zp], [fa[0], fa[1], zp]]), fill: "#B38455", "data-act": "move" }, g);
      mk("polygon", { points: pts([[fa[0], fa[1], 0], [fb[0], fb[1], 0], [fb[0], fb[1], zp], [fa[0], fa[1], zp]]), fill: "#7E5A38", "data-act": "move" }, g);
      var nP = Math.max(2, Math.ceil(best.L / 3.2) + 1), pl = "";
      for (var k = 0; k < nP; k++) {
        var f = k / (nP - 1), q = [fa[0] + (fb[0] - fa[0]) * f - n[0] * 0.15, fa[1] + (fb[1] - fa[1]) * f - n[1] * 0.15];
        var p0 = P(q[0], q[1], zp), p1 = P(q[0], q[1], zl); pl += "M" + num(p0[0]) + " " + num(p0[1]) + "L" + num(p1[0]) + " " + num(p1[1]);
      }
      mk("path", { d: pl, class: "casa-pilar" }, g);
      var luz = S.alt <= 0 ? -0.05 : (n[0] * S.sd[0] + n[1] * S.sd[1]) > 0 ? 0.16 : -0.1;
      mk("polygon", { points: pts([[a[0], a[1], zt], [b[0], b[1], zt], [fb[0] + n[0] * 0.2, fb[1] + n[1] * 0.2, zl - 0.06], [fa[0] + n[0] * 0.2, fa[1] + n[1] * 0.2, zl - 0.06]]), fill: tono(techo, luz), class: "casa-techo", "data-act": "move" }, g);
      mk("polygon", { points: pts([[fa[0] + n[0] * 0.2, fa[1] + n[1] * 0.2, zl - 0.06], [fb[0] + n[0] * 0.2, fb[1] + n[1] * 0.2, zl - 0.06], [fb[0] + n[0] * 0.2, fb[1] + n[1] * 0.2, zl - 0.22], [fa[0] + n[0] * 0.2, fa[1] + n[1] * 0.2, zl - 0.22]]), fill: tono(techo, -0.3), "data-act": "move" }, g);
    }
    // Techo a dos aguas: cumbrera a lo largo del lado mayor, 25° de pendiente (máx. 2,4 m de alto) y 35 cm de alero
    function dosAguas(it, t) {
      if (!t.techoOp || !it.dos) return null;
      var alongX = it.w >= it.h, span = Math.min(it.w, it.h), R = Math.min(span / 2 * 0.47, 2.4);
      return { alongX: alongX, R: R, ov: 0.35, s: R / (span / 2) };
    }
    function aMundo(it, lx, ly, z) {
      var r = it.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
      return [it.x + lx * c - ly * s, it.y + lx * s + ly * c, z];
    }
    function aguas(it, dos, H) {
      var ov = dos.ov, ze = H - ov * dos.s, zr = H + dos.R, hw = it.w / 2, hh = it.h / 2, A, B2;
      if (dos.alongX) {
        A = [[-hw - ov, -hh - ov, ze], [hw + ov, -hh - ov, ze], [hw + ov, 0, zr], [-hw - ov, 0, zr]];
        B2 = [[-hw - ov, hh + ov, ze], [hw + ov, hh + ov, ze], [hw + ov, 0, zr], [-hw - ov, 0, zr]];
        return [{ q: A, n: [0, -1] }, { q: B2, n: [0, 1] }];
      }
      A = [[-hw - ov, -hh - ov, ze], [-hw - ov, hh + ov, ze], [0, hh + ov, zr], [0, -hh - ov, zr]];
      B2 = [[hw + ov, -hh - ov, ze], [hw + ov, hh + ov, ze], [0, hh + ov, zr], [0, -hh - ov, zr]];
      return [{ q: A, n: [-1, 0] }, { q: B2, n: [1, 0] }];
    }
    function techoDos(g, it, dos, H, color) {
      var r = it.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), iso = S.vista === "iso";
      var planos2 = aguas(it, dos, H).map(function (pl) {
        var n = [pl.n[0] * c - pl.n[1] * s, pl.n[0] * s + pl.n[1] * c];
        return { q: pl.q.map(function (v) { return aMundo(it, v[0], v[1], iso ? v[2] : 0); }), n: n };
      }).sort(function (a, b) { return (a.n[0] + a.n[1]) - (b.n[0] + b.n[1]); });
      planos2.forEach(function (pl) {
        var luz = S.alt <= 0 ? -0.05 : (pl.n[0] * S.sd[0] + pl.n[1] * S.sd[1]) > 0 ? 0.16 : -0.1;
        mk("polygon", { points: pts(pl.q), fill: tono(color.charAt(0) === "#" ? color : "#E9A08C", luz), class: "casa-techo", "data-act": "move" }, g);
      });
      var q = planos2[1].q, k1 = P.apply(null, q[2]), k2 = P.apply(null, q[3]);
      mk("line", { x1: num(k1[0]), y1: num(k1[1]), x2: num(k2[0]), y2: num(k2[1]), class: "casa-cumbrera" }, g);
    }
    // Piscina: borde de piedra, muros interiores del fondo y agua (en planta, borde y agua)
    function piscina(g, it, cs, bad) {
      var iso = S.vista === "iso", b = 0.5;
      var inn = corners({ x: it.x, y: it.y, w: Math.max(0.5, it.w - 2 * b), h: Math.max(0.5, it.h - 2 * b), rot: it.rot });
      mk("polygon", { points: pts(cs), class: "casa-pisc-borde" + (bad ? " is-bad" : ""), fill: bad ? "#F4C4B6" : "#ECE6DA", "data-act": "move" }, g);
      if (iso) {
        var hd = 0.9;
        for (var i = 0; i < 4; i++) {
          var a = inn[i], c2 = inn[(i + 1) % 4], nx = c2[1] - a[1], ny = -(c2[0] - a[0]);
          if (nx + ny < -0.01) mk("polygon", { points: pts([[a[0], a[1], 0], [c2[0], c2[1], 0], [c2[0], c2[1], -hd], [a[0], a[1], -hd]]), class: "casa-pisc-muro", fill: "#4F9FB8", "data-act": "move" }, g);
        }
        mk("polygon", { points: pts(inn.map(function (q) { return [q[0], q[1], -0.25]; })), class: "casa-agua", fill: "#79C3D8", "data-act": "move" }, g);
      } else {
        mk("polygon", { points: pts(inn), class: "casa-agua", fill: "#79C3D8", "data-act": "move" }, g);
      }
      // Brillos en el agua
      var z = iso ? -0.25 : 0, at = function (u2, v2) { return [inn[0][0] + (inn[1][0] - inn[0][0]) * u2 + (inn[3][0] - inn[0][0]) * v2, inn[0][1] + (inn[1][1] - inn[0][1]) * u2 + (inn[3][1] - inn[0][1]) * v2, z]; };
      [[0.2, 0.35, 0.45], [0.5, 0.6, 0.78]].forEach(function (r) {
        var p1 = P.apply(null, at(r[0], r[1])), p2 = P.apply(null, at(r[2], r[1]));
        mk("line", { x1: num(p1[0]), y1: num(p1[1]), x2: num(p2[0]), y2: num(p2[1]), class: "casa-brillo" }, g);
      });
    }
    function arbol(g, t) {
      var x = t[0], y = t[1], h = t[2], r = h * 0.42, iso = S.vista === "iso";
      var sh = P(x + SOL[0] * h * 0.6, y + SOL[1] * h * 0.6, 0), sl = Math.hypot(SOL[0], SOL[1]);
      if (S.alt > 0) mk("ellipse", { cx: num(sh[0]), cy: num(sh[1]), rx: num(r * (1 + sl * 0.12)), ry: num(r * (iso ? 0.55 : 1)), class: "casa-sombra" }, g);
      if (!iso) { mk("circle", { cx: num(x), cy: num(y), r: num(r), class: "casa-copa", fill: "#7E9A67" }, g); return; }
      var s0 = P(x, y, 0), s1 = P(x, y, h * 0.55), sc = P(x, y, h * 0.62);
      mk("line", { x1: num(s0[0]), y1: num(s0[1]), x2: num(s1[0]), y2: num(s1[1]), class: "casa-tronco" }, g);
      mk("circle", { cx: num(sc[0]), cy: num(sc[1]), r: num(r), class: "casa-copa", fill: "#7E9A67" }, g);
      mk("circle", { cx: num(sc[0] - r * 0.28), cy: num(sc[1] - r * 0.3), r: num(r * 0.5), class: "casa-copa-luz" }, g);
    }
    // Frutal (copa redonda y baja con frutos) o nativo (más alto, verde oscuro e irregular)
    function arbolAgro(g, t) {
      var iso = S.vista === "iso", f = t.k === "f", h = t.h, r = f ? 1.55 : h * 0.3;
      var verde = f ? "#6F9452" : (t.v > 0.5 ? "#4C6B43" : "#5D7A4A");
      if (S.alt > 0) { var sh = P(t.x + SOL[0] * h * 0.6, t.y + SOL[1] * h * 0.6, 0); mk("ellipse", { cx: num(sh[0]), cy: num(sh[1]), rx: num(r * 1.05), ry: num(r * (iso ? 0.55 : 1)), class: "casa-sombra" }, g); }
      if (!iso) {
        mk("circle", { cx: num(t.x), cy: num(t.y), r: num(r), class: "casa-copa", fill: verde }, g);
        if (f) mk("circle", { cx: num(t.x + r * 0.3), cy: num(t.y - r * 0.2), r: num(r * 0.22), fill: S.agro.cfg.fruta }, g);
        return;
      }
      var s0 = P(t.x, t.y, 0), s1 = P(t.x, t.y, h * (f ? 0.45 : 0.5)), sc = P(t.x, t.y, h * (f ? 0.62 : 0.66));
      mk("line", { x1: num(s0[0]), y1: num(s0[1]), x2: num(s1[0]), y2: num(s1[1]), class: "casa-tronco" }, g);
      mk("circle", { cx: num(sc[0]), cy: num(sc[1]), r: num(r), class: "casa-copa", fill: verde }, g);
      if (f) {
        [[-0.45, 0.1], [0.35, -0.25], [0.1, 0.45]].forEach(function (o) { mk("circle", { cx: num(sc[0] + o[0] * r), cy: num(sc[1] + o[1] * r), r: num(r * 0.16), fill: S.agro.cfg.fruta }, g); });
      } else {
        mk("circle", { cx: num(sc[0] + r * 0.45), cy: num(sc[1] - r * 0.55), r: num(r * 0.7), class: "casa-copa", fill: tono(verde, 0.08) }, g);
      }
      mk("circle", { cx: num(sc[0] - r * 0.28), cy: num(sc[1] - r * 0.3), r: num(r * 0.45), class: "casa-copa-luz" }, g);
    }
    // Cota: línea paralela a un borde, separada hacia afuera, con remates y el largo en metros
    function cota(g, a, b, n, sep, u, txt) {
      var o = [n[0] * sep, n[1] * sep], A = [a[0] + o[0], a[1] + o[1]], Bp = [b[0] + o[0], b[1] + o[1]];
      var t = 0.7, pa = P(A[0], A[1]), pb = P(Bp[0], Bp[1]);
      mk("line", { x1: num(pa[0]), y1: num(pa[1]), x2: num(pb[0]), y2: num(pb[1]), class: "casa-cota" }, g);
      [A, Bp].forEach(function (q) {
        var q1 = P(q[0] - n[0] * t, q[1] - n[1] * t), q2 = P(q[0] + n[0] * t, q[1] + n[1] * t);
        mk("line", { x1: num(q1[0]), y1: num(q1[1]), x2: num(q2[0]), y2: num(q2[1]), class: "casa-cota" }, g);
      });
      var m = P((A[0] + Bp[0]) / 2 + n[0] * 1.6 * u, (A[1] + Bp[1]) / 2 + n[1] * 1.6 * u);
      var tx = mk("text", { x: num(m[0]), y: num(m[1]), "font-size": num(1.9 * u), class: "casa-cota-t" }, g);
      tx.textContent = txt;
    }

    function draw() {
      sol();
      $$(":scope > :not(title)", svg).forEach(function (n) { n.remove(); });
      var vb = viewBox(), u = Math.max(S.base[2], S.base[3]) / 100 / S.zoom, iso = S.vista === "iso";
      svg.setAttribute("viewBox", vb.map(num).join(" "));
      svg.style.setProperty("--cu", u);
      svg.classList.toggle("is-iso", iso);
      svg.classList.toggle("is-zoom", S.zoom > 1.01);
      var defs = mk("defs", {}, svg), cp = mk("clipPath", { id: "casa-clip" }, defs);
      mk("polygon", { points: pts(S.poly) }, cp);
      // Fondo: campo alrededor (atrapa los toques fuera del lote)
      mk("rect", { x: num(vb[0] - vb[2]), y: num(vb[1] - vb[3]), width: num(vb[2] * 3), height: num(vb[3] * 3), class: "casa-fondo", fill: "#EDE6DA", "data-act": "fondo" }, svg);
      mk("polygon", { points: pts(S.poly), class: "casa-lote", fill: "#D3DDBE", "data-act": "fondo" }, svg);
      // Cuadrícula de 5 m (más marcada cada 10 m) sobre el suelo
      var xs = S.poly.map(function (q) { return q[0]; }), ys = S.poly.map(function (q) { return q[1]; });
      var x0 = Math.floor(Math.min.apply(null, xs) / 5) * 5, x1 = Math.max.apply(null, xs), y0 = Math.floor(Math.min.apply(null, ys) / 5) * 5, y1 = Math.max.apply(null, ys);
      var gr = mk("g", { class: "casa-grid", "clip-path": "url(#casa-clip)" }, svg), d5 = "", d10 = "";
      var seg = function (a, b) { var p1 = P(a[0], a[1]), p2 = P(b[0], b[1]); return "M" + num(p1[0]) + " " + num(p1[1]) + "L" + num(p2[0]) + " " + num(p2[1]); };
      for (var x = x0; x <= x1; x += 5) { var s1 = seg([x, y0], [x, y1]); if (x % 10) d5 += s1; else d10 += s1; }
      for (var y = y0; y <= y1; y += 5) { var s2 = seg([x0, y], [x1, y]); if (y % 10) d5 += s2; else d10 += s2; }
      mk("path", { d: d5, class: "g5" }, gr); mk("path", { d: d10, class: "g10" }, gr);
      // Área agroresidencial: frutales en hileras y conservación natural, con su límite (no construible)
      if (S.agro) {
        var ga = mk("g", { class: "casa-agro" }, svg);
        mk("polygon", { points: pts(S.agro.frut), class: "casa-agro-f", fill: "#C3CF95" }, ga);
        mk("polygon", { points: pts(S.agro.cons), class: "casa-agro-c", fill: "#A9BC86" }, ga);
        mk("polygon", { points: pts(S.agro.mitad), class: "casa-agro-lim" }, ga);
      }
      mk("polygon", { points: pts(S.poly), class: "casa-borde" }, svg);
      // Largo de cada deslinde (los de más de 12 m)
      var gl = mk("g", { class: "casa-deslindes" }, svg);
      S.poly.forEach(function (a, i) {
        var b = S.poly[(i + 1) % S.poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 12) return;
        var n = [(b[1] - a[1]) / L, -(b[0] - a[0]) / L], m = P((a[0] + b[0]) / 2 + n[0] * 3.2 * u, (a[1] + b[1]) / 2 + n[1] * 3.2 * u);
        var esAcc = S.acceso && S.camino && Math.hypot((a[0] + b[0]) / 2 - (S.acceso[0][0] + S.acceso[1][0]) / 2, (a[1] + b[1]) / 2 - (S.acceso[0][1] + S.acceso[1][1]) / 2) < 0.5;
        var tx = mk("text", { x: num(m[0]), y: num(m[1]), "font-size": num(2.1 * u), class: esAcc ? "is-acceso" : "" }, gl); tx.textContent = Math.round(L) + " m" + (esAcc ? " · acceso" : "");
      });
      // Camino de acceso: desde el deslinde que da a la calle hasta la casa principal (se recalcula al moverla)
      var cam = camino();
      if (cam) {
        var gc = mk("g", { class: "casa-camino" }, svg);
        mk("polygon", { points: pts(cam.poly), class: "casa-camino-ripio", fill: "#DCCFB4" }, gc);
        [[cam.l0, cam.l1], [cam.r0, cam.r1]].forEach(function (b) { var a1 = P(b[0][0], b[0][1]), a2 = P(b[1][0], b[1][1]); mk("line", { x1: num(a1[0]), y1: num(a1[1]), x2: num(a2[0]), y2: num(a2[1]), class: "casa-camino-borde" }, gc); });
        cam.postes.forEach(function (q) {
          var b0 = P(q[0], q[1], 0), b1 = P(q[0], q[1], iso ? 1.5 : 0);
          if (iso) mk("line", { x1: num(b0[0]), y1: num(b0[1]), x2: num(b1[0]), y2: num(b1[1]), class: "casa-poste" }, gc);
          else mk("circle", { cx: num(b0[0]), cy: num(b0[1]), r: 0.45, class: "casa-poste-p" }, gc);
        });
      }
      // Sombras en el suelo
      var gs = mk("g", { class: "casa-sombras" }, svg);
      if (S.alt > 0) S.items.forEach(function (it) {
        var t = tipo(it.tipo), cs = corners(it), dz = dosAguas(it, t), H = t.alto + (dz ? dz.R * 0.5 : 0);
        if (!t.alto) return;
        var sh = hull(cs.concat(cs.map(function (q) { return [q[0] + SOL[0] * H, q[1] + SOL[1] * H]; })));
        mk("polygon", { points: pts(sh), class: "casa-sombra" }, gs);
      });
      // Construcciones y árboles, de atrás hacia adelante
      var huellas = S.items.map(function (it) { return corners(it, 1.5); });
      if (cam) huellas.push(cam.zona);
      var vida = escena(cam);
      vida.forEach(function (v) { huellas.push(v.huella); });
      var cosas = S.arboles.filter(function (t) { return !huellas.some(function (h) { return inside(t, h); }); })
        .map(function (t) { return { z: prof(t[0], t[1]), t: t }; })
        .concat(vida)
        .concat(S.agro ? S.agro.arboles.map(function (t) { return { z: prof(t.x, t.y), ag: t }; }) : [])
        .concat(S.items.map(function (it, i) { return { z: tipo(it.tipo).forma === "piscina" ? -1e9 : prof(it.x, it.y), it: it, i: i }; }))
        .sort(function (a, b) { return a.z - b.z; });
      cosas.forEach(function (c) {
        if (c.t) { arbol(mk("g", { class: "casa-arbol" }, svg), c.t); return; }
        if (c.ag) { arbolAgro(mk("g", { class: "casa-arbol" }, svg), c.ag); return; }
        if (c.auto) { auto(mk("g", { class: "casa-deco" }, svg), c.auto); return; }
        if (c.persona) { persona(mk("g", { class: "casa-deco" }, svg), c.persona); return; }
        var it = c.it, i = c.i, bad = malo(it), on = i === S.sel;
        var g = mk("g", { class: "casa-it casa-" + it.tipo + (on ? " is-sel" : "") + (bad ? " is-bad" : ""), tabindex: "0", role: "button", "data-i": i,
          "aria-label": it.nombre + ", " + fmt(it.w) + " por " + fmt(it.h) + " metros" + (fuera(it) ? ", fuera del lote" : bad ? ", sobre el área de frutales o conservación" : "") }, svg);
        volumen(g, it, tipo(it.tipo), bad);
      });
      if (S.agro) [[S.agro.frut, "Frutales · 25 %"], [S.agro.cons, "Conservación natural · 25 %"]].forEach(function (z) {
        if (z[0].length < 3) return;
        var c0 = centro(z[0]), q = P(c0[0], c0[1], 0);
        var tx = mk("text", { x: num(q[0]), y: num(q[1]), "font-size": num(2.1 * u), class: "casa-agro-t" }, svg); tx.textContent = z[1];
      });
      // Seleccionada: contorno, cotas y manillas (tamaño en la esquina más cercana, giro más allá de una cota)
      var it = S.items[S.sel];
      if (it) {
        var t = tipo(it.tipo), cs = corners(it), H = iso ? t.alto : 0, gsel = mk("g", { class: "casa-selg" }, svg);
        mk("polygon", { points: pts(cs.map(function (q) { return [q[0], q[1], H]; })), class: "casa-sel-borde" }, gsel);
        var k = 0; cs.forEach(function (q, j) { if (prof(q[0], q[1]) > prof(cs[k][0], cs[k][1])) k = j; });
        var prev = cs[(k + 3) % 4], next = cs[(k + 1) % 4], q0 = cs[k];
        var nrm = function (a, b) { var L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[1] - a[1]) / L, -(b[0] - a[0]) / L]; };
        var n1 = nrm(prev, q0), n2 = nrm(q0, next);
        var L1 = Math.hypot(q0[0] - prev[0], q0[1] - prev[1]), L2 = Math.hypot(next[0] - q0[0], next[1] - q0[1]);
        cota(gsel, prev, q0, n1, 1.8, u, fmt(L1) + " m");
        cota(gsel, q0, next, n2, 1.8, u, fmt(L2) + " m");
        var hr = 1.5 * u, pc = P(q0[0], q0[1]);
        var rq = [(q0[0] + next[0]) / 2 + n2[0] * (1.8 + 5.2 * u), (q0[1] + next[1]) / 2 + n2[1] * (1.8 + 5.2 * u)], pr = P(rq[0], rq[1]);
        var hs = mk("g", { class: "casa-it-h", "data-i": S.sel }, gsel);
        mk("circle", { cx: num(pr[0]), cy: num(pr[1]), r: num(hr * 1.15), class: "casa-h casa-h-rot", "data-act": "rot" }, hs);
        var ic = mk("use", { href: "#i-rotate", x: num(pr[0] - hr * 0.8), y: num(pr[1] - hr * 0.8), width: num(hr * 1.6), height: num(hr * 1.6), class: "casa-h-ico" }, hs);
        ic.setAttribute("pointer-events", "none");
        mk("rect", { x: num(pc[0] - hr), y: num(pc[1] - hr), width: num(2 * hr), height: num(2 * hr), rx: num(hr * 0.3), class: "casa-h casa-h-size", "data-act": "size" }, hs);
        // Rótulo sobre el techo
        var dz2 = dosAguas(it, t), arriba = Math.min.apply(null, cs.map(function (q) { return P(q[0], q[1], H + (iso && dz2 ? dz2.R : 0))[1]; }));
        var pl = P(it.x, it.y, H);
        var lb = mk("text", { x: num(pl[0]), y: num(arriba - 2 * u), "font-size": num(2.2 * u), class: "casa-it-t" }, gsel);
        lb.textContent = it.nombre + " · " + fmt(area(it)) + " m²";
      }
      brujula();
      panel();
    }
    // Brújula: el norte y el sol en la pantalla (en 3D, proyectados)
    function brujula() {
      var b = $("[data-c-brujula]", root);
      if (!b) return;
      var dirP = function (v) { var q = S.vista === "iso" ? [(v[0] - v[1]) * CI, (v[0] + v[1]) * SI] : v, L = Math.hypot(q[0], q[1]) || 1; return [q[0] / L, q[1] / L]; };
      var n = dirP(S.N), r = 19, nn = $("[data-c-n]", b), sp = $("[data-c-solp]", b);
      nn.style.transform = "translate(" + (n[0] * r).toFixed(1) + "px," + (n[1] * r).toFixed(1) + "px)";
      sp.hidden = S.alt <= 0;
      if (S.alt > 0) { var d = dirP(S.sd); sp.style.transform = "translate(" + (d[0] * r).toFixed(1) + "px," + (d[1] * r).toFixed(1) + "px)"; }
      b.classList.toggle("is-noche", S.alt <= 0);
      var o = $("[data-c-hora-o]", root), hh = Math.floor(S.hora), mm = Math.round((S.hora - hh) * 60);
      if (o) o.textContent = (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
      stage.setAttribute("data-luz", S.luz.fase);
    }
    // Vida en la parcela: autos en el camino y personas cerca de la casa, la piscina y el quincho (no cuentan ni se eligen)
    var ROPA = ["#2F5D8A", "#B9854A", "#7B3F61", "#3E6B4A", "#C4473A"];
    function escena(cam) {
      if (!S.vida) return [];
      var out = [], casa = S.items.filter(function (x) { return tipo(x.tipo).vivienda; })[0];
      var gente = function (x, y, k) {
        var p = { x: x, y: y, ropa: ROPA[k % ROPA.length], alto: k % 3 === 2 ? 1.2 : 1.72 };
        if (!inside([x, y], S.poly) || S.items.some(function (o) { return tipo(o.tipo).forma === "caja" && inside([x, y], corners(o, 0.3)); })) return;
        out.push({ z: prof(x, y) + 0.01, persona: p, huella: [[x - 0.6, y - 0.6], [x + 0.6, y - 0.6], [x + 0.6, y + 0.6], [x - 0.6, y + 0.6]] });
      };
      if (cam) {
        var d = cam.d, n = cam.n, c = [cam.casa.x, cam.casa.y];
        var e = Math.max.apply(null, corners(cam.casa).map(function (q) { return (q[0] - c[0]) * -d[0] + (q[1] - c[1]) * -d[1]; }));
        var ang = Math.atan2(d[1], d[0]) * 180 / Math.PI;
        var a1 = { x: c[0] - d[0] * (e + 3.2), y: c[1] - d[1] * (e + 3.2), rot: ang, color: "#A63D2F" };
        out.push({ z: prof(a1.x, a1.y), auto: a1, huella: corners({ x: a1.x, y: a1.y, w: 5.5, h: 3, rot: ang }) });
        if (cam.L > e + 16) {
          var a2 = { x: cam.p0[0] + d[0] * 5.5, y: cam.p0[1] + d[1] * 5.5, rot: ang + 180, color: "#E4E2DC" };
          out.push({ z: prof(a2.x, a2.y), auto: a2, huella: corners({ x: a2.x, y: a2.y, w: 5.5, h: 3, rot: ang }) });
        }
        // Una pareja junto al auto, frente a la casa
        var b = [c[0] - d[0] * (e + 1.6) + n[0] * 3.1, c[1] - d[1] * (e + 1.6) + n[1] * 3.1];
        gente(b[0], b[1], 0); gente(b[0] + n[0] * 0.9 - d[0] * 0.5, b[1] + n[1] * 0.9 - d[1] * 0.5, 1);
      } else if (casa) {
        var k0 = corners(casa).sort(function (p1, p2) { return prof(p2[0], p2[1]) - prof(p1[0], p1[1]); })[0];
        gente(k0[0] + 1.6, k0[1] + 1.6, 0); gente(k0[0] + 2.6, k0[1] + 1.2, 1);
      }
      S.items.forEach(function (it, i) {
        var t = tipo(it.tipo);
        if (t.forma === "piscina") {   // alguien al borde de la piscina y un niño
          var k1 = corners(it, 1).sort(function (p1, p2) { return prof(p2[0], p2[1]) - prof(p1[0], p1[1]); });
          gente(k1[0][0], k1[0][1], 2); gente(k1[1][0], k1[1][1], 3);
        } else if (t.id === "quincho") gente(it.x, it.y, 4 + i);
      });
      return out;
    }
    // Caja con muros visibles sombreados según el sol (para autos)
    function caja(g, x, y, l, w, rot, z0, z1, color, arriba) {
      var o = { x: x, y: y, w: l, h: w, rot: rot }, cs = corners(o), iso = S.vista === "iso";
      if (!iso) { mk("polygon", { points: pts(cs), fill: arriba || color }, g); return; }
      for (var i = 0; i < 4; i++) {
        var a = cs[i], b = cs[(i + 1) % 4], nx = b[1] - a[1], ny = -(b[0] - a[0]), L = Math.hypot(nx, ny);
        if ((nx + ny) / L <= 0.01) continue;
        mk("polygon", { points: pts([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]]), fill: tono(color, cara([nx / L, ny / L])) }, g);
      }
      mk("polygon", { points: pts(cs.map(function (q) { return [q[0], q[1], z1]; })), fill: arriba || tono(color, 0.08) }, g);
    }
    function auto(g, a) {
      var r = a.rot * Math.PI / 180, dx = Math.cos(r), dy = Math.sin(r);
      if (S.alt > 0) {
        var cs = corners({ x: a.x, y: a.y, w: 4.4, h: 1.8, rot: a.rot });
        mk("polygon", { points: pts(hull(cs.concat(cs.map(function (q) { return [q[0] + SOL[0] * 1.4, q[1] + SOL[1] * 1.4]; })))), class: "casa-sombra" }, g);
      }
      caja(g, a.x, a.y, 3.6, 1.7, a.rot, 0, 0.34, "#1E1E1C");                    // ruedas
      caja(g, a.x, a.y, 4.4, 1.8, a.rot, 0.3, 0.95, a.color);                     // carrocería
      caja(g, a.x - dx * 0.25, a.y - dy * 0.25, 2.3, 1.56, a.rot, 0.95, 1.45, "#8FA9B6", tono(a.color, -0.05));   // cabina con vidrios
    }
    function persona(g, p) {
      var iso = S.vista === "iso", h = p.alto, s = h / 1.72;
      if (S.alt > 0) {
        var sh = P(p.x + SOL[0] * h * 0.5, p.y + SOL[1] * h * 0.5, 0);
        mk("ellipse", { cx: num(sh[0]), cy: num(sh[1]), rx: num(0.35 + Math.hypot(SOL[0], SOL[1]) * h * 0.25), ry: num(iso ? 0.22 : 0.35), class: "casa-sombra" }, g);
      }
      if (!iso) {
        var q = P(p.x, p.y, 0);
        mk("circle", { cx: num(q[0]), cy: num(q[1]), r: num(0.32 * s), fill: p.ropa }, g);
        mk("circle", { cx: num(q[0]), cy: num(q[1]), r: num(0.16 * s), fill: "#D9AE8C" }, g);
        return;
      }
      var p0 = P(p.x, p.y, 0.05), p1 = P(p.x, p.y, 0.85 * s), p2 = P(p.x, p.y, 1.4 * s), ph = P(p.x, p.y, 1.6 * s);
      mk("line", { x1: num(p0[0]), y1: num(p0[1]), x2: num(p1[0]), y2: num(p1[1]), stroke: amb("#3B3A36"), "stroke-width": num(0.36 * s), "stroke-linecap": "round" }, g);
      mk("line", { x1: num(p1[0]), y1: num(p1[1]), x2: num(p2[0]), y2: num(p2[1]), stroke: amb(p.ropa), "stroke-width": num(0.58 * s), "stroke-linecap": "round" }, g);
      mk("circle", { cx: num(ph[0]), cy: num(ph[1]), r: num(0.2 * s), fill: "#D9AE8C" }, g);
    }
    function camino() {
      if (!S.camino || !S.acceso) return null;
      var it = S.items.filter(function (x) { return tipo(x.tipo).vivienda; })[0];
      if (!it) return null;
      var A = S.acceso[0], Bq = S.acceso[1], dx = Bq[0] - A[0], dy = Bq[1] - A[1], L2 = dx * dx + dy * dy;
      var t = clamp(((it.x - A[0]) * dx + (it.y - A[1]) * dy) / (L2 || 1), 0.12, 0.88), p0 = [A[0] + dx * t, A[1] + dy * t];
      var vx = it.x - p0[0], vy = it.y - p0[1], L = Math.hypot(vx, vy);
      if (L < 2) return null;
      var d = [vx / L, vy / L], n = [-d[1], d[0]], a = 1.8, ini = [p0[0] - d[0] * 0.6, p0[1] - d[1] * 0.6];
      var off = function (q, k) { return [q[0] + n[0] * k, q[1] + n[1] * k]; };
      return {
        poly: [off(ini, a), off([it.x, it.y], a), off([it.x, it.y], -a), off(ini, -a)],
        l0: off(ini, a), l1: off([it.x, it.y], a), r0: off(ini, -a), r1: off([it.x, it.y], -a),
        zona: [off(ini, a + 1.5), off([it.x, it.y], a + 1.5), off([it.x, it.y], -a - 1.5), off(ini, -a - 1.5)],
        postes: [off(p0, a + 0.6), off(p0, -a - 0.6)],
        afuera: [p0[0] - d[0] * 4.5, p0[1] - d[1] * 4.5],
        d: d, n: n, p0: p0, L: L, casa: it
      };
    }
    function panel() {
      var tot = total(), lim = limite(), over = tot > lim + 1e-6, nf = S.items.filter(fuera).length, na = S.items.filter(function (x) { return !fuera(x) && enAgro(x); }).length;
      var aviso = S.aviso; S.aviso = "";
      el.total.textContent = fmt(tot) + " m²";
      el.max.textContent = m2(lim);
      el.bar.style.width = Math.min(100, tot / lim * 100) + "%";
      el.meter.classList.toggle("is-over", over);
      el.msg.textContent = aviso ? aviso : over ? "Te pasaste por " + fmt(tot - lim) + " m²: achica o quita algo."
        : nf ? (nf === 1 ? "Una construcción queda fuera del lote." : nf + " construcciones quedan fuera del lote.")
        : na ? (na === 1 ? "Una construcción quedó sobre los frutales o la conservación: ahí no se puede construir." : na + " construcciones quedaron sobre los frutales o la conservación: ahí no se puede construir.")
        : "Te quedan " + fmt(lim - tot) + " m² para construir (" + Math.round(tot / lim * 100) + " % usado).";
      el.msg.classList.toggle("is-warn", over || !!nf || !!na || !!aviso);
      var nc = nCasas();
      if (el.casas) el.casas.textContent = "Casas: " + nc + " de " + MAXCASAS + " permitidas";
      $$("[data-tipo]", el.add).forEach(function (b) {
        var lleno = tipo(b.getAttribute("data-tipo")).vivienda && nc >= MAXCASAS;
        b.disabled = lleno;
        b.title = lleno ? "Máximo " + MAXCASAS + " casas por parcela" : tipo(b.getAttribute("data-tipo")).nombre;
      });
      if (S.agro && el.agroM2) {
        el.agroM2.textContent = m2(Math.round(S.agro.m2 / 10) * 10);
        el.agroF.textContent = S.agro.cfg.frutales.charAt(0).toUpperCase() + S.agro.cfg.frutales.slice(1);
        el.agroC.textContent = S.agro.cfg.nativo.charAt(0).toUpperCase() + S.agro.cfg.nativo.slice(1);
      }
      if (el.lbl) el.lbl.textContent = "Lote " + S.lote.n + " · " + m2(S.lote.m2) + " · " + S.p.nombre;
      var it = S.items[S.sel];
      el.box.hidden = !it;
      if (el.techo) {
        el.techo.hidden = !(it && tipo(it.tipo).techoOp);
        if (it) $$("[data-c-techo]", el.techo).forEach(function (b) { b.setAttribute("aria-pressed", (b.getAttribute("data-c-techo") === "dos") === !!it.dos ? "true" : "false"); });
      }
      if (el.camino) el.camino.setAttribute("aria-pressed", S.camino ? "true" : "false");
      if (el.vida) el.vida.setAttribute("aria-pressed", S.vida ? "true" : "false");
      if (it) {
        el.name.textContent = it.nombre;
        el.selm2.textContent = m2Txt(it);
        if (document.activeElement !== el.w) el.w.value = Math.round(it.w * 10) / 10;
        if (document.activeElement !== el.h) el.h.value = Math.round(it.h * 10) / 10;
      }
      var lista = S.items.map(function (x) { return x.nombre.toLowerCase() + " de " + fmt(area(x)) + " m²" + (pisos(x) > 1 ? " (" + pisos(x) + " pisos)" : "") + (x.dos && tipo(x.tipo).techoOp ? " con techo a dos aguas" : ""); });
      el.wa.href = waHref("Hola Fundos, dibujé mi casa en el lote " + S.lote.n + " de " + S.p.nombre + ": " + (lista.join(", ") || "sin construcciones") +
        ". En total " + fmt(tot) + " m² de " + m2(lim) + " permitidos" + (S.agro ? ", y la mitad del terreno con frutales (" + S.agro.cfg.frutales + ") y conservación natural (" + S.agro.cfg.nativo + ")" : "") + ". ¿Me ayudan a evaluarlo?");
    }

    el.add.innerHTML = TIPOS.map(function (t) {
      return '<button class="casa-chip" type="button" data-tipo="' + t.id + '" title="' + esc(t.nombre) + '"><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg>' + esc(t.corto || t.nombre) + "<small>" + t.w + "×" + t.h + " m</small></button>";
    }).join("");
    el.add.addEventListener("click", function (e) {
      var b = e.target.closest("[data-tipo]");
      if (!b || b.disabled) return;
      add(b.getAttribute("data-tipo"));
      draw();
    });
    selP.addEventListener("change", function () { setProyecto(selP.value); });
    selL.addEventListener("change", function () { setLote(+selL.value); });
    function medida(inp, k) {
      var it = S.items[S.sel], v = parseFloat(String(inp.value).replace(",", "."));
      if (!it || !isFinite(v)) return;
      it[k] = clamp(snap(v), 2, 40);
      draw();
    }
    el.w.addEventListener("input", function () { medida(el.w, "w"); });
    el.h.addEventListener("input", function () { medida(el.h, "h"); });
    el.w.addEventListener("change", function () { if (S.items[S.sel]) el.w.value = S.items[S.sel].w; });
    el.h.addEventListener("change", function () { if (S.items[S.sel]) el.h.value = S.items[S.sel].h; });
    if (el.techo) $$("[data-c-techo]", el.techo).forEach(function (b) {
      b.addEventListener("click", function () { var it = S.items[S.sel]; if (it) { it.dos = b.getAttribute("data-c-techo") === "dos"; draw(); } });
    });
    if (el.camino) el.camino.addEventListener("click", function () { S.camino = !S.camino; draw(); });
    if (el.vida) el.vida.addEventListener("click", function () { S.vida = !S.vida; draw(); });
    // Sol: hora, época del año y "ver el día" (animación de la mañana a la noche)
    var hr = $("[data-c-hora]", root), play = $("[data-c-dia]", root), anim = 0;
    function parar() { if (anim) { window.cancelAnimationFrame(anim); anim = 0; play.classList.remove("is-on"); } }
    if (hr) hr.addEventListener("input", function () { parar(); S.hora = +hr.value; draw(); });
    $$("[data-c-est]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        S.estacion = b.getAttribute("data-c-est");
        $$("[data-c-est]", root).forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        draw();
      });
    });
    if (play) play.addEventListener("click", function () {
      if (anim) { parar(); return; }
      if (reduced) { S.hora = 12; hr.value = 12; draw(); return; }
      var t0 = 0, h0 = 6.5, h1 = 21.5, dur = 9000;
      play.classList.add("is-on");
      (function paso(t) {
        if (!t0) t0 = t;
        var f = Math.min(1, (t - t0) / dur);
        S.hora = Math.round((h0 + (h1 - h0) * f) * 4) / 4; hr.value = S.hora; draw();
        anim = f < 1 ? window.requestAnimationFrame(paso) : 0;
        if (!anim) play.classList.remove("is-on");
      })(performance.now());
    });
    el.rot.addEventListener("click", function () { var it = S.items[S.sel]; if (it) { it.rot = (it.rot + 15) % 360; draw(); } });
    el.del.addEventListener("click", function () {
      if (S.sel < 0) return;
      S.items.splice(S.sel, 1);
      S.sel = S.items.length ? S.items.length - 1 : -1;
      draw();
      var b = $("[data-tipo]", el.add); if (b && S.sel < 0) b.focus();
    });
    // Vista (3D / planta), zoom, encuadre y pantalla completa
    $$("[data-c-vista]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        S.vista = b.getAttribute("data-c-vista");
        $$("[data-c-vista]", root).forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        encuadre(); acercar(); draw();
      });
    });
    function zoomA(z) { S.zoom = clamp(z, 1, 5); if (S.zoom === 1) S.pan = [0, 0]; draw(); }
    $$("[data-c-zoom]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-c-zoom");
        if (a === "fit") { S.pan = [0, 0]; zoomA(1); }
        else zoomA(S.zoom * (a === "in" ? 1.4 : 1 / 1.4));
      });
    });
    if (el.full) {
      if (!stage.requestFullscreen) el.full.hidden = true;
      el.full.addEventListener("click", function () {
        if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().catch(function () {});
      });
      document.addEventListener("fullscreenchange", function () { el.full.setAttribute("aria-pressed", document.fullscreenElement === stage ? "true" : "false"); draw(); });
    }

    // Arrastre: mover (volumen), tamaño (esquina, centro fijo), girar (círculo) y desplazar la vista acercada (fondo)
    function pt(e) {
      var m = svg.getScreenCTM();
      if (!m) return [0, 0];
      var q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; q = q.matrixTransform(m.inverse());
      return [q.x, q.y];
    }
    var drag = null;
    svg.addEventListener("pointerdown", function (e) {
      var act = e.target.getAttribute && e.target.getAttribute("data-act"), g = e.target.closest("[data-i]");
      if (!g || !act || act === "fondo") {
        if (S.sel >= 0 && !(e.target.closest && e.target.closest(".casa-selg"))) { S.sel = -1; window.requestAnimationFrame(draw); }
        if (S.zoom > 1.01) { var s0 = pt(e); drag = { act: "pan", s0: [e.clientX, e.clientY], pan0: S.pan.slice(), k: viewBox()[2] / svg.getBoundingClientRect().width, id: e.pointerId }; try { svg.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ } }
        return;
      }
      var i = +g.getAttribute("data-i"), it = S.items[i], s = pt(e), p0 = suelo(s[0], s[1]);
      e.preventDefault();
      S.sel = i;
      drag = { it: it, act: act, dx: p0[0] - it.x, dy: p0[1] - it.y, a0: Math.atan2(p0[1] - it.y, p0[0] - it.x), rot0: it.rot, id: e.pointerId };
      try { svg.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
      // Se redibuja en el cuadro siguiente: el toque debe llegar antes al elemento original (para no desplazar la página)
      window.requestAnimationFrame(draw);
    });
    svg.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.act === "pan") {
        S.pan = [drag.pan0[0] - (e.clientX - drag.s0[0]) * drag.k, drag.pan0[1] - (e.clientY - drag.s0[1]) * drag.k];
        draw(); return;
      }
      var s = pt(e), p = suelo(s[0], s[1]), it = drag.it;
      if (drag.act === "move") { it.x = snap(p[0] - drag.dx); it.y = snap(p[1] - drag.dy); }
      else if (drag.act === "size") { var q = local(it, p[0], p[1]); it.w = clamp(snap(Math.abs(q[0]) * 2), 2, 40); it.h = clamp(snap(Math.abs(q[1]) * 2), 2, 40); }
      else { var a = Math.atan2(p[1] - it.y, p[0] - it.x); it.rot = ((Math.round((drag.rot0 + (a - drag.a0) * 180 / Math.PI) / 5) * 5) % 360 + 360) % 360; }
      draw();
    });
    function end(e) { if (drag && e.pointerId === drag.id) { drag = null; draw(); } }
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    // En pantallas táctiles, tocar una construcción (o el fondo acercado) no desplaza la página
    svg.addEventListener("touchstart", function (e) {
      var t = e.target;
      if (t.closest && (t.closest(".casa-it") || t.closest(".casa-it-h") || (S.zoom > 1.01 && t.getAttribute("data-act") === "fondo"))) e.preventDefault();
    }, { passive: false });
    svg.addEventListener("focusin", function (e) {
      var g = e.target.closest && e.target.closest(".casa-it");
      if (g && +g.getAttribute("data-i") !== S.sel) { S.sel = +g.getAttribute("data-i"); draw(); focusSel(); }
    });
    function focusSel() { var g = $('.casa-it[data-i="' + S.sel + '"]', svg); if (g) g.focus({ preventScroll: true }); }
    svg.addEventListener("keydown", function (e) {
      var it = S.items[S.sel];
      if (!it) return;
      var st = e.shiftKey ? 5 : 0.5, iso = S.vista === "iso";
      // En 3D las flechas siguen la pantalla (derecha = hacia la derecha en diagonal)
      var mv = iso ? { ArrowLeft: [-st, st], ArrowRight: [st, -st], ArrowUp: [-st, -st], ArrowDown: [st, st] }[e.key]
        : { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      if (mv) { it.x = snap(it.x + mv[0]); it.y = snap(it.y + mv[1]); }
      else if (e.key === "r" || e.key === "R") it.rot = (it.rot + 15) % 360;
      else if (e.key === "Delete" || e.key === "Backspace") { el.del.click(); e.preventDefault(); return; }
      else return;
      e.preventDefault();
      draw(); focusSel();
    });

    Casa.set = function (id, n) { setProyecto(id, n); };
    setProyecto(con[0].id);
  }

  /* =============================================================
     Puerto Varas: datos de la portada y mapa del entorno en miniatura
     (las rutas salen de lib/entorno-datos.js, que se carga al acercarse)
     ============================================================= */
  function initPV() {
    var p = proyecto("puerto-varas");
    if (p) {
      var dsp = disponibles(p).length, d0 = desde(p);
      $$("[data-pv-disp]").forEach(function (el) { el.textContent = dsp; });
      if (d0) $$("[data-pv-desde]").forEach(function (el) { el.textContent = clp(d0); });
      $$("[data-pv-lanz]").forEach(function (a) {
        a.addEventListener("click", function () {
          Visit.prefill({ proyecto: p.nombre, mensaje: "Quiero recibir el plano de disponibilidad y la lista de precios de lanzamiento de Fundos de Puerto Varas, y coordinar una visita guiada al terreno.", scroll: true });
        });
      });
      $$("[data-pv-plan]").forEach(function (a) {
        a.addEventListener("click", function () { Plan.apply({ id: p.id, soloDisponibles: true }); });
      });
    }
    // Franja "Nuestros proyectos" de la portada
    $$("[data-pv-proy]").forEach(function (a) {
      var o = proyecto(a.getAttribute("data-pv-proy"));
      if (!o || o.id === "puerto-varas") return;
      var d0 = desde(o);
      $$("[data-proy-disp]", a).forEach(function (el) { el.textContent = disponibles(o).length; });
      if (d0) $$("[data-proy-desde]", a).forEach(function (el) { el.textContent = clp(d0); });
    });
    $$("[data-otro]").forEach(function (card) {
      var o = proyecto(card.getAttribute("data-otro"));
      if (!o) return;
      var d0 = desde(o);
      $$("[data-otro-disp]", card).forEach(function (el) { el.textContent = disponibles(o).length; });
      if (d0) $$("[data-otro-desde]", card).forEach(function (el) { el.textContent = clp(d0); });
      if (o.resumen) $$("[data-otro-txt]", card).forEach(function (el) { el.textContent = o.resumen; });
      $$("[data-otro-cotizar]", card).forEach(function (a) {
        a.addEventListener("click", function () {
          Visit.prefill({ proyecto: o.nombre, mensaje: "Quiero cotizar una parcela en " + o.nombre + ": precios, disponibilidad y formas de pago.", scroll: true });
        });
      });
    });
    var map = $("[data-pv-map]"), box = $("[data-pv-map-in]");
    if (!map || !box) return;
    var built = false;
    function load() {
      if (built) return;
      built = true;
      if (window.__ENTORNO__) { draw(window.__ENTORNO__); return; }
      var sc = document.createElement("script");
      sc.src = "lib/entorno-datos.js?v=" + ((/[?&]v=([\w]+)/.exec(($('script[src*="main.js"]') || {}).src || "") || [])[1] || "1");
      sc.onload = function () { if (window.__ENTORNO__) draw(window.__ENTORNO__); };
      document.head.appendChild(sc);
    }
    function draw(D) {
      var P = D.proyecto, byId = {};
      D.lugares.forEach(function (l) { byId[l.id] = l; });
      var claves = ["alerce", "pmontt", "pvaras", "aeropuerto"];
      var otros = ["frutillar", "osorno", "petrohue", "angelmo", "alerce_andino"];
      var todos = claves.concat(otros).map(function (id) { return byId[id]; }).filter(function (l) { return l && l.ruta; });
      // Encuadre: la parcela y los lugares, con margen, en la proporción de la caja
      var b = [P.x, P.y, P.x, P.y];
      todos.forEach(function (l) { b = [Math.min(b[0], l.x), Math.min(b[1], l.y), Math.max(b[2], l.x), Math.max(b[3], l.y)]; });
      var pad = 70, x0 = b[0] - pad, y0 = b[1] - pad * 1.4, w = b[2] - b[0] + 2 * pad, h = b[3] - b[1] + pad * 2.4;
      var ar = map.clientWidth / Math.max(1, map.clientHeight) || 1.2;
      if (w / h > ar) { var nh = w / ar; y0 -= (nh - h) / 2; h = nh; } else { var nw = h * ar; x0 -= (nw - w) / 2; w = nw; }
      var svg = '<svg viewBox="' + [x0, y0, w, h].map(function (n) { return n.toFixed(1); }).join(" ") + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<image href="' + esc(D.imagen.src) + '" x="0" y="0" width="' + D.imagen.w + '" height="' + D.imagen.h + '"/>';
      var labels = "";
      todos.forEach(function (l, i) {
        var key = claves.indexOf(l.id) >= 0, dly = (key ? 0 : .5) + i * .12;
        svg += '<path class="rt draw' + (key ? " k" : "") + '" data-rt="' + l.id + '" pathLength="1" style="--d:' + dly.toFixed(2) + 's" d="' + esc(l.ruta.d) + '"/>';
        var fin = l.ruta.fin || [l.x, l.y];
        var lx = (fin[0] - x0) / w * 100, ly = (fin[1] - y0) / h * 100;
        // Mismo redondeo que el mapa del entorno (a 5 minutos)
        var n = l.ruta.min < 10 ? Math.max(1, Math.round(l.ruta.min)) : Math.round(l.ruta.min / 5) * 5;
        var t = n < 60 ? n + " min" : Math.floor(n / 60) + " h" + (n % 60 ? " " + n % 60 : "");
        // Junto a la parcela solo el punto; en los bordes el rótulo se abre hacia adentro
        var hx0 = (P.x - x0) / w * 100, hy0 = (P.y - y0) / h * 100, cerca = Math.hypot(lx - hx0, (ly - hy0) * h / w) < 9;
        var lado = lx < 22 ? " al" : (lx > 78 ? " ar" : "");
        // En pantallas angostas solo llevan nombre los cuatro principales y el Osorno
        if (map.clientWidth < 520 && claves.indexOf(l.id) < 0 && l.id !== "osorno") cerca = true;
        labels += '<span class="pv-lbl' + lado + '" style="left:' + lx.toFixed(2) + "%;top:" + ly.toFixed(2) + "%;--d:" + (dly + 1.1).toFixed(2) + 's"><i class="pv-dot"></i>' +
          (cerca ? "" : "<b>" + esc(l.corto || l.nombre) + "<small>" + t + "</small></b>") + "</span>";
      });
      svg += "</svg>";
      var hx = (P.x - x0) / w * 100, hy = (P.y - y0) / h * 100;
      labels += '<span class="pv-lbl home" style="left:' + hx.toFixed(2) + "%;top:" + hy.toFixed(2) + '%"><img src="assets/img/isotipo-174.webp" alt="" width="44" height="44"><b>Tu parcela</b></span>';
      box.innerHTML = svg + labels;
      if (reduced || !("IntersectionObserver" in window)) { map.classList.add("is-in"); return; }
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { map.classList.add("is-in"); io.disconnect(); } }, { threshold: .35 });
      io.observe(map);
    }
    // Pasar sobre un tiempo resalta su ruta
    $$("[data-pv-route]").forEach(function (a) {
      var id = a.getAttribute("data-pv-route");
      var on = function (v) { var r = $('[data-rt="' + id + '"]', box); if (r) r.classList.toggle("is-hi", v); };
      a.addEventListener("mouseenter", function () { on(true); });
      a.addEventListener("mouseleave", function () { on(false); });
      a.addEventListener("focus", function () { on(true); });
      a.addEventListener("blur", function () { on(false); });
    });
    if ("IntersectionObserver" in window) {
      var near = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { load(); near.disconnect(); } }, { rootMargin: "600px 0px" });
      near.observe(map);
    } else load();
  }

  function boot() {
    window.__fundosBoot = true;
    document.documentElement.classList.add("js");
    safe(initContact, "initContact");
    safe(initVistas, "initVistas");
    safe(initNav, "initNav");
    safe(initReveals, "initReveals");
    safe(initIrAlPlano, "initIrAlPlano");
    safe(initVisit, "initVisit");
    safe(initPlan, "initPlan");
    safe(initVideo, "initVideo");
    safe(initMobileBar, "initMobileBar");
    safe(initFaq, "initFaq");
    safe(initCompra, "initCompra");
    safe(initCasa, "initCasa");
    safe(initSellers, "initSellers");
    safe(initPV, "initPV");
    safe(initPvLead, "initPvLead");
    safe(initMiniForms, "initMiniForms");
    safe(initMasProyectos, "initMasProyectos");
    safe(initOffscreen, "initOffscreen");
    $$('input[type="range"]').forEach(paintRange);
  }

  function arrancar() { conDisponibilidad(boot); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();
})();
