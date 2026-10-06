const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const B = "http://127.0.0.1:8765/";
const ARGS = ["--proxy-server=" + process.env.HTTPS_PROXY, "--ignore-certificate-errors-spki-list=KnP1OnzHv/y42eRQmbGwoYTHcSJF448m6CU5mdngwKk=,PS48cX347wDVcRynzq+DFqswl2PLNE1sG6uQvxMCOS0="];
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ARGS });
  const out = {}, logs = [];
  // ---- móvil 390: foco en el plano no desplaza el escenario; barra oculta no enfocable
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  m.on("pageerror", e => logs.push("M " + e.message));
  await m.goto(B, { waitUntil: "networkidle" }); await m.waitForTimeout(800); await clasica(m);
  out.mbarTopVis = await m.evaluate(() => getComputedStyle(document.querySelector(".mbar")).visibility);
  await m.evaluate(() => document.querySelector(".skip-plan").scrollIntoView({ block: "center", behavior: "instant" }));
  await m.focus(".skip-plan"); await m.keyboard.press("Tab"); await m.waitForTimeout(700);
  out.planFocus = await m.evaluate(() => {
    const a = document.activeElement, st = document.querySelector(".plan-stage"), cv = document.querySelector(".plan-canvas");
    const f = document.querySelector(".lot-focus-o"), r = a.getBoundingClientRect(), bar = document.querySelector(".mbar");
    return { el: a.getAttribute("aria-label"), stageScroll: [st.scrollLeft, st.scrollTop], canvasScroll: [cv.scrollLeft, cv.scrollTop], canvasLeft: Math.round(cv.getBoundingClientRect().left),
      ring: f.style.display !== "none", lotBottom: Math.round(r.bottom), barTop: bar.classList.contains("is-visible") ? Math.round(bar.getBoundingClientRect().top) : null };
  });
  await m.keyboard.press("ArrowRight"); await m.waitForTimeout(500);
  out.afterArrow = await m.evaluate(() => [document.querySelector(".plan-stage").scrollLeft, document.activeElement.getAttribute("data-n")]);
  // 320: formulario sin desborde
  await m.setViewportSize({ width: 320, height: 640 }); await m.waitForTimeout(400);
  out.form320 = await m.evaluate(() => { const f = document.querySelector(".visit-form"), fr = f.getBoundingClientRect(); let worst = 0; f.querySelectorAll("input,select,textarea,button,.seg").forEach(e => { worst = Math.max(worst, e.getBoundingClientRect().right); }); return { formRight: Math.round(fr.right), worst: Math.round(worst), sw: document.documentElement.scrollWidth }; });
  // ---- escritorio
  const d = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  d.on("pageerror", e => logs.push("D " + e.message));
  await d.goto(B, { waitUntil: "networkidle" }); await d.waitForTimeout(800); await clasica(d);
  out.formDesc = await d.evaluate(() => ({ nombre: document.getElementById("v-nombre").getAttribute("aria-describedby"), acepto: document.querySelector('[name="acepto"]').getAttribute("aria-invalid") }));
  out.waFloatTop = await d.evaluate(() => { const w = document.querySelector(".wa-float"); return [w.className, getComputedStyle(w).visibility]; });
  out.priceValText = await d.evaluate(() => document.getElementById("f-precio").getAttribute("aria-valuetext"));
  out.pieValText = await d.evaluate(() => document.getElementById("s-pie") && document.getElementById("s-pie").getAttribute("aria-valuetext"));
  // pestañas Home/End
  await d.evaluate(() => document.getElementById("plano").scrollIntoView({ behavior: "instant" }));
  await d.focus('[role="tab"][aria-selected="true"]'); await d.keyboard.press("End"); await d.waitForTimeout(300);
  out.tabEnd = await d.evaluate(() => [document.activeElement.textContent.trim(), document.querySelector("[data-tabpanel]").getAttribute("aria-labelledby") === document.activeElement.id]);
  await d.keyboard.press("Home"); await d.waitForTimeout(300);
  out.tabHome = await d.evaluate(() => document.activeElement.textContent.trim());
  // filtro Vendidos: lotes atenuados ocultos para AT
  await d.evaluate(() => { const s = [...document.querySelectorAll('.plan-filters input[type="checkbox"]')].find(i => /vendid/i.test(i.value + i.name + i.parentNode.textContent)); if (s && s.checked) s.click(); });
  await d.waitForTimeout(300);
  out.dimHidden = await d.evaluate(() => { const dim = document.querySelectorAll(".lot.is-dim"); return [dim.length, [...dim].filter(x => x.getAttribute("aria-hidden") === "true").length]; });
  // selección -> aria-current
  await d.evaluate(() => { location.hash = "#lote-malalcahuello-5"; }); await d.waitForTimeout(900);
  out.ariaCurrent = await d.evaluate(() => [...document.querySelectorAll('.lot[aria-current="true"]')].map(x => x.getAttribute("data-n")));
  // tarjetas con nombre de proyecto y aviso de pestaña nueva
  out.cardLink = await d.evaluate(() => document.querySelector(".project [data-goto-plan]").textContent.trim().replace(/\s+/g, " "));
  out.blankDesc = await d.evaluate(() => { const a = [...document.querySelectorAll('a[target="_blank"]')]; return [a.length, a.filter(x => /nueva-pestana/.test(x.getAttribute("aria-describedby") || "")).length]; });
  // recorrido: foco al cerrar tras abrir desde tarjeta
  await d.evaluate(() => document.querySelector('.project .art-360').scrollIntoView({ block: "center", behavior: "instant" }));
  await d.focus(".project .art-360"); await d.keyboard.press("Enter"); await d.waitForTimeout(2500);
  out.tourFocus = await d.evaluate(() => [document.activeElement.className || document.activeElement.tagName, document.activeElement.getAttribute("aria-label") || document.activeElement.textContent.trim().slice(0, 40)]);
  // inmersivo de respaldo
  await d.evaluate(() => { Object.defineProperty(Document.prototype, "fullscreenEnabled", { get: () => false, configurable: true }); });
  await d.evaluate(() => document.querySelector("[data-tour-full]").click()); await d.waitForTimeout(400);
  out.immersive = await d.evaluate(() => ({ imm: document.querySelector(".is-immersive") !== null, inert: document.querySelectorAll("[data-tour-inert]").length, focus: document.activeElement.getAttribute("aria-label") || document.activeElement.className }));
  await d.keyboard.press("Escape"); await d.waitForTimeout(400);
  out.afterImm = await d.evaluate(() => ({ imm: document.querySelector(".is-immersive") !== null, inert: document.querySelectorAll("[data-tour-inert],[inert]").length, focus: document.activeElement.getAttribute("aria-label") || document.activeElement.className }));
  // envío del formulario: inerte detrás de la confirmación
  await d.fill("#v-nombre", "Ana Pérez"); await d.fill("#v-telefono", "+56 9 1111 2222");
  await d.evaluate(() => { const c = document.querySelector('[name="acepto"]'); if (!c.checked) c.click(); });
  const pop = d.context().waitForEvent("page", { timeout: 4000 }).catch(() => null);
  await d.evaluate(() => document.querySelector(".visit-form [type=submit]").click()); await d.waitForTimeout(600); await pop;
  out.formOk = await d.evaluate(() => { const f = document.querySelector(".visit-form"); return { ok: !document.querySelector(".form-ok").hidden, inertKids: [...f.children].filter(c => c.inert).length, kids: f.children.length }; });
  // movimiento reducido
  const r = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" })).newPage();
  await r.goto(B, { waitUntil: "networkidle" }); await r.waitForTimeout(1500); await clasica(r);
  out.reducedAnims = await r.evaluate(() => document.getAnimations().map(a => a.animationName || a.transitionProperty).filter(Boolean));
  console.log(JSON.stringify(out, null, 1)); console.log(logs.join("\n") || "no errors");
  await browser.close();
})();
