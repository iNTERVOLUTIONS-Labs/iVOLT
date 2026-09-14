# Terceros, licencias y atribuciones

Fecha: 2026-09-13. Estado al cierre de la fase 4.

## Paquete `@intervolutions/ivolt`

- Licencia: MIT (`LICENSE`, © 2026 iNTERVOLUTIONS).
- Dependencias de ejecución: **ninguna**. El tarball contiene solo CSS, JS, tipos y tokens generados desde el propio repositorio.
- Código o assets externos incorporados en el paquete: ninguno. Los SVG de la interfaz (chevrones, spinner) son originales; el logo e isotipo de `assets/brand/` son obra de iNTERVOLUTIONS (wordmark en trazados, sin fuentes de terceros).
- Fuentes: `system-ui` y pila de monoespaciadas del sistema; sin archivos de fuente.

## Web de documentación (`apps/docs`, salida estática)

| Componente distribuido con el sitio | Licencia | Uso |
|---|---|---|
| Pagefind 1.5.2 (`/pagefind/*.js`, `*.wasm`, índice) | MIT | búsqueda local; generado en build y servido desde el propio sitio |
| Astro 7 (HTML/CSS/JS generados, incluido el router de transiciones de vista) | MIT | generador estático; su código de cliente solo aparece si una página lo necesita |
| Space Grotesk (variable, subconjunto latino, `apps/docs/public/fonts/SpaceGrotesk-latin.woff2`, 22 KB) | SIL Open Font License 1.1 (`apps/docs/public/fonts/SpaceGrotesk-OFL.txt`) | tipografía de titulares, navegación y botones de la web de documentación; servida en local, sin peticiones a terceros; el paquete no la usa |

Los avisos de licencia de Pagefind y Astro se conservan en `node_modules` y no se eliminan de los artefactos que los incluyan. La interfaz de búsqueda es propia; no se usa la UI de Pagefind.

## Herramientas de desarrollo (no distribuidas)

esbuild, lightningcss, browserslist, TypeScript, Vitest, jsdom, Playwright, axe-core, Lighthouse, Pagefind, Astro y @astrojs/sitemap, todas MIT o compatibles según sus propios `package.json`. Versiones en `package-lock.json` y `docs/SOURCES.md`.

## Marca

«iVOLT» y «iNTERVOLUTIONS» son nombres de Tombatossals Softworks LLC. El nombre del paquete y el scope npm son provisionales hasta comprobar disponibilidad y propiedad (`docs/RELEASE.md`).

## Fotografías de la documentación (2026-09-14)

Doce fotografías en `apps/docs/public/photos/` obtenidas de Lorem Picsum (`picsum.photos/id/<id>`), que sirve fotografías publicadas en Unsplash bajo la Unsplash License (uso libre comercial y no comercial, sin permiso previo; la atribución se agradece y se incluye). Autores y enlaces en `apps/docs/public/photos/README.md`. Solo se usan en la web; el paquete npm no incluye mapas de bits.
