# Release: v0.3.0-beta.0 (en preparación), v0.2.0-beta.0 y v0.1.0-alpha.0 (no publicadas)

Estado: **nada publicado**; ninguna acción de §3 se ha ejecutado. Hitos: `ROADMAP.md` §5 (v0.2) y §6 (v0.3).

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

1. Nombre: `npm view @intervolutions/ivolt` y `npm view ivolt` devolvían 404 el 2026-09-13. La **propiedad del scope `@intervolutions`** exige una organización npm con ese nombre: crearla o verificarla con la cuenta de la empresa antes de nada (`npm org ls intervolutions`). Si el scope no está disponible, el nombre alternativo `ivolt-css` también estaba libre; cambiarlo implica actualizar `package.json`, docs y pack-smoke.
2. Versión: `npm version 0.1.0-alpha.0 --no-git-tag-version -w @intervolutions/ivolt` (ya es la versión actual); crear etiqueta `v0.1.0-alpha.0` tras el commit de release.
3. Tarball de revisión: `cd packages/ivolt && npm pack` → adjuntar a la revisión; `npm run pack-smoke` debe pasar sobre ese mismo tarball.
4. Publicación: `npm publish --access public --tag alpha` desde `packages/ivolt` con 2FA. Etiqueta `alpha`, nunca `latest`, hasta 0.1.0.
5. Web: definir `SITE_URL` real (activa sitemap y canonical) y desplegar `apps/docs/dist` en el hosting elegido. Antes, colocar el logo oficial en `assets/brand/ivolt-logo.svg` (y opcionalmente `ivolt-mark.svg`): el build lo usa en cabecera, favicon y `og.png` sin más cambios (`apps/docs/src/brand.js`).
6. Tras publicar: actualizar getting started con `npm install @intervolutions/ivolt` (hoy oculto por `check-examples`), README del paquete y `CHANGELOG.md`; crear la release en GitHub con las notas de §1 y el tarball.

## 4. Lo que una release candidate no implica

No implica madurez de mantenimiento, ni compatibilidad con navegadores fuera de la matriz, ni conformidad WCAG del sitio consumidor. Es una alpha con contratos congelados, pruebas reproducibles y límites declarados.
