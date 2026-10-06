const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const W = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] });
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const mob = w < 700;
    const pg = await (await browser.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob })).newPage();
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if (m.type() === "error" && !/ERR_CERT|net::/.test(m.text())) errs.push(m.text()); });
    await pg.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" }); await vista(pg, "equipo");
    await pg.evaluate(() => document.querySelector(".sellers-head").scrollIntoView({ block: "start", behavior: "instant" })); await pg.evaluate(() => scrollBy(0, -90)); await W(1200);
    await pg.screenshot({ path: `ux/sl-grid-${w}.png` });
    await pg.click('[data-seller="3"]'); await W(900);
    const a = await pg.evaluate(() => ({ open: document.querySelector("[data-sdialog]").open, title: document.querySelector("[data-sd-title]").textContent, count: document.querySelector("[data-sd-count]").textContent, hash: location.hash, focus: document.activeElement.getAttribute("aria-label") || document.activeElement.className, wa: decodeURIComponent(document.querySelector("[data-sd-wa]").href) }));
    await pg.screenshot({ path: `ux/sl-dialog-${w}.png` });
    await pg.click("[data-sd-play]"); await W(1800);
    const v = await pg.evaluate(() => { const v = document.querySelector("[data-sd-media] video"); return v ? [v.currentTime.toFixed(1), v.videoWidth, v.error && v.error.code] : null; });
    await pg.screenshot({ path: `ux/sl-video-${w}.png` });
    await pg.keyboard.press("Tab"); // salir del video
    await pg.click("[data-sd-next]"); await W(400);
    const n = await pg.evaluate(() => [document.querySelector("[data-sd-count]").textContent, !!document.querySelector("[data-sd-media] video"), location.hash]);
    await pg.click("[data-sd-visit]"); await W(1500);
    const after = await pg.evaluate(() => [document.querySelector("[data-sdialog]").open, location.hash, Math.round(document.getElementById("visita").getBoundingClientRect().top), Math.round(document.querySelector("[data-visit]").getBoundingClientRect().top)]);
    await pg.goto("http://127.0.0.1:8765/#equipo-6", { waitUntil: "networkidle" }); await W(1200);
    const deep = await pg.evaluate(() => [document.querySelector("[data-sdialog]").open, document.querySelector("[data-sd-count]").textContent]);
    console.log(w, JSON.stringify({ a, v, n, after, deep }), errs.join(" / ") || "no errors");
    await pg.context().close();
  }
  await browser.close();
})();
