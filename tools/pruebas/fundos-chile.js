// "Fundos en todo Chile" (la pestaña Proyectos): mapa largo de Chile con los fundos, galería de norte a sur por región y
// ficha en una ventana con fotos, flechas y teclado; enlaces #proyecto-ID y enlaces viejos (#recorrido, #conoce).
// Uso: node fundos-chile.js   (desde una carpeta temporal con ux/; ver LEEME.md)
const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:8765/";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const out = {}, errs = [];
  for (const [w, h, touch] of [[1440, 900, false], [1280, 760, false], [390, 844, true], [320, 640, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    const p = await ctx.newPage(); p.on("pageerror", e => errs.push(w + ": " + e));
    await p.goto(BASE + "#mas-proyectos", { waitUntil: "load" }); await p.waitForTimeout(900);
    const r = {};
    r.vista = await p.evaluate(() => document.documentElement.dataset.vista);
    // en la pestaña solo se ve el mapa de Chile
    r.secciones = await p.evaluate(() => [...document.querySelectorAll("main > *")].filter(e => getComputedStyle(e).display !== "none" && e.offsetHeight).map(e => e.id));
    r.tiles = await p.evaluate(() => document.querySelectorAll(".mch-tile").length);
    r.grupos = await p.evaluate(() => [...document.querySelectorAll(".mch-grupo")].map(g => g.textContent).join(" | "));
    r.pines = await p.evaluate(() => document.querySelectorAll("[data-mch-mapa] .mch-pin").length);
    // en computador el mapa mide lo mismo que la galería (±60 px)
    r.altos = await p.evaluate(() => [Math.round(document.querySelector("[data-mch-mapa]").getBoundingClientRect().height), Math.round(document.querySelector("[data-mch-list]").getBoundingClientRect().height)]);
    // Tocar Puerto Varas abre la ficha con 6 fotos
    const t = await p.$('.mch-tile[data-p="puerto-varas"] .mch-tile-b');
    await t.evaluate(e => e.scrollIntoView({ block: "center" })); await t.click(); await p.waitForTimeout(900);
    r.ventana = await p.evaluate(() => [document.querySelector("[data-mch-ficha]").open, document.querySelector(".mf-t").textContent]);
    r.acciones = await p.evaluate(() => [...document.querySelectorAll(".mch-ficha .py-acts a")].map(a => a.getAttribute("href")));
    await p.click(".mf-flecha:not(.is-prev)"); await p.waitForTimeout(300);
    r.flechaSig = await p.evaluate(() => document.querySelector(".mf-t").textContent);
    await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(300);
    r.tecladoAnt = await p.evaluate(() => document.querySelector(".mf-t").textContent);
    r.fotos = await p.evaluate(() => document.querySelectorAll(".mf-mini button").length);
    await p.click(".mf-mini button:nth-child(3)"); await p.waitForTimeout(300);
    r.foto3 = await p.evaluate(() => document.querySelector("[data-mf-cap]").textContent);
    await p.screenshot({ path: `ux/fch-${w}-pv.png` });
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    r.cierraEsc = await p.evaluate(() => !document.querySelector("[data-mch-ficha]").open && !!document.activeElement.closest("[data-mch]"));
    // Talca (fotos del cliente, "Quiero información" por WhatsApp)
    const s = await p.$('.mch-tile[data-p="talca"] .mch-tile-b'); await s.evaluate(e => e.scrollIntoView({ block: "center" })); await s.click(); await p.waitForTimeout(800);
    r.talca = await p.evaluate(() => [document.querySelector(".mf-t").textContent, document.querySelectorAll(".mf-mini button").length, !!document.querySelector('.mch-ficha .py-acts a[href^="https://wa.me"]')]);
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    // Tocar el nombre de un fundo en el mapa abre su ficha (en celular los puntos del sur quedan muy juntos)
    const rot = await p.$('[data-mch-mapa] .mch-rot[data-p="rio-negro"] text');
    await rot.evaluate(e => e.scrollIntoView({ block: "center" })); await p.waitForTimeout(200);
    await rot.click(); await p.waitForTimeout(800);
    r.nombre = await p.evaluate(() => document.querySelector("[data-mch-ficha]").open && document.querySelector(".mf-t").textContent);
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    // "Ver lotes y precios" de Malalcahuello lleva al plano (en Inicio)
    const m = await p.$('.mch-tile[data-p="malalcahuello"] .mch-tile-b'); await m.evaluate(e => e.scrollIntoView({ block: "center" })); await m.click(); await p.waitForTimeout(700);
    await p.click('.mch-ficha [data-mf="plano"]'); await p.waitForTimeout(1200);
    r.verLotes = await p.evaluate(() => [document.documentElement.dataset.vista, getComputedStyle(document.getElementById("plano")).display !== "none", Math.round(document.getElementById("plano").getBoundingClientRect().top) < innerHeight]);
    r.ancho = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    // Enlaces directos
    await p.goto(BASE + "#proyecto-marchigue", { waitUntil: "load" }); await p.waitForTimeout(1000);
    r.hashProyecto = await p.evaluate(() => [document.documentElement.dataset.vista, document.querySelector("[data-mch-ficha]").open && document.querySelector(".mf-t").textContent]);
    for (const old of ["recorrido", "conoce", "proyectos", "proyectos-inicio", "inicio"]) {
      await p.goto(BASE + "#" + old, { waitUntil: "load" }); await p.waitForTimeout(500);
      r["viejo-" + old] = await p.evaluate(() => document.documentElement.dataset.vista);
    }
    await p.goto(BASE + "#mas-proyectos", { waitUntil: "load" }); await p.waitForTimeout(800);
    await p.screenshot({ path: `ux/fch-${w}.png` });
    out[w] = r; await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  console.log(errs.length ? errs : "no errors");
  await b.close();
})();
