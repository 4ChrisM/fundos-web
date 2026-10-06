const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const B = "http://127.0.0.1:8765/";
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] });
  const out = {}, logs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const d = await ctx.newPage();
  d.on("pageerror", e => logs.push("pageerror: " + e.message));
  d.on("console", x => { if (x.type() === "error" || x.type() === "warning") logs.push(x.type() + " " + x.text()); });
  await d.route(/netlify|github\.io/, r => r.fulfill({ status: 200, contentType: "text/html", body: "<body>tour</body>" }));
  await d.goto(B, { waitUntil: "networkidle" }); await d.waitForTimeout(800); await clasica(d);
  // buscador: todos + 15M
  await d.selectOption("#f-presupuesto", "15000000"); await d.waitForTimeout(600);
  out.finder15 = await d.evaluate(() => ({ n: document.querySelector("[data-finder-count]").textContent, label: document.querySelector("[data-finder-label]").textContent, by: document.querySelector("[data-finder-by]").textContent, cta: document.querySelector("[data-finder-cta]").textContent }));
  await d.click(".finder-btn"); await d.waitForTimeout(900);
  out.planFromFinder = await d.evaluate(() => ({ tab: document.querySelector('#plano [aria-selected="true"]').dataset.tab, summary: document.querySelector("[data-summary]").textContent, others: document.querySelector("[data-plan-others]").textContent }));
  await d.click("[data-plan-others] button"); await d.waitForTimeout(400);
  out.afterOther = await d.evaluate(() => ({ tab: document.querySelector('#plano [aria-selected="true"]').dataset.tab, summary: document.querySelector("[data-summary]").textContent }));
  // buscador sin resultados
  await d.evaluate(() => window.scrollTo(0, 0));
  await d.selectOption("#f-destino", "puerto-varas"); await d.selectOption("#f-presupuesto", "10000000"); await d.waitForTimeout(500);
  out.finderZero = await d.evaluate(() => ({ countHidden: document.querySelector("[data-finder-count]").hidden, label: document.querySelector("[data-finder-label]").textContent, cta: document.querySelector("[data-finder-cta]").textContent }));
  await d.click(".finder-btn"); await d.waitForTimeout(800);
  out.planZero = await d.evaluate(() => ({ summary: document.querySelector("[data-summary]").textContent, note: document.querySelector("[data-plan-others]").textContent }));
  // formulario: mensaje de otro proyecto no queda pegado
  await d.evaluate(() => document.querySelector("#recorrido").scrollIntoView({ behavior: "instant" }));
  await d.click("[data-tour-visit]"); await d.waitForTimeout(300);
  const msg1 = await d.inputValue("#v-mensaje");
  await d.evaluate(() => document.querySelector("#proyectos").scrollIntoView({ behavior: "instant" }));
  await d.click('[data-open-project="puerto-varas"]'); await d.waitForTimeout(500);
  out.dialogFacts = await d.evaluate(() => document.querySelector("[data-pd-facts]").textContent);
  await d.click('[data-act="visita"]'); await d.waitForTimeout(500);
  out.stale = { before: msg1, after: await d.inputValue("#v-mensaje"), proyecto: await d.inputValue("#v-proyecto") };
  // mensaje de WhatsApp
  await d.fill("#v-nombre", "Ana"); await d.fill("#v-telefono", "+56 9 1111 2222");
  await d.check('input[name="horario"][value="videollamada"]', { force: true });
  await d.fill("#v-mensaje", "Busco algo cerca de un río");
  await d.check('input[name="acepto"]');
  await d.click('.visit-form button[type="submit"]'); await d.waitForTimeout(300);
  out.waMsg = await d.evaluate(() => document.querySelector("[data-visit-msg]").textContent);
  out.fallbackColor = await d.evaluate(() => { const a = document.querySelector("[data-visit-fallback]"); const cs = getComputedStyle(a); return cs.color + " / " + cs.backgroundColor + " / " + cs.textDecorationLine; });
  // recorrido desde la tarjeta: el visor queda en pantalla
  await d.click("[data-visit-again]");
  await d.evaluate(() => document.querySelector("#proyectos").scrollIntoView({ behavior: "instant" }));
  await d.click('.art-360[data-tour-open="marchigue"]'); await d.waitForTimeout(1600);
  out.tourStage = await d.evaluate(() => { const r = document.querySelector("[data-tour-stage]").getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight]; });
  // simulador desde un lote
  await d.evaluate(() => document.querySelector("#plano").scrollIntoView({ behavior: "instant" }));
  await d.click('#plano [data-tab="malalcahuello"]'); await d.waitForTimeout(300);
  await d.click('#plano .lot[data-n="18"]', { force: true }); await d.waitForTimeout(300);
  await d.click("[data-d-sim]"); await d.waitForTimeout(600);
  out.sim = await d.evaluate(() => ({ out: document.querySelector("[data-s-price-out]").textContent, lot: document.querySelector("[data-s-lot]").textContent, wa: decodeURIComponent(document.querySelector("[data-s-send]").href).slice(0, 160) }));
  // subrayado del menú
  await d.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); await d.waitForTimeout(600);
  out.navAtTop = await d.evaluate(() => [...document.querySelectorAll(".nav-links a.is-current, .nav-portal.is-current")].map(a => a.textContent.trim()));
  await d.evaluate(() => { document.querySelector('[data-tc-tab="portal"]').click(); document.querySelector("#portal").scrollIntoView({ behavior: "instant", block: "center" }); }); await d.waitForTimeout(600);
  out.navAtPortal = await d.evaluate(() => [...document.querySelectorAll(".nav-links a.is-current, .nav-portal.is-current")].map(a => a.textContent.trim()));
  console.log(JSON.stringify(out, null, 1));
  console.log(logs.join("\n") || "no errors");
  await browser.close();
})();
