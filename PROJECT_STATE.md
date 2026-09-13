# iVOLT — Estado del proyecto

Última actualización: 2026-09-13 · Fase actual: **4 (release candidate) cerrada** · Logo oficial integrado · Estado: candidato v0.1.0-alpha.0 listo para revisión; **no publicado**

## Estado por fase

| Fase | Estado | Evidencia |
|---|---|---|
| 0 Blueprint | hecha | `docs/` |
| 1 Corte vertical | hecha | merge `29a3d35` |
| 2 Alcance v0.1 | hecha | merge `e9bc149` |
| 3 Web y DX | hecha | merge `869d6da` |
| 4 Release candidate | hecha | `npm run verify` completo, `docs/LIGHTHOUSE.md`, `docs/A11Y_REVIEW.md`, `docs/THIRD_PARTY.md`, `docs/RELEASE.md`, regresiones visuales |

## Hecho en fase 4

- Gates completos con `npm run verify`: build, 201 pruebas unitarias/contrato, navegador en Chromium, Firefox y WebKit (266 superadas; las 17 visuales solo en Chromium), tamaños, pack-smoke (tarball en consumidor externo + starter servido fuera del monorepo en Chromium), build de docs (29 páginas indexadas), ejemplos.
- Lighthouse 13.4.1 en 4 rutas × 2 presets con entorno registrado; correcciones aplicadas (favicon en recetas y starter, CLS de admin a 0 con columna reservada y colocación explícita, nombres accesibles del enlace de marca y del menú) y remedición documentada.
- Revisión de accesibilidad en Chromium y Firefox por componente; correcciones: `aria-live` en la región de toast y retorno de foco al descartar, foco tras cerrar dropdown con Tab, pestaña activa en `forced-colors`, foco inicial de la fixture de diálogo. Lista de lector de pantalla escrita y **no ejecutada** (sin NVDA/VoiceOver en el entorno).
- Regresiones visuales selectivas con líneas base Chromium (`tests/browser/visual.spec.js`, 17 capturas); el cambio del foco inicial del diálogo se actualizó deliberadamente.
- `scripts/docs-server.mjs`: build + preview en un solo proceso para las pruebas; elimina los `astro preview` huérfanos que servían builds antiguos.
- Terceros y licencias (`docs/THIRD_PARTY.md`), notas de versión y pasos de publicación (`docs/RELEASE.md`), `packages/ivolt/CHANGELOG.md`, README raíz, `npm audit` sin vulnerabilidades, nombres `ivolt` y `@intervolutions/ivolt` siguen libres (404); propiedad del scope pendiente de comprobar con la cuenta de la empresa.

## Verificaciones ejecutadas (cierre)

| Check | Resultado |
|---|---|
| `npm run verify` | ok (build · 201/201 · 266 navegador × 3 motores · tamaños · pack-smoke · docs · ejemplos) |
| Tamaños min+gzip | core 2.38 KiB / 8 · ivolt.min.css 10.14 / 30 · flat 10.07 / 30 · JS 7.65 / 18 · IIFE 7.90 / 18 |
| Lighthouse (laboratorio) | 100/100/100/100 en `/`, `/getting-started`, `/components/dialog` (móvil y escritorio); admin 100/100/100/100 tras correcciones; detalle y salvedades en `docs/LIGHTHOUSE.md` |
| axe | sin hallazgos critical/serious en 24 fixtures × 2 temas, diálogo abierto, 3 recetas × 2 viewports |
| Gasto/tokens | no disponible en el entorno |

## No verificado / limitaciones declaradas

- Lector de pantalla (NVDA, VoiceOver): lista preparada, no ejecutada.
- `forced-colors` real en Windows, dispositivos físicos, datos de campo: no disponibles; solo laboratorio.
- Logo oficial integrado (2026-09-13): `assets/brand/ivolt-logo-balanced.svg` e `ivolt-isotipo.svg` alimentan cabecera (copia con colores mapeados a tokens, sin firma), favicon (isotipo sobre placa oscura) y `og.png`. Verificado con capturas en claro y oscuro. El wordmark temporal queda solo como fallback de build.
- Publicación npm, despliegue web y `SITE_URL`: requieren autorización explícita (`docs/RELEASE.md` §3).

## Fallos abiertos

Ninguno.

## Siguiente acción

Revisión humana del candidato: abrir `apps/docs` (`npm run build && npm run dev:docs`), leer `docs/RELEASE.md` y decidir nombre/scope, logo y fecha. La publicación y el despliegue no se ejecutan sin autorización. Trabajo posterior a v0.1: `docs/ROADMAP.md` §3.

## Decisiones que no deben perderse

- ADR-019 a ADR-026 y las de fases 2–3 (ver historial de este archivo en git). Fase 4: región de toast con `aria-live="polite"` añadido por `init`; dropdown devuelve el foco al `summary` antes de cerrar con Tab; líneas base visuales solo en Chromium; servidor de docs para pruebas en proceso único.
