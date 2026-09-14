# iVOLT — Estado del proyecto

Última actualización: 2026-09-14 · Ciclo **v0.6 «Structure» cerrado** → hito `0.6.0-beta.0` (`ROADMAP.md` §9, ADR-041) · v0.7 «Media & motion» contratado (§8.20–§8.23, `ROADMAP.md` §10) · **Nada publicado ni desplegado**

## Estado por fase e hito

| Fase / hito | Estado | Evidencia |
|---|---|---|
| 0–4 (v0.1.0-alpha.0) | hechas, no publicada | `docs/RELEASE.md` §1–§4 |
| Betas 0.2 a 0.5 (`ROADMAP.md` §5–§7) | cerradas, no publicadas | combobox, data table, carrusel, selector, formularios, superficies, megamenú, efectos, hero, datepicker, tooltip, popover, paleta, constructor de temas |
| Ronda de revisión visual sobre 0.5 (§8, ADR-039/040) | integrada | rediseño de la web, pulido de 22 módulos, fotografías libres |
| **v0.6 «Structure»** (§9, ADR-041) | cerrado, no publicado | tokens con nombre, navbar, stepper, toast declarativo, timeline/stat/avatar; web en dos idiomas; gate completo en tres motores |
| v0.7 «Media & motion» (§10) | contratado, sin implementar | §8.20 lightbox, §8.21 movimiento por scroll, §8.22 texto y contador, §8.23 receta showcase (fotos ya en `examples/recipes/showcase/photos/`) |

## Petición del propietario que abrió este ciclo (2026-09-14)

«Sigue trabajando hasta 0.7.» Método: contratos escritos antes de implementar, dos implementadores Opus con archivos disjuntos y capturas propias, un tercero para la web, el líder integra y pasa el gate. Ninguna afirmación visual sin captura (ADR-039).

## Entregas de v0.6

| Bloque | Contrato | Tamaño gzip | Verificación |
|---|---|---|---|
| Tokens de la capa expresiva + refactor de 11 módulos | §8.15 | `core.min.css` +0,09 KiB | contratos 160/160; `grep` sin recetas literales; 41 líneas base previas dentro de tolerancia |
| Navbar | §8.16 | 1,9 CSS + 3,2 JS | 8 pruebas × 3 motores (plegado, pegajoso, condensado, transparente, megamenú alojado, `hideOnScroll` añadido por el líder), axe en 4 fixtures × 2 temas |
| Stepper | §8.17 | 1,9 CSS + 3,9 JS | pruebas × 3 motores (validación con `Form` y nativa, lineal, teclado, foco al panel, error), axe en 3 fixtures × 2 temas |
| Toast declarativo | §8.18 | dentro de toast | +10 unitarias, spec de navegador × 3 motores |
| Timeline, stat, avatar | §8.19 | 1,3 + 1,1 + 0,9 CSS | `content.spec.js` × 3 motores (axe, sin scroll lateral a 390, solape, alternancia) |
| Web (implementador de docs) | — | — | 10 páginas nuevas (navbar, stepper, timeline, stat, avatar en inglés y español), toast/progress/card/tokens actualizadas, barra lateral y diálogo móvil agrupados por familia con marca css/js por ítem, pie con el mapa completo (31 familias), `Fixture.astro` con `viewport` para fixtures de página entera; 94 páginas en 2 idiomas; `qa-docs-v06.spec.js` 6/6; tres pruebas previas ajustadas por el líder (26 → 31 familias, dos regiones de toast, recetas solo con `index.html`) |

Presupuestos (`npm run sizes` @ 34e69c1): `core.min.css` 2,60 KiB (≤ 8), `ivolt.min.css` 25,64 KiB (≤ 40), JS agrupado 39,04 KiB (≤ 48).

## Verificaciones ejecutadas en el ciclo

| Check | Resultado |
|---|---|
| `npm test` | 641/641 (27 archivos) |
| Componentes nuevos + axe (Chromium) | 208/208 (`navbar`, `stepper`, `content`, `toast-declarative`, `toast`, `a11y` con 16 fixtures nuevas) |
| Componentes nuevos en tres motores (implementadores) | navbar+stepper 102/102; content+toast 102/102 |
| Líneas base visuales | 57 en Chromium: 16 nuevas (timeline, stat, avatar, progress, navbar, stepper), las 41 previas dentro de tolerancia tras el refactor |
| `IVOLT_ALL_BROWSERS=1 npm run verify` | exit 0 (segunda pasada; la primera dejó un fallo en WebKit de `carousel.spec.js`, una `boundingBox()` nula bajo carga que la prueba ahora espera): build · 651 unitarias · 1068 pruebas de navegador superadas y 114 omitidas (visuales fuera de Chromium) en Chromium, Firefox y WebKit · tamaños · pack-smoke (`intervolutions-ivolt-0.6.0-beta.0.tgz`, 121 archivos, theme-only 926 B, dialog-only 6482 B, unused 0 B, starter servido) · docs (94 páginas, 2 idiomas) · ejemplos (4 páginas) |
| Lighthouse 13.4.1 (`docs/LIGHTHOUSE.md`) | `/` y `/es`: móvil 98/100/100/100 (LCP 2,3 s, CLS 0), escritorio 100/100/100/100; sin cambio de nota respecto a la ronda anterior |
| Gasto/tokens | no disponible en el entorno |

## No verificado / limitaciones declaradas

- Lector de pantalla real: sin ejecutar (`A11Y_REVIEW.md` §12).
- Gestos y punteros reales en el panel plegado del navbar, `hideOnScroll` con lectores que mueven el foco fuera del viewport.
- `hideOnScroll` conserva su traslación bajo reduced motion (estado, no adorno): decisión registrada, no probada con usuarios.
- Aceptación visual del propietario de v0.6: pendiente.
- Publicación y despliegue: requieren autorización explícita (`docs/RELEASE.md` §0c y §3).

## Fallos abiertos

Ninguno conocido de severidad alta. Sin resolver desde v0.5: `.iv-dialog__title` pierde contra `.iv-root h2` en la hoja plana. Pendiente de decisión: subir el cristal condensado del navbar de `--iv-blur-sm` a `md` en oscuro (el texto bajo la barra se lee difuminado; se dejó `sm` por coherencia con diálogo y drawer).

## Siguiente acción

Abrir v0.7 «Media & motion» (`ROADMAP.md` §10; contratos ya congelados en §8.20–§8.23): stubs registrados, dos implementadores Opus (A: lightbox + countup; B: `motion.css`, `text.css`, `ScrollMotion`), implementador de docs con la receta «showcase», gate y cierre `0.7.0-beta.0`. Publicación solo con autorización.

## Decisiones que no deben perderse

- ADR-041 (ver `docs/DECISIONS.md`): `data-iv-collapsible` como estado del navbar; alcance lineal del stepper «hasta el más lejano visitado»; solape de avatares resuelto en cada avatar; filas al hover conservan `primary-subtle`; `--iv-progress-height` → `--iv-progress-size`.
- Lecciones de proceso vigentes: mirar con capturas antes de afirmar; gate sobre códigos de salida; verificar `HEAD == origin/main` tras cada push; `iv:closed` y estados condensados llegan una tarea después: sondear (`expect.poll`), no leer.
- Fotografías: solo activos de la web y de la receta showcase (copias acreditadas en `examples/recipes/showcase/photos/`); nunca dentro del paquete npm.
