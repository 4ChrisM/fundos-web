const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const W = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] });
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const mob = w < 700;
    const pg = await (await browser.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob })).newPage();
    await pg.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" }); await clasica(pg);
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } scrollTo(0, 0); });
    await W(800);
    const r = await pg.evaluate(() => { const H = innerHeight; const secs = [...document.querySelectorAll("main > section, main > div, .footer")].map(s => [s.id || s.className.split(" ")[0], +(s.getBoundingClientRect().height / H).toFixed(1)]); return { total: +(document.documentElement.scrollHeight / H).toFixed(1), secs }; });
    console.log(w + "x" + h, "total pantallas:", r.total, "\n  " + r.secs.map(s => s[0] + " " + s[1]).join(" | "));
    await pg.context().close();
  }
  await browser.close();
})();
