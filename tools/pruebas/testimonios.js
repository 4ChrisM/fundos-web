// Testimonios (Inicio) y After Office (Equipo): portada con "Ver video", reproducir (WebM en el Chromium de la nube),
// solo uno suena a la vez, se detiene al cambiar de pestaña, y sin desborde en celular.
// Capturas en ux/: tst-1440.png, tst-390.png, ao-1440.png.
const { chromium } = require("playwright");
const { sinBanner } = require("./_cookies");
const B = "http://127.0.0.1:8765/";
(async () => {
  const browser = sinBanner(await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY, "--autoplay-policy=no-user-gesture-required"] }));
  const out = {}, logs = [];
  const nueva = async (vp, movil) => {
    const p = await browser.newPage(Object.assign({ viewport: vp, deviceScaleFactor: 1 }, movil ? { isMobile: true, hasTouch: true } : {}));
    p.on("pageerror", e => logs.push("pageerror: " + e.message));
    p.on("console", x => { if (x.type() === "error" && !/Failed to load resource|disponibilidad|CORS/.test(x.text())) logs.push(x.text()); });
    return p;
  };
  const p = await nueva({ width: 1440, height: 900 });
  await p.goto(B + "#testimonios", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelector("#testimonios").scrollIntoView({ behavior: "instant" }));
  await p.waitForTimeout(600);
  out.antes = await p.evaluate(() => {
    const v = document.querySelector('[data-tst="testimonios"] video'), b = document.querySelector('[data-tst="testimonios"] [data-tst-play]');
    return { controls: v.controls, boton: !b.hidden, preload: v.preload, poster: v.poster.split("/").pop(), cargado: v.currentSrc };
  });
  await p.screenshot({ path: "ux/tst-1440.png" });
  await p.click('[data-tst="testimonios"] [data-tst-play]');
  await p.waitForTimeout(2500);
  out.reproduce = await p.evaluate(() => {
    const v = document.querySelector('[data-tst="testimonios"] video');
    return { paused: v.paused, t: +v.currentTime.toFixed(1), src: v.currentSrc.split("/").pop(), controls: v.controls, w: v.videoWidth, h: v.videoHeight };
  });
  // Pasar a Equipo: el de testimonios se detiene; el After Office pausa al otro
  await p.evaluate(() => { location.hash = "#after-office"; });
  await p.waitForTimeout(900);
  out.alCambiar = await p.evaluate(() => document.querySelector('[data-tst="testimonios"] video').paused);
  await p.evaluate(() => document.querySelector("#nosotros").scrollIntoView({ behavior: "instant" }));
  await p.waitForTimeout(400);
  await p.screenshot({ path: "ux/ao-1440.png" });
  await p.click('[data-tst="after-office"] [data-tst-play]');
  await p.waitForTimeout(2000);
  out.after = await p.evaluate(() => { const v = document.querySelector('[data-tst="after-office"] video'); return { paused: v.paused, t: +v.currentTime.toFixed(1), src: v.currentSrc.split("/").pop() }; });
  // Celular
  const m = await nueva({ width: 390, height: 844 }, true);
  await m.goto(B + "#testimonios", { waitUntil: "networkidle" });
  await m.waitForTimeout(1200);
  await m.evaluate(() => document.querySelector("#testimonios").scrollIntoView({ behavior: "instant" }));
  await m.waitForTimeout(500);
  out.movil = await m.evaluate(() => ({ docW: document.documentElement.scrollWidth, w: innerWidth, tel: Math.round(document.querySelector(".tst-tel").getBoundingClientRect().width) }));
  await m.screenshot({ path: "ux/tst-390.png", fullPage: false });
  out.logs = logs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
