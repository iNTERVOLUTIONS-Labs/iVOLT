# iVOLT — Estado del proyecto

Última actualización: 2026-09-13 · Fase actual: **0 (Blueprint) cerrada** · Siguiente disparador: `IMPLEMENT_PHASE_1`

## Estado por fase

| Fase | Estado | Evidencia |
|---|---|---|
| 0 Blueprint | hecha | archivos de `docs/`, la guía raíz de agentes, este archivo; capturas de la lámina revisadas a 1366×610, 1366×900, 390×844 y 320×700 |
| 1 Corte vertical | prevista | `docs/ROADMAP.md` §1 |
| 2–4 | previstas | — |

## Archivos entregados en fase 0

`docs/IVOLT_BIBLE.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, `docs/DESIGN_SYSTEM.md`, `docs/QUALITY.md`, `docs/WORKFLOW.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/SOURCES.md`, `docs/design/brand-board.html`, `docs/design/brand-board.css`, `docs/design/assets/ivolt-wordmark-temp.svg`, la guía raíz de agentes, `PROJECT_STATE.md`.

## Verificaciones ejecutadas en fase 0

- Contrastes WCAG calculados por script sobre los hex de `DESIGN_SYSTEM.md` (previsto; se remiden sobre CSS emitido en fase 1).
- Versiones npm observadas y nombres de paquete comprobados (404) — `docs/SOURCES.md`.
- Lámina renderizada con Chromium headless en cuatro viewports; el hero muestra el demo completo a 1366×610; sin overflow horizontal visible a 320/390.
- Revisión puntual por Opus 5 (modelo confirmado por el agente) de `API_CONTRACT`, `ARCHITECTURE` y `DESIGN_SYSTEM`: 12 hallazgos, todos aplicados. Los materiales: precedencia distinta entre `ivolt.css` y `ivolt.flat.css` (ADR-019), API sin definir para cinco componentes (§5.2b), `system` anidado bajo `dark` heredaba dark (emisión corregida), `iv:close` no cancelable con `<dialog>` nativo (ADR-022), tokens `on-*`/`*-subtle` sin valores (añadidos con contraste), tabs y dropdown servidos con roles que no funcionan sin JS (ADR-020), drawer con dos elementos (ADR-021), `reset.css` sin capa, `exports` sin `default`, wording de `!important` y CSP del snippet inline.
- Gasto/tokens de la fase: no disponible en el entorno.

## No verificado / pendiente

- Emisión de `.d.ts` desde JSDoc con TypeScript 7.x (fallback 5.x) — fase 1.
- `@import … layer()` agrupado por lightningcss con `@custom-media` — fase 1, primer paso del integrador.
- Propiedad del scope npm `@intervolutions` — fase 4.
- Asset pendiente: `ivolt-logo.svg` oficial (rayo verde, hexágono abierto, firma BY iNTERVOLUTIONS). Sustituir `docs/design/assets/ivolt-wordmark-temp.svg` y el SVG inline de la lámina cuando exista.
- Fuente geométrica libre para titulares de docs (candidata Space Grotesk, OFL): decisión y archivos en fase 3.
- Lector de pantalla: sin ejecutar; lista pendiente en `docs/QUALITY.md` §4.

## Fallos abiertos

Ninguno de código (no hay código de producto todavía). Incidencia de fase 0 resuelta: un `autofocus` en la lámina dejaba las capturas headless en blanco; eliminado.

## Siguiente acción

`IMPLEMENT_PHASE_1` siguiendo `docs/ROADMAP.md` §1 (orden: raíz y lockfile → tokens → CSS base/layout/button/card/form → JS core + dialog → pruebas, pack-smoke, tamaños → docs mínimas → starter HTML). Integrador único para manifiestos, lockfile, `tokens.json`, entradas y contratos.

## Decisiones que no deben perderse

- Gramática congelada en `docs/API_CONTRACT.md`; cambios solo con ADR.
- Primario light `#0A6A43` (no `#0B8A55`, 4.4:1 insuficiente); dark `#29F59A` con texto `#081310`.
- Módulos CSS sin capa; las entradas asignan `@layer`; existe `ivolt.flat.css` para CSS legado.
- Estados JS reflejados en atributos nativos/ARIA, nunca clases `is-*`.
- Sin autoarranque salvo `auto.js`; sin `MutationObserver` global; sin efectos de importación.
- Matriz de navegadores: Chrome/Edge 111, Firefox 113, Safari 16.4, Samsung 22.
- El CSS de `docs/design/` es provisional y no se copia al paquete.
