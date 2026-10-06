const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const W = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] });
  const sizes = (process.argv[2] || "1366x768,1440x900,1536x864,1920x1080,1024x768,390x844").split(",").map(s => s.split("x").map(Number));
  for (const [w, h] of sizes) {
    const mob = w < 700;
    const pg = await (await browser.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob })).newPage();
    await pg.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" }); await clasica(pg);
    const res = [];
    for (const id of ["malalcahuello", "marchigue", "puerto-varas"]) {
      await pg.evaluate(i => { document.querySelector('[role="tab"][data-tab="' + i + '"]').click(); }, id); await W(700);
      await pg.evaluate(() => { const s = document.querySelector(".plan-stage"), nb = document.querySelector(".nav").getBoundingClientRect().height; scrollTo(0, scrollY + s.getBoundingClientRect().top - nb - 12); }); await W(700);
      const m = await pg.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect(); const st = q(".plan-stage"), cv = q(".plan-canvas"), ca = q(".plan-cats"), lg = q(".plan-legend"), svg = document.querySelector(".plan-canvas svg"), g = svg.querySelector(".lots").getBoundingClientRect(); return { cats: Math.round(ca.height), canvas: Math.round(cv.height), legendBottom: Math.round(lg.bottom), stageTop: Math.round(st.top), canvasBottom: Math.round(cv.bottom), lotsBottom: Math.round(g.bottom), lotsTop: Math.round(g.top), vh: innerHeight, zoomed: document.querySelector(".plan-canvas").classList.contains("is-zoomed") }; });
      res.push(id.slice(0, 5) + " " + JSON.stringify(m));
      if (id === "malalcahuello") await pg.screenshot({ path: `ux/pf-${w}x${h}.png` });
    }
    console.log(w + "x" + h + "\n  " + res.join("\n  "));
    await pg.context().close();
  }
  await browser.close();
})();
