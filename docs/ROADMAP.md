# iVOLT — Roadmap

## 1. Fases

| Fase | Disparador | Entrega que permite continuar | Depende de |
|---|---|---|---|
| 0 Blueprint | `PHASE_0_BLUEPRINT` | biblia, contratos, diseño, plan (este repositorio, 13-09-2026) | — |
| 1 Corte vertical (hecha 2026-09-13) | `IMPLEMENT_PHASE_1` | monorepo, build, tokens, temas, base, layout, button, card, form, dialog; home inicial y docs de esos elementos; starter HTML; pack-smoke | 0 |
| 2 Alcance v0.1 (hecha 2026-09-13) | `IMPLEMENT_PHASE_2` | badges, alerts, tables, breadcrumbs, pagination, progress, skeleton, disclosure, tabs, drawer, dropdown, toast, utilidades, tres recetas; docs y pruebas por familia | 1 |
| 3 Web y DX (hecha 2026-09-13) | `IMPLEMENT_PHASE_3` | web completa, búsqueda, playground acotado, starters descargables, changelog, contributing | 2 |
| 4 Release candidate | `IMPLEMENT_PHASE_4` | gates completos, Lighthouse, licencias, notas alpha, pasos de publicación (sin publicar) | 3 |

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
