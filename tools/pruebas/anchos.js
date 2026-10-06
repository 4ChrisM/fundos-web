const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const B = "http://127.0.0.1:8765/";
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] });
  for (const [w, h] of [[320, 640], [360, 780], [390, 844], [414, 896], [600, 900], [768, 1024], [844, 390], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]]) {
    const mob = w < 700;
    const pg = await (await browser.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob })).newPage();
    const errs = [];
    pg.on("pageerror", e => errs.push(e.message));
    pg.on("console", m => { if (m.type() === "error" && !/ERR_CERT|net::/.test(m.text())) errs.push(m.text()); });
    await pg.goto(B, { waitUntil: "load" }); await pg.waitForTimeout(1500); await clasica(pg);
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } });
    await pg.waitForTimeout(400);
    const r = await pg.evaluate((W) => {
      const over = [];
      document.querySelectorAll("body *").forEach(e => {
        const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || e.closest("svg,.ticker,.sr-only,[hidden],.plan-canvas,.tour-picker,.plan-cats,.projects,.sellers,.tc-tabs,dialog:not([open])")) return;
        const b = e.getBoundingClientRect(); if (b.width && (b.right > W + 1 || b.left < -1)) over.push((e.className && e.className.baseVal === undefined ? e.className : e.tagName).toString().slice(0, 40) + "@" + Math.round(b.left) + "-" + Math.round(b.right));
      });
      return { sw: document.documentElement.scrollWidth, over: [...new Set(over)].slice(0, 8) };
    }, w);
    console.log(w + "x" + h, "sw=" + r.sw, r.over.join(" | "), errs.join(" / "));
    await pg.context().close();
  }
  await browser.close();
})();
