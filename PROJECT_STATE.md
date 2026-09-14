# iVOLT — Estado del proyecto

Última actualización: 2026-09-14 · Ciclo **v0.7 «Media & motion» cerrado** → hito `0.7.0-beta.0` (`ROADMAP.md` §10, ADR-042) · v0.6 cerrado el mismo día (§9, ADR-041) · **Nada publicado ni desplegado**

## Estado por fase e hito

| Fase / hito | Estado | Evidencia |
|---|---|---|
| 0–4 (v0.1.0-alpha.0) | hechas, no publicada | `docs/RELEASE.md` §1–§4 |
| Betas 0.2 a 0.5 (`ROADMAP.md` §5–§7) y ronda visual (§8) | cerradas, no publicadas | combobox, data table, carrusel, selector, formularios, superficies, megamenú, efectos, hero, datepicker, tooltip, popover, paleta, constructor de temas, rediseño de la web |
| v0.6 «Structure» (§9, ADR-041) | cerrado, no publicado | tokens con nombre, navbar, stepper, toast declarativo, timeline/stat/avatar; 94 páginas en dos idiomas; gate en tres motores |
| **v0.7 «Media & motion»** (§10, ADR-042) | cerrado, no publicado | lightbox, movimiento por scroll con reserva JS, efectos de texto, contador, receta «showcase»; 102 páginas en dos idiomas; gate completo en tres motores |

## Petición del propietario que abrió estos ciclos (2026-09-14)

«Sigue trabajando hasta 0.7.» Método en ambos ciclos: contratos escritos y congelados antes de implementar (§8.15–§8.23), dos implementadores Opus con archivos disjuntos y capturas propias, un tercero para la web, el líder integra, registra las enmiendas de implementación en el contrato y pasa el gate. Ninguna afirmación visual sin captura (ADR-039).

## Entregas de v0.7

| Bloque | Contrato | Tamaño gzip | Verificación |
|---|---|---|---|
| Lightbox (galería + visor sobre `Dialog`) | §8.20 | 2,2 CSS + 2,8 JS | `lightbox.spec.js` × 3 motores (apertura, teclado, gesto, zoom, foco de vuelta, sin JS), axe con visor abierto y con zoom |
| Countup | §8.22 | 1,6 JS | `countup.spec.js` × 3 motores (cuenta al entrar, `Intl` por `lang`, prefijo/sufijo, reduced motion sin cambio) |
| Movimiento por scroll (`motion.css` + `ScrollMotion`) | §8.21 | 1,2 CSS + ≈1 JS | `motion.spec.js` × 3 motores: parallax nativo (Chromium, WebKit) y por reserva (Firefox), barra de lectura (también bajo reduced motion: decisión del líder), marquesina, baraja |
| Texto (`text.css`) | §8.22 | 0,9 CSS | `text.spec.js` × 3 motores: revelado con `Reveal`, visible sin JS y con reduced motion; axe en claro y oscuro |
| Web y receta «showcase» (implementador de docs) | §8.23 | — | 8 páginas nuevas (lightbox, countup, movimiento por scroll, efectos de texto en inglés y español), fixture de galería con fotografías reales solo en la web, `Fixture.astro` con puerto de scroll enfocable (hallazgo axe corregido), receta `examples/recipes/showcase` (navbar transparente sobre hero cinematográfico con parallax, marquesina, cifras con `Countup`, galería con visor, tarjetas apiladas, stepper de contacto, línea de tiempo del roadmap, barra de lectura) listada en los ejemplos y empaquetada; `qa-docs-v07.spec.js` y `recipes.spec.js` con la receta; corrección del líder tras Lighthouse: plegado del navbar sin salto de maqueta (marca temprana `data-iv-js`, ADR-042) |

Presupuestos (`npm run sizes` @ f6d17ad): `core.min.css` 2,60 KiB (≤ 8), `ivolt.min.css` 28,13 KiB (≤ 40), JS agrupado 42,79 KiB (≤ 48: quedan 5 KiB; ver `QUALITY.md` §1).

## Verificaciones ejecutadas en v0.7

| Check | Resultado |
|---|---|
| `npm test` | 694/694 (30 archivos) |
| Specs nuevos en tres motores | 204/204 (`motion`, `text`, `lightbox`, `countup`) tras la decisión sobre la barra de lectura |
| axe (Chromium, todas las fixtures) | 163/163 con 13 fixtures nuevas |
| Líneas base visuales | 67 en Chromium: 10 nuevas (texto, marquesina, galería) |
| `IVOLT_ALL_BROWSERS=1 npm run verify` | exit 0 en la tercera pasada: build · 703 unitarias · 1384 pruebas de navegador superadas y 134 omitidas (visuales fuera de Chromium) en Chromium, Firefox y WebKit · tamaños · pack-smoke (`intervolutions-ivolt-0.7.0-beta.0.tgz`, 128 archivos, theme-only 926 B, dialog-only 6482 B, unused 0 B, starter servido) · docs (102 páginas, 2 idiomas) · ejemplos (5 páginas). Pasadas previas: dos hallazgos axe en la receta showcase a 390 px que eran la animación de entrada a medio fundido (la suite de recetas audita ahora el estado asentado bajo reduced motion, como el resto), y un `wheel` de WebKit que no volvía arriba en la prueba del navbar pegajoso (la prueba fija ahora la posición) |
| Lighthouse 13.4.1 (`docs/LIGHTHOUSE.md`) | `/` y `/es`: móvil 97/100/100/100 (LCP 2,4 s, CLS 0), escritorio 100/100/100/100; receta showcase: móvil 87 (LCP 4,1 s por la foto de portada, CLS 0 tras la marca temprana; la primera pasada dio 69 con CLS 0,38), escritorio 99 |
| Gasto/tokens | no disponible en el entorno |

## No verificado / limitaciones declaradas

- Lector de pantalla real: sin ejecutar (`A11Y_REVIEW.md` §12–§13).
- Gestos táctiles reales (arrastre con zoom, panel del navbar), parallax con trackpad de alta frecuencia: solo simulados.
- `iv-stack-cards` retrocede como baraja completa al salir, no tarjeta a tarjeta (ADR-042, candidato).
- Aceptación visual del propietario de v0.6 y v0.7: pendiente.
- Publicación y despliegue: requieren autorización explícita (`docs/RELEASE.md` §0d y §3).

## Fallos abiertos

Ninguno conocido de severidad alta. Sin resolver desde v0.5: `.iv-dialog__title` pierde contra `.iv-root h2` en la hoja plana. Pendiente de decisión: cristal condensado del navbar (`--iv-blur-sm` vs `md` en oscuro).

## Siguiente acción

Revisión del propietario de v0.6 y v0.7 con la web construida (`npm run build && npm run dev:docs`): navbar, stepper, bloques de contenido, galería y visor, movimiento, texto, contador y la receta «showcase» (`/examples/showcase/index.html`). Candidatos para 0.8 en `ROADMAP.md` §8 y §10 (relevo por tarjeta en la baraja, tokens pendientes, `Picker` con etiqueta hermana, decisión sobre el presupuesto de JS o la importación por módulo, servir a la home solo los módulos que usa). Publicación solo con autorización.

## Decisiones que no deben perderse

- ADR-041 y ADR-042 (ver `docs/DECISIONS.md`): estado frente a adorno bajo reduced motion (`hideOnScroll`, barra de lectura); `overflow: clip` en marcos de parallax; `:where()` no envuelve estados enteros; la captura de puntero reetiqueta el `click`; `iv:closed` y estados de scroll llegan una tarea después: sondear.
- Lecciones de proceso vigentes: mirar con capturas antes de afirmar; gate sobre códigos de salida; `HEAD == origin/main` tras cada push; recetas solo con `index.html`.
- Fotografías: activos de la web y de la receta showcase (copias acreditadas); nunca dentro del paquete npm.
