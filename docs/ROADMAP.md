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
| 1 | Combobox/autocomplete accesible | hecho (2026-09-14) | contrato en `API_CONTRACT.md` §8.3; fallback nativo `<datalist>`; implementador Opus 5, docs y pruebas del integrador; 3 motores en verde |
| 2 | Estructura i18n de docs y traducción al español | hecho (2026-09-14) | 31 páginas `/es/` por un implementador Opus 5; `Base.astro` con `lang`, `hreflang`, selector; Pagefind con dos índices |
| 3 | Lector de pantalla (NVDA, VoiceOver) | bloqueado en este entorno | lista en `A11Y_REVIEW.md` §6, requiere una persona con AT |
| 4 | Data table con ordenación y filtro | hecho (2026-09-14) | contrato §8.4; sin virtualización; implementador Opus 5; 3 motores en verde |

## 5. Hito beta: `0.2.0-beta.0` (definido y cerrado 2026-09-14; sin publicar)

Beta significa: alcance v0.2 completo, contratos congelados, gates verdes en tres motores, sin fallos abiertos conocidos de severidad alta, notas y pasos de publicación actualizados; **sigue sin publicarse** sin autorización. Condiciones, en orden de ejecución:

| # | Condición | Estado |
|---|---|---|
| 1 | Combobox integrado (entrada, `exports`, `index.js`, flat), documentado y probado en Chromium, Firefox y WebKit | hecho |
| 2 | Rediseño de la web, ronda 2 (`docs/design/DIRECTION_R2.md`), sin rejillas, Lighthouse ≥ 95 rendimiento y 100 accesibilidad en la home, capturas revisadas | hecho (aceptación visual del propietario pendiente) |
| 3 | Data table con ordenación y filtro sin virtualización, mejora progresiva sobre `<table>`, contrato en `API_CONTRACT.md` §8.4, docs y pruebas | hecho |
| 4 | Docs en español: estructura i18n (`src/pages/es/`, cadenas `src/i18n/es.js`), selector de idioma, `hreflang`, búsqueda por idioma | hecho |
| 5 | Presupuestos de tamaño revisados con los módulos nuevos (`docs/QUALITY.md` §1) y `npm run verify` verde | hecho (2026-09-14, tres motores) |
| 6 | `CHANGELOG.md` 0.2.0-beta.0, `docs/RELEASE.md` actualizado, versión en `package.json`, `PROJECT_STATE.md` cerrado | hecho |

Fuera de la beta (declarado, no verificado): prueba con lector de pantalla real (bloqueada en este entorno), datos de campo, dispositivos físicos.

## 6. Ciclo v0.3 «Spectacular» (abierto y cerrado 2026-09-14, ADR-030; sin publicar)

Objetivo: que el framework sea espectacular por defecto (DESIGN_SYSTEM §9) manteniendo el contrato técnico. Hito: `0.3.0-beta.0`, mismas condiciones de cierre que §5 (gates en tres motores, Lighthouse, docs en dos idiomas, changelog, sin publicar).

| Orden | Elemento | Contrato | Estado |
|---|---|---|---|
| 1 | Carrusel cinematográfico (`carousel`): scroll-snap sin JS; con JS, patrón APG por pestañas, efectos `slide`/`fade`/`cinema`, autoplay con barra de progreso y pausa, gestos, miniaturas | §8.5 | hecho (2026-09-14) |
| 2 | Selector enriquecido (`picker`, tipo Select2): `<select>` nativo servido, búsqueda, selección múltiple con chips, grupos, teclado completo | §8.6 | hecho (2026-09-14) |
| 3 | Formularios: validación (`form`) con mensajes por tipo de error, resumen y foco; contador de caracteres/palabras (`counter`); CSS: etiquetas flotantes, grupos con prefijos y sufijos, interruptor, rango, archivo, textarea auto-ajustable | §8.7 | hecho (2026-09-14) |
| 4 | Superficies y texturas (`surfaces.css`): cristal, grano, malla, aurora, borde luminoso, texto degradado, barrido; tokens `glass`/`blur`/`glow`/`texture` | §8.8 | hecho (2026-09-14) |
| 5 | Web: páginas de carrusel, selector, validación, superficies; formulario ampliado; gabinete de la home con los nuevos componentes; español | — | hecho (2026-09-14) |
| 6 | Cierre: presupuestos medidos por módulo, `verify`, changelog `0.3.0-beta.0`, estado | — | hecho (2026-09-14; gate en tres motores, Lighthouse 99–100) |

Fuera del ciclo: datepicker, constructor de temas, wrappers de frameworks; lector de pantalla sigue bloqueado.

## 7. Ciclos v0.4 «Navigation & light» y v0.5 «Time & help» (abiertos y cerrados 2026-09-14; sin publicar)

Petición del propietario: aprender de brokenufo.com y clasicosbasicos.org (sus webs; temas BUFO y ClaBa de iNTERVOLUTIONS) e incluir megamenús, bordes recorridos por un destello, bordes que se iluminan al acercar el puntero, y heros súper espectaculares; después seguir hasta 0.5. Lo aprendido (ADR-033): panel de megamenú absoluto centrado con entrada por opacidad y traslación, superposición, `aria-expanded` + `inert`, tarjetas con arte y flecha, acordeón en móvil; líneas de exploración (`scan-h/v`, `hero-scan`), chispas (`brand-spark`), halos `--*-green-glow`, `backdrop-filter`, `perspective`; revelados con `IntersectionObserver`. Allí usan GSAP/ScrollTrigger; aquí todo es CSS y JS propio sin dependencias.

### v0.4 «Navigation & light» → `0.4.0-beta.0`

| Orden | Elemento | Contrato | Estado |
|---|---|---|---|
| 0 | Revisión adversaria (dos revisores Opus: componentes JS; web y CSS sin JS) y corrección de lo encontrado | — | hecho (17 fallos corregidos, ADR-034/035) |
| 1 | Megamenu (`megamenu`): hover intencional, teclado, superposición, acordeón en móvil, tarjetas | §8.9 | hecho (2026-09-14) |
| 2 | Efectos de borde y proximidad: `iv-edge-glint`, `iv-edge-near` + `Proximity`, `iv-scan`, `iv-spark`, `iv-pulse-glow`, `Reveal` | §8.10 | hecho (2026-09-14) |
| 3 | Hero (`iv-hero` y modificadores `--center/--split/--cinematic/--terminal`) | §8.11 | hecho (2026-09-14) |
| 4 | Web: páginas (megamenu, effects, hero) en dos idiomas, megamenú en la cabecera de la web, marcos de la home con proximidad; la home conserva su hero propio (identidad del sitio; `iv-hero` se muestra en su página) | — | hecho (2026-09-14) |
| 5 | Cierre: `verify`, Lighthouse, changelog `0.4.0-beta.0`, estado | — | hecho junto con v0.5 (un único gate y una única versión, `0.5.0-beta.0`) |

### v0.5 «Time & help» → `0.5.0-beta.0` (contratos por escribir al abrir el ciclo)

| Orden | Elemento | Notas |
|---|---|---|
| 1 | Datepicker (`datepicker`) sobre `<input type="date">`: calendario en popover, teclado por rejilla, `min`/`max`, locale por `lang` | §8.12; hecho (2026-09-14) |
| 2 | Tooltip y popover (`tooltip`, `popover`): `data-iv-tooltip`, atributo `popover` nativo como base, posicionamiento por espacio real (como el picker) | §8.13; hecho (2026-09-14) |
| 3 | Command palette (`command`): búsqueda de acciones con `/` o `Ctrl+K`, como en brokenufo.com; en la web convive con la búsqueda Pagefind (contenido) | §8.14; hecho (2026-09-14, ADR-038) |
| 4 | Constructor de temas en la web: editar tokens y exportar `tokens.css` | hecho (2026-09-14): `/foundations/theme-builder` en dos idiomas, previsualización viva sobre fixtures reales, CSS de personalización para copiar |
| 5 | Cierre `0.5.0-beta.0` | hecho (2026-09-14): `verify` en tres motores (590 unitarias, 713 navegador), Lighthouse 99–100, changelog, estado |

## 8. Ronda de revisión visual sobre `0.5.0-beta.0` (2026-09-14, ADR-039/040; sin publicar)

Petición del propietario: efectos de borde que no se perciben, megamenú que se cierra antes de entrar, contenido descentrado o apretado, un filete sin sentido bajo los títulos, columna estrecha; «lanza Playwright y ve la web como se ve de verdad», mejorar los docs brutalmente, mejorar el framework y usar imágenes libres para carruseles y heros.

| Orden | Elemento | Estado |
|---|---|---|
| 1 | Correcciones directas: halos en `iv-edge-near`/`iv-edge-glint`, megamenú que ignora ítems sin panel y tapa el hueco (320 ms), columna a 72rem, sin filete bajo el `h1` | hecho (ADR-039) |
| 2 | Fotografías libres (Unsplash vía Lorem Picsum, acreditadas) como activos de la web; fixtures con foto para carrusel, hero, tarjeta y cristal | hecho (ADR-039) |
| 3 | Rediseño de la web: escala vertical única, secciones numeradas, columna que llenan fixtures y tablas, heros con foto, pie con mapa del sitio, 404 útil; `qa-docs-overhaul.spec.js` | hecho (ADR-040) |
| 4 | Pulido visual del framework: 22 módulos CSS, defecto real del `--float` con selector enriquecido, desenfoque en `::backdrop` | hecho (ADR-040) |
| 5 | Cierre: líneas base visuales regeneradas, `verify` en tres motores, Lighthouse, estado | ver `PROJECT_STATE.md` |

Candidatos para 0.6 salidos de esta ronda (ADR-040): tokens de sombra ambiente, superficie de hover, borde de marca, halo de foco y tracking; `.iv-progress--lg`; `--iv-card-shadow` público; `Picker` que conserve la etiqueta como hermana; disparador declarativo para toast; agrupar la barra lateral de la web por familias.

## 9. Ciclo v0.6 «Structure» (abierto 2026-09-14) → `0.6.0-beta.0`

Petición del propietario: «sigue trabajando hasta 0.7». Lo que falta para montar una página de producto entera solo con el framework: una cabecera de sitio, un asistente por pasos para formularios largos, bloques de contenido (línea de tiempo, cifras, avatares) y los tokens que el pulido visual dejó como recetas repetidas.

| Orden | Elemento | Contrato | Responsable | Estado |
|---|---|---|---|---|
| 1 | Tokens de la capa expresiva (`shadow-ambient`, `hover-surface`, `primary-border`, `focus-halo`, `tracking-*`), `.iv-progress--lg`, `--iv-card-shadow`; refactor de los módulos que repiten las recetas | §8.15 | integrador (tokens) + implementador B (módulos) | hecho (2026-09-14, ADR-041) |
| 2 | Navbar (`navbar`): marca, enlaces, acciones, panel plegable, pegajoso y condensado, ocultar al bajar | §8.16 | implementador A | hecho (2026-09-14, ADR-041) |
| 3 | Stepper (`stepper`): índice con estado, paneles, siguiente/anterior con validación, `iv:complete` | §8.17 | implementador A | hecho (2026-09-14, ADR-041) |
| 4 | Toast declarativo (`data-iv-toast`) | §8.18 | implementador B | hecho (2026-09-14, ADR-041) |
| 5 | Contenido CSS: `iv-timeline`, `iv-stat`, `iv-avatar` | §8.19 | implementador B | hecho (2026-09-14, ADR-041) |
| 6 | Web: páginas en inglés y español (navbar, stepper, timeline, stat, avatar; toast y progress actualizadas), barra lateral agrupada por familia, `families` | — | implementador de docs | hecho (2026-09-14; 94 páginas) |
| 7 | Cierre `0.6.0-beta.0`: `verify` en tres motores, líneas base, Lighthouse, changelog, estado | — | integrador | hecho (2026-09-14) |

## 10. Ciclo v0.7 «Media & motion» (abierto 2026-09-14; contratos congelados en §8.20–§8.23) → `0.7.0-beta.0`

| Orden | Elemento | Contrato | Responsable | Estado |
|---|---|---|---|---|
| 1 | Lightbox (`lightbox`) sobre `Dialog`: galería de imágenes con teclado, gestos, zoom, pies y precarga | §8.20 | implementador A | hecho (2026-09-14, ADR-042) |
| 2 | Contador (`countup`): cifras servidas que cuentan al entrar en el viewport | §8.22 | implementador A | hecho (2026-09-14, ADR-042) |
| 3 | Movimiento por scroll (`motion.css` + `ScrollMotion`): `iv-parallax`, `iv-scroll-progress`, `iv-marquee`, `iv-stack-cards` con `animation-timeline` y fallback JS | §8.21 | implementador B | hecho (2026-09-14, ADR-042) |
| 4 | Texto (`text.css`): `iv-text-reveal`, `iv-text-glow`, `iv-text-outline`, `iv-text-shimmer` | §8.22 | implementador B | hecho (2026-09-14, ADR-042) |
| 5 | Web: páginas nuevas (lightbox, motion, text, countup) en dos idiomas y receta «showcase» (cuarta receta en `examples/recipes`, fotos ya acreditadas en su carpeta) | §8.23 | implementador de docs | hecho (2026-09-14; 102 páginas, receta en `examples/recipes/showcase`) |
| 6 | Cierre `0.7.0-beta.0`: `verify` en tres motores, líneas base, Lighthouse, changelog, estado | — | integrador | hecho (2026-09-14) |

## 11. Camino a 1.0 (abierto 2026-09-15): v0.8 «Hardening», v0.9 «Complete», `1.0.0-rc.0`

Petición del propietario: «sigue hasta 1.0 release candidate». Un candidato a 1.0 no añade familias: endurece, completa y congela. Sin publicar nada nuevo hasta el rc, que requiere su OTP.

### v0.8 «Hardening» → `0.8.0-beta.0`

| Orden | Elemento | Responsable | Estado |
|---|---|---|---|
| 1 | Revisión adversaria de los 24 componentes JS (teclado, foco, `destroy`, precedencia de opciones, eventos contra contrato, carreras, SSR por módulo) con corrección | revisor A (Opus) | abierto |
| 2 | Revisión adversaria de las 36 hojas: RTL (`dir="rtl"`) con capturas, `forced-colors` en todos los módulos (hoy 13 de 36), impresión, 320 px, `[hidden]`, especificidad | revisor B (Opus) | abierto |
| 3 | Emisión por módulo de `surfaces`, `effects`, `motion` y `text` en `dist/css`; cifras por módulo en `QUALITY.md` | integrador | abierto |
| 4 | Presupuesto de JS: medir importación por módulo y decidir por ADR (subir el umbral o recomendar módulos) | integrador | abierto |
| 5 | Receta showcase: portada con variante de 800 px para móvil (`<picture>`), LCP medido | integrador | abierto |
| 6 | Cierre: gate en tres motores, líneas base, Lighthouse, changelog, estado | integrador | abierto |

### v0.9 «Complete» → `0.9.0-beta.0`

| Orden | Elemento | Notas |
|---|---|---|
| 1 | Referencia completa generada de clases, tokens, atributos y eventos (una página por idioma, comprobada contra el CSS construido) | garantiza que nada público queda sin documentar |
| 2 | Página «Localisation»: todas las cadenas de texto de los componentes y cómo traducirlas por `data-iv-*` | sin JS nuevo |
| 3 | Candidatos aceptados: relevo por tarjeta en `iv-stack-cards`, `Picker` con etiqueta hermana, `.iv-dialog__title` en la hoja plana | los demás candidatos se descartan con motivo |
| 4 | Home de la web con solo los módulos que usa (o decisión razonada de no hacerlo) | Lighthouse móvil |
| 5 | Política de versiones y estabilidad (`docs/STABILITY.md`): qué es público, SemVer, deprecaciones, soporte de navegadores medido | requisito de 1.0 |
| 6 | Cierre `0.9.0-beta.0` | mismo gate |

### `1.0.0-rc.0`

| Orden | Elemento | Notas |
|---|---|---|
| 1 | Congelación del contrato para 1.0 (`API_CONTRACT.md` cabecera), changelog consolidado 0.1 → 1.0, avisos de la web «release candidate» | sin cambios de API salvo correcciones |
| 2 | Gate completo, Lighthouse, revisión final de capturas en tres anchos y dos temas | |
| 3 | Publicación `1.0.0-rc.0` con etiqueta `next` (requiere OTP del propietario) y etiqueta git | `latest` sigue en la beta hasta 1.0.0 |
