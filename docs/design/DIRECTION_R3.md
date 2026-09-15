# Dirección de diseño — ronda 3 («Power on, tuned»): web y ejemplos desde cero para 1.0

Estado: encargo abierto 2026-09-15 (ADR-047). Petición del propietario: «revamp TOTALLY the docs and examples, using the framework create tailored examples, really state-of-the-art, then revamp from scratch the docs, make it award winning — max effort». Sustituye la ejecución de R2; conserva su listón (ADR-027) y sus vetos (ADR-028: nunca rejillas ni patrones de puntos).

## 1. Diagnóstico de lo que hay (qué no repetir)

- La web documenta bien pero **no demuestra**: las fixtures se ven en un recuadro estático; no se puede cambiar tema, dirección, ancho ni movimiento sobre el propio ejemplo. Un visitante no siente que el framework «funcione» hasta que lo instala.
- Las páginas de componente son todas iguales (título, texto, recuadro, tabla): correctas, sin jerarquía visual entre lo que importa (el componente vivo) y lo accesorio (tablas).
- La home cuenta la historia con arte propio, pero el resto de la web usa una plantilla de documentación que no tiene la misma ambición: dos webs en una.
- Los ejemplos («landing», «catalog», «admin») son maquetas de 2019: rejilla de tarjetas, panel con barra lateral, texto de relleno. Solo «showcase» está a la altura.

## 2. Concepto

**El framework se demuestra a sí mismo.** Toda la web está construida solo con el paquete tal como se publica (más una hoja propia de la web para arte y maqueta). Cada componente se muestra en un **escenario vivo**: una página independiente del propio componente, embebida, con controles reales sobre ella (tema claro/oscuro, LTR/RTL, ancho móvil/tableta/escritorio, movimiento reducido, hoja plana). El visitante manipula, no lee.

Motivo visual: sigue siendo la electricidad (arco, filete conductor, verde eléctrico sobre carbono; en claro, verde profundo sobre papel). Se afina: menos efectos simultáneos, más escala tipográfica y más silencio; un solo momento espectacular por página (el escenario), no diez.

## 3. Arquitectura de la web

| Ruta | Qué es | Momento espectacular |
|---|---|---|
| `/` | Portada | Hero «Power on» (se conserva el canvas de arcos) + **escenario vivo** de 6 componentes que rotan en un mismo marco (pestañas de galería), tema y ancho cambiables; numerales con `Countup`; galería de ejemplos en marcos de dispositivo; bloque invertido «Start» |
| `/components/<x>` | Página de componente | Escenario a todo el ancho de la columna: fixture principal en iframe con barra de controles; código en pestañas (HTML servido / CSS locales / opciones JS) con copia; anatomía (lista de partes con líneas al escenario si cabe, si no, tabla); resto de fixtures como escenarios menores; tablas en `docs-scroller` |
| `/foundations/<x>` | Fundamentos | Tokens con muestras vivas (color, radio, sombra, tipo) que reaccionan al tema; escenarios donde aplique (superficies, efectos, movimiento, texto) |
| `/examples` | Galería de ejemplos | Cuatro piezas a tamaño grande en marcos de dispositivo (escritorio y móvil) con captura estática generada en el build y enlace a la página real; descarga del zip |
| `/reference`, `/foundations/localisation`, `/foundations/stability` | Referencia, localización, estabilidad | Se conservan; adoptan la plantilla nueva |
| `/playground`, `/foundations/theme-builder` | Herramientas | Se conservan; el constructor de temas se integra como control del escenario («aplicar mi tema al escenario») si cabe en el ciclo, si no, se mantiene |
| `/es/**` | Gemelas en español | Mismas plantillas; el contenido se traduce, no se resume |

Escenario (`Stage`): un `<iframe>` a una página estática generada en el build por fixture (`/stage/<familia>/<fixture>.html`, ruta dinámica de Astro que envuelve el HTML de `packages/ivolt/fixtures/**` y `apps/docs/fixtures/**` con `iv-root`, la hoja completa y `auto.js`), que lee `?theme=dark&dir=rtl&motion=reduce&flat=1` al cargar y aplica `data-iv-theme`, `dir`, una clase para forzar reduced motion (la hoja de la web añade `[data-stage-motion="reduce"]` que replica el bloque de reduced motion: sin animaciones ni transiciones) y la hoja plana. La barra de controles es un `iv-button-group` + `iv-tabs`-like segmentado; el ancho se cambia con `inline-size` del iframe (390 / 768 / 100 %) y transición; altura por `ResizeObserver` dentro del iframe (`postMessage` con la altura del documento). Sin JS el iframe se muestra a ancho completo con el tema de la web. Carga perezosa (`loading="lazy"`) salvo el principal.

## 4. Sistema visual de la web (hoja propia, sin tocar el paquete)

- Tipografía: Space Grotesk (ya local) para titulares a `clamp(2.75rem, 7vw, 6.5rem)` en páginas y `clamp(3.25rem, 11vw, 10.5rem)` en la home; texto de lectura con la fuente del sistema del paquete a 1.0625 rem, medida 68–72ch; numerales de sección en mono con contorno.
- Retícula: columna de lectura de hasta 76rem con escenario que puede **sangrar** al ancho del contenedor (`--docs-bleed`); barra lateral 15rem; índice 12rem; a < lg todo en una columna con la barra en un cajón (ya existe el `Drawer`).
- Superficies: nada de tarjetas con borde de 1px por defecto; el escenario tiene sombra de contacto y filete conductor; los bloques de código llevan borde superior luminoso.
- Movimiento: entradas por línea con máscara al entrar en vista (`Reveal` del paquete + `iv-text-reveal` para titulares), filete conductor una vez, transición de página con línea de luz (se conserva), `iv-edge-near` en los marcos de ejemplos; todo estático bajo reduced motion. Nunca más de un efecto en bucle por pantalla (el canvas del hero es el único).
- Tema claro diseñado (papel, verde profundo), no invertido.
- Iconografía: solo el isotipo y flechas/chevrones por máscara; sin biblioteca de iconos.

## 5. Ejemplos a medida (cuatro, sustituyen a landing, catalog y admin; showcase se retira a favor de estos)

| Receta | Qué demuestra | Composición |
|---|---|---|
| `studio` — estudio creativo | navbar transparente, hero cinematográfico con parallax, marquesina, tarjetas apiladas de servicios, galería con visor, equipo con avatares, línea de tiempo, stepper de contacto | fotografía a gran formato, tipografía display, ritmo editorial |
| `console` — panel de producto | navbar con megamenú, drawer lateral, cifras con contador, data table con filtro y orden, pestañas, progreso, esqueletos, toasts, diálogos, paleta de comandos (`Ctrl+K`), selector de fecha, formulario validado, cambio de tema | densidad controlada, oscuro por defecto, todo operable con teclado |
| `journal` — revista editorial | tipografía como protagonista, portada, masonry de artículos con fotos, efectos de texto, barra de lectura, visor, paginación, migas, tooltips y popovers para notas, impresión cuidada | claro por defecto, márgenes generosos, columnas |
| `store` — catálogo y compra | filtros con selector enriquecido y combobox, carrusel de producto, insignias, precios con stat, stepper de compra con fecha de entrega y validación, cajón de carrito (drawer), diálogo de confirmación, toast | claro/oscuro, componente denso de formulario, honesto: no se compra nada |

Reglas de los ejemplos: solo el paquete publicado (`../ivolt/css/ivolt.min.css` + `../ivolt/js/auto.js`) y una hoja propia mínima por receta para la maqueta; fotografías libres acreditadas en la carpeta de la receta (Lorem Picsum → Unsplash; copias de 1280 y 800 px; ≤ 1,5 MB por receta); textos honestos (marca ficticia declarada, nada se envía, nada se compra); un solo `h1`; sin scroll lateral de 320 a 1920 px; axe sin hallazgos; Lighthouse móvil ≥ 95 salvo justificación medida; marca temprana `data-iv-js` en `<head>` para el navbar (ADR-042); funcionan sin JS con todo el contenido accesible.

## 6. Límites técnicos (no negociables)

Los de R2 §6 íntegros (sin dependencias nuevas, sin recursos remotos, sin WebGL, sin cursor propio, sin scroll hijacking, sin rejillas), más: la web sigue en Astro estático con Pagefind e i18n por gemelas; `hreflang` y el fragmento de tema con hash CSP se conservan; toda página de componente sigue documentando por fixture (snippet, escenario y prueba salen del mismo archivo); `reference.test.js` debe seguir en verde (nada público sin documentar); las pruebas de la web se reescriben como una suite coherente (`tests/browser/site-*.spec.js`) que cubre lo mismo que las actuales (búsqueda, tema, copia, CSP, mapa del sitio, descargas, ambos idiomas, desbordamiento a 390/1024/1440, axe con reduced motion) más el escenario (controles, iframe, altura).

## 7. Aceptación

Capturas de cada ruta nueva a 1440×900 (completa), 1024×768 y 390×844, claro y oscuro, en ambos idiomas; los cuatro ejemplos a 1440, 1024 y 390, claro y oscuro; `IVOLT_ALL_BROWSERS=1 npm run verify` exit 0; Lighthouse en `/`, `/es`, una página de componente y los cuatro ejemplos; revisión adversaria visual de un revisor Opus con capturas antes del cierre; última palabra del propietario.
