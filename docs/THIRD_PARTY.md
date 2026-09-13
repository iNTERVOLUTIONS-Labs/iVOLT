# Terceros, licencias y atribuciones

Fecha: 2026-09-13. Estado al cierre de la fase 4.

## Paquete `@intervolutions/ivolt`

- Licencia: MIT (`LICENSE`, © 2026 iNTERVOLUTIONS).
- Dependencias de ejecución: **ninguna**. El tarball contiene solo CSS, JS, tipos y tokens generados desde el propio repositorio.
- Código o assets externos incorporados en el paquete: ninguno. Los SVG (chevrones, spinner, wordmark provisional, favicon, imagen OG) son originales.
- Fuentes: `system-ui` y pila de monoespaciadas del sistema; sin archivos de fuente.

## Web de documentación (`apps/docs`, salida estática)

| Componente distribuido con el sitio | Licencia | Uso |
|---|---|---|
| Pagefind 1.5.2 (`/pagefind/*.js`, `*.wasm`, índice) | MIT | búsqueda local; generado en build y servido desde el propio sitio |
| Astro 7 (HTML/CSS/JS generados) | MIT | generador estático; su código de cliente solo aparece si una página lo necesita |

Los avisos de licencia de Pagefind y Astro se conservan en `node_modules` y no se eliminan de los artefactos que los incluyan. La interfaz de búsqueda es propia; no se usa la UI de Pagefind.

## Herramientas de desarrollo (no distribuidas)

esbuild, lightningcss, browserslist, TypeScript, Vitest, jsdom, Playwright, axe-core, Lighthouse, Pagefind, Astro y @astrojs/sitemap, todas MIT o compatibles según sus propios `package.json`. Versiones en `package-lock.json` y `docs/SOURCES.md`.

## Marca

«iVOLT» y «iNTERVOLUTIONS» son nombres de Tombatossals Softworks LLC. El nombre del paquete y el scope npm son provisionales hasta comprobar disponibilidad y propiedad (`docs/RELEASE.md`).
