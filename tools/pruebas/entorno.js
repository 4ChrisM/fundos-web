// Mapa "Descubre tu entorno": todos los lugares de un proyecto en 7 tamaños (computador, celular y horizontal).
// Revisa que la píldora del lugar elegido, los rótulos y los botones no queden bajo el panel, la ficha, los
// controles o el pie, ni fuera del mapa, y que no haya desborde horizontal.
// Uso: node entorno.js [proyecto]   (sin proyecto = Puerto Varas; también malalcahuello o marchigue)
//      MIN=1 prueba con el panel y la ficha minimizados · SHOTS=id1,id2 guarda capturas de esos lugares
const path = require("path");
const { chromium } = require("playwright");
const P = process.argv[2] || "";
const DIR = path.join(__dirname, "..", "entorno", P);
const TAG = P || "puerto-varas";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY] });
  const errs = [], probs = [];
  const sizes = [[1920,1080,"xl",false],[1440,900,"d",false],[1280,720,"s",false],[1100,800,"n",false],[390,844,"m",true],[320,640,"t",true],[844,390,"l",true]];
  const ids = require(path.join(DIR, "lugares.json")).lugares.map(l => l.id);
  for (const [w, h, tag, mob] of sizes) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob, deviceScaleFactor: 1 })).newPage();
    p.on("pageerror", e => errs.push(tag + ": " + e.message));
    p.on("console", m => { if (m.type() === "error") errs.push(tag + " console: " + m.text()); });
    await p.goto("http://127.0.0.1:8765/entorno.html" + (P ? "?p=" + P : ""), { waitUntil: "load" });
    await p.waitForTimeout(1200);
    if (process.env.MIN && !mob) { await p.click("[data-pmin]"); await p.click("[data-cmin]"); await p.waitForTimeout(800); }
    await p.screenshot({ path: `ux/entorno-${TAG}-${tag}-0.png` });
    const check = async (id) => p.evaluate((id) => {
      const R = e => e.getBoundingClientRect(), vis = e => e && !e.hidden && getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).display !== "none" && R(e).width > 0;
      const inter = (a, b, m = 0) => a.left < b.right - m && b.left < a.right - m && a.top < b.bottom - m && b.top < a.bottom - m;
      const map = document.querySelector(".map"), mr = R(map), wide = innerWidth >= 1100, out = [];
      const ui = [".zoom-ui", ".tour-btn", "[data-foot]", ".peek"].concat(wide ? [".panel", ".card"] : []).map(s => document.querySelector(s)).filter(vis);
      const inMap = r => r.left >= mr.left - 1 && r.right <= mr.right + 1 && r.top >= mr.top - 1 && r.bottom <= mr.bottom + 1;
      const sel = document.querySelector(".pin.is-on");
      if (id) {
        if (!sel) out.push("no sel"); else {
          const c = R(sel.querySelector(".pin-c"));
          if (!inMap(c)) out.push("pill out of map");
          ui.forEach(u => { if (inter(c, R(u), 1)) out.push("pill under " + u.className.split(" ").slice(-1)); });
        }
        const tg = document.querySelector(".r-tag");
        if (vis(tg) && !tg.classList.contains("is-off2")) { const r = R(tg); if (!inMap(r)) out.push("tag out"); ui.forEach(u => { if (inter(r, R(u), 1)) out.push("tag under ui"); }); }
      }
      // labels visibles
      const lbls = [...document.querySelectorAll(".pin:not(.lbl-off) .pin-l")].filter(l => vis(l) && vis(l.closest(".pin")) && !l.closest(".pin").classList.contains("is-on")).map(l => [l.textContent, R(l)]);
      const scapes = [...document.querySelectorAll(".scape, .ring-l, .t-btn:not([hidden]):not(.is-off2), .v-btn:not(.t-btn):not([hidden]):not(.is-off2)")].filter(vis).map(l => [l.textContent, R(l)]);
      const circles = [...document.querySelectorAll(".pin")].filter(vis).map(pn => [pn.dataset.id || "home", R(pn.querySelector(".pin-c"))]);
      const all = lbls.concat(scapes);
      all.forEach(([t, r], i) => {
        if (!inMap(r)) out.push("label out: " + t);
        ui.forEach(u => { if (inter(r, R(u), 2)) out.push("label under ui: " + t); });
        all.slice(i + 1).forEach(([t2, r2]) => { if (inter(r, r2, 2)) out.push("labels overlap: " + t + " / " + t2); });
        circles.forEach(([cid, c]) => { if (inter(r, c, 3) && !t.includes(cid)) { const own = [...document.querySelectorAll(".pin")].find(pn => pn.querySelector(".pin-l") && pn.querySelector(".pin-l").textContent === t && R(pn.querySelector(".pin-c")) && pn.dataset.id === cid); if (!own) out.push("label over pin: " + t + " / " + cid); } });
      });
      return { out: [...new Set(out)], sw: document.documentElement.scrollWidth, nl: lbls.length, card: document.querySelector(".card h2")?.textContent };
    }, id);
    let r = await check(null);
    if (r.out.length || r.sw > w) probs.push([tag, "inicio", r.out, r.sw]);
    for (const id of ids) {
      await p.evaluate(i => { location.hash = i; }, id);
      await p.waitForTimeout(process.env.MIN ? 2600 : 3600);
      r = await check(id);
      if (r.out.length || r.sw > w) probs.push([tag, id, r.out, r.sw]);
      if ((process.env.SHOTS || "").split(",").includes(id)) await p.screenshot({ path: `ux/entorno-${TAG}-${tag}-${id}.png` });
    }
    await p.close();
  }
  probs.forEach(x => console.log(JSON.stringify(x)));
  console.log(probs.length + " problem views");
  console.log(errs.length ? errs : "no errors");
  await b.close();
})();
