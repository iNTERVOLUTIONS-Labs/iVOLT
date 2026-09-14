# iVOLT — Contrato de API (v0.1)

Estado: **congelado en fase 0**. Ejemplos, estilos, JS, docs y pruebas usan exactamente esta gramática. Cambiarla exige ADR.

## 1. Gramática de nombres

| Cosa | Patrón | Ejemplos |
|---|---|---|
| Bloque | `iv-<bloque>` | `iv-button`, `iv-card`, `iv-grid` |
| Elemento | `iv-<bloque>__<elemento>` | `iv-card__body`, `iv-dialog__title` |
| Modificador | `iv-<bloque>--<modificador>` | `iv-button--primary`, `iv-button--sm` |
| Utilidad | `iv-u-<prop>-<valor>` | `iv-u-gap-4`, `iv-u-grid-cols-3` |
| Utilidad responsive | `iv-u-<bp>-<prop>-<valor>` (bp ∈ `sm md lg xl`) | `iv-u-md-grid-cols-3` |
| Raíz de estilos base | `iv-root` (en `<html>`, `<body>` o un contenedor) | `.iv-root h2 { … }` |
| Variable global | `--iv-<familia>-<nombre>` | `--iv-color-primary`, `--iv-space-4` |
| Variable local de componente | `--iv-<bloque>-<prop>` | `--iv-button-bg`, `--iv-card-padding` |
| Atributo de componente | `data-iv-component="<nombre>"` | `data-iv-component="tabs"` |
| Atributo de opción | `data-iv-<opcion-kebab>` | `data-iv-close-on-backdrop="false"` |
| Atributo de disparador | `data-iv-open`, `data-iv-close`, `data-iv-toggle` | `data-iv-open="signup"` |
| Tema | `data-iv-theme="light\|dark\|system"` | `<html data-iv-theme="system">` |
| Evento | `iv:<verbo>` | `iv:open`, `iv:opened`, `iv:change` |
| Global IIFE | `IVOLT` | `IVOLT.init()` |

Reglas: minúsculas y guiones; tamaños `--sm` y `--lg` (el medio es el valor sin clase); el estado gestionado por JS se refleja en atributos nativos/ARIA (`open`, `hidden`, `disabled`, `aria-expanded`, `aria-selected`, `aria-busy`) y nunca en clases `is-*`; solo cuando no existe un atributo nativo se usa `data-iv-state`.

## 2. Tokens

Tres niveles, un origen (`tokens/tokens.json`), alias resueltos en build.

| Nivel | Prefijo | Se emite en | Ejemplo |
|---|---|---|---|
| Primitivo | `--iv-palette-<hue>-<step>` | `:root` | `--iv-palette-green-400: #29F59A` |
| Semántico | `--iv-color-*`, `--iv-space-*`, `--iv-text-*`, `--iv-font-*`, `--iv-weight-*`, `--iv-leading-*`, `--iv-radius-*`, `--iv-border-*`, `--iv-shadow-*`, `--iv-focus-*`, `--iv-z-*`, `--iv-motion-*`, `--iv-ease-*`, `--iv-measure`, `--iv-content-max` | `:root` y bloques de tema | `--iv-color-primary: var(--iv-palette-green-800)` |
| Local de componente | `--iv-<bloque>-<prop>` | en el selector del bloque, con fallback semántico | `.iv-button { --iv-button-bg: var(--iv-color-primary) }` |

Familias semánticas de color (cada una existe en light y dark): `bg`, `surface`, `surface-raised`, `text`, `text-muted`, `border`, `border-strong` (≥ 3:1, para controles), `primary`, `on-primary`, `primary-hover`, `primary-active`, `primary-subtle`, `accent`, `on-accent`, `success`, `on-success`, `success-subtle`, `warning`, `warning-subtle`, `danger`, `on-danger`, `danger-subtle`, `info`, `info-subtle`, `focus`, `overlay`.

Breakpoints: `sm 30em · md 48em · lg 64em · xl 80em · 2xl 90em`, emitidos como `@custom-media --iv-md (min-width: 48em)` y resueltos en build. Nunca `var(--iv-bp-*)` dentro de `@media`. JS los importa de `core/breakpoints.js`, generado del mismo JSON. `2xl` existe para `iv-container--wide` y docs; las utilidades responsive solo usan `sm md lg xl` (decisión de tamaño). `--iv-space-16` existe como token de layout y no genera utilidades. Medidas: `--iv-measure`, `--iv-content-max`, `--iv-container-max`.

Valores en [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## 3. Temas

```html
<html data-iv-theme="system" class="iv-root">   <!-- sigue al SO, sin JS ni storage -->
<section data-iv-theme="dark"> …</section>       <!-- ámbito anidado; lo explícito prevalece -->
```

Emisión generada:

```css
:root, [data-iv-theme="light"], [data-iv-theme="system"] { color-scheme: light; --iv-color-bg: …; }
[data-iv-theme="dark"]                                   { color-scheme: dark;  --iv-color-bg: …; }
@media (prefers-color-scheme: dark) { [data-iv-theme="system"] { color-scheme: dark; --iv-color-bg: …; } }
```

Las tres reglas tienen especificidad (0,1,0) y este orden; así un `system` anidado dentro de `dark` vuelve a light cuando el sistema es light, y un `light` anidado dentro de `system` en un sistema dark sigue siendo light. Prueba de fase 1: matriz de los nueve pares padre/hijo × dos preferencias del sistema. Sin atributo, el tema es light. `theme.js` (opcional) ofrece `getTheme()`, `setTheme('light'|'dark'|'system', { persist?: boolean, root?: Element })` y `iv:themechange`; la persistencia (`localStorage['iv-theme']`) es opt-in y la documentación incluye un snippet inline de prelectura con su hash para CSP.

## 4. Layout y utilidades

Primitivas: `iv-container` (`--narrow` = medida de lectura, `--wide` = 1440px; por defecto 1200px), `iv-stack` (flujo vertical, `--iv-stack-gap`), `iv-cluster` (flex wrap, `--iv-cluster-gap`), `iv-grid` (`--iv-grid-cols`, `--iv-grid-min` con `iv-grid--auto` para auto-fit). El gap y las columnas se ajustan con utilidades o con la variable local.

Matriz finita de utilidades (generada, sin motor arbitrario):

| Grupo | Props | Valores | Responsive |
|---|---|---|---|
| Display | `block inline inline-block flex inline-flex grid hidden` | — | sí |
| Flex | `flex-row flex-col flex-wrap flex-nowrap` · `items-{start,center,end,stretch,baseline}` · `justify-{start,center,end,between,around}` · `grow shrink-0` | — | flex-row/col sí |
| Grid | `grid-cols-{1..6,12}` · `col-span-{1..6,12,full}` | — | sí |
| Gap | `gap gap-x gap-y` | `0 1 2 3 4 5 6 8 10 12` | gap sí |
| Espaciado | `m mt mb ms me mx my p pt pb ps pe px py` | `0 1 2 3 4 5 6 8 10 12` + `auto` solo en m* | no |
| Anchura | `w-full w-auto max-w-measure max-w-content` | — | no |
| Texto | `text-{start,center,end}` · `text-{xs,sm,md,lg,xl,2xl}` · `font-{normal,medium,semibold,bold}` · `text-muted truncate` | — | text-align sí |
| Visibilidad | `sr-only sr-only-focusable` | — | no |

`ms/me/ps/pe` usan propiedades lógicas (inline-start/end). Cualquier utilidad fuera de esta tabla no existe en v0.1.

Especificidad: las utilidades se emiten con selector doblado (`.iv-u-gap-4.iv-u-gap-4`, especificidad 0,2,0) y se importan en último lugar; ningún selector de componente supera (0,2,0). Así una utilidad gana a un modificador de componente tanto en `ivolt.css` (por capa) como en `ivolt.flat.css` (por especificidad y orden). Ver ADR-019.

## 5. JavaScript

### 5.1 Entradas

```js
import { init, destroy, Dialog, Tabs, Disclosure, Drawer, Dropdown, Toast, setTheme } from "@intervolutions/ivolt";
import { Dialog } from "@intervolutions/ivolt/dialog";   // sin efectos secundarios de importación
import "@intervolutions/ivolt/auto";                      // opt-in: init(document) en DOMContentLoaded
<script src="ivolt.iife.min.js"></script>                 // global IVOLT, sin autoarranque
```

### 5.2 Ciclo de vida

```ts
init(root?: ParentNode = document, opts?: { components?: ComponentClass[] }): ComponentInstance[]
destroy(root?: ParentNode = document): void
class Dialog {
  static componentName: "dialog";
  static defaults: Readonly<DialogOptions>;
  static get(el: Element): Dialog | undefined;
  static getOrCreate(el: Element, options?: Partial<DialogOptions>): Dialog;
  static initAll(root?: ParentNode): Dialog[];         // solo [data-iv-component="dialog"]
  constructor(el: Element, options?: Partial<DialogOptions>); // lanza IvError si ya hay instancia
  readonly element: HTMLElement;
  readonly options: Readonly<DialogOptions>;            // resueltas
  open(opts?: { trigger?: Element }): void; close(reason?: string): void; toggle(): void;
  destroy(): void;                                      // libera listeners/observers, restaura solo lo que gestionó
}
```

- `init` es idempotente: elementos ya instanciados se omiten; nunca se duplican listeners. Se comprueba con test de conteo de listeners y de eventos.
- Registro: `WeakMap<Element, Map<name, instance>>`. Sin `MutationObserver` global; contenido dinámico se monta llamando `init(fragment)` o `new X(el)`.
- Precedencia de opciones: `defaults < data-iv-* < options JS`. Coerción de atributos: `"true"/"false"` → boolean, numérico → number, resto string. Sin JSON ni expresiones.
- Errores: `IvError` con `code` (`instance-exists`, `missing-target`, `invalid-option`, `invalid-element`). Sin `console.*` en producción salvo `warn` una vez por opción inválida y `warn` cuando un disparador declarativo apunta a un destino inexistente (dentro de un handler no se lanza).
- Dependencias entre componentes: `Drawer` y `Dropdown` reutilizan `core/focus.js`; ningún componente importa a otro.
- `init` marca `document.documentElement` con `data-iv-js=""` la primera vez que se ejecuta (si existe `document`); los fallbacks CSS sin JS se acotan con `:root:not([data-iv-js])`. `destroy` no lo retira.
- Mejora progresiva: el HTML servido es funcional sin roles ARIA de widget; `init` los añade (tabs, dropdown) y `destroy` los retira. Los atributos que el autor ya escribió se respetan y no se eliminan.

### 5.2b Superficie por componente

| Componente | Métodos de instancia | Opciones (`data-iv-*`) y valor por defecto |
|---|---|---|
| `Disclosure` | `open() close() toggle() destroy()`; `isOpen` | `exclusive` (false; en un `iv-accordion` cierra los hermanos, que emiten `iv:closed` con `reason: "external"`), `closeOnOutside` (false) |
| `Tabs` | `select(idOrElement) next() prev() destroy()`; `activeTab` | `activation` (`automatic`\|`manual`, por defecto `automatic`), `orientation` (`horizontal`\|`vertical`; el autor añade además la clase `iv-tabs--vertical`, el JS no toca clases de layout) |
| `Dialog` | `open({ trigger }) close(reason, returnValue) toggle() destroy()`; `isOpen`, `returnValue` | `closeOnBackdrop` (true), `closeOnEscape` (true), `initialFocus` (selector, null), `returnFocus` (true) |
| `Drawer` | como `Dialog` más `placement` de solo lectura | `placement` (`start`\|`end`, por defecto `start`), `closeOnBackdrop` (true), `closeOnEscape` (true), `returnFocus` (true), `staticFrom` (`lg`) |
| `Dropdown` | `open() close() toggle() destroy()`; `isOpen` | `placement` (`bottom-start`\|`bottom-end`), `closeOnSelect` (true) |
| `Toast` (por región) | `show({ message, variant, timeout, dismissible }) → ToastItem` (`dismiss()`), `clear() destroy()` | región: `placement` (`bottom-end`), `max` (3, los excedentes esperan en cola sin perderse); item: `variant` (`info`\|`success`\|`warning`\|`danger`), `timeout` (6000 ms; `0` = sin autocierre, obligatorio en `danger`), `dismissible` (true) |
| `Combobox` | `open() close() select(valueOrOption) clear() destroy()`; `isOpen`, `value` (confirmado), `optionElements`, `input` | `filter` (`contains`\|`starts`), `minChars` (0), `strict` (false), `autoselect` (false), `emptyText` («No matches»); ver §8.3 |
| `DataTable` | `sort(columnIndexOrTh, direction?) filter(query) clearFilter() reset() destroy()`; `sortColumn`, `sortDirection`, `rows`, `visibleRows`, `query` | `filterDelay` (150), `emptyText` («No rows match»), `statusText` («{visible} of {total} rows»), `locale` (`lang` del documento); ver §8.4 |
| `Picker` | `open() close() toggle() select(value) deselect(value) clear() destroy()`; `value`, `isOpen`, `native`, `optionElements` | `search` (`auto`\|`on`\|`off`), `placeholder` (del `<option value="">` o «Select…»), `searchPlaceholder` («Search»), `emptyText` («No matches»), `clearable` (true), `closeOnSelect` (true simple / false múltiple), `maxItems` (0), `countText` («{count} selected»); ver §8.6 |
| `Carousel` | `next() prev() goTo(index, reason?) play() pause() destroy()`; `index`, `count`, `isPlaying`, `slides` | `effect` (`slide`), `autoplay` (0), `loop` (true), `pauseOnHover` (true), `swipe` (true), `duration` (600), `pauseText` («Pause»), `playText` («Play»); ver §8.5 |
| `Megamenu` | `open(itemOrIndex) close(reason?) toggle(itemOrIndex) destroy()`; `openItem` (índices sobre todos los ítems de la barra; no-op en ítems sin panel) | `hover` (true), `openDelay` (120), `closeDelay` (200), `staticFrom` (`lg`), `overlay` (true), `closeOthers` (true); ver §8.9 |
| `Proximity` | `destroy()` (contenedor; raíz automática `data-iv-auto` en `body` si no hay ninguna) | `radius` (160); ver §8.10 |
| `Reveal` | `destroy()`; `revealed` (contenedor; raíz automática como Proximity) | `threshold` (0.15), `repeat` (false), `stagger` (80); sin eventos propios; ver §8.10 |
| `Datepicker` | `open() close() setValue(iso) clear() destroy()`; `value`, `date`, `isOpen` | `native` (`auto`), `locale`, `firstDay` (-1), `openText`, `prevText`, `nextText`, `todayText`, `clearText`, `dialogText`; ver §8.12 |
| `Tooltip` | `show(target) hide() destroy()`; `target` (contenedor; raíz automática en `body`) | `delay` (300), `placement` (`top`); ver §8.13 |
| `Popover` | `open() close() toggle() destroy()`; `isOpen`, `invoker` | `placement` (`bottom`), `align` (`start`), `offset` (8), `focus` (true); ver §8.13 |
| `Command` | `open() close() add(action) remove(id) clear() filter(query) destroy()`; `isOpen`, `query`, `actions` | `shortcut` (true), `slash` (true), `remember` (false), `recentText` («Recent»), `emptyText` («No results»), `placeholder` (vacío = el servido), `maxRecent` (5); ver §8.14 |
| `Form` | `validate() validateField(control) reset() destroy()`; `errors`, `fields` | `validateOn` (`blur`), `summary` (false), `summaryTitle` («Please fix the following»), `focusFirst` (true), `scroll` (true), `live` (true); ver §8.7 |
| `Counter` | `update() destroy()`; `count`, `max`, `control` | `mode` (`chars`), `max` (0 = el `maxlength`), `warnAt` (0.9), `template` (vacío = «{count} / {max}» o «{count}»), `overText` («Too long»); ver §8.7 |

Toda opción se puede fijar por atributo con su nombre en kebab-case (`data-iv-close-on-select="false"`).

### 5.3 Eventos

Todos los eventos son `CustomEvent`, `bubbles: true`, `composed: false`, despachados en `instance.element`, con `detail.instance` y campos específicos.

| Evento | Cancelable | Cuándo | `detail` extra |
|---|---|---|---|
| `iv:init` / `iv:destroy` | no | tras crear / antes de liberar | — |
| `iv:open` → `iv:opened` | sí / no | antes / después de abrir (dialog, drawer, dropdown, disclosure, toast) | `trigger`, `reason` |
| `iv:close` → `iv:closed` | sí / no | antes / después de cerrar | `reason: "escape"\|"backdrop"\|"trigger"\|"form"\|"api"\|"external"\|"viewport"\|"timeout"\|"hover"\|"sibling"\|"light-dismiss"\|"select"` (`hover` y `sibling` los usa el megamenú; `light-dismiss` el popover; `select` el selector de fecha), `returnValue`. `external` cubre también cierre por clic fuera o por Tab en dropdown y el cierre de hermanos en un acordeón exclusivo |
| `iv:change` → `iv:changed` | sí / no | tabs y disclosure en modo acordeón; combobox al confirmar un valor; picker al cambiar la selección; carousel al cambiar de diapositiva | `tab`, `panel`, `previousTab` (tabs/disclosure); `value`, `option`, `previousValue` (combobox); `value`, `added`, `removed` (picker); `index`, `previousIndex`, `reason` (carousel) |
| `iv:sort` → `iv:sorted` | sí / no | data table, antes / después de ordenar (`reset()` emite solo `iv:sorted` con `column: -1`) | `column`, `direction`, `previousColumn`, `previousDirection` |
| `iv:filter` → `iv:filtered` | sí / no | data table, antes / después de filtrar | previo: `query`, `previousQuery`; posterior: `query`, `visible`, `total` |
| `iv:filter` (command) | no | command tras cada filtrado (sin posterior) | `query`, `visible` |
| `iv:play` / `iv:pause` | no | carousel al iniciar o retener la rotación | `reason: "trigger"\|"api"\|"interaction"` |
| `iv:validate` | no | form, por control antes de decidir su estado | `control`, `message`, `setError(message)` |
| `iv:invalid` | no | form, tras un `submit` con errores | `errors: { control, message }[]` |
| `iv:valid` | sí | form, justo antes de dejar pasar un `submit` válido (cancelarlo impide el envío) | `errors: []` |
| `iv:count` | no | counter, en cada actualización (también la inicial) | `count`, `max`, `remaining`, `over` |
| `iv:show` → `iv:shown` | sí / no | tooltip al mostrar | `target` |
| `iv:hide` → `iv:hidden` | no / no | tooltip al ocultar (no cancelable: la burbuja nunca se queda pegada) | `target` |
| `iv:command` → `iv:commanded` | sí / no | command al activar un ítem (con `href` el posterior llega tras disparar el enlace; sin `href`, tras `run`) | `id`, `label`, `item`, `href` |
| `iv:themechange` | no | en `document` | `theme`, `resolved: "light"\|"dark"` |

`preventDefault()` en el evento previo aborta la acción y no se emite el posterior. Para que esto sea cierto con `<dialog>` nativo, `Dialog` intercepta las tres vías de cierre antes de que el navegador actúe: `submit` de `form[method="dialog"]` (se cancela y se llama a `close(value)` tras `iv:close`), el evento nativo `cancel` (Esc) y el clic en backdrop (`event.target === dialog` y punto fuera del rect de `iv-dialog__panel`). Un cierre externo no interceptable (por ejemplo `dialog.close()` directo del consumidor) emite solo `iv:closed` con `reason: "external"`.

### 5.4 Disparadores declarativos (`auto.js` e `init`)

`data-iv-open="id"`, `data-iv-toggle="id"` y `data-iv-close` (sin valor: cierra el componente ancestro; con valor: cierra ese id; razón `trigger`) se resuelven por delegación en el `root` de `init`; los elementos apuntados deben tener un componente instanciado. Un enlace `<a href="#id" data-iv-open="id">` conserva el fallback `:target` sin JS; con JS, el delegador llama a `preventDefault()` y el hash no cambia (los diálogos no admiten enlace profundo en v0.1; el fallback CSS se acota con `:root:not([data-iv-js])`).

## 6. Teclado y ARIA por componente (resumen; patrón APG referenciado)

| Componente | Base HTML | Teclado | Sin JS |
|---|---|---|---|
| Disclosure/Accordion | `<details>`/`<summary>` o botón + `aria-expanded` | Enter/Space; acordeón exclusivo opcional | `<details>` funciona nativo |
| Tabs | servido: enlaces `<a href="#panel">` + secciones con encabezado; `init` promueve a `tablist/tab/tabpanel`, `aria-selected`, roving `tabindex`, `hidden` | ← → Home End, activación automática por defecto, `data-iv-activation="manual"` | enlaces de ancla y paneles apilados con encabezados, sin roles de widget |
| Dialog | `<dialog>` nativo + `showModal()` | Esc cierra, Tab atrapado por el navegador, foco al primer elemento o `data-iv-initial-focus`, retorno al disparador | `:root:not([data-iv-js]) .iv-dialog:target` lo muestra estático; enlace de cierre `href="#"` |
| Drawer | un único `<dialog class="iv-drawer">`; en ≥ `staticFrom` el CSS lo muestra como panel estático (`display:block`, sin `open`); en < lg se abre con `showModal()`. Un listener `matchMedia` cierra el modal al cruzar el breakpoint hacia arriba (`reason: "viewport"`); al cruzar hacia abajo queda cerrado | como Dialog | visible en ≥ lg; `:target` en móvil |
| Dropdown (acciones) | servido: `<details class="iv-dropdown"><summary class="iv-button">` + lista de `<button>`/`<a>`; `init` añade `aria-haspopup="menu"`, `aria-expanded` al `summary`, `role="menu"` al contenedor, `role="menuitem"` y roving `tabindex` a los items, y escucha `toggle` | ↑ ↓ Home End, Esc, Tab cierra; sin búsqueda por letra | `<details>` nativo abre y cierra; items son botones y enlaces normales |
| Toast | región `role="status"` (info) o `role="alert"` (crítico) | Esc cierra el enfocado; sin autocierre en críticos; pausa al hover/focus | no aplica (mensajes inline) |

## 7. Ejemplos de contrato (antes de implementar)

### Button

```html
<button class="iv-button iv-button--primary">Save changes</button>
<a class="iv-button iv-button--secondary iv-button--sm" href="/docs">Read the docs</a>
<button class="iv-button iv-button--ghost" disabled>Disabled</button>
<button class="iv-button iv-button--primary" aria-busy="true">Saving…</button>
<button class="iv-button iv-button--danger iv-button--icon" aria-label="Delete"><svg …></svg></button>
<div class="iv-button-group" role="group" aria-label="View">…</div>
```

Variantes: `--primary --secondary --ghost --danger`; tamaños `--sm --lg`; `--icon`. Estados vía `:hover`, `:active`, `:focus-visible`, `:disabled`/`[aria-disabled="true"]`, `[aria-busy="true"]` (bloquea clic, muestra spinner CSS, respeta reduced-motion). Locales: `--iv-button-bg --iv-button-fg --iv-button-border --iv-button-radius --iv-button-px --iv-button-py` y, para que las variantes solo reasignen locales, `--iv-button-bg-hover --iv-button-border-hover --iv-button-bg-active`. El botón sin variante es neutro (surface-raised / text / border-strong); `--secondary` es el contorno con texto primary.

### Grid

```html
<div class="iv-grid iv-u-gap-4 iv-u-grid-cols-1 iv-u-md-grid-cols-2 iv-u-lg-grid-cols-3">
  <article class="iv-card">…</article>
</div>
<div class="iv-grid iv-grid--auto" style="--iv-grid-min: 18rem">…</div>
```

### Tabs

HTML servido (funcional sin JS: los enlaces desplazan al panel):

```html
<div class="iv-tabs" data-iv-component="tabs" data-iv-activation="automatic">
  <div class="iv-tabs__list" aria-label="Plans">
    <a class="iv-tabs__tab" href="#p-monthly" id="t-monthly">Monthly</a>
    <a class="iv-tabs__tab" href="#p-yearly"  id="t-yearly">Yearly</a>
  </div>
  <section class="iv-tabs__panel" id="p-monthly"><h3 class="iv-tabs__heading">Monthly</h3>…</section>
  <section class="iv-tabs__panel" id="p-yearly"><h3 class="iv-tabs__heading">Yearly</h3>…</section>
</div>
```

Tras `init`: `iv-tabs__list` recibe `role="tablist"`; cada enlace `role="tab"`, `aria-controls`, `aria-selected` y `tabindex` (0 en la activa, −1 en el resto); cada sección `role="tabpanel"`, `aria-labelledby`, `tabindex="0"` y `hidden` salvo la activa; el encabezado visual se oculta con `iv-u-sr-only`. `destroy` restaura el HTML servido.

```js
const tabs = Tabs.getOrCreate(el, { activation: "manual" });
el.addEventListener("iv:change", (e) => { if (e.detail.tab.id === "t-yearly") e.preventDefault(); });
tabs.select("t-yearly"); // id o elemento
```

### Dialog

```html
<a class="iv-button iv-button--primary" href="#signup" data-iv-open="signup">Create account</a>

<dialog class="iv-dialog" id="signup" data-iv-component="dialog" data-iv-close-on-backdrop="true" aria-labelledby="signup-title">
  <form method="dialog" class="iv-dialog__panel">
    <header class="iv-dialog__header">
      <h2 class="iv-dialog__title" id="signup-title">Create account</h2>
      <button class="iv-button iv-button--ghost iv-button--icon" data-iv-close aria-label="Close">×</button>
    </header>
    <div class="iv-dialog__body">…</div>
    <footer class="iv-dialog__footer iv-cluster iv-u-justify-end">
      <button class="iv-button iv-button--secondary" value="cancel">Cancel</button>
      <button class="iv-button iv-button--primary" value="confirm">Continue</button>
    </footer>
  </form>
</dialog>
```

```js
const dialog = Dialog.getOrCreate(document.getElementById("signup"));
dialog.element.addEventListener("iv:close", (e) => { if (e.detail.reason === "backdrop" && dirty) e.preventDefault(); });
dialog.open({ trigger: button });
```

Opciones: `closeOnBackdrop` (true), `closeOnEscape` (true), `initialFocus` (selector, por defecto primer foco tabulable o el panel), `returnFocus` (true). Local: `--iv-dialog-width` (32rem). Los botones del `form[method="dialog"]` cierran a través de `iv:close` (cancelable) con `reason: "form"` y `detail.returnValue`. Sin JS, `.iv-dialog:target:not([open]) { display:block }` (excepción de especificidad registrada en ADR-023) lo muestra como bloque estático no modal con su enlace de cierre `href="#"`; la documentación exige que el contenido esencial tenga también una página o sección propia.

## 8. Familias de fase 2 (congelado 2026-09-13)

### 8.1 CSS sin JS

| Familia | Marcado y clases | Modificadores / estados |
|---|---|---|
| Badge | `<span class="iv-badge">` | `--primary --success --warning --danger --info` (fondo `*-subtle`, texto `*`); `--solid` (fondo `*`, texto `on-*`); sin variante: `surface` + `border` + `text` |
| Alert | `<div class="iv-alert" role="status\|alert">` con `__icon` (opcional, `aria-hidden`), `__title`, `__body`, `__actions` | `--info` (por defecto) `--success --warning --danger`; borde inline-start de 3px en color de estado, fondo `*-subtle`. Sin botón de cierre en v0.1 (el consumidor retira el nodo) |
| Table | `<div class="iv-table-wrap" role="region" aria-labelledby tabindex="0"><table class="iv-table">` | `--striped --compact --bordered`; `--stack` apila filas por debajo de `md` mostrando `td::before { content: attr(data-iv-label) }`; `<caption>` estilizado; `th[scope]` obligatorio en fixtures; celdas numéricas `iv-u-text-end` |
| Breadcrumb | `<nav class="iv-breadcrumb" aria-label="Breadcrumb"><ol class="iv-breadcrumb__list"><li class="iv-breadcrumb__item"><a>…</a></li>` último `<li aria-current="page">` | separador como `::before` con `content: ""` y máscara SVG (no texto, para que no se lea); nunca en el primer elemento |
| Pagination | `<nav class="iv-pagination" aria-label="Pagination"><ul class="iv-pagination__list"><li><a class="iv-pagination__link" href>` | `[aria-current="page"]`, `[aria-disabled="true"]` (anterior/siguiente sin destino usan `<span>`), `iv-pagination__ellipsis`; objetivos ≥ 2.5rem |
| Progress | `<progress class="iv-progress" value max>` con etiqueta visible (`<label for>`) o `aria-label`; sin `value` = indeterminado | `--sm`; `--success --warning --danger` (color de la barra); indeterminado con animación desactivada bajo reduced-motion (barra estática al 100 % en `*-subtle`) |
| Skeleton | `<div class="iv-skeleton" aria-hidden="true">`; el contenedor que espera lleva `aria-busy="true"` | `--text` (alto 1em, ancho 100 %), `--title` (1.5em, 60 %), `--circle`, `--rect` (aspect 16/9); shimmer con `@keyframes iv-shimmer`, estático bajo reduced-motion |

### 8.2 Interactivos

| Familia | HTML servido | Tras `init` | Opciones (`data-iv-*`) y métodos |
|---|---|---|---|
| Disclosure | `<details class="iv-disclosure" data-iv-component="disclosure"><summary class="iv-disclosure__summary">…</summary><div class="iv-disclosure__content">…</div></details>`; acordeón = varios dentro de `<div class="iv-accordion">` | escucha `toggle`; emite `iv:open/opened/close/closed` (el `iv:open`/`iv:close` cancelable revierte `open` si se cancela) | `exclusive` (false): al abrir cierra los `details` hermanos del mismo `.iv-accordion`; `open() close() toggle() isOpen` |
| Tabs | ver §7 (enlaces de ancla + secciones con `iv-tabs__heading`) | roles `tablist/tab/tabpanel`, `aria-selected`, roving `tabindex`, `hidden`, `aria-controls/labelledby`; el `iv-tabs__heading` recibe `iv-u-sr-only` | `activation` (`automatic`), `orientation` (`horizontal`); `select(idOrEl) next() prev() activeTab`; teclado ← → (↑ ↓ en vertical) Home End; `iv:change` (cancelable, `tab`, `panel`, `previousTab`) → `iv:changed` |
| Dropdown | `<details class="iv-dropdown" data-iv-component="dropdown"><summary class="iv-button iv-button--secondary">Actions</summary><div class="iv-dropdown__menu"><button class="iv-dropdown__item">…</button><a class="iv-dropdown__item" href>…</a><hr class="iv-dropdown__separator"></div></details>` | `summary`: `aria-haspopup="menu"`, `aria-expanded`; `__menu`: `role="menu"`; `__item`: `role="menuitem"`, `tabindex="-1"`; foco al primer item al abrir con teclado | `placement` (`bottom-start`\|`bottom-end`), `closeOnSelect` (true); `open() close() toggle() isOpen`; teclado ↑ ↓ Home End, Esc cierra y devuelve foco, Tab cierra, clic fuera cierra; `iv:open/opened/close/closed` |
| Drawer | `<dialog class="iv-drawer" id data-iv-component="drawer" aria-label>` con `__panel`, `__header`, `__title`, `__body`, `__footer`; disparador `data-iv-open` | como Dialog; en ≥ `staticFrom` (`lg`) el CSS lo muestra como panel estático (`display:block; position: static`) y un `matchMedia` cierra el modal al cruzar (`reason: "viewport"`) | `placement` (`start`\|`end`), `staticFrom` (`lg`; `none` = siempre modal), `closeOnBackdrop closeOnEscape returnFocus`; `open({trigger}) close(reason) toggle() isOpen`; `.iv-drawer--end` para colocación por CSS |
| Toast | región `<div class="iv-toast-region" role="region" data-iv-component="toast" aria-label="Notifications">` (el rol es obligatorio: `aria-label` sin rol es un fallo de axe; `init` lo añade si falta); los items se crean por API: `<div class="iv-toast iv-toast--success" role="status\|alert">` con `__body`, `__dismiss` (botón, `aria-label`) | `show({ message, title?, variant, timeout, dismissible })` crea el nodo con `textContent` (nunca HTML); `danger` usa `role="alert"` y `timeout: 0`; máximo `max` visibles, resto en cola; pausa de temporizador con hover/focus; Esc en un toast enfocado lo descarta | región: `placement` (`bottom-end`\|`bottom-start`\|`top-end`\|`top-start`), `max` (3); item: `variant` (`info`), `timeout` (6000), `dismissible` (true); `ToastItem.dismiss()`; `clear()`; `iv:open/opened/close/closed` en cada item con `reason: "timeout"\|"trigger"\|"api"\|"escape"` | Capa superior (2026-09-14, ADR-034): cuando el navegador soporta el atributo `popover`, `init` pone `popover="manual"` en la región y `showPopover()` al presentar el primer aviso (`hidePopover()` al quedar vacía; `destroy` retira el atributo), de modo que los toasts se pintan por encima de un `<dialog>` modal (el modal mantiene inerte el resto del documento, así que el toast se ve pero no se opera hasta que el modal cierra: es el comportamiento del navegador y se acepta); sin soporte, la región sigue en `position: fixed`. El CSS sobrescribe `inset`/`margin` de la hoja de agente para `[popover]` y mantiene la colocación por `--bottom-end` etc.

## 8.3 Combobox / autocomplete (v0.2, congelado 2026-09-14)

| Aspecto | Contrato |
|---|---|
| HTML servido | `<div class="iv-combobox" data-iv-component="combobox"><label class="iv-label" for="c-country">Country</label><input class="iv-input iv-combobox__input" id="c-country" list="c-country-options" autocomplete="off"><datalist id="c-country-options"><option value="Spain">…</option></datalist></div>`. Sin JS: sugerencias nativas del `<datalist>` |
| Tras `init` | el `input` recibe `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant` (opción resaltada) y pierde `list` (se restaura en `destroy`); se crea `<ul class="iv-combobox__list" role="listbox" id>` con `<li class="iv-combobox__option" role="option" id aria-selected>` a partir de los `<option>` (`value` y texto) más `<li class="iv-combobox__empty" role="option" aria-disabled="true">` cuando no hay coincidencias; el `datalist` se conserva oculto como fuente de datos |
| Opciones (`data-iv-*`) | `filter` (`contains`\|`starts`, por defecto `contains`), `minChars` (0), `strict` (false; true = al perder el foco, si el texto no coincide con ninguna opción se restaura el último valor válido), `autoselect` (false; true = la primera coincidencia queda resaltada), `emptyText` («No matches») |
| Métodos | `open() close() select(valueOrOption) clear() destroy()`; `isOpen`, `value` (valor confirmado), `optionElements` (filas `<li role="option">`, lectura), `input`; `options` sigue siendo, como en todo componente (§5.2), las opciones resueltas |
| Teclado | ↓ abre y resalta la siguiente (con wrap), ↑ anterior, Home/End, Enter confirma la resaltada (y cierra), Esc cierra (con la lista cerrada y `strict`, restaura el último valor sin cancelar la tecla, así un diálogo padre sigue cerrándose), Tab confirma la resaltada si `autoselect` y cierra; escribir filtra y abre cuando `minChars` se alcanza; clic/toque en opción confirma; clic fuera cierra |
| Eventos | `iv:open/opened/close/closed` en el elemento raíz; `iv:change` (cancelable, `detail: { value, option, previousValue }`) → `iv:changed` al confirmar; el `input` nativo también recibe `input`/`change` sintéticos vía `dispatchEvent` para formularios |
| Accesibilidad | patrón APG combobox con listbox (autocompletado por lista); el foco permanece en el `input`; la opción resaltada se anuncia por `aria-activedescendant`; `aria-live` no es necesario; objetivo de opción ≥ 2.5rem; contraste del resaltado con `--iv-color-primary-subtle` + `--iv-color-primary` |
| CSS | `.iv-combobox` (position relative), `__list` (absoluta bajo el input, `surface-raised`, borde, sombra 2, radio md, `z-index: var(--iv-z-dropdown)`, `max-block-size: var(--iv-combobox-max-height, 16rem); overflow: auto`; con `[data-iv-placement="top"]` se coloca sobre el input: `init` mide al abrir como el picker (§8.6) y prefiere abajo, sube solo si no cabe abajo y hay más sitio arriba, y fija `--iv-combobox-max-height` en línea al espacio disponible, que retira al cerrar; cambio 2026-09-14), `__option` (`[aria-selected="true"]` resaltada; `[aria-disabled="true"]` atenuada), `__empty`; local `--iv-combobox-max-height` |
| Fuera de alcance | datos remotos/asíncronos, selección múltiple, creación de opciones, agrupación; se documentan como roadmap |

## 8.4 Data table: ordenación y filtro (v0.2, congelado 2026-09-14)

| Aspecto | Contrato |
|---|---|
| HTML servido | `<div class="iv-datatable" data-iv-component="datatable"><div class="iv-datatable__filter"><label class="iv-label" for="dt-q">Filter rows</label><input class="iv-input" id="dt-q" type="search" data-iv-datatable-filter></div><div class="iv-table-wrap" role="region" aria-labelledby="dt-cap" tabindex="0"><table class="iv-table"><caption id="dt-cap">…</caption><thead><tr><th scope="col" data-iv-sort>Name</th><th scope="col" data-iv-sort="number">Size</th><th scope="col" data-iv-sort="date">Date</th><th scope="col">Notes</th></tr></thead><tbody>…</tbody></table></div></div>`. Sin JS: tabla normal; el bloque `__filter` no se muestra (CSS: `display: none` salvo bajo `[data-iv-js]`), así no hay un control que no haga nada |
| Tipos de columna | `data-iv-sort` vacío o `"text"` (`localeCompare` con `{ numeric: true, sensitivity: "base" }` y el `locale` resuelto), `"number"` (parseFloat tras quitar todo salvo dígitos, `.`, `-`), `"date"` (`Date.parse`). Valor de celda: `td[data-iv-value]` → `time[datetime]` dentro de la celda → `textContent.trim()`. Celdas sin valor válido van al final en ambas direcciones |
| Tras `init` | cada `th[data-iv-sort]` envuelve su contenido en `<button type="button" class="iv-datatable__sort">` (se restaura en `destroy`); el `th` ordenado lleva `aria-sort="ascending"\|"descending"`, los demás no llevan `aria-sort`; se añade `<p class="iv-datatable__status" role="status">` al final del componente con `statusText` y `<tr class="iv-datatable__empty" hidden><td colspan="n">emptyText</td></tr>` al final del primer `tbody`; `data-iv-sorted="asc\|desc"` en un `th` aplica una ordenación inicial (emite `iv:sorted`, no el cancelable) |
| Ordenación | estable (empate → orden original); reordena los `<tr>` existentes de cada `tbody` con `append` (sin clonar); el clic alterna ascendente → descendente → ascendente; `destroy` devuelve las filas a su orden original |
| Filtro | `input[data-iv-datatable-filter]` dentro del componente; al escribir (con `filterDelay`) compara el texto normalizado (minúsculas, sin diacríticos) de cada `<tr>` de los `tbody` (`data-iv-filter-text` del `tr` si existe, si no `textContent`) con `includes`; las filas que no coinciden reciben `hidden`; con cero visibles se muestra `__empty`; el estado se anuncia por `__status` |
| Opciones (`data-iv-*`) | `filterDelay` (150 ms), `emptyText` («No rows match»), `statusText` («{visible} of {total} rows»; se sustituyen `{visible}` y `{total}`), `locale` (por defecto `lang` del documento o `undefined`) |
| Métodos | `sort(columnIndexOrTh, direction?)` (`"ascending"`\|`"descending"`; sin dirección alterna), `filter(query)`, `clearFilter()`, `reset()` (orden y filtro originales), `destroy()`; lectura: `sortColumn` (índice o `-1`), `sortDirection` (`"ascending"`\|`"descending"`\|`null`), `rows` (filas en orden original), `visibleRows` (número), `query` |
| Teclado | los botones de ordenación son `<button>` reales (Enter/Espacio); el filtro es un `<input type="search">` nativo; la región de scroll conserva `tabindex="0"`; sin roving tabindex |
| Eventos | `iv:sort` (cancelable, `detail: { column, direction, previousColumn, previousDirection }`) → `iv:sorted`; `iv:filter` (cancelable, `detail: { query, previousQuery }`) → `iv:filtered` (`detail: { query, visible, total }`) |
| Accesibilidad | `aria-sort` solo en la columna ordenada; el indicador de dirección es CSS (`::after` del botón), el nombre accesible del botón es el texto de la cabecera; `role="status"` para el recuento; filas ocultas con `hidden` (fuera del árbol de accesibilidad); sin cambios de foco al ordenar o filtrar; funciona con `iv-table--stack` |
| CSS | `.iv-datatable` (bloque), `__filter` (`display: none`; `[data-iv-js] .iv-datatable__filter { display: block }`, margen inferior `--iv-space-3`), `__sort` (botón sin fondo ni borde, `font: inherit`, `color: inherit`, `display: inline-flex; gap: var(--iv-space-1); align-items: center; cursor: pointer`, `::after` con indicador `↕` atenuado, `↑`/`↓` según `[aria-sort]` en el `th`), `__status` (`text-sm`, `text-muted`, `margin-block-start: var(--iv-space-2)`), `__empty td` (`text-muted`, centrado); local `--iv-datatable-gap` |
| Fuera de alcance | paginación, virtualización, selección de filas, edición, redimensionado de columnas, ordenación por varias columnas, datos remotos; se documentan como roadmap |

## 8.5 Carousel (v0.3, congelado 2026-09-14)

| Aspecto | Contrato |
|---|---|
| HTML servido | `<section class="iv-carousel" data-iv-component="carousel" aria-roledescription="carousel" aria-label="Featured work"><div class="iv-carousel__viewport"><ul class="iv-carousel__track"><li class="iv-carousel__slide" id="s1"><figure class="iv-carousel__media"><img src alt></figure><div class="iv-carousel__caption"><h3>…</h3><p>…</p></div></li>…</ul></div><nav class="iv-carousel__dots" aria-label="Slides"><a href="#s1">1</a>…</nav><div class="iv-carousel__controls"><button class="iv-button iv-carousel__prev" type="button" hidden>…</button><button class="iv-button iv-carousel__next" type="button" hidden>…</button><button class="iv-button iv-carousel__toggle" type="button" hidden>…</button></div></section>`. Sin JS: el `__track` es un contenedor con `scroll-snap-type: x mandatory` y desplazamiento horizontal; los puntos son anclas que desplazan a la diapositiva; los botones van `hidden` (con JS se muestran) |
| Tras `init` | patrón APG «tabbed carousel»: `__dots` pasa a `role="tablist"`, cada ancla a `<button role="tab" aria-selected aria-controls id>` (se restaura el ancla en `destroy`), cada `__slide` a `role="tabpanel" aria-roledescription="slide" aria-label="n of N"` (sin `aria-labelledby`: el nombre es la posición), `inert` y `aria-hidden` en las no visibles en todos los efectos (también `slide`: el carril está recortado y un enlace en una diapositiva fuera de pantalla no debe entrar en el orden de tabulación; cambio 2026-09-14 tras la revisión adversaria); el `__track` deja de ser desplazable (`data-iv-js` + CSS) y se mueve por `transform` (`slide`) o por opacidad (`fade`, `cinema`); `aria-live="off"` en `__viewport` con autoplay activo, `polite` en pausa; `__toggle` con `aria-pressed` (`true` = rotación retenida, texto `playText`; `false` = reproduciendo, texto `pauseText`) y oculto sin autoplay; se añaden `<p class="iv-carousel__counter" aria-hidden="true">01 / 05</p>` y `<div class="iv-carousel__progress" data-iv-state="running">` solo con autoplay (la pausa se expresa con `animation-play-state: var(--iv-carousel-play)` fijada por `init`); con JS el `__track` pasa a `overflow: visible` y el recorte lo hace `__viewport` (un carril recortado se borraría a sí mismo al trasladarse); `isPlaying` es la intención del usuario: hover, foco y pestaña oculta retienen el temporizador sin cambiar el estado, y toda interacción explícita pausa con `reason: "interaction"` |
| Efectos | `slide` (el carril se traslada; la leyenda se traslada a 0,6× para paralaje; las diapositivas no visibles llevan `inert`), `fade` (diapositivas apiladas, fundido cruzado), `cinema` (fundido cruzado + Ken Burns lento sobre `__media` de la activa + leyenda que sube). Con `prefers-reduced-motion`: fundido de 150 ms sin Ken Burns ni paralaje y sin autoplay |
| Opciones (`data-iv-*`) | `effect` (`slide`\|`fade`\|`cinema`, por defecto `slide`), `autoplay` (ms, 0 = sin), `loop` (true), `pauseOnHover` (true), `swipe` (true), `duration` (600 ms), `pauseText` («Pause»), `playText` («Play») |
| Métodos | `next() prev() goTo(index, reason?) play() pause() destroy()`; `index`, `count`, `isPlaying`, `slides` |
| Teclado y gestos | ← → en las pestañas (roving `tabindex`) y en el `__viewport` (tiene `tabindex="0"`), Home/End, Espacio/Enter activan; deslizar con puntero (umbral 40 px, cancela el clic) en `slide`, `fade` y `cinema`; el autoplay se pausa con hover, foco dentro y `visibilitychange`, y no se reanuda solo tras una interacción explícita del usuario (botón) |
| Eventos | `iv:change` (cancelable, `detail: { index, previousIndex, reason: "next"\|"prev"\|"tab"\|"swipe"\|"autoplay"\|"api"\|"keyboard" }`) → `iv:changed`; `iv:play`, `iv:pause` (`detail.reason`) |
| Accesibilidad | patrón APG tabbed carousel; ningún autoplay con `prefers-reduced-motion`; objetivo de botones ≥ 2.75rem; leyendas sobre `__scrim` (gradiente) con contraste AA verificado; imágenes con `alt` (la fixture lo demuestra); `destroy` restaura anclas, atributos y el desplazamiento nativo |
| CSS | `.iv-carousel` (relative, `--iv-carousel-aspect: 16 / 9`, `--iv-carousel-duration`, `--iv-carousel-ease`, `--iv-carousel-radius`), `__viewport` (overflow hidden, radio lg), `__track`, `__slide`, `__media` (`aspect-ratio`, `object-fit: cover`), `__scrim`, `__caption` (abajo a la izquierda, sobre el scrim, título grande), `__dots` (puntos; variante `iv-carousel__dots--thumbs` con miniaturas), `__prev`/`__next` (botones circulares sobre cristal `iv-glass`), `__toggle`, `__counter` (numerales grandes atenuados), `__progress` (barra fina que se rellena en `--iv-carousel-autoplay`); modificadores `iv-carousel--contained` (sin sangrado), `iv-carousel--tall` (aspect 4/5) |
| Fuera de alcance | carga perezosa propia, vídeo, varios visibles a la vez, arrastre con inercia; se documentan |

## 8.6 Picker: selector enriquecido (v0.3, congelado 2026-09-14)

| Aspecto | Contrato |
|---|---|
| HTML servido | `<div class="iv-field"><label class="iv-label" for="p-lang">Languages</label><div class="iv-picker" data-iv-component="picker" data-iv-search="on"><select class="iv-select" id="p-lang" name="lang" multiple><optgroup label="Romance"><option value="es">Spanish</option>…</optgroup><option value="de" disabled>German</option></select></div></div>`. Sin JS: el `<select>` nativo de siempre. Un `<option value="">` vacío inicial actúa de placeholder. **Todo `select.iv-select` se enriquece por defecto** cuando corre `init`/`auto.js` (ADR-032): un select sin raíz recibe un `div.iv-picker[data-iv-component="picker"][data-iv-auto]` generado (las opciones `data-iv-*` escritas en el select pasan a la raíz) que `destroy` retira; `data-iv-native` en el select o en un antecesor mantiene el control nativo |
| Tras `init` | el `<select>` se conserva como fuente de verdad y para el envío del formulario (`tabindex="-1"`, `aria-hidden="true"`, clase `iv-picker__native`, oculto con la técnica `sr-only`, nunca `display: none`); se crea `<div class="iv-picker__field">` (la caja visual, misma métrica que `.iv-input`) que contiene, en múltiple, `<ul class="iv-picker__chips">` con `<li class="iv-picker__chip">texto <button type="button" class="iv-picker__chip-remove" aria-label="Remove X"></button></li>`, y siempre `<button type="button" class="iv-picker__control" aria-haspopup="listbox" aria-expanded aria-controls=list aria-labelledby="<label> <value>">` con `__value` (texto en simple; en múltiple el recuento o el placeholder), `__placeholder` y `__caret`, más `<button type="button" class="iv-picker__clear" aria-label="Clear selection">` como hermano del control (solo si `clearable` y hay valor). Los chips nunca van dentro del botón (HTML válido: un control interactivo no contiene otros); la lista de chips solo existe en múltiple; el anillo de foco se pinta en `__field:focus-within` (cubre chips y borrado). `<div class="iv-picker__popover" hidden>` con `<input class="iv-input iv-picker__search" type="search" aria-controls=list>` (si `search`), `<ul class="iv-picker__list" role="listbox" aria-multiselectable>` (`max-block-size: var(--iv-picker-max-height)` en la lista, para que la búsqueda quede siempre visible) con `<li role="group" aria-labelledby>` por `optgroup` (etiqueta en `<span class="iv-picker__group-label">` y `<ul role="none">` interno) y `<li class="iv-picker__option" role="option" aria-selected aria-disabled id>`, y `<li class="iv-picker__empty" role="option" aria-disabled="true">`; `destroy` retira todo y devuelve el `<select>` y la `<label>` a su estado |
| Sincronización | seleccionar/deseleccionar cambia `option.selected` en el nativo y dispatch de `input`/`change` en él; cambios externos al nativo por `change` se reflejan; `form.reset()` se refleja (escucha `reset` del formulario) |
| Opciones (`data-iv-*`) | `search` (`auto`\|`on`\|`off`, por defecto `auto`: activa con > 7 opciones; cadenas, nunca booleanos, porque la gramática de §5.2 admite un solo tipo por opción), `placeholder` (del `<option value="">` o «Select…»), `searchPlaceholder` («Search»), `emptyText` («No matches»), `clearable` (true), `closeOnSelect` (true en simple, false en múltiple), `maxItems` (0 = sin límite; al alcanzarlo las demás opciones quedan `aria-disabled`), `countText` («{count} selected», texto del control en múltiple cuando hay chips) |
| Métodos | `open() close() toggle() select(value) deselect(value) clear() destroy()`; `value` (string en simple, `string[]` en múltiple), `isOpen`, `native`, `optionElements` |
| Teclado | en `__control`: ↓/Enter/Espacio abre y resalta la seleccionada (o la primera), Backspace en múltiple quita el último chip, escribir abre y filtra si hay búsqueda; en la lista: ↓↑ con envoltura saltando `aria-disabled`, Home/End, Enter/Espacio selecciona (en múltiple alterna sin cerrar), Esc cierra y devuelve el foco al control, Tab cierra; el foco vive en el control o en la búsqueda; el resalte se anuncia con `aria-activedescendant` y se pinta con el modificador `iv-picker__option--active`; clic fuera cierra; el `<option value="">` inicial no es una fila seleccionable (vaciar es cosa de `__clear`) |
| Eventos | `iv:open/opened/close/closed` en la raíz; `iv:change` (cancelable, `detail: { value, added, removed }`) → `iv:changed`; `input`/`change` sintéticos en el nativo |
| Accesibilidad | patrón APG select-only combobox (control con `aria-haspopup="listbox"`), listbox con `aria-multiselectable` cuando procede; chips con nombre accesible de borrado; contraste del resalte con `primary-subtle`; el popover se posiciona debajo; solo se voltea arriba (`data-iv-placement="top"`) cuando no cabe debajo **y** hay más sitio arriba; en ambos casos `init` fija `--iv-picker-max-height` en línea al espacio disponible en ese lado (mínimo 120 px) para que la lista nunca salga del viewport, y lo retira al cerrar; sin ese cálculo el tope es 40vh |
| CSS | `.iv-picker` (relative; `--iv-picker-max-height: 40vh`, `--iv-picker-chip-bg`), `__native` (oculto visualmente, no `display: none`, para conservar validación y envío), `__control` (misma métrica que `.iv-input`, `inline-flex`, `gap`, `flex-wrap` con chips), `__value`, `__placeholder` (muted), `__chips`, `__chip` (píldora `primary-subtle`, aparece con escala 0.85→1 en 180 ms), `__chip-remove`, `__caret` (gira 180° abierto), `__clear`, `__popover` (surface-raised, sombra 3, radio lg, entra con opacidad+translate 8px; `[data-iv-placement="top"]`), `__search`, `__list`, `__group` (etiqueta uppercase xs), `__option` (`[aria-selected="true"]` con marca `::before` y `primary-subtle`; `--active` con anillo `primary` de 2 px), `__empty`; `__field` (caja con la métrica de `.iv-input`, `flex-wrap` con chips), `__group-label`; variante `iv-picker--glass` (control y popover sobre cristal) |
| Fuera de alcance | datos remotos, creación de opciones, arrastre para reordenar, virtualización |

## 8.7 Formularios: validación, contador y enriquecimiento CSS (v0.3, congelado 2026-09-14)

**Validación (`form`)**

| Aspecto | Contrato |
|---|---|
| HTML servido | `<form class="iv-form" data-iv-component="form" data-iv-summary="true">` con controles nativos y sus atributos (`required`, `type`, `pattern`, `minlength`, `min`, `max`, `step`); mensajes por `data-iv-error-<clave>` en el control (`value-missing`, `type-mismatch`, `pattern-mismatch`, `too-short`, `too-long`, `range-underflow`, `range-overflow`, `step-mismatch`, `bad-input`, `custom`) o `data-iv-error` genérico; sin JS valida el navegador |
| Tras `init` | `novalidate` en el `<form>` (se retira en `destroy`); por control con error: `aria-invalid="true"`, `.iv-field--invalid` en el `.iv-field` contenedor, `<p class="iv-field__error" id role="alert">` creado o reutilizado y enlazado por `aria-describedby` (sin duplicar ids existentes); por control tocado y válido: `.iv-field--valid`; con `summary`: `<div class="iv-form__summary" role="alert" tabindex="-1">` con título y lista de enlaces a los controles inválidos, creado al principio del formulario o reutilizando uno servido con esa clase |
| Cuándo valida | `submit` siempre (si hay errores: `preventDefault`, resumen, foco al primer inválido o al resumen, clase `iv-shake` un instante en los `.iv-field--invalid`); por control en `blur` la primera vez y en `input` mientras esté inválido (`validateOn: "blur"`); `validateOn: "input"` valida en cada entrada; `validateOn: "submit"` solo al enviar |
| Mensaje | precedencia: `data-iv-error-<clave>` → `data-iv-error` → `validationMessage` del navegador; un oyente de `iv:validate` puede fijar uno con `detail.setError(message)` (o `""` para limpiar) sobre el control, lo que permite reglas propias (confirmación de contraseña, disponibilidad) |
| Opciones (`data-iv-*`) | `validateOn` (`blur`\|`input`\|`submit`), `summary` (false), `summaryTitle` («Please fix the following»), `focusFirst` (true), `scroll` (true), `live` (true: `aria-live` en los errores) |
| Métodos | `validate()` (boolean, aplica el estado a todos), `validateField(control)`, `reset()` (limpia estados), `destroy()`; `errors` (`{ control, message }[]`) |
| Eventos | `iv:validate` (por control, `detail: { control, message, setError }`), `iv:invalid` (en el formulario tras un `submit` fallido, `detail.errors`), `iv:valid` (cancelable, antes de dejar pasar el `submit`; cancelarlo impide el envío, para envíos asíncronos) |
| CSS (form.css) | `.iv-field--invalid` (borde `danger`, icono `::after` en el control mediante `background-image` SVG en línea), `.iv-field--valid` (borde `success` y marca), `.iv-field__error` (con icono), `.iv-form__summary` (superficie `danger-subtle`, lista de enlaces), `@keyframes iv-shake` (±6px, 320 ms, anulada con `prefers-reduced-motion`) |

**Contador (`counter`)**

| Aspecto | Contrato |
|---|---|
| HTML servido | `<div class="iv-field" data-iv-component="counter" data-iv-mode="chars"><label class="iv-label" for="bio">Bio</label><textarea class="iv-textarea" id="bio" maxlength="280"></textarea></div>`; sin JS `maxlength` limita en el navegador |
| Tras `init` | `<p class="iv-counter" aria-live="polite">` al final del campo con `<span class="iv-counter__value">120</span> / <span class="iv-counter__max">280</span>` (o solo el valor sin máximo); clases de estado `iv-counter--warn` (≥ `warnAt` del máximo) e `iv-counter--over` (> máximo, solo posible con `data-iv-max` sin `maxlength`; entonces `setCustomValidity` con `overText` y `aria-invalid="true"`, de modo que `form` y el navegador lo tratan como error); `destroy` retira el contador y la validez personalizada |
| Opciones (`data-iv-*`) | `mode` (`chars`\|`words`), `max` (número; por defecto `maxlength` del control), `warnAt` (0.9), `template` («{count} / {max}» con máximo, «{count}» sin él; `{remaining}` disponible), `overText` («Too long») |
| Métodos | `update() destroy()`; `count`, `max` |
| Eventos | `iv:count` (`detail: { count, max, remaining, over }`) en cada actualización |
| CSS | `.iv-counter` (text-sm, muted, alineado al final), `__value` (tabular-nums), `--warn` (warning), `--over` (danger, `font-weight` semibold) |

**Enriquecimiento CSS de formularios (sin JS, form.css)**

| Clase | Comportamiento |
|---|---|
| `.iv-field--float` | etiqueta flotante (con `<select>` usa `:has()`, mejora progresiva: sin soporte el texto de la opción vacía se ve bajo la etiqueta): `.iv-label` dentro del campo, posicionada sobre el control; con `:placeholder-shown` (el control lleva `placeholder=" "`) baja al centro; con `:focus` o valor sube y encoge; funciona con `.iv-input`, `.iv-textarea`, `.iv-select` |
| `.iv-input-group` | contenedor `inline-flex` que une `__addon` (prefijo/sufijo de texto o icono, `surface`, muted) y controles con radios solo en los extremos; `__addon--button` para un botón adosado |
| `.iv-switch` | `<label class="iv-switch"><input type="checkbox" role="switch"><span class="iv-switch__track"><span class="iv-switch__thumb"></span></span><span>Label</span></label>`; pista 2.75rem×1.5rem, pulgar con `transform`, `primary` al activar, foco visible en la pista |
| `.iv-range` | `<input type="range" class="iv-range">` con pista `surface`, relleno con `accent` hasta el valor mediante `--iv-range-value` (opcional, la fixture lo demuestra con `style`), pulgar con halo al foco; estilos `::-webkit-slider-*` y `::-moz-range-*` |
| `.iv-file` | `<label class="iv-file"><input type="file"><span class="iv-file__zone">…</span></label>`: zona punteada de arrastre con icono y texto, `:focus-within` con halo; el input real permanece accesible (no `display: none`) |
| `.iv-textarea` | `field-sizing: content` con `min-block-size` de 3 líneas (mejora progresiva), mismo aspecto que `.iv-input` |
| `.iv-input--lg`, `.iv-input--sm` | tallas coherentes con los botones |

## 8.8 Superficies y texturas (`surfaces.css`, v0.3, congelado 2026-09-14)

Módulo solo CSS, importado tras los componentes y antes de las utilidades en `ivolt.css` (y en la plana), para que una clase de superficie gane a los fondos de los componentes con la misma especificidad. Tokens nuevos en `tokens.json`: `glass.bg`, `glass.bg-strong`, `glass.border`, `glass.highlight`, `blur.sm/md/lg`, `glow.primary`, `glow.secondary`, `texture.grain-opacity`.

| Clase | Contrato |
|---|---|
| `.iv-glass`, `.iv-glass--strong` | `background-color: var(--iv-glass-bg)` (o `-strong`), `backdrop-filter: blur(var(--iv-blur-md)) saturate(140%)` (+ `-webkit-`), borde `var(--iv-glass-border)`, brillo superior con `box-shadow: inset 0 1px 0 var(--iv-glass-highlight)`; `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` → `background-color: var(--iv-color-surface-raised)` (el prefijo cuenta: Safari 16–17 solo lo tiene prefijado); `--strong` sube el desenfoque a `--iv-blur-lg` mediante el local `--iv-glass-blur`; regla de uso: nunca texto `text-muted` sobre cristal (queda por debajo de AA), solo `--iv-color-text`; funciona sobre `.iv-card`, `.iv-dialog__panel`, `.iv-drawer__panel`, `.iv-dropdown__menu`, `.iv-toast`, `.iv-picker__control`, `.iv-picker__popover`, `.iv-carousel__prev/__next` (la fixture lo demuestra) |
| `.iv-texture-grain` | `position: relative; isolation: isolate` y un `::after` con `background-image` SVG en línea (`feTurbulence`, `data:` URI ≤ 600 bytes), `opacity: var(--iv-texture-grain-opacity)`, `mix-blend-mode: soft-light`, `pointer-events: none`, `inset: 0`, `border-radius: inherit`; nunca sobre el texto (z-index bajo el contenido: el contenido lleva `position: relative`) |
| `.iv-texture-mesh` | fondo de malla: 3 `radial-gradient` con `--iv-color-primary`, `--iv-glow-secondary` y `--iv-color-accent` (en claro, mezclas con `color-mix` sobre `--iv-color-bg`); locales `--iv-mesh-1/2/3` para cambiar los colores |
| `.iv-texture-aurora` | como `mesh` con `background-size: 200% 200%` y `@keyframes iv-aurora` (posición, 18 s, alterno); estática con `prefers-reduced-motion` |
| `.iv-glow` | borde luminoso: `position: relative; overflow: visible` (el anillo va en `inset: -1px` y `.iv-card` recorta; una tarjeta con `iv-glow` y `iv-card__media` pierde el redondeo exterior del medio); `::before` con `inset: -1px`, `border-radius: inherit`, `background: conic-gradient(from var(--iv-glow-angle, 0deg), var(--iv-color-accent), var(--iv-glow-secondary), var(--iv-color-accent))`, enmascarado al borde con `mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)` + `mask-composite: exclude` y `padding: 1px`; `@property --iv-glow-angle` animado 6 s lineal en `:hover`/`:focus-within` (sin `prefers-reduced-motion`); sombra `0 0 24px var(--iv-glow-primary)` al hover |
| `.iv-gradient-text` | `background: linear-gradient(100deg, var(--iv-color-primary), var(--iv-color-info) 48%, color-mix(in oklab, var(--iv-color-accent) 42%, var(--iv-color-primary)))`, `background-clip: text`, `color: transparent`; la parada intermedia existe porque en oscuro `primary` y `accent` son el mismo color y el degradado literal quedaba plano (decisión del implementador aceptada 2026-09-14) |
| `.iv-shine` | barrido de luz único al hover en botones y tarjetas (`::after` con gradiente, `transform` de −120% a 120% en 700 ms) |
| `.iv-elevate` | `transform: translateY(-4px)` y sombra 3 al hover, transición `--iv-motion-slow` |
| Reglas | sin `!important`; especificidad ≤ (0,2,0); todos los efectos animados se anulan con `prefers-reduced-motion` salvo los estáticos; contraste AA del texto sobre `iv-glass` en ambos temas verificado por axe en la fixture `surfaces/glass` |

## 8.9 Megamenu (v0.4, congelado 2026-09-14)

Aprendido de las webs del propietario (brokenufo.com, clasicosbasicos.org): panel absoluto centrado bajo la barra, entrada por opacidad y traslación, `aria-expanded` en el disparador, `inert` en los paneles cerrados, superposición que oscurece la página, tarjetas con arte, recuento y flecha; en móvil, acordeón en línea. Sin dependencias (allí usan GSAP; aquí no).

| Aspecto | Contrato |
|---|---|
| HTML servido | `<nav class="iv-megamenu" data-iv-component="megamenu" aria-label="Main"><ul class="iv-megamenu__list"><li class="iv-megamenu__item"><a class="iv-megamenu__link" href="/games">Games</a><button class="iv-megamenu__toggle" type="button" aria-expanded="false" aria-controls="mm-games" hidden><span class="iv-u-sr-only">Open Games</span></button><div class="iv-megamenu__panel" id="mm-games"><div class="iv-megamenu__inner"><section class="iv-megamenu__group"><h3 class="iv-megamenu__heading">Genres</h3><ul class="iv-megamenu__links">…</ul></section><div class="iv-megamenu__cards"><a class="iv-megamenu__card" href="…"><span class="iv-megamenu__art">…</span><span class="iv-megamenu__name">…</span><span class="iv-megamenu__meta">…</span></a>…</div><footer class="iv-megamenu__bottom"><a class="iv-button iv-button--primary" href="…">Browse everything</a></footer></div></div></li>…</ul></nav>`. Sin JS: el enlace navega; el panel se muestra con `:hover`/`:focus-within` del `__item` en ≥ lg (CSS puro, sin retardo) y en línea, abierto, en < lg; el `__toggle` va `hidden`. Nota de integración: el estado abierto del `__item` es `data-iv-open=""`; el disparador declarativo de §5.4 ignora los valores vacíos, así que no colisionan |
| Tras `init` | muestra los `__toggle` (`[data-iv-js]`), desactiva el `:hover` puro (`data-iv-js` en la raíz cambia a control por atributo `data-iv-open` en el `__item`), abre al pulsar el toggle, con `Enter`/`Espacio`/`↓` en el toggle, y con hover intencional (`pointerenter` arma y el primer `pointermove` dentro del ítem arranca los 120 ms; un puntero que solo descansa sobre el ítem tras una navegación o un scroll no abre nada; `pointerleave` + 320 ms cierra; los ítems sin panel no programan apertura ni cierran el panel abierto al pasar sobre ellos; con un panel abierto, un `::before` del panel cubre el hueco bajo la barra para que el puntero lo cruce sin disparar el cierre) en dispositivos con puntero fino; cierra con `Escape` (foco al toggle), clic fuera, `Tab` al salir del panel, al abrir otro ítem; añade `<div class="iv-megamenu__overlay" hidden>` al final de la raíz; los paneles cerrados llevan `inert`; `← →` mueven entre toggles, `Home`/`End`; en < lg (`staticFrom`) los paneles funcionan como acordeón (`aria-expanded`, sin superposición, sin `inert` de hermanos) |
| Opciones (`data-iv-*`) | `hover` (true; false = solo clic), `openDelay` (120), `closeDelay` (320), `staticFrom` (`lg`), `overlay` (true), `closeOthers` (true) |
| Métodos | `open(itemOrIndex) close() toggle(item) destroy()`; `openItem` (elemento o `null`) |
| Eventos | `iv:open/opened/close/closed` en la raíz con `detail.item` y `reason: "trigger"\|"hover"\|"escape"\|"external"\|"api"\|"sibling"` |
| Accesibilidad | patrón de menú de navegación (no `role="menu"`: son enlaces); toggles con nombre; `aria-controls`; panel con `role="region"`? no: es contenido de navegación, sin rol extra; foco visible; `Escape` siempre cierra; contraste del panel (cristal opcional `iv-glass`) verificado por axe |
| CSS | `.iv-megamenu` (relative; locales `--iv-megamenu-width: min(64rem, 100vw - 2rem)`, `--iv-megamenu-offset: 0.75rem`, `--iv-megamenu-cols: 4`), `__list` (flex), `__item`, `__link`, `__toggle` (chevron `::after` que gira), `__panel` (≥ lg: absoluta bajo el ítem, centrada respecto a la raíz con `inset-inline: 0` + `margin-inline: auto`, ancho `--iv-megamenu-width`, superficie `surface-raised` + sombra 3 + radio lg + filete superior luminoso, entrada `opacity` + `translateY(8px)` en `--iv-motion-slow`; < lg: estática, `grid-template-rows: 0fr → 1fr` para el acordeón), `__inner` (grid `--iv-megamenu-cols`), `__group`, `__heading` (uppercase xs muted), `__links`, `__cards`, `__card` (arte `aspect-ratio: 3/4` con `object-fit`, nombre, meta, flecha que se desplaza al hover, `iv-elevate` opcional), `__bottom` (barra inferior con acciones), `__overlay` (fijo, `--iv-glass-bg-strong` invertido, `backdrop-filter` sm); modificador `iv-megamenu--full` (panel de borde a borde). Reduced motion: sin traslación ni retardo animado |
| Fuera de alcance | menús de varios niveles anidados, carga perezosa de contenido, arrastre |

## 8.10 Efectos de borde y proximidad (v0.4, congelado 2026-09-14)

Aprendido de las webs del propietario: líneas de exploración que cruzan (`scan`), chispas que parpadean, halos verdes y bordes que se encienden. Todo CSS salvo la proximidad, que necesita la posición del puntero.

| Clase / componente | Contrato |
|---|---|
| `.iv-edge-glint` | un destello recorre el borde una vez (`iv-edge-glint`, `iv-edge-near` e `iv-scan` declaran `position: relative`: no van sobre una capa ya absoluta como `__media`): `::before` con `inset: -1px`, `border-radius: inherit`, `conic-gradient(from var(--iv-glint-angle), transparent 0 70%, var(--iv-color-accent) 85%, transparent 100%)` enmascarado al borde (misma máscara que `iv-glow`), `@property --iv-glint-angle` animado de 0 a 360° en 1,2 s al `:hover`, `:focus-within` o cuando lleva `data-iv-inview` (lo pone `Reveal`, ver abajo); local `--iv-glint-color`; sin `prefers-reduced-motion`: borde iluminado fijo |
| `.iv-edge-near` + `Proximity` | el borde se ilumina donde el puntero se acerca (anillo de 3 px: la máscara recorta filtros y sombras, y 1 px no se ve sobre superficie clara): `::after` con `inset: -1px`, `border-radius: inherit`, `background: radial-gradient(var(--iv-near-radius, 160px) circle at var(--iv-mx) var(--iv-my), var(--iv-color-accent), transparent 70%)`, enmascarado al borde, `opacity: var(--iv-near, 0)`; el componente `Proximity` (`data-iv-component="proximity"` en un contenedor; por defecto `init` lo aplica a `document.body` si no hay ninguno) escucha `pointermove` en el contenedor (rAF, un solo listener) y para cada `.iv-edge-near` dentro calcula la distancia del puntero al rectángulo y fija `--iv-mx`/`--iv-my` (px relativos) y `--iv-near` (1 dentro, decae a 0 a `radius` px; opción `radius` 160); solo con puntero fino; `destroy` limpia variables y listener; sin JS o sin puntero fino: sin efecto (el borde normal) |
| `.iv-scan`, `.iv-scan--v` | una línea de luz cruza el bloque en bucle lento (local `--iv-scan-opacity`, 0.8; con reduced motion el pseudoelemento desaparece porque el fotograma final es invisible) (`::after` con gradiente de 2 px, `translateX(-10%) → 110%` en 6 s, `opacity` 0→1→0 como en los keyframes `scan-h/scan-v` de referencia); local `--iv-scan-duration`; solo dentro de `iv-hero` o bloques grandes; detenido con `prefers-reduced-motion` |
| `.iv-spark` | punto que parpadea (`box-shadow` en halo, escala 0.5→1.2, 2 s, `animation-delay` por `--iv-i`); estático con reduced motion |
| `.iv-pulse-glow` | halo que respira (`box-shadow` 8→16 px `--iv-glow-primary`, 2 s); para indicadores de estado |
| `Reveal` (`data-iv-component="reveal"` en un contenedor, o `data-iv-reveal` en elementos) | `IntersectionObserver` que añade `data-iv-inview` a los elementos con `data-iv-reveal` (o `.iv-reveal`) cuando entran (umbral 0,15, una sola vez salvo `repeat`); CSS `.iv-reveal` (`opacity: 0; translateY(24px)` → `[data-iv-inview]` visible, `--iv-i` para escalonar) y activa `iv-edge-glint`; sin JS o con reduced motion todo visible desde el principio (`:where(:root:not([data-iv-js])) .iv-reveal { opacity: 1; transform: none }` (dentro de `:where()` para quedar en (0,1,0))); opciones `threshold` (0.15), `repeat` (false), `stagger` (80 ms) |

Reglas: sin `!important`; especificidad ≤ (0,2,0); `Proximity` y `Reveal` respetan `init`/`destroy` exactos (variables y atributos retirados); ningún efecto sobre texto legible salvo `iv-scan` a baja opacidad.

## 8.11 Hero (v0.4, congelado 2026-09-14)

Familia CSS de composición de portadas, «súper espectaculares» sin JS obligatorio; combina superficies (§8.8) y efectos de borde (§8.10).

| Clase | Contrato |
|---|---|
| `.iv-hero` | sección de borde a borde (`inline-size: 100%`), `min-block-size: var(--iv-hero-min, 80svh)`, `display: grid`, `align-content: end` (contenido abajo por defecto), `position: relative; isolation: isolate; overflow: clip`, relleno `clamp(2rem, 6vw, 5rem)`; locales `--iv-hero-min`, `--iv-hero-max-width` (`--iv-container-max`), `--iv-hero-scrim` |
| `__media` | capa de fondo (`position: absolute; inset: 0; z-index: -2`) con `img`/`video` `object-fit: cover` o gradiente; `.iv-hero--kenburns` la escala 1 → 1.08 en 18 s (detenido con reduced motion) |
| `__scrim` | capa `-1` con gradiente de abajo (`--iv-hero-scrim`, por defecto carbón 0→0.85) para AA del texto; `.iv-hero--light` invierte |
| `__content` | columna con `max-inline-size: var(--iv-hero-max-width)`, `margin-inline: auto` |
| `__kicker` | mono, uppercase, `letter-spacing: .2em`, `--iv-hero-accent` (= `--iv-color-accent`: el primary del tema claro no llega a AA sobre el scrim carbón; con `--light` vuelve a `--iv-color-primary`); `.iv-hero--terminal` le añade el prompt `::before` («$ ») y un cursor `::after` que parpadea |
| `__title` | `clamp(2.75rem, 8vw, 7.5rem)`, `line-height: 0.92`, `letter-spacing: -0.04em`, peso 600; `em` en `--iv-hero-accent`; `.iv-hero__title > span` con `.iv-rise` (clase pública de `effects.css`: entrada por líneas al cargar, escalonada por `--iv-i`) para entrada por líneas (CSS-only: `animation` al cargar, escalonada por `--iv-i`, anulada con reduced motion) |
| `__lead` | `clamp(1.05rem, 1.2vw, 1.3rem)`, `max-inline-size: 48ch`, muted |
| `__actions` | cluster de botones |
| `__aside` | segunda columna en `.iv-hero--split` (grid 1.2fr / 0.8fr desde md) para una fixture viva, una tarjeta de cristal o un carrusel |
| `__facts` | lista horizontal de cifras (`strong` grande + etiqueta), como en la home |
| Modificadores | `--center` (contenido centrado, `align-content: center`), `--split`, `--cinematic` (`iv-texture-aurora` de fondo + `iv-scan` + `iv-spark` decorativos), `--terminal` (mono, cursor), `--compact` (`--iv-hero-min: 50svh`) |
| Accesibilidad | los medios decorativos llevan `alt=""`/`aria-hidden`; el título es el `h1` de la página (las fixtures usan `h2` porque se incrustan en páginas que ya tienen su `h1`; el CSS apunta a la clase, no a la etiqueta); sin autoplay de vídeo con sonido; texto sobre scrim con AA verificado por axe en las fixtures |
| Fixtures | `hero/basic` (media gradiente + scrim + kicker + título con `em` + lead + acciones), `hero/split` (aside con `card iv-glass` y `iv-edge-near`), `hero/cinematic` (aurora + scan + sparks + `iv-edge-glint` en el CTA), `hero/terminal` |

## 8.12 Datepicker (v0.5, congelado 2026-09-14)

| Aspecto | Contrato |
|---|---|
| HTML servido | `<div class="iv-field iv-datepicker" data-iv-component="datepicker"><label class="iv-label" for="d-start">Start date</label><input class="iv-input" type="date" id="d-start" name="start" min="2026-01-01" max="2026-12-31" value="2026-03-04"></div>`. Sin JS: el `<input type="date">` nativo con su propio selector; el valor siempre es ISO `YYYY-MM-DD` |
| Tras `init` | el input se conserva (tipo `date`, teclado y envío nativos) y `init` lo envuelve con el toggle y el popover en `<div class="iv-datepicker__control">` (la raíz es todo el campo, con etiqueta y ayuda), que `destroy` deshace; se añade tras él `<button type="button" class="iv-datepicker__toggle" aria-haspopup="dialog" aria-expanded="false" aria-controls=id aria-label="Open calendar">` con icono SVG en línea, y `<div class="iv-datepicker__popover" role="dialog" aria-modal="false" aria-label="Choose a date" hidden>` con `__header` (`<button class="iv-datepicker__nav" data-iv-dir="-1" aria-label="Previous month">`, `<h2 class="iv-datepicker__title" aria-live="polite">March 2026</h2>`, `nav +1`), `<table class="iv-datepicker__grid" role="grid" aria-labelledby=title>` con `<th scope="col" abbr="Monday">Mon</th>` (`weekday: "short"` de `Intl`; ningún locale produce dos letras) y `<td aria-selected><button type="button" class="iv-datepicker__day" data-iv-date="2026-03-04" aria-label="4 March 2026" tabindex>` (`aria-selected` va en la celda, no en el botón: axe `aria-allowed-attr`; roving tabindex; días fuera del mes con `--outside`; `--today`; `[disabled]` fuera de `min`/`max`), y `__footer` con `<button class="iv-button iv-button--ghost iv-button--sm iv-datepicker__today">Today</button>` y `__clear`; `destroy` retira todo y restaura el input (atributos y orden) |
| `native` | `auto` (por defecto): con `(pointer: coarse)` no se añade el toggle ni el popover y queda el selector nativo del móvil; `on` fuerza el nativo siempre; `off` fuerza el calendario propio |
| Localización | `locale` (`data-iv-locale`, por defecto `lang` del documento o `undefined`): nombres de mes y abreviaturas de día por `Intl.DateTimeFormat`; `firstDay` (0–6; por defecto el de `Intl.Locale.prototype.getWeekInfo`/`weekInfo` si existe, si no 1 = lunes); las etiquetas de los botones se pasan por opciones (`openText`, `prevText`, `nextText`, `todayText`, `clearText`, `dialogText`) para poder traducirlas |
| Teclado (rejilla) | ← → día, ↑ ↓ semana, Home/End inicio/fin de semana, PageUp/PageDown mes, Shift+PageUp/PageDown año, Enter/Espacio selecciona y cierra, Esc cierra y devuelve el foco al toggle; al abrir, el foco va al día seleccionado o a hoy; Tab recorre nav, rejilla (un solo tabstop) y pie; clic fuera cierra |
| Selección | escribe `input.value` en ISO y despacha `input`/`change` nativos; `min`/`max` y `step` no se saltan; `iv:change` cancelable con `detail: { value, previousValue, date }` → `iv:changed`; escribir en el input a mano repinta el calendario al abrir |
| Colocación | como el picker (§8.6): debajo por defecto, arriba solo si no cabe abajo y hay más sitio arriba, sin recortes (`data-iv-placement`); el popover no es modal y no bloquea la página |
| Opciones (`data-iv-*`) | `native` (`auto`), `locale`, `firstDay` (`-1` = automático), `openText` («Open calendar»), `prevText`, `nextText`, `todayText` («Today»), `clearText` («Clear»), `dialogText` («Choose a date») |
| Métodos | `open() close() setValue(iso) clear() destroy()`; `value` (ISO o `""`), `date` (`Date` local o `null`), `isOpen` |
| Eventos | `iv:open/opened/close/closed` (`reason: "trigger"\|"escape"\|"external"\|"api"\|"select"`), `iv:change` → `iv:changed` |
| CSS | `.iv-datepicker` (relative; el input recibe `padding-inline-end` para el toggle mediante `.iv-datepicker .iv-input`), `__toggle` (absoluto al final del input, 2.25rem, icono), `__popover` (surface-raised, sombra 3, radio lg, `inline-size: 20rem`, entrada opacidad+translate, `[data-iv-placement="top"]`), `__header`, `__nav`, `__title`, `__grid` (celdas 2.5rem, `border-spacing: 2px`), `__weekday` (xs uppercase muted), `__day` (botón cuadrado, radio md; `[aria-selected="true"]` primary/on-primary; `--today` anillo `--iv-color-accent`; `--outside` muted; `[disabled]` atenuado sin cursor; hover `surface`), `__footer` (cluster); reduced motion: sin entrada animada |
| Fuera de alcance | rangos, hora, varios meses a la vez, calendarios no gregorianos |

## 8.13 Tooltip y Popover (v0.5, congelado 2026-09-14)

**Tooltip (`tooltip`)**

| Aspecto | Contrato |
|---|---|
| HTML servido | cualquier elemento enfocable con `data-iv-tooltip="Save your changes"` (texto plano). Sin JS: sin tooltip (el texto debe ser complementario, nunca la única explicación); recomendación en docs: usar `title` solo si se acepta el retardo nativo |
| Tras `init` | raíz `[data-iv-component="tooltip"]` (contenedor; `initAll` aplica `data-iv-auto` a `document.body` si no hay raíz y sí hay objetivos) con escucha delegada de `pointerenter`/`pointerleave`/`focusin`/`focusout`/`keydown` (Esc); un solo `<div class="iv-tooltip" role="tooltip" id>` compartido, creado al mostrar por primera vez y retirado en `destroy`; el objetivo recibe `aria-describedby` (acumulativo, restaurado al ocultar); se muestra tras `delay` ms con el puntero y de inmediato con el foco; se oculta al salir, al perder el foco, con Esc y con `scroll`; punteros gruesos: solo foco |
| Colocación | encima del objetivo, centrado; debajo si no cabe encima (`data-iv-placement`); dentro del viewport horizontalmente (`max-inline-size: 18rem`, desplazamiento acotado) |
| Opciones (`data-iv-*` en la raíz) | `delay` (300), `placement` (`top`\|`bottom`, por defecto `top`) |
| Métodos | `show(target) hide() destroy()`; `target` (elemento visible o `null`) |
| Eventos | `iv:show` (cancelable, `detail.target`) → `iv:shown`; `iv:hide` → `iv:hidden` |
| CSS | `.iv-tooltip` (fijo, `z-index: var(--iv-z-toast)`, `--iv-tooltip-arrow` en línea mantiene la flecha sobre el objetivo cuando la burbuja se acota al viewport, fondo `--iv-color-text` y texto `--iv-color-bg` (invertido), radio sm, `padding: .35rem .6rem`, `text-sm`, sombra 2, flecha `::before` de 8px, entrada opacidad+translate 4px en `--iv-motion-fast`), `[data-iv-placement="bottom"]`; reduced motion sin entrada |

**Popover (`popover`)**

| Aspecto | Contrato |
|---|---|
| HTML servido | `<button class="iv-button" type="button" popovertarget="p-share">Share</button> <div class="iv-popover" id="p-share" popover data-iv-component="popover"><h3 class="iv-popover__title">…</h3><p>…</p></div>`. Sin JS: el atributo `popover` nativo abre, cierra por luz (clic fuera, Esc) y va a la capa superior, centrado en el viewport (comportamiento del navegador; aceptado como degradación) |
| Tras `init` | escucha `beforetoggle`/`toggle` del elemento: `beforetoggle` (cancelable) → `iv:open`/`iv:close` cancelables (cancelar → `preventDefault` del nativo); `toggle` → `iv:opened`/`iv:closed` (el navegador fusiona el `toggle` si el estado cambia dos veces en la misma tarea: entonces solo llega el posterior del estado final; los previos sí llegan siempre); al abrir, calcula la posición junto al invocador (`event.source` si existe, si no `[popovertarget="id"]`): `placement` `bottom` por defecto, `top` si no cabe abajo y hay más sitio arriba, alineado al inicio del invocador y acotado al viewport con `offset` px, escrito como `inset` inline (`margin: 0`); con soporte de `position-anchor`, lo usa (`anchor-name` en el invocador) y omite el cálculo; `focus: true` enfoca el primer enfocable del popover o el propio popover (`tabindex="-1"` temporal); al cerrar, si el foco estaba dentro, vuelve al invocador; `destroy` retira estilos y atributos añadidos |
| Opciones (`data-iv-*`) | `placement` (`bottom`\|`top`), `align` (`start`\|`center`\|`end`, por defecto `start`), `offset` (8), `focus` (true) |
| Métodos | `open() close() toggle() destroy()`; `isOpen`, `invoker` |
| Eventos | `iv:open/opened/close/closed` (`reason: "trigger"\|"light-dismiss"\|"escape"\|"api"`; el nativo no distingue Esc de clic fuera: ambos llegan como `light-dismiss`) |
| CSS | `.iv-popover` (surface-raised, borde, sombra 3, radio lg, `padding: var(--iv-space-4)`, `max-inline-size: min(22rem, calc(100vw - 2rem))`, `margin: 0` cuando `init` lo coloca (`[data-iv-placement]`), entrada con `@starting-style` (opacidad + translate 6px) y `transition-behavior: allow-discrete`, flecha `::before` opcional por `iv-popover--arrow` (con `overflow: visible`, porque la hoja de agente da `overflow: auto` a los popover); con anclaje nativo, si el navegador aplica un `position-try` la flecha puede no seguir el lado real: decisión aceptada), `__title` (`text-lg`, semibold); `iv-popover--glass`; reduced motion sin entrada |
| Fuera de alcance | menús (usar dropdown), popovers anidados, posicionamiento con colisiones complejas |

## 8.14 Command palette (v0.5, congelado 2026-09-14)

Aprendido de brokenufo.com (`command-palette.js`): un diálogo de búsqueda de acciones abierto con `Ctrl+K`/`⌘K` o `/`, con lista filtrada, grupos, atajos y navegación por teclado. Aquí es un `<dialog>` de iVOLT con un combobox de solo lista; las acciones vienen del HTML servido (enlaces) o de la API.

| Aspecto | Contrato |
|---|---|
| HTML servido | `<dialog class="iv-dialog iv-command" id="cmd" data-iv-component="command" aria-label="Command palette"><div class="iv-dialog__panel"><div class="iv-command__field"><label class="iv-u-sr-only" for="cmd-q">Search actions</label><input class="iv-input iv-command__input" id="cmd-q" type="search" autocomplete="off" placeholder="Type a command or search…"></div><nav class="iv-command__groups"><section class="iv-command__group" data-iv-group="Pages"><h3 class="iv-command__heading">Pages</h3><ul class="iv-command__list"><li><a class="iv-command__item" href="/getting-started" data-iv-keywords="install setup"><span class="iv-command__icon" aria-hidden="true">…</span><span class="iv-command__label">Getting started</span><kbd class="iv-command__kbd">G S</kbd></a></li>…</ul></section>…</nav><p class="iv-command__empty" hidden>No results</p><footer class="iv-command__hints" aria-hidden="true"><kbd>↑↓</kbd> navigate <kbd>↵</kbd> open <kbd>esc</kbd> close</footer></div></dialog>` más un disparador `<button data-iv-open="cmd">`. Sin JS: el `<dialog>` no se abre (no hay `open` servido) y el disparador con `data-iv-open` es un botón sin efecto: los enlaces del panel se sirven también en la navegación normal de la página, así que no se pierde nada; el disparador puede llevar `hidden` y `init` lo muestra |
| Tras `init` | reutiliza `Dialog` (la paleta es un diálogo modal: foco atrapado, Esc, backdrop) y añade: atajo global `Ctrl+K`/`⌘K` (y `/` fuera de campos de texto, opción `slash`) que abre y enfoca el input; la lista se convierte en `role="listbox"` con `role="option"` en los ítems (`aria-activedescendant` desde el input, como el combobox §8.3, `aria-controls`); filtrado sin diacríticos por etiqueta y `data-iv-keywords`, grupos vacíos ocultos, `__empty` cuando nada coincide; ↓↑ con envoltura, Home/End, Enter activa el resaltado (sigue el enlace o dispara `iv:command`), Tab cierra; los ítems recientes (últimos 5 activados, en `localStorage` bajo `iv-command-recent` solo si `remember: true`) se muestran en un grupo «Recent» generado al abrir con la búsqueda vacía; `destroy` restaura todo (incluido el grupo generado) |
| Acciones por API | `add({ id, label, group, keywords, href?, shortcut?, run? })` crea un ítem (`<button class="iv-command__item" type="button">` cuando no hay `href`), `remove(id)`, `clear()`; al activar un ítem sin `href` se emite `iv:command` (cancelable, `detail: { id, label, item }`) y después se ejecuta `run` si existe y no se canceló; los ítems servidos también emiten `iv:command` antes de seguir el enlace (cancelable) |
| Opciones (`data-iv-*`) | `shortcut` (true: `Ctrl+K`/`⌘K`), `slash` (true), `remember` (false), `recentText` («Recent»), `emptyText` («No results»), `placeholder` (del input), `maxRecent` (5) |
| Métodos | `open() close() add(action) remove(id) clear() filter(query) destroy()`; `isOpen`, `query`, `actions` (lectura) |
| Eventos | los de `Dialog` (`iv:open/opened/close/closed`) en el `<dialog>`; `iv:command` → `iv:commanded` en el `<dialog>` (también en ítems con `href`, tras disparar el enlace); `iv:filter` (`detail: { query, visible }`, no cancelable); activar siempre cierra la paleta; el primer resultado se resalta al escribir; `__status` en inglés («N results») hasta que exista `statusText` |
| Accesibilidad | diálogo modal con nombre; input con `role="combobox"`, `aria-expanded="true"`, `aria-autocomplete="list"`; resaltado por `aria-activedescendant`; anuncios del recuento con `role="status"` (`__status` generado, `aria-live="polite"`); atajos mostrados en `<kbd>` y declarados en `aria-keyshortcuts` del disparador; el atajo global no captura teclas dentro de campos editables salvo `Ctrl+K`/`⌘K` |
| CSS | `.iv-command` (`--iv-dialog-width: 40rem`, panel sin cabecera, esquina superior del viewport: `margin-block-start: 10vh`), `__field` (input grande, `text-lg`, icono de búsqueda `::before`), `__groups` (`max-block-size: min(60vh, 32rem)`, `overflow: auto`), `__group`, `__heading` (xs uppercase muted), `__list`, `__item` (fila `grid` icono + etiqueta + `kbd`, radio md, resaltado `--active` con `surface` y borde de acento a la izquierda, `[aria-selected="true"]`), `__icon`, `__label`, `__kbd` (mono xs, borde), `__empty`, `__hints` (pie con `kbd`), `__status` (`sr-only`); variante `iv-command--glass` (panel `iv-glass--strong`) |
| Fuera de alcance | búsqueda de contenido (eso es Pagefind en la web), acciones asíncronas, anidamiento de paletas |
