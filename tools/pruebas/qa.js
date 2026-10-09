const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const B = "http://127.0.0.1:8765/";
const ARGS = ["--proxy-server=" + process.env.HTTPS_PROXY, "--ignore-certificate-errors-spki-list=KnP1OnzHv/y42eRQmbGwoYTHcSJF448m6CU5mdngwKk=,PS48cX347wDVcRynzq+DFqswl2PLNE1sG6uQvxMCOS0="];
const out = {}, errs = [];
const W = ms => new Promise(r => setTimeout(r, ms));
async function page(browser, w, h, mob) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: !!mob, hasTouch: !!mob, deviceScaleFactor: mob ? 2 : 1 });
  const p = await ctx.newPage();
  p.on("pageerror", e => errs.push(w + " " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_CERT|net::/.test(m.text())) errs.push(w + " " + m.text()); });
  await p.goto(B, { waitUntil: "networkidle" }); await W(700); await clasica(p);
  return p;
}
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ARGS });
  // ---- 1440: clics y foco no mueven la página
  let d = await page(browser, 1440, 900);
  await d.evaluate(() => document.getElementById("plano").scrollIntoView({ behavior: "instant" })); await W(900);
  let y0 = await d.evaluate(() => scrollY);
  const tb = await d.locator('[role="tab"][data-tab="marchigue"]').boundingBox();
  await d.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2); await W(900);
  out.tabDy = await d.evaluate(y0 => Math.round(scrollY - y0), y0);
  y0 = await d.evaluate(() => scrollY);
  const pin = d.locator('#plano .pin[data-n="37"]'); const bb = await pin.boundingBox();
  await d.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await W(900);
  out.d1440 = await d.evaluate(y0 => ({ dy: Math.round(scrollY - y0), title: document.querySelector("[data-d-title]").textContent }), y0);
  // sticky panel a 1440
  const ys = await d.evaluate(() => { scrollBy(0, 200); return 0; }); await W(500);
  out.sticky = await d.evaluate(() => Math.round(document.getElementById("plan-panel").getBoundingClientRect().top));
  // tooltip apunta al lote (hover)
  await d.evaluate(() => document.querySelector(".plan-stage").scrollIntoView({ block: "center", behavior: "instant" })); await W(500);
  const p5 = await d.locator('#plano .pin[data-n="31"]').boundingBox();
  await d.mouse.move(p5.x + p5.width / 2, p5.y + p5.height / 2); await W(400);
  out.tip = await d.evaluate(() => { const t = document.querySelector("[data-tip]"), r = t.getBoundingClientRect(), p = document.querySelector('#plano .pin[data-n="31"]').getBoundingClientRect(); return { hidden: t.hidden, gap: Math.round(p.top - r.bottom), dx: Math.round((r.left + r.width / 2) - (p.left + p.width / 2)) }; });
  // teclado +
  await d.mouse.move(5, 5);
  await d.focus(".skip-plan"); await d.keyboard.press("Tab"); await W(600);
  await d.keyboard.press("+"); await W(500); await d.keyboard.press("+"); await W(500);
  out.kbZoom = await d.evaluate(() => { const a = document.activeElement, n = a.getAttribute("data-n"), c = document.querySelector(".plan-canvas").getBoundingClientRect(), p = document.querySelector('#plano .pin[data-n="' + n + '"]').getBoundingClientRect(); return { n, inView: p.left >= c.left && p.right <= c.right && p.top >= c.top && p.bottom <= c.bottom, tip: !document.querySelector("[data-tip]").hidden }; });
  // reservar -> mensaje
  await d.evaluate(() => { location.hash = "#lote-malalcahuello-18"; }); await W(1200);
  await d.evaluate(() => document.querySelector("[data-d-reserve]").click()); await W(1500);
  out.intent = await d.evaluate(() => { const b = document.querySelector("[data-visit-intent]"); return [b.hidden, b.textContent.trim()]; });
  await d.fill("#v-nombre", "Ana"); await d.fill("#v-telefono", "+56 9 1111 2222");
  await d.evaluate(() => { const c = document.querySelector('#visita [name="acepto"]'); if (!c.checked) c.click(); document.querySelector(".visit-form [type=submit]").click(); }); await W(500);
  out.reserveMsg = await d.evaluate(() => [document.querySelector("[data-visit-msg]").textContent, document.querySelector("[data-visit-note]").textContent]);
  // enlace a lote inexistente
  await d.goto(B + "#lote-marchigue-99", { waitUntil: "networkidle" }); await W(1200);
  out.badLot = await d.evaluate(() => { const s = document.querySelector("[data-summary]"), r = s.getBoundingClientRect(), nb = document.querySelector(".nav").getBoundingClientRect().bottom; return [s.textContent, Math.round(r.top - nb)]; });
  await d.context().close();
  // ---- 1280x800: Puerto Varas ancho, detalle a la vista
  d = await page(browser, 1280, 800);
  await d.evaluate(() => document.getElementById("plano").scrollIntoView({ behavior: "instant" })); await W(800);
  await d.click('[role="tab"][data-tab="puerto-varas"]'); await W(900);
  await d.evaluate(() => document.querySelector(".plan-stage").scrollIntoView({ block: "start", behavior: "instant" })); await W(300);
  const p30 = await d.locator('#plano .pin[data-n="30"]').boundingBox();
  await d.mouse.click(p30.x + p30.width / 2, p30.y + p30.height / 2); await W(1200);
  out.pvWide = await d.evaluate(() => { const t = document.getElementById("lot-title").getBoundingClientRect(), b = document.querySelector("[data-d-reserve]").getBoundingClientRect(), bar = document.querySelector(".mbar"); return { title: Math.round(t.top), reserveBottom: Math.round(b.bottom), barTop: bar.classList.contains("is-visible") ? Math.round(bar.getBoundingClientRect().top) : innerHeight }; });
  await d.context().close();
  // ---- 390 móvil
  let m = await page(browser, 390, 844, true);
  await m.evaluate(() => document.querySelector(".finder").scrollIntoView({ block: "center", behavior: "instant" })); await W(400);
  await m.selectOption(".finder select >> nth=1", { index: 2 }); await W(600);
  await m.click(".finder-btn"); await W(1800);
  out.mFinder = await m.evaluate(() => { const s = document.querySelector(".plan-summary").getBoundingClientRect(), t = document.querySelector(".filters-toggle").getBoundingClientRect(), c = document.querySelector(".plan-canvas").getBoundingClientRect(); return { summaryW: Math.round(s.width), toggleRight: Math.round(t.right), canvasTop: Math.round(c.top), others: document.querySelector("[data-plan-others]").hidden }; });
  await m.screenshot({ path: "ux/qafix-m-finder.png" });
  // chip: los lotes que calzan quedan a la vista
  await m.click('[role="tab"][data-tab="puerto-varas"]'); await W(1000);
  await m.evaluate(() => document.querySelector(".plan-cats").scrollIntoView({ block: "start", behavior: "instant" })); await W(300);
  for (const i of [0, 3]) {
    await m.evaluate(i => { const c = [...document.querySelectorAll(".pl-cat:not([disabled])")][i]; c && c.click(); }, i); await W(900);
    out["chip" + i] = await m.evaluate(() => { const c = document.querySelector(".plan-canvas").getBoundingClientRect(); const lit = [...document.querySelectorAll("#plano .pin:not(.is-dim):not(.pin-vendida)")]; const vis = lit.filter(p => { const r = p.getBoundingClientRect(); return r.left >= c.left && r.right <= c.right && r.top >= c.top && r.bottom <= c.bottom; }); return vis.length + "/" + lit.length; });
    await m.evaluate(i => { const c = [...document.querySelectorAll(".pl-cat:not([disabled])")][i]; c && c.click(); }, i); await W(600);
  }
  // hoja inferior: el deslizamiento no mueve la página
  const pp = await m.locator('#plano .pin:not(.pin-vendida):not(.is-dim)').first().boundingBox();
  await m.touchscreen.tap(pp.x + pp.width / 2, pp.y + pp.height / 2); await W(900);
  const cdp = await m.context().newCDPSession(m);
  const sy0 = await m.evaluate(() => scrollY);
  const swipe = async (x, y1, y2) => { await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y1 }] }); for (let k = 1; k <= 8; k++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y1 + (y2 - y1) * k / 8 }] }); await W(16); } await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await W(500); };
  await swipe(195, 250, 80);
  out.sheetLock = await m.evaluate(sy0 => [document.querySelector("[data-panel]").classList.contains("is-open"), Math.round(scrollY - sy0)], sy0);
  await m.evaluate(() => document.querySelector("[data-sheet-backdrop]").click()); await W(600);
  // Ver completo en Puerto Varas: puntos
  await m.evaluate(() => document.querySelector('[data-zoom="fit"]').click()); await W(700);
  out.pvFitCrowded = await m.evaluate(() => document.querySelector(".plan-canvas svg").classList.contains("is-crowded"));
  await m.screenshot({ path: "ux/qafix-m-pvfit.png" });
  // tarjeta: Recorrido 360° aterriza con el visor a la vista
  await m.evaluate(() => document.querySelector('.project .art-360').scrollIntoView({ block: "center", behavior: "instant" })); await W(300);
  await m.evaluate(() => document.querySelector('.project .art-360').click()); await W(2600);
  out.tourLand = await m.evaluate(() => { const s = document.querySelector(".tour-stage").getBoundingClientRect(); return [Math.round(s.top), Math.round(s.bottom)]; });
  // CTA Ver lotes llega al plano
  await m.evaluate(() => document.querySelector('[data-goto-plan="marchigue"]').scrollIntoView({ block: "center", behavior: "instant" })); await W(300);
  await m.evaluate(() => document.querySelector('[data-goto-plan="marchigue"]').click()); await W(1500);
  out.ctaLand = await m.evaluate(() => { const c = document.querySelector(".plan-canvas").getBoundingClientRect(), r = document.querySelector("[data-plan]").getBoundingClientRect(); return { planTop: Math.round(r.top), canvasTop: Math.round(c.top), tab: document.querySelector('[role="tab"][aria-selected="true"]').getAttribute("data-tab") }; });
  // reservar en el celular: se llega al formulario
  const pin2 = await m.locator('#plano .pin:not(.pin-vendida):not(.is-dim)').first().boundingBox();
  await m.touchscreen.tap(pin2.x + pin2.width / 2, pin2.y + pin2.height / 2); await W(900);
  await m.evaluate(() => document.querySelector("[data-d-reserve]").click()); await W(1600);
  out.mReserve = await m.evaluate(() => { const f = document.querySelector("[data-visit-intent]").getBoundingClientRect(); return [Math.round(f.top), document.querySelector("[data-visit-intent]").hidden]; });
  await m.context().close();
  // ---- 320: videollamada y lista
  m = await page(browser, 320, 640, true);
  out.m320 = await m.evaluate(() => { const sp = [...document.querySelectorAll(".visit-form .seg span")].find(s => /Video/.test(s.textContent)); return [sp.scrollWidth, sp.clientWidth]; });
  await m.evaluate(() => { document.getElementById("plano").scrollIntoView({ behavior: "instant" }); }); await W(600);
  await m.evaluate(() => document.querySelector('[data-view="lista"]').click()); await W(500);
  out.list320 = await m.evaluate(() => { const l = document.querySelector(".plan-list"); return [l.scrollWidth, l.clientWidth]; });
  await m.context().close();
  // ---- apaisado 844x390
  m = await page(browser, 844, 390, true);
  out.land = await m.evaluate(() => [...document.querySelectorAll(".hero-actions .btn")].map(b => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(e && b.contains(e)); }));
  await m.evaluate(() => document.querySelector("[data-menu-open]").click()); await W(800);
  out.landMenu = await m.evaluate(() => [...document.querySelectorAll("#menu [data-menu-link]")].map(a => { a.scrollIntoView({ block: "nearest" }); const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.left + 10, r.top + r.height / 2); return !!(e && a.contains(e)); }).join(""));
  await m.context().close();
  console.log(JSON.stringify(out, null, 1)); console.log(errs.join("\n") || "no errors");
  await browser.close();
})();
