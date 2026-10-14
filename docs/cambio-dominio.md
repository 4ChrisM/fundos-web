# Cambio de dominio a fundosinmobiliaria.com

Decisión del cliente (oct-2026): el sitio reemplazará al de Squarespace en **fundosinmobiliaria.com**. Se dejó para
después. El cambio en el repositorio ya está hecho en el commit `80c7385` ("Sitio oficial en fundosinmobiliaria.com")
y se revirtió en la rama; para retomarlo: `git cherry-pick 80c7385` en una rama nacida de `main`.

Ese commit: `CNAME` = `fundosinmobiliaria.com`; quita `noindex` de `index.html` y `entorno.html` (`vitrina.html` lo
mantiene); agrega `canonical`, `robots.txt` y `sitemap.xml`; quita la etiqueta "Propuesta · datos de ejemplo" y
"Propuesta de diseño" del pie; cambia `og:image`, README, CLAUDE.md y los códigos de `docs/squarespace-*.html` al
dominio nuevo.

## Orden (para que el sitio no quede sin dirección)
1. **Antes:** nada pendiente de contacto (WhatsApp, correo y horario ya están en el sitio).
2. **El cliente cambia los DNS** (paso a paso abajo).
3. **Recién ahí** fusionar el cambio en `main`. Al fusionar, `fundos.biplot.cl` deja de funcionar (GitHub Pages
   acepta un solo dominio por sitio).
4. En GitHub → `fundos-web` → Settings → Pages: cuando el dominio tenga el check verde, activar **Enforce HTTPS**.
   Recomendado: verificar el dominio en la cuenta (foto → Settings → Pages → Add a domain, pide un registro TXT).

## Paso a paso (dominio administrado desde Google Workspace)
El dominio se administra desde la cuenta de **Google Workspace** de Fundos (la del correo @fundosinmobiliaria.com).
Desde 2024 los dominios comprados con Google se administran en **Squarespace Domains**, pero se llega desde Google:

1. Entrar a **admin.google.com** con la cuenta de administrador → **Cuenta → Dominios → Administrar dominios** →
   en fundosinmobiliaria.com, **Ver detalles** / **Administrar dominio**. Lleva a la configuración de DNS (en
   Squarespace Domains, con la misma cuenta de Google). Si el dominio se compró en otro proveedor (GoDaddy, NIC, etc.),
   los registros se cambian en ese proveedor.
2. **No tocar** los registros de correo de Google Workspace: **MX** (`smtp.google.com` o `aspmx.l.google.com` y
   similares), **TXT** de SPF (`v=spf1 include:_spf.google.com ~all`), **DKIM** (`google._domainkey`) ni el TXT
   `google-site-verification`. De ellos dependen los correos @fundosinmobiliaria.com.
3. **Borrar** solo los registros web que apuntan al sitio actual de Squarespace (preajuste "Squarespace Defaults"):
   los A a `198.185.159.144`, `198.185.159.145`, `198.49.23.144`, `198.49.23.145` y el CNAME `www` →
   `ext-cust.squarespace.com`. Si no deja borrarlos, primero desconectar el dominio del sitio web de Squarespace.
4. **Agregar:**

| Tipo  | Host | Valor             |
|-------|------|-------------------|
| A     | @    | 185.199.108.153   |
| A     | @    | 185.199.109.153   |
| A     | @    | 185.199.110.153   |
| A     | @    | 185.199.111.153   |
| CNAME | www  | 4chrism.github.io |

5. Avisar: recién ahí se fusiona el cambio en `main`. Los DNS tardan de minutos a unas horas en propagarse.
6. En Squarespace se puede cancelar el **plan del sitio web** cuando el nuevo esté funcionando, pero **no el dominio**.
