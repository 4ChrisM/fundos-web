# Pruebas automáticas de la propuesta (Playwright)

Requieren el sitio servido en local y Chromium. Desde la raíz del repositorio (el sitio queda en http://127.0.0.1:8765/):

```
python3 -m http.server 8765 --bind 127.0.0.1 &
mkdir -p /tmp/pruebas-fundos/ux && cd /tmp/pruebas-fundos
NODE_PATH=/opt/node22/lib/node_modules node <repo>/tools/pruebas/interacciones.js
```

Se corren desde una carpeta temporal porque guardan capturas (`ux/*.png`). Cada una imprime un JSON con lo medido y
"no errors" (o los errores de la página).

| Archivo | Qué verifica |
|---|---|
| `interacciones.js` | Recorrido general: panel del lote, favoritos, filtros, lista, buscador, ficha de proyecto, simulador, formulario, enlaces `#lote-…`, teclado y hoja inferior en celular |
| `plano.js` | Plano en celular y escritorio: hoja inferior, chips de precio, teclado, tooltip, favoritos, lista |
| `flujos.js` | Buscador → plano, sin resultados, mensajes de WhatsApp, simulador con lote |
| `qa.js` | Correcciones de la QA final: foco sin saltos, panel fijo, tooltip, zoom con teclado, reserva, encuadre de chips, hoja sin desplazar la página, teléfono horizontal |
| `accesibilidad.js` | Foco, `aria-*`, pestañas, movimiento reducido, modo inmersivo del recorrido, formulario |
| `rendimiento.js` | Fuentes propias, plano diferido, animaciones en pausa, sin JavaScript |
| `recorrido.js` | Recorrido 360°. Uso: `node recorrido.js 1280 800 ux/tc` (ancho, alto, prefijo de capturas) |
| `anchos.js` | Sin desborde horizontal de 320 a 1920 px |
| `equipo.js` | Tarjetas y ficha de cada persona, video del saludo, "Agendar con…", enlace `#equipo-6` |
| `plano-en-pantalla.js` | Alto del plano + chips en distintas pantallas (debe terminar dentro del alto visible) |
| `cotizador.js` | Alto del cotizador en contado y financiamiento |
| `pestanas.js` | "Todo sobre tu compra": pestañas, teclado, enlaces `#simulador`/`#portal`/`#preguntas`, indicador de sección, carruseles |
| `largo.js` | Largo de la página en pantallas, total y por sección (computador y celular) |
| `entorno.js` | Mapa del entorno: todos los lugares de un proyecto en 7 tamaños (píldora, rótulos y botones sin quedar bajo panel, ficha, controles ni pie). Uso: `node entorno.js [malalcahuello\|marchigue]` (sin argumento, Puerto Varas); `MIN=1` con paneles minimizados. Tarda ~5 min por proyecto; debe dar "0 problem views" |
| `_vista.js` | Ayuda para las demás: elegir pestaña (`vista`), proyecto del plano (`proyecto`) o dejar la página como antes de las pestañas (`clasica`) |

Nota: el Chromium de pruebas no reproduce H.264, por eso los videos del sitio llevan también WebM.
