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

Familias semánticas de color (cada una existe en light y dark): `bg`, `surface`, `surface-raised`, `text`, `text-muted`, `border`, `border-strong` (≥ 3:1, para controles), `primary`, `on-primary`, `primary-hover`, `primary-active`, `accent`, `on-accent`, `success`, `on-success`, `success-subtle`, `warning`, `warning-subtle`, `danger`, `on-danger`, `danger-subtle`, `info`, `info-subtle`, `focus`, `overlay`.

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
- Errores: `IvError` con `code` (`instance-exists`, `missing-target`, `invalid-option`). Sin `console.*` en producción salvo `warn` una vez por opción inválida.
- Dependencias entre componentes: `Drawer` y `Dropdown` reutilizan `core/focus.js`; ningún componente importa a otro.
- `init` marca `document.documentElement` con `data-iv-js=""` la primera vez que se ejecuta (si existe `document`); los fallbacks CSS sin JS se acotan con `:root:not([data-iv-js])`. `destroy` no lo retira.
- Mejora progresiva: el HTML servido es funcional sin roles ARIA de widget; `init` los añade (tabs, dropdown) y `destroy` los retira. Los atributos que el autor ya escribió se respetan y no se eliminan.

### 5.2b Superficie por componente

| Componente | Métodos de instancia | Opciones (`data-iv-*`) y valor por defecto |
|---|---|---|
| `Disclosure` | `open() close() toggle() destroy()`; `isOpen` | `exclusive` (false; en un `iv-accordion` cierra los hermanos), `closeOnOutside` (false) |
| `Tabs` | `select(idOrElement) next() prev() destroy()`; `activeTab` | `activation` (`automatic`\|`manual`, por defecto `automatic`), `orientation` (`horizontal`\|`vertical`) |
| `Dialog` | `open({ trigger }) close(reason) toggle() destroy()`; `isOpen`, `returnValue` | `closeOnBackdrop` (true), `closeOnEscape` (true), `initialFocus` (selector, null), `returnFocus` (true) |
| `Drawer` | como `Dialog` más `placement` de solo lectura | `placement` (`start`\|`end`, por defecto `start`), `closeOnBackdrop` (true), `closeOnEscape` (true), `returnFocus` (true), `staticFrom` (`lg`) |
| `Dropdown` | `open() close() toggle() destroy()`; `isOpen` | `placement` (`bottom-start`\|`bottom-end`), `closeOnSelect` (true) |
| `Toast` (por región) | `show({ message, variant, timeout, dismissible }) → ToastItem` (`dismiss()`), `clear() destroy()` | región: `placement` (`bottom-end`), `max` (3, los excedentes esperan en cola sin perderse); item: `variant` (`info`\|`success`\|`warning`\|`danger`), `timeout` (6000 ms; `0` = sin autocierre, obligatorio en `danger`), `dismissible` (true) |

Toda opción se puede fijar por atributo con su nombre en kebab-case (`data-iv-close-on-select="false"`).

### 5.3 Eventos

Todos los eventos son `CustomEvent`, `bubbles: true`, `composed: false`, despachados en `instance.element`, con `detail.instance` y campos específicos.

| Evento | Cancelable | Cuándo | `detail` extra |
|---|---|---|---|
| `iv:init` / `iv:destroy` | no | tras crear / antes de liberar | — |
| `iv:open` → `iv:opened` | sí / no | antes / después de abrir (dialog, drawer, dropdown, disclosure, toast) | `trigger`, `reason` |
| `iv:close` → `iv:closed` | sí / no | antes / después de cerrar | `reason: "escape"\|"backdrop"\|"trigger"\|"api"\|"timeout"` |
| `iv:change` → `iv:changed` | sí / no | tabs y disclosure en modo acordeón | `tab`, `panel`, `previousTab` |
| `iv:themechange` | no | en `document` | `theme`, `resolved: "light"\|"dark"` |

`preventDefault()` en el evento previo aborta la acción y no se emite el posterior. Para que esto sea cierto con `<dialog>` nativo, `Dialog` intercepta las tres vías de cierre antes de que el navegador actúe: `submit` de `form[method="dialog"]` (se cancela y se llama a `close(value)` tras `iv:close`), el evento nativo `cancel` (Esc) y el clic en backdrop (`event.target === dialog` y punto fuera del rect de `iv-dialog__panel`). Un cierre externo no interceptable (por ejemplo `dialog.close()` directo del consumidor) emite solo `iv:closed` con `reason: "external"`.

### 5.4 Disparadores declarativos (`auto.js` e `init`)

`data-iv-open="id"`, `data-iv-toggle="id"` y `data-iv-close` (sin valor: cierra el componente ancestro) se resuelven por delegación en el `root` de `init`; los elementos apuntados deben tener un componente instanciado. Un enlace `<a href="#id" data-iv-open="id">` conserva el fallback `:target` sin JS; con JS, el delegador llama a `preventDefault()` y el hash no cambia (los diálogos no admiten enlace profundo en v0.1; el fallback CSS se acota con `:root:not([data-iv-js])`).

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

Variantes: `--primary --secondary --ghost --danger`; tamaños `--sm --lg`; `--icon`. Estados vía `:hover`, `:active`, `:focus-visible`, `:disabled`/`[aria-disabled="true"]`, `[aria-busy="true"]` (bloquea clic, muestra spinner CSS, respeta reduced-motion). Locales: `--iv-button-bg --iv-button-fg --iv-button-border --iv-button-radius --iv-button-px --iv-button-py`.

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

Opciones: `closeOnBackdrop` (true), `closeOnEscape` (true), `initialFocus` (selector, por defecto primer foco tabulable o el panel), `returnFocus` (true). Los botones del `form[method="dialog"]` cierran a través de `iv:close` (cancelable) con `reason: "form"` y `detail.returnValue`. Sin JS, `:root:not([data-iv-js]) .iv-dialog:target { display:block }` lo muestra como bloque estático no modal con su enlace de cierre `href="#"`; la documentación exige que el contenido esencial tenga también una página o sección propia.
