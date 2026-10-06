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

  // El precio de cada lote sale de su categoría (colores del masterplan)
  proyectos.forEach(function (p) {
    var cats = p.categorias || {};
    (p.lotes || []).forEach(function (l) {
      var c = cats[l.cat];
      l.precio = c ? c.precio : null;
      l.lista = c && c.lista ? c.lista : null;
      l.m2 = l.m2 || 5000;
    });
  });
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
  var Sim = { set: function () {} };
  var Tour = { open: function () {} };
  var Video = { open: function () {} };
  var Vista = { set: function () { return false; }, current: function () { return ""; } };
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
    if (contacto.email) $$("[data-email]").forEach(function (a) { a.href = "mailto:" + contacto.email; a.textContent = contacto.email; });
    if (contacto.horario) $$("[data-horario]").forEach(function (p) { p.textContent = contacto.horario; });
    // Aviso para lectores de pantalla: estos enlaces abren otra pestaña o la app
    $$('a[target="_blank"]').forEach(function (a) {
      var ids = (a.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
      if (ids.indexOf("nueva-pestana") < 0) ids.push("nueva-pestana");
      a.setAttribute("aria-describedby", ids.join(" "));
    });
  }

  /* =============================================================
     Pestañas: Puerto Varas · Proyectos · Tu compra · Equipo
     Cada sección dice en data-vista en qué pestañas aparece. Los enlaces internos (#plano, #simulador…)
     cambian de pestaña si hace falta; las pestañas llevan al comienzo de su vista.
     ============================================================= */
  function initVistas() {
    var root = document.documentElement;
    var PRIMERA = { inicio: "puerto-varas", proyectos: "proyectos-inicio", compra: "tu-compra", equipo: "nosotros" };
    var links = $$("[data-vista-link]"), cur = "";
    function targetFor(hash) {
      var id = decodeURIComponent((hash || "").replace(/^#/, ""));
      if (!id) return null;
      var el = document.getElementById(id);
      if (!el && /^lote-/.test(id)) el = $("#plano");
      if (!el && /^recorrido-/.test(id)) el = $("#recorrido");
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
      // En la pestaña Puerto Varas no está el recorrido: su 360° se abre en el mapa del entorno
      var to = a.getAttribute("data-tour-open");
      if (to && cur === "inicio") {
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
     Hero: el paisaje se mueve por capas (cursor + scroll)
     ============================================================= */
  function initHero() {
    var hero = $("[data-hero]");
    if (!hero || reduced) return;
    var svg = $(".hero-scene", hero), inner = $(".hero-inner", hero), photo = $(".hero-photo img", hero);
    var layers = (svg ? $$(".layer", svg) : []).map(function (g) { return { g: g, d: parseFloat(g.getAttribute("data-depth")) || 0 }; });
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, visible = true, lastY = -1;

    if (fineHover) {
      hero.addEventListener("pointermove", function (e) {
        tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
        kick();
      });
      hero.addEventListener("pointerleave", function () { tx = 0; ty = 0; kick(); });
    }
    window.addEventListener("scroll", kick, { passive: true });
    // Medidas fuera del cuadro de animación: frame() solo escribe, nunca fuerza un layout
    var svgH = 900, heroH = 1;
    function measure() { svgH = (svg && svg.getBoundingClientRect().height) || 900; heroH = hero.offsetHeight || 1; }
    measure();
    if ("ResizeObserver" in window) new ResizeObserver(function () { measure(); kick(); }).observe(hero);
    else window.addEventListener("resize", function () { measure(); kick(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(hero);
    }

    function kick() { if (!raf && visible) raf = window.requestAnimationFrame(frame); }
    function frame() {
      raf = 0;
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      var sy = Math.max(0, window.scrollY);
      var k = 900 / svgH; // px → unidades del viewBox
      layers.forEach(function (L) {
        var x = -cx * L.d * 38;
        var y = -cy * L.d * 10 + sy * (1 - L.d) * 0.3 * k;
        L.g.setAttribute("transform", "translate(" + x.toFixed(2) + " " + y.toFixed(2) + ")");
      });
      if (photo) photo.style.transform = "translate3d(" + (-cx * 8).toFixed(1) + "px," + (sy * 0.16 - cy * 6).toFixed(1) + "px,0) scale(1.04)";
      if (inner) {
        inner.style.transform = "translate3d(0," + (sy * -0.12).toFixed(1) + "px,0)";
        inner.style.opacity = String(clamp(1 - sy / (heroH * 0.8), 0, 1));
      }
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002 || sy !== lastY) { lastY = sy; kick(); }
    }
    kick();
  }

  /* =============================================================
     Tarjetas de proyecto
     ============================================================= */
  function initProjects() {
    // Cifras siempre sincronizadas con los datos
    proyectos.forEach(function (p) {
      var card = $('.project[data-project="' + p.id + '"]');
      if (!card || p.estado !== "venta") return;
      var badge = $(".badge", card), dd = $(".facts div:first-child dd", card);
      if (badge) badge.textContent = disponibles(p).length + " disponibles";
      if (dd && desde(p)) dd.textContent = clp(desde(p));
    });

    if (fineHover) {
      $$(".project").forEach(function (card) {
        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect();
          card.style.setProperty("--mx", ((((e.clientX - r.left) / r.width) - 0.5) * 2).toFixed(3));
        });
        card.addEventListener("pointerleave", function () { card.style.setProperty("--mx", "0"); });
      });
    }

    $$("[data-goto-plan]").forEach(function (a) {
      a.addEventListener("click", function () { Plan.show(a.getAttribute("data-goto-plan")); });
    });
    // Enlaces repetidos en cada tarjeta: el lector de pantalla oye de qué proyecto son
    $$(".project[data-project]").forEach(function (card) {
      var p = proyecto(card.getAttribute("data-project"));
      if (!p) return;
      $$("[data-goto-plan], [data-open-project], .art-360", card).forEach(function (a) {
        if (!$(".sr-only", a)) a.insertAdjacentHTML("beforeend", '<span class="sr-only"> de ' + esc(p.nombre) + "</span>");
      });
    });
    $$("[data-chip-total]").forEach(function (li) {
      var p = proyecto(li.getAttribute("data-chip-total"));
      if (p) li.textContent = p.lotes.length + " parcelas en total";
    });
    // "Ver parcelas disponibles": abre el plano mostrando solo lo que se puede comprar
    $$("[data-plan-disp]").forEach(function (a) {
      a.addEventListener("click", function () { Plan.apply({ id: Plan.current(), soloDisponibles: true }); });
    });
  }

  /* =============================================================
     Buscador del hero
     ============================================================= */
  function initFinder() {
    var form = $("[data-finder]");
    if (!form) return;
    var dest = $("#f-destino", form), bud = $("#f-presupuesto", form);
    var count = $("[data-finder-count]", form), label = $("[data-finder-label]", form), cta = $("[data-finder-cta]", form), by = $("[data-finder-by]", form);
    var liveF = $("[data-finder-live]", form), liveT = 0;
    function say(t) { if (!liveF) return; window.clearTimeout(liveT); liveT = window.setTimeout(function () { liveF.textContent = t; }, 450); }

    function matches(p, max) {
      return disponibles(p).filter(function (l) { return l.precio <= max; }).length;
    }
    // Resultado por proyecto: el total que se promete es el mismo que después se muestra
    function result() {
      var id = dest.value, max = +bud.value || Infinity, todos = id === "todos";
      var list = todos ? proyectos.filter(function (x) { return x.lotes && x.lotes.length; }) : [proyecto(id)].filter(Boolean);
      var rows = list.map(function (x) { return { p: x, n: matches(x, max) }; }).sort(function (a, b) { return b.n - a.n || desde(a.p) - desde(b.p); });
      var total = rows.reduce(function (t, r) { return t + r.n; }, 0);
      var cheapest = list.slice().sort(function (a, b) { return desde(a) - desde(b); })[0];
      return { n: total, max: max, rows: rows, todos: todos, target: total ? rows[0].p : cheapest };
    }
    function countTo(to) {
      var from = parseInt(count.textContent, 10) || 0;
      if (reduced || from === to) { count.textContent = to; return; }
      var t0 = performance.now();
      (function step(t) {
        var k = Math.min(1, (t - t0) / 420);
        count.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) window.requestAnimationFrame(step);
      })(t0);
    }
    function update() {
      var r = result();
      var parts = r.rows.filter(function (x) { return x.n; });
      if (!r.target) return;
      if (r.n === 0) {
        count.hidden = true;
        label.textContent = "No hay parcelas hasta " + clp(r.max) + (r.todos ? "" : " en " + r.target.nombre) + ". Parten en " + clp(desde(r.target)) + ".";
        cta.textContent = "Ver desde " + clp(desde(r.target));
        by.hidden = true;
        say(label.textContent);
        return;
      }
      count.hidden = false;
      countTo(r.n);
      label.textContent = (r.n === 1 ? "parcela disponible" : "parcelas disponibles") + (r.max < Infinity ? " en tu presupuesto" : " hoy");
      by.hidden = !(r.todos && parts.length > 1);
      by.textContent = parts.map(function (x) { return x.n + " en " + x.p.nombre; }).join(" · ");
      cta.textContent = r.todos && parts.length > 1 ? "Ver en " + r.target.nombre : "Ver parcelas";
      say(r.n + " " + label.textContent + (by.hidden ? "" : ": " + by.textContent));
    }
    dest.addEventListener("change", update);
    bud.addEventListener("change", update);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var r = result();
      if (!r.target) return;
      if (r.n === 0) {
        Plan.apply({ id: r.target.id, max: Infinity, soloDisponibles: true, nota: "No hay lotes hasta " + clp(r.max) + ": te mostramos todos los disponibles de " + r.target.nombre + "." });
      } else {
        Plan.apply({
          id: r.target.id, max: r.max, soloDisponibles: true,
          otros: r.todos ? r.rows.filter(function (x) { return x.n; }).map(function (x) { return { id: x.p.id, nombre: x.p.nombre, n: x.n }; }) : []
        });
      }
      Plan.land();
    });
    update();
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
    var full = 'x="' + vb[0] + '" y="' + vb[1] + '" width="' + vb[2] + '" height="' + vb[3] + '"';
    // Predio: base uniforme con un halo oscuro (trazo de grosor fijo en pantalla) y borde, igual en todos los planos
    if (contorno) s.push('<path class="pl-halo pl-halo-a" d="' + contorno + '"/><path class="pl-halo pl-halo-b" d="' + contorno + '"/><path class="pl-predio" d="' + contorno + '"/>');
    s.push('<g' + (contorno ? ' clip-path="url(#pl-predio)"' : "") + '><rect ' + full + ' fill="' + PLANO.predio + '"/></g>');
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
    agua.forEach(function (a) { s.push('<path class="pl-agua" d="' + a.d + '" fill-rule="evenodd" fill="' + PLANO.agua + '"/>'); });
    // Todas las vías con el mismo lenguaje: servidumbres en arena con borde punteado
    calles.forEach(function (k) {
      if (k.tipo === "servidumbre") s.push('<path class="pl-servidumbre" d="' + k.d + '" fill-rule="evenodd"/>');
      else s.push('<path class="pl-via-borde" d="' + k.d + '"/><path class="pl-via" d="' + k.d + '"/>');
    });
    if (camino) s.push('<path class="pl-principal-borde" d="' + camino + '"/><path class="pl-principal" d="' + camino + '"/>');
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
    (P.agua || []).forEach(function (a) { h.push('<li><i class="sw sw-agua" aria-hidden="true"></i>' + esc(a.nombre) + "</li>"); });
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
      price: $("[data-d-price]"), m2: $("[data-d-m2]"), reserva: $("[data-d-reserva]"), saldo: $("[data-d-saldo]"),
      m2price: $("[data-d-m2price]"), reserve: $("[data-d-reserve]"), wa: $("[data-d-wa]"), fav: $("[data-d-fav]"),
      sim: $("[data-d-sim]"), close: $("[data-panel-close]"), facts: $(".lot-facts", pDetail), alts: $("[data-d-alts]"), toast: $("[data-d-toast]")
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
      layoutPlan(true);
    }
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
      d.reserva.textContent = clp(RESERVA);
      d.saldo.textContent = l.precio ? clp(l.precio - RESERVA) : "—";
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
      d.sim.hidden = sold;
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
    function select(n, opts) {
      opts = opts || {};
      var p = P(), l = lotOf(p, n);
      if (!l) return;
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
    d.sim.addEventListener("click", function () {
      var l = lotOf(P(), S.sel);
      if (l) Sim.set(S.id, l.precio, l.n);
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
      if (!a || a.hasAttribute("data-open-project")) return;
      e.preventDefault();
      landPlan();
    });

    /* ---- API para otros módulos ---- */
    Plan.land = landPlan;
    Plan.show = function (id) { if (id !== S.id || !built) setProject(id); };
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
     Simulador
     ============================================================= */
  function initSim() {
    var form = $("[data-sim]");
    if (!form) return;
    var fin = B.financiamiento || {};
    var simLive = $("[data-sim-live]"), simLiveT = 0;
    var peekL = $("[data-sim-peek-l]"), peekV = $("[data-sim-peek-v]");
    var selP = $("[data-s-project]", form), price = $("[data-s-price]", form), priceOut = $("[data-s-price-out]", form);
    var pie = $("[data-s-pie]", form), pieOut = $("[data-s-pie-out]", form), plazosBox = $("[data-s-plazos]", form);
    var modeWrap = $("[data-s-mode-wrap]", form), creditEls = $$("[data-s-credit]", form);
    var out = {
      reserva: $("[data-s-reserva]", form), rowPie: $("[data-s-row-pie]", form), pie: $("[data-s-pie-val]", form),
      saldoLabel: $("[data-s-saldo-label]", form), saldo: $("[data-s-saldo]", form), rowCuota: $("[data-s-row-cuota]", form),
      cuota: $("[data-s-cuota]", form), note: $("[data-s-note]", form), send: $("[data-s-send]", form),
      bRes: $('[data-s-b="res"]', form), bPie: $('[data-s-b="pie"]', form), bRest: $('[data-s-b="rest"]', form),
      lPie: $("[data-s-b-pie-l]", form), lRest: $("[data-s-b-rest-l]", form)
    };
    function bar(res, pieNeto, rest) {
      if (!out.bRes) return;
      out.bRes.style.flexBasis = (res * 100).toFixed(2) + "%";
      out.bPie.style.flexBasis = (pieNeto * 100).toFixed(2) + "%";
      out.bRest.style.flexBasis = (rest * 100).toFixed(2) + "%";
    }
    var conLotes = proyectos.filter(function (p) { return p.lotes && p.lotes.length; });
    selP.innerHTML = conLotes.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nombre) + "</option>"; }).join("");

    if (!fin.habilitado) { modeWrap.hidden = true; }
    if (fin.plazos && fin.plazos.length) {
      var def = fin.plazos[Math.min(2, fin.plazos.length - 1)];
      plazosBox.innerHTML = fin.plazos.map(function (n) {
        return '<label><input type="radio" name="plazo" value="' + n + '"' + (n === def ? " checked" : "") + "><span>" + n + " m</span></label>";
      }).join("");
    }
    pie.min = Math.round((fin.pieMinimo || 0.2) * 100);
    if (+pie.value < +pie.min) pie.value = pie.min;

    // El valor solo puede ser un precio real del proyecto (los de sus lotes disponibles)
    var vals = [], lotSel = null, lotBox = $("[data-s-lot]", form);
    function range(p, value) {
      var disp = disponibles(p);
      vals = (disp.length ? disp : p.lotes).map(function (l) { return l.precio; }).filter(Boolean)
        .filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      price.min = 0;
      price.max = Math.max(0, vals.length - 1);
      price.step = 1;
      var i = Math.floor((vals.length - 1) / 2);
      if (value != null) {
        i = 0;
        vals.forEach(function (v, k) { if (Math.abs(v - value) < Math.abs(vals[i] - value)) i = k; });
      }
      price.value = i;
      price.setAttribute("aria-valuetext", clp(vals[i] || 0));
    }
    function calc() {
      var p = proyecto(selP.value);
      var modo = $('input[name="modo"]:checked', form);
      var v = vals[+price.value] || 0, credito = !modeWrap.hidden && !!modo && modo.value === "credito";
      priceOut.textContent = clp(v);
      price.setAttribute("aria-valuetext", clp(v));
      var nAt = disponibles(p).filter(function (l) { return l.precio === v; }).length;
      if (lotBox) lotBox.textContent = lotSel ? "Lote " + lotSel + " de " + p.nombre : nAt + (nAt === 1 ? " lote disponible a este precio" : " lotes disponibles a este precio");
      var que = "una parcela en " + p.nombre + (lotSel ? " (lote " + lotSel + ")" : "") + " de " + clp(v);
      pieOut.textContent = pct(+pie.value);
      pie.setAttribute("aria-valuetext", pct(+pie.value));
      creditEls.forEach(function (el) { el.hidden = !credito; });
      $$('input[type="range"]', form).forEach(paintRange);
      out.reserva.textContent = clp(RESERVA);
      out.rowPie.hidden = !credito;
      out.rowCuota.hidden = !credito;
      var msg;
      if (!credito) {
        out.saldoLabel.textContent = "Saldo a la escritura";
        out.saldo.textContent = clp(v - RESERVA);
        out.note.textContent = "Más gastos de escrituración (notaría y Conservador), que te informamos antes de firmar.";
        msg = "Hola Fundos, simulé " + que + " pagando al contado. ¿Me pueden asesorar?";
        bar(RESERVA / v, 0, (v - RESERVA) / v);
        if (out.lPie) out.lPie.hidden = true;
        if (out.lRest) out.lRest.textContent = "Saldo a la escritura";
      } else {
        var plazo = $('input[name="plazo"]:checked', form);
        var n = +(plazo && plazo.value) || 36;
        var i = +fin.tasaMensual || 0;
        var pieTotal = v * (+pie.value / 100);
        var fin$ = v - pieTotal;
        var cuota = i ? fin$ * i / (1 - Math.pow(1 + i, -n)) : fin$ / n;
        out.pie.textContent = clp(Math.max(0, pieTotal - RESERVA));
        out.saldoLabel.textContent = "Monto a financiar";
        out.saldo.textContent = clp(fin$);
        out.cuota.textContent = clp(cuota) + " × " + n;
        out.note.textContent = "Cuota referencial en " + n + " meses con tasa de " + pct((i * 100).toFixed(1)) + " mensual. Más gastos de escrituración.";
        msg = "Hola Fundos, simulé " + que + " con pie de " + pct(+pie.value) + " y " + n + " cuotas de aprox. " + clp(cuota) + ". ¿Me pueden asesorar?";
        bar(RESERVA / v, Math.max(0, pieTotal - RESERVA) / v, fin$ / v);
        if (out.lPie) out.lPie.hidden = false;
        if (out.lRest) out.lRest.textContent = "Financiado en cuotas";
      }
      out.send.href = waHref(msg);
      // Franja fija del celular: la cifra clave siempre a la vista mientras se mueven los controles
      if (peekL) {
        peekL.textContent = credito ? "Cuota mensual" : "Saldo a la escritura";
        peekV.textContent = credito ? out.cuota.textContent : out.saldo.textContent;
      }
      if (simLive) {
        window.clearTimeout(simLiveT);
        var txt = credito ? "Cuota estimada " + out.cuota.textContent.replace(" × ", " en ") + " meses" : "Saldo a la escritura " + out.saldo.textContent;
        simLiveT = window.setTimeout(function () { simLive.textContent = txt; }, 400);
      }
    }
    selP.addEventListener("change", function () { lotSel = null; range(proyecto(selP.value)); calc(); });
    price.addEventListener("input", function () { lotSel = null; });
    form.addEventListener("input", calc);
    form.addEventListener("change", calc);
    range(proyecto(selP.value));
    calc();

    Sim.set = function (id, precio, n) {
      var p = proyecto(id);
      if (!p || !p.lotes.length) return;
      selP.value = id;
      range(p, precio);
      lotSel = n || null;
      calc();
    };
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
      fb.href = waHref(msg);
      if (okMsg) okMsg.textContent = msg;
      ok.hidden = false;
      inertForm(true);
      ok.focus();
    });
    function inertForm(on) { [].forEach.call(form.children, function (ch) { if (ch !== ok) ch.inert = on; }); }
    if (again) again.addEventListener("click", function () { ok.hidden = true; inertForm(false); el.nombre.focus(); });

    var lastAuto = "";
    Visit.prefill = function (o) {
      setReserva(o.reserva || null);
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
     Ficha de proyecto (dialog)
     ============================================================= */
  function initDialog() {
    var dlg = $("[data-pdialog]");
    if (!dlg || typeof dlg.showModal !== "function") return; // sin soporte: los enlaces navegan normal
    var art = $("[data-pd-art]", dlg), logo = $("[data-pd-logo]", dlg);
    var f = {
      meta: $("[data-pd-meta]", dlg), title: $("[data-pd-title]", dlg), desc: $("[data-pd-desc]", dlg),
      list: $("[data-pd-list]", dlg), near: $("[data-pd-near]", dlg), note: $("[data-pd-near-note]", dlg),
      map: $("[data-pd-map]", dlg), actions: $("[data-pd-actions]", dlg)
    };
    var check = '<svg class="i" aria-hidden="true"><use href="#i-check"/></svg>';
    var arrow = '<svg class="i i-go" aria-hidden="true"><use href="#i-arrow"/></svg>';

    function open(id) {
      var p = proyecto(id);
      if (!p) return;
      var src = $('.project[data-project="' + id + '"] .project-art svg');
      art.innerHTML = "";
      if (src) art.appendChild(src.cloneNode(true));
      if (logo) {
        logo.hidden = !p.logo;
        if (p.logo) { logo.src = p.logo; logo.alt = "Fundos de " + p.nombre; }
      }
      f.meta.textContent = p.region + " · " + p.zona;
      f.title.textContent = p.nombre;
      f.desc.textContent = p.descripcion;
      f.list.innerHTML = (p.destacados || []).map(function (x) { return "<li>" + check + "<span>" + esc(x) + "</span></li>"; }).join("");
      f.near.innerHTML = (p.cercanias || []).map(function (c) { return "<li><span>" + esc(c[0]) + "</span><span>" + esc(c[1]) + "</span></li>"; }).join("");
      var facts = $("[data-pd-facts]", dlg);
      if (facts) facts.innerHTML = p.lotes.length
        ? "<span>Desde <b>" + clp(desde(p)) + "</b></span><span><b>" + disponibles(p).length + "</b> de " + p.lotes.length + " disponibles</span><span>Parcelas de <b>" + m2(p.lotes[0].m2) + "</b></span><span>Reserva <b>" + clp(RESERVA) + "</b></span>"
        : "";
      f.note.textContent = p.cercaniasNota || "";
      f.map.href = p.mapa || "#";
      f.actions.innerHTML = '<a class="btn btn-dark" href="#plano" data-act="plano">Ver lotes disponibles' + arrow + '</a><a class="btn btn-line" href="#visita" data-act="visita">Agendar una visita</a>';
      if (p.video) f.actions.insertAdjacentHTML("beforeend", '<button class="btn btn-line" type="button" data-act="video"><svg class="i" aria-hidden="true"><use href="#i-play"/></svg>Ver video</button>');
      if (p.tour) f.actions.insertAdjacentHTML("beforeend", '<a class="btn btn-line" href="#recorrido" data-act="tour"><svg class="i" aria-hidden="true"><use href="#i-360"/></svg>Recorrido 360°</a>');
      if (p.entorno) f.actions.insertAdjacentHTML("beforeend", '<a class="btn btn-line" href="' + esc(p.entorno) + '"><svg class="i" aria-hidden="true"><use href="#i-pin"/></svg>Descubre el entorno</a>');
      $$("[data-act]", f.actions).forEach(function (a) {
        a.addEventListener("click", function (e) {
          var act = a.getAttribute("data-act");
          if (act === "plano") Plan.apply({ id: p.id, soloDisponibles: true });
          if (act === "tour") { e.preventDefault(); dlg.close(); Tour.open(p.id, true); return; }
          if (act === "video") { dlg.close(); Video.open(p.id); return; }
          if (act === "visita") Visit.prefill({ proyecto: p.nombre, mensaje: "" });
          dlg.close();
        });
      });
      dlg.showModal();
      dlg.scrollTop = 0;
    }
    $$("[data-open-project]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); open(a.getAttribute("data-open-project")); });
    });
    $("[data-pd-close]", dlg).addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* =============================================================
     Recorrido virtual 360°: se abre dentro de la página
     El marco se crea solo cuando la persona entra (no carga nada antes)
     ============================================================= */
  function initTour() {
    var root = $("[data-tour]");
    if (!root) return;
    var stage = $("[data-tour-stage]", root), poster = $("[data-tour-poster]", root), frame = $("[data-tour-frame]", root);
    var lens = $("[data-tour-enter]", root), status = $("[data-tour-status]", root), fullBtn = $("[data-tour-full]", root);
    var picks = $$("[data-tour-pick]", root);
    var first = proyecto(DESTACADO) && proyecto(DESTACADO).tour ? proyecto(DESTACADO) : proyectos.filter(function (p) { return p.tour; })[0];
    if (!stage || !first) return;
    var cur = "", blocked = false, iframe = null, timer = 0, token = 0;
    var seen = {};   // proyectos cuyo recorrido sí se abrió

    function T() { return proyecto(cur); }
    function state(v) { if (v) stage.setAttribute("data-state", v); return stage.getAttribute("data-state"); }
    function setText(sel, txt) { $$(sel, root).forEach(function (el) { el.textContent = txt; }); }
    function art(id) { return $('.project[data-project="' + id + '"] .project-art svg'); }

    // Miniaturas del selector, tomadas de la ilustración de cada proyecto
    picks.forEach(function (a) {
      var p = proyecto(a.getAttribute("data-tour-pick"));
      if (!p || !p.tour) { a.hidden = true; return; }
      a.href = p.tour;
      var src = art(p.id), box = $(".tour-pick-art", a);
      if (src && box) box.appendChild(src.cloneNode(true));
      a.addEventListener("click", function (e) {
        if (blocked) { select(p.id, false); return; } // sin marco: el enlace abre el recorrido en otra pestaña y la sección se pone al día
        e.preventDefault();
        select(p.id, state() === "live" || state() === "loading");
      });
    });

    function select(id, go) {
      var p = proyecto(id);
      if (!p || !p.tour) return;
      var changed = id !== cur;
      cur = id;
      picks.forEach(function (a) { a.setAttribute("aria-current", a.getAttribute("data-tour-pick") === id ? "true" : "false"); });
      var nav = $(".tour-picker", root), act = $('.tour-pick[aria-current="true"]', root);
      if (nav && act && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: act.offsetLeft - (nav.clientWidth - act.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
      if (changed) {
        poster.innerHTML = "";
        var src = art(id);
        if (src) poster.appendChild(src.cloneNode(true));
        setText("[data-tour-name], [data-tour-hud-name], [data-tour-dock-name]", p.nombre);
        setText("[data-tour-region]", p.region + " · " + p.zona);
        setText("[data-tour-label]", "al recorrido 360° de " + p.nombre);
        lens.href = p.tour;
        $$("[data-tour-newtab]", root).forEach(function (a) { a.href = p.tour; });
        var share = $("[data-tour-share]", root);
        if (share) share.href = "https://wa.me/?text=" + encodeURIComponent("Mira el recorrido 360° de " + p.nombre + " de Fundos Inmobiliaria: " + p.tour);
      }
      if (go && !changed && (state() === "live" || state() === "loading")) return; // ya está abierto: no se recarga
      if (go) enter();
      else if (changed) leave();
    }

    // Centro del portal: la lente
    function center() {
      var s = stage.getBoundingClientRect(), l = lens.getBoundingClientRect();
      if (!l.width) return;
      stage.style.setProperty("--cx", Math.round(l.left + l.width / 2 - s.left) + "px");
      stage.style.setProperty("--cy", Math.round(l.top + l.height / 2 - s.top) + "px");
    }
    function drop(f, wait) {
      window.setTimeout(function () { if (f && f.parentNode) f.parentNode.removeChild(f); }, wait);
    }

    function enter() {
      if (blocked) return;
      var p = T(), my = ++token;
      window.clearTimeout(timer);
      if (state() === "live") { state("loading"); drop(iframe, reduced ? 0 : 650); iframe = null; }
      else { drop(iframe, 0); iframe = null; }
      center();
      state("loading");
      setText("[data-tour-cta]", "Cargando");
      status.textContent = "Cargando el recorrido de " + p.nombre + "…";
      var f = document.createElement("iframe");
      f.src = p.tour;
      f.title = "Recorrido virtual 360° de " + p.nombre;
      f.setAttribute("allow", "fullscreen; accelerometer; gyroscope; magnetometer; xr-spatial-tracking; autoplay");
      f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      f.addEventListener("load", function () { window.setTimeout(function () { reveal(my); }, 180); });
      // Se espera al cierre del portal anterior antes de montar el nuevo
      window.setTimeout(function () { if (my === token && !blocked) { frame.appendChild(f); iframe = f; } }, frame.firstChild ? (reduced ? 0 : 650) : 0);
      timer = window.setTimeout(function () { reveal(my); }, 12000);
    }
    function reveal(my) {
      if (my !== token || blocked || state() !== "loading") return;
      window.clearTimeout(timer);
      state("live");
      seen[cur] = true;
      setText("[data-tour-cta]", "Entrar");
      setText("[data-tour-dock-q]", "¿Te gustó");
      status.textContent = "Recorrido de " + T().nombre + " abierto. Arrastra para mirar alrededor.";
      var ae = document.activeElement;
      if (!ae || ae === document.body || root.contains(ae)) $("[data-tour-close]", root).focus({ preventScroll: true });
    }
    function leave() {
      token++;
      window.clearTimeout(timer);
      if (blocked) return;
      var was = state();
      state("poster");
      setText("[data-tour-cta]", "Entrar");
      exitFull();
      drop(iframe, was === "live" && !reduced ? 700 : 0); // el marco se retira al cerrarse el portal
      iframe = null;
      if (was === "live") status.textContent = "Saliste del recorrido.";
    }

    // Donde no se permite incrustar otros sitios (política de seguridad), se ofrece abrirlo aparte
    document.addEventListener("securitypolicyviolation", function (e) {
      var d = e.effectiveDirective || e.violatedDirective || "";
      if (blocked || state() !== "loading" || !/^(frame|child|default)-src/.test(d)) return;
      blocked = true;
      token++;
      window.clearTimeout(timer);
      drop(iframe, 0); iframe = null;
      state("blocked");
      setText("[data-tour-cta]", "Abrir");
      status.textContent = "El recorrido no se puede mostrar aquí. Puedes abrirlo en una pestaña nueva.";
    });

    lens.addEventListener("click", function (e) {
      if (blocked) return;
      e.preventDefault();
      if (state() === "poster") enter();
    });
    $("[data-tour-close]", root).addEventListener("click", function () { leave(); lens.focus({ preventScroll: true }); });

    // Pantalla completa: nativa si el navegador la permite; si no, a toda la ventana
    function isFull() { return document.fullscreenElement === stage || stage.classList.contains("is-immersive"); }
    function syncFull() {
      var on = isFull();
      fullBtn.setAttribute("aria-label", on ? "Salir de pantalla completa" : "Ver en pantalla completa");
      fullBtn.title = on ? "Salir de pantalla completa" : "Pantalla completa";
      $("use", fullBtn).setAttribute("href", on ? "#i-shrink" : "#i-expand");
    }
    function immersive() {
      stage.classList.add("is-immersive");
      document.body.classList.add("tour-lock");
      var n = stage;
      while (n && n !== document.body) {
        [].forEach.call(n.parentNode.children, function (s) {
          if (s !== n && !s.inert && s.tagName !== "SCRIPT") { s.inert = true; s.setAttribute("data-tour-inert", ""); }
        });
        n = n.parentNode;
      }
      syncFull();
      $("[data-tour-close]", root).focus({ preventScroll: true });
    }
    function exitFull() {
      if (document.fullscreenElement === stage && document.exitFullscreen) {
        var r = document.exitFullscreen();
        if (r && r.catch) r.catch(function () {});
      }
      var wasImm = stage.classList.contains("is-immersive");
      stage.classList.remove("is-immersive");
      document.body.classList.remove("tour-lock");
      $$("[data-tour-inert]").forEach(function (s) { s.inert = false; s.removeAttribute("data-tour-inert"); });
      syncFull();
      if (wasImm) fullBtn.focus({ preventScroll: true });
    }
    fullBtn.addEventListener("click", function () {
      if (isFull()) { exitFull(); return; }
      if (stage.requestFullscreen && document.fullscreenEnabled) {
        var r = stage.requestFullscreen();
        if (r && r.then) r.then(syncFull, immersive);
      } else immersive();
    });
    document.addEventListener("fullscreenchange", syncFull);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && stage.classList.contains("is-immersive")) exitFull(); });

    // La ilustración responde al cursor mientras espera
    if (fineHover && !reduced) {
      stage.addEventListener("pointermove", function (e) {
        if (state() === "live") return;
        var r = stage.getBoundingClientRect();
        stage.style.setProperty("--mx", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        stage.style.setProperty("--my", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      });
    }

    // Acciones de cierre
    var plan = $("[data-tour-plan]", root), visit = $("[data-tour-visit]", root);
    if (plan) plan.addEventListener("click", function () { Plan.show(cur); });
    if (visit) visit.addEventListener("click", function () {
      Visit.prefill({ proyecto: T().nombre, mensaje: seen[cur] ? "Vi el recorrido 360° de " + T().nombre + "." : "" });
    });

    // Conexión anticipada a los recorridos cuando la sección se acerca
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        var seen = {};
        proyectos.forEach(function (p) {
          if (!p.tour) return;
          var o = p.tour.split("/").slice(0, 3).join("/");
          if (seen[o]) return;
          seen[o] = 1;
          var l = document.createElement("link");
          l.rel = "preconnect"; l.href = o;
          document.head.appendChild(l);
        });
      }, { rootMargin: "600px 0px" });
      io.observe(root);
    }

    // Accesos desde otras partes de la página
    var pickerNav = $(".tour-picker", root);
    if (pickerNav) pickerNav.addEventListener("focusin", function (e) {
      var a = e.target.closest(".tour-pick");
      if (a) a.scrollIntoView({ inline: "nearest", block: "nearest", behavior: reduced ? "auto" : "smooth" });
    });
    function toStage() {
      stage.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      var t = state() === "live" ? $("[data-tour-close]", root) : (state() === "blocked" ? $("[data-tour-blocked] a", root) : lens);
      if (t) t.focus({ preventScroll: true });
    }
    Tour.open = function (id, go) { select(id, go); window.setTimeout(toStage, 40); };
    $$("[data-tour-open]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("data-tour-open");
        if (id === "plan") id = Plan.current();
        e.preventDefault();
        Tour.open(id, true);
      });
    });
    $$('a[href="#recorrido"]:not([data-tour-open])').forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); toStage(); });
    });

    var m = /^#recorrido-([a-z0-9-]+)$/.exec(location.hash);
    select(m && proyecto(m[1]) ? m[1] : first.id, false);
    if (m) window.setTimeout(toStage, 80);
  }

  /* =============================================================
     Videos: portada del hero y visor para cada proyecto
     Se configuran en lib/manifest.js (videoPortada y video de cada proyecto)
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
    // Portadas: video de fondo sobre una imagen que queda de respaldo. Se crean cuando su pestaña se ve.
    heroVideo($("[data-hero]"), B.videoPortada || {}, $("[data-hero-video-toggle]"));
    heroVideo($("[data-pvhero]"), B.videoDestacado || {}, $("[data-pv-toggle]"));

    // Visor
    var dlg = $("[data-vdialog]");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var box = $("[data-vd-frame]", dlg), title = $("[data-vd-title]", dlg);
    var blockedMsg = $("[data-vd-blocked]", dlg), link = $("[data-vd-link]", dlg);
    var loading = false;

    function stop() { box.innerHTML = ""; loading = false; }
    function open(id) {
      var p = proyecto(id);
      if (!p || !p.video) return;
      openSrc(p.video, p.nombre + " en video", false);
    }
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
        f.title = "Video de " + p.nombre;
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
    $$("[data-video-file]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        openSrc(a.getAttribute("href"), a.getAttribute("data-video-title") || "Video", a.hasAttribute("data-vertical"), a.getAttribute("data-video-webm"));
      });
    });
    Video.open = open;
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

    $$("[data-video-open]").forEach(function (b) {
      var p = proyecto(b.getAttribute("data-video-open"));
      if (!p || !p.video) return;
      b.hidden = false;
      b.addEventListener("click", function () { open(p.id); });
    });
  }

  /* =============================================================
     Barra de acción móvil
     ============================================================= */
  function initMobileBar() {
    var bar = $("[data-mbar]"), hero = $("[data-hero]"), visit = $("#visita"), fab = $(".wa-float");
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
        '<img src="' + esc(g.foto) + '" alt="" width="600" height="750" loading="lazy" decoding="async">' +
        (g.video ? '<span class="seller-badge"><svg class="i" aria-hidden="true"><use href="#i-play"/></svg>Saludo en video</span>' : "") +
        '<span class="seller-info"><strong>' + esc(titulo(g)) + '</strong>' + (g.nombre ? '<span>' + esc(sub(g)) + '</span>' : "") +
        '<span class="seller-more">Ver ficha' + arrow + '</span></span></button>';
      list.insertBefore(li, cta);
    });
    // El scroll-snap se quedaba "pegado" a la tarjeta final al insertar las demás: volver al inicio
    list.scrollLeft = 0;
    requestAnimationFrame(function () { list.scrollLeft = 0; });

    // Flechas del carrusel (computador)
    $$("[data-sellers-prev], [data-sellers-next]").forEach(function (b) {
      b.addEventListener("click", function () {
        var card = $("li", list), step = card ? card.getBoundingClientRect().width + 16 : 260;
        list.scrollBy({ left: (b.hasAttribute("data-sellers-next") ? 1 : -1) * step * 2, behavior: reduced ? "auto" : "smooth" });
      });
    });

    var dlg = $("[data-sdialog]");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var media = $("[data-sd-media]", dlg), faces = $("[data-sd-faces]", dlg), cur = 0;
    var bio = $("[data-sd-bio]", dlg), bioBase = bio.innerHTML, ticks = $("[data-sd-list]", dlg);
    var el = { title: $("[data-sd-title]", dlg), role: $("[data-sd-role]", dlg), count: $("[data-sd-count]", dlg), wa: $("[data-sd-wa]", dlg), visit: $("[data-sd-visit]", dlg) };
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
      media.innerHTML = '<img src="' + esc(g.foto) + '" alt="' + esc(g.nombre ? g.nombre + ", del equipo de Fundos" : "Integrante del equipo de Fundos Inmobiliaria") + '" width="600" height="750" decoding="async">' +
        (g.video ? '<button type="button" class="sd-play" data-sd-play><span class="sd-play-dot" aria-hidden="true"><svg class="i"><use href="#i-play"/></svg></span>Ver su saludo<small>12 s · con sonido</small></button>' : "");
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
      photo(g);
      el.title.textContent = titulo(g);
      el.role.textContent = sub(g);
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
      if (b) open(+b.getAttribute("data-seller"));
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
      Visit.prefill({ mensaje: g.nombre ? "Me gustaría que me atienda " + g.nombre + "." : "", scroll: true });
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
    $$(".hero, .ticker, .tour-stage, .phone, .plan-canvas").forEach(function (el) { io.observe(el); });
  }

  /* =============================================================
     Tu compra: Cómo comprar · Simulador · Preguntas · Mi compra en pestañas
     Los enlaces #como-comprar, #simulador, #preguntas y #portal abren su pestaña.
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
    $$("[data-otro]").forEach(function (card) {
      var o = proyecto(card.getAttribute("data-otro"));
      if (!o) return;
      var d0 = desde(o), src = $('.project[data-project="' + o.id + '"] .project-art svg'), art = $("[data-otro-art]", card);
      if (src && art && !$("img", art)) art.appendChild(src.cloneNode(true));
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
    safe(initHero, "initHero");
    safe(initProjects, "initProjects");
    safe(initVisit, "initVisit");
    safe(initSim, "initSim");
    safe(initPlan, "initPlan");
    safe(initTour, "initTour");
    safe(initVideo, "initVideo");
    safe(initFinder, "initFinder");
    safe(initDialog, "initDialog");
    safe(initMobileBar, "initMobileBar");
    safe(initFaq, "initFaq");
    safe(initCompra, "initCompra");
    safe(initSellers, "initSellers");
    safe(initPV, "initPV");
    safe(initOffscreen, "initOffscreen");
    $$('input[type="range"]').forEach(paintRange);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
