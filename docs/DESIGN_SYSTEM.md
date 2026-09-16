# iVOLT — Sistema de diseño

Estado: contrato de fase 0. Los valores aquí definidos pasan a `tokens/tokens.json` en fase 1 sin reinterpretación. Los contrastes se calcularon con la fórmula WCAG 2.x sobre los hex indicados (script de fase 0); se vuelven a medir sobre el CSS emitido.

## 1. Marca y arte

- Logo oficial en `assets/brand/`: `ivolt-logo-balanced.svg` (isotipo «O» partida con el rayo, wordmark iVOLT en trazados, etiqueta CSS y firma BY iNTERVOLUTIONS; marfil sobre transparente, pensado para fondos oscuros) e `ivolt-isotipo.svg`. Uso: cabecera de docs con marfil → `currentColor`, verde eléctrico → `--iv-color-primary` (sigue `#29F59A` en oscuro y pasa a `#0A6A43` en claro) y glifos de la etiqueta → `--iv-color-on-primary`, sin firma (ilegible por debajo de ~120 px), favicon con el isotipo sobre placa `#081310`, imagen OG con el lockup íntegro. Ver `assets/brand/README.md`.
- Carácter: potente, técnico, cuidado. Líneas finas, mucho aire, jerarquía fuerte, verde reservado para acción y acento. Nada de vídeo de fondo, partículas, WebGL, cursor propio ni ruido bajo texto.
- Mensaje: «The interface starts here.» seguido de un ejemplo real con su código, nunca de una lista de promesas.
- El framework no obliga a ser oscuro ni verde: el tema light es el predeterminado del paquete; la web de marca usa el dark.

## 2. Paleta primitiva (`--iv-palette-*`) — «Cobalt», desde 1.0.0-rc.2 (ADR-049)

El verde de las betas se retira. El propietario pidió que el paquete arranque con los colores de intervolutions.com y sirva de base a intervolutions.com, brokenufo.com y clasicosbasicos.org. Extraído de la hoja de intervolutions.com (2026-09-16): fondos `#04070F`, `#070D1C`, `#0C1330`; marca `#66B1FF` (cobalto) y `#73DFFF` (cian); índigo `#6674FF`/`#8B95FF`; coral `#FF665C` (el punto de la marca); ámbar `#FBBF24`; lima `#8BBF3A` como «ok»; degradados `#73DFFF → #6695FF` y `#8FE3FF → #66B1FF → #6D93FF`; tipografía Outfit (OFL).

| Tono | Pasos | Uso |
|---|---|---|
| `neutral` (tintado de azul marino) | `0 50 100 200 300 400 500 600 700 800 900 950 1000` = `#FFFFFF #F5F7FC #E9EDF7 #D3DAEA #B3BDD4 #8F9BB8 #6B7896 #4F5B7A #33406A #1C2544 #0C1330 #070D1C #04070F` | fondos, superficies, bordes, texto |
| `cobalt` | `50…950` = `#EAF4FF #D6E9FF #B3D6FF #8FC6FF #66B1FF #3D94FF #2266D8 #1D4FC4 #1A3FA8 #172F7A #0F1D4D` | primario (`400` en oscuro, `700` en claro), foco en claro |
| `cyan` | `50…950` = `#E6FBFF #CDF6FF #A6EFFF #8FE3FF #73DFFF #3FCDF5 #17AAD6 #0E8AB0 #0B6B8A #094D63 #052F3D` | acento (`400` en oscuro, `800` en claro), foco en oscuro, brillos |
| `indigo` | `50…950` = `#EEF0FF #DFE2FF #C2C8FF #A4ADFF #8B95FF #6674FF #4F5BE6 #3D47C2 #313996 #262C6E #171A45` | info, segundo tono de los degradados, halos |
| `green` | `50 300 400 700 800` = `#F1F8E4 #C6E28A #8BBF3A #4F7A12 #3F6110` | solo `success` |
| `red` | `50 300 500 600 700` = `#FFF1F0 #FF9AA4 #FF665C #D63A31 #B52D26` | `danger`; `500` es el coral de la marca (decorativo) |
| `amber` | `50 300 400 700` = `#FFF8E6 #FFE9A8 #FBBF24 #8F5C00` | `warning` |

Los tonos `blue` y el `green` de once pasos de las betas desaparecen; `--iv-palette-green-*` conserva solo los cinco pasos de éxito.

## 3. Mapa semántico y contraste medido

| Token | Light | Dark | Contraste medido (WCAG) |
|---|---|---|---|
| `bg` / `surface` / `surface-raised` | `#FFFFFF` / `#F5F7FC` / `#FFFFFF` | `#04070F` / `#070D1C` / `#0C1330` | — |
| `text` / `text-muted` | `#0B1230` / `#4F5B7A` | `#EEF2FB` / `#A8B3CC` | 18,4 y 6,8 sobre blanco; 18,0 y 9,6 sobre `#04070F` (8,7 sobre la superficie elevada) |
| `border` / `border-strong` | `#D3DAEA` / `#6B7896` | `#1C2544` / `#6B7896` | strong 4,4 (claro) y 4,6 (oscuro): ≥ 3 para controles |
| `primary` / `on-primary` | `#1D4FC4` / blanco | `#66B1FF` / `#06122B` | 7,1 (claro) y 8,9 (oscuro; 8,1 sobre elevada); texto sobre primario 7,1 y 8,2 |
| `primary-hover` / `primary-active` / `primary-subtle` | `#1A3FA8` / `#172F7A` / `#EAF4FF` | `#8FC6FF` / `#3D94FF` / cobalto al 12 % | — |
| `accent` / `on-accent` | `#0B6B8A` / blanco | `#73DFFF` / `#06122B` | 5,5 (claro), 13,2 (oscuro) |
| `success` / `danger` / `warning` / `info` | `#4F7A12` / `#D63A31` / `#8F5C00` / `#3D47C2` | `#8BBF3A` / `#FF9AA4` / `#FBBF24` / `#8B95FF` | claro 5,1 / 4,7 / 5,0 / 7,3; oscuro 9,2 / 10,0 / 12,1 / 7,5; `on-*` blanco en claro y `#06122B` en oscuro |
| `focus` | `#1D4FC4` | `#73DFFF` | anillo de 2 px + halo `--iv-focus-halo` (cobalto 35 % / 45 %) |
| `overlay` / `hover-surface` / `primary-border` | `rgb(11 18 48 / .55)` / `.04` / cobalto `.55` | `rgb(2 5 12 / .65)` / blanco azulado `.05` / cobalto `.5` | — |
| `glow-primary` / `glow-secondary` | cobalto `.35` / cian `.3` | cobalto `.45` / cian `.4` | halos de foco, botones y bordes luminosos |
| `gradient-brand` / `gradient-primary` (nuevos) | cian oscuro → cobalto / cian → cobalto → índigo | `#73DFFF → #6674FF` / `#8FE3FF → #66B1FF → #8B95FF` | botón primario, texto degradado, filetes |
| `glass-*` | blanco `.55`/`.78`, borde `.65`, brillo `.9` | azul marino `.5`/`.78`, borde blanco `.1`, brillo `.18` | superficies de cristal |

Las cifras salen de `scripts`-menos: se calcularon con la fórmula WCAG 2.x sobre los valores de la tabla al escribir esta sección (2026-09-16); axe las vuelve a comprobar en cada fixture del gate.

## 4. Escalas

| Familia | Tokens | Valores |
|---|---|---|
| Espacio (`--iv-space-*`) | `0 1 2 3 4 5 6 8 10 12 16` | `0 .25 .5 .75 1 1.25 1.5 2 2.5 3 4` rem |
| Tipo (`--iv-text-*`) | `xs sm md lg xl 2xl 3xl 4xl` | `.75 .875 1 1.125 1.25 1.5` rem; `3xl clamp(1.75rem, 1.2rem + 1.5vw, 2.25rem)`; `4xl clamp(2.25rem, 1.5rem + 2.5vw, 3.5rem)` |
| Interlineado (`--iv-leading-*`) | `tight snug normal relaxed` | `1.1 1.25 1.5 1.65` |
| Peso (`--iv-weight-*`) | `normal medium semibold bold` | `400 500 600 700` |
| Fuentes (`--iv-font-*`) | `sans mono` | `"Outfit", "Outfit Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (Outfit, OFL, la sirve la web y las recetas en local; el paquete no incluye archivos de fuente y cae a la del sistema) · `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace` |
| Radio (`--iv-radius-*`) | `sm md lg full` | `.375 .875 1.375 999` rem (6, 14 y 22 px, como los teclados, campos y tarjetas de intervolutions.com; los botones son píldora) |
| Borde (`--iv-border-width`, `--iv-border-width-strong`) | — | `1px`, `3px` (acento de alert y toast) |
| Sombra (`--iv-shadow-*`) | `1 2 3 ambient` (`ambient` desde v0.6: reposo de tarjetas y tablas, con anillo en oscuro) | light: `0 1px 2px rgb(8 19 16/.06)` … `0 12px 32px rgb(8 19 16/.14)`; dark: misma geometría con borde `surface-raised` y opacidad .4 |
| Foco | `--iv-focus-width 2px`, `--iv-focus-offset 2px`, `--iv-color-focus` | `outline: var(--iv-focus-width) solid var(--iv-color-focus); outline-offset: var(--iv-focus-offset)` solo en `:focus-visible` |
| Tracking (`--iv-tracking-*`, v0.6) | `tight caps` | `-0.011em` (títulos), `0.06em` (versalitas) |
| Halo de foco (`--iv-focus-halo`, v0.6) | — | `0 0 0 4px` sobre `--iv-glow-primary`, siempre junto al anillo |
| Z-index (`--iv-z-*`) | `dropdown drawer dialog toast` | `100 200 300 400` (dialog nativo usa top layer; el token ordena los fallbacks) |
| Movimiento (`--iv-motion-*`) | `fast base slow` | `120ms 180ms 220ms`; `--iv-ease-out: cubic-bezier(.2,.7,.2,1)` |
| Medidas | `--iv-measure 68ch`, `--iv-content-max 90rem` (1440px), `--iv-container-max 75rem` | — |
| Breakpoints | `sm md lg xl 2xl` | `30 48 64 80 90` em |

`prefers-reduced-motion: reduce` fija `--iv-motion-*: 0ms` y desactiva transformaciones; los estados siguen siendo completos. `prefers-contrast: more` refuerza `border` a `border-strong`.

## 5. Estados de componente

Cada componente define en su CSS: `default`, `hover` (solo `@media (hover: hover)`), `active`, `focus-visible`, `disabled` (`opacity .55`, `cursor: not-allowed`, sin cambio de color de fondo para conservar contraste legible), `loading` (`aria-busy`, spinner CSS de 1em, texto conservado), `error` (formularios: `aria-invalid="true"` + `border-color: danger` + mensaje `iv-field__error` con `id` enlazado por `aria-describedby`). Los tamaños de objetivo interactivo son ≥ 24×24 CSS px; los botones estándar miden 40px de alto y `--sm` 32px.

## 6. Composición

- Landing (rediseño 2026-09-14, ADR-027): la web arranca en tema oscuro; fondo con campo eléctrico (rejilla enmascarada y dos resplandores radiales prerrenderizados que derivan lentamente), cabecera translúcida con filete conductor, hero de dos columnas en ≥ lg con titular de gran formato en Space Grotesk (entrada palabra a palabra, acento con brillo), demo viva con inclinación 3D al puntero, resplandor y chips flotantes, cifras medidas en build; marquesina de tokens; secciones numeradas con revelado escalonado; tarjetas con foco de luz que sigue al puntero; recetas en marcos escalados; CTA con resplandor; pie con marca fantasma; transiciones de vista entre páginas. En ≤ 720 px de alto el hero se compacta para que las cifras queden sobre el pliegue a 1366×610. Todo el movimiento desaparece con `prefers-reduced-motion` dejando la misma composición.
- Docs: rejilla `sidebar 16rem | lectura 68ch | índice 14rem` en ≥ xl; sin índice en lg; sidebar en drawer en < lg.
- Detalle memorable («light pulse»): al pasar el foco o el puntero sobre el demo del hero, un segmento luminoso de ~120px recorre una vez el borde superior en 600ms usando un `conic-gradient` enmascarado; no se repite en bucle, no existe en otros paneles y se elimina con reduced-motion.
- Tipografía docs: Space Grotesk (OFL, variable, subconjunto latino de 22 KB servido en local con `font-display: swap`) para titulares, navegación y botones de la web; cuerpo y todo el paquete en `system-ui`. Registrada en `SOURCES.md` y `THIRD_PARTY.md`.

## 7. Lámina de referencia

`docs/design/brand-board.html` muestra en una sola dirección visual: wordmark, paleta con contrastes, tipografía, botones y estados, input con estados, card, boceto de hero responsive y el light pulse, con conmutador light/dark. Su CSS es provisional y no se copia al paquete; la web definitiva consume componentes reales.

## 8. Listón de diseño de la web (ADR-027)

Objetivo declarado: la web debe poder competir por un reconocimiento en Awwwards, CSS Design Awards o galerías equivalentes. Criterios con los que se juzga cada entrega, en el orden en que los evalúa un jurado de ese tipo:

| Criterio | Qué exigimos | Cómo se comprueba |
|---|---|---|
| Diseño | identidad propia (electricidad, voltaje, verde sobre carbón), tipografía de gran formato con una geométrica de marca (Space Grotesk, OFL, servida en local), composición asimétrica y capas de profundidad; nada que parezca plantilla | revisión visual con capturas a 1366×610, 1440 y 390 en claro y oscuro |
| Creatividad | hero con campo eléctrico animado, bordes conductores que se iluminan al interactuar, foco de luz que sigue al puntero en tarjetas, marquesina de tokens, transiciones de página, revelados escalonados al hacer scroll, demo viva con inclinación 3D | cada efecto listado existe y responde; ninguno se repite en bucle sin interacción salvo el campo del hero |
| Usabilidad | todo lo anterior sin bloquear la lectura: navegación por teclado, búsqueda, tema, copia, TOC; `prefers-reduced-motion` desactiva el movimiento y deja una experiencia completa y bella | pruebas de docs y axe; captura con reduced-motion |
| Contenido | ejemplos reales del framework, datos medidos, sin promesas vacías | contratos de snippets y honestidad documentados |
| Rendimiento | solo `transform`/`opacity` animados, gradientes prerrenderizados en vez de `filter: blur` animado, fuentes ≤ 30 KB, Lighthouse ≥ 95 en rendimiento en las rutas medidas | `docs/LIGHTHOUSE.md` |

Efectos vetados por contrato: vídeo de fondo, partículas pesadas, WebGL obligatorio, cursor personalizado, ruido que reduzca la legibilidad, scroll hijacking, y **cualquier rejilla o patrón de cuadrícula/puntos de fondo** (en la página, en el hero, en tarjetas o en las previsualizaciones de fixtures) salvo que el propietario la pida explícitamente en ese encargo (ADR-028, 2026-09-14). La profundidad se consigue con luz, capas, tipografía y movimiento.

Revisión del propietario (2026-09-14) tras el primer rediseño: «muy muy deficiente». Segunda ronda con dirección concreta en `docs/design/DIRECTION_R2.md`; el criterio de aceptación sigue siendo el de la tabla, más la revisión visual del propietario. Ronda 2 implementada el mismo día (ADR-029): hero 100svh con arcos en canvas 2D, secciones sin tarjetas, gabinete pegajoso, corte de temas, bloque invertido y lockup a todo el ancho; Lighthouse 100/100/100/100 en `/` y `/es` (`LIGHTHOUSE.md`). Pendiente: aceptación visual del propietario.

Tercera ronda (2026-09-14, ADR-039/040), tras la segunda revisión del propietario: las páginas interiores usan una sola escala vertical declarada en `apps/docs/src/styles/base.css` con cuatro pasos (`--docs-flow` entre párrafos, `--docs-block` alrededor de fixtures, tablas y código, `--docs-sub` antes de un `h3`, `--docs-section` antes de un `h2`, que lleva numeral y filete), medida de párrafo `--docs-measure: 74ch` y una columna de lectura que fixtures, tablas y bloques de código llenan por completo (≥ 820 px a 1440). Es una escala de la web, no del framework: no añade tokens `--iv-space-*`. La mide `tests/browser/qa-docs-overhaul.spec.js` a 390, 1024 y 1440 en ambos idiomas.

## 9. Capa expresiva del framework (ADR-030)

El framework debe impresionar por defecto, no solo funcionar. Principios de la capa expresiva:

- **Profundidad real:** cristal (`iv-glass`, `backdrop-filter` con fallback sólido), grano (`iv-texture-grain`), mallas de gradiente (`iv-texture-mesh`), aurora animada (`iv-texture-aurora`, estática con `prefers-reduced-motion`), bordes luminosos (`iv-glow`). Tokens: `--iv-glass-*`, `--iv-blur-*`, `--iv-glow-*`, `--iv-texture-grain-opacity`.
- **Movimiento con argumento:** transiciones de 400–700 ms con `--iv-ease-out`, entradas escalonadas, Ken Burns en medios del carrusel, chips que aparecen con escala, errores que sacuden una vez (`iv-shake`, 320 ms). Todo `transform`/`opacity`/`clip-path`; nada en bucle sin interacción salvo aurora, autoplay del carrusel y barra de progreso.
- **Estados con carácter:** foco con halo (`--iv-glow-primary`) además del anillo; inválido con color, icono y mensaje; válido con marca de verificación; cargando con shimmer.
- **Controles enriquecidos, HTML nativo debajo:** `<select>` servido bajo el selector enriquecido, `<textarea maxlength>` bajo el contador, `<form>` con atributos de validación bajo la validación, lista con `scroll-snap` bajo el carrusel.
- **Composición generosa:** radios `lg` en superficies grandes, sombras 2–3 en flotantes, contrastes AA en todas las superficies translúcidas (comprobados con axe sobre cristal en claro y oscuro).

Lo que no cambia: sin rejillas ni patrones de puntos (ADR-028), sin cursor propio, sin WebGL, sin recursos remotos, sin imágenes de mapa de bits en el paquete (texturas por gradiente o SVG en línea).
