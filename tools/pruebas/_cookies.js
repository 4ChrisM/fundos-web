// Las pruebas parten con las cookies ya decididas (rechazadas), para que el banner de cookies (lib/analitica.js) no
// tape los botones. Uso: const browser = sinBanner(await chromium.launch(...)); cada página nueva trae la decisión.
// Para probar el banner mismo, no usar esto (ver el caso "cookies" en LEEME.md).
function sinBanner(browser) {
  const decision = () => { try { localStorage.setItem("fundos-cookies", JSON.stringify({ v: 1, analitica: false, t: new Date().toISOString() })); } catch (e) { /* nada */ } };
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (opts) => { const ctx = await newContext(opts); await ctx.addInitScript(decision); return ctx; };
  browser.newPage = async (opts) => { const ctx = await browser.newContext(opts); const p = await ctx.newPage(); p.close = async (o) => { await ctx.close(o); }; return p; };
  return browser;
}
module.exports = { sinBanner };
