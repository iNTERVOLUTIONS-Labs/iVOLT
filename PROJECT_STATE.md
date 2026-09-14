# iVOLT — Estado del proyecto

Última actualización: 2026-09-14 · Ciclo actual: **v0.3 «Spectacular» → hito `0.3.0-beta.0`** · Estado: **beta cerrada** (gate completo en verde el 2026-09-14) · **Nada publicado ni desplegado**

## Estado por fase e hito

| Fase / hito | Estado | Evidencia |
|---|---|---|
| 0 Blueprint | hecha | `docs/` |
| 1 Corte vertical | hecha | merge `29a3d35` |
| 2 Alcance v0.1 | hecha | merge `e9bc149` |
| 3 Web y DX | hecha | merge `869d6da` |
| 4 Release candidate v0.1.0-alpha.0 | hecha, no publicada | `docs/RELEASE.md` §1–§4 |
| Beta v0.2.0-beta.0 (`ROADMAP.md` §5) | cerrada, no publicada | merge `064bbb0`: combobox, data table, rediseño ronda 2, español |
| **Beta v0.3.0-beta.0 «Spectacular»** (`ROADMAP.md` §6, ADR-030) | cerrada, no publicada | `main` desde `15eb9ab` hasta el commit de cierre; ver tabla |

## Ciclo v0.3 (2026-09-14): qué pidió el propietario y qué se hizo

Petición: «necesitamos muchos más elementos espectaculares para el css/js… slideshow súper espectacular… formularios mucho más espectaculares (tipo select2) con contador… check de errores… glassmorphism, texturas… sigue todo siendo muy genérico (el framework)». Nada de eso estaba en el roadmap (dirección sobria de fase 0); ADR-030 cambia la dirección del framework a expresiva por defecto sin tocar el contrato técnico y sube los presupuestos con registro.

| Bloque | Contrato | Implementación | Verificación |
|---|---|---|---|
| Carousel | §8.5 | Opus 5: `carousel.js` (4,5 KiB gzip), `carousel.css`, fixtures `basic/cinema/thumbs`, 24 unitarias | 4 pruebas de navegador × 3 motores, axe 3 fixtures × 2 temas × 3 motores, línea base visual; correcciones del líder: guardia `dragstart` (el arrastre nativo de imágenes cancelaba el deslizamiento), `role="presentation"` en el carril (axe `list`), solo `aria-label` en los paneles |
| Picker | §8.6 + ADR-031 | Opus 5: `picker.js` (5,8 KiB), `picker.css`, fixtures `basic/multiple`, 32 unitarias; segunda ronda para sacar los chips del botón, `--active`, `search` como cadena, `countText` | 3 pruebas × 3 motores, axe, línea base visual |
| Form + Counter + CSS de formularios | §8.7 | Opus 5: `form.js` (3,0 KiB), `counter.js` (1,4 KiB), `form.css` ampliado, fixtures `validation/counter/float/controls`, 32 unitarias | 3 pruebas × 3 motores, axe 4 fixtures, línea base `form/controls` |
| Surfaces | §8.8 | Opus 5: `surfaces.css` (1,4 KiB) tras los componentes, fixtures `glass/textures/glow`; desviaciones aceptadas: parada `info` en el texto degradado, `overflow: visible` en `iv-glow`, `@supports` con prefijo | contrato CSS (módulo añadido a la lista), axe 3 fixtures × 2 temas × 3 motores, línea base `surfaces/glass` |
| Web | — | páginas `carousel`, `picker`, `validation`, `foundations/surfaces` y ampliación de `form` en inglés y español (traducidas por el líder); navegación y `families`; gabinete de la home con carrusel, formulario flotante y cristal; selector de idioma que cae a la portada del otro idioma si falta la gemela | `docs.spec.js` 9/9 en cada paso |
| Arreglos | — | `dev:docs` sincroniza los ejemplos antes de `astro dev` (las recetas «no iban» en desarrollo) | manual |

Tokens nuevos: `glass.*`, `blur.*`, `glow.*`, `texture.grain-opacity` (127 tokens emitidos). Presupuestos: CSS 40 KiB, JS 32 KiB gzip (ADR-030); medidos 16,40 y 21,24 KiB; coste por módulo en `QUALITY.md` §1.

## Verificaciones ejecutadas en el ciclo

| Check | Resultado |
|---|---|
| `npm test` | 405/405 (18 archivos) |
| `npx tsc -p packages/ivolt/tsconfig.json` | sin errores |
| `npm run sizes` | core 2,38 / 8 · ivolt.min.css 16,40 / 40 · JS agrupado 21,24 / 32 (KiB gzip) |
| Navegador por bloque | carrusel, selector, formularios, superficies y axe en Chromium, Firefox y WebKit (ver tabla) |
| `docs.spec.js` | 9/9 tras cada integración |
| `IVOLT_ALL_BROWSERS=1 npm run verify` | exit 0: build · 405 unitarias · 425 navegador superadas y 58 omitidas (las 29 visuales solo en Chromium) en Chromium, Firefox y WebKit · tamaños · pack-smoke (`intervolutions-ivolt-0.3.0-beta.0.tgz`, 92 archivos, theme-only 926 B, dialog-only 6290 B, unused 0 B, starter servido) · docs (70 páginas, 2 idiomas) · ejemplos (4 páginas) |
| Lighthouse 13.4.1 (`docs/LIGHTHOUSE.md`) | `/` y `/es`: móvil 99/100/100/100 (LCP 1,84 s, CLS 0, TBT 0), escritorio 100/100/100/100 (LCP 0,42 s); el punto de móvil es LCP por el CSS crecido y el gabinete |
| Gasto/tokens | no disponible en el entorno |

## No verificado / limitaciones declaradas

- Lector de pantalla real: sin ejecutar (listas en `A11Y_REVIEW.md` §6, §9, §10).
- Gestos táctiles en dispositivos físicos: solo puntero simulado.
- `iv-field--float` con `<select>` usa `:has()`: mejora progresiva (Firefox < 121 muestra el texto de la opción vacía bajo la etiqueta).
- Aceptación visual del propietario del rediseño ronda 2 y de la capa expresiva: pendiente.
- Publicación npm, despliegue y `SITE_URL`: requieren autorización explícita (`docs/RELEASE.md` §0a y §3).

## Fallos abiertos

Ninguno conocido de severidad alta.

## Siguiente acción

Revisión humana de la web y del framework; si el propietario aprueba, `docs/RELEASE.md` §0a describe la publicación (no se ejecuta sin autorización). Trabajo posterior: `docs/ROADMAP.md` §3 (datepicker, constructor de temas, wrappers) y lector de pantalla cuando haya una persona con AT.

## Decisiones que no deben perderse

- ADR-030 (capa expresiva, presupuestos 40/32) y ADR-031 (picker: chips fuera del botón, `--active`, `search` como cadena; la gramática de opciones no aprende uniones).
- Carousel: `aria-pressed="true"` = rotación retenida; `isPlaying` = intención del usuario; `data-iv-state="running"` en la barra; carril `overflow: visible` con JS; sin `aria-labelledby` en los paneles.
- Web: `animation-timeline` siempre en regla aparte del atajo `animation`; comprobar `getAnimations()` antes de confiar en `CSS.supports`; el selector de idioma solo enlaza a la gemela si existe.
- Versión `0.3.0-beta.0` en `packages/ivolt/package.json`, `index.js`, lockfile y docs.
