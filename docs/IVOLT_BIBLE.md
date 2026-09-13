# iVOLT — Biblia del producto

iVOLT es un framework frontend de CSS, HTML y JavaScript de iNTERVOLUTIONS (Tombatossals Softworks LLC). Este documento fija visión, usuarios, alcance y principios; los detalles viven en los contratos enlazados y no se repiten aquí.

| Documento | Contiene |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | módulos, builds, exports, capas CSS, SSR, árbol |
| [API_CONTRACT.md](API_CONTRACT.md) | gramática congelada de clases, tokens, atributos, JS y eventos |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | paleta, contraste, escalas, estados, arte |
| [QUALITY.md](QUALITY.md) | presupuestos, navegadores, pruebas, gates |
| [WORKFLOW.md](WORKFLOW.md) | roles, agentes, propiedad de archivos, coste |
| [ROADMAP.md](ROADMAP.md) | fases, estimaciones, backlog |
| [DECISIONS.md](DECISIONS.md) | ADR aceptados y rechazados |
| [SOURCES.md](SOURCES.md) | fuentes y versiones observadas |

## 1. Visión

Un framework híbrido y coherente: componentes semánticos como vía rápida, utilidades acotadas como vía de composición, tokens como contrato visual y JavaScript opcional para comportamiento. Su ventaja no es tener más piezas, sino que las piezas encajen entre sí y con el HTML, WordPress/PHP, Astro o cualquier otro entorno donde se pegue un `<link>` o se importe un módulo.

Mensaje de marca: «The interface starts here.» Se demuestra con ejemplos que funcionan, no con adjetivos. No se publica «el mejor», «el más rápido» ni cifras sin método reproducible.

## 2. Usuarios

| Perfil | Necesita | iVOLT le da |
|---|---|---|
| Agencia / freelance con webs empresariales, revistas y catálogos | arrancar rápido, resultado cuidado, personalizar colores sin recompilar | componentes reconocibles, tokens semánticos, temas light/dark |
| Desarrollador WordPress/PHP | CSS precompilado, sin Node, sin escáner que borre clases dinámicas, sin pisar el tema existente | `dist/` estático, base acotada a `.iv-root`, `ivolt.flat.css`, utilidades finitas |
| Desarrollador con Astro/Vite/otros | ESM con `exports` reales, tree-shaking, SSR sin `window` | módulos por componente, sin autoarranque implícito, tipos `.d.ts` |
| Autor de paneles internos | layout de aplicación, formularios, tablas, drawer | primitivas grid/stack/cluster, drawer, tablas responsive, formularios nativos |

## 3. Principios (contractuales)

1. HTML real: enlaces navegan, botones actúan, controles nativos donde encajan.
2. Todo lo de contenido funciona sin JS; cada componente interactivo documenta su fallback sin JS.
3. Cero dependencias de ejecución. Sin telemetría, peticiones externas ni fuentes remotas obligatorias.
4. Consumo sin Node posible; el desarrollo del framework sí usa una cadena mínima.
5. SSR seguro: importar el ESM no toca `document`/`window`.
6. Todo prefijado: `iv-`, `--iv-`, `data-iv-`, `iv:`. Sin `!important` para componer.
7. El tema de la marca no se impone al consumidor; light es el predeterminado.
8. Docs y starters consumen los mismos artefactos que un desarrollador externo.
9. Accesibilidad como parte de la API: foco, teclado, ARIA y contraste se prueban, no se prometen.
10. Cada afirmación pública lleva su evidencia: versión, método y límites.

## 4. Alcance v0.1 (alpha)

CSS/base: tokens, temas, reset opcional, tipografía; container, stack, cluster, grid; buttons y grupos; forms nativos con ayuda y error; cards, badges, alerts; tables responsive, breadcrumbs, pagination; progress y skeleton.

Interacción: disclosure/accordion, tabs, dialog, drawer con navegación móvil, dropdown de acciones, toast.

Recetas: landing empresarial, catálogo editorial, panel de administración estático. Datos ficticios señalados; formularios que declaran no enviar nada.

Fuera de v0.1 (backlog en ROADMAP): combobox, datepicker, data grid, editor rico, drag and drop, gráficos, carrusel avanzado, compilador de utilidades, CLI, wrappers React/Vue, editor visual, constructor de temas, catálogo masivo de plantillas.

Contar variantes no aumenta el alcance: una familia está terminada cuando tiene estados, teclado, fallback, documentación y pruebas.

## 5. Mapa del producto

```
tokens.json ─▶ tokens.css ─┐
reset.css (opcional)       ├─▶ core.css ─▶ ivolt.css / ivolt.flat.css ─▶ dist/css
base.css + layout/*        │                 ▲
components/*.css ──────────┘                 │ utilities.css (matriz finita)
core/*.js + components/*.js ─▶ index.js (ESM) · auto.js (opt-in) · ivolt.iife.min.js (IVOLT)
                                    │
             apps/docs (Astro) ◀────┼────▶ examples/plain-html · examples/vite
                                    └────▶ tests · scripts/pack-smoke
```

## 6. Qué significa «excelente» aquí

Puesta en marcha en un `<link>` y un `<script>`; API predecible por una gramática única; accesibilidad verificada en ejemplos; pesos dentro de presupuesto y medidos; layouts que aguantan de 320 a 1920 px; y mantenimiento razonable: un paquete, una cadena de build, documentación generada desde las mismas fixtures que las pruebas.
