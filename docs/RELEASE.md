# Release: `1.0.0` publicada (2026-09-16) y versiones anteriores

Estado: **`1.0.0` en `latest`**; las secciones §0a–§0j registran cada publicación y cada cierre sin publicar. Hitos: `ROADMAP.md` §5 (v0.2), §6 (v0.3), §7 (v0.4 y v0.5).

## 0j. `1.0.0` (publicada el 2026-09-16 con etiqueta `latest`; primera estable, ADR-051)

Primera estable. Desde rc.3: corrección del constructor de temas de la web (la vista previa no seguía el radio de tema), ronda de redacción con dos redactores Opus (web en dos idiomas, README del paquete y raíz, starter y recetas: voz comercial, aviso de honestidad una vez por página, SEO en títulos, descripciones, `alt`, `hreflang` y JSON-LD), metadatos del paquete, contrato y `STABILITY.md` en vigor. Portada de `/examples` en tres tamaños. Gate final en tres motores: 1039 unitarias · 1545 pruebas de navegador superadas y 147 omitidas · tamaños dentro de presupuesto (`ivolt.min.css` 32,1 KiB gzip, JS 45,2) · pack-smoke (`intervolutions-ivolt-1.0.0.tgz`, 134 archivos) · 108 páginas · 5 ejemplos · Lighthouse `docs/LIGHTHOUSE.md` (1.0.0). Publicación con el token del propietario en un `userconfig` temporal borrado tras el comando: `npm publish --access public --tag latest -w @intervolutions/ivolt`; `next` movida a `1.0.0` (`npm dist-tag add`); `dist-tags`: `latest` y `next` en `1.0.0`, `beta` en `0.7.0-beta.0`; etiqueta git `v1.0.0`; instalación verificada desde el registro.

## 0i. `1.0.0-rc.3` (publicada el 2026-09-16 con etiqueta `next`; ronda adversaria visual, ADR-050)

Cuarto candidato: dos incidencias del propietario (esquinas rectas del pie de tarjeta bajo efectos de borde; anillos serrados en Chromium con GPU en Windows por sombras con extensión y desenfoque 0) y una ronda adversaria visual con dos revisores y dos implementadores Opus: 33 tareas sobre el paquete, la web y las recetas, con todos los colores nuevos medidos (`A11Y_REVIEW.md` §17). Tokens: borde oscuro `neutral.700`, velo oscuro `.78`, degradados claros cobalto → índigo, halo de foco suavizado; nombres sin cambio. Gate final en tres motores: 1039 unitarias · 1545 pruebas de navegador superadas y 147 omitidas · tamaños dentro de presupuesto (`ivolt.min.css` 32,1 KiB gzip, JS 45,2) · pack-smoke (`intervolutions-ivolt-1.0.0-rc.3.tgz`, 134 archivos) · 108 páginas · 5 ejemplos · Lighthouse `docs/LIGHTHOUSE.md` (rc.3). Publicación con el token del propietario en un `userconfig` temporal borrado tras el comando: `npm publish --access public --tag next -w @intervolutions/ivolt` (134 archivos, 709 kB empaquetados); `dist-tags`: `latest` y `beta` en `0.7.0-beta.0`, `next` en `1.0.0-rc.3`; etiqueta git `v1.0.0-rc.3`; instalación verificada desde el registro (`@next`: versión `1.0.0-rc.3`, filete oscuro `#33406A` en la hoja minificada).

## 0h. `1.0.0-rc.2` (publicada el 2026-09-16 con etiqueta `next`; rediseño Cobalt, ADR-049)

Tercer candidato: la paleta por defecto pasa del verde a los colores de intervolutions.com (tokens medidos, degradados de marca, radios 6/14/22, Outfit primero en la pila), el paquete adopta los tratamientos de referencia (botones píldora con degradado y halo, tarjetas translúcidas, campos de 14 px, `kbd` cian), la web, la lámina de marca, la imagen OG, las fixtures con arte y las cuatro recetas se recolorean, y las recetas sirven Outfit. Gate final en tres motores: 1037 unitarias · 1540 pruebas de navegador superadas y 147 omitidas en la pasada completa, más los dos specs con supuestos de la paleta anterior (esquina de 22 px del selector, precisión de color en WebKit) corregidos y repetidos en verde (60/60) · tamaños dentro de presupuesto (`ivolt.min.css` 31,8 KiB gzip, JS 45,0) · pack-smoke (`intervolutions-ivolt-1.0.0-rc.2.tgz`, 134 archivos) · 205 páginas · 5 ejemplos · Lighthouse `docs/LIGHTHOUSE.md` (rc.2). Cambio de ruptura solo para la beta: `--iv-palette-green-*` de once pasos y `--iv-palette-blue-*` retirados. Publicación con el token del propietario en un `userconfig` temporal borrado tras el comando: `npm publish --access public --tag next -w @intervolutions/ivolt` (134 archivos, 700 kB empaquetados); `dist-tags`: `latest` y `beta` en `0.7.0-beta.0`, `next` en `1.0.0-rc.2`; etiqueta git `v1.0.0-rc.2`; instalación verificada desde el registro (`@next`: versión `1.0.0-rc.2`, 37 exportaciones, primario claro `#1D4FC4` en la hoja minificada y ningún literal verde).

## 0g. `1.0.0-rc.1` (publicada el 2026-09-16 con etiqueta `next`)

Segundo candidato: megamenú v2 reconstruido de cero (ADR-048) y endurecido por revisión adversaria, más la ronda 3 de la web y los ejemplos (ADR-047) integrada por la otra sesión. Gate final en tres motores con tres workers (1037 unitarias, 1545 pruebas de navegador, pack-smoke, 201 páginas, 5 ejemplos). Publicación con el token del propietario en un `userconfig` temporal borrado tras el comando: `npm publish --access public --tag next -w @intervolutions/ivolt` (134 archivos); `dist-tags`: `latest` y `beta` en `0.7.0-beta.0`, `next` en `1.0.0-rc.1`; etiqueta git `v1.0.0-rc.1`; instalación verificada desde el registro (`@next`, ESM, 24 componentes).

## 0f. `1.0.0-rc.0` (publicada el 2026-09-15 con etiqueta `next`)

Publicación ejecutada con autorización del propietario y su token granular (sin OTP), cargado en un `userconfig` temporal borrado tras el comando: `npm publish --access public --tag next -w @intervolutions/ivolt` (134 archivos, shasum `d6e6e80e…`); `dist-tags`: `latest` y `beta` en `0.7.0-beta.0`, `next` en `1.0.0-rc.0`; etiqueta git `v1.0.0-rc.0` en origin; instalación verificada en un consumidor limpio (`npm install @intervolutions/ivolt@next`, importación ESM, 24 componentes). Pasos que se siguieron:

1. Contrato congelado (`docs/API_CONTRACT.md` cabecera) y `docs/STABILITY.md` definitivo; changelog consolidado 0.1 → 1.0; avisos de la web «release candidate».
2. Versión `1.0.0-rc.0` en `packages/ivolt/package.json`, `src/js/index.js` y `apps/docs/package.json`; `npm install` para el lockfile.
3. `IVOLT_ALL_BROWSERS=1 npm run verify`, Lighthouse, capturas finales en tres anchos y dos temas.
4. Publicación con autorización y OTP o token del propietario: `npm publish --access public --tag next -w @intervolutions/ivolt`; `latest` sigue en `0.7.0-beta.0` hasta `1.0.0`; etiqueta git `v1.0.0-rc.0`.
5. Tras publicar: página de inicio con `npm install @intervolutions/ivolt@next`, README, `PROJECT_STATE.md`.

## 0e. Notas de versión 0.8.0-beta.0 y 0.9.0-beta.0 (cerradas el 2026-09-15, sin publicar) y plan de `1.0.0-rc.0`

**0.8 «Hardening»** (ADR-044/045): dos revisiones adversarias (JS y CSS) con 19 defectos corregidos y probados: DOM idéntico tras `destroy`, foco inicial correcto, RTL en ocho módulos, colores forzados, impresión, 320 px; módulos raíz sueltos, costes por módulo, portada de la receta en 800 px. **0.9 «Complete»** (ADR-046): relevo por tarjeta, etiqueta hermana del selector, hoja plana igualada, todas las cadenas configurables, referencia generada con prueba de contrato, páginas de localización y estabilidad. Ninguna de las dos se publica: la siguiente publicación es `1.0.0-rc.0` con etiqueta `next` (`latest` sigue en `0.7.0-beta.0` hasta `1.0.0`), que requiere el OTP o un token del propietario, la congelación del contrato y el gate completo.

## 0d. Notas de versión 0.7.0-beta.0 (publicada el 2026-09-14)

**0.7 «Media & motion»** (ADR-042): **Lightbox** (galería en rejilla, masonry o tira; visor a pantalla completa sobre el diálogo con teclado, gesto, zoom, pies, contador y precarga), **movimiento por scroll** (`motion.css`: parallax, barra de lectura, marquesina, tarjetas apiladas con animaciones dirigidas por scroll y `ScrollMotion` como reserva para navegadores sin ellas), **texto** (`text.css`: revelado por líneas, brillo, contorno, destello) y **Countup** (cifras servidas que cuentan al entrar, formateadas por `Intl`), más la receta **showcase** con fotografías propias acreditadas. Todo estático bajo reduced motion salvo la barra de lectura, que es estado. Tamaños: CSS 28,1 KiB, JS 42,8 KiB gzip (presupuestos 40 y 48).

Publicación ejecutada el 2026-09-14 con autorización expresa del propietario (ADR-043): etiqueta git `v0.7.0-beta.0` sobre `16506f9`, `npm publish --access public --tag beta -w @intervolutions/ivolt` (128 archivos, 634 KB, shasum `9b7d512b…`). npm asigna `latest` a la primera versión publicada de un paquete y no admite un paquete sin `latest`, así que hoy `latest` y `beta` apuntan a `0.7.0-beta.0`; la primera versión estable moverá `latest`. Instalación verificada desde el registro en un consumidor limpio (`npm install @intervolutions/ivolt@beta`, importación ESM, 24 componentes).

## 0c. Notas de versión 0.6.0-beta.0 (borrador)

**0.6 «Structure»** (ADR-041): **Navbar** (cabecera con marca, enlaces y acciones que se pliega bajo un breakpoint, pegajosa y condensada con cristal, ocultable al bajar, transparente sobre un hero hasta condensarse, con megamenú alojado), **Stepper** (asistente por pasos con índice, validación por `Form` o por la API nativa antes de avanzar, teclado, línea de progreso e `iv:complete`), bloques **timeline, stat y avatar** en CSS, **toast declarativo** (`data-iv-toast`), seis **tokens** nuevos (sombra ambiental, superficie de hover, contorno de marca, halo de foco, tracking) consumidos por once módulos, `.iv-progress--lg`, locales públicos de sombra en la tarjeta. Cambios: `--iv-progress-height` pasa a `--iv-progress-size`; las tarjetas se elevan al hover; el contorno del botón secundario usa el token de marca; incluye el pulido de 22 módulos y el desenfoque del backdrop de ADR-040. Tamaños: CSS 25,6 KiB, JS 39,0 KiB gzip.

Pasos de publicación, cuando se autorice: `npm version 0.6.0-beta.0 --no-git-tag-version -w @intervolutions/ivolt` (ya es la versión actual), etiqueta git `v0.6.0-beta.0`, `npm publish --access public --tag beta`; el resto igual que §3.

## 0b. Notas de versión 0.4.0-beta.0 y 0.5.0-beta.0 (borrador)

**0.4 «Navigation & light»**: revisión adversaria (dos revisores Opus, diecisiete defectos corregidos con pruebas: ADR-034/035), **Megamenu**, **efectos** (`iv-edge-glint`, `iv-edge-near` + `Proximity`, `iv-scan`, `iv-spark`, `iv-pulse-glow`, `Reveal`) y **Hero**; el megamenú vive también en la cabecera de la web. **0.5 «Time & help»**: **Datepicker**, **Tooltip** y **Popover**, **Command palette** y el **constructor de temas** de la web. Presupuesto de JS agrupado a 48 KiB (ADR-037); CSS 40 KiB sin cambios.

Pasos de publicación para la beta, cuando se autorice: `npm version 0.5.0-beta.0 --no-git-tag-version -w @intervolutions/ivolt` (ya es la versión actual), etiqueta git `v0.5.0-beta.0`, `npm publish --access public --tag beta` (nunca `latest` antes de 0.5.0); el resto igual que §3.

## 0a. Notas de versión 0.3.0-beta.0 (borrador)

iVOLT 0.3.0-beta.0 es el ciclo «Spectacular» (ADR-030): el framework pasa a ser expresivo por defecto sin tocar el contrato técnico. Añade **Carousel** (scroll-snap sin JS; con JS carrusel APG por pestañas con efectos slide, fade y cinema, autoplay con barra de progreso, gestos y miniaturas), **Picker** (`<select>` nativo promovido a un selector con búsqueda, chips, grupos y límite), **Form** (validación con mensajes por tipo de error, resumen, foco y reglas propias) y **Counter** (caracteres o palabras con límite blando), enriquece `form.css` (etiquetas flotantes, grupos, interruptor, rango, zona de archivo, textarea auto-ajustable, tallas, estados con icono) y estrena `surfaces.css` (cristal con fallback, grano, malla, aurora, borde luminoso, texto degradado, barrido, elevación) con los tokens `glass`, `blur`, `glow` y `texture`. Presupuestos: CSS 16,4 de 40 KiB y JS 21,2 de 32 KiB (gzip).

Pasos de publicación, cuando se autorice: `npm version 0.3.0-beta.0 --no-git-tag-version -w @intervolutions/ivolt` (ya es la versión actual), etiqueta git `v0.3.0-beta.0`, `npm publish --access public --tag beta` (nunca `latest` antes de 0.3.0); el resto igual que §3.

## 0. Notas de versión 0.2.0-beta.0 (borrador)

iVOLT 0.2.0-beta.0 añade dos componentes con mejora progresiva sobre HTML nativo: **Combobox** (un `<input list>` con `<datalist>` promovido al patrón ARIA combobox con listbox: filtrado sin distinguir acentos, modo estricto, autoselección, eventos cancelables) y **DataTable** (ordenación por texto, número y fecha y filtro sobre una `<table>` servida, con `aria-sort`, recuento anunciado y restauración exacta en `destroy`). La web de documentación se rediseña (dirección «Voltage», ADR-027/028) y se publica también en español (`/es/`). Contratos congelados en `API_CONTRACT.md` §8.3 y §8.4.

Beta significa: alcance v0.2 completo, contratos congelados, `npm run verify` en verde en tres motores, sin fallos abiertos conocidos de severidad alta. No significa: pruebas con lector de pantalla real (siguen sin ejecutarse), datos de campo ni dispositivos físicos.

Pasos de publicación para la beta, cuando se autorice: versión `npm version 0.2.0-beta.0 --no-git-tag-version -w @intervolutions/ivolt`, etiqueta git `v0.2.0-beta.0`, `npm publish --access public --tag beta` (nunca `latest` antes de 0.2.0); el resto igual que §3.

## 1. Notas de versión (borrador público en `apps/docs/src/pages/changelog.astro`)

iVOLT 0.1.0-alpha es la primera versión utilizable del framework: tokens y temas light/dark/system sin JavaScript, base acotada a `.iv-root`, primitivas de layout, una matriz finita de utilidades, siete familias CSS (button, card, form, badge, alert, table, breadcrumb, pagination, progress, skeleton) y seis componentes interactivos con mejora progresiva (dialog, drawer, disclosure, tabs, dropdown, toast). Se distribuye como CSS con y sin capas, CSS por componente, ES modules con `exports`, IIFE con global `IVOLT`, tipos y tokens JSON. Tres recetas completas y una web de documentación con búsqueda local, playground acotado y descargas.

Limitaciones conocidas: API sujeta a cambios antes de 0.1.0; sin pruebas con lector de pantalla ni en dispositivos físicos (solo motores Playwright); `forced-colors` sin soporte específico; sin wrappers para frameworks; utilidades sin valores arbitrarios por diseño. Las cifras publicadas (tamaños, Lighthouse, axe) son de laboratorio y llevan su método.

## 2. Comprobaciones previas (ejecutadas en fase 4, ver `PROJECT_STATE.md`)

`npm ci` limpio → `npm run verify` (build, unit/contratos, navegador en tres motores, tamaños, pack-smoke, ejemplos, build de docs) → `docs/LIGHTHOUSE.md`, `docs/A11Y_REVIEW.md`, regresiones visuales (`tests/browser/visual.spec.js`) → licencias (`docs/THIRD_PARTY.md`).

## 3. Pasos de publicación (requieren autorización explícita; no ejecutar sin ella)

Antes de cualquier subida de versión: `apps/docs/package.json` fija la versión exacta del paquete (`"@intervolutions/ivolt": "x.y.z"`); hay que actualizarla en el mismo commit y regenerar `package-lock.json` con `npm install`. Con el paquete ya en el registro, una versión desfasada hace fallar `npm install` con `notarget` (ocurrió tras publicar 0.7.0-beta.0 con la dependencia todavía en 0.5.0-beta.0).

1. Nombre: `npm view @intervolutions/ivolt` y `npm view ivolt` devolvían 404 el 2026-09-13. La **propiedad del scope `@intervolutions`** exige una organización npm con ese nombre: crearla o verificarla con la cuenta de la empresa antes de nada (`npm org ls intervolutions`). Si el scope no está disponible, el nombre alternativo `ivolt-css` también estaba libre; cambiarlo implica actualizar `package.json`, docs y pack-smoke.
2. Versión: `npm version 0.1.0-alpha.0 --no-git-tag-version -w @intervolutions/ivolt` (ya es la versión actual); crear etiqueta `v0.1.0-alpha.0` tras el commit de release.
3. Tarball de revisión: `cd packages/ivolt && npm pack` → adjuntar a la revisión; `npm run pack-smoke` debe pasar sobre ese mismo tarball.
4. Publicación: `npm publish --access public --tag alpha` desde `packages/ivolt` con 2FA. Etiqueta `alpha`, nunca `latest`, hasta 0.1.0.
5. Web: la URL pública es `https://ivolt.intervolutions.com` (fijada en `astro.config.mjs`; sitemap, canonical, `hreflang` y JSON-LD absolutos); desplegar `apps/docs/dist` según `docs/DEPLOY.md`. Antes, colocar el logo oficial en `assets/brand/ivolt-logo.svg` (y opcionalmente `ivolt-mark.svg`): el build lo usa en cabecera, favicon y `og.png` sin más cambios (`apps/docs/src/brand.js`).
6. Tras publicar: actualizar getting started con `npm install @intervolutions/ivolt` (hoy oculto por `check-examples`), README del paquete y `CHANGELOG.md`; crear la release en GitHub con las notas de §1 y el tarball.

## 4. Lo que una release candidate no implica

No implica madurez de mantenimiento, ni compatibilidad con navegadores fuera de la matriz, ni conformidad WCAG del sitio consumidor. Es una alpha con contratos congelados, pruebas reproducibles y límites declarados.
