# iVOLT — Estado del proyecto

Última actualización: 2026-09-13 · Fase actual: **2 (alcance completo v0.1) cerrada** · Siguiente disparador: `IMPLEMENT_PHASE_3`

## Estado por fase

| Fase | Estado | Evidencia |
|---|---|---|
| 0 Blueprint | hecha | `docs/`, lámina `docs/design/brand-board.html` |
| 1 Corte vertical | hecha | commit `558ddeb`, merge `29a3d35` |
| 2 Alcance v0.1 | hecha | 138 pruebas unitarias/contrato, 237 de navegador × 3 motores (ver abajo), pack-smoke, tamaños, docs de 16 componentes, tres recetas |
| 3 Web y DX | prevista | `docs/ROADMAP.md` |
| 4 Release candidate | prevista | — |

## Implementado en fase 2

- CSS sin JS: badge, alert, table (wrap + `--stack`), breadcrumb, pagination, progress, skeleton; tokens nuevos `--iv-color-primary-subtle`, `--iv-border-width-strong`.
- Interactivos: disclosure/accordion (`exclusive`, `closeOnOutside`), tabs (promoción ARIA y restauración exacta en `destroy`), dropdown (menu button sobre `<details>`), drawer (un `<dialog>`, estático desde `lg`, razón `viewport`), toast (API `show()`, cola, pausa, Esc, `danger` sin autocierre, `role="region"` añadido si falta). Todos en `exports`, `index.js` (`components` = 6) e IIFE.
- Fixtures: 27 en `packages/ivolt/fixtures`. Docs: 16 páginas de componentes, `/examples`, demo viva de toast.
- Recetas en `examples/recipes/{landing,catalog,admin}` con `catalog.js` (filtros y orden reales) y `admin.js` (drawer, toasts, confirmación); `scripts/sync-examples.mjs` las espeja en `apps/docs/public/examples`; `check-examples` cubre 4 páginas.
- Pruebas nuevas: `tests/browser/phase2.spec.js`, `recipes.spec.js`, listas de axe/overflow ampliadas a 24 fixtures.

## Verificaciones ejecutadas (cierre de fase 2)

| Check | Resultado |
|---|---|
| `npm run build` | ok |
| `npm test` (Vitest) | 138/138 |
| `IVOLT_ALL_BROWSERS=1 npx playwright test` | 237/237 en Chromium, Firefox y WebKit (componentes, axe en 24 fixtures × 2 temas + diálogo abierto, overflow 320–1920, RTL, temas, docs, recetas a 390 y 1366) |
| `npm run sizes` | core.min.css 2.36 KiB / 8; ivolt.min.css 10.10 KiB / 30; flat 10.04 / 30; JS agrupado 7.65 KiB / 18; IIFE 7.90 / 18 |
| `npm run pack-smoke` | ok (76 archivos; tree-shaking verificado) |
| `npm run build:docs`, `sync-examples`, `check-examples` | ok |
| Gasto/tokens | no disponible en el entorno |

## No verificado / pendiente

- Lector de pantalla (NVDA/VoiceOver): sin ejecutar. Lighthouse: fase 4.
- Búsqueda local, playground, changelog, contributing, descarga de recetas empaquetada: fase 3.
- Logo oficial pendiente (wordmark temporal). Propiedad del scope npm: fase 4.
- El `iv:change` de acordeón mencionado en §5.3 no se implementó (§8.2 manda: solo `open/close`); aclarar en fase 3 si se necesita.

## Fallos abiertos

Ninguno. Resueltos en fase 2: `aria-label` sin rol en la región de toast (axe serious), fixture de acordeón con primer item abierto vs prueba, especificidad del fallback `:target` del drawer (ADR-023 ampliado).

## Siguiente acción

`IMPLEMENT_PHASE_3`: completar la web (búsqueda local con Pagefind, playground acotado, changelog, contributing, roadmap público, i18n-ready), navegación y 404, descarga de starters/recetas, verificación de snippets contra distribución, sustituir el wordmark cuando exista el logo. La lámina de `docs/design` queda como histórico.

## Decisiones que no deben perderse

- Ver fase 1 (commit `558ddeb`) y ADR-019 a ADR-026; en fase 2: región de toast con `role="region"`; `external` cubre clic fuera/Tab en dropdown y hermanos de acordeón; `iv-tabs--vertical` la escribe el autor; recetas con un `<style>` ≤ 40 líneas de maquetación propia y sin reestilizar componentes.
- Subagentes fase 2: cuatro encargos Opus (CSS, disclosure/tabs/dropdown, drawer/toast, recetas), dos simultáneos como máximo; todos entregaron completos dentro de 20 turnos.
