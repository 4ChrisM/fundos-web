const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const B = "http://127.0.0.1:8765/";
const ARGS = ["--proxy-server=" + process.env.HTTPS_PROXY, "--ignore-certificate-errors-spki-list=KnP1OnzHv/y42eRQmbGwoYTHcSJF448m6CU5mdngwKk=,PS48cX347wDVcRynzq+DFqswl2PLNE1sG6uQvxMCOS0="];
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ARGS });
  const out = {}, errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const d = await ctx.newPage();
  const reqs = [];
  d.on("request", r => reqs.push(r.url()));
  d.on("pageerror", e => errs.push(e.message));
  d.on("console", m => { if (m.type() === "error" && !/ERR_CERT|net::/.test(m.text())) errs.push(m.text()); });
  await d.goto(B, { waitUntil: "networkidle" }); await d.waitForTimeout(600); await clasica(d);
  out.fontReqs = reqs.filter(u => /font|woff/.test(u)).map(u => u.replace(/^.*\//, ""));
  out.google = reqs.filter(u => /googleapis|gstatic/.test(u)).length;
  out.fontsLoaded = await d.evaluate(() => [...document.fonts].filter(f => f.status === "loaded").map(f => f.family + " " + f.style + " " + f.weight));
  out.builtAtTop = await d.evaluate(() => !!document.querySelector("#plano .plan-canvas svg"));
  await d.waitForTimeout(3200);
  out.builtAfterIdle = await d.evaluate(() => !!document.querySelector("#plano .plan-canvas svg"));
  out.offscreen = await d.evaluate(() => [...document.querySelectorAll(".is-offscreen")].map(e => e.className.split(" ")[0]));
  out.planFilters = await d.evaluate(() => document.querySelectorAll("#plano svg filter, #plano svg [filter]").length);
  // pestañas: se marcan al instante
  await d.evaluate(() => document.getElementById("plano").scrollIntoView({ behavior: "instant" })); await d.waitForTimeout(300);
  out.tabInstant = await d.evaluate(() => { const t = document.querySelector('[role="tab"][data-tab="marchigue"]'); t.click(); return [t.getAttribute("aria-selected"), document.querySelectorAll("#plano .lot").length]; });
  await d.waitForTimeout(400);
  out.tabAfter = await d.evaluate(() => document.querySelectorAll("#plano .lot").length);
  // resize con lote elegido
  await d.evaluate(() => { location.hash = "#lote-marchigue-67"; }); await d.waitForTimeout(1200);
  await d.setViewportSize({ width: 390, height: 844 }); await d.waitForTimeout(900);
  out.resizeKeepsLot = await d.evaluate(() => { const c = document.querySelector(".plan-canvas").getBoundingClientRect(), p = document.querySelector('#plano .pin[data-n="67"]').getBoundingClientRect(); return p.left >= c.left && p.right <= c.right && p.top >= c.top && p.bottom <= c.bottom; });
  await d.setViewportSize({ width: 1440, height: 900 }); await d.waitForTimeout(900);
  out.canvasH = await d.evaluate(() => Math.round(document.querySelector(".plan-canvas").getBoundingClientRect().height));
  // precarga: el foco no salta mientras se escribe
  await d.evaluate(() => document.querySelector("[data-d-reserve], .lot-actions .btn-gold").click());
  await d.waitForTimeout(450);
  await d.focus("#v-telefono"); await d.keyboard.type("+56 9 87", { delay: 30 });
  await d.waitForTimeout(1800);
  await d.keyboard.type("65 4321", { delay: 30 });
  out.prefill = await d.evaluate(() => [document.getElementById("v-telefono").value, document.getElementById("v-nombre").value, document.activeElement.id]);
  // recorrido: volver a elegir el mismo no recarga
  await d.evaluate(() => document.getElementById("recorrido").scrollIntoView({ behavior: "instant" })); await d.waitForTimeout(300);
  await d.click("[data-tour-enter]"); await d.waitForTimeout(3500);
  const f1 = await d.evaluate(() => { const f = document.querySelector(".tour-stage iframe"); if (f) f.dataset.mark = "1"; return !!f; });
  await d.evaluate(() => document.querySelector('.tour-pick[aria-current="true"]').click()); await d.waitForTimeout(1500);
  out.tourSame = await d.evaluate(() => { const f = document.querySelector(".tour-stage iframe"); return f ? f.dataset.mark === "1" : "no-iframe"; }) + " (had " + f1 + ")";
  out.liveAnims = await d.evaluate(() => document.getAnimations().filter(a => a.playState === "running" && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest(".tour-stage")).map(a => a.animationName));
  out.idleAnims = await d.evaluate(() => { window.scrollTo(0, document.getElementById("tu-compra").offsetTop); return new Promise(r => setTimeout(() => r(document.getAnimations().filter(a => a.playState === "running").map(a => a.animationName)), 600)); });
  await ctx.close();
  // sin JavaScript
  const nj = await (await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false })).newPage();
  await nj.goto(B, { waitUntil: "networkidle" }); await clasica(nj);
  out.nojs = await nj.evaluate(() => ({ js: document.documentElement.classList.contains("js"), links: getComputedStyle(document.querySelector(".nav-links")).display, toggle: getComputedStyle(document.querySelector(".nav-toggle")).display, filters: getComputedStyle(document.querySelector(".plan-filters")).display, sim: getComputedStyle(document.querySelector(".sim-controls")).display, reveal: getComputedStyle(document.querySelector(".reveal")).opacity }));
  await nj.screenshot({ path: "ux/nojs-top.png" });
  await nj.evaluate(() => document.getElementById("plano").scrollIntoView()); await nj.screenshot({ path: "ux/nojs-plan.png" });
  console.log(JSON.stringify(out, null, 1)); console.log(errs.join("\n") || "no errors");
  await browser.close();
})();
