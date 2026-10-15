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
  // formulario: el mensaje de otro proyecto no queda pegado (Cotizar desde la ficha de cada fundo)
  await d.goto(B + "#proyecto-malalcahuello", { waitUntil: "networkidle" }); await d.waitForTimeout(1000);
  await d.click('.mch-ficha [data-mf="cotizar"]'); await d.waitForTimeout(500);
  const msg1 = await d.inputValue("#v-mensaje");
  await d.evaluate(() => { location.hash = "#proyecto-marchigue"; }); await d.waitForTimeout(1000);
  out.fichaStats = await d.evaluate(() => document.querySelector(".mch-ficha .py-stats").textContent);
  await d.click('.mch-ficha [data-mf="cotizar"]'); await d.waitForTimeout(500);
  out.stale = { before: msg1, after: await d.inputValue("#v-mensaje"), proyecto: await d.inputValue("#v-proyecto") };
  // mensaje de WhatsApp
  await d.fill("#v-nombre", "Ana"); await d.fill("#v-telefono", "+56 9 1111 2222");
  await d.check('input[name="horario"][value="videollamada"]', { force: true });
  await d.fill("#v-mensaje", "Busco algo cerca de un río");
  await d.check('#visita input[name="acepto"]');
  await d.click('.visit-form button[type="submit"]'); await d.waitForTimeout(300);
  out.waMsg = await d.evaluate(() => document.querySelector("[data-visit-msg]").textContent);
  out.fallbackColor = await d.evaluate(() => { const a = document.querySelector("[data-visit-fallback]"); const cs = getComputedStyle(a); return cs.color + " / " + cs.backgroundColor + " / " + cs.textDecorationLine; });
  await d.click("[data-visit-again]");
  // cómo pagar un lote (cotizador dentro del detalle)
  await d.evaluate(() => document.querySelector("#plano").scrollIntoView({ behavior: "instant" }));
  await d.click('#plano [data-tab="malalcahuello"]'); await d.waitForTimeout(300);
  await d.click('#plano .lot[data-n="18"]', { force: true }); await d.waitForTimeout(300);
  // contado: reserva (incluye escritura) + valor de la parcela; el mensaje nombra el lote
  out.sim = await d.evaluate(() => ({ dl: document.querySelector("[data-pago-dl]").innerText.replace(/\n/g, " | "), wa: decodeURIComponent(document.querySelector("[data-pago-wa]").href).slice(0, 160) }));
  // subrayado del menú
  await d.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); await d.waitForTimeout(600);
  out.navAtTop = await d.evaluate(() => [...document.querySelectorAll(".nav-links a.is-current, .nav-portal.is-current")].map(a => a.textContent.trim()));
  await d.evaluate(() => { document.querySelector('[data-tc-tab="portal"]').click(); document.querySelector("#portal").scrollIntoView({ behavior: "instant", block: "center" }); }); await d.waitForTimeout(600);
  out.navAtPortal = await d.evaluate(() => [...document.querySelectorAll(".nav-links a.is-current, .nav-portal.is-current")].map(a => a.textContent.trim()));
  console.log(JSON.stringify(out, null, 1));
  console.log(logs.join("\n") || "no errors");
  await browser.close();
})();
