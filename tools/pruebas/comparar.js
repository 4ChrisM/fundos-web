// Comparador de lotes y "Mi selección" (enlace personal). Guarda 3 favoritos (2 de Puerto Varas y 1 de Malalcahuello),
// abre el comparador, arma el enlace para "Daniela" con una asesora y lo abre en otra página como lo vería el cliente.
// Capturas en ux/: cmp-1920.png, cmp-390.png, sel-390.png, sel-1440.png.
const { chromium } = require("playwright");
const { sinBanner } = require("./_cookies");
const B = "http://127.0.0.1:8765/";
(async () => {
  const browser = sinBanner(await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] }));
  const out = {}, logs = [];
  const nueva = async (vp, movil) => {
    const p = await browser.newPage(Object.assign({ viewport: vp, deviceScaleFactor: 1 }, movil ? { isMobile: true, hasTouch: true } : {}));
    p.on("pageerror", e => logs.push("pageerror: " + e.message));
    p.on("console", x => { if (x.type() === "error" && !/Failed to load resource|disponibilidad|CORS/.test(x.text())) logs.push(x.text()); });
    return p;
  };
  // Lotes disponibles de verdad (según el manifiesto con la disponibilidad aplicada)
  const p = await nueva({ width: 1920, height: 1080 });
  await p.goto(B, { waitUntil: "networkidle" });
  await p.waitForTimeout(1600);
  const ks = await p.evaluate(() => {
    const ps = window.__BRAND__.proyectos, pv = ps.find(x => x.id === "puerto-varas"), ma = ps.find(x => x.id === "malalcahuello");
    const d = x => x.lotes.filter(l => l.estado === "disponible");
    return [pv.id + ":" + d(pv)[0].n, pv.id + ":" + d(pv)[3].n, ma.id + ":" + d(ma)[0].n];
  });
  out.ks = ks;
  await p.evaluate(k => localStorage.setItem("fundos-favoritos", JSON.stringify(k)), ks);
  await p.goto(B + "#plano", { waitUntil: "networkidle" });
  await p.reload({ waitUntil: "networkidle" });   // ir de / a /#plano no recarga: los favoritos se leen al cargar
  await p.waitForSelector("[data-favs-cmp]:not([hidden])", { timeout: 8000 });
  out.boton = await p.evaluate(() => { const b = document.querySelector("[data-favs-cmp]"); return b && !b.hidden && b.textContent.trim(); });
  await p.click("[data-favs-cmp]");
  await p.waitForTimeout(700);
  out.cmp = await p.evaluate(() => {
    const d = document.querySelector("dialog.cmp");
    return { open: d.open, titulo: d.querySelector("h2").textContent, cols: d.querySelectorAll("thead th").length,
      filas: [...d.querySelectorAll("tbody th")].map(t => t.textContent), mejores: [...d.querySelectorAll(".cmp-mejor")].map(x => x.textContent),
      celdas: [...d.querySelectorAll("tbody tr")].slice(0, 6).map(tr => [...tr.querySelectorAll("td")].map(td => td.textContent.trim())) };
  });
  await p.screenshot({ path: "ux/cmp-1920.png" });
  // Compartir: nombre y asesora
  await p.click("[data-cmp-compartir]");
  await p.fill("#cmp-para", "Daniela");
  await p.selectOption("#cmp-asesor", "valentina");
  await p.waitForTimeout(600);
  out.url = await p.inputValue("#cmp-url");
  out.wa = await p.getAttribute("[data-cmp-share-wa]", "href");
  await p.screenshot({ path: "ux/cmp-share-1920.png" });
  // Quitar uno y cerrar
  await p.click("[data-cmp-quitar] >> nth=2");
  out.trasQuitar = await p.evaluate(() => document.querySelectorAll("dialog.cmp thead th").length);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  out.cerrado = await p.evaluate(() => !document.querySelector("dialog.cmp").open && !document.documentElement.classList.contains("cmp-abierto"));
  // Celular: comparador
  const m = await nueva({ width: 390, height: 844 }, true);
  await m.goto(B, { waitUntil: "networkidle" });
  await m.evaluate(k => localStorage.setItem("fundos-favoritos", JSON.stringify(k)), ks);
  await m.goto(B + "#plano", { waitUntil: "networkidle" });
  await m.reload({ waitUntil: "networkidle" });
  await m.waitForSelector("[data-favs-cmp]:not([hidden])", { state: "attached", timeout: 8000 });
  await m.evaluate(() => document.querySelector("[data-favs-cmp]").click());
  await m.waitForTimeout(700);
  out.movil = await m.evaluate(() => ({ docW: document.documentElement.scrollWidth, scrollW: document.querySelector(".cmp-scroll").scrollWidth, w: innerWidth }));
  await m.screenshot({ path: "ux/cmp-390.png" });
  // El cliente abre el enlace
  const c = await nueva({ width: 390, height: 844 }, true);
  await c.goto(out.url.replace(/^https?:\/\/[^/]+\//, B), { waitUntil: "networkidle" });
  await c.waitForTimeout(1800);
  out.sel = await c.evaluate(() => {
    const d = document.querySelector("dialog.cmp");
    return d && { open: d.open, kicker: d.querySelector(".kicker").textContent, titulo: d.querySelector("h2").textContent,
      asesor: d.querySelector("[data-cmp-asesor]").textContent, cols: d.querySelectorAll("thead th").length,
      responder: d.querySelector("[data-sel-wa]") && d.querySelector("[data-sel-wa]").href, vista: document.documentElement.getAttribute("data-vista") };
  });
  await c.screenshot({ path: "ux/sel-390.png" });
  await c.click("[data-sel-guardar]");
  out.guardado = await c.evaluate(() => [JSON.parse(localStorage.getItem("fundos-favoritos") || "[]"), document.querySelector("[data-cmp-aviso]").textContent]);
  await c.click("[data-cmp-ver] >> nth=0");
  await c.waitForTimeout(1200);
  out.verPlano = await c.evaluate(() => ({ dialog: document.querySelector("dialog.cmp").open, lote: document.querySelector("[data-d-title]").textContent }));
  const e = await nueva({ width: 1440, height: 900 });
  await e.goto(out.url.replace(/^https?:\/\/[^/]+\//, B), { waitUntil: "networkidle" });
  await e.waitForTimeout(1800);
  await e.screenshot({ path: "ux/sel-1440.png" });
  // Enlace roto: no abre nada ni rompe la página
  const r = await nueva({ width: 1440, height: 900 });
  await r.goto(B + "#seleccion?l=no-existe.1", { waitUntil: "networkidle" });
  await r.waitForTimeout(1200);
  out.roto = await r.evaluate(() => !document.querySelector("dialog.cmp"));
  out.logs = logs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
