/* =============================================================
   Medición de visitas: Google Analytics 4 y/o Microsoft Clarity, solo si su ID está en
   lib/manifest.js (analitica) Y la persona aceptó las cookies de análisis (Ley 19.628 modificada por la Ley 21.719:
   consentimiento previo). Banner de cookies y preferencias aquí mismo (window.fundosCookies.abrir(), o cualquier
   elemento con [data-cookies-prefs]). La decisión se guarda 12 meses en localStorage "fundos-cookies"
   ({v, analitica, t}); al rechazar después de haber aceptado se borran las cookies _ga. Dentro de un iframe no se
   muestra el banner (sin consentimiento guardado, no se mide). Detalle de cada cookie: cookies.html.
   Eventos propios (los mismos nombres en ambos servicios):
     generate_lead      se abre WhatsApp con un mensaje armado (formulario: visita, portada, vende-tu-campo, proveedores,
                        simulacion, casa, favoritos, consulta-lote). Marcarlo como "evento clave" en Google Analytics.
     contacto_whatsapp  cualquier otro botón de WhatsApp (boton: su texto)
     tour_360           se entra a un recorrido 360°
     ver_lotes          se abre el plano desde un botón "Ver lotes" / "Ver parcelas"
     ver_entorno        se abre el mapa del entorno
     ver_ficha          se abre la ficha de un fundo en Proyectos (fundo, con_plano)      ← desde main.js
     ver_lote           se elige un lote en el plano (proyecto, lote, estado)             ← desde main.js
     ver_asesor         se abre la ficha de una persona del equipo (asesor)               ← desde main.js
     page_view          al cambiar de pestaña (Inicio, Proyectos, Tu compra, Equipo): cada una cuenta como página
   ============================================================= */
(function () {
  "use strict";
  var A = ((window.__BRAND__ || {}).analitica) || {};
  var ga = /^G-[A-Z0-9]+$/i.test(A.ga4 || "") ? A.ga4 : "";
  var cl = /^[a-z0-9]{6,}$/i.test(A.clarity || "") ? A.clarity : "";
  var embed = /[?&]embed=1/.test(location.search) || /vitrina\.html$/.test(location.pathname);
  var enIframe = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  var CLAVE = "fundos-cookies", VERSION = 1, VIGENCIA = 365 * 24 * 3600 * 1000;
  var cargado = false;

  function leer() {
    try {
      var c = JSON.parse(localStorage.getItem(CLAVE) || "null");
      if (!c || c.v !== VERSION || !c.t || Date.now() - Date.parse(c.t) > VIGENCIA) return null;
      return c;
    } catch (e) { return null; }
  }
  function guardar(analitica) {
    var c = { v: VERSION, analitica: !!analitica, t: new Date().toISOString() };
    try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch (e) { /* sin almacenamiento: vale para esta visita */ }
    return c;
  }
  function borrarCookiesAnalisis() {
    var dom = location.hostname.replace(/^www\./, "");
    document.cookie.split(";").forEach(function (k) {
      var n = k.split("=")[0].trim();
      if (!/^(_ga|_gid|_gat|_clck|_clsk|CLID)/.test(n)) return;
      ["", "; domain=" + dom, "; domain=." + dom].forEach(function (d) {
        document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + d;
      });
    });
  }

  function cargar() {
    if (cargado || (!ga && !cl)) return;
    cargado = true;
    if (ga) {
      window["ga-disable-" + ga] = false;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", ga, { incrustado: embed ? "si" : "no" });
      var g = document.createElement("script");
      g.async = true; g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga);
      document.head.appendChild(g);
    }
    if (cl) {
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      var c = document.createElement("script");
      c.async = true; c.src = "https://www.clarity.ms/tag/" + encodeURIComponent(cl);
      document.head.appendChild(c);
      if (embed) window.clarity("set", "incrustado", "si");
    }
  }
  function aplicar(c) {
    if (c && c.analitica) cargar();
    else if (cargado) {   // retiró el consentimiento en esta visita: se corta y se borran las cookies
      if (ga) window["ga-disable-" + ga] = true;
      cargado = false;
      borrarCookiesAnalisis();
    } else borrarCookiesAnalisis();
  }

  /* ---------- Banner y preferencias ---------- */
  var CSS = ".ck{position:fixed;z-index:2147483000;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));max-width:460px;" +
    "background:#0F1F16;color:#F7F5F0;border:1px solid rgba(247,245,240,.16);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.35);" +
    "padding:18px 18px 16px;font:400 .9rem/1.5 Mulish,-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}" +
    ".ck[hidden]{display:none}.ck h2{margin:0 0 6px;font:600 1.25rem/1.15 'Cormorant Garamond',Garamond,serif;color:#F7F5F0}" +
    ".ck p{margin:0 0 12px;color:rgba(247,245,240,.82)}.ck a{color:#D8B982;text-decoration:underline;text-underline-offset:3px}" +
    ".ck-acc{display:flex;flex-wrap:wrap;gap:8px}.ck-acc button{flex:1 1 auto;min-height:44px;padding:0 16px;border-radius:999px;cursor:pointer;" +
    "font:700 .86rem/1 Mulish,system-ui,sans-serif;border:1px solid rgba(247,245,240,.38);background:transparent;color:#F7F5F0}" +
    ".ck-acc button:hover{background:rgba(247,245,240,.08)}.ck-acc .ck-si{background:#C8A165;border-color:#C8A165;color:#0A140E}" +
    ".ck-acc .ck-si:hover{background:#D8B982}.ck button:focus-visible,.ck input:focus-visible,.ck a:focus-visible{outline:2px solid #D8B982;outline-offset:2px}" +
    ".ck-op{display:grid;gap:10px;margin:0 0 14px;padding:0;list-style:none}.ck-op li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;" +
    "border:1px solid rgba(247,245,240,.14);border-radius:10px}.ck-op input{width:20px;height:20px;margin:2px 0 0;flex:none;accent-color:#C8A165}" +
    ".ck-op b{display:block;font-weight:700;color:#F7F5F0}.ck-op small{display:block;color:rgba(247,245,240,.7);font-size:.8rem}" +
    "@media (min-width:700px){.ck{left:24px;right:auto;bottom:24px}}@media print{.ck{display:none}}";
  var el = null, previo = null;
  function armar() {
    if (el) return el;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement("section");
    el.className = "ck"; el.hidden = true;
    el.setAttribute("aria-labelledby", "ck-t"); el.setAttribute("role", "region");
    el.innerHTML =
      '<h2 id="ck-t">Cookies en este sitio</h2>' +
      '<p>Usamos cookies necesarias para que el sitio funcione y, solo si las aceptas, cookies de análisis de Google Analytics ' +
      'para saber qué partes se visitan y mejorar el sitio. Puedes cambiar tu decisión cuando quieras. ' +
      '<a href="cookies.html">Política de cookies</a> · <a href="privacidad.html">Privacidad</a></p>' +
      '<ul class="ck-op" data-ck-op hidden>' +
      '<li><input type="checkbox" checked disabled id="ck-nec"><label for="ck-nec"><b>Necesarias</b><small>Recuerdan tus favoritos, la pestaña y esta decisión. Siempre activas.</small></label></li>' +
      '<li><input type="checkbox" id="ck-ana" data-ck-ana><label for="ck-ana"><b>Análisis</b><small>Google Analytics: páginas y botones visitados, sin tu nombre, teléfono ni correo.</small></label></li>' +
      "</ul>" +
      '<div class="ck-acc"><button type="button" data-ck="no">Rechazar</button>' +
      '<button type="button" data-ck="config">Configurar</button>' +
      '<button type="button" class="ck-si" data-ck="si">Aceptar</button></div>';
    document.body.appendChild(el);
    el.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-ck]");
      if (!b) return;
      var acc = b.getAttribute("data-ck"), op = el.querySelector("[data-ck-op]"), ana = el.querySelector("[data-ck-ana]");
      if (acc === "config") {
        op.hidden = false;
        b.setAttribute("data-ck", "guardar"); b.textContent = "Guardar";
        ana.focus();
        return;
      }
      var c = guardar(acc === "si" ? true : acc === "no" ? false : ana.checked);
      cerrar();
      aplicar(c);
    });
    el.addEventListener("keydown", function (e) { if (e.key === "Escape" && leer()) cerrar(); });
    return el;
  }
  function abrir(configurar) {
    armar();
    var c = leer(), op = el.querySelector("[data-ck-op]"), cfg = el.querySelector('[data-ck="config"], [data-ck="guardar"]');
    el.querySelector("[data-ck-ana]").checked = !!(c && c.analitica);
    op.hidden = !configurar;
    cfg.setAttribute("data-ck", configurar ? "guardar" : "config");
    cfg.textContent = configurar ? "Guardar" : "Configurar";
    previo = document.activeElement;
    el.hidden = false;
    if (configurar) el.querySelector("[data-ck-ana]").focus();
  }
  function cerrar() {
    if (!el) return;
    el.hidden = true;
    if (previo && previo.focus && document.contains(previo)) { try { previo.focus(); } catch (e) { /* nada */ } }
    previo = null;
  }
  window.fundosCookies = { abrir: function () { abrir(true); }, estado: leer };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-cookies-prefs]");
    if (!a) return;
    e.preventDefault();
    abrir(true);
  });

  function iniciar() {
    var c = leer();
    if (c) aplicar(c);
    else if (!enIframe && (ga || cl)) abrir(false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  /* ---------- Eventos (solo con consentimiento) ---------- */
  function evento(nombre, datos) {
    if (!cargado) return;
    if (ga) window.gtag("event", nombre, datos || {});
    if (cl) window.clarity("event", nombre);
  }
  window.fundosEvento = evento;

  function proyecto() {
    var sel = document.querySelector("#v-proyecto");
    return (sel && sel.value) || "";
  }
  function lote() {
    var t = document.querySelector("[data-d-title]"), pr = document.querySelector("[data-d-project]");
    return ((pr && pr.textContent.split(" · ")[0]) || "") + " " + ((t && t.textContent) || "");
  }
  // Las pestañas de la página cuentan como páginas (Inicio, Proyectos, Tu compra, Equipo)
  var NOMBRES = { inicio: "Inicio", proyectos: "Proyectos", compra: "Tu compra", equipo: "Equipo" }, primera = true;
  document.addEventListener("fundos:vista", function (e) {
    if (primera) { primera = false; return; }   // la primera ya la cuenta "config"
    if (ga && cargado) window.gtag("event", "page_view", { page_title: "Fundos · " + (NOMBRES[e.detail] || e.detail), page_location: location.origin + location.pathname + "#" + e.detail });
  });
  // Un solo escucha para todo el sitio: no hay que tocar cada módulo
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a, button");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (a.matches("[data-visit-fallback]")) evento("generate_lead", { formulario: "visita", proyecto: proyecto() });
    else if (a.matches("[data-pv-lead-wa]")) evento("generate_lead", { formulario: "portada" });
    else if (a.matches("[data-pago-wa]")) evento("generate_lead", { formulario: "simulacion", lote: lote() });
    else if (a.matches("[data-c-wa]")) evento("generate_lead", { formulario: "casa" });
    else if (a.matches("[data-favs-send]")) evento("generate_lead", { formulario: "favoritos" });
    else if (a.matches("[data-d-wa]")) evento("generate_lead", { formulario: "consulta-lote", lote: lote() });
    else if (a.matches("[data-mini-wa]")) { var f = a.closest("[data-mini-form]"); evento("generate_lead", { formulario: f ? f.getAttribute("data-mini-form") : "otro" }); }
    else if (/wa\.me\//.test(href)) evento("contacto_whatsapp", { boton: (a.textContent || "").trim().slice(0, 60) });
    else if (a.matches("[data-tour-enter], [data-tour-open], [data-py-act='tour']") || /#tour-360$/.test(href)) evento("tour_360");
    else if (a.matches("[data-goto-plan], [data-pv-plan], [data-plan-disp], [data-py-act='plano'], [data-tour-plan]")) evento("ver_lotes");
    else if (/entorno\.html/.test(href)) evento("ver_entorno");
  }, true);
})();
