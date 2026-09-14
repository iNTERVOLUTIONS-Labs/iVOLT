# iVOLT — Sistema de diseño

Estado: contrato de fase 0. Los valores aquí definidos pasan a `tokens/tokens.json` en fase 1 sin reinterpretación. Los contrastes se calcularon con la fórmula WCAG 2.x sobre los hex indicados (script de fase 0); se vuelven a medir sobre el CSS emitido.

## 1. Marca y arte

- Logo oficial en `assets/brand/`: `ivolt-logo-balanced.svg` (isotipo «O» partida con el rayo, wordmark iVOLT en trazados, etiqueta CSS y firma BY iNTERVOLUTIONS; marfil sobre transparente, pensado para fondos oscuros) e `ivolt-isotipo.svg`. Uso: cabecera de docs con marfil → `currentColor`, verde eléctrico → `--iv-color-primary` (sigue `#29F59A` en oscuro y pasa a `#0A6A43` en claro) y glifos de la etiqueta → `--iv-color-on-primary`, sin firma (ilegible por debajo de ~120 px), favicon con el isotipo sobre placa `#081310`, imagen OG con el lockup íntegro. Ver `assets/brand/README.md`.
- Carácter: potente, técnico, cuidado. Líneas finas, mucho aire, jerarquía fuerte, verde reservado para acción y acento. Nada de vídeo de fondo, partículas, WebGL, cursor propio ni ruido bajo texto.
- Mensaje: «The interface starts here.» seguido de un ejemplo real con su código, nunca de una lista de promesas.
- El framework no obliga a ser oscuro ni verde: el tema light es el predeterminado del paquete; la web de marca usa el dark.

## 2. Paleta primitiva (`--iv-palette-*`)

| Step | green | neutral (verde frío) |
|---|---|---|
| 50 | `#E8FDF3` | `#F3FAF6` (texto claro de marca) |
| 100 | `#C6F9E1` | `#E4EDE8` |
| 200 | `#93F3C6` | `#CBD8D1` |
| 300 | `#5CF0AE` | `#A9B9B1` |
| 400 | `#29F59A` (verde de marca) | `#90A49E` (secundario de marca) |
| 500 | `#14D882` | `#6E837B` |
| 600 | `#0FB56C` | `#56695F` |
| 700 | `#0B8A55` | `#3F4F47` |
| 800 | `#0A6A43` | `#263129` |
| 900 | `#084D32` | `#12201A` |
| 950 | `#04301F` | `#081310` (fondo de marca) |

Estado: `red-600 #B2262D`, `red-300 #FF7A80`, `amber-700 #8A5200`, `amber-300 #FFB84D`, `blue-600 #1D5FB8`, `blue-300 #6FB3FF`, y superficies sutiles `red-50 #FDECEC`, `amber-50 #FFF4E0`, `blue-50 #E8F1FD`.

## 3. Mapa semántico y contraste previsto

| Token | Light | Dark | Contraste (light / dark) |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#081310` | — |
| `surface` | `#F3FAF6` | `#12201A` | — |
| `surface-raised` | `#FFFFFF` + sombra | `#1B2C25` | — |
| `text` | `#12201A` | `#F3FAF6` | 16.8 / 17.8 |
| `text-muted` | `#56695F` | `#90A49E` | 5.9 / 7.2 (≥ 5.5 sobre surface) |
| `border` (decorativo) | `#CBD8D1` | `#263129` | no exigido |
| `border-strong` (controles) | `#6E837B` | `#6E837B` | 4.0 / 4.7 (≥ 3:1) |
| `primary` | `#0A6A43` | `#29F59A` | como texto sobre bg: 6.7 / 13.2 |
| `on-primary` | `#FFFFFF` | `#081310` | 6.7 / 13.2 |
| `primary-subtle` | `#E8FDF3` | `rgb(41 245 154 / .12)` | primary sobre subtle 6.3 / 10.2 |
| `primary-hover` | `#084D32` | `#5CF0AE` | 9.9 / 13.1 |
| `primary-active` | `#04301F` | `#14D882` | — / 10.1 |
| `accent` / `on-accent` | `#29F59A` / `#081310` | igual | 13.2 (botón de marca, no texto pequeño sobre blanco) |
| `success` / `on-success` | `#0A6A43` / `#FFFFFF` | `#29F59A` / `#081310` | texto sobre bg 6.7 / 13.2; on-* 6.7 / 13.2 |
| `success-subtle` | `#E8FDF3` | `rgb(41 245 154 / .12)` (≈ `#0C2E21` sobre bg) | success sobre subtle 6.3 / 10.2; text-muted sobre subtle 5.6 (dark) |
| `danger` / `on-danger` | `#B2262D` / `#FFFFFF` | `#FF7A80` / `#081310` | 6.6 / 7.5; on-* 6.6 / 7.5 |
| `danger-subtle` | `#FDECEC` | `rgb(255 122 128 / .12)` (≈ `#261F1D`) | 5.7 / 6.4 |
| `warning` / `on-warning` | `#8A5200` / `#FFFFFF` | `#FFB84D` / `#081310` | 6.4 / 11.0; on-* 6.4 / 11.0 |
| `warning-subtle` | `#FFF4E0` | `rgb(255 184 77 / .12)` (≈ `#262717`) | 5.9 / 8.8 |
| `info` / `on-info` | `#1D5FB8` / `#FFFFFF` | `#6FB3FF` / `#081310` | 6.2 / 8.6; on-* 6.2 / 8.6 |
| `info-subtle` | `#E8F1FD` | `rgb(111 179 255 / .12)` (≈ `#14262D`) | 5.5 / 7.1 |
| `focus` | `#0A6A43` | `#29F59A` | ≥ 3:1 sobre ambas superficies |
| `overlay` | `rgb(8 19 16 / .55)` | `rgb(0 0 0 / .6)` | — |

Fondo de medición: salvo indicación, cada ratio se mide sobre `bg`; el peor caso real es sobre `surface-raised`, donde `border-strong` queda en 3.6 (dark) y 3.8 sobre `surface` (light), ambos ≥ 3:1. Los tokens de estado que se usan como fondo sólido (`success`, `danger`, `warning`, `info`) llevan su `on-*`.

Decisión declarada: `primary`, `success` y `focus` comparten el verde (light `#0A6A43`, dark `#29F59A`) y en dark coinciden además con `accent`. Es intencional: el verde es el color de marca y de acción; éxito y foco se diferencian por forma (badge/alert con `success-subtle`, anillo de foco con offset), no por tono. Un consumidor que necesite distinguirlos redefine `--iv-color-success`.

Descartados con evidencia: `green-700 #0B8A55` como primario light (4.4:1 con blanco, insuficiente para texto AA) y `green-600` como anillo de foco en light (2.7:1).

## 4. Escalas

| Familia | Tokens | Valores |
|---|---|---|
| Espacio (`--iv-space-*`) | `0 1 2 3 4 5 6 8 10 12 16` | `0 .25 .5 .75 1 1.25 1.5 2 2.5 3 4` rem |
| Tipo (`--iv-text-*`) | `xs sm md lg xl 2xl 3xl 4xl` | `.75 .875 1 1.125 1.25 1.5` rem; `3xl clamp(1.75rem, 1.2rem + 1.5vw, 2.25rem)`; `4xl clamp(2.25rem, 1.5rem + 2.5vw, 3.5rem)` |
| Interlineado (`--iv-leading-*`) | `tight snug normal relaxed` | `1.1 1.25 1.5 1.65` |
| Peso (`--iv-weight-*`) | `normal medium semibold bold` | `400 500 600 700` |
| Fuentes (`--iv-font-*`) | `sans mono` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` · `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace` |
| Radio (`--iv-radius-*`) | `sm md lg full` | `.25 .5 .75 999` rem |
| Borde (`--iv-border-width`, `--iv-border-width-strong`) | — | `1px`, `3px` (acento de alert y toast) |
| Sombra (`--iv-shadow-*`) | `1 2 3` | light: `0 1px 2px rgb(8 19 16/.06)` … `0 12px 32px rgb(8 19 16/.14)`; dark: misma geometría con borde `surface-raised` y opacidad .4 |
| Foco | `--iv-focus-width 2px`, `--iv-focus-offset 2px`, `--iv-color-focus` | `outline: var(--iv-focus-width) solid var(--iv-color-focus); outline-offset: var(--iv-focus-offset)` solo en `:focus-visible` |
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

## 9. Capa expresiva del framework (ADR-030)

El framework debe impresionar por defecto, no solo funcionar. Principios de la capa expresiva:

- **Profundidad real:** cristal (`iv-glass`, `backdrop-filter` con fallback sólido), grano (`iv-texture-grain`), mallas de gradiente (`iv-texture-mesh`), aurora animada (`iv-texture-aurora`, estática con `prefers-reduced-motion`), bordes luminosos (`iv-glow`). Tokens: `--iv-glass-*`, `--iv-blur-*`, `--iv-glow-*`, `--iv-texture-grain-opacity`.
- **Movimiento con argumento:** transiciones de 400–700 ms con `--iv-ease-out`, entradas escalonadas, Ken Burns en medios del carrusel, chips que aparecen con escala, errores que sacuden una vez (`iv-shake`, 320 ms). Todo `transform`/`opacity`/`clip-path`; nada en bucle sin interacción salvo aurora, autoplay del carrusel y barra de progreso.
- **Estados con carácter:** foco con halo (`--iv-glow-primary`) además del anillo; inválido con color, icono y mensaje; válido con marca de verificación; cargando con shimmer.
- **Controles enriquecidos, HTML nativo debajo:** `<select>` servido bajo el selector enriquecido, `<textarea maxlength>` bajo el contador, `<form>` con atributos de validación bajo la validación, lista con `scroll-snap` bajo el carrusel.
- **Composición generosa:** radios `lg` en superficies grandes, sombras 2–3 en flotantes, contrastes AA en todas las superficies translúcidas (comprobados con axe sobre cristal en claro y oscuro).

Lo que no cambia: sin rejillas ni patrones de puntos (ADR-028), sin cursor propio, sin WebGL, sin recursos remotos, sin imágenes de mapa de bits en el paquete (texturas por gradiente o SVG en línea).
