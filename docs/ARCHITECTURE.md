# iVOLT — Arquitectura

Estado: contrato de fase 0 (previsto, no implementado). Cambios de una pieza requieren un ADR en [DECISIONS.md](DECISIONS.md).

## 1. Piezas y responsabilidades

| Pieza | Ruta | Qué es | Depende de |
|---|---|---|---|
| Paquete | `packages/ivolt` | Único paquete publicable: CSS modular, tokens, utilidades, ESM opcional | nada en runtime |
| Docs | `apps/docs` | Web estática Astro que consume `packages/ivolt` vía workspace | paquete |
| Starter HTML | `examples/plain-html` | HTML + `dist/` copiado, sin Node | paquete construido |
| Starter ESM | `examples/vite` | Consumo por `exports` reales | paquete |
| Tests | `tests/` | Contratos CSS, comportamiento, a11y, integración | paquete, ejemplos |
| Scripts | `scripts/` | tamaños, integridad de ejemplos, smoke del tarball | todo |

Nombre npm previsto `@intervolutions/ivolt`. El 13-09-2026 ni `ivolt` ni `@intervolutions/ivolt` existen en el registro; la propiedad del scope no se ha comprobado y se verifica en fase 4.

## 2. Árbol del repositorio (objetivo fase 1–2)

```
iVOLT/
├─ package.json                # workspaces + scripts raíz (propietario: integrador)
├─ package-lock.json           # único lockfile
├─ guía raíz de agentes · PROJECT_STATE.md · README.md · LICENSE
├─ assets/brand/               # logo oficial (ivolt-logo.svg, ivolt-mark.svg); la web lo toma en build
├─ docs/                       # biblia, contratos, ADR, diseño (docs/design/)
├─ packages/ivolt/
│  ├─ package.json             # exports, sideEffects, files
│  ├─ tokens/tokens.json       # ÚNICA fuente de verdad de tokens
│  ├─ fixtures/<familia>/*.html # fragmentos HTML: misma fuente para docs, pruebas y starters
│  ├─ src/css/
│  │  ├─ reset.css             # opcional, nunca importado por defecto
│  │  ├─ tokens.css            # GENERADO desde tokens.json
│  │  ├─ custom-media.css      # GENERADO: @custom-media --iv-md …
│  │  ├─ reset.layer.css       # GENERADO: reset envuelto en @layer iv.reset
│  │  ├─ base.css              # elementos acotados a .iv-root
│  │  ├─ layout/{container,stack,cluster,grid}.css
│  │  ├─ components/{button,card,form,...}.css
│  │  ├─ utilities.css         # GENERADO desde utilities.config.mjs
│  │  ├─ core.css              # entrada: tokens + base + layout (con capas)
│  │  ├─ ivolt.css             # entrada completa (con capas)
│  │  └─ ivolt.flat.css        # entrada completa sin @layer
│  ├─ src/js/
│  │  ├─ core/{registry,options,events,focus,keys}.js
│  │  ├─ core/breakpoints.js   # GENERADO desde tokens.json
│  │  ├─ components/{disclosure,tabs,dialog,drawer,dropdown,toast}.js
│  │  ├─ theme.js
│  │  ├─ index.js              # entrada agrupada, sin autoarranque
│  │  ├─ auto.js               # opt-in: init(document) al cargar
│  │  └─ iife.js               # fuente del global IVOLT
│  ├─ scripts/{build-tokens,build-utilities,build-css,build-js,sizes}.mjs
│  └─ dist/                    # generado, no versionado
├─ apps/docs/                  # Astro estático
├─ examples/plain-html/ · examples/vite/
├─ tests/{unit,browser,contracts,integration}/
└─ scripts/{pack-smoke.mjs,check-examples.mjs}
```

## 3. Artefactos distribuidos

| Archivo en `dist/` | Contenido | Presupuesto min+gzip |
|---|---|---|
| `css/ivolt.css` / `.min.css` | Todo v0.1 con capas, sin reset | ≤ 30 KiB |
| `css/ivolt.flat.css` / `.min.css` | Mismos módulos sin `@layer` (coexistencia con CSS legado); el orden utilidades > componentes se garantiza por especificidad (0,2,0) y orden de importación, ver ADR-019 | ≤ 30 KiB |
| `css/core.css` / `.min.css` | tokens + base + layout | ≤ 8 KiB |
| `css/reset.css` | Normalización opcional, sin capa: importar con `@import url("…/reset.css") layer(iv.reset)` | — |
| `css/reset.layer.css` | Igual, ya envuelto en `@layer iv.reset {}` para usar con `<link>` junto a `ivolt.css` | — |
| `css/utilities.css` | Matriz finita de utilidades | incluido en completo |
| `css/components/*.css` | Un archivo por familia, sin capas (el consumidor las asigna) | — |
| `js/index.js` + `js/components/*.js` | ESM sin agrupar, sin efectos de importación | ≤ 18 KiB agrupado |
| `js/auto.js` | ESM con autoarranque explícito | — |
| `js/ivolt.iife.min.js` | Global `IVOLT` (`IVOLT.init`, `IVOLT.Dialog`…) | ≤ 18 KiB |
| `types/*.d.ts` | Generadas desde JSDoc con `tsc` | — |
| `tokens/tokens.json` | Tokens resueltos, para herramientas | — |
| `*.map` | Sourcemaps solo para archivos minificados | — |

Todos los presupuestos se miden por separado con `scripts/sizes.mjs` (gzip nivel 9, versión y commit anotados). Ver [QUALITY.md](QUALITY.md).

## 4. `package.json` del paquete (contrato de exports)

```json
{
  "name": "@intervolutions/ivolt",
  "version": "0.1.0-alpha.0",
  "type": "module",
  "license": "MIT",
  "files": ["dist", "LICENSE", "README.md"],
  "sideEffects": ["**/*.css", "./dist/js/auto.js", "./dist/js/ivolt.iife.min.js"],
  "exports": {
    ".":            { "types": "./dist/types/index.d.ts", "default": "./dist/js/index.js" },
    "./auto":       { "types": "./dist/types/auto.d.ts",  "default": "./dist/js/auto.js" },
    "./theme":      { "types": "./dist/types/theme.d.ts", "default": "./dist/js/theme.js" },
    "./disclosure": { "types": "./dist/types/components/disclosure.d.ts", "import": "./dist/js/components/disclosure.js" },
    "./tabs":       { "types": "./dist/types/components/tabs.d.ts",       "import": "./dist/js/components/tabs.js" },
    "./dialog":     { "types": "./dist/types/components/dialog.d.ts",     "import": "./dist/js/components/dialog.js" },
    "./drawer":     { "types": "./dist/types/components/drawer.d.ts",     "import": "./dist/js/components/drawer.js" },
    "./dropdown":   { "types": "./dist/types/components/dropdown.d.ts",   "import": "./dist/js/components/dropdown.js" },
    "./toast":      { "types": "./dist/types/components/toast.d.ts",      "import": "./dist/js/components/toast.js" },
    "./iife":       "./dist/js/ivolt.iife.min.js",
    "./css/*":      "./dist/css/*",
    "./tokens.json": "./dist/tokens/tokens.json",
    "./package.json": "./package.json"
  }
}
```

El paquete es ESM-only (sin build CommonJS); la condición `default` apunta al ESM para que cualquier resolutor obtenga un error legible en vez de `ERR_PACKAGE_PATH_NOT_EXPORTED`. Las entradas de componentes usan el mismo par `types`/`default`. Nota para docs: `css-loader` y Sass no consultan `exports`; el getting started muestra la ruta `node_modules/@intervolutions/ivolt/dist/css/…` como alternativa.

Prueba obligatoria (fase 1): un consumidor con esbuild que importe solo `@intervolutions/ivolt/dialog` no debe contener código de `tabs` ni `toast`, y otro que importe `@intervolutions/ivolt` sin usar nada debe reducirse a casi cero. Se comprueba por tamaño e inspección de nombres exportados, no por afirmación.

## 5. Cadena de build (mínima)

| Tarea | Herramienta | Motivo |
|---|---|---|
| Tokens → CSS/JSON/custom-media | script Node propio (`build-tokens.mjs`) | esquema pequeño; evita dependencia y duplicación manual |
| Utilidades → CSS | script Node propio a partir de una matriz declarada | alcance finito, auditable |
| CSS: `@import`, anidamiento, `@custom-media`, targets, minificado | `lightningcss` (1.33.0 observada), API `bundle` con `drafts: { customMedia: true }`; las definiciones `@custom-media` viajan en el mismo bundle | una sola herramienta, rápida, sin PostCSS |
| JS: copia ESM, bundle índice, IIFE, minificado, sourcemaps | `esbuild` (0.28.2 observada) | una sola herramienta |
| Tipos | `tsc` con `checkJs` + `declaration` sobre JSDoc | consumidor recibe JS; verificar emisión limpia con TypeScript 7.x, si falla fijar 5.x |
| Lint | `stylelint`, `eslint` (config mínima) | contratos de prefijo y `!important` |

No hay Sass, PostCSS, Rollup, Vite en modo librería, Turborepo ni compilador de utilidades. Añadir uno requiere ADR.

## 6. Capas CSS y precedencia

Orden declarado al inicio de cada entrada:

```css
@layer iv.reset, iv.tokens, iv.base, iv.layout, iv.components, iv.utilities, iv.overrides;
@import url("./tokens.css") layer(iv.tokens);
@import url("./base.css") layer(iv.base);
/* … */
```

Los módulos fuente no declaran capa; la entrada asigna capa en el `@import`. Así el mismo módulo sirve para `ivolt.css` (capas), `ivolt.flat.css` (sin capas) y la importación por componente. Regla de build: un módulo se importa una sola vez por entrada (el bundler deduplica importaciones repetidas y perdería una de las capas); un test de contrato lo comprueba.

Reglas de precedencia que la documentación debe explicar con un ejemplo probado:

1. Dentro de las capas gana la declarada más tarde: `iv.utilities` supera a `iv.components` aunque tenga menor especificidad.
2. Cualquier declaración normal (sin `!important`) **sin capa** del autor supera a todas las declaraciones normales con capa, sea cual sea su especificidad. Un `button { background: red }` de un tema WordPress existente gana a `.iv-button` en `ivolt.css`.
3. Entre declaraciones `!important` el orden se invierte por completo: ganan las capas tempranas y las declaraciones sin capa pasan a ser las de menor prioridad. Consecuencia: el `!important` de `.iv-u-sr-only` en `ivolt.css` no puede anularse desde CSS sin capa del consumidor, mientras que en `ivolt.flat.css` sí; se documenta en la página de utilidades.

Por tanto `@layer` ordena la precedencia interna de iVOLT y facilita sobrescribir; **no aísla** el framework del CSS externo. Para coexistir con CSS legado que estiliza elementos, el consumidor elige: `ivolt.flat.css` (compite por especificidad como cualquier hoja), o envolver su CSS legado con `@import url(legacy.css) layer(legacy)` declarado antes de `iv.*`. Ninguna regla del paquete usa `!important`, salvo `.iv-u-sr-only`, documentada como excepción. `reset.css` se publica sin capa: enlazado tal cual quedaría fuera de capa y vencería a los componentes, por eso el getting started solo muestra `@import … layer(iv.reset)` o `reset.layer.css`.

## 7. Contrato SSR y de entorno

- Ningún módulo de `src/js` accede a `document`, `window`, `navigator` ni `matchMedia` en el nivel superior. `auto.js` comprueba `typeof document !== "undefined"` antes de registrar `DOMContentLoaded`.
- Prueba: Vitest en entorno `node` importa `index.js` y `auto.js` y afirma que no lanzan y que `init` existe.
- Sin `eval`, `new Function`, `innerHTML` con datos externos ni atributos `on*`. Todo el JS del paquete funciona con CSP `script-src 'self'`. El único inline opcional es el snippet de prelectura de tema de la documentación, que requiere `'sha256-…'` o nonce; la docs publica el hash. El único estilo dinámico son propiedades personalizadas vía `style.setProperty` (documentado por si `style-src` prohíbe atributos inline).
- Sin peticiones de red, fuentes remotas ni telemetría.

## 8. Tokens: flujo único

```
tokens/tokens.json ──build-tokens──▶ src/css/tokens.css      (:root, [data-iv-theme], @media system)
                                 ├─▶ src/css/custom-media.css (@custom-media --iv-sm/md/lg/xl/2xl)
                                 ├─▶ dist/tokens/tokens.json  (alias resueltos)
                                 └─▶ src/js/core/breakpoints.js (valores numéricos para JS)
```

Formato: objeto con `$type` (`color`, `dimension`, `fontFamily`, `duration`, `shadow`, `number`) y `$value`; alias con `{ref.path}`. Solo el script resuelve alias; nadie edita `tokens.css` a mano. Detalle en [API_CONTRACT.md](API_CONTRACT.md) §2 y [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## 9. Docs (Astro)

Astro 7.3.2 observada, salida `static`. Componentes `.astro` sin framework de UI. El CSS editorial de la web vive en `apps/docs/src/styles/docs.css` y se limita a maquetación de páginas, prosa y navegación de docs; botones, formularios, cards y diálogos vienen del paquete. Búsqueda local con `pagefind` (1.5.2 observada), que indexa la salida estática y se sirve desde el propio sitio. Demos en la página se renderizan inline desde las fixtures del paquete (`packages/ivolt/fixtures/<familia>/<nombre>.html`), la misma fuente del snippet copiable, de las pruebas de navegador (servidas por `scripts/serve.mjs` en `/fixture/<familia>/<nombre>`) y de los starters.

Fase 3 añadió: búsqueda local con Pagefind (índice generado en `apps/docs/dist/pagefind` tras `astro build`; la interfaz es propia, con marcado iVOLT, y carga el índice bajo demanda; en `astro dev` no hay índice y el diálogo lo indica), anclas de encabezado generadas en cliente, imagen Open Graph propia (`scripts/build-og.mjs` renderiza un SVG original a PNG con el Chromium local), sitemap y canonical solo cuando existe `SITE_URL`, descargas `.zip` generadas en build (`scripts/build-downloads.mjs`, escritor ZIP propio sin dependencias) y cadenas de interfaz en `apps/docs/src/i18n/en.js` (estructura preparada para un segundo idioma sin duplicar la web ahora). `apps/docs/scripts/prebuild.mjs` encadena sincronización de ejemplos, descargas y OG antes de `astro build`.
