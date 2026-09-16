# iVOLT — Estado del proyecto

Última actualización: 2026-09-16 · **`1.0.0-rc.3` publicada bajo `next`** (ronda adversaria visual, ADR-050; gate en tres motores exit 0; Lighthouse 96–100; `docs/RELEASE.md` §0i) · rc.2 «Cobalt» (ADR-049) y rc.1 (megamenú v2, ronda 3) también bajo `next` · `0.7.0-beta.0` en `latest`/`beta` desde 2026-09-14 · nada desplegado

## Estado por fase e hito

| Fase / hito | Estado | Evidencia |
|---|---|---|
| 0–4 (v0.1.0-alpha.0) | hechas, no publicada | `docs/RELEASE.md` §1–§4 |
| Betas 0.2 a 0.5 (`ROADMAP.md` §5–§7) y ronda visual (§8) | cerradas, no publicadas | combobox, data table, carrusel, selector, formularios, superficies, megamenú, efectos, hero, datepicker, tooltip, popover, paleta, constructor de temas, rediseño de la web |
| v0.6 «Structure» (§9, ADR-041) | cerrado, no publicado | tokens con nombre, navbar, stepper, toast declarativo, timeline/stat/avatar; 94 páginas en dos idiomas; gate en tres motores |
| v0.7 «Media & motion» (§10, ADR-042) | cerrado y publicado (`npm install @intervolutions/ivolt@beta`) |
| v0.8 «Hardening» (§11, ADR-044/045) | cerrado, sin publicar |
| v0.9 «Complete» (§11, ADR-046) | cerrado, sin publicar |
| **`1.0.0-rc.0`** (§11) | **publicada** (`npm install @intervolutions/ivolt@next`): gate exit 0 (1008 unitarias, 1580 navegador × 3 motores, pack-smoke 134 archivos, 108 páginas), Lighthouse 97/100 home y 98/100 receta, 30 capturas finales en tres anchos y dos temas | contrato congelado (`API_CONTRACT.md` cabecera), `STABILITY.md`, changelog consolidado 0.1 → 1.0, avisos «release candidate» en la web | `verify` exit 0 en la segunda pasada (la primera dejó una prueba de la marquesina en WebKit que apuntaba el puntero a la pista en movimiento; ahora apunta a la ventana): 1008 unitarias · 1580 pruebas de navegador y 139 omitidas en tres motores · pack-smoke (`0.9.0-beta.0.tgz`, 134 archivos) · 108 páginas · 5 ejemplos | lightbox, movimiento por scroll con reserva JS, efectos de texto, contador, receta «showcase»; 102 páginas en dos idiomas; gate completo en tres motores |

## Ronda adversaria visual → `1.0.0-rc.3` (2026-09-16, ADR-050)

Petición del propietario: «lanza agentes adversos para que te ayuden a mejorar el estilo visual del framework». Antes de la ronda, dos incidencias del propietario resueltas: esquinas rectas del pie de tarjeta bajo efectos de borde (radios propios del medio y del pie) y anillos serrados en Chromium con GPU en Windows (sombras con extensión y desenfoque 0 sustituidas por bordes reales o desenfoque mínimo).

| Bloque | Verificación |
|---|---|
| Revisor A (paquete, solo lectura): 212 capturas en dos temas y dos anchos; 20 hallazgos, causa raíz compartida: filete oscuro invisible (1,34:1) | informe con capturas en el directorio temporal del trabajo |
| Revisor B (web y recetas): 14 rutas y cuatro recetas; 20 hallazgos, dos graves confirmados en el código (secundario de la banda «Start» a 1,11:1; carrito de `store` como bloque estático) | ídem |
| Integrador: tokens (borde oscuro `neutral.700`, velo `.78`, degradados claros cobalto → índigo, halo de foco), ADR-050, enmiendas del contrato, changelog, aplazamientos a 1.1 | contratos 228/228 |
| Implementador P (paquete, 16 tareas): fantasma con filete, peligro `red.600`, paginación píldora, alerta sin muescas y tintes al 9 %, migas, canto y aviso del cajón, pestañas, cifras tabulares, insignia neutra, carril del progreso, campos, avatares, malla, tracking, navbar de cristal, raíles | 1039 unitarias; 574 pruebas de navegador en Chromium; 15 líneas base regeneradas y revisadas; contrastes medidos (`A11Y_REVIEW.md` §17) |
| Implementador W (web y recetas, 17 tareas): banda invertida como mapa completo, carrito, velo de `studio`, mampostería de `journal`, cabecera sobre el velo del megamenú, arte lineal del panel, ritmo tokenizado, tema claro con arte propio, referencia con afordancia y raíl, numerales, CTA móviles, barra del escenario, «Tools», consola, red de seguridad del reveal, cajón móvil con tema e idioma, `body{margin:0}` en las recetas | 38 pruebas de sitio y recetas; Lighthouse móvil `/` 97–98 |

Ver `docs/RELEASE.md` §0i para el gate y la publicación.

## Rediseño Cobalt → `1.0.0-rc.2` (2026-09-16, ADR-049)

Petición del propietario: «no me gusta nada los verdes […] usa los colores de intervolutions.com y copia las tipografías y elementos de la web; que el framework sea capaz de construir intervolutions.com, brokenufo.com y clasicosbasicos.org». Referencia extraída con capturas y CSS de intervolutions.com (fuera del repositorio).

| Bloque | Verificación |
|---|---|
| Integrador: `tokens.json` reescrito (neutral azul marino, cobalt, cyan, indigo, green solo éxito, red coral, amber; degradados `brand`/`primary`; radios 6/14/22; Outfit primero), `DESIGN_SYSTEM.md` §2–§3 con contraste WCAG medido, ADR-049, contrato §5.2 enmendado, hero con acento `cyan.400` en ambos temas | 162 tokens emitidos; todos los pares de texto ≥ 4,5 y bordes ≥ 3 en claro y oscuro (tres ajustes tras medir); `reference.test.js` 228/228 |
| Implementador A (paquete): botón píldora con degradado de marca y halo, secundario y fantasma teñidos, tarjetas translúcidas con trazo fino y brillo, campos de 14 px, `kbd` cian, regla degradada, texto degradado; 219 literales verdes retirados del CSS y del arte SVG de las fixtures; insignias mezcladas hacia el texto para AA | axe 165/165 en Chromium; 71 líneas base regeneradas (23 + 1 modificadas); specs × 3 motores en el gate |
| Implementador B (web y recetas): Outfit servida en local con pesos 700/800 (Space Grotesk retirada), tokens de la web en cobalto y cian en ambos temas, portada con orbes estáticos, píldora, titular degradado con punto coral y banda de cierre degradada, OG y favicon sobre placa azul marino, lámina de marca, tablas de contraste reescritas con cifras reales, isotipo de `console` recoloreado; 277 literales verdes retirados | `site-*`, `theme`, `theme-builder`, `recipes` 39/39 en Chromium; 40 capturas en dos anchos y dos temas comparadas con la referencia; dos correcciones por la comparación (punto coral, rótulo del segundo botón del hero a `--iv-color-text` por 4,15 sobre el orbe) |
| Integrador: Outfit en las cuatro recetas (`sync-examples` copia la fuente a `ivolt/fonts/`), hero, dos pruebas con supuestos de la paleta anterior corregidas (radio de 22 px del selector; precisión de `color(srgb)` en WebKit) | `IVOLT_ALL_BROWSERS=1 npm run verify`: build · 1037 unitarias · 1540 superadas + 147 omitidas, cinco fallos de prueba diagnosticados y repetidos en verde (60/60) · tamaños (`core` 3,03, `ivolt.min.css` 31,8, JS 45,0 KiB gzip, todos dentro) · pack-smoke 134 archivos · 205 páginas · 5 ejemplos; Lighthouse móvil 98–100, escritorio 99–100 (`LIGHTHOUSE.md`) |

Sin rejillas ni patrones de puntos (ADR-028) aunque la referencia los use. Pendiente de decisión del propietario: aceptación visual de Cobalt; reemitir el arte oficial de `assets/brand/` en cobalto (hoy remapeado en `brand.js` y `build-og.mjs`); tokens candidatos `--iv-surface-stroke`, `--iv-shadow-halo` y una clase `iv-eyebrow` (`ROADMAP.md` §11).

## Petición del propietario que abrió estos ciclos (2026-09-14)

«Sigue trabajando hasta 0.7.» Método en ambos ciclos: contratos escritos y congelados antes de implementar (§8.15–§8.23), dos implementadores Opus con archivos disjuntos y capturas propias, un tercero para la web, el líder integra, registra las enmiendas de implementación en el contrato y pasa el gate. Ninguna afirmación visual sin captura (ADR-039).

## Ronda 3: web y ejemplos desde cero (2026-09-15, ADR-047/049)

| Bloque | Verificación |
|---|---|
| Cuatro recetas a medida (`studio`, `console`, `journal`, `store`) con fotografías acreditadas y una prueba de interacción por receta | `recipes.spec.js` 8/8; Lighthouse móvil 99–100 |
| Sistema nuevo de la web: 92 páginas de escenario (una por fixture) con controles reales (tema, dirección, ancho, movimiento reducido, hoja plana), `Section`, `Code` plegable, `DeviceFrame`, portada con showreel y marcos de dispositivo, referencia, localización, estabilidad, changelog generado | 108 páginas en dos idiomas migradas; `site-*.spec.js` 37/37 en Chromium; `reference.test.js` en verde |
| Revisión adversaria visual + revisor externo de la web: escenarios que cargan antes de entrar en vista y encogen, «Ver todo», tema por apretón de manos, cabecera opaca, arte sin patrones, versión derivada del paquete en el build, escenarios con el IIFE (168 → 28 peticiones) | capturas en tres anchos, dos temas y dos idiomas; Lighthouse móvil `/` 100, `/components/button` 99 |
| Megamenú v2 (otra sesión, ADR-048) integrado en cabecera, página y receta `console` | contratos 228/228; `megamenu.spec.js` 36/36 × 3 motores |
| Incidencia de proceso: dos sesiones escribiendo a la vez sobre `apps/docs` tras un reinicio; resuelta cediendo la integración y con avisos previos a `dist` y al gate | `docs/WORKFLOW.md` regla de `--output` por agente; ADR-049 |

Gate de cierre de la ronda (2026-09-16): build · 1037 unitarias · 1545 pruebas de navegador superadas y 147 omitidas en Chromium, Firefox y WebKit (con tres workers: la máquina compartida a carga 25 hacía fallar una prueba distinta por tiempos en cada pasada; cuatro carreras de prueba corregidas por el camino) · tamaños · pack-smoke (`intervolutions-ivolt-1.0.0-rc.1.tgz`, 134 archivos) · 201 páginas (108 de contenido en dos idiomas + 92 escenarios + 404) · 5 ejemplos. Publicación de `1.0.0-rc.1` bajo `next` a cargo de la otra sesión tras este gate.

## Entregas de v0.9

| Bloque | Verificación |
|---|---|
| Framework (implementador A): relevo por tarjeta en la baraja (medido tarjeta a tarjeta en Chromium), etiqueta hermana del selector sin `:has()` de compensación, 12 títulos y 9 componentes-enlace igualados en la hoja plana (`?flat=1` en el servidor de fixtures), seis cadenas convertidas en opciones con `Intl` | 1008 unitarias; `qa-flat.spec.js` 28 comparaciones; specs de motion/picker/form/carousel/toast/lightbox × 3 motores (302); líneas base sin cambio |
| Web (implementador B): `/reference` generada (762 clases, 128 tokens, 24 componentes, 130 atributos) con filtro en página y `tests/contracts/reference.test.js` (71 clases sin documentar corregidas en 36 páginas; única excepción justificada: utilidades generadas), `/foundations/localisation` y `/foundations/stability` en dos idiomas; 108 páginas | contratos 222/222; `qa-docs-v09.spec.js` 7/7 |
| Integrador: contratos §8.21/§8.6/§5.2b, ADR-046, `STABILITY.md`, generador de referencia | `verify`; Lighthouse: home móvil 97 / escritorio 100, receta showcase 99 / 100 |

## Entregas de v0.8 (camino a 1.0)

| Bloque | Verificación |
|---|---|
| Revisión adversaria JS (revisor A): `core/style.js` repone el `style` servido; foco inicial correcto con campos ocultos y `fieldset[disabled]`; enfocables nuevos (`summary`, `iframe`, `contenteditable`, medios); enlaces con disparador vacío conservan la navegación; booleanos sin valor; `Drawer` y `Dialog` limpios; SSR de 32 módulos y de `dist` | `hardening.test.js` (261 casos sobre 87 fixtures), `hardening-runtime.test.js`, `ssr.test.js`; 982 unitarias; specs de diálogo/drawer/popover/paleta × 3 motores |
| Revisión adversaria CSS (revisor B): RTL (carrusel, drawer, marquesina, megamenú, popover, `range`, brillo, exploración), colores forzados (progreso, combobox, paleta, cristal), impresión, 320 px; `?dir=rtl` en el servidor de fixtures | `qa-rtl.spec.js`, `qa-forced-colors.spec.js`, `qa-print.spec.js` × 3 motores; 67 líneas base sin cambio |
| Integrador: módulos raíz emitidos sueltos, `npm run sizes` por módulo (ADR-044), portada de la receta en 800 px para móvil, `STABILITY.md` (borrador para 1.0), generador de la referencia (`scripts/build-reference.mjs`), convención `:where([dir="rtl"])`, regla de `--output` por agente | `verify`; Lighthouse |

Presupuestos (`npm run sizes`): `ivolt.min.css` 28,6 KiB (≤ 40), JS agrupado 43,0 KiB (≤ 48; techo confirmado en ADR-044).

## Verificaciones ejecutadas en v0.8

| Check | Resultado |
|---|---|
| `IVOLT_ALL_BROWSERS=1 npm run verify` | exit 0 en la segunda pasada (la primera dejó una aserción de fotogramas del contador que dependía de la carga en WebKit; la prueba exige ahora fotogramas intermedios, no una cantidad): build · 982 unitarias · 1464 pruebas de navegador superadas y 138 omitidas (visuales fuera de Chromium y el pseudoelemento del progreso fuera de Chromium) en tres motores · tamaños · pack-smoke (`intervolutions-ivolt-0.8.0-beta.0.tgz`, 134 archivos) · docs (102 páginas) · ejemplos (5) |
| Lighthouse | `/` y `/es`: móvil 97, escritorio 100; receta showcase móvil 98 (antes 87; LCP 2,4 s con la portada de 800 px), escritorio 99 (`docs/LIGHTHOUSE.md`) |

## Entregas de v0.7

| Bloque | Contrato | Tamaño gzip | Verificación |
|---|---|---|---|
| Lightbox (galería + visor sobre `Dialog`) | §8.20 | 2,2 CSS + 2,8 JS | `lightbox.spec.js` × 3 motores (apertura, teclado, gesto, zoom, foco de vuelta, sin JS), axe con visor abierto y con zoom |
| Countup | §8.22 | 1,6 JS | `countup.spec.js` × 3 motores (cuenta al entrar, `Intl` por `lang`, prefijo/sufijo, reduced motion sin cambio) |
| Movimiento por scroll (`motion.css` + `ScrollMotion`) | §8.21 | 1,2 CSS + ≈1 JS | `motion.spec.js` × 3 motores: parallax nativo (Chromium, WebKit) y por reserva (Firefox), barra de lectura (también bajo reduced motion: decisión del líder), marquesina, baraja |
| Texto (`text.css`) | §8.22 | 0,9 CSS | `text.spec.js` × 3 motores: revelado con `Reveal`, visible sin JS y con reduced motion; axe en claro y oscuro |
| Web y receta «showcase» (implementador de docs) | §8.23 | — | 8 páginas nuevas (lightbox, countup, movimiento por scroll, efectos de texto en inglés y español), fixture de galería con fotografías reales solo en la web, `Fixture.astro` con puerto de scroll enfocable (hallazgo axe corregido), receta `examples/recipes/showcase` (navbar transparente sobre hero cinematográfico con parallax, marquesina, cifras con `Countup`, galería con visor, tarjetas apiladas, stepper de contacto, línea de tiempo del roadmap, barra de lectura) listada en los ejemplos y empaquetada; `qa-docs-v07.spec.js` y `recipes.spec.js` con la receta; corrección del líder tras Lighthouse: plegado del navbar sin salto de maqueta (marca temprana `data-iv-js`, ADR-042) |

Presupuestos (`npm run sizes` @ f6d17ad): `core.min.css` 2,60 KiB (≤ 8), `ivolt.min.css` 28,13 KiB (≤ 40), JS agrupado 42,79 KiB (≤ 48: quedan 5 KiB; ver `QUALITY.md` §1).

## Verificaciones ejecutadas en v0.7

| Check | Resultado |
|---|---|
| `npm test` | 694/694 (30 archivos) |
| Specs nuevos en tres motores | 204/204 (`motion`, `text`, `lightbox`, `countup`) tras la decisión sobre la barra de lectura |
| axe (Chromium, todas las fixtures) | 163/163 con 13 fixtures nuevas |
| Líneas base visuales | 67 en Chromium: 10 nuevas (texto, marquesina, galería) |
| `IVOLT_ALL_BROWSERS=1 npm run verify` | exit 0 en la tercera pasada: build · 703 unitarias · 1384 pruebas de navegador superadas y 134 omitidas (visuales fuera de Chromium) en Chromium, Firefox y WebKit · tamaños · pack-smoke (`intervolutions-ivolt-0.7.0-beta.0.tgz`, 128 archivos, theme-only 926 B, dialog-only 6482 B, unused 0 B, starter servido) · docs (102 páginas, 2 idiomas) · ejemplos (5 páginas). Pasadas previas: dos hallazgos axe en la receta showcase a 390 px que eran la animación de entrada a medio fundido (la suite de recetas audita ahora el estado asentado bajo reduced motion, como el resto), y un `wheel` de WebKit que no volvía arriba en la prueba del navbar pegajoso (la prueba fija ahora la posición) |
| Lighthouse 13.4.1 (`docs/LIGHTHOUSE.md`) | `/` y `/es`: móvil 97/100/100/100 (LCP 2,4 s, CLS 0), escritorio 100/100/100/100; receta showcase: móvil 87 (LCP 4,1 s por la foto de portada, CLS 0 tras la marca temprana; la primera pasada dio 69 con CLS 0,38), escritorio 99 |
| Gasto/tokens | no disponible en el entorno |

## No verificado / limitaciones declaradas

- Lector de pantalla real: sin ejecutar (`A11Y_REVIEW.md` §12–§13).
- Gestos táctiles reales (arrastre con zoom, panel del navbar), parallax con trackpad de alta frecuencia: solo simulados.
- `iv-stack-cards` retrocede como baraja completa al salir, no tarjeta a tarjeta (ADR-042, candidato).
- Aceptación visual del propietario de v0.6, v0.7 y del rediseño Cobalt: pendiente (capturas en el directorio temporal del trabajo, `cobalt-a/`, `cobalt-b/`).
- Publicado en npm con autorización del propietario (`docs/RELEASE.md` §0d); el despliegue de la web sigue requiriendo autorización explícita (§3).

## Fallos abiertos

Ninguno conocido de severidad alta. Sin resolver desde v0.5: `.iv-dialog__title` pierde contra `.iv-root h2` en la hoja plana. Pendiente de decisión: cristal condensado del navbar (`--iv-blur-sm` vs `md` en oscuro).

## Siguiente acción

Aceptación visual del propietario sobre la web construida tras la ronda (`npm run build:docs` y preview) y decisión sobre los aplazados a 1.1 (`ROADMAP.md`: leyenda del datatable, aviso de `data-iv-*` desconocidos, cifras en mono, token de filete, theming de los degradados). Después, solo correcciones hasta `1.0.0` (`latest`).

## Decisiones que no deben perderse

- ADR-041 y ADR-042 (ver `docs/DECISIONS.md`): estado frente a adorno bajo reduced motion (`hideOnScroll`, barra de lectura); `overflow: clip` en marcos de parallax; `:where()` no envuelve estados enteros; la captura de puntero reetiqueta el `click`; `iv:closed` y estados de scroll llegan una tarea después: sondear.
- Lecciones de proceso vigentes: mirar con capturas antes de afirmar; gate sobre códigos de salida; `HEAD == origin/main` tras cada push; recetas solo con `index.html`.
- Fotografías: activos de la web y de la receta showcase (copias acreditadas); nunca dentro del paquete npm.
