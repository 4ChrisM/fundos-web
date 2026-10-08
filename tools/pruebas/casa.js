// "Tu casa": lote a escala en 3D y planta, agregar, mover, zoom, girar con teclado, medidor del 10 %, enlace desde el plano
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
    const b0 = await (await p.$('.casa-it[data-i="0"] .casa-techo')).boundingBox(), y0 = await p.evaluate(() => scrollY);
    const tr0 = await p.getAttribute('.casa-it[data-i="0"] .casa-techo', "points");
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
    r.movida = tr0 !== await p.getAttribute('.casa-it[data-i="0"] .casa-techo', "points");
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
    await p.focus(".casa-it.is-sel"); const t1 = await p.getAttribute(".casa-it.is-sel .casa-techo", "points");
    await p.keyboard.press("ArrowRight"); await p.keyboard.press("r");
    r.teclado = [t1 !== await p.getAttribute(".casa-it.is-sel .casa-techo", "points"), await p.evaluate(() => document.activeElement.classList.contains("casa-it"))];
    // Zoom y vista en planta
    const vb0 = await p.getAttribute("[data-c-svg]", "viewBox");
    await p.click('[data-c-zoom="out"]'); r.zoom = vb0 !== await p.getAttribute("[data-c-svg]", "viewBox");
    await p.click('[data-c-vista="planta"]');
    r.planta = await p.evaluate(() => [document.querySelectorAll(".casa-planta").length, document.querySelectorAll(".casa-vidrio").length]);
    await p.click('[data-c-vista="iso"]');
    // Casa de dos pisos (suma 2 pisos) y piscina (no suma)
    const t0 = await p.evaluate(() => parseFloat(document.querySelector("[data-c-total]").textContent.replace(".", "").replace(",", ".")));
    await p.click('[data-tipo="casa2"]'); await p.click('[data-tipo="piscina"]');
    r.dosPisosYPiscina = [t0, await p.evaluate(() => document.querySelector("[data-c-total]").textContent), await p.evaluate(() => document.querySelectorAll(".casa-agua").length)];
    // Sol: de día hay sombras; a las 21:45 en invierno es de noche y las ventanas se encienden
    const hora = async v => { await p.evaluate(v => { const r = document.querySelector("[data-c-hora]"); r.value = v; r.dispatchEvent(new Event("input", { bubbles: true })); }, v); await p.waitForTimeout(100); };
    await hora(13); const dia = await p.evaluate(() => [document.querySelector(".casa-stage").dataset.luz, document.querySelectorAll(".casa-sombras polygon").length]);
    await p.click('[data-c-est="invierno"]'); await hora(21.75);
    r.sol = [dia, await p.evaluate(() => [document.querySelector(".casa-stage").dataset.luz, document.querySelectorAll(".casa-vidrio.is-luz").length > 0, document.querySelector("[data-c-hora-o]").textContent])];
    await p.click('[data-c-est="verano"]'); await hora(17);
    r.wa = (await p.getAttribute("[data-c-wa]", "href")).includes("permitidos");
    r.ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    await p.screenshot({ path: "ux/casa-" + w + ".png" });
    if (!touch) {
      await p.goto(B + "#lote-malalcahuello-20", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
      await p.click("[data-d-casa]"); await p.waitForTimeout(1200);
      r.desdePlano = await p.evaluate(() => [location.hash, document.querySelector("#c-proyecto").value, document.querySelector("#c-lote").value, !document.querySelector("#tu-casa").hidden]);
      // Guía: el aviso de Inicio lleva al plano (paso 1), al elegir un lote aparece "Diseñar mi casa aquí" (paso 2)
      await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
      await p.click("#disena-inicio .btn-gold"); await p.waitForTimeout(1200);
      const g1 = await p.evaluate(() => [!document.querySelector("[data-plan-guia]").hidden, document.querySelector("[data-plan-guia-paso]").textContent]);
      await p.click('#plano .lot[data-n="12"]', { force: true }); await p.waitForTimeout(800);
      const g2 = await p.evaluate(() => [document.querySelector("[data-plan-guia-paso]").textContent, !document.querySelector("[data-d-guia]").hidden]);
      await p.click("[data-d-guia]"); await p.waitForTimeout(1200);
      r.guia = [g1, g2, await p.evaluate(() => [location.hash, document.querySelector("#c-lote").value, document.querySelector("[data-plan-guia]").hidden])];
      // Techo a dos aguas y camino de acceso
      await p.click('[data-c-techo="dos"]');
      r.techoCamino = await p.evaluate(() => [document.querySelectorAll(".casa-cumbrera").length, document.querySelectorAll(".casa-camino-ripio").length, document.querySelectorAll(".casa-deslindes .is-acceso").length]);
      await p.click("[data-c-camino]");
      r.sinCamino = await p.evaluate(() => document.querySelectorAll(".casa-camino-ripio").length);
    }
    out[w] = r;
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  console.log(logs.length ? logs.join("\n") : "no errors");
  await browser.close();
})();
