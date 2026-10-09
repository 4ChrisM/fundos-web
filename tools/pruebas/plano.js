const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const B = "http://127.0.0.1:8765/";
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] });
  const out = {};
  // ---------- móvil ----------
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const m = await mctx.newPage();
  const logs = [];
  m.on("pageerror", e => logs.push("M pageerror: " + e.message));
  m.on("console", x => { if (x.type() === "error") logs.push("M " + x.text()); });
  await m.goto(B, { waitUntil: "networkidle" }); await m.waitForTimeout(1000); await clasica(m);
  await m.evaluate(() => document.querySelector("#plano .plan").scrollIntoView({ behavior: "instant" }));
  await m.waitForTimeout(300);
  const pin45 = m.locator('#plano .pin[data-n="46"]');
  const b45 = await pin45.boundingBox();
  await m.touchscreen.tap(b45.x + b45.width / 2, b45.y + b45.height / 2);
  await m.waitForTimeout(900);
  out.sheet = await m.evaluate(() => {
    const p = document.querySelector("[data-panel]"), pr = p.getBoundingClientRect(), pin = document.querySelector('#plano .pin[data-n="46"]').getBoundingClientRect();
    return { open: p.classList.contains("is-open"), role: p.getAttribute("role"), sheetTop: Math.round(pr.top), pinMid: Math.round(pin.top + pin.height / 2), navB: Math.round(document.querySelector(".nav").getBoundingClientRect().bottom),
      title: document.querySelector("[data-d-title]").textContent, backdrop: !document.querySelector("[data-sheet-backdrop]").hidden, bodyLock: getComputedStyle(document.body).overflow };
  });
  await m.screenshot({ path: "ux/p3-m-sheet.png" });
  // expandir con el tirador
  await m.locator("[data-sheet-grab]").tap(); await m.waitForTimeout(500);
  out.expanded = await m.evaluate(() => document.querySelector("[data-panel]").classList.contains("is-expanded"));
  await m.screenshot({ path: "ux/p3-m-sheet-exp.png" });
  // cerrar tocando el fondo
  // (la hoja expandida llega alto: se toca el fondo justo sobre ella)
  const topHoja = await m.evaluate(() => document.querySelector("[data-panel]").getBoundingClientRect().top);
  await m.touchscreen.tap(195, Math.max(4, topHoja - 8)); await m.waitForTimeout(600);
  out.closedByBackdrop = !(await m.evaluate(() => document.querySelector("[data-panel]").classList.contains("is-open")));
  // lote vendido -> alternativas
  const pin33 = m.locator('#plano .pin[data-n="33"]'); const b33 = await pin33.boundingBox();
  await m.touchscreen.tap(b33.x + b33.width / 2, b33.y + b33.height / 2); await m.waitForTimeout(800);
  out.sold = await m.evaluate(() => ({ title: document.querySelector("[data-d-title]").textContent, alts: [...document.querySelectorAll("[data-d-alts] .lot-pick")].map(b => b.textContent), priceHidden: document.querySelector("[data-d-price]").hidden, favHidden: document.querySelector("[data-d-fav]").hidden }));
  await m.screenshot({ path: "ux/p3-m-sold.png" });
  await m.locator("[data-d-alts] .lot-pick").first().tap(); await m.waitForTimeout(900);
  out.afterAlt = await m.evaluate(() => { const n = document.querySelector("[data-d-title]").textContent.replace("Lote ", ""); const pin = document.querySelector('#plano .pin[data-n="' + n + '"]').getBoundingClientRect(); return { title: "Lote " + n, pinMid: Math.round(pin.top + pin.height / 2), sheetTop: Math.round(document.querySelector("[data-panel]").getBoundingClientRect().top) }; });
  await m.screenshot({ path: "ux/p3-m-alt.png" });
  await m.locator("[data-panel-close]").tap(); await m.waitForTimeout(500);
  // filtros en móvil
  await m.locator("[data-filters-toggle]").tap(); await m.waitForTimeout(300);
  out.filtersOpen = await m.evaluate(() => getComputedStyle(document.querySelector(".filter-fields")).display);
  await m.screenshot({ path: "ux/p3-m-filters.png" });
  await mctx.close();

  // ---------- escritorio ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const d = await ctx.newPage();
  d.on("pageerror", e => logs.push("D pageerror: " + e.message));
  d.on("console", x => { if (x.type() === "error") logs.push("D " + x.text()); });
  await d.goto(B, { waitUntil: "networkidle" }); await d.waitForTimeout(1000); await clasica(d);
  await d.evaluate(() => document.querySelector("#plano .plan").scrollIntoView({ behavior: "instant" }));
  // precio mínimo: no cuenta vendidos
  await d.evaluate(() => { const r = document.querySelector("[data-price]"); r.value = 0; r.dispatchEvent(new Event("input")); });
  await d.waitForTimeout(200);
  out.priceMin = await d.evaluate(() => ({ summary: document.querySelector("[data-summary]").textContent, bright: [...document.querySelectorAll("#plano .lot:not(.is-dim)")].length, clear: !document.querySelector(".plan-summary [data-clear-filters]").hidden }));
  await d.click(".plan-summary [data-clear-filters]"); await d.waitForTimeout(200);
  // chip de categoría
  await d.click('.pl-cat[data-cat="azul"]'); await d.waitForTimeout(200);
  out.chip = await d.evaluate(() => ({ summary: document.querySelector("[data-summary]").textContent, pressed: document.querySelector('.pl-cat[data-cat="azul"]').getAttribute("aria-pressed"), bright: [...document.querySelectorAll("#plano .lot:not(.is-dim)")].map(e => e.dataset.n).join(",") }));
  out.lilaDisabled = await d.evaluate(() => document.querySelector('.pl-cat[data-cat="lila"]').disabled);
  await d.click('.pl-cat[data-cat="azul"]');
  // teclado: una parada de tab y flechas espaciales
  await d.focus("#f-precio"); await d.keyboard.press("Tab"); await d.waitForTimeout(100);
  const firstFocus = await d.evaluate(() => { const a = document.activeElement; return a.className && a.className.baseVal !== undefined ? "lot " + a.dataset.n : a.textContent.trim().slice(0, 30); });
  out.tabFocus = firstFocus;
  // ir al plano
  for (let i = 0; i < 12; i++) { const f = await d.evaluate(() => document.activeElement.classList && document.activeElement.classList.contains("lot") ? document.activeElement.dataset.n : null); if (f) { out.lotFocus = f; break; } await d.keyboard.press("Tab"); }
  await d.keyboard.press("ArrowRight"); out.arrowRight = await d.evaluate(() => document.activeElement.dataset.n);
  await d.keyboard.press("ArrowDown"); out.arrowDown = await d.evaluate(() => document.activeElement.dataset.n);
  await d.keyboard.press("Enter"); await d.waitForTimeout(300);
  out.enterTitle = await d.evaluate(() => document.querySelector("[data-d-title]").textContent);
  await d.keyboard.press("Tab"); out.afterLotTab = await d.evaluate(() => document.activeElement.textContent.trim().slice(0, 30) || document.activeElement.className);
  await d.screenshot({ path: "ux/p3-d-kbd.png" });
  // tooltip en el borde superior
  await d.hover('#plano .lot[data-n="5"]', { force: true }); await d.waitForTimeout(200);
  out.tip = await d.evaluate(() => { const t = document.querySelector("[data-tip]"), s = document.querySelector("[data-stage]").getBoundingClientRect(), r = t.getBoundingClientRect(); return { inside: r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 1, below: t.classList.contains("is-below"), text: t.textContent }; });
  // favoritos + deshacer
  await d.click('#plano .lot[data-n="41"]', { force: true }); await d.waitForTimeout(200);
  await d.click("[data-d-fav]"); await d.waitForTimeout(200);
  out.fav = await d.evaluate(() => ({ toast: document.querySelector("[data-d-toast]").textContent, chips: [...document.querySelectorAll(".fav-chip")].map(b => b.textContent), pinFav: document.querySelector('#plano .pin[data-n="41"]').classList.contains("is-fav") }));
  await d.click("[data-favs-clear]"); await d.waitForTimeout(200);
  out.undoShown = await d.evaluate(() => !document.querySelector("[data-favs-undo]").hidden);
  await d.click("[data-favs-restore]"); await d.waitForTimeout(200);
  out.restored = await d.evaluate(() => [...document.querySelectorAll(".fav-chip")].length);
  // Puerto Varas ancho
  await d.click('#plano [data-tab="puerto-varas"]'); await d.waitForTimeout(400);
  await d.evaluate(() => document.querySelector("#plano .plan-stage").scrollIntoView({ behavior: "instant" }));
  await d.screenshot({ path: "ux/p3-d-pv.png" });
  // lista
  await d.click('[data-view="lista"]'); await d.waitForTimeout(300);
  out.list = await d.evaluate(() => ({ cols: [...document.querySelectorAll(".lot-table th")].map(t => t.textContent.trim()), sort: document.querySelector(".lot-table th").getAttribute("aria-sort"), rows: document.querySelectorAll(".lot-table tbody tr").length }));
  await ctx.close();
  // enlace directo
  const dctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const dl = await dctx.newPage();
  dl.on("pageerror", e => logs.push("DL pageerror: " + e.message));
  await dl.goto(B + "#lote-marchigue-44", { waitUntil: "networkidle" }); await dl.waitForTimeout(1500);
  out.deep = await dl.evaluate(() => { const pin = document.querySelector('#plano .pin[data-n="44"]').getBoundingClientRect(), p = document.querySelector("[data-panel]"); return { title: document.querySelector("[data-d-title]").textContent, open: p.classList.contains("is-open"), pinMid: Math.round(pin.top + pin.height / 2), sheetTop: Math.round(p.getBoundingClientRect().top), navB: Math.round(document.querySelector(".nav").getBoundingClientRect().bottom) }; });
  await dl.screenshot({ path: "ux/p3-m-deep.png" });
  await dctx.close();
  console.log(JSON.stringify(out, null, 1));
  console.log(logs.join("\n") || "no errors");
  await browser.close();
})();
