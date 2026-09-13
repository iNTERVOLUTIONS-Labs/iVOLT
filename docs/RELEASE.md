# Release candidate v0.1.0-alpha — notas y pasos de publicación

Estado: candidato revisable. **No publicado**: ninguna de las acciones de §3 se ha ejecutado.

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
5. Web: definir `SITE_URL` real (activa sitemap y canonical) y desplegar `apps/docs/dist` en el hosting elegido. Antes, sustituir el wordmark temporal por `ivolt-logo.svg` y regenerar `og.png`.
6. Tras publicar: actualizar getting started con `npm install @intervolutions/ivolt` (hoy oculto por `check-examples`), README del paquete y `CHANGELOG.md`; crear la release en GitHub con las notas de §1 y el tarball.

## 4. Lo que una release candidate no implica

No implica madurez de mantenimiento, ni compatibilidad con navegadores fuera de la matriz, ni conformidad WCAG del sitio consumidor. Es una alpha con contratos congelados, pruebas reproducibles y límites declarados.
