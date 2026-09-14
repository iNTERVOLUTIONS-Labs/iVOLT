# iVOLT — Estado del proyecto

Última actualización: 2026-09-14 · Ciclos: **v0.4 «Navigation & light» y v0.5 «Time & help» cerrados** → hito `0.5.0-beta.0` alcanzado · **Nada publicado ni desplegado**

## Estado por fase e hito

| Fase / hito | Estado | Evidencia |
|---|---|---|
| 0–4 (v0.1.0-alpha.0) | hechas, no publicada | `docs/RELEASE.md` §1–§4 |
| Beta v0.2.0-beta.0 (`ROADMAP.md` §5) | cerrada, no publicada | combobox, data table, rediseño ronda 2, español |
| Beta v0.3.0-beta.0 «Spectacular» (§6, ADR-030) | cerrada, no publicada | carrusel, selector, formularios, superficies |
| **v0.4 «Navigation & light»** (§7, ADR-033) | cerrado | revisión adversaria (17 fallos, ADR-034/035), megamenú (también en la cabecera de la web), efectos y `Proximity`/`Reveal`, hero |
| **v0.5 «Time & help»** (§7) | cerrado, no publicado | datepicker, tooltip y popover, paleta de comandos (ADR-038), constructor de temas; gate completo en tres motores |

## Petición del propietario que abrió estos ciclos (2026-09-14)

«Hay muchos errores todavía» (toasts que saltaban al pasar el puntero, selects sin enriquecer, popover del selector cortado) → corregidos (ADR-032) y dos revisores adversarios Opus que encontraron y arreglaron 17 más (ADR-034/035). «Aprende de brokenufo.com y clasicosbasicos.org» → estudiadas sus hojas y scripts (ADR-033), adoptados los patrones sin sus dependencias. «Megamenús, borde con destello, borde que se ilumina al acercar el ratón, heros súper espectaculares, sigue hasta 0.5» → §8.9–§8.14 implementados.

## Entregas del ciclo (todas por implementadores Opus 5 con contrato congelado, integradas y probadas por el líder)

| Bloque | Contrato | Tamaño gzip | Verificación |
|---|---|---|---|
| Megamenu | §8.9 | 2,9 KiB JS + 1,0 CSS | 3 pruebas × 3 motores, axe con panel abierto, línea base; hover intencional exige movimiento real (corrección tras la prueba de la web) |
| Effects + Proximity + Reveal | §8.10 | 1,2 CSS + 1,2 + 1,0 JS | 3 pruebas × 3 motores, axe 3 fixtures; `--i` renombrado a `--iv-i` (contrato de prefijos), regla sin JS en `:where()` |
| Hero | §8.11 | 1,4 CSS | 4 fixtures × 3 motores, axe; fixtures con `h2` (el `h1` es de la página) |
| Datepicker | §8.12 + ADR-036 | 5,0 JS + 1,3 CSS | 3 pruebas × 3 motores, axe (con `aria-selected` movido a la celda), foco de vuelta tras seleccionar (corrección del líder) |
| Tooltip + Popover | §8.13 | 1,8 + 2,0 JS, 0,5 + 0,8 CSS | 4 pruebas × 3 motores, axe; `iv:opened`/`iv:closed` siguen al `toggle` nativo, que el navegador fusiona (documentado) |
| Command palette | §8.14 + ADR-038 | 4,9 JS + 1,5 CSS | 3 pruebas × 3 motores, axe; corrección de framework derivada: `.iv-button[hidden]` (la capa de componentes ganaba a la regla base) |
| Web | — | — | cabecera con megamenú de componentes, marcos de la home con proximidad, constructor de temas (`/foundations/theme-builder`, dos idiomas), páginas nuevas en inglés y español, `dev:docs` sincroniza ejemplos |

Presupuestos: CSS 40 KiB (21,0 medidos); JS agrupado 48 KiB desde ADR-037 (35,4 medidos); coste por módulo en `QUALITY.md` §1.

## Verificaciones ejecutadas en el ciclo

| Check | Resultado |
|---|---|
| `npm test` | 590/590 (25 archivos) |
| `npx tsc` | sin errores |
| Navegador por bloque | cada bloque en Chromium, Firefox y WebKit con axe (ver tabla); `docs.spec.js` 9/9 y `qa-docs-shell.spec.js` tras el megamenú de la cabecera |
| Lighthouse 13.4.1 (`docs/LIGHTHOUSE.md`) | `/` y `/es`: móvil 99/100/100/100 (LCP 1,85–1,99 s, CLS 0), escritorio 100/100/100/100 |
| `IVOLT_ALL_BROWSERS=1 npm run verify` | exit 0: build · 590 unitarias · 713 navegador superadas y 82 omitidas (visuales solo en Chromium) en Chromium, Firefox y WebKit · tamaños · pack-smoke (`intervolutions-ivolt-0.5.0-beta.0.tgz`, 112 archivos, theme-only 926 B, dialog-only 6482 B, unused 0 B, starter servido) · docs (84 páginas, 2 idiomas) · ejemplos (4 páginas). Primer intento con 12 fallos de pruebas y fixtures (axe a mitad de animaciones, fixture de exploración en claro, tiempos de WebKit, prueba del constructor), corregidos antes del segundo |
| Gasto/tokens | no disponible en el entorno |

## No verificado / limitaciones declaradas

- Lector de pantalla real: sin ejecutar (`A11Y_REVIEW.md` §6, §9–§11).
- Anclaje nativo del popover: si el navegador aplica un `position-try`, la flecha puede no seguir el lado real (aceptado).
- Gestos táctiles y punteros reales (hover intencional del megamenú, proximidad): solo simulados.
- Aceptación visual del propietario de todo lo anterior: pendiente.
- Publicación y despliegue: requieren autorización explícita (`docs/RELEASE.md` §0b y §3).

## Fallos abiertos

Ninguno conocido de severidad alta. Señalado por un implementador y sin resolver: `.iv-dialog__title` pierde contra `.iv-root h2` en la hoja plana.

## Siguiente acción

Revisión humana de los ciclos v0.3–v0.5 (`npm run build && npm run dev:docs`): rediseño de la web, capa expresiva, megamenú, efectos, hero, selector de fecha, tooltip, popover, paleta y constructor de temas. Publicación solo con autorización (`docs/RELEASE.md` §0b). Trabajo posterior: `docs/ROADMAP.md` §3 (wrappers, CLI), `.iv-dialog__title` en la hoja plana, y el lector de pantalla cuando haya una persona con AT.

## Decisiones que no deben perderse

- ADR-032 a ADR-037 (ver `docs/DECISIONS.md`). Lecciones de proceso registradas: verificar rama y remoto antes de afirmar un push; gate de commits sobre códigos de salida, nunca tras `;` ni tras un `grep`.
- Efectos: `--iv-i` es la variable de escalonado pública; `iv-edge-glint`/`iv-edge-near`/`iv-scan` declaran `position: relative`.
- Megamenú: `data-iv-open=""` como estado (los disparadores declarativos ignoran valores vacíos); hover intencional armado por `pointerenter` y disparado por `pointermove`.
