const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] });
  const out = {}; const errs = [];
  for (const [w, h, tag] of [[1440, 900, "d"], [390, 844, "m"]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on("pageerror", e => errs.push(tag + ": " + e.message));
    p.on("console", m => { if (m.type() === "error") errs.push(tag + " console: " + m.text()); });
    await p.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" }); await clasica(p);
    const r = {};
    r.hidden = await p.$$eval("[data-tc-panel]", ps => ps.map(x => x.id + ":" + x.hidden));
    await vista(p, "compra");
    await p.evaluate(() => document.getElementById("tu-compra").scrollIntoView());
    await p.waitForTimeout(600);
    r.where1 = await p.textContent("[data-nav-where]");
    await p.screenshot({ path: `ux/tc-${tag}-1.png` });
    await p.click('[data-tc-tab="simulador"]'); await p.waitForTimeout(700);
    r.afterClick = await p.$$eval("[data-tc-panel]", ps => ps.filter(x => !x.hidden).map(x => x.id));
    r.hash = await p.evaluate(() => location.hash);
    r.where2 = await p.textContent("[data-nav-where]");
    r.barTop = await p.$eval(".tc-bar", e => Math.round(e.getBoundingClientRect().top));
    await p.screenshot({ path: `ux/tc-${tag}-2.png` });
    await p.focus('[data-tc-tab="simulador"]'); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(400);
    r.afterKey = await p.$$eval("[data-tc-panel]", ps => ps.filter(x => !x.hidden).map(x => x.id));
    r.focused = await p.evaluate(() => document.activeElement.getAttribute("data-tc-tab"));
    // enlace externo a #portal
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
    await p.evaluate(() => { const a = document.createElement("a"); a.href = "#portal"; a.id = "tst"; a.textContent = "x"; document.body.appendChild(a); a.click(); });
    await p.waitForTimeout(900);
    r.afterLink = await p.$$eval("[data-tc-panel]", ps => ps.filter(x => !x.hidden).map(x => x.id));
    r.tcTop = await p.$eval("#tu-compra", e => Math.round(e.getBoundingClientRect().top));
    r.avance = await p.$eval(".nav", e => e.style.getPropertyValue("--avance"));
    r.docH = await p.evaluate(() => +(document.documentElement.scrollHeight / innerHeight).toFixed(1));
    // Nosotros
    await vista(p, "equipo");
    await p.evaluate(() => document.getElementById("nosotros").scrollIntoView());
    await p.waitForTimeout(800);
    await p.screenshot({ path: `ux/tc-${tag}-nos.png` });
    r.nosH = await p.$eval("#nosotros", e => +(e.offsetHeight / innerHeight).toFixed(2));
    if (tag === "d") {
      // Galería del equipo: el panel con el cursor se ensancha (antes era un carrusel con flechas)
      const ancho = () => p.$eval('[data-seller="1"]', e => Math.round(e.closest("li").getBoundingClientRect().width));
      const before = await ancho();
      await p.hover('[data-seller="1"]'); await p.waitForTimeout(900);
      r.galeria = [before, await ancho()];
    }
    await vista(p, "proyectos");
    await p.evaluate(() => document.getElementById("proyectos").scrollIntoView());
    await p.waitForTimeout(600);
    await p.screenshot({ path: `ux/tc-${tag}-proy.png` });
    r.projOverflow = await p.$eval(".projects", e => [e.scrollWidth, e.clientWidth]);
    // hash de carga
    await p.goto("http://127.0.0.1:8765/#preguntas", { waitUntil: "networkidle" });
    await p.waitForTimeout(900);
    r.loadHash = await p.$$eval("[data-tc-panel]", ps => ps.filter(x => !x.hidden).map(x => x.id));
    r.loadTop = await p.$eval("#tu-compra", e => Math.round(e.getBoundingClientRect().top));
    out[tag] = r;
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1)); console.log(errs.length ? errs : "no errors");
  await b.close();
})();
