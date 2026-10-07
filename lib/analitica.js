/* =============================================================
   Medición de visitas: Google Analytics 4 y/o Microsoft Clarity, solo si su ID está en
   lib/manifest.js (analitica). Sin IDs no se carga nada.
   Eventos propios (los mismos nombres en ambos servicios):
     generate_lead      se abre WhatsApp con el mensaje de un formulario (visita o portada)
     contacto_whatsapp  cualquier otro botón de WhatsApp
     tour_360           se entra a un recorrido 360°
     ver_lotes          se abre el plano desde un botón "Ver lotes" / "Ver parcelas"
     ver_entorno        se abre el mapa del entorno
   ============================================================= */
(function () {
  "use strict";
  var A = ((window.__BRAND__ || {}).analitica) || {};
  var ga = /^G-[A-Z0-9]+$/i.test(A.ga4 || "") ? A.ga4 : "";
  var cl = /^[a-z0-9]{6,}$/i.test(A.clarity || "") ? A.clarity : "";
  if (!ga && !cl) return;
  var embed = /[?&]embed=1/.test(location.search) || /vitrina\.html$/.test(location.pathname);

  if (ga) {
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

  function evento(nombre, datos) {
    if (ga) window.gtag("event", nombre, datos || {});
    if (cl) window.clarity("event", nombre);
  }
  window.fundosEvento = evento;

  function proyecto() {
    var sel = document.querySelector("#v-proyecto");
    return (sel && sel.value) || "";
  }
  // Un solo escucha para todo el sitio: no hay que tocar cada módulo
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a, button");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (a.matches("[data-visit-fallback]")) evento("generate_lead", { formulario: "visita", proyecto: proyecto() });
    else if (a.matches("[data-pv-lead-wa]")) evento("generate_lead", { formulario: "portada" });
    else if (/wa\.me\//.test(href)) evento("contacto_whatsapp", { boton: (a.textContent || "").trim().slice(0, 60) });
    else if (a.matches("[data-tour-enter], [data-tour-open], [data-py-act='tour']") || /#tour-360$/.test(href)) evento("tour_360");
    else if (a.matches("[data-goto-plan], [data-pv-plan], [data-plan-disp], [data-py-act='plano'], [data-tour-plan]")) evento("ver_lotes");
    else if (/entorno\.html/.test(href)) evento("ver_entorno");
  }, true);
})();
