# iVOLT — Calidad, presupuestos y pruebas

Estado: criterios de aceptación de fase 0. Nada de lo listado está medido todavía.

## 1. Presupuestos de tamaño (objetivos, no resultados)

| Artefacto | min + gzip | Método |
|---|---|---|
| `core.min.css` | ≤ 8 KiB | `scripts/sizes.mjs`: `zlib.gzipSync(buf, { level: 9 })`, informa versión, commit, archivo y bytes |
| `ivolt.min.css` | ≤ 40 KiB (30 hasta v0.2; ADR-030) | ídem |
| `index.js` agrupado y minificado (todos los componentes, sin docs) | ≤ 32 KiB (18 hasta v0.2; ADR-030) | esbuild bundle temporal solo para medir; `ivolt.iife.min.js` se mide aparte |

Coste medido por módulo en v0.4/v0.5 (2026-09-14, gzip 9, sin el core): megamenu 2,9 KiB JS + 1,0 KiB CSS, effects 1,2 KiB CSS, hero 1,4 KiB CSS, proximity 1,2 KiB JS, reveal 1,0 KiB JS, datepicker 5,0 KiB JS + 1,3 KiB CSS; totales tras integrar el selector de fecha: `ivolt.min.css` ≈ 21 KiB y JS agrupado ≈ 30 KiB (medición exacta en el cierre con `npm run sizes`).

Coste medido por módulo en v0.3 (2026-09-14, `esbuild --minify`, gzip 9, sin el core compartido): carousel 4,5 KiB JS, picker 5,8 KiB, form 3,0 KiB, counter 1,4 KiB, surfaces 1,4 KiB CSS; totales `ivolt.min.css` 16,40 KiB y JS agrupado 21,24 KiB, dentro de los presupuestos de ADR-030.

Nota v0.2 (2026-09-14): con Combobox el JS agrupado pasa de 7,65 a 10,02 KiB gzip y la data table se añade en el mismo ciclo; los presupuestos no cambian (≤ 18 KiB JS, ≤ 30 KiB CSS) y `npm run sizes` sigue siendo la única fuente de cifras.

Reglas: se mide cada artefacto por separado; el tarball tiene otra cifra. No se cumple un presupuesto eliminando estados accesibles ni excluyendo archivos necesarios. Si un objetivo es inviable, el informe muestra el coste por módulo, propone decisión y se registra la desviación en `DECISIONS.md`; el umbral no cambia en silencio.

Barrido de desbordamiento (revisión adversaria, 2026-09-14): 70 rutas × 6 anchos × 3 motores; 46 combinaciones con desbordamiento antes, 0 después (`tests/browser/qa-docs-shell.spec.js`, `qa-docs-css.spec.js`); fixtures de familias sin JS bajo axe, zoom 200 %, 320 px, RTL y colores forzados.

## 2. Matriz de navegadores (congelada)

| Navegador | Mínimo | Motivo del corte |
|---|---|---|
| Chrome / Edge | 111 | `color-mix()`, `@layer`, container queries, `:has()`, `<dialog>`, `inert` |
| Firefox | 113 | `color-mix()`; anidamiento CSS se aplana en build |
| Safari / iOS Safari | 16.4 | `<dialog>` modal fiable, `inert`, `@layer`, `dvh`, `:has()` |
| Samsung Internet | 22 | mismo motor que Chrome 111 |

Sin IE, sin Safari 15. `popover` y `text-wrap: balance` solo como mejora progresiva. Targets de `lightningcss` derivados de esta tabla y guardados en `packages/ivolt/browserslist`. La compatibilidad se declara como «probado en» (Playwright Chromium/Firefox/WebKit) y «diseñado para» (tabla), nunca como «todos los navegadores».

## 3. Estrategia de pruebas

| Capa | Herramienta | Cubre | Cuándo |
|---|---|---|---|
| Unitarias | Vitest (entorno node y jsdom) | `options.js` (precedencia, coerción), `registry`, `focus`, tokens build, SSR import sin `document` | cada cambio en el módulo |
| Contratos CSS | Vitest + lightningcss AST / regex | prefijo `iv-` en todo selector, ausencia de `!important` salvo `sr-only`, capas en orden, sin `var()` en `@media`, utilidades = matriz declarada | cada build |
| Navegador | Playwright 1.63 (Chromium, Firefox, WebKit) | init idempotente, destroy limpio, instancias múltiples, montaje dinámico, teclado, Esc, retorno de foco, ARIA, disabled/loading, temas anidados (matriz padre/hijo × preferencia del sistema), RTL, zoom 200 %, reduced-motion | al cerrar cada familia y en cierre de hito |
| Accesibilidad automática | `@axe-core/playwright` 4.13 | fixtures de cada componente y las tres recetas; cero hallazgos critical/serious | cierre de familia |
| Layout | Playwright screenshots + `document.documentElement.scrollWidth <= innerWidth` | 320, 390, 768, 1024, 1366 (y 1366×610), 1920 | cierre de hito |
| Integración | `scripts/pack-smoke.mjs` | `npm pack` → instalar en `os.tmpdir()` → HTML plano + build esbuild consumiendo `exports`; comprobar que `dialog` no arrastra `tabs` | cierre de hito y fase 4 |
| Docs | Playwright (`tests/browser/docs.spec.js`, `recipes.spec.js`) + Vitest (`tests/contracts/snippets.test.js`) | enlaces internos válidos, un `h1` por ruta, sin errores de consola, búsqueda, anclas, tema, copia, menú móvil, recetas (axe, overflow, interacción); toda clase `iv-*` usada en fixtures, recetas, starter y páginas existe en `dist/css/ivolt.css` | cada cierre desde fase 3 |
| Lighthouse | `lighthouse` CLI sobre `astro preview` | rutas home, getting-started, un componente, una receta; registrar versión, entorno y puntuaciones reales | fase 4 |

Las pruebas prueban lógica y contratos visibles; no se escriben tests que repitan constantes. Durante un cambio se ejecutan las pruebas afectadas; la suite completa se reserva para cierre de hito y cambios transversales.

## 4. Accesibilidad: objetivo y afirmaciones permitidas

Objetivo WCAG 2.2 AA en los ejemplos evaluados: contraste de texto 4.5:1, componentes y foco 3:1, foco visible no oculto (2.4.11), tamaño de objetivo ≥ 24×24 (2.5.8) salvo excepciones documentadas, nombres accesibles, navegación por teclado completa. La revisión manual de teclado acompaña a axe. Lector de pantalla: lista pendiente con NVDA/VoiceOver si no se puede ejecutar en el entorno; se registra como «no verificado». Afirmación permitida: «los ejemplos evaluados no presentan hallazgos serios en axe y superan la revisión manual de teclado». Prohibido: «100 % accesible», «certificado WCAG».

## 5. Gates por fase

| Fase | Gate mínimo para cerrar |
|---|---|
| 1 | `npm ci` limpio; build reproducible; tokens generados; contratos CSS; SSR import; dialog: teclado, foco, idempotencia; pack-smoke con consumidor externo; tamaños medidos y registrados |
| 2 | gates de 1 + navegador y axe por familia; utilidades = matriz; recetas sin overflow en la lista de viewports |
| 3 | gates de 2 + enlaces, snippets = fixtures, sin errores de consola, búsqueda y menú móvil probados, tema y copia accesibles |
| 4 | suite completa en tres motores; Lighthouse registrado; licencias y atribuciones; nombres npm comprobados; notas alpha con limitaciones |

## 6. Compromisos de honestidad en docs

Ninguna cifra de peso, puntuación o compatibilidad aparece en la web sin su método, versión y commit. Sin comparativas frente a otros frameworks en v0.1. Formularios demo indican que no envían datos. Datos de paneles marcados como ficticios.

## 7. Resultados registrados (fase 4, 2026-09-13)

| Evidencia | Dónde |
|---|---|
| Lighthouse 13.4.1, 4 rutas × móvil/escritorio, entorno de laboratorio y remedición tras correcciones | `LIGHTHOUSE.md` |
| Revisión de teclado y semántica en Chromium y Firefox, forced-colors, lista de lector de pantalla **no ejecutada** | `A11Y_REVIEW.md` |
| Regresiones visuales selectivas (17 líneas base Chromium, light y dark) | `tests/browser/visual.spec.js` y `tests/browser/__snapshots__/` |
| Tamaños por artefacto con método | `npm run sizes` → `packages/ivolt/dist/SIZES.md` |
| Tarball en consumidor externo + starter servido fuera del monorepo | `npm run pack-smoke` |
| Terceros y atribuciones | `THIRD_PARTY.md` |
| Pasos de publicación (no ejecutados) | `RELEASE.md` |

Correcciones derivadas de estas revisiones: `aria-live` en la región de toast y retorno de foco al descartar; foco tras cerrar el dropdown con Tab; pestaña activa visible en `forced-colors`; foco inicial explícito en la fixture de diálogo; CLS de la receta admin (columna reservada con colocación explícita); favicon en recetas y starter; nombres accesibles del enlace de marca y del botón de menú.
