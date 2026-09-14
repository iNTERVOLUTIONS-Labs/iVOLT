# iVOLT — Estado del proyecto

Última actualización: 2026-09-14 · Hito `0.5.0-beta.0` alcanzado y **ronda de revisión visual del propietario integrada** (`ROADMAP.md` §8, ADR-039/040) · **Nada publicado ni desplegado**

## Estado por fase e hito

| Fase / hito | Estado | Evidencia |
|---|---|---|
| 0–4 (v0.1.0-alpha.0) | hechas, no publicada | `docs/RELEASE.md` §1–§4 |
| Beta v0.2.0-beta.0 (`ROADMAP.md` §5) | cerrada, no publicada | combobox, data table, rediseño ronda 2, español |
| Beta v0.3.0-beta.0 «Spectacular» (§6, ADR-030) | cerrada, no publicada | carrusel, selector, formularios, superficies |
| v0.4 «Navigation & light» y v0.5 «Time & help» (§7) | cerrados, no publicados | megamenú, efectos, hero, datepicker, tooltip, popover, paleta, constructor de temas; gate en tres motores |
| **Ronda de revisión visual sobre 0.5** (§8, ADR-039/040) | integrada; versión sin cambiar (`0.5.0-beta.0`) | correcciones directas, fotografías libres, rediseño de la web, pulido de 22 módulos CSS, líneas base regeneradas |

## Petición del propietario que abrió esta ronda (2026-09-14)

«Edge glint y proximity en los docs no funcionan, el megamenú se va antes de poder entrar, contenido descentrado o poco espaciado, una línea verde sin sentido, la columna central tendría que ser más ancha; lanza Playwright y ve la web como se ve de verdad, mejora los docs brutalmente, mejora el framework, pilla imágenes libres para carruseles y heros.» Método adoptado (ADR-039): ninguna afirmación visual sin captura real; dos implementadores Opus con Playwright (web y framework) y el líder integrando con capturas propias.

## Entregas de la ronda

| Bloque | Qué cambió | Verificación |
|---|---|---|
| Correcciones directas (líder, ADR-039) | halos en `iv-edge-near`/`iv-edge-glint`; megamenú que ignora ítems sin panel, tapa el hueco bajo la barra y cierra a 320 ms; columna a 72rem; sin filete bajo el `h1` | `effects.spec.js`, `megamenu.spec.js`, capturas |
| Fotografías (líder, ADR-039) | 12 fotos Unsplash vía Lorem Picsum en `apps/docs/public/photos/` con créditos; fixtures con foto para carrusel, hero, tarjeta y cristal solo en la web (`apps/docs/fixtures/`); el paquete sigue sin mapas de bits | `THIRD_PARTY.md`, `photos/README.md` |
| Rediseño de la web (Opus, ADR-040) | escala vertical única (`--docs-flow/block/sub/section`), secciones numeradas con filete, columna que llenan fixtures, tablas y código, heros con foto en inicio/ejemplos/404, pie con mapa del sitio, `docs-meta`/`docs-note`, 76 tablas en `docs-scroller`, 404 útil; inglés y español | `qa-docs-overhaul.spec.js` (10 pruebas a 390/1024/1440), `docs.spec.js`, `qa-docs-shell`, `qa-docs-css`, `theme-builder`: 42/42 en Chromium antes de integrar |
| Pulido del framework (Opus, ADR-040) | 22 módulos CSS: sombras derivadas de `--iv-color-overlay`, halo de foco común, tabla con microtipografía y caption a línea completa en `--stack`, marcadores de orden por máscara SVG, pestañas en pastilla, calendario con días circulares, toasts por tono, `--float` con selector enriquecido corregido | contratos 160/160; axe 357/357 en tres motores (implementador); suite Chromium 195/195 y 41 líneas base regeneradas (líder) |
| Hallazgo del líder | `dialog.spec.js` fallaba en solitario: Chromium dispara el `close` nativo (`iv:closed`) una tarea después de retirar `open`; la prueba leía sin esperar. Prueba con `expect.poll`; `::backdrop` de diálogo y drawer con desenfoque `--iv-blur-sm` | `dialog.spec.js` 4/4 en solitario y en suite |

Presupuestos (`npm run sizes` @ f025206): `core.min.css` 2,51 KiB, `ivolt.min.css` 22,17 KiB (≤ 40), JS agrupado 35,42 KiB (≤ 48).

## Verificaciones ejecutadas en la ronda

| Check | Resultado |
|---|---|
| `npm test` | 590/590 (25 archivos) tras el pulido |
| Suites de docs (Chromium) | 42/42 antes de integrar el rediseño |
| Suite de componentes + axe (Chromium, sin visuales) | 195/195 tras el pulido y el desenfoque del backdrop |
| Líneas base visuales | 41 regeneradas a propósito con `--update-snapshots` (Chromium); 21 archivos cambian, revisados a ojo (diálogo, formularios, pestañas, efectos) |
| `IVOLT_ALL_BROWSERS=1 npm run verify` | exit 0 tras el pulido, el desenfoque del backdrop y las líneas base nuevas: build · 590 unitarias · 849 pruebas de navegador listadas en Chromium, Firefox y WebKit (las 82 visuales fuera de Chromium se omiten) · tamaños · pack-smoke · docs (84 páginas, 2 idiomas) · ejemplos (4 páginas). El recuento exacto de superadas no quedó en el registro (salida truncada); el código de salida sí |
| Lighthouse 13.4.1 (`docs/LIGHTHOUSE.md`) | `/` y `/es`: móvil 98/100/100/100 (LCP 2,2 s, CLS 0), escritorio 100/100/100/100; un punto menos en móvil que en el cierre de 0.5, una sola pasada, comentado en `LIGHTHOUSE.md` |
| Gasto/tokens | no disponible en el entorno |

## No verificado / limitaciones declaradas

- Lector de pantalla real: sin ejecutar (`A11Y_REVIEW.md` §6, §9–§11).
- Gestos táctiles y punteros reales (hover intencional del megamenú, proximidad, arrastre del carrusel): solo simulados.
- El desenfoque del `::backdrop` depende de que `::backdrop` herede variables del diálogo (Chromium 122+, Firefox 120+, Safari 17.4+); antes, el fondo solo se atenúa.
- Aceptación visual del propietario de esta ronda: pendiente.
- Publicación y despliegue: requieren autorización explícita (`docs/RELEASE.md` §0b y §3).

## Fallos abiertos

Ninguno conocido de severidad alta. Sin resolver desde v0.5: `.iv-dialog__title` pierde contra `.iv-root h2` en la hoja plana. Candidatos de 0.6 salidos de la ronda: `ROADMAP.md` §8.

## Siguiente acción

Revisión visual del propietario con la web construida (`npm run build && npm run dev:docs`), en especial: páginas interiores (columna, secciones numeradas), ejemplos, 404, formularios flotantes con selector, diálogo con fondo desenfocado. Si acepta, abrir 0.6 con los candidatos de `ROADMAP.md` §8 (tokens de sombra/halo/tracking, `Picker` con etiqueta hermana, disparador de toast). Publicación solo con autorización (`docs/RELEASE.md` §0b).

## Decisiones que no deben perderse

- ADR-039/040 (ver `docs/DECISIONS.md`). Lecciones de proceso: mirar la web con capturas antes de afirmar; verificar rama y remoto antes de afirmar un push; gate de commits sobre códigos de salida, nunca tras `;` ni tras un `grep`; en pruebas, `iv:closed` del diálogo llega una tarea después de `close()`: sondear, no leer.
- Fotografías: solo activos de la web; nunca dentro del paquete npm.
- Escala vertical de la web (`--docs-*`) es de la web; no se añaden tokens `--iv-space-*` por ella.
- Efectos: `--iv-i` es la variable de escalonado pública. Megamenú: `data-iv-open=""` como estado; hover armado por `pointerenter` y disparado por `pointermove`.
