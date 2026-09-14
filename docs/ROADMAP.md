# iVOLT — Roadmap

## 1. Fases

| Fase | Disparador | Entrega que permite continuar | Depende de |
|---|---|---|---|
| 0 Blueprint | `PHASE_0_BLUEPRINT` | biblia, contratos, diseño, plan (este repositorio, 13-09-2026) | — |
| 1 Corte vertical (hecha 2026-09-13) | `IMPLEMENT_PHASE_1` | monorepo, build, tokens, temas, base, layout, button, card, form, dialog; home inicial y docs de esos elementos; starter HTML; pack-smoke | 0 |
| 2 Alcance v0.1 (hecha 2026-09-13) | `IMPLEMENT_PHASE_2` | badges, alerts, tables, breadcrumbs, pagination, progress, skeleton, disclosure, tabs, drawer, dropdown, toast, utilidades, tres recetas; docs y pruebas por familia | 1 |
| 3 Web y DX (hecha 2026-09-13) | `IMPLEMENT_PHASE_3` | web completa, búsqueda, playground acotado, starters descargables, changelog, contributing | 2 |
| 4 Release candidate (hecha 2026-09-13; sin publicar) | `IMPLEMENT_PHASE_4` | gates completos, Lighthouse, licencias, notas alpha, pasos de publicación (sin publicar) | 3 |

### Fase 1 en detalle (plan mínimo de alto valor)

1. Raíz: workspaces, lockfile, scripts `build`, `test`, `sizes`, `pack-smoke`; `browserslist`.
2. `build-tokens.mjs` + `tokens.json` con los valores de DESIGN_SYSTEM; pruebas de resolución de alias y emisión de temas.
3. `reset.css`, `base.css` (acotado a `.iv-root`), `layout/*`, entradas `core.css`, `ivolt.css`, `ivolt.flat.css`; pruebas de contrato CSS.
4. `button.css`, `card.css`, `form.css` (label, input, textarea, select, checkbox, radio, ayuda, error).
5. `core/{registry,options,events,focus,keys}.js`, `components/dialog.js`, `theme.js`, `index.js`, `auto.js`, `iife.js`; tipos.
6. Pruebas Playwright de dialog y tema; SSR import; pack-smoke con consumidor externo; medición de tamaños.
7. `apps/docs` mínimo: home con hero y demo viva, getting started, páginas de button/card/form/dialog desde fixtures.
8. `examples/plain-html` funcionando con `dist/` copiado.

Orden de agentes sugerido: A (CSS: pasos 3–4) y B (JS: paso 5) en paralelo tras el paso 2 del integrador; luego integrador en 6–8.

## 2. Estimación de esfuerzo por fase

Unidad: sesiones de agente (una sesión ≈ un encargo de ≤ 20 turnos). Sin conversión a dinero: el precio depende del proveedor, la modalidad de créditos y el número de intentos.

| Fase | Bajo | Medio | Alto | Variables principales de coste |
|---|---|---|---|---|
| 1 | 4 | 6 | 9 | fallos de la cadena de build (tsc 7 / lightningcss), primera puesta a punto de Playwright, iteraciones del pack-smoke |
| 2 | 8 | 12 | 18 | número de familias con teclado complejo (dropdown, drawer, toast), recetas y su verificación en 6 viewports |
| 3 | 4 | 6 | 9 | playground, búsqueda, sustitución del prototipo, revisión de snippets |
| 4 | 2 | 3 | 5 | hallazgos de axe/Lighthouse, regresiones visuales, licencias |

Lo que más encarece: repetir comandos sin diagnóstico, enviar contexto entero a agentes, reescribir contratos ya congelados y ampliar alcance (variantes extra, componentes del backlog).

## 3. Backlog posterior a v0.1 (prioridad)

| P | Elemento | Motivo del orden |
|---|---|---|
| P1 | Prueba con lector de pantalla (NVDA, VoiceOver) y correcciones | valida lo que axe no cubre |
| P1 | Combobox/autocomplete accesible | demanda alta en catálogos y paneles; patrón APG complejo |
| P1 | Traducción de docs (estructura i18n en Astro ya prevista) | público hispano de la marca |
| P2 | Data table con ordenación y filtro sin virtualización | paneles |
| P2 | Datepicker nativo mejorado (`<input type="date">` + tokens) | formularios |
| P2 | Constructor de temas ligero (exportar `tokens.css` desde la web) | personalización sin build |
| P2 | Carrusel accesible sencillo | revistas |
| P3 | Wrappers React/Vue/Astro | solo con demanda real; el HTML ya funciona |
| P3 | Compilador de utilidades opcional / purga | valores arbitrarios sin escáner obligatorio |
| P3 | CLI generadora de starters | conveniencia |
| P3 | Data grid virtualizado, editor rico, drag and drop, gráficos | dominio propio cada uno |

## 4. Ciclo v0.2 (abierto 2026-09-14)

Tras cerrar v0.1 (fases 0–4) y el rediseño de la web (ADR-027), el trabajo continúa por prioridad del backlog. Orden decidido:

| Orden | Elemento | Estado | Notas |
|---|---|---|---|
| 1 | Combobox/autocomplete accesible | en curso | contrato en `API_CONTRACT.md` §8.3; fallback nativo `<datalist>`; un implementador Opus, docs y pruebas del integrador |
| 2 | Estructura i18n de docs y traducción al español | pendiente | cadenas ya en `apps/docs/src/i18n/en.js`; páginas `src/pages/es/` |
| 3 | Lector de pantalla (NVDA, VoiceOver) | bloqueado en este entorno | lista en `A11Y_REVIEW.md` §6, requiere una persona con AT |
| 4 | Data table con ordenación y filtro | pendiente | sin virtualización |

## 5. Hito beta: `0.2.0-beta.0` (definido 2026-09-14)

Beta significa: alcance v0.2 completo, contratos congelados, gates verdes en tres motores, sin fallos abiertos conocidos de severidad alta, notas y pasos de publicación actualizados; **sigue sin publicarse** sin autorización. Condiciones, en orden de ejecución:

| # | Condición | Estado |
|---|---|---|
| 1 | Combobox integrado (entrada, `exports`, `index.js`, flat), documentado y probado en Chromium, Firefox y WebKit | en curso |
| 2 | Rediseño de la web, ronda 2 (`docs/design/DIRECTION_R2.md`), sin rejillas, Lighthouse ≥ 95 rendimiento y 100 accesibilidad en la home, capturas revisadas | en curso |
| 3 | Data table con ordenación y filtro sin virtualización, mejora progresiva sobre `<table>`, contrato en `API_CONTRACT.md`, docs y pruebas | pendiente |
| 4 | Docs en español: estructura i18n (`src/pages/es/`, cadenas `src/i18n/es.js`), selector de idioma, `hreflang`, búsqueda por idioma | pendiente |
| 5 | Presupuestos de tamaño revisados con los módulos nuevos (`docs/QUALITY.md` §1) y `npm run verify` verde | pendiente |
| 6 | `CHANGELOG.md` 0.2.0-beta.0, `docs/RELEASE.md` actualizado, versión en `package.json`, `PROJECT_STATE.md` cerrado | pendiente |

Fuera de la beta (declarado, no verificado): prueba con lector de pantalla real (bloqueada en este entorno), datos de campo, dispositivos físicos.
