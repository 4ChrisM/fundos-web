// Ayuda para las pruebas desde que la página va en pestañas (Inicio · Proyectos · Tu compra · Equipo).
// vista(page, "proyectos") abre esa pestaña como lo haría una persona (clic en la pestaña) y deja la página arriba.
// proyecto(page, "malalcahuello") deja el plano en ese proyecto (enlace del pie) sin mover la página.
// clasica(page) = el plano en Malalcahuello (vive en Inicio desde que Proyectos es solo el mapa de Chile).
async function vista(page, v) {
  await page.evaluate((v) => {
    const a = document.querySelector('.nav-links [data-vista-link="' + v + '"]');
    if (a) a.click();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, v);
  await page.waitForTimeout(250);
}
async function proyecto(page, id) {
  await page.evaluate((id) => {
    const y = window.scrollY, a = document.querySelector('footer [data-goto-plan="' + id + '"]');
    if (a) { a.addEventListener("click", (e) => e.preventDefault(), { once: true }); a.click(); }
    window.scrollTo({ top: y, behavior: "instant" });
  }, id);
  await page.waitForTimeout(250);
}
async function clasica(page) { await vista(page, "inicio"); await proyecto(page, "malalcahuello"); }
module.exports = { vista, proyecto, clasica };
