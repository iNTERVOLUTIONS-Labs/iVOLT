# Lighthouse — medición de la web de documentación

**Fecha de las mediciones:** 13 de septiembre de 2026, 17:54–17:55 UTC.
**Lighthouse:** 13.4.1 (CLI, `node_modules/.bin/lighthouse`).
**Navegador:** HeadlessChrome/152.0.0.0 (`--headless=new --no-sandbox`), Linux x86_64.
**Índice de referencia de la máquina (benchmarkIndex):** 2274 (móvil) / 2390,5 (escritorio).

## Entorno

Estas cifras se han obtenido en un **laboratorio**, no en producción:

- Máquina de desarrollo Linux, sin otra carga controlada durante la ejecución.
- Servidor local `astro preview` (`http://127.0.0.1:4326`) sirviendo `apps/docs/dist`,
  construido con `npm run build` + `npm run build:docs`.
- **Sin red real:** todo el tráfico es *loopback*; el estrangulamiento de red y CPU es
  simulado por Lighthouse, no medido contra una conexión real.
- **Sin caché ni CDN:** no hay proxy, ni compresión de borde, ni latencia de origen.
- **Sin datos de usuarios reales:** ninguna de estas cifras es de campo (CrUX/RUM).
- Una sola ejecución por ruta y preajuste; no hay mediana de varias pasadas.

Preajustes: móvil (por defecto: 412×823, DSR 1,75, RTT 150 ms, 1638,4 kbps, CPU ×4) y
`--preset=desktop` (RTT 40 ms, 10240 kbps, CPU ×1).
Categorías: rendimiento, accesibilidad, prácticas recomendadas, SEO.

## Puntuaciones por ruta y preajuste

Valores exactos del JSON (`categories.*.score` × 100), sin redondeo al alza.

| Ruta | Preajuste | Rendimiento | Accesibilidad | Prácticas rec. | SEO |
|---|---|---|---|---|---|
| `/` | móvil | 100 | 100 | 100 | 100 |
| `/` | escritorio | 100 | 100 | 100 | 100 |
| `/getting-started` | móvil | 100 | 100 | 100 | 100 |
| `/getting-started` | escritorio | 100 | 100 | 100 | 100 |
| `/components/dialog` | móvil | 100 | 100 | 100 | 100 |
| `/components/dialog` | escritorio | 100 | 100 | 100 | 100 |
| `/examples/admin/index.html` | móvil | 100 | 100 | 96 | 100 |
| `/examples/admin/index.html` | escritorio | **91** | 100 | 96 | 100 |

## Métricas

Valores numéricos exactos (`audits.*.numericValue`), en milisegundos salvo CLS.

| Ruta | Preajuste | LCP | CLS | TBT | FCP | Speed Index |
|---|---|---|---|---|---|---|
| `/` | móvil | 1057,3326 | 0 | 0 | 981,1105 | 981,1105 |
| `/` | escritorio | 312,404 | 0,005105310628031003 | 0 | 288,66999999999996 | 288,66999999999996 |
| `/getting-started` | móvil | 1053,83475 | 0,02028628514262483 | 0 | 978,195625 | 978,195625 |
| `/getting-started` | escritorio | 283,57 | 0 | 0 | 262,975 | 262,975 |
| `/components/dialog` | móvil | 1053,25245 | 0 | 0 | 977,710375 | 977,710375 |
| `/components/dialog` | escritorio | 283,43635 | 0 | 0 | 262,863625 | 262,863625 |
| `/examples/admin/index.html` | móvil | 1217,35275 | 0 | 0 | 1064,4606250000002 | 1064,4606250000002 |
| `/examples/admin/index.html` | escritorio | 422,6383000000001 | **0,1872130530716595** | 0 | 335,09220000000005 | 335,09220000000005 |

TBT es 0 en las ocho ejecuciones.

## Auditorías fallidas

Se listan todas las auditorías con `score < 1` de las cuatro categorías. Se indica el
peso dentro de su categoría: varias tienen **peso 0**, es decir, fallan pero no bajan la
puntuación. Un 100 en la tabla anterior no significa «sin hallazgos».

### 1. `cumulative-layout-shift` / `layout-shifts` / `cls-culprits-insight` — peso alto

- **Dónde:** `/examples/admin/index.html`, **solo escritorio** (móvil: CLS 0).
- **Puntuación de la auditoría:** 0,65 (CLS) y 0 (`layout-shifts`).
- **Elemento afectado:** `body > div.ra-shell > main#main`
  (`<main id="main" tabindex="-1" class="ra-main iv-stack …">`), desplazamiento 0,1872130530716595.
- **Causa más probable:** a partir de 64 em la receta convierte el `<dialog class="iv-drawer"
  id="admin-nav">` en barra lateral estática dentro de `.ra-shell` (flex). El `<dialog>` sin
  atributo `open` no ocupa espacio hasta que el estado estático se aplica; `admin.js` se carga
  como módulo (diferido) y llama a `Drawer.getOrCreate()` después del primer pintado, de modo
  que `main` se desplaza lateralmente cuando aparece la columna. En móvil el `<dialog>` sigue
  siendo modal y no hay desplazamiento, lo que encaja con que solo falle en escritorio.
- **Propuesta (no aplicada):** reservar el hueco de la barra lateral en CSS puro, sin depender
  de JS. En el bloque `@media (min-width: 64em)` de la receta, dar a `.ra-shell` una rejilla con
  columna fija para la barra (p. ej. `grid-template-columns: <ancho> 1fr`) o un ancho mínimo
  reservado, de forma que `main` ocupe su posición final ya en el primer pintado.
- **Archivo que tocaría el integrador:** `examples/recipes/admin/index.html` (bloque `<style>`
  de la receta), y la copia publicada `apps/docs/public/examples/admin/index.html` debe quedar
  sincronizada (`npm run check-examples`).
- **Cautela:** CLS es una métrica ruidosa y esto es **una sola pasada**. Antes de dar la
  corrección por buena conviene repetir la medición varias veces y comparar medianas.

### 2. `errors-in-console` — prácticas recomendadas, peso alto

- **Dónde:** `/examples/admin/index.html`, móvil y escritorio (96 en la categoría).
- **Detalle exacto:** `Failed to load resource: the server responded with a status of 404
  (Not Found)` en `http://127.0.0.1:4326/favicon.ico`.
- **Causa:** la receta no declara icono, por lo que el navegador pide `/favicon.ico` a la raíz
  del servidor y recibe 404. Es un artefacto del *host* de la demo, no un fallo del paquete.
- **Propuesta:** añadir en el `<head>` de la receta un `<link rel="icon" …>` apuntando a un
  icono existente (la web de docs ya sirve `favicon.svg`) o, si se prefiere no añadir activos,
  `<link rel="icon" href="data:,">` para no pedir nada.
- **Archivo:** `examples/recipes/admin/index.html` (+ copia en `apps/docs/public/examples/admin/`).

### 3. `label-content-name-mismatch` — accesibilidad, **peso 0**

- **Dónde:** `/`, `/getting-started`, `/components/dialog`, en móvil y escritorio.
  No baja la puntuación de accesibilidad (sigue 100), pero es un hallazgo real.
- **Elementos afectados (máx. 5):**
  1. `body.docs > header.docs-header > div.iv-container > a.docs-brand` —
     `<a class="docs-brand" href="/" aria-label="iVOLT home">`, texto visible `iVOLT CSS`.
  2. `body.docs > header.docs-header > div.iv-container > button.iv-button` —
     `<button … class="… docs-menu-toggle" aria-label="Open navigation">`, texto visible `Menu`
     (solo aparece en el preajuste móvil, donde el botón es visible).
- **Explicación de axe:** «Text inside the element is not included in the accessible name».
  El nombre accesible impuesto por `aria-label` no contiene el texto visible, lo que rompe el
  control por voz (decir «Menu» no activa el botón).
- **Propuesta:** que el nombre accesible **contenga** el texto visible: `aria-label="iVOLT CSS —
  home"` (o retirar el `aria-label` y dejar que el texto del enlace sea el nombre) y
  `aria-label="Menu"`/`aria-label="Open navigation menu"` manteniendo «Menu» dentro.
- **Archivo que tocaría el integrador:** `apps/docs/src/layouts/Base.astro`.
- **Nota de coordinación:** este archivo está en manos de la revisión de accesibilidad en curso;
  aquí solo se deja constancia del hallazgo, sin modificarlo.

### 4. `render-blocking-insight` — rendimiento, **peso 0**

- **Dónde:** las cuatro rutas, ambos preajustes (puntuación 0,5 en la mayoría; 0 en
  `/components/dialog` móvil, `/getting-started` móvil y `/` móvil).
- **Recursos:** `/_astro/Base.DIFtpmPk.css` (70 160 bytes en disco) en las páginas de docs y
  `/examples/ivolt/css/ivolt.min.css` (10 722 bytes transferidos, 306 ms atribuidos) en la receta.
- **Causa:** una única hoja de estilos bloqueante en `<head>`. Es el comportamiento esperado de
  un sitio sin JS de hidratación; el coste medido es pequeño y el rendimiento sigue en 100.
- **Propuesta (opcional, baja prioridad):** si se quiere recortar el primer pintado, extraer el
  CSS crítico en línea y cargar el resto de forma diferida en el `<head>` de
  `apps/docs/src/layouts/Base.astro` (o mediante la configuración de Astro en
  `apps/docs/astro.config.*`). **Recomendación: no hacerlo ahora**; añade complejidad y riesgo de
  destello sin mejora perceptible con estas cifras.

### 5. `network-dependency-tree-insight` — rendimiento, **peso 0**

- **Dónde:** las cuatro rutas, ambos preajustes. Auditoría informativa de cadena de
  dependencias; sugiere candidatos a `preconnect`. Como **todo se sirve desde el mismo origen
  local**, no hay orígenes externos a los que preconectar: **sin acción**. Este resultado no es
  extrapolable a un despliegue real con CDN o fuentes externas.

## Lo que estas cifras no dicen

- **Laboratorio, no campo.** Son mediciones sintéticas con estrangulamiento simulado. No
  sustituyen a datos de usuarios reales (RUM/CrUX), que es lo único que refleja la experiencia
  real de la gente y lo que cuenta para Core Web Vitals.
- **Un solo dispositivo simulado.** El preajuste móvil emula una pantalla de 412×823 con CPU ×4;
  no hay gama baja real, ni iOS/Safari, ni Firefox, ni pantallas grandes, ni red móvil real.
- **Sitio sin desplegar.** Servido por `astro preview` desde *loopback*: sin DNS, sin TLS, sin
  latencia de origen, sin CDN, sin compresión de borde, sin cachés intermedias. Un despliegue
  real tendrá LCP y FCP mayores que los de esta tabla.
- **Una sola pasada por ruta.** Sin medianas de varias ejecuciones, las métricas dependientes del
  momento (sobre todo CLS y TBT) pueden variar entre ejecuciones.
- **Cuatro rutas de treinta y dos páginas construidas.** El resto del sitio no se ha medido.
- **Un 100 no es «sin problemas».** Cuatro auditorías fallan con peso 0 y no descuentan puntos;
  la de accesibilidad (`label-content-name-mismatch`) es un defecto real para quien navega por voz.
- **Lighthouse no audita todo.** Su categoría de accesibilidad es un subconjunto automatizable;
  no sustituye a pruebas con lector de pantalla, teclado y personas usuarias reales.

## Remedición tras las correcciones (integrador, 2026-09-13)

Correcciones aplicadas: favicon declarado en recetas y starter (`<link rel="icon" href="data:,">`), columna del drawer reservada en CSS con colocación explícita de `main` en la receta admin, nombres accesibles del enlace de marca y del botón de menú alineados con su texto visible. Servidor `scripts/docs-server.mjs` (build + `astro preview` en el mismo proceso), Lighthouse 13.4.1, Chrome headless 152.

| Ruta | Preset | Perf | BP | CLS |
|---|---|---|---|---|
| `/examples/admin/index.html` | escritorio, pasada 1 | 100 | 100 | 0,0000 |
| `/examples/admin/index.html` | escritorio, pasada 2 | 100 | 100 | 0,0000 |
| `/examples/admin/index.html` | móvil | 100 | — | 0,0000 |

Nota de método: la primera versión de la corrección (rejilla sin colocación explícita) empeoró el CLS a 0,57 porque `main` ocupaba la primera columna mientras el drawer estaba oculto y saltaba a la segunda al aparecer; la colocación explícita lo resuelve. Las mismas salvedades de laboratorio de la sección anterior siguen vigentes.

## Rediseño de la web (2026-09-14, ADR-027)

Home tras el rediseño (campo animado, transiciones de vista, revelados, fuente local), mismo método y entorno de laboratorio, `scripts/docs-server.mjs` con build previo:

| Ruta | Preset | Perf | A11y | BP | SEO | LCP ms | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| `/` | móvil | 100 | 100 | 100 | 100 | 1361 | 0,000 | 0 |
| `/` | escritorio | 100 | 100 | 100 | 100 | 371 | 0,000 | 0 |

Auditorías con peso 0 que siguen «fallando»: `render-blocking-insight` (una hoja CSS) y `network-dependency-tree-insight` (informativa). Solo se animan `transform` y `opacity`; los resplandores son gradientes prerrenderizados, sin `filter: blur` animado.

## Ciclo v0.2 — remedición tras el rediseño ronda 2 y la web en español (2026-09-14)

Mismo método y mismo entorno de laboratorio que arriba: Lighthouse 13.4.1 (CLI), HeadlessChrome `--headless=new --no-sandbox`, servidor local `scripts/docs-server.mjs` en `http://127.0.0.1:4326` sirviendo `apps/docs/dist` recién construido, una sola pasada por ruta y preajuste, sin red real ni datos de campo. JSON en el directorio temporal del trabajo (`lh-final-*.json`); no se versionan.

| Ruta | Preajuste | Rendimiento | Accesibilidad | Prácticas rec. | SEO | LCP | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| `/` | móvil | 100 | 100 | 100 | 100 | 1528 ms | 0 | 18 ms | 1134 ms |
| `/` | escritorio | 100 | 100 | 100 | 100 | 373 ms | 0 | 0 ms | 306 ms |
| `/es` | móvil | 100 | 100 | 100 | 100 | 1526 ms | 0 | 0 ms | 1205 ms |
| `/es` | escritorio | 100 | 100 | 100 | 100 | 371 ms | 0 | 0 ms | 305 ms |

Hallazgos corregidos durante la medición: `hreflang` con URL relativas (auditoría `hreflang`, SEO 90/80) → ahora solo se emiten con `SITE_URL`, igual que `canonical`; enlace «Empezar» en la home española marcado como texto no descriptivo (`link-text`) → «Primeros pasos». El canvas de arcos del hero no afecta a TBT (≤ 18 ms en móvil simulado con CPU ×4); su coste por fotograma no se ha medido con perfilador.

## Ciclo v0.3 — remedición tras la capa expresiva (2026-09-14)

Mismo método y entorno que arriba (Lighthouse 13.4.1, HeadlessChrome, `scripts/docs-server.mjs` en 4326 sirviendo el build del gate `verify`, una pasada por ruta y preajuste, sin red real). La home lleva ahora en el gabinete un carrusel, un formulario con etiquetas flotantes y tarjetas de cristal, y `ivolt.min.css` pasó de 10,5 a 16,4 KiB gzip.

| Ruta | Preajuste | Rendimiento | Accesibilidad | Prácticas rec. | SEO | LCP | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| `/` | móvil | 99 | 100 | 100 | 100 | 1837 ms | 0 | 0 ms | 1437 ms |
| `/` | escritorio | 100 | 100 | 100 | 100 | 416 ms | 0 | 0 ms | 347 ms |
| `/es` | móvil | 99 | 100 | 100 | 100 | 1831 ms | 0 | 0 ms | 1431 ms |
| `/es` | escritorio | 100 | 100 | 100 | 100 | 432 ms | 0 | 0 ms | 345 ms |

El punto perdido en móvil es LCP (1,53 → 1,84 s simulados): el CSS crecido y el gabinete con más fixtures. Sigue por encima del listón (≥ 95). Opción documentada, no ejecutada: cargar en la home solo los módulos CSS que usa (per-component CSS) en vez de `ivolt.css` completo.

## Ciclos v0.4 y v0.5 — remedición al cerrar `0.5.0-beta.0` (2026-09-14)

Mismo método y entorno (Lighthouse 13.4.1, HeadlessChrome, `scripts/docs-server.mjs` en 4326 sirviendo el build del gate `verify`, una pasada por ruta y preajuste, sin red real). La cabecera lleva ahora el megamenú de componentes y `ivolt.min.css` pasó de 16,4 a 21,0 KiB gzip.

| Ruta | Preajuste | Rendimiento | Accesibilidad | Prácticas rec. | SEO | LCP | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| `/` | móvil | 99 | 100 | 100 | 100 | 1849 ms | 0 | 11 ms | 1590 ms |
| `/` | escritorio | 100 | 100 | 100 | 100 | 437 ms | 0 | 0 ms | 347 ms |
| `/es` | móvil | 99 | 100 | 100 | 100 | 1988 ms | 0 | 10 ms | 1582 ms |
| `/es` | escritorio | 100 | 100 | 100 | 100 | 436 ms | 0 | 0 ms | 347 ms |

El punto de móvil sigue siendo LCP por el peso del CSS completo; la opción de servir solo los módulos que usa la home sigue documentada y no ejecutada.

## Ronda de revisión visual sobre `0.5.0-beta.0` (2026-09-14, ADR-039/040)

Mismo método y entorno (Lighthouse 13.4.1, HeadlessChrome, `scripts/docs-server.mjs` en 4327 sirviendo el build del gate `verify`, una pasada por ruta y preajuste, sin red real). La home lleva ahora el gabinete con fotografías (JPEG 1280×800, cargadas en diferido), `ivolt.min.css` pasó de 21,0 a 22,2 KiB gzip y la cabecera y el pie cambiaron con el rediseño.

| Ruta | Preajuste | Rendimiento | Accesibilidad | Prácticas rec. | SEO | LCP | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| `/` | móvil | 98 | 100 | 100 | 100 | 2225 ms | 0 | 9 ms | 1589 ms |
| `/` | escritorio | 100 | 100 | 100 | 100 | 479 ms | 0 | 0 ms | 387 ms |
| `/es` | móvil | 98 | 100 | 100 | 100 | 2216 ms | 0 | 7 ms | 1583 ms |
| `/es` | escritorio | 100 | 100 | 100 | 100 | 474 ms | 0 | 0 ms | 388 ms |

Lectura honesta: móvil baja un punto (99 → 98) y el LCP sube unos 300 ms respecto al cierre de 0.5. El elemento LCP en móvil es el `<strong>` de las cifras del hero, que aparece tras la entrada escalonada (retraso de render del elemento ≈ 620 ms según `lcp-breakdown-insight`); el CSS completo sigue bloqueando el primer render. Una sola pasada por ruta: la diferencia de un punto está dentro del ruido entre ejecuciones y no se ha promediado. Las fotografías no aparecen en `image-delivery-insight` en móvil (no están en el viewport inicial). Opciones documentadas y no ejecutadas: servir a la home solo los módulos que usa, y no retrasar la entrada de las cifras del hero.

## Ciclo v0.6 — remedición al cerrar `0.6.0-beta.0` (2026-09-14)

Mismo método y entorno (Lighthouse 13.4.1, HeadlessChrome, `scripts/docs-server.mjs` en 4327 sirviendo el build del gate `verify`, una pasada por ruta y preajuste, sin red real). `ivolt.min.css` pasó de 22,2 a 25,6 KiB gzip (cinco módulos nuevos), el JS agrupado de 35,4 a 39,0; la home no usa los módulos nuevos, pero carga la hoja completa.

| Ruta | Preajuste | Rendimiento | Accesibilidad | Prácticas rec. | SEO | LCP | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| `/` | móvil | 98 | 100 | 100 | 100 | 2286 ms | 0 | 0 ms | 1587 ms |
| `/` | escritorio | 100 | 100 | 100 | 100 | 503 ms | 0 | 0 ms | 390 ms |
| `/es` | móvil | 98 | 100 | 100 | 100 | 2294 ms | 0 | 11 ms | 1582 ms |
| `/es` | escritorio | 100 | 100 | 100 | 100 | 566 ms | 0 | 0 ms | 396 ms |

Sin cambios de nota respecto a la ronda anterior; el LCP móvil sube unos 60 ms con 3,5 KiB más de CSS bloqueante. La opción de servir a la home solo los módulos que usa sigue documentada y no ejecutada; con 0.7 (lightbox, movimiento, texto) la hoja crecerá de nuevo y conviene decidirla al cerrar ese ciclo.
