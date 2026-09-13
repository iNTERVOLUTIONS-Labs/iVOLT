# iVOLT — Estado del proyecto

Última actualización: 2026-09-13 · Fase actual: **3 (web y DX) cerrada** · Siguiente disparador: `IMPLEMENT_PHASE_4`

## Estado por fase

| Fase | Estado | Evidencia |
|---|---|---|
| 0 Blueprint | hecha | `docs/`, lámina histórica `docs/design/brand-board.html` |
| 1 Corte vertical | hecha | merge `29a3d35` |
| 2 Alcance v0.1 | hecha | merge `e9bc149` |
| 3 Web y DX | hecha | 201 pruebas unitarias/contrato, 285 de navegador × 3 motores, pack-smoke, tamaños, web de 29 páginas con búsqueda, playground y descargas |
| 4 Release candidate | prevista | `docs/ROADMAP.md` |

## Implementado en fase 3

- Web: navegación agrupada (`apps/docs/src/i18n/en.js`, preparada para un segundo idioma), búsqueda local con Pagefind e interfaz propia (atajos `/` y Ctrl+K, flechas en resultados, aviso en modo dev), anclas de encabezado, imagen Open Graph propia (SVG → PNG con el Chromium local), sitemap y canonical solo con `SITE_URL`, 404 útil, tema en el diálogo móvil.
- Páginas nuevas: typography, accessibility, coexistence, contributing, changelog, roadmap, playground, examples con descargas. Home con índice de componentes, fundamentos y recetas.
- Playground acotado: button/badge/alert/card × variante × tamaño × tema con textos de una lista cerrada; DOM construido con `createElement`/`textContent`, sin JS arbitrario; copia con feedback.
- Descargas generadas en build (`scripts/build-downloads.mjs`, escritor ZIP propio): `ivolt-dist.zip`, starter y tres recetas, con `manifest.json`.
- Paquete: `prefers-contrast: more` implementado en `tokens.css` (bordes decorativos → `border-strong`); `.iv-tabs__heading` estilizado para el fallback sin JS.
- Verificación de snippets contra distribución (`tests/contracts/snippets.test.js`): toda clase `iv-*` en fixtures, ejemplos, recetas y páginas existe en `dist/css/ivolt.css`.
- Hash CSP del snippet inline de tema calculado en build desde la misma cadena que inyecta el layout y publicado en `/foundations/coexistence`; prueba que lo contrasta con el HTML servido.

## Verificaciones ejecutadas (cierre de fase 3)

| Check | Resultado |
|---|---|
| `npm run build` | ok |
| `npm test` (Vitest) | 201/201 |
| `IVOLT_ALL_BROWSERS=1 npx playwright test` | 285/285 en Chromium, Firefox y WebKit (componentes, axe 24 fixtures × 2 temas, overflow, RTL, docs: consola, enlaces, h1, tema, copia, menú móvil, búsqueda, anclas, playground, descargas, hash CSP; recetas) |
| `npm run sizes` | core 2.38 KiB / 8; ivolt.min.css 10.14 / 30; flat 10.07 / 30; JS agrupado 7.65 / 18; IIFE 7.90 / 18 |
| `npm run pack-smoke` | ok |
| `npm run build:docs` | ok: 29 páginas, índice Pagefind, 5 zips, og.png |
| Gasto/tokens | no disponible en el entorno |

## No verificado / pendiente

- Lector de pantalla (NVDA/VoiceOver) y Lighthouse: fase 4.
- Forced-colors mode: no probado.
- Logo oficial `ivolt-logo.svg`: sigue el wordmark temporal (docs, OG y lámina).
- Propiedad del scope npm `@intervolutions`: fase 4.
- `ivolt-dist.zip` extrae en la raíz (`css/`, `js/`…); cada zip de receta incluye su copia de `ivolt/` (~850 KB).
- Un servidor `astro preview` residual sirve builds antiguos a las pruebas (`reuseExistingServer`): cerrar previews antes de la suite.

## Fallos abiertos

Ninguno. Resueltos en fase 3: overflow del encabezado a 390 px (búsqueda icon-only y tema en el diálogo), `iv-tabs__heading` sin regla CSS, `prefers-contrast` documentado pero no implementado.

## Siguiente acción

`IMPLEMENT_PHASE_4`: suite completa y revisión de accesibilidad (incluida lista de lector de pantalla), regresiones visuales selectivas, Lighthouse con entorno registrado, pesos finales, paquete y starters probados desde fuera del monorepo, licencias/atribuciones, notas de versión alpha, comprobación de nombres npm y pasos de publicación (sin publicar).

## Decisiones que no deben perderse

- Ver fases 1–2 (ADR-019 a 026) y en fase 3: búsqueda con interfaz propia sobre Pagefind (sin UI externa); descargas con escritor ZIP propio sin dependencias; snippet de tema compartido `apps/docs/src/theme-snippet.js` (cambiarlo cambia el hash publicado automáticamente); cadenas de UI en `i18n/en.js`; sitemap solo con `SITE_URL`.
- Subagentes fase 3: dos encargos Opus (playground + descargas; páginas de contenido), ambos completos.
