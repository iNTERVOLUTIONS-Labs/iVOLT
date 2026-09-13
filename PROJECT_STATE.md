# iVOLT — Estado del proyecto

Última actualización: 2026-09-13 · Fase actual: **1 (corte vertical) cerrada** · Siguiente disparador: `IMPLEMENT_PHASE_2`

## Estado por fase

| Fase | Estado | Evidencia |
|---|---|---|
| 0 Blueprint | hecha | `docs/`, lámina `docs/design/brand-board.html` |
| 1 Corte vertical | hecha | build reproducible, 58 pruebas unitarias/contrato, 39 pruebas de navegador × 3 motores, pack-smoke, tamaños, docs y starter (ver abajo) |
| 2 Alcance v0.1 | prevista | `docs/ROADMAP.md` |
| 3–4 | previstas | — |

## Implementado en fase 1

- Monorepo npm workspaces con un lockfile; cadena esbuild + lightningcss + scripts Node; tipos por `tsc` desde JSDoc (TypeScript 5.9.3, no 7.x: ver «Decisiones»).
- `packages/ivolt`: `tokens/tokens.json` → `tokens.css`, `custom-media.css`, `core/breakpoints.js`, `dist/tokens/tokens.json` (115 tokens); `reset.css`, `base.css` (acotado a `.iv-root`), `layout/{container,stack,cluster,grid}.css`, `components/{button,card,form,dialog}.css`, `utilities.css` generado (234 base + 148 responsive); entradas `core.css`, `ivolt.css`, `ivolt.flat.css`, `reset.layer.css`; JS `core/*`, `components/dialog.js`, `theme.js`, `index.js`, `auto.js`, IIFE `IVOLT`; `exports` reales; 13 fixtures en `packages/ivolt/fixtures`.
- `apps/docs` (Astro 7): home con demo viva, getting started, tokens y temas, layout, button, card, form, dialog, 404; conmutador de tema persistente, copia con feedback accesible y fallback de selección, menú móvil sobre el propio Dialog.
- `examples/plain-html` + `scripts/sync-examples.mjs` (copia `dist/`), `scripts/check-examples.mjs`.
- `scripts/pack-smoke.mjs`: `npm pack` → consumidor externo en tmp → import SSR, `exports`, resolución de CSS, tree-shaking (theme-only 926 B sin Dialog; dialog-only sin theme; import sin uso 0 B), global IIFE.

## Verificaciones ejecutadas (cierre de fase 1)

| Check | Resultado |
|---|---|
| `npm run build` | ok (tokens, utilidades, CSS, JS, tipos) |
| `npm test` (Vitest: unitarias + contratos CSS) | 58/58 |
| `IVOLT_ALL_BROWSERS=1 npx playwright test` (Chromium, Firefox, WebKit) | 117/117: dialog (teclado, Esc, retorno de foco, backdrop, form, cancelación, idempotencia, destroy, fallback `:target`), temas anidados × preferencia del SO, overflow a 320/390/768/1024/1366/1920, RTL, axe sin hallazgos critical/serious en 10 fixtures × 2 temas + diálogo abierto, docs (consola limpia, enlaces, tema, copia, menú móvil) |
| `npm run sizes` (gzip nivel 9, commit de cierre) | core.min.css 2.34 KiB / 8; ivolt.min.css 7.26 KiB / 30; ivolt.flat.min.css 7.20 KiB / 30; JS agrupado 3.38 KiB / 18; IIFE 3.62 KiB / 18 |
| `npm run pack-smoke` | ok (54 archivos en el tarball, sin `src/` ni `fixtures/`) |
| `npm run build:docs`, `check-examples` | ok |
| Revisión visual | capturas de home (1366×610 dark, 1366×900 light), página dialog a 390 px y starter |
| Gasto/tokens | no disponible en el entorno |

## No verificado / pendiente

- Lector de pantalla (NVDA/VoiceOver): sin ejecutar.
- Lighthouse: fase 4.
- Dispositivos físicos: solo motores Playwright.
- Asset pendiente: logo oficial `ivolt-logo.svg` (wordmark temporal en docs y lámina).
- Propiedad del scope npm `@intervolutions`: fase 4.
- WebKit en este entorno necesitó `playwright install-deps webkit` (paquetes del sistema instalados con sudo en la VM de desarrollo).

## Fallos abiertos

Ninguno. Incidencias resueltas en fase 1: overflow por `box-sizing` sin reset (ADR-024), contraste en ámbitos de tema anidados (ADR-025), rutas de fixtures en el prerender de Astro, llaves en bloques de código `.astro`.

## Siguiente acción

`IMPLEMENT_PHASE_2` según `docs/ROADMAP.md`: badges, alerts, tables, breadcrumbs, pagination, progress, skeleton (CSS); disclosure, tabs, drawer, dropdown, toast (JS, contrato §5.2b y §6, ADR-020/021); tres recetas; docs y pruebas por familia; añadir cada componente a `exports`, entradas CSS/JS y `components` de `index.js` (integrador).

## Decisiones que no deben perderse

- TypeScript fijado en 5.9.3 para emitir `.d.ts` desde JSDoc; 7.x no se probó en fase 1 (ADR-010: verificar solo si hace falta).
- Fixtures viven en `packages/ivolt/fixtures/<familia>/<nombre>.html`; docs, pruebas (`/fixture/<familia>/<nombre>` en `scripts/serve.mjs`) y starters las consumen.
- Utilidades con selector doblado (ADR-019); única excepción de especificidad `.iv-dialog:target:not([open])` (ADR-023).
- `[data-iv-theme]` reaplica `color` y `background-color` (ADR-025); `box-sizing` acotado en `base.css` (ADR-024).
- `data-iv-close` acepta id; razones de cierre `trigger|escape|backdrop|form|api|external`.
- Subagentes: `model: "opus"`; la autodeclaración del modelo no es fiable (WORKFLOW §7).
- El CSS de `apps/docs/src/styles/docs.css` solo maqueta la web; los componentes vienen del paquete.
