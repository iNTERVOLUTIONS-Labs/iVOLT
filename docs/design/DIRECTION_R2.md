# Dirección de diseño de la web — ronda 2 («Voltage»)

Estado: encargo abierto 2026-09-14 (ADR-028). Sustituye la ejecución de ADR-027, no su listón: la web debe poder competir por un reconocimiento en Awwwards o CSS Design Awards. El propietario juzgó la ronda 1 «muy muy deficiente» y «genérica, web de 2010». Esta ronda no es un retoque: es otra web con el mismo contenido.

## 1. Diagnóstico de la ronda 1 (qué no repetir)

- Composición de plantilla: cabecera + hero a dos columnas + rejilla de tarjetas + lista + CTA centrado. Cualquier «starter» de Astro se ve igual.
- Rejilla de fondo (prohibida desde ahora; ADR-028), resplandores genéricos, tarjetas con borde de 1 px y radio de 12 px, iconos de trazo de 22 px: vocabulario de SaaS de 2019.
- Tipografía tímida: 5,5 rem máximo en el hero, títulos de sección de 3 rem, medida estrecha, sin contraste de escala entre elementos.
- Movimiento decorativo sin idea: entradas por palabra, flotación de chips, marquesina. Ninguno cuenta la historia de la marca (electricidad, voltaje, descarga).
- Todo del mismo color y densidad de principio a fin: no hay un solo momento de inversión, ni de escala, ni de silencio.

## 2. Concepto

**Power on.** La página es una losa de carbono que se energiza. Un único motivo visual gobierna todo: **el arco eléctrico** (el rayo del isotipo). Aparece como descarga en el hero, como línea conductora que recorre bordes al interactuar, como chispa en el logotipo del pie y como destello entre páginas. Paleta: carbono (`--iv-color-bg` oscuro), verde eléctrico (`#29F59A`, `--iv-color-accent`) con núcleo blanco, y un solo bloque invertido en verde con tipografía negra. Sin azul de relleno: el segundo resplandor azul de la ronda 1 desaparece.

## 3. Composición de la home (orden y comportamiento)

1. **Hero de pantalla completa (100svh en ≥ md; ≥ 85svh en móvil).** Titular gigante, `clamp(3.25rem, 11vw, 10.5rem)`, interlineado 0,88, Space Grotesk 500, alineado abajo a la izquierda con márgenes generosos. Entrada cinética por líneas: cada línea dentro de un contenedor con `overflow: hidden`, sube con `translateY(110%) → 0` y desfase de 90 ms; la última palabra («here.») lleva el verde eléctrico. A la derecha/arriba, el **campo de arcos**: un `<canvas>` 2D (no WebGL) con rayos ramificados que saltan entre puntos de anclaje próximos a los bordes y hacia la posición del puntero; núcleo blanco, halo verde con `globalCompositeOperation: "lighter"`, parpadeo breve y estela residual que se desvanece. Un clic o toque provoca una descarga mayor. Sin `prefers-reduced-motion` y sin puntero fino, el canvas se sustituye por un rayo SVG estático con halo. Debajo del titular: una línea de hechos medidos en el build (dependencias, CSS gzip, JS gzip, motores) con **contador ascendente** al entrar en vista, y dos botones (primario magnético: se desplaza hasta 6 px hacia el puntero dentro de un radio de 80 px).
2. **Medidor de voltaje.** Barra fija de 2 px en el borde superior (o vertical en el borde derecho en ≥ lg) con punta luminosa que representa el progreso de scroll; `animation-timeline: scroll()` con `@supports`, JS de respaldo.
3. **01 — Why.** Sección con columna izquierda pegajosa (título de sección enorme, numeral «01» con contorno de 1 px a 12 rem) y columna derecha con cuatro bloques de texto **sin tarjeta**: filete conductor a la izquierda que se ilumina al entrar en vista (de arriba abajo, como corriente que llega), título grande, párrafo. Nada de iconos de trazo.
4. **02 — Components: el gabinete.** Sección pegajosa de altura 300vh: mientras se hace scroll, una fila de paneles con **fixtures reales** (button, badge, alert, card, tabs, dialog abierto no modal, toast) se desplaza horizontalmente (`animation-timeline: scroll()`, respaldo JS). Cada panel es un marco con la previsualización viva, nombre y enlace. En móvil se convierte en un carrusel horizontal con `scroll-snap` sin pegajosidad. Debajo, lista completa de familias como texto grande con subrayado animado, no como rejilla de tarjetas.
5. **03 — Themes: el corte.** La misma fixture (`theme/nested`) renderizada dos veces, en `light` y `dark`, superpuestas; un divisor vertical sigue al puntero (`clip-path: inset()`), y es operable con un `<input type="range">` etiquetado para teclado y táctil. Titular «Scopes, not switches.» al lado, con el código como parte de la composición.
6. **04 — Recipes.** Tres piezas grandes apiladas (no en rejilla): marco con el iframe escalado a la izquierda o derecha alternando, título a 3–4 rem, texto y un enlace con flecha. Al pasar el puntero, el marco se inclina levemente y el iframe se desplaza 40 px hacia arriba (mirilla).
7. **05 — Start: el bloque invertido.** Fondo verde eléctrico de borde a borde, tipografía carbono, titular «Two files. No build step.» a la misma escala que el hero, código en carbono sobre verde, botones negros. Es el único bloque de color pleno de la página.
8. **Pie.** El logotipo oficial (lockup de `brand.js`) ocupando el ancho del contenedor, en contorno; al pasar el puntero, cada tramo se rellena y el rayo del isotipo parpadea una vez. Enlaces y aviso de alpha debajo, pequeños.

## 4. Sistema de efectos (todo `transform`/`opacity`/`clip-path` salvo el canvas)

- Entradas por línea con máscara (`overflow: hidden`), nunca por palabra flotante.
- Filetes conductores: una luz recorre un borde una vez al entrar en vista o al interactuar (ya existe `docs-pulse`; generalizar).
- Botones primarios magnéticos y con barrido de luz; enlaces de navegación con «rodillo» de letras (texto duplicado que sube al pasar el puntero).
- Selección de texto en verde (`::selection`), barra de scroll fina y oscura en motores WebKit/Blink.
- Transición entre páginas: además del fundido, una línea horizontal de luz que cruza la pantalla en 320 ms.
- Grano: opcional, película SVG `feTurbulence` ≤ 4 % de opacidad sobre el fondo, nunca sobre el texto; si perjudica el rendimiento, fuera.
- Tema claro diseñado, no invertido: papel `--iv-color-bg` claro, verde profundo `--iv-color-primary`, arcos en verde profundo con halo blanco, bloque invertido igual.

## 5. Páginas interiores (getting started, componentes, foundations)

- Cabecera de página: eyebrow con la familia (`css` / `js`), título a `clamp(2.5rem, 6vw, 5rem)`, párrafo introductorio a 1,25 rem, filete conductor debajo.
- Barra lateral con indicador activo que se desliza entre elementos (un solo `::before` posicionado con `--y` calculado en JS, transición de `transform`).
- Índice «On this page» con línea de progreso vertical que se rellena según el scroll.
- Previsualizaciones de fixtures: fondo liso con viñeta radial suave, **sin rejilla**; marco sin borde de 1 px: sombra de contacto y filete conductor superior.
- Bloques de código con borde superior luminoso, botón de copia integrado y `h2` con numeral pequeño en verde.

## 6. Límites técnicos (no negociables)

- Sin dependencias nuevas; sin recursos remotos; sin WebGL; sin cursor personalizado; sin scroll hijacking; sin rejillas ni patrones de puntos.
- Canvas: uno, solo en el hero de la home, `devicePixelRatio` ≤ 1,5, bucle activo solo con el hero visible (`IntersectionObserver`) y la pestaña visible; ≤ 3 ms por fotograma; se detiene y se retira en `astro:before-swap`.
- `prefers-reduced-motion`: sin animaciones ni canvas, composición completa y bella (nada queda oculto o desplazado).
- Hooks que las pruebas usan y deben conservarse: `#docs-search`, `#docs-search-input`, `#docs-search-results`, `#docs-search-status`, `#docs-nav`, `.docs-menu-toggle`, `.docs-header`, `.docs-prose`, `.docs-copy` (+ `data-copy-target`, `aria-describedby`), `.docs-anchor`, `[data-set-theme]`, `#main`, enlace de salto primero en `<body>`, `data-pagefind-*`, `aria-current` en navegación, `aria-label="iVOLT CSS, home"` en la marca, estructura de `.docs-fixture` (`__caption`, `__title`, `__path`, `__preview`, `__code`), el script `themeSnippet` inline y `ClientRouter`, `setup()` en `astro:page-load` idempotente.
- Lighthouse en `/` (móvil y escritorio): rendimiento ≥ 95, accesibilidad 100, prácticas recomendadas ≥ 96, SEO 100. Sin desplazamiento horizontal de 320 a 1920 px. axe sin hallazgos critical/serious.

## 7. Aceptación

Capturas a 1440×900 (página completa), 1366×610, 390×844, en oscuro, claro y con `prefers-reduced-motion`; suite `tests/browser/docs.spec.js` y `a11y.spec.js` en Chromium verde; Lighthouse registrado. Última palabra: revisión visual del propietario.
