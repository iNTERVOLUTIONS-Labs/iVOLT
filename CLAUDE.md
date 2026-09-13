# iVOLT — guía para agentes

Framework frontend (CSS + HTML + JS opcional) de iNTERVOLUTIONS. Coordinación en español; código, identificadores y docs públicas en inglés.

## Estado y arranque
- Lee primero `PROJECT_STATE.md` (estado, siguiente acción) y la sección de la fase en `docs/ROADMAP.md`.
- Fases: `PHASE_0_BLUEPRINT` (hecha) → `IMPLEMENT_PHASE_1` → `_2` → `_3` → `_4`. Ejecuta solo la fase pedida, íntegra, con sus verificaciones.
- No reinvestigues ni reescribas la biblia. Un requisito que contradiga un ADR: exponer, añadir ADR en `docs/DECISIONS.md`, aplicar lo mínimo.

## Documentos (no cargar todos en cada tarea)
- Visión y alcance: `docs/IVOLT_BIBLE.md`
- Módulos, exports, capas CSS, SSR: `docs/ARCHITECTURE.md`
- Gramática congelada (clases, tokens, atributos, JS, eventos): `docs/API_CONTRACT.md`
- Paleta, escalas, estados, arte: `docs/DESIGN_SYSTEM.md`
- Presupuestos, navegadores, pruebas, gates: `docs/QUALITY.md`
- Agentes, propiedad de archivos, coste: `docs/WORKFLOW.md`
- ADR: `docs/DECISIONS.md` · Fuentes y versiones: `docs/SOURCES.md`
- Lámina visual provisional: `docs/design/brand-board.html`

## Reglas duras
- Prefijos: clases `iv-`, variables `--iv-`, atributos `data-iv-`, eventos `iv:`. Global IIFE `IVOLT`.
- Sin `!important` (excepción única: `.iv-u-sr-only`). Sin dependencias de ejecución. Sin telemetría ni recursos remotos.
- ESM sin acceso a `document`/`window` en nivel superior; sin `eval`, `new Function`, `innerHTML` con datos externos ni handlers inline.
- `init` idempotente, `destroy` limpia; sin `MutationObserver` global; precedencia `defaults < data-iv-* < opciones JS`.
- Base de elementos acotada a `.iv-root`. Breakpoints por `@custom-media` resueltos en build, nunca `var()` en `@media`.
- Utilidades: solo la matriz de `API_CONTRACT.md` §4. Sin JIT, purga ni valores arbitrarios.
- Ejemplos honestos: sin botones sin destino, formularios que no envían nada lo dicen, datos ficticios señalados.
- Sin publicar, desplegar, comprar dominios, activar servicios de pago ni generar imágenes con modelos de pago.
- Documentar por fixture: snippet, preview y prueba salen del mismo archivo.

## Propiedad de archivos
Integrador único para `package.json`, `package-lock.json`, `tokens/tokens.json`, entradas (`core.css`, `ivolt.css`, `index.js`, `iife.js`), `exports`, contratos y `PROJECT_STATE.md`. Los subagentes proponen cambios en su entrega.

## Agentes
- Líder: Fable 5.1 (esfuerzo high). Implementación/revisión: Opus 5 (`model: "opus"`); el agente informa de su modelo.
- Máximo dos implementadores simultáneos con archivos disjuntos. Nunca agentes Fable subordinados ni delegación recursiva.
- Encargo = objetivo, archivos permitidos, contratos, entregable, pruebas, condición de parada. Revisión ≤ 8 turnos, implementación ≤ 20.
- Dos fallos iguales → diagnosticar con evidencia, no repetir a ciegas.

## Comandos (a partir de fase 1; hoy no existen)
```
npm ci                 # instalar con lockfile
npm run build          # tokens → css → js → tipos
npm test               # unit + contratos CSS (rápido)
npm run test:browser   # Playwright (Chromium, Firefox, WebKit)
npm run sizes          # tamaños min+gzip con versión y commit
npm run pack-smoke     # npm pack + consumidor externo temporal
npm run dev:docs       # Astro en local
```

## Cierre de hito
Ejecutar el gate de `docs/QUALITY.md` §5, actualizar `PROJECT_STATE.md` (estado, archivos, verificaciones, fallos abiertos, siguiente acción, decisiones), distinguir previsto / implementado / probado / no verificado. Gasto en tokens: «no disponible» salvo que el entorno lo exponga.
