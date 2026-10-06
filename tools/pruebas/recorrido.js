// Prueba del recorrido 360°: node tourcheck.js <ancho> <alto> <prefijo> [--csp]
const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
(async () => {
  const [w, h, out] = process.argv.slice(2);
  const csp = process.argv.includes("--csp");
  const mobile = +w < 700;
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY, "--ignore-certificate-errors-spki-list=KnP1OnzHv/y42eRQmbGwoYTHcSJF448m6CU5mdngwKk=,PS48cX347wDVcRynzq+DFqswl2PLNE1sG6uQvxMCOS0="] });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const logs = [];
  page.on("pageerror", e => logs.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") logs.push("console: " + m.text()); });
  // Los recorridos reales no son accesibles desde este entorno: se simulan con una página local
  const fake = (name, bg) => `<!doctype html><body style="margin:0;height:100vh;display:grid;place-items:center;background:${bg};color:#fff;font:700 42px sans-serif">TOUR ${name}</body>`;
  await page.route(/tourspuertovaras|fundoslonquimaynieve|marchigue\.netlify/, r => {
    const u = r.request().url();
    const n = u.includes("puertovaras") ? "PUERTO VARAS" : u.includes("lonquimay") ? "MALALCAHUELLO" : "MARCHIGUE";
    r.fulfill({ status: 200, contentType: "text/html", body: fake(n, "linear-gradient(135deg,#355,#132)") });
  });
  if (csp) {
    await page.route("http://127.0.0.1:8765/", async r => {
      const resp = await r.fetch();
      const body = (await resp.text()).replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="frame-src 'none'">`);
      r.fulfill({ response: resp, body });
    });
  }
  await page.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" }); await clasica(page);
  await page.waitForTimeout(1500);
  const st = () => page.$eval("[data-tour-stage]", e => e.getAttribute("data-state"));
  await page.evaluate(() => document.querySelector("#recorrido").scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector(".tour").scrollIntoView({ behavior: "instant", block: "center" })); await page.waitForTimeout(600); await page.screenshot({ path: out + "-poster.png" });
  console.log("thumbs", await page.$$eval(".tour-pick-art svg", a => a.length), "state", await st());

  await page.click("[data-tour-enter]");
  console.log("after click", await st());
  await page.waitForTimeout(1800);
  console.log("after load", await st(), "iframes", await page.$$eval("[data-tour-frame] iframe", a => a.map(f => f.src)));
  await page.screenshot({ path: out + "-live.png" });

  if (!csp) {
    // Cambio de proyecto con el recorrido abierto
    await page.click('[data-tour-pick="puerto-varas"]');
    await page.waitForTimeout(400);
    console.log("switch mid", await st());
    await page.waitForTimeout(1800);
    console.log("switch done", await st(), await page.$$eval("[data-tour-frame] iframe", a => a.map(f => f.src)), await page.$eval("[data-tour-hud-name]", e => e.textContent));
    // Pantalla completa
    await page.click("[data-tour-full]");
    await page.waitForTimeout(600);
    console.log("full", await page.evaluate(() => ({ fs: !!document.fullscreenElement, imm: document.querySelector("[data-tour-stage]").classList.contains("is-immersive"), label: document.querySelector("[data-tour-full]").getAttribute("aria-label") })));
    await page.screenshot({ path: out + "-full.png" });
    await page.click("[data-tour-full]");
    await page.waitForTimeout(500);
    console.log("unfull", await page.evaluate(() => !!document.fullscreenElement));
    // Salir
    await page.click("[data-tour-close]");
    await page.waitForTimeout(900);
    console.log("closed", await st(), "iframes", await page.$$eval("[data-tour-frame] iframe", a => a.length));
    // Desde la tarjeta del proyecto
    await page.evaluate(() => document.querySelector("#proyectos").scrollIntoView({ behavior: "instant" }));
    await page.click('.art-360[data-tour-open="marchigue"]');
    await page.waitForTimeout(2500);
    console.log("from card", await st(), await page.$eval("[data-tour-name]", e => e.textContent), "y", await page.evaluate(() => Math.round(document.querySelector("#recorrido").getBoundingClientRect().top)));
    // Desde el plano (pestaña Puerto Varas)
    await page.evaluate(() => document.querySelector("#plano").scrollIntoView({ behavior: "instant" }));
    await page.click('#plano [data-tab="puerto-varas"]');
    await page.click("#plano [data-tour-open]");
    await page.waitForTimeout(2500);
    console.log("from plan", await st(), await page.$eval("[data-tour-name]", e => e.textContent));
    // Desde el apartado "Conoce cada proyecto"
    await page.evaluate(() => document.querySelector("#conoce").scrollIntoView({ behavior: "instant" }));
    await page.click('[data-py-tab="malalcahuello"]');
    await page.waitForTimeout(300);
    await page.click('[data-py-act="tour"]');
    await page.waitForTimeout(2500);
    console.log("from ficha", await st(), await page.$eval("[data-tour-name]", e => e.textContent));
    // Ver lotes desde el recorrido
    await page.click("[data-tour-plan]");
    await page.waitForTimeout(1200);
    console.log("plan tab", await page.$eval('#plano [data-tab][aria-selected="true"]', e => e.textContent));
    console.log("share", await page.$eval("[data-tour-share]", e => decodeURIComponent(e.href)));
  }
  console.log("status:", await page.$eval("[data-tour-status]", e => e.textContent));
  console.log(logs.join("\n") || "no errors");
  await browser.close();
})();
