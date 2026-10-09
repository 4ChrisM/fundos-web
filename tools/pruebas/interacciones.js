const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const URL = "http://127.0.0.1:8765/";
const ARGS = ["--proxy-server=" + (process.env.HTTPS_PROXY || "http://127.0.0.1:43387"), "--ignore-certificate-errors-spki-list=KnP1OnzHv/y42eRQmbGwoYTHcSJF448m6CU5mdngwKk=,PS48cX347wDVcRynzq+DFqswl2PLNE1sG6uQvxMCOS0="];

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ARGS });
  const logs = [];
  const results = {};

  // ---------- Escritorio ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", m => { if (["error", "warning"].includes(m.type())) logs.push("D " + m.type() + ": " + m.text()); });
  page.on("pageerror", e => logs.push("D pageerror: " + e.message));
  await page.goto(URL, { waitUntil: "networkidle" }); await clasica(page);
  await page.waitForTimeout(1200);

  // Plano: seleccionar lote 12
  await page.locator("#plano").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.getElementById("plano").scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(1500);
  await page.locator('.lot[data-n="5"]').click({ force: true });
  await page.waitForTimeout(500);
  results.panelTitle = await page.locator("[data-d-title]").textContent();
  results.panelPrice = await page.locator("[data-d-price]").textContent();
  results.hash = await page.evaluate(() => location.hash);
  await page.locator("[data-d-fav]").click();
  await page.locator('.lot[data-n="19"]').click({ force: true });
  await page.locator("[data-d-fav]").click();
  await page.waitForTimeout(300);
  results.favsVisible = await page.locator("[data-favs]").isVisible();
  results.favsText = await page.locator("[data-favs] .favs-main").textContent();
  await page.locator('.lot[data-n="9"]').hover({ force: true });
  await page.waitForTimeout(300);
  await page.locator("[data-plan]").screenshot({ path: "i-plan-selected.png" });

  // Vendido → lote similar
  await page.locator('.lot[data-n="11"]').click({ force: true });
  results.soldBtn = await page.locator("[data-d-alts]").textContent();
  await page.locator("[data-d-alts] .lot-pick").first().click();
  await page.waitForTimeout(300);
  results.afterSimilar = await page.locator("[data-d-title]").textContent();

  // Lista
  await page.locator('[data-view="lista"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-sort="precio"]').click();
  await page.waitForTimeout(200);
  results.firstRowAfterSort = await page.locator(".lot-table tbody tr:first-child td.t-price").textContent();
  await page.locator("[data-plan]").screenshot({ path: "i-plan-list.png" });
  await page.locator('[data-view="plano"]').click();

  // Filtro de estado: solo disponibles
  if (await page.locator('label.st-reservada').isVisible()) await page.locator('label.st-reservada').click();
  await page.locator('label.st-vendida').click();
  await page.waitForTimeout(200);
  results.summaryFiltered = await page.locator("[data-summary]").textContent();
  results.dimCount = await page.locator(".lot.is-dim").count();

  // Marchigüe
  await page.locator('[data-tab="marchigue"]').click();
  await page.waitForTimeout(400);
  results.marchigueLots = await page.locator(".lot").count();
  await page.locator("[data-plan]").screenshot({ path: "i-plan-marchigue.png" });

  // Puerto Varas (preventa)
  await page.locator('[data-tab="puerto-varas"]').click();
  await page.waitForTimeout(300);
  results.preventaVisible = await page.locator("[data-preventa-panel]").isVisible();
  await page.locator("[data-plan]").screenshot({ path: "i-plan-preventa.png" });

  // Buscador → plano
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(300);
  await page.selectOption("#f-destino", "malalcahuello");
  await page.selectOption("#f-presupuesto", "20000000");
  await page.waitForTimeout(600);
  results.finderCount = await page.locator("[data-finder-count]").textContent();
  results.finderLabel = await page.locator("[data-finder-label]").textContent();
  await page.selectOption("#f-destino", "puerto-varas");
  await page.waitForTimeout(200);
  results.finderPreventa = await page.locator("[data-finder-label]").textContent();
  await page.selectOption("#f-destino", "malalcahuello");
  await page.locator(".finder-btn").click();
  await page.waitForTimeout(1500);
  results.afterFinderTab = await page.locator('.tab[aria-selected="true"]').getAttribute("data-tab");
  results.afterFinderPrice = await page.locator("[data-price-out]").textContent();
  results.afterFinderSummary = await page.locator("[data-summary]").textContent();
  results.scrollAfterFinder = await page.evaluate(() => Math.round(document.getElementById("plano").getBoundingClientRect().top));

  // Conoce cada proyecto: "Conocer el proyecto" lleva al apartado con ese proyecto elegido
  await page.evaluate(() => document.getElementById("proyectos").scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(800);
  await page.locator('.project[data-project="marchigue"] a[href="#proyecto-marchigue"]').click();
  await page.waitForTimeout(1200);
  results.fichaProyecto = await page.evaluate(() => ({
    elegido: document.querySelector("[data-py-tab][aria-selected=true]").dataset.pyTab,
    titulo: document.querySelector(".py h3").textContent,
    top: Math.round(document.getElementById("conoce").getBoundingClientRect().top),
    caracteristicas: document.querySelectorAll(".py-why li").length,
    hash: location.hash
  }));
  await page.locator(".py").screenshot({ path: "i-ficha.png" });

  // Cómo pagarlo (cotizador dentro del lote) en cuotas, en una pestaña aparte para no cambiar el estado de esta
  {
    const pg = await page.context().newPage();
    await pg.goto(URL + "#lote-malalcahuello-18", { waitUntil: "networkidle" }); await pg.waitForTimeout(1500);
    await pg.click('[data-pago="cuotas"]'); await pg.waitForTimeout(300);
    results.cuota = await pg.evaluate(() => document.querySelector(".lot-pago-dl .is-cuota").innerText.replace(/\n/g, " "));
    results.simNote = await pg.evaluate(() => document.querySelector("[data-pago-nota]").textContent);
    await pg.locator("[data-d-pago]").screenshot({ path: "i-sim.png" });
    await pg.close();
  }

  // Formulario: validación
  await page.evaluate(() => document.getElementById("visita").scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(900);
  await page.locator('.visit-form button[type="submit"]').click();
  await page.waitForTimeout(300);
  results.errorsShown = await page.locator(".visit-form .error.is-shown").count();
  await page.locator(".visit-form").screenshot({ path: "i-form-errors.png" });
  await page.fill("#v-nombre", "Camila Rojas");
  await page.fill("#v-telefono", "+56 9 8765 4321");
  await page.locator('.check input').check();
  await page.locator('.visit-form button[type="submit"]').click();
  await page.waitForTimeout(600);
  results.okMsg = await page.locator("[data-visit-msg]").textContent();
  results.okHref = decodeURIComponent(await page.locator("[data-visit-fallback]").getAttribute("href")).slice(0, 80);
  results.popupPages = ctx.pages().length;
  results.okVisible = await page.locator("[data-visit-ok]").isVisible();
  await page.locator(".visit-form").screenshot({ path: "i-form-ok.png" });

  // Reservar un lote → formulario precargado
  await vista(page, "proyectos");
  await page.evaluate(() => document.getElementById("plano").scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(600);
  if (await page.locator('label.st-reservada').isVisible()) await page.locator('label.st-reservada').click(); // vuelve a mostrar reservados (estado anterior: solo disponibles)
  await page.locator('.lot:not(.is-dim)').first().click({ force: true });
  await page.locator("[data-d-reserve]").click();
  await page.waitForTimeout(1500);
  results.prefillMsg = await page.inputValue("#v-mensaje");
  results.prefillProject = await page.inputValue("#v-proyecto");

  // Enlace directo a un lote
  const p2 = await ctx.newPage();
  await p2.goto(URL + "#lote-marchigue-7", { waitUntil: "networkidle" });
  await p2.waitForTimeout(1500);
  results.deepTab = await p2.locator('.tab[aria-selected="true"]').getAttribute("data-tab");
  results.deepTitle = await p2.locator("[data-d-title]").textContent();
  await p2.close();

  // Teclado en el plano
  await page.evaluate(() => document.getElementById("plano").scrollIntoView({ behavior: "instant" }));
  await page.evaluate(() => document.querySelector('#plano .lot[data-n="5"]').focus());
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  results.keyboardSelect = await page.locator("[data-d-title]").textContent();
  await ctx.close();

  // ---------- Móvil ----------
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const m = await mctx.newPage();
  m.on("console", x => { if (["error", "warning"].includes(x.type())) logs.push("M " + x.type() + ": " + x.text()); });
  m.on("pageerror", e => logs.push("M pageerror: " + e.message));
  await m.goto(URL, { waitUntil: "networkidle" }); await clasica(m);
  await m.waitForTimeout(1000);
  await m.locator("[data-menu-open]").tap();
  await m.waitForTimeout(800);
  await m.screenshot({ path: "i-m-menu.png" });
  await m.locator('#menu [data-menu-link][href="#plano"]:not([data-casa-guia])').tap();
  await m.waitForTimeout(1500);
  results.menuClosed = !(await m.locator("#menu").evaluate(d => d.open));
  await m.evaluate(() => document.getElementById("plano").scrollIntoView({ behavior: "instant" }));
  await m.waitForTimeout(800);
  await m.locator('.lot[data-n="45"]').tap();
  await m.waitForTimeout(800);
  results.sheetOpen = await m.locator("[data-panel]").evaluate(el => el.classList.contains("is-open"));
  results.mbarHiddenWithSheet = !(await m.locator("[data-mbar]").evaluate(el => el.classList.contains("is-visible")));
  await m.screenshot({ path: "i-m-sheet.png" });
  await m.locator("[data-panel-close]").tap();
  await m.waitForTimeout(700);
  results.sheetClosed = !(await m.locator("[data-panel]").evaluate(el => el.classList.contains("is-open")));
  results.mbarVisible = await m.locator("[data-mbar]").evaluate(el => el.classList.contains("is-visible"));
  await m.screenshot({ path: "i-m-plan.png" });
  await m.locator('[data-view="lista"]').tap();
  await m.waitForTimeout(400);
  await m.locator("[data-plan]").screenshot({ path: "i-m-list.png" });
  await mctx.close();

  await browser.close();
  console.log(JSON.stringify({ results, logs }, null, 1));
})();
