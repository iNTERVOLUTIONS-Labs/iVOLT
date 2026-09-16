# iVOLT — Estabilidad y versiones (vigente desde `1.0.0`, 2026-09-16)

Este documento fija qué promete el paquete `@intervolutions/ivolt` desde `1.0.0` y cómo cambia. Fue borrador hasta `1.0.0-rc.0`, que lo congeló; `1.0.0` lo pone en vigor.

## 1. Qué es público

Lo que está en `docs/API_CONTRACT.md` y aparece en la web, y nada más:

| Superficie | Público | No público |
|---|---|---|
| CSS | clases `iv-*` documentadas y sus modificadores; propiedades locales `--iv-<bloque>-*` listadas como «locales públicos»; atributos de estado `data-iv-*` documentados | orden interno de reglas, pseudoelementos, nombres de `@keyframes`, valores concretos de sombras y transiciones |
| Tokens | todos los `--iv-*` emitidos por `tokens.css` (nombre y semántica; el valor puede afinarse en menor) | tokens que no aparecen en `tokens.json` |
| JavaScript | `exports` del `package.json` (`.`, `./auto`, `./theme`, `./<componente>`, `./iife`, `./css/*`, `./tokens.json`); clases, métodos, getters, opciones y defaults de §5.2b; eventos `iv:*` y su `detail` de §5.3; precedencia `defaults < data-iv-* < opciones JS` | miembros con `_`, rutas profundas dentro de `dist/`, orden de los listeners, temporizaciones exactas |
| HTML servido | la estructura de cada componente en su fila «HTML servido» y el comportamiento sin JS | marcado que `init` genera (puede cambiar de forma mientras conserve la semántica documentada) |

## 2. Versionado

SemVer estricto desde `1.0.0`:

- **Mayor**: retirar o renombrar cualquier cosa pública, cambiar un default, cambiar el `detail` de un evento, subir el mínimo de navegadores.
- **Menor**: añadir clases, tokens, opciones, métodos, eventos o módulos; afinar valores de tokens sin cambiar su semántica; ampliar el soporte de navegadores.
- **Parche**: correcciones que no cambian la superficie pública. Una corrección de accesibilidad puede cambiar marcado generado y sigue siendo parche.

Deprecaciones: se anuncian en el changelog y en la web una versión menor antes de retirarse en la siguiente mayor; el código emite `console.warn` una vez por página con el prefijo `[iVOLT] deprecated:`. No hay deprecaciones pendientes al escribir esto.

Etiquetas de npm: `latest` para estables, `next` para candidatos, `beta` para betas. Desde `1.0.0`, `latest` apunta a la última estable; hasta entonces apuntó a la última beta porque npm no admite un paquete sin `latest` (ADR-043).

## 3. Navegadores

Diseñado para la tabla de `docs/QUALITY.md` §2 (Chromium 113, Firefox 113, Safari 16.4 y sus móviles) y probado en cada cierre con Playwright en Chromium, Firefox y WebKit (tres motores, `IVOLT_ALL_BROWSERS=1`). Mejora progresiva declarada: `popover`, `text-wrap: balance`, `animation-timeline` (Firefox usa `ScrollMotion`), `position-anchor`, `backdrop-filter`, `field-sizing`. Ninguna función pública depende de ellas.

## 4. Lo que no se promete

- Igualdad al píxel entre versiones: las líneas base visuales son del proyecto, no un contrato.
- Estabilidad de nombres de archivos dentro de `dist/` fuera de los `exports`.
- Compatibilidad de las fixtures del paquete como API: son material de prueba y documentación.
- Lector de pantalla: lo verificado consta en `docs/A11Y_REVIEW.md`; lo no ejecutado se declara.

## 5. Cómo se comprueba

`npm run verify` (build, unitarias y contratos, navegador en tres motores, tamaños contra presupuesto, `pack-smoke` con un consumidor externo, docs y ejemplos) es la puerta de cada versión; `docs/RELEASE.md` §3 lista los pasos de publicación y `PROJECT_STATE.md` lo que quedó sin verificar.
