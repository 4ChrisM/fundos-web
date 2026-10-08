// "Tu casa": lote a escala, agregar, mover, agrandar, girar con teclado, medidor del 10 %, enlace desde el plano
const { chromium } = require("playwright");
const B = "http://127.0.0.1:8765/";
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] });
  const out = {}, logs = [];
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    const p = await ctx.newPage();
    p.on("pageerror", e => logs.push(w + " pageerror: " + e.message));
    p.on("console", x => { if (x.type() === "error" || x.type() === "warning") logs.push(w + " " + x.text()); });
    await p.goto(B + "#tu-casa", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
    const r = {};
    r.inicial = await p.evaluate(() => [document.querySelector("[data-c-total]").textContent, document.querySelectorAll(".casa-it").length, !document.querySelector("#tu-casa").hidden]);
    const st = await p.$(".casa-stage"); await st.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    // Mover la casa (mouse en computador, toque en celular) y verificar que la página no se desplaza al tocarla
    const b0 = await (await p.$(".casa-it rect")).boundingBox(), y0 = await p.evaluate(() => scrollY);
    const tr0 = await p.getAttribute(".casa-it", "transform");
    if (touch) {
      const cx = b0.x + b0.width / 2, cy = b0.y + b0.height / 2;
      const cdp = await ctx.newCDPSession(p);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] });
      for (let i = 1; i <= 6; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx + i * 6, y: cy + i * 8 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await p.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2); await p.mouse.down();
      await p.mouse.move(b0.x + b0.width / 2 + 40, b0.y + b0.height / 2 + 30, { steps: 5 }); await p.mouse.up();
    }
    await p.waitForTimeout(200);
    r.movida = tr0 !== await p.getAttribute(".casa-it", "transform");
    r.paginaQuieta = Math.abs(await p.evaluate(() => scrollY) - y0) < 2;
    // Agregar, cambiar medidas y pasarse del límite
    await p.click('[data-tipo="quincho"]'); await p.click('[data-tipo="bodega"]');
    r.tres = await p.evaluate(() => [document.querySelectorAll(".casa-it").length, document.querySelector("[data-c-total]").textContent]);
    await p.click('[data-tipo="casa"]');
    await p.fill("#c-ancho", "30"); await p.fill("#c-largo", "20");
    r.pasado = await p.evaluate(() => [document.querySelector("[data-c-meter]").classList.contains("is-over"), document.querySelector("[data-c-msg]").textContent]);
    await p.click("[data-c-del]");
    r.quitada = await p.evaluate(() => [document.querySelectorAll(".casa-it").length, document.querySelector("[data-c-meter]").classList.contains("is-over")]);
    // Teclado: flechas mueven, R gira
    await p.focus(".casa-it.is-sel"); const t1 = await p.getAttribute(".casa-it.is-sel", "transform");
    await p.keyboard.press("ArrowRight"); await p.keyboard.press("r");
    r.teclado = [t1, await p.getAttribute(".casa-it.is-sel", "transform"), await p.evaluate(() => document.activeElement.classList.contains("casa-it"))];
    r.wa = (await p.getAttribute("[data-c-wa]", "href")).includes("permitidos");
    r.ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    await p.screenshot({ path: "ux/casa-" + w + ".png" });
    if (!touch) {
      await p.goto(B + "#lote-malalcahuello-20", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
      await p.click("[data-d-casa]"); await p.waitForTimeout(1200);
      r.desdePlano = await p.evaluate(() => [location.hash, document.querySelector("#c-proyecto").value, document.querySelector("#c-lote").value, !document.querySelector("#tu-casa").hidden]);
    }
    out[w] = r;
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  console.log(logs.length ? logs.join("\n") : "no errors");
  await browser.close();
})();
