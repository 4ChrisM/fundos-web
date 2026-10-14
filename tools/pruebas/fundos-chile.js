// "Fundos en todo Chile" (Sala de cine): Chile completo, lupa que viaja al fundo, carrusel y ficha con fotos.
// Uso: node fundos-chile.js   (desde una carpeta temporal con ux/; ver LEEME.md)
const { chromium } = require("playwright");
const URL = "http://127.0.0.1:8765/#mas-proyectos";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const out = {}, errs = [];
  for (const [w, h, touch] of [[1440, 900, false], [1280, 760, false], [390, 844, true], [320, 640, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    const p = await ctx.newPage(); p.on("pageerror", e => errs.push(w + ": " + e));
    await p.goto(URL, { waitUntil: "load" }); await p.waitForTimeout(900);
    const r = {};
    r.visible = await p.evaluate(() => !document.querySelector("[data-mch]").hidden);
    r.regiones = await p.evaluate(() => document.querySelectorAll("[data-mch-chile] .mch-reg").length);
    r.tiles = await p.evaluate(() => document.querySelectorAll(".mch-tile").length);
    const vb0 = await p.evaluate(() => document.querySelector("[data-mch-lupa] svg").getAttribute("viewBox"));
    // Tocar Puerto Varas: la lupa viaja y se abre la ficha con 6 fotos
    const t = await p.$('.mch-tile[data-p="puerto-varas"] .mch-tile-b');
    await t.evaluate(e => e.scrollIntoView({ inline: "center", block: "center" })); await t.click(); await p.waitForTimeout(1300);
    r.lupaViaja = vb0 !== await p.evaluate(() => document.querySelector("[data-mch-lupa] svg").getAttribute("viewBox"));
    r.activo = await p.evaluate(() => document.querySelector(".mch-act-t").textContent);
    r.fotos = await p.evaluate(() => document.querySelectorAll(".mf-mini button").length);
    await p.click(".mf-mini button:nth-child(3)"); await p.waitForTimeout(300);
    r.foto3 = await p.evaluate(() => document.querySelector("[data-mf-cap]").textContent);
    await p.screenshot({ path: `ux/fch-${w}-pv.png` });
    // Un fundo sin fotos: emblema y "próximamente"
    const s = await p.$('.mch-tile[data-p="talca"] .mch-tile-b'); await s.evaluate(e => e.scrollIntoView({ inline: "center", block: "center" })); await s.click(); await p.waitForTimeout(800);
    r.talca = await p.evaluate(() => [document.querySelector(".mf-t").textContent, !!document.querySelector(".mf-pronto"), !!document.querySelector('.mch-ficha .py-acts a[href^="https://wa.me"]')]);
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    r.cierraEsc = await p.evaluate(() => document.querySelector("[data-mch-ficha]").hidden && document.activeElement.classList.contains("mch-tile-b"));
    // Tocar el Chile completo cerca de 40°S lleva a un fundo del sur
    await p.evaluate(() => { const s = document.querySelector("[data-mch-chile] svg"), m = s.getScreenCTM(), pt = s.createSVGPoint(); pt.x = 60; pt.y = (40.5 - 17.3) * 20; window.scrollTo({ top: scrollY + pt.matrixTransform(m).y - innerHeight / 2, behavior: "instant" }); }); await p.waitForTimeout(300);
    const box = await p.evaluate(() => { const s = document.querySelector("[data-mch-chile] svg"), m = s.getScreenCTM(), pt = s.createSVGPoint(); pt.x = 60; pt.y = (40.5 - 17.3) * 20; const q = pt.matrixTransform(m); return [q.x, q.y]; });
    await p.mouse.click(box[0], box[1]); await p.waitForTimeout(1200);
    r.alSur = await p.evaluate(() => document.querySelector(".mch-act-t").textContent);
    r.ancho = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    await p.screenshot({ path: `ux/fch-${w}.png` });
    out[w] = r; await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  console.log(errs.length ? errs : "no errors");
  await b.close();
})();
