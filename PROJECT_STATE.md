# iVOLT — Estado del proyecto

Última actualización: 2026-09-14 · Ciclo actual: **v0.2 → hito beta (`0.2.0-beta.0`)** · Estado: en cierre (gate final pendiente de ejecutar) · **Nada publicado ni desplegado**

## Estado por fase e hito

| Fase / hito | Estado | Evidencia |
|---|---|---|
| 0 Blueprint | hecha | `docs/` |
| 1 Corte vertical | hecha | merge `29a3d35` |
| 2 Alcance v0.1 | hecha | merge `e9bc149` |
| 3 Web y DX | hecha | merge `869d6da` |
| 4 Release candidate v0.1.0-alpha.0 | hecha, no publicada | `docs/RELEASE.md` §1–§4, `docs/LIGHTHOUSE.md`, `docs/A11Y_REVIEW.md` |
| Rediseño web ronda 1 (ADR-027) | sustituido | `defed60`; juzgado insuficiente por el propietario |
| **Beta v0.2.0-beta.0** (`docs/ROADMAP.md` §5) | en cierre | rama `v0.2-combobox`; ver tabla de condiciones |

## Condiciones de la beta (ROADMAP §5)

| # | Condición | Estado | Evidencia |
|---|---|---|---|
| 1 | Combobox integrado, documentado, probado en 3 motores | hecho | `371583b`; contrato §8.3; 168 pruebas de navegador (combobox + axe) en Chromium, Firefox y WebKit |
| 2 | Rediseño ronda 2 sin rejillas, Lighthouse ≥ 95 / 100 a11y, capturas revisadas | hecho (implementación) | `85151e8` + `a6fffc4`; dirección en `docs/design/DIRECTION_R2.md`; Lighthouse del implementador 100/100/100/100 móvil y escritorio; capturas revisadas por el líder a 1440, 1366×610, 390, claro, oscuro, reduced-motion; aceptación visual del propietario pendiente |
| 3 | Data table con ordenación y filtro | hecho | `107f9a1`; contrato §8.4; 192 pruebas (data table + combobox + axe) en 3 motores |
| 4 | Docs en español (`/es/`), selector de idioma, `hreflang`, búsqueda por idioma | hecho salvo home | `4dc39bd` (30 páginas), `a6fffc4` (layout con `lang`, `hreflang`, selector con recarga completa para que Pagefind use el índice del idioma); `es/index.astro` en curso |
| 5 | Presupuestos revisados y `npm run verify` verde | pendiente | tamaños: CSS 10,52 KiB / 30; JS 12,04 KiB / 18 (nota en `QUALITY.md` §1) |
| 6 | Changelog, release notes, versión, cierre de este archivo | en curso | `CHANGELOG.md` 0.2.0-beta.0, `RELEASE.md` §0, versión `0.2.0-beta.0` en `package.json`/`index.js`/lockfile |

## Hecho en el ciclo v0.2 (2026-09-14)

- **Regla de diseño nueva (ADR-028):** ninguna rejilla ni patrón de cuadrícula/puntos de fondo salvo petición explícita del propietario; las existentes se retiraron (`a3d3c0e`). Listón de premio (ADR-027) vigente; ronda 2 con dirección escrita («Voltage»: hero 100svh con arcos eléctricos en canvas 2D, tipografía por líneas, secciones sin tarjetas, gabinete pegajoso con fixtures reales, corte de temas con `clip-path` y `<input type="range">`, recetas apiladas, bloque invertido verde, lockup a todo el ancho, medidor de scroll, botones magnéticos, rodillo en la navegación, línea de luz entre páginas, tema claro diseñado). No hecho por el implementador: grano `feTurbulence` (opcional) y variante vertical del medidor.
- **Combobox** (`packages/ivolt/src/js/components/combobox.js`, `css/components/combobox.css`, fixtures `combobox/{basic,strict}`): promoción de `<input list>` + `<datalist>` al patrón APG combobox con listbox; `optionElements` en vez de `options` para no chocar con §5.2 (contrato ajustado). Cambio del líder: Esc con la lista cerrada y `strict` restaura sin cancelar la tecla.
- **DataTable** (`components/datatable.js`, `css/components/datatable.css`, fixtures `datatable/{basic,sorted}`): ordenación estable text/number/date, filtro con retardo, `aria-sort`, `role="status"`, fila vacía, restauración exacta incluidos nodos de texto entre filas; `.iv-table--stack tr[hidden]` necesario por la especificidad del modo apilado.
- **Docs:** páginas `combobox` y `datatable`; español completo bajo `/es/` (30 páginas + home en curso); `Base.astro` resuelve idioma por prop o prefijo; `Fixture.astro` localiza el botón de copia; `families` en `en.js` como única fuente; playground enlaza a la doc del idioma actual; `docs.css` dividido en `base/shell/home/motion` (ADR-029).
- **Calidad:** `tests/browser/combobox.spec.js`, `datatable.spec.js`; rutas `/es/` en `docs.spec.js`; fixtures nuevas en `a11y.spec.js`; líneas base visuales de combobox y data table; `A11Y_REVIEW.md` §9 y lista §6.8–6.9 para lector de pantalla; `ssr.test.js` lee la versión de `package.json`.
- **Proceso:** tres implementadores Opus 5 (combobox, data table, español) más uno para el rediseño; todos informaron su modelo; briefs con archivos permitidos y condición de parada. Incidencia: una página de docs del líder con llaves sin escapar rompió `build:docs` entre commits; la detectó el agente de traducción y quedó corregida en `4dc39bd` (lección: ejecutar el build de docs antes de commitear páginas).

## Verificaciones ejecutadas en el ciclo

| Check | Resultado |
|---|---|
| `npx vitest run` | 296/296 (unitarias + contratos, con combobox y data table) |
| `npx tsc -p packages/ivolt/tsconfig.json` | sin errores |
| `npm run sizes` | core 2,38 KiB / 8 · ivolt.min.css 10,52 / 30 · flat 10,46 / 30 · JS agrupado 12,04 / 18 · IIFE 12,29 / 18 (gzip 9) |
| Navegador (fixtures) | combobox + data table + axe: 192/192 en Chromium, Firefox y WebKit |
| Docs (`docs.spec.js`, Chromium) | 8/9 tras el layout con idioma: el fallo era el enlace `/es` del selector de idioma, que existe cuando entra `es/index.astro`; pendiente de reejecutar |
| Lighthouse home (implementador, Lighthouse 13, servidor local 4326) | móvil 100/100/100/100 (LCP 1,5 s, CLS 0, TBT 0 ms); escritorio 100/100/100/100 (LCP 0,4 s); remedición del líder pendiente tras los cambios de layout |
| `npm run verify` completo (3 motores) | **pendiente** (gate final de la beta) |
| Gasto/tokens | no disponible en el entorno |

## No verificado / limitaciones declaradas

- Lector de pantalla (NVDA, VoiceOver): listas §6.1–6.9 de `A11Y_REVIEW.md` preparadas, no ejecutadas.
- Milisegundos por fotograma del canvas de arcos: no medidos con perfilador; TBT 0 ms en Lighthouse y bucle acotado por construcción.
- Aceptación visual del rediseño por el propietario: pendiente (dos rondas anteriores rechazadas).
- `forced-colors` real, dispositivos físicos, datos de campo: no disponibles.
- Publicación npm, despliegue y `SITE_URL`: requieren autorización explícita (`docs/RELEASE.md` §0 y §3).

## Fallos abiertos

Ninguno conocido de severidad alta. Pendientes de este cierre: `es/index.astro`, reejecución de `docs.spec.js`, `npm run verify` con `IVOLT_ALL_BROWSERS=1`, remedición Lighthouse.

## Siguiente acción

Cerrar la beta: integrar la home en español, `IVOLT_ALL_BROWSERS=1 npm run verify`, Lighthouse en `/` y `/es`, actualizar esta tabla, merge de `v0.2-combobox` en `main` y push. Después, revisión humana del rediseño y de `docs/RELEASE.md` §0; la publicación no se ejecuta sin autorización. Trabajo posterior: `docs/ROADMAP.md` §3 (datepicker, constructor de temas, carrusel).

## Decisiones que no deben perderse

- ADR-028 (sin rejillas; ronda 2 por implementador Opus; hito beta) y ADR-029 (arquitectura de la web: hojas por ámbito, `bleed`, cabecera derivada, i18n por prefijo `/es`, selector con recarga completa).
- Combobox: `options` = opciones resueltas (§5.2); las filas son `optionElements`. DataTable: `reset()` emite solo los eventos posteriores; `filter()` por API escribe en el input; índice de columna por `cellIndex`.
- Versión `0.2.0-beta.0` en `packages/ivolt/package.json`, `index.js` y lockfile; la home lee la versión del manifiesto en el build.
