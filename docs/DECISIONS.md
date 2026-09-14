# iVOLT — Registro de decisiones (ADR)

Formato: contexto → decisión → consecuencias → rechazado. Estado A = aceptada, R = rechazada. Fecha 2026-09-13 salvo indicación.

## ADR-001 Monorepo con npm workspaces y un solo paquete publicable (A)
Tres entregables (paquete, docs, starters) deben probarse juntos. npm workspaces con un lockfile bastan. Rechazado: pnpm/Turborepo/Nx (infraestructura sin necesidad demostrada); varios paquetes `@ivolt/*` (fragmenta versiones antes de tener usuarios).

## ADR-002 Cadena de build: esbuild + lightningcss + scripts Node (A)
Un empaquetador por lenguaje, ambos rápidos y con minificado, targets y sourcemaps. lightningcss resuelve `@import`, anidamiento y `@custom-media`. Rechazado: Sass (segunda sintaxis y compilador para lo que CSS nativo ya hace), PostCSS con plugins (más dependencias por lo mismo), Rollup/Vite modo librería (duplican esbuild), compilador de utilidades propio (fuera de v0.1).

## ADR-003 Tokens en un JSON propio con generador de 100–200 líneas (A)
Esquema pequeño: `$type`, `$value`, alias `{a.b}`; emite CSS (temas), custom-media, JSON resuelto y breakpoints JS. Rechazado: Style Dictionary (potente, pero su configuración y transformaciones superan la necesidad; se reconsidera si aparecen más plataformas).

## ADR-004 Módulos CSS sin capa; las entradas asignan `@layer` (A)
Permite `ivolt.css` con capas, `ivolt.flat.css` sin ellas y la importación por componente, desde el mismo código. Consecuencia documentada: `@layer` no aísla frente a CSS externo sin capa; se ofrece la entrada plana y la receta de envolver CSS legado en una capa. Rechazado: solo capas (pierde contra `button {}` de temas WordPress); solo sin capas (pierde la sobrescritura sencilla).

## ADR-005 Gramática BEM acotada + utilidades `iv-u-` con infijo de breakpoint (A)
`iv-bloque__elemento--modificador`, `iv-u-<bp>-<prop>-<valor>`. Los estados JS se reflejan en atributos nativos/ARIA, no en clases `is-*`. Rechazado: clases de estado (`.is-open`) porque duplican lo que ya expresa `open`/`aria-expanded` y desincronizan CSS y semántica.

## ADR-006 Tema por `data-iv-theme` con valor `system` y light por defecto (A)
Funciona sin JS ni storage; la elección explícita anidada prevalece. `theme.js` opcional con persistencia opt-in. Rechazado: clase `.dark` en `html` (sin ámbito anidado ni valor system); dark por defecto (impone la estética de marca al consumidor).

## ADR-007 Ciclo de vida explícito: `init`/`destroy`, WeakMap, sin observador global, sin efectos de importación (A)
Predecible, tree-shakable y compatible con SSR/CSP. `auto.js` es la única entrada con efecto. Rechazado: autoarranque en `index.js`; `MutationObserver` global por defecto (coste continuo y sorpresas en CMS); registro por import (rompe `sideEffects`).

## ADR-008 `<dialog>` nativo con `showModal()` sin polyfill (A)
La matriz de navegadores (Safari ≥ 16.4) lo soporta; el navegador aporta top layer, `inert` implícito y Esc. iVOLT añade retorno de foco, foco inicial, eventos y cierre por backdrop. Drawer reutiliza `<dialog>` en móvil. Rechazado: diálogo con `div` + trap de foco manual (más JS, más errores); polyfill (peso y matriz que no pedimos).

## ADR-009 Matriz de navegadores: Chrome/Edge 111, Firefox 113, Safari 16.4, Samsung 22 (A)
Determinada por `color-mix()`, `@layer`, container queries, `:has()`, `<dialog>`, `inert`. Rechazado: soportar Safari 15 (sin `dialog` fiable ni `inert`); IE.

## ADR-010 JS en ES modules con JSDoc; tipos emitidos por `tsc`; sin TypeScript fuente (A)
El consumidor recibe JS legible igual al fuente; el tipado se comprueba en CI. Riesgo: TypeScript 7.x (nuevo compilador) puede no emitir declaraciones desde JS igual que 5.x; fase 1 fijó 5.9.3 directamente (emisión verificada) y deja 7.x para cuando aporte algo. Rechazado: TS fuente (paso de compilación para todo el paquete).

## ADR-011 Web de docs con Astro estático, sin framework de UI, búsqueda con Pagefind (A)
HTML y CSS del propio paquete; JS mínimo por página. Pagefind indexa la salida estática y se sirve local (sin peticiones externas). Rechazado: Starlight (impone su diseño y componentes), React/Vue (innecesarios), búsqueda remota.

## ADR-012 Utilidades: matriz finita generada; sin JIT, purga ni valores arbitrarios (A)
Integraciones CMS usan clases documentadas sin escáner. Rechazado: reproducir Tailwind.

## ADR-013 Fuentes: paquete con `system-ui`; docs pueden añadir una geométrica libre local en fase 3 (A)
Cero peticiones y licencia registrada cuando se incorpore. Rechazado: fuente remota obligatoria; tipografía display para textos largos.

## ADR-014 Web Components / Shadow DOM como formato de entrega (R)
Rompen el consumo CSS puro, el theming global por tokens y la sencillez en WordPress/PHP; pueden evaluarse como capa opcional futura.

## ADR-015 Sin `!important` salvo `.iv-u-sr-only` (A)
La composición se apoya en capas y variables locales. Excepción única documentada y probada por contrato.

## ADR-016 Política de modelos: Fable lidera y revisa; Opus 5 implementa; sin delegación recursiva (A)
Ver WORKFLOW. Rechazado: Fable en todas las tareas (coste), agentes subordinados Fable.

## ADR-017 Logo pendiente: wordmark temporal propio (A, resuelto 2026-09-13)
Mientras no existía el logo se usó un SVG provisional. Resuelto: los archivos oficiales viven en `assets/brand/` y `apps/docs/src/brand.js` los transforma para cada uso (tema, favicon, OG) sin modificar el original; el wordmark temporal permanece solo como fallback para que un checkout sin assets construya.

## ADR-018 Pruebas: Vitest + Playwright + axe-core; sin Jest ni Cypress (A)
Un runner unitario y uno de navegador con tres motores. Rechazado: Storybook en v0.1 (las fixtures de docs cumplen ese papel).

## ADR-019 Utilidades con especificidad (0,2,0) por selector doblado; componentes ≤ (0,2,0) (A)
Sin capas (`ivolt.flat.css`) el orden utilidades > componentes no existía. Doblar el selector (`.iv-u-x.iv-u-x`) e importar utilidades al final lo garantiza en ambas entradas con el mismo módulo. Coste: unos cientos de bytes gzip. Rechazado: `!important` en utilidades (rompe el principio de composición y el contrato de `!important`); generar dos módulos de utilidades distintos.

## ADR-020 Mejora progresiva: `init` promueve el HTML servido a widget ARIA (A)
Tabs y dropdown se sirven como enlaces de ancla y `<details>` sin roles de widget, funcionales sin JS y correctos para lectores de pantalla; `init` añade roles, `aria-*`, roving tabindex y `hidden`, y `destroy` los retira. Rechazado: servir `role="tablist"`/`role="menu"` en el HTML (anuncian un patrón que sin JS no funciona ni es alcanzable por teclado).

## ADR-021 Drawer: un único `<dialog>` que el CSS muestra estático desde `lg` (A)
Un `<dialog>` cerrado se muestra con `display:block` en ≥ lg sin `open` (contenido accesible, fuera del top layer); en < lg se abre con `showModal()`. Un `matchMedia` cierra el modal al cruzar hacia arriba. Rechazado: dos elementos (`<dialog>` y `<aside>`) con el mismo contenido duplicado.

## ADR-022 Cierre de `<dialog>` siempre interceptado para mantener `iv:close` cancelable (A)
`submit` de `form[method=dialog]`, `cancel` (Esc) y clic en backdrop se interceptan antes del cierre nativo. Los cierres externos directos emiten solo `iv:closed` con `reason: "external"`. Los enlaces con `data-iv-open` hacen `preventDefault()` con JS; no hay enlace profundo a diálogos en v0.1.

## ADR-023 Excepción única de especificidad: `.iv-dialog:target:not([open])` y `.iv-drawer:target:not([open])` (0,3,0) (A)
El fallback sin JS del diálogo necesita `:target` y excluir el estado abierto con JS; acotarlo con `:root:not([data-iv-js])` costaría (0,4,0). Se registra como única excepción al techo (0,2,0) y el test de contrato la lista explícitamente. Con JS, el delegador cancela la navegación del ancla, así que `:target` nunca se activa.

## ADR-024 `box-sizing: border-box` acotado a `.iv-root` en `base.css` (A)
El reset es opcional; sin `border-box`, `iv-container` e `iv-input` (width 100% + padding) desbordan. `base.css` lo aplica a `.iv-root` y descendientes (especificidad ≤ (0,1,0) + universal). Detectado por la prueba de overflow a 320–1920 px en fase 1.

## ADR-025 Un ámbito `[data-iv-theme]` reaplica `color` y `background-color` (A)
Los tokens cambian por ámbito, pero `color` heredado ya está calculado en el padre: una sección `dark` dentro de una página `light` mostraba texto claro solo en los elementos que declaraban color. `tokens.css` emite `[data-iv-theme] { color: var(--iv-color-text); background-color: var(--iv-color-bg); }` en la capa `iv.tokens`; componentes y utilidades lo sobrescriben. Detectado por axe (contraste 1.14:1) en la fixture de temas anidados.

## ADR-026 `danger-hover`/`danger-active` derivados con `color-mix()` en vez de tokens nuevos (A)
`button.css` deriva los estados del botón `--danger` con `color-mix(in oklab, …)` sobre `--iv-color-danger` y `--iv-color-text`, correcto en ambos temas y dentro de la matriz de navegadores. Se reconsidera como token si otra familia lo necesita.

## ADR-027 Listón de diseño de la web: nivel de premio (A, 2026-09-14)
Decisión del propietario del producto: la web de iVOLT debe tener un diseño lo bastante bueno como para optar con posibilidades reales a un reconocimiento en Awwwards, CSS Design Awards o galerías equivalentes (Site of the Day, nominación o destacado). Esto sustituye la dirección de fase 0 «aire, líneas finas, un solo detalle memorable» por una dirección rica en movimiento y efectos, sin renunciar a los límites técnicos del contrato: sin vídeo de fondo, sin partículas pesadas, sin WebGL obligatorio, sin cursor personalizado, sin ruido tras el texto; experiencia completa con `prefers-reduced-motion`; presupuestos de rendimiento y accesibilidad intactos (Lighthouse, axe, teclado). Criterios operativos en `DESIGN_SYSTEM.md` §8. Lo que no se puede prometer: un premio depende de un jurado; lo que sí se exige es cumplir esos criterios de forma verificable. Rechazado: delegar el rediseño a un agente (se ejecuta directamente por el líder por decisión del propietario).
