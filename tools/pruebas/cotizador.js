const { chromium } = require("playwright");
const { vista, proyecto, clasica } = require("./_vista");
const W = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] });
  for (const [w, h] of (process.argv[2] || "1366x768,1440x900,1920x1080,390x844").split(",").map(s => s.split("x").map(Number))) {
    const mob = w < 700;
    const pg = await (await browser.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob })).newPage();
    await pg.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" }); await clasica(pg);
    await pg.evaluate(() => document.querySelector('[data-tc-tab="simulador"]').click()); await W(300);
    for (const modo of ["contado", "credito"]) {
      await pg.evaluate(m => { const r = document.querySelector('input[name="modo"][value="' + m + '"]'); if (r) r.click(); }, modo); await W(300);
      await pg.evaluate(() => { const s = document.querySelector("[data-sim]"); scrollTo(0, scrollY + s.getBoundingClientRect().top - 78); }); await W(800);
      const m = await pg.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect(); const sim = q("[data-sim]"), res = q(".sim-result"), send = q("[data-s-send]"), head = document.querySelector("#simulador .section-head, #simulador header"); return { simH: Math.round(sim.height), simTop: Math.round(sim.top), simBottom: Math.round(sim.bottom), sendBottom: Math.round(send.bottom), resTop: Math.round(res.top), vh: innerHeight, head: head ? Math.round(head.getBoundingClientRect().height) : null }; });
      console.log(w + "x" + h, modo, JSON.stringify(m));
      await pg.screenshot({ path: `ux/sim-${w}-${modo}.png` });
    }
    await pg.context().close();
  }
  await browser.close();
})();
