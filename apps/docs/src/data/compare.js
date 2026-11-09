// Comparison pages: iVOLT next to Bootstrap, Tailwind CSS, Pico CSS and Bulma.
//
// Rules for this file: every size comes from competitor-sizes.json (measured by
// scripts/measure-competitors.mjs, never typed); every claim about another framework is one its
// own documentation makes, with the link beside it; and every page says when the other framework
// is the better choice. A comparison that only flatters iVOLT is an advert, and readers can tell.
import sizes from "./competitor-sizes.json";
import { componentCount as N, cssCount as C, jsCount as J, words, Words } from "../lib/count.js";

export const measured = sizes.measured;
export const method = sizes.method;

/** One measured file: { bytes, gzip, brotli, url, version, … } */
export function file(id, role) {
  return sizes.files.find((f) => f.id === id && f.role === role) || null;
}
export const kb = (n) => (n / 1024).toFixed(1);

export const slugs = ["bootstrap", "tailwind", "pico", "bulma"];

const ivoltRows = (lang) => {
  const css = file("ivolt", "css"), js = file("ivolt", "js"), core = file("ivolt", "classless");
  return { css, js, core };
};

export const competitors = {
  bootstrap: {
    name: "Bootstrap",
    version: "5.3.8",
    files: () => [file("bootstrap", "css"), file("bootstrap", "js")],
    extra: () => [file("bootstrap6", "css"), file("bootstrap6", "js")],
    source: "https://getbootstrap.com/docs/5.3/getting-started/introduction/",
    en: {
      title: "iVOLT vs Bootstrap: an honest comparison",
      description: "iVOLT and Bootstrap side by side: measured CSS and JS sizes, components, theming, dark mode, RTL and migration. When each one is the better choice.",
      h1: "iVOLT vs Bootstrap",
      lead: "Both are component frameworks you can link from a CDN without a build step. Bootstrap is the most widely used one on the web, with fifteen years of themes, answers and templates behind it. iVOLT is newer and smaller in scope, and it puts its weight on accessible defaults, native HTML elements and a contract that only grows in 1.x.",
      them: [
        "Sass source compiled to one stylesheet, with CSS custom properties for most component values since 5.2.",
        "Colour modes with data-bs-theme on any element since 5.3.",
        "Twelve JavaScript plugins (alert, button, carousel, collapse, dropdown, modal, offcanvas, popover, scrollspy, tab, toast, tooltip); the bundle includes Popper.",
        "Right-to-left through a separate bootstrap.rtl.css.",
        "A Sass utility API to generate your own utilities.",
      ],
      us: [
        "Plain CSS in cascade layers, prefixed iv-, scoped to .iv-root so it can live beside existing CSS; a flat build without layers too.",
        "light, dark and system themes on any element with data-iv-theme; every colour, radius and font is a --iv- token.",
        `${Words(N)} components: ${words(C)} are CSS only; ${words(J)} gain optional JavaScript, including a combobox, a datepicker, a data table, a command palette, a lightbox and a megamenu.`,
        "Right-to-left from the same stylesheet, with logical properties throughout.",
        "A fixed utility matrix: no generator, no arbitrary values, the same classes everywhere.",
      ],
      betterThem: [
        "Your team already knows Bootstrap and the project has no reason to change.",
        "You want the ecosystem: commercial themes, admin templates, plugins, and an answer to every question on the web.",
        "You customise through Sass variables and maps and already have that pipeline.",
      ],
      betterUs: [
        "You want more of the interface handled for you — autocomplete, date picking, sortable tables, a command palette — without adding libraries.",
        "You want components built on native elements (<dialog>, <details>, popover, <input type=date>) that keep working before the script runs.",
        "You want a stylesheet that does not collide with what is already on the page: everything is prefixed and scoped.",
      ],
      note6: "Bootstrap 6 is in alpha (6.0.0-alpha.1, October 2026). It moves to cascade layers and native <dialog>, ships its JavaScript as ES modules only, and renames responsive classes to a prefix syntax such as .md:d-none, so Bootstrap 5 pages will need a migration either way. Its alpha files are measured below for reference; alpha sizes will change.",
      note6Source: "https://blog.getbootstrap.com/2026/10/08/bootstrap-6-alpha/",
    },
    es: {
      title: "iVOLT o Bootstrap: una comparación honesta",
      description: "iVOLT y Bootstrap frente a frente: tamaños de CSS y JS medidos, componentes, temas, modo oscuro, RTL y migración. Cuándo conviene cada uno.",
      h1: "iVOLT o Bootstrap",
      lead: "Los dos son frameworks de componentes que se enlazan desde un CDN sin paso de build. Bootstrap es el más usado de la web y tiene detrás quince años de temas, respuestas y plantillas. iVOLT es más reciente y más acotado, y pone el peso en la accesibilidad por defecto, los elementos nativos de HTML y un contrato que en 1.x solo crece.",
      them: [
        "Código fuente en Sass compilado a una hoja, con propiedades personalizadas de CSS para casi todos los valores de componente desde la 5.2.",
        "Modos de color con data-bs-theme en cualquier elemento desde la 5.3.",
        "Doce plugins de JavaScript (alert, button, carousel, collapse, dropdown, modal, offcanvas, popover, scrollspy, tab, toast, tooltip); el bundle incluye Popper.",
        "Derecha a izquierda con una hoja aparte, bootstrap.rtl.css.",
        "Una API de utilidades en Sass para generar las tuyas.",
      ],
      us: [
        "CSS plano en capas de cascada, con prefijo iv- y acotado a .iv-root para convivir con el CSS que ya tengas; también hay un build plano sin capas.",
        "Temas claro, oscuro y de sistema en cualquier elemento con data-iv-theme; cada color, radio y fuente es un token --iv-.",
        `${Words(N, "es")} componentes: ${words(C, "es")} son solo CSS y ${words(J, "es")} ganan JavaScript opcional, entre ellos un combobox, un selector de fechas, una tabla de datos, una paleta de comandos, un visor y un megamenú.`,
        "Derecha a izquierda con la misma hoja, con propiedades lógicas en todo el código.",
        "Una matriz fija de utilidades: sin generador, sin valores arbitrarios, las mismas clases en todas partes.",
      ],
      betterThem: [
        "Tu equipo ya domina Bootstrap y el proyecto no tiene motivos para cambiar.",
        "Quieres el ecosistema: temas comerciales, plantillas de administración, plugins y una respuesta para cada duda en la web.",
        "Personalizas con variables y mapas de Sass y ya tienes montado ese proceso.",
      ],
      betterUs: [
        "Quieres que la interfaz te venga más resuelta —autocompletado, selección de fechas, tablas ordenables, paleta de comandos— sin sumar librerías.",
        "Quieres componentes sobre elementos nativos (<dialog>, <details>, popover, <input type=date>) que funcionan antes de que cargue el script.",
        "Quieres una hoja que no choque con lo que ya hay en la página: todo lleva prefijo y está acotado.",
      ],
      note6: "Bootstrap 6 está en alfa (6.0.0-alpha.1, octubre de 2026). Pasa a capas de cascada y a <dialog> nativo, publica su JavaScript solo como módulos ES y cambia las clases responsive a una sintaxis de prefijo como .md:d-none, así que las páginas de Bootstrap 5 tendrán que migrar de todos modos. Medimos sus ficheros alfa como referencia; los tamaños de una alfa cambiarán.",
      note6Source: "https://blog.getbootstrap.com/2026/10/08/bootstrap-6-alpha/",
    },
    map: [
      ["btn btn-primary", "iv-button iv-button--primary"],
      ["btn btn-outline-secondary", "iv-button iv-button--secondary"],
      ["card · card-body · card-title", "iv-card · iv-card__body · iv-card__title"],
      ["alert alert-danger", "iv-alert iv-alert--danger"],
      ["badge text-bg-success", "iv-badge iv-badge--success iv-badge--solid"],
      ["form-label · form-control · form-select", "iv-label · iv-input · iv-select"],
      ["table table-striped", "iv-table iv-table--striped"],
      ["container", "iv-container"],
      ["d-flex flex-wrap gap-3", "iv-cluster"],
      ["visually-hidden", "iv-u-sr-only"],
      ["data-bs-theme=\"dark\"", "data-iv-theme=\"dark\""],
      ["modal + data-bs-toggle", "<dialog class=\"iv-dialog\" data-iv-component=\"dialog\"> + data-iv-open"],
    ],
    snippet: {
      them: `<link rel="stylesheet" href="…/bootstrap.min.css">
<button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#hi">Open</button>
<div class="modal fade" id="hi" tabindex="-1">
  <div class="modal-dialog"><div class="modal-content">
    <div class="modal-body">Hello</div>
  </div></div>
</div>
<script src="…/bootstrap.bundle.min.js"></script>`,
      us: `<link rel="stylesheet" href="…/ivolt.min.css">
<button class="iv-button iv-button--primary" data-iv-open="hi">Open</button>
<dialog class="iv-dialog" id="hi" data-iv-component="dialog">
  <div class="iv-dialog__panel">
    <div class="iv-dialog__body">Hello</div>
  </div>
</dialog>
<script src="…/ivolt.iife.min.js"></script>`,
    },
  },

  tailwind: {
    name: "Tailwind CSS",
    version: "4.3.5",
    files: () => [file("tailwind", "reset"), file("tailwind-browser", "js")],
    source: "https://tailwindcss.com/docs/installation",
    en: {
      title: "iVOLT vs Tailwind CSS: components or utilities",
      description: "iVOLT and Tailwind CSS compared honestly: a component framework with no build step against a utility engine. Sizes, theming, dark mode and when to pick each.",
      h1: "iVOLT vs Tailwind CSS",
      lead: "These two solve different problems. Tailwind is a utility engine: a build step reads your markup and writes exactly the classes you used, and you assemble every component yourself or take one from its ecosystem. iVOLT is a finished component framework: one prebuilt stylesheet, components ready to use, and a small, fixed set of utilities for layout.",
      them: [
        "Utility-first: thousands of single-purpose classes, generated on demand from your source files by a build step (Vite plugin, PostCSS or CLI).",
        "Configuration in CSS with @theme since v4; arbitrary values such as w-[37px].",
        "Dark mode with the dark: variant.",
        "No components in the open-source package; component kits are separate products or community projects.",
        "A browser build compiles utilities at runtime for trying it out; Tailwind's documentation positions it for development, not production.",
      ],
      us: [
        "Prebuilt: link ivolt.min.css from a CDN or your own server and every class already exists. Nothing reads your markup.",
        `${Words(N)} components with their states, focus handling and keyboard support; ${words(J)} gain optional JavaScript.`,
        "Themes through --iv- tokens and data-iv-theme on any element; no variant prefixes in the markup.",
        "A finite utility matrix (layout, spacing, display, text) with no arbitrary values, so markup stays readable and an assistant cannot invent a class that does not exist.",
        "Everything prefixed iv- and scoped to .iv-root, so the two can share a page while you migrate.",
      ],
      betterThem: [
        "You are designing a bespoke visual language and want full control of every pixel from the markup.",
        "You already run a bundler (Next.js, Vite, Astro with islands) and like co-locating styles with components.",
        "You build on React component kits from the Tailwind ecosystem.",
        "Bytes matter above everything: a purged Tailwind build contains only the classes you used and is often very small. We did not measure one, because its size depends entirely on your markup.",
      ],
      betterUs: [
        "You want a site or an app without a build step: WordPress, PHP, a static page, a CMS template.",
        "You want accessible, keyboard-complete components you do not have to assemble or audit yourself.",
        "You want short markup — class=\"iv-button iv-button--primary\" instead of a dozen utilities — and one place, the tokens, to change the look.",
      ],
    },
    es: {
      title: "iVOLT o Tailwind CSS: componentes o utilidades",
      description: "iVOLT y Tailwind CSS comparados con honestidad: un framework de componentes sin paso de build frente a un motor de utilidades. Tamaños, temas y cuándo elegir cada uno.",
      h1: "iVOLT o Tailwind CSS",
      lead: "Resuelven problemas distintos. Tailwind es un motor de utilidades: un paso de build lee tu marcado y escribe exactamente las clases que usaste, y cada componente lo montas tú o lo tomas de su ecosistema. iVOLT es un framework de componentes terminado: una hoja precompilada, componentes listos y un conjunto pequeño y fijo de utilidades para maquetar.",
      them: [
        "Utilidades primero: miles de clases de un solo propósito, generadas a partir de tus ficheros por un paso de build (plugin de Vite, PostCSS o CLI).",
        "Configuración en CSS con @theme desde la v4; valores arbitrarios como w-[37px].",
        "Modo oscuro con la variante dark:.",
        "Sin componentes en el paquete de código abierto; los kits de componentes son productos aparte o proyectos de la comunidad.",
        "Un build para el navegador compila las utilidades en tiempo de ejecución para probarlo; su documentación lo sitúa en desarrollo, no en producción.",
      ],
      us: [
        "Precompilado: enlazas ivolt.min.css desde un CDN o tu servidor y todas las clases ya existen. Nada lee tu marcado.",
        `${Words(N, "es")} componentes con sus estados, gestión del foco y teclado; ${words(J, "es")} ganan JavaScript opcional.`,
        "Temas con tokens --iv- y data-iv-theme en cualquier elemento; sin prefijos de variante en el marcado.",
        "Una matriz finita de utilidades (maquetación, espaciado, display, texto) sin valores arbitrarios: el marcado se lee bien y un asistente no puede inventarse una clase que no existe.",
        "Todo lleva prefijo iv- y está acotado a .iv-root, así que los dos pueden compartir página mientras migras.",
      ],
      betterThem: [
        "Estás diseñando un lenguaje visual a medida y quieres controlar cada píxel desde el marcado.",
        "Ya tienes un empaquetador (Next.js, Vite, Astro con islas) y te gusta tener los estilos junto a los componentes.",
        "Construyes sobre kits de componentes de React del ecosistema de Tailwind.",
        "Los bytes mandan sobre todo lo demás: un build de Tailwind purgado solo contiene las clases que usas y suele ser muy pequeño. No lo medimos porque su tamaño depende por completo de tu marcado.",
      ],
      betterUs: [
        "Quieres una web o una app sin paso de build: WordPress, PHP, una página estática, una plantilla de CMS.",
        "Quieres componentes accesibles y completos de teclado que no tengas que montar ni auditar tú.",
        "Quieres un marcado corto —class=\"iv-button iv-button--primary\" en vez de una docena de utilidades— y un único sitio, los tokens, para cambiar el aspecto.",
      ],
    },
    map: [
      ["flex flex-wrap items-center gap-4", "iv-cluster"],
      ["flex flex-col gap-4", "iv-stack"],
      ["mx-auto max-w-7xl px-4", "iv-container"],
      ["grid grid-cols-3 gap-6", "iv-u-grid iv-u-grid-cols-3 iv-u-gap-6"],
      ["rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus-visible:outline …", "iv-button iv-button--primary"],
      ["rounded-xl border bg-white p-6 shadow dark:bg-gray-900", "iv-card + iv-card__body"],
      ["text-center · font-semibold", "iv-u-text-center · iv-u-font-semibold"],
      ["sr-only", "iv-u-sr-only"],
      ["dark:… on every element", "data-iv-theme=\"dark\" once, on any ancestor"],
    ],
    snippet: {
      them: `<!-- after a build step has generated these classes -->
<button class="rounded-lg bg-blue-600 px-4 py-2 font-semibold
  text-white hover:bg-blue-700 focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-blue-600
  disabled:opacity-50 dark:bg-blue-500">Save</button>`,
      us: `<!-- one prebuilt stylesheet, no build step -->
<button class="iv-button iv-button--primary">Save</button>`,
    },
  },

  pico: {
    name: "Pico CSS",
    version: "2.1.1",
    files: () => [file("pico", "css"), file("pico", "classless")],
    source: "https://picocss.com/",
    en: {
      title: "iVOLT vs Pico CSS: where to go after Pico",
      description: "Pico CSS is no longer maintained. How iVOLT compares on size, semantic HTML and dark mode, what changes in your markup, and when Pico still fits.",
      h1: "iVOLT vs Pico CSS",
      lead: "Pico made plain, semantic HTML look good with almost no classes, and many small sites were built on it. Its website now says that Pico CSS is no longer maintained; 2.1.1 is the last release. If you are looking for a maintained framework with the same respect for native elements, this page shows what changes and what you gain.",
      them: [
        "Classless or near-classless: elements are styled directly (<button>, <input>, <article>, <dialog>).",
        "Automatic dark mode from the system preference, or data-theme on the page.",
        "No JavaScript, no components beyond what HTML provides.",
        "The project's homepage states that it is no longer maintained.",
      ],
      us: [
        "core.min.css styles text, headings, lists, tables, code, quotes and media by element under .iv-root; forms and buttons take a class (iv-input, iv-button), so they never fight another stylesheet.",
        `The full ivolt.min.css adds ${words(N)} components, with optional JavaScript for the interactive ones.`,
        "data-iv-theme=\"light|dark|system\" on any element, nested if you like.",
        "Maintained, versioned with SemVer, tested in Chromium, Firefox and WebKit, with axe in the test suite.",
      ],
      betterThem: [
        "The page is a document and will stay one: an article, a README, a one-off form. Pico is smaller and needs no classes on forms.",
        "You never need anything beyond what HTML elements do on their own, and an unmaintained stylesheet that already works is fine for you.",
      ],
      betterUs: [
        "The site grows past a document: navigation that folds, dialogs, tabs, a data table, a datepicker.",
        "You want a maintained project with a written stability promise.",
        "You want to keep the semantic markup and add components one at a time.",
      ],
    },
    es: {
      title: "iVOLT o Pico CSS: adónde ir después de Pico",
      description: "Pico CSS ya no se mantiene. Cómo se compara iVOLT en tamaño, HTML semántico y modo oscuro, qué cambia en tu marcado y cuándo Pico sigue sirviendo.",
      h1: "iVOLT o Pico CSS",
      lead: "Pico conseguía que el HTML semántico se viera bien casi sin clases, y muchas webs pequeñas se hicieron con él. Su web dice ahora que Pico CSS ya no se mantiene; la 2.1.1 es la última versión. Si buscas un framework mantenido con el mismo respeto por los elementos nativos, aquí ves qué cambia y qué ganas.",
      them: [
        "Sin clases o casi: los elementos se estilan directamente (<button>, <input>, <article>, <dialog>).",
        "Modo oscuro automático según la preferencia del sistema, o con data-theme en la página.",
        "Sin JavaScript ni componentes más allá de lo que da el HTML.",
        "La portada del proyecto indica que ya no se mantiene.",
      ],
      us: [
        "core.min.css estila por elemento el texto, los títulos, las listas, las tablas, el código, las citas y los medios bajo .iv-root; formularios y botones llevan una clase (iv-input, iv-button), así nunca chocan con otra hoja.",
        `El ivolt.min.css completo suma ${words(N, "es")} componentes, con JavaScript opcional para los interactivos.`,
        "data-iv-theme=\"light|dark|system\" en cualquier elemento, anidado si quieres.",
        "Mantenido, versionado con SemVer, probado en Chromium, Firefox y WebKit, con axe en las pruebas.",
      ],
      betterThem: [
        "La página es un documento y lo seguirá siendo: un artículo, un README, un formulario suelto. Pico es más pequeño y no pide clases en los formularios.",
        "Nunca vas a necesitar más de lo que hacen los elementos HTML por sí solos, y te vale una hoja sin mantenimiento que ya funciona.",
      ],
      betterUs: [
        "La web crece más allá de un documento: navegación que se pliega, diálogos, pestañas, una tabla de datos, un selector de fechas.",
        "Quieres un proyecto mantenido con una promesa de estabilidad por escrito.",
        "Quieres conservar el marcado semántico y sumar componentes de uno en uno.",
      ],
    },
    map: [
      ["<html data-theme=\"dark\">", "<html class=\"iv-root\" data-iv-theme=\"dark\">"],
      ["<main class=\"container\">", "<main class=\"iv-container\">"],
      ["<button>", "<button class=\"iv-button iv-button--primary\">"],
      ["<button class=\"secondary\">", "<button class=\"iv-button iv-button--secondary\">"],
      ["<article>", "<article class=\"iv-card\"> + iv-card__body"],
      ["<label>Email <input type=\"email\"></label>", "<div class=\"iv-field\"><label class=\"iv-label\" for=…>Email</label><input class=\"iv-input\" …></div>"],
      ["<details>", "<details class=\"iv-disclosure\"> + iv-disclosure__summary"],
      ["<dialog>", "<dialog class=\"iv-dialog\" data-iv-component=\"dialog\">"],
      ["<div role=\"group\">", "<div class=\"iv-button-group\" role=\"group\">"],
    ],
    snippet: {
      them: `<html data-theme="dark">
<link rel="stylesheet" href="…/pico.min.css">
<main class="container">
  <article>
    <h2>Sign in</h2>
    <label>Email <input type="email" name="email"></label>
    <button>Continue</button>
  </article>
</main>`,
      us: `<html class="iv-root" data-iv-theme="dark">
<link rel="stylesheet" href="…/ivolt.min.css">
<main class="iv-container">
  <article class="iv-card"><div class="iv-card__body iv-stack">
    <h2>Sign in</h2>
    <div class="iv-field">
      <label class="iv-label" for="email">Email</label>
      <input class="iv-input" id="email" type="email" name="email">
    </div>
    <button class="iv-button iv-button--primary">Continue</button>
  </div></article>
</main>`,
    },
  },

  bulma: {
    name: "Bulma",
    version: "1.0.4",
    files: () => [file("bulma", "css"), file("bulma", "css-lite")],
    source: "https://bulma.io/documentation/",
    en: {
      title: "iVOLT vs Bulma: CSS components with or without JS",
      description: "iVOLT and Bulma compared: measured sizes, components, theming with CSS variables, dark mode and the JavaScript Bulma leaves to you. When each one fits.",
      h1: "iVOLT vs Bulma",
      lead: "Bulma and iVOLT share an idea: readable class names and components you can use straight from a CDN. The main difference is behaviour. Bulma is CSS only by design, so the navbar burger, the modal or the tabs are yours to script. iVOLT ships that JavaScript as an option, and keeps every component working as plain HTML when the script is not there.",
      them: [
        "CSS only: no JavaScript is shipped; interactive behaviour is written by you.",
        "Sass source with CSS variables in 1.0, so colours can be retuned at runtime.",
        "Built-in dark mode in 1.0, plus official builds without dark mode, without helpers, or with a bulma- prefix.",
        "Flexbox columns (columns / column is-4) and is-/has- modifiers.",
      ],
      us: [
        "CSS first, with optional JavaScript: dialogs, tabs, dropdowns, the folding navbar, a datepicker, a data table and more, each one enhancing markup that already works.",
        "Tokens as --iv- custom properties and themes with data-iv-theme on any element.",
        "BEM-style names with one prefix (iv-card__body, iv-button--primary), scoped to .iv-root.",
        "Layout primitives (iv-stack, iv-cluster, iv-grid) plus a fixed utility matrix.",
      ],
      betterThem: [
        "You want no JavaScript from the framework at all and are happy to write the few behaviours you need.",
        "You prefer is-primary / has-text-centered naming and the columns system.",
        "You already customise Bulma through Sass and have no reason to move.",
      ],
      betterUs: [
        "You do not want to write the burger, the modal, the tabs and the dropdown again for every project.",
        "You need components Bulma does not have: datepicker, combobox, data table, command palette, carousel, stepper, toast.",
        "You want a smaller stylesheet: the measurements below are what each project ships today.",
      ],
    },
    es: {
      title: "iVOLT o Bulma: componentes CSS con o sin JS",
      description: "iVOLT y Bulma comparados: tamaños medidos, componentes, temas con variables CSS, modo oscuro y el JavaScript que Bulma te deja a ti. Cuándo encaja cada uno.",
      h1: "iVOLT o Bulma",
      lead: "Bulma e iVOLT comparten una idea: nombres de clase legibles y componentes que se usan directamente desde un CDN. La gran diferencia es el comportamiento. Bulma es solo CSS por diseño, así que el botón hamburguesa, el modal o las pestañas los programas tú. iVOLT trae ese JavaScript como opción, y cada componente sigue funcionando como HTML plano cuando el script no está.",
      them: [
        "Solo CSS: no incluye JavaScript; el comportamiento interactivo lo escribes tú.",
        "Código fuente en Sass con variables CSS en la 1.0, así que los colores se reajustan en tiempo de ejecución.",
        "Modo oscuro integrado en la 1.0, y builds oficiales sin modo oscuro, sin helpers o con prefijo bulma-.",
        "Columnas con flexbox (columns / column is-4) y modificadores is-/has-.",
      ],
      us: [
        "CSS primero y JavaScript opcional: diálogos, pestañas, desplegables, la barra que se pliega, un selector de fechas, una tabla de datos y más, cada uno mejorando un marcado que ya funciona.",
        "Tokens como propiedades --iv- y temas con data-iv-theme en cualquier elemento.",
        "Nombres al estilo BEM con un solo prefijo (iv-card__body, iv-button--primary), acotados a .iv-root.",
        "Primitivas de maquetación (iv-stack, iv-cluster, iv-grid) y una matriz fija de utilidades.",
      ],
      betterThem: [
        "No quieres nada de JavaScript del framework y te parece bien escribir los pocos comportamientos que necesites.",
        "Prefieres los nombres is-primary / has-text-centered y el sistema de columnas.",
        "Ya personalizas Bulma con Sass y no tienes motivos para cambiar.",
      ],
      betterUs: [
        "No quieres volver a escribir la hamburguesa, el modal, las pestañas y el desplegable en cada proyecto.",
        "Necesitas componentes que Bulma no tiene: selector de fechas, combobox, tabla de datos, paleta de comandos, carrusel, stepper, toast.",
        "Quieres una hoja más ligera: las medidas de abajo son lo que publica hoy cada proyecto.",
      ],
    },
    map: [
      ["button is-primary", "iv-button iv-button--primary"],
      ["notification is-danger", "iv-alert iv-alert--danger"],
      ["tag is-success", "iv-badge iv-badge--success"],
      ["card · card-content", "iv-card · iv-card__body"],
      ["columns · column is-4", "iv-u-grid iv-u-grid-cols-3"],
      ["field · label · control · input", "iv-field · iv-label · iv-input"],
      ["container", "iv-container"],
      ["modal is-active (your script)", "<dialog class=\"iv-dialog\" data-iv-component=\"dialog\">"],
      ["navbar-burger (your script)", "iv-navbar, folds by itself"],
      ["has-text-centered", "iv-u-text-center"],
    ],
    snippet: {
      them: `<div class="tabs"><ul>
  <li class="is-active"><a>Overview</a></li>
  <li><a>Billing</a></li>
</ul></div>
<!-- switching panels: your own script -->`,
      us: `<div class="iv-tabs" data-iv-component="tabs">
  <div class="iv-tabs__list" aria-label="Account">
    <a class="iv-tabs__tab" href="#overview">Overview</a>
    <a class="iv-tabs__tab" href="#billing">Billing</a>
  </div>
  <section class="iv-tabs__panel" id="overview">…</section>
  <section class="iv-tabs__panel" id="billing">…</section>
</div>
<!-- without JS: links to sections; with ivolt.iife.min.js: real tabs -->`,
    },
  },
};

export { ivoltRows };
