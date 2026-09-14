# iVOLT — Revisión de accesibilidad (fase 4, release candidate)

**Fecha:** 2026-09-13 · **Rama:** `phase-4` · **Alcance:** componentes interactivos (`dialog`, `drawer`,
`dropdown`, `tabs`, `disclosure/accordion`, `toast`) y las tres recetas (`landing`, `catalog`, `admin`).

Este documento describe **qué se probó, cómo y qué se observó**. No es una declaración de conformidad:
no se afirma cumplimiento de WCAG. Los criterios citados (2.1.1, 2.4.3, 2.4.7, 2.4.11, 4.1.2, 1.4.11)
aparecen solo como referencia del aspecto que cada comprobación mira.

---

## 1. Método

| Elemento | Valor |
|---|---|
| Servidor | `node scripts/serve.mjs` con `PORT=4185` sobre el `dist` recién construido (`npm run build`) |
| Fixtures | `http://localhost:4185/fixture/<familia>/<nombre>` (`?theme=dark` para el tema oscuro) |
| Recetas | `http://localhost:4185/examples/recipes/<landing\|catalog\|admin>/index.html` |
| Motor 1 | Chromium **153.0.8010.12** (binario de Playwright del repo) |
| Motor 2 | Firefox **155.0** (binario de Playwright del repo) |
| Runtime | Node v22.23.2, Linux headless |
| Guion | Script temporal en `.tmp/` (borrado al terminar); no se modificó ningún archivo del paquete, de los tests ni de la app de docs |

Qué hace el guion, por fixture:

1. Carga la página, espera a `init` (`document.documentElement[data-iv-js]`).
2. Pulsa `Tab` repetidamente y, en cada parada, registra el selector del `activeElement`, su
   **nombre accesible calculado** (`aria-label` → `aria-labelledby` → `<label>` asociado → texto →
   `title`) y su anillo de foco (`getComputedStyle(el).outlineStyle !== "none"` y
   `outlineWidth > 0`, con el foco llegado por teclado, es decir bajo `:focus-visible`).
3. Ejecuta las teclas que documenta `docs/API_CONTRACT.md` §6 y §8.2 (`Enter`, `Space`, `Escape`,
   `←/→/↑/↓`, `Home`, `End`, `Tab`) y compara el estado ARIA resultante con el contrato.
4. Cierra el componente y comprueba a qué elemento vuelve el foco.
5. Repite bajo `emulateMedia({ forcedColors: "active" })` leyendo los colores computados
   (`background-color`, `color`, `border-*`, `outline-*`) de controles, pestaña activa y anillo de foco,
   con captura de pantalla de apoyo (revisada y descrita aquí; el archivo era temporal y se ha borrado).

**Limitación del método:** es una revisión *manual-equivalente* automatizada. Mide el DOM, los estilos
computados y la secuencia de foco. **No** mide lo que un lector de pantalla anuncia realmente, ni el
contraste en píxeles, ni el comportamiento táctil o con zoom. Véanse las secciones 6 y 7.

---

## 2. Resultados por componente

Leyenda: **OK** = observado igual a lo documentado · **Nota** = funciona, con matiz ·
**Fallo** = divergencia respecto al contrato o problema real de teclado/semántica.

| Componente | Teclado esperado (contrato) | Teclado observado | Foco visible | Nombre accesible | Retorno de foco | Resultado |
|---|---|---|---|---|---|---|
| **Dialog** (`dialog/basic`) | `Enter` en el disparador abre; `Esc` cierra; `Tab` atrapado; foco al primer tabulable; vuelve al disparador | Idéntico en ambos motores. Ciclo: Cerrar → Work email → Cancel → Continue → (paso sin elemento) → Cerrar | Sí, `outline: solid 2px` en los 4 controles | Sí: «Close», «Work email» (vía `<label for>`), «Cancel», «Continue» | Sí, al enlace «Create account», tanto por `Esc` como por el botón Cerrar | **OK** (1 nota) |
| **Drawer** (`drawer/basic`, viewport 900 px) | Como Dialog; `matchMedia` cierra al cruzar a ≥ `lg` con `reason: "viewport"` | Abre con `Enter`, `Esc` cierra, foco atrapado. Al ampliar a 1280 px: `open=false`, `display:block`, `position:static` | Sí, en los 4 enlaces del panel y en ambos «Close» | Sí; el `<dialog>` lleva `aria-label="Site navigation"` | Sí, al botón «Open navigation» | **OK** (1 nota) |
| **Dropdown** (`dropdown/basic`) | `init` añade `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`, `role="menuitem"`, roving `tabindex`; `↑ ↓ Home End`, `Esc` cierra y devuelve foco, `Tab` cierra, clic fuera cierra | Roles y roving `tabindex="-1"` correctos. Apertura por teclado enfoca el primer ítem. `↓`→2.º, `End`→último, `Home`→1.º, `↑`→último (envuelve). `Esc` cierra y devuelve el foco al `summary`. `Tab` cierra. Clic fuera cierra | Sí en el `summary` y en los ítems | Sí: «Actions», «Duplicate project», «Export as CSV», «Read the retention policy» | `Esc`: sí, al `summary`. **`Tab`: no** → el foco queda en `<body>` | **Fallo (medio)** |
| **Tabs** (`tabs/basic`) | `tablist/tab/tabpanel`, `aria-selected`, roving `tabindex`, `hidden`, `←/→ Home End`, activación automática | Todo correcto e idéntico en ambos motores: `→` avanza y activa, `End` va a la última, `→` en la última envuelve a la primera, `Home` a la primera, `↑` no hace nada en horizontal (correcto), `Tab` desde la pestaña activa va al panel activo (`tabindex="0"`). Encabezados `iv-tabs__heading` reciben `iv-u-sr-only` | Sí (`outline 2px`) en pestañas y en el panel | Sí; `tablist` con `aria-label="Plans"`, paneles con `aria-labelledby` | n/a | **OK** |
| **Disclosure / Accordion** (`disclosure/accordion`) | `Enter`/`Space` alternan; `exclusive` cierra los hermanos | `Tab` recorre los tres `summary` en orden. `Enter` sobre el 2.º lo abre **y cierra el 1.º** (exclusivo correcto). `Space` lo cierra. `Esc` no hace nada (correcto: no está en el contrato) | Sí (`outline 2px`) en los tres | Sí: el texto de cada `summary` | n/a | **OK** |
| **Toast** (`toast/basic`, dos toasts creados vía `import("/packages/ivolt/dist/js/index.js")`) | Región `role="region"`; item `role="status"`, `danger` → `role="alert"` y sin autocierre; `Esc` sobre el toast enfocado lo descarta; botón de cierre con `aria-label` | Región `role="region"` + `aria-label="Notifications"`, **sin `aria-live`**. Item success → `role="status"`; item danger → `role="alert"` y persiste (no autocierra): correcto. Cada item lleva `tabindex="0"`, de modo que hay 4 paradas de tabulación con 2 toasts. `Esc` sobre el botón de cierre descarta ese toast | Sí en item y en botón de cierre | Botón: «Dismiss» (`aria-label`). Item: su texto, que incluye el carácter `×` del botón | **No**: tras descartar con `Esc`, el foco queda en `<body>` | **Fallo (alto + medio)** |

Notas de la tabla:

- **Dialog / Drawer, nota:** el foco inicial cae en el botón **Cerrar** (primer tabulable del panel).
  Es lo que dice el contrato («primer foco tabulable»), pero para un usuario de lector de pantalla la
  primera cosa anunciada dentro del diálogo es «Close, button», no el título. Ver hallazgo F5.
- **Dialog / Drawer, observación de motor:** en Chromium el ciclo de tabulación del modal incluye un
  paso en el que `activeElement` es `<body>` (el foco pasa por el propio `<dialog>` / la UI del
  navegador) antes de volver al primer control. El ciclo se cierra dentro del modal en ambos motores,
  así que **no** se observó fuga del foco fuera del diálogo. En Firefox headless el recorrido terminó
  repitiendo el último elemento; conviene reconfirmarlo a mano en un Firefox real (ver sección 7).
- Ni `dialog` ni `drawer` declaran `aria-modal="true"`. No es un fallo: usan `<dialog>` + `showModal()`,
  cuya modalidad es nativa; `aria-modal` sería redundante.
- El `<hr class="iv-dropdown__separator">` dentro de `role="menu"` no lleva `role="separator"` explícito,
  pero el rol implícito de `<hr>` ya es `separator`, así que el menú no tiene hijos inválidos.

### Tema oscuro (`?theme=dark`)

Comprobado en `button/variants`, `form/basic`, `tabs/basic`, `dropdown/basic` y
`disclosure/accordion`, en ambos motores: el anillo de foco se dibuja siempre como
`outline: solid 2px rgb(41, 245, 154)` con `outline-offset: 2px`. Ningún control perdió el anillo.
Ver hallazgo F6 sobre el caso límite del botón primario.

---

## 3. Recetas

Las tres recetas se recorrieron en Chromium y Firefox con resultados idénticos.

| Comprobación | landing | catalog | admin |
|---|---|---|---|
| `<html lang>` y `<title>` | `en` · «iVOLT recipe — Marketing landing page» | `en` · «… Product catalogue» | `en` · «… Admin dashboard» |
| Un solo `<h1>` y un solo `<main>` | Sí | Sí | Sí |
| Orden de encabezados sin saltos | Sí (H1 → H2 → H3) | Sí | Sí |
| Landmarks etiquetados | `header`, `nav[Primary]`, `main`, `footer`, `nav` de pie con `aria-labelledby` | + `nav[Breadcrumb]`, `nav[Pagination]`, `tablist[Aurora standing desk]`, tres `tabpanel` con `aria-labelledby` | + `nav[Admin sections]`, `region` con `aria-labelledby` (tabla), `region[Notifications]` (toasts) |
| «Skip to content» es la primera parada de `Tab` | Sí | Sí | Sí |
| El enlace se hace visible al recibir foco | Sí (`iv-u-sr-only-focusable`; caja real de 122 × 19 px en la esquina superior izquierda, sin recorte) | Sí | Sí |
| `Enter` sobre él lleva el foco al contenido | Sí: `#main` (que lleva `tabindex="-1"`) recibe el foco y la página desplaza | Sí | Sí |
| El `Tab` siguiente continúa **dentro** de `<main>` | Sí («Contact us (demo)») | Sí («Home») | Sí (`.iv-table-wrap`, región desplazable con nombre) |
| Controles sin nombre accesible | 0 | 0 | 0 |
| `<img>` sin atributo `alt` | 0 | 0 | 0 |

Sin hallazgos en las recetas. Referencias: 2.4.1 (bypass), 2.4.3, 2.4.6, 4.1.2.

---

## 4. `forced-colors` (modo de contraste alto)

Emulado con `page.emulateMedia({ forcedColors: "active" })` en ambos motores. **El CSS del paquete no
contiene ningún bloque `@media (forced-colors: active)`** (`grep -r "forced-colors" packages/ivolt/src`
no devuelve nada; sí existe en `apps/docs/src/pages/foundations/accessibility.astro`, que es la web de
documentación, no la librería). Todo lo observado es, por tanto, el comportamiento por defecto del
navegador.

**Observado (bien):**

- **Anillo de foco: se conserva.** `outline: solid 2px` en todos los controles probados, con el color
  forzado del sistema (Chromium `rgba(5,0,73,.8)`, Firefox `rgb(0,0,238)`). Referencia 2.4.7 / 1.4.11.
- **Botones: siguen siendo identificables.** La captura de `button/variants` con forced-colors muestra
  seis píldoras con borde de 1 px y texto en color de sistema; el botón enfocado («Primary») se
  distingue con claridad por el doble trazo (borde + `outline` separado por `outline-offset`). El
  enlace estilizado como botón queda en color de enlace (azul), diferenciado del resto.
- **Campos de formulario:** `.iv-input` conserva fondo `Field`, texto `FieldText` y borde de 1 px.
- **Menú del dropdown:** `.iv-dropdown__menu` conserva fondo opaco y borde de 1 px, así que no se funde
  con el contenido de debajo.
- **`<progress>`** conserva borde y fondo del sistema.

**Observado (mal) — ver hallazgo F3:**

- **La pestaña activa deja de ser distinguible.** El indicador es `.iv-tabs__tab::after` con
  `background-color: var(--iv-color-primary)`; en forced-colors ese fondo se fuerza a `Canvas`
  (Chromium `rgb(255,255,255)`, Firefox `rgb(255,255,255)`) sobre el fondo de página del mismo color,
  es decir **invisible**. Además, el `color` de la pestaña seleccionada y el de las no seleccionadas se
  fuerzan al mismo valor (`LinkText`) y ninguna tiene borde. Resultado: las tres pestañas se ven
  exactamente iguales y la selección solo queda expresada en `aria-selected`.
- **Las variantes de botón se vuelven indistinguibles entre sí**, incluida `--danger`, que pasa a verse
  igual que `--secondary`, `--ghost` y la neutra. Esto es el comportamiento esperado y deseado de
  forced-colors (el usuario impone su paleta), pero **obliga a que el texto del botón lleve el
  significado**: un botón `--danger` rotulado «Continue» es indistinguible de uno seguro.

**Recomendación general de forced-colors:** añadir al CSS del paquete un bloque por componente que
reexprese en colores de sistema los estados que hoy se comunican solo con fondo o color. Ver F3 y F7.

---

## 5. Hallazgos priorizados

### F1 — Los toasts probablemente no se anuncian: la región viva se crea junto con su contenido · **Alta**

`packages/ivolt/src/js/components/toast.js` (`_createNode`, ~línea 296) crea el nodo del toast ya con
`role="status"` (o `role="alert"` en `danger`) **y con su texto dentro**, y lo inserta después en la
región. Una región viva tiene que existir en el árbol *antes* de que su contenido cambie para que el
lector de pantalla observe la mutación; NVDA y JAWS habitualmente **no anuncian** una región viva que
aparece ya poblada. La región contenedora (`.iv-toast-region`) sí es persistente, pero solo tiene
`role="region"` y `aria-label`, **sin `aria-live`** (verificado: `aria-live` es `null`).

Esto no se puede confirmar en este entorno (no hay lector de pantalla). Es el riesgo de accesibilidad
más serio del release candidate porque un toast que no se anuncia es información perdida para quien no
mira la pantalla. Referencia 4.1.3 / 4.1.2.

**Propuesta concreta** (`packages/ivolt/src/js/components/toast.js`), una de las dos:

- *(a) Región viva persistente.* Que la región (o dos subregiones creadas por `init`, una
  `aria-live="polite"` y otra `aria-live="assertive"` para `danger`) lleve el `aria-live`, y que los
  items dejen de declarar `role="status"`/`role="alert"` propios.
- *(b) Inserción en dos tiempos.* Insertar el nodo vacío con su rol y escribir `textContent` en el
  siguiente frame (`requestAnimationFrame`), de forma que el rol exista antes que el contenido.

La opción (a) es más robusta entre lectores. Sea cual sea, debe documentarse en §8.2 del contrato y
quedar en la lista de verificación con NVDA de la sección 6.

### F2 — El foco se pierde al `<body>` al descartar un toast con `Escape` · **Media**

Observado en ambos motores: con el foco en `.iv-toast__dismiss`, `Escape` descarta el toast y
`document.activeElement` pasa a ser `<body>`. El usuario de teclado queda sin punto de inserción y su
siguiente `Tab` reinicia el recorrido desde el principio del documento. Referencia 2.4.3.

**Propuesta** (`packages/ivolt/src/js/components/toast.js`, `_dismiss`, ~línea 461): antes de
`item.element.remove()`, si el foco está dentro del item, moverlo al siguiente toast de la región y, si
no queda ninguno, al elemento que originó el toast si se conoce, o en su defecto a la región (que
tendría que recibir `tabindex="-1"` temporalmente). Documentar el comportamiento elegido en el contrato.

### F3 — La pestaña activa desaparece en `forced-colors` · **Media**

`packages/ivolt/src/css/components/tabs.css` líneas 47–63: el indicador es un `::after` con
`background-color`, y la selección también se expresa con `color: var(--iv-color-primary)`. Ambas cosas
se anulan en modo de contraste alto (medido en Chromium y Firefox). La selección queda solo en ARIA:
visible para el lector de pantalla, invisible para quien usa contraste alto con la vista.
Referencia 1.4.1 / 1.4.11.

**Propuesta** — añadir al final de `packages/ivolt/src/css/components/tabs.css`:

```css
@media (forced-colors: active) {
  .iv-tabs__tab::after { background-color: Canvas; forced-color-adjust: none; }
  .iv-tabs__tab[aria-selected="true"]::after { background-color: Highlight; forced-color-adjust: none; }
  .iv-tabs__tab[aria-selected="true"] { color: Highlight; }
}
```

(y revisar del mismo modo cualquier otro estado que hoy se exprese solo con fondo: `iv-badge--solid`,
el borde de estado de `iv-alert`, la barra de `iv-progress` y el shimmer de `iv-skeleton`).

### F4 — `Tab` cierra el dropdown pero deja el foco en `<body>` · **Media**

Observado en ambos motores: con el menú abierto y el foco en un `menuitem`, `Tab` cierra el dropdown
(correcto según §8.2) pero el foco acaba en `<body>` en vez de continuar en el elemento siguiente al
`summary`. El siguiente `Tab` reinicia desde el principio del documento. Referencia 2.4.3.

**Propuesta** (`packages/ivolt/src/js/components/dropdown.js`, alrededor de la línea 291, donde ya existe
`this._summary.focus()` para el caso `Escape`): en el manejador de `Tab`, cerrar, devolver el foco al
`summary` **sin** `preventDefault()`, de modo que el propio navegador continúe la tabulación desde ahí
(o, si hace falta cancelar el evento nativo, calcular y enfocar explícitamente el siguiente tabulable).

### F5 — El foco inicial de `dialog`/`drawer` cae en el botón «Close» · **Baja**

Es conforme al contrato («primer foco tabulable o `data-iv-initial-focus`»), pero hace que lo primero
que se anuncie dentro del modal sea «Close, button». Afecta a la fixture y, por extensión, a lo que la
documentación enseña a copiar.

**Propuesta:** en `packages/ivolt/fixtures/dialog/basic.html` añadir
`data-iv-initial-focus="#signup-email"` al `<dialog>`, y documentar en la página de Dialog de la web que
el primer foco debería ser el primer control útil, no el de cierre. (Cambio de fixture: pertenece al
paquete, así que lo dejo propuesto, no aplicado.)

### F6 — El color del anillo de foco coincide con el del botón primario en tema oscuro · **Baja**

En `?theme=dark`, `--iv-color-focus` resuelve a `rgb(41,245,154)`, el mismo valor que el fondo de
`.iv-button--primary`. Hoy no da problema porque `outline-offset: 2px` dibuja el anillo sobre el fondo
de página oscuro, pero un botón primario colocado sobre una superficie del mismo color primario
(una banda CTA, por ejemplo) perdería el indicador. Referencia 2.4.11 / 1.4.11.

**Propuesta:** anillo de dos tonos en `packages/ivolt/src/css/components/button.css` (y en la regla de
foco compartida): `outline: 2px solid var(--iv-color-focus)` más
`box-shadow: 0 0 0 var(--iv-focus-offset) var(--iv-color-bg)`, de modo que siempre haya un tono de
separación sea cual sea el fondo. O documentar la restricción.

### F7 — Cada toast es una parada de tabulación permanente · **Baja / informativa**

Los items llevan `tabindex="0"` (necesario para que `Escape` los descarte), así que dos toasts añaden
cuatro paradas al recorrido de teclado y las quitan cuando expiran: el orden de tabulación cambia bajo
el usuario. Es una consecuencia aceptada del diseño, pero conviene que el contrato lo diga
explícitamente y que la documentación recomiende `timeout: 0` cuando el toast contenga acciones.

Relacionado: el botón de cierre usa `textContent = "×"` con `aria-label="Dismiss"`. El nombre accesible
del botón es correcto, pero el `×` forma parte del texto del item (`«Project saved ×»`) y por tanto del
texto que la región viva anunciaría. **Propuesta:** envolver el glifo en
`<span aria-hidden="true">×</span>` dentro de `_createNode`
(`packages/ivolt/src/js/components/toast.js`, ~línea 319).

---

## 6. Lista para lector de pantalla — **NO EJECUTADA**

> **Estado: pendiente.** En este entorno no hay NVDA, JAWS ni VoiceOver (Linux headless, sin salida de
> audio ni API de accesibilidad de plataforma). Nada de esta sección se ha ejecutado ni verificado.
> Es el guion a seguir a mano antes de publicar la v0.1.

Configuración de referencia:

- **NVDA (última estable) + Firefox (última estable), Windows 11.** Modo navegación activado por
  defecto; usar `Insert+Space` para alternar a modo foco cuando se indique. Activar el visor de voz
  (`NVDA menu → Herramientas → Visor de voz`) y pegar lo anunciado en el acta de la prueba.
- **VoiceOver + Safari (última estable), macOS.** `VO` = `Control+Option`. Activar «VoiceOver puede
  seguir el foco del teclado». Usar el rotor (`VO+U`) para las comprobaciones de landmarks y encabezados.

Para cada paso, anotar **lo que se oye literalmente** y marcar ✔/✘.

### 6.1 Dialog — `/fixture/dialog/basic`

| # | Pasos | Debe anunciarse |
|---|---|---|
| 1 | `Tab` hasta «Create account» | «Create account, enlace» (NVDA) / «Create account, enlace» (VO) |
| 2 | `Enter` | Que se ha entrado en un diálogo: NVDA «Create account, diálogo» seguido del contenido; VO «Create account, diálogo web». El título (`#signup-title`, referenciado por `aria-labelledby`) debe formar parte del anuncio |
| 3 | Recorrer con `Tab` | «Close, botón» → «Work email, editar» → «Cancel, enlace» → «Continue, botón». Ningún «botón» sin nombre, ningún «gráfico» suelto (la `<svg>` del cierre es `aria-hidden`) |
| 4 | Modo navegación NVDA: `↓` desde el inicio del diálogo | El recorrido no debe salir del diálogo hacia el contenido de la página de fondo |
| 5 | `Esc` | El foco vuelve a «Create account, enlace» y NVDA/VO lo reanuncian |
| 6 | Reabrir y cerrar con el botón «Close» | Igual que 5 |

### 6.2 Drawer — `/fixture/drawer/basic` (ventana estrecha, < 1024 px)

| # | Pasos | Debe anunciarse |
|---|---|---|
| 1 | `Tab` a «Open navigation», `Enter` | «Site navigation, diálogo» (nombre tomado de `aria-label`) |
| 2 | `Tab` por el panel | «Close, botón», luego los cuatro enlaces dentro de una región de navegación «Sections» |
| 3 | Rotor / `D` (NVDA) para landmarks | Debe listarse la navegación «Sections» dentro del diálogo |
| 4 | `Esc` | Foco y anuncio de vuelta en «Open navigation, botón» |
| 5 | Ensanchar la ventana a ≥ 1024 px con el drawer abierto | Se cierra el modal; comprobar que el contenido del panel sigue siendo alcanzable como panel estático y que el lector no queda «atrapado» en un diálogo ya cerrado |

### 6.3 Dropdown — `/fixture/dropdown/basic`

| # | Pasos | Debe anunciarse |
|---|---|---|
| 1 | `Tab` a «Actions» | «Actions, botón de menú contraído» (NVDA) / «Actions, menú emergente» (VO). Verificar que se lee el estado contraído (`aria-expanded="false"`) |
| 2 | `Enter` | «expandido» y, a continuación, «Duplicate project, elemento de menú, 1 de 3» |
| 3 | `↓`, `↓` | «Export as CSV, 2 de 3» y «Read the retention policy, 3 de 3». Comprobar si el `<hr>` se anuncia como separador y si el recuento de elementos es correcto |
| 4 | `Home` / `End` | Primer y último elemento del menú |
| 5 | `Esc` | Vuelta a «Actions, botón de menú contraído» |
| 6 | Con el menú abierto, `Tab` | El menú se cierra; **comprobar dónde queda el foco** — es el hallazgo F4, hoy se pierde al `body` |

### 6.4 Tabs — `/fixture/tabs/basic`

| # | Pasos | Debe anunciarse |
|---|---|---|
| 1 | `Tab` hasta la primera pestaña | «Plans, lista de pestañas, Monthly, pestaña, seleccionada, 1 de 3» |
| 2 | `→` | «Yearly, pestaña, seleccionada, 2 de 3» y el cambio de panel |
| 3 | `Tab` desde la pestaña activa | «Yearly, panel de pestaña» — el nombre del panel viene de `aria-labelledby` apuntando a la pestaña |
| 4 | Modo navegación: rotor de encabezados | Los `iv-tabs__heading` llevan `iv-u-sr-only`: **confirmar que siguen presentes en el árbol de accesibilidad** y que el rotor los lista; si no aparecen, el usuario pierde la estructura que sí existe sin JS |
| 5 | `Home` / `End` | Primera y última pestaña, con su índice |

### 6.5 Disclosure / Accordion — `/fixture/disclosure/accordion`

| # | Pasos | Debe anunciarse |
|---|---|---|
| 1 | `Tab` al primer `summary` | «How is the monthly usage calculated?, botón, expandido» |
| 2 | `Tab` al segundo, `Enter` | «expandido» en el segundo **y** el cambio de estado del primero (ahora contraído). Comprobar si el cierre del hermano se anuncia o pasa en silencio: con `exclusive` el usuario debe poder darse cuenta de que se le cerró el panel anterior |
| 3 | `Space` | «contraído» |
| 4 | Modo navegación, `↓` dentro de un panel abierto | El contenido del panel es alcanzable; el de los cerrados, no |

### 6.6 Toast — `/fixture/toast/basic`

Este es el bloque crítico (hallazgo F1). Ejecutar con el visor de voz abierto y guardar la transcripción.

| # | Pasos | Debe anunciarse |
|---|---|---|
| 1 | En la consola: `const t = (await import("/packages/ivolt/dist/js/index.js")).Toast.getOrCreate(document.querySelector(".iv-toast-region"))` | — |
| 2 | `t.show({ message: "Project saved", variant: "success" })` **sin tocar el teclado** | «Project saved» debe anunciarse solo, sin interrumpir. **Si no se oye nada, F1 está confirmado.** |
| 3 | `t.show({ message: "Export failed", variant: "danger" })` | Debe anunciarse de inmediato e interrumpiendo (`role="alert"`) |
| 4 | Comprobar que el `×` no se lee | Si se oye «Project saved, multiplicación» o «Project saved, por», aplicar la propuesta de F7 |
| 5 | `Tab` hasta el toast | «Project saved» como grupo enfocable, luego «Dismiss, botón» |
| 6 | `Esc` con el foco en el toast | El toast desaparece; **anotar dónde queda el foco y si el lector lo comunica** (hallazgo F2) |
| 7 | Esperar 6 s con un toast `info` | Debe desaparecer solo; comprobar que no se anuncia nada al desaparecer y que el foco no salta |
| 8 | Pasar el ratón / poner el foco sobre un toast | El temporizador se pausa; verificar que el usuario dispone de tiempo suficiente |

### 6.7 Recetas — `landing`, `catalog`, `admin`

| # | Pasos | Debe anunciarse |
|---|---|---|
| 1 | Cargar la página, primer `Tab` | «Skip to content, enlace» y el enlace debe **verse** en pantalla |
| 2 | `Enter` | El foco entra en el contenido principal; NVDA anuncia «principal, región» o el primer encabezado |
| 3 | NVDA `D` / VO rotor de landmarks | banner, navegación «Primary» (+ «Breadcrumb», «Pagination», «Admin sections» según receta), principal, pie de página. Ninguna región sin nombre cuando hay varias del mismo tipo |
| 4 | NVDA `H` / VO rotor de encabezados | Secuencia sin saltos (H1 → H2 → H3) y coherente con lo que se ve |
| 5 | `catalog`: rotor de formularios en «Filters» | Todos los controles con etiqueta; los grupos con `fieldset`/`legend` anunciados |
| 6 | `catalog`: tabla de resultados y paginación | «Pagination, navegación»; la página actual anunciada como «actual» |
| 7 | `admin`: tabla de pedidos | La región desplazable (`.iv-table-wrap`, `role="region"` con `tabindex="0"`) debe anunciar su nombre al recibir foco; encabezados de fila/columna anunciados al navegar por celdas (`Ctrl+Alt+flechas` en NVDA) |
| 8 | `admin`: diálogo «Delete order NW-1038?» | Igual que 6.1, y comprobar que el botón destructivo se anuncia por su texto, no por su color |

---

## 7. Qué queda sin verificar

Enumerado explícitamente para que no se lea este informe como más de lo que es:

1. **Todo lo de la sección 6.** Ningún lector de pantalla real intervino en esta revisión.
2. **Contraste de color medido.** No se calcularon ratios de contraste de texto ni de los bordes de los
   controles; solo se leyeron valores de color computados. Falta pasar un medidor sobre las dos temas.
3. **Forced-colors visual real.** Se emuló con Playwright, que aplica el modelo de forced-colors pero
   con la paleta por defecto del motor. Falta verlo en Windows con «Contraste alto» real y con al menos
   dos temas del sistema (uno claro y uno oscuro).
4. **El recorrido de `Tab` en Firefox dentro de un modal** dio un resultado ambiguo en headless (el
   último elemento se repitió en lugar de envolver). Reconfirmar a mano en Firefox de escritorio.
5. **Zoom y reflujo** (400 %, 320 px de ancho), **tamaño de objetivo táctil**, `prefers-reduced-motion`
   y navegación con lupa. No entraban en el encargo.
6. **`Shift+Tab`**: el recorrido se comprobó solo hacia adelante.
7. **Componentes no interactivos** (badge, alert, table, breadcrumb, pagination, progress, skeleton)
   solo se miraron en el aspecto de forced-colors y a través de las recetas.
8. Las fixtures `alert/basic`, `badge/basic` no existen con ese nombre (404 al consultarlas); la
   revisión de forced-colors de esas familias quedó pendiente por eso.

---

## 8. Resumen

- **Teclado y semántica de los seis componentes interactivos: sólidos.** Orden de foco, roles ARIA,
  roving `tabindex`, `Escape`, flechas, `Home`/`End` y retorno del foco al disparador coinciden con
  `docs/API_CONTRACT.md` §6 y §8.2 en Chromium y en Firefox. Ningún elemento enfocable quedó sin nombre
  accesible, en ninguna fixture ni receta, y el anillo de foco (`outline 2px`) estuvo presente en las
  dos temas en todas las paradas medidas.
- **Las tres recetas pasaron todas las comprobaciones estructurales** sin ningún hallazgo.
- **Cuatro cosas que arreglar antes de publicar:** el anuncio de los toasts (F1, alta), el foco perdido
  al descartar un toast (F2) y al cerrar el dropdown con `Tab` (F4), y la pestaña activa invisible en
  contraste alto (F3).
- **La pieza que falta es humana:** hasta que alguien ejecute la sección 6 con NVDA y con VoiceOver, la
  parte de esta revisión que más importa —qué se oye— sigue sin comprobar.

## 9. Ciclo v0.2 (2026-09-14): combobox y data table

Verificado por herramienta y por pruebas de navegador (no por personas ni por lector de pantalla):

- **axe-core** (wcag2a, 2aa, 21aa, 22aa) sin hallazgos critical/serious en `combobox/basic`, `combobox/strict`, `datatable/basic` y `datatable/sorted`, en claro y oscuro, en Chromium, Firefox y WebKit (`tests/browser/a11y.spec.js`).
- **Combobox** (`tests/browser/combobox.spec.js`, tres motores): promoción a `role="combobox"` con `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` y `aria-activedescendant`; el foco no sale del input; ↓/↑ con envoltura, Home/End, Enter confirma, Esc cierra, Tab confirma con `autoselect`; estado vacío; modo estricto al perder el foco; `destroy` deja el HTML servido idéntico; sin JS queda el `<datalist>` nativo.
- **Data table** (`tests/browser/datatable.spec.js`, tres motores): botones reales de ordenación con el texto de la cabecera como nombre accesible (el indicador es solo CSS), `aria-sort` únicamente en la columna ordenada, filtro con `role="status"` y recuento, fila vacía, filas ocultas con `hidden`, el foco no se mueve al filtrar; `destroy` devuelve el orden servido; sin JS no aparece el bloque de filtro.

Sin verificar: qué anuncian NVDA y VoiceOver al resaltar opciones (`aria-activedescendant`) y al cambiar `aria-sort`; el comportamiento del `<datalist>` nativo en móviles reales; zoom y reflujo. Añadir a la lista de §6:

### 6.8 Combobox — `/fixture/combobox/basic`
1. Con el foco en el campo, escribir «sp»: se espera que el lector anuncie la lista (número de opciones) y, con ↓, cada opción resaltada por `aria-activedescendant`.
2. Enter: se espera el anuncio del valor confirmado y el cierre de la lista.
3. En `combobox/strict`, escribir texto que no coincide y salir con Tab: se espera que el valor restaurado se anuncie al volver.

### 6.9 Data table — `/fixture/datatable/basic`
1. Tabular hasta «Customer» y activar: se espera «ordenado ascendente» (o equivalente) en la cabecera.
2. Escribir en el filtro: se espera el anuncio del recuento («3 of 9 rows») sin mover el foco.
3. Navegar la tabla por celdas tras filtrar: las filas ocultas no deben leerse.

## 10. Ciclo v0.3 (2026-09-14): carrusel, selector, validación, contador, superficies

Verificado por herramienta y por pruebas de navegador en Chromium, Firefox y WebKit (no por personas ni por lector de pantalla):

- **axe-core** sin hallazgos critical/serious en `carousel/{basic,cinema,thumbs}`, `picker/{basic,multiple}`, `form/{validation,counter,float,controls}` y `surfaces/{glass,textures,glow}`, en claro y oscuro. Hallazgo corregido durante la integración: el `<ul>` del carril del carrusel con hijos `role="tabpanel"` rompía la regla `list`; el carril recibe `role="presentation"` mientras está promovido.
- **Carrusel** (`tests/browser/carousel.spec.js`): pestañas con roving tabindex, ← → Home End, paneles «n of N», `inert` en las no visibles con fade/cinema, autoplay que no arranca con `prefers-reduced-motion`, botón de pausa con `aria-pressed`, deslizamiento por puntero, restauración exacta.
- **Selector** (`tests/browser/picker.spec.js`): control con `aria-haspopup="listbox"`, `aria-expanded`, `aria-labelledby` desde la etiqueta, `aria-activedescendant`, chips con botón de borrado nombrado, Esc devuelve el foco, sincronización con el `<select>` nativo, restauración exacta.
- **Validación y contador** (`tests/browser/form.spec.js`): `aria-invalid`, `aria-describedby` acumulativo, resumen `role="alert"` enfocado con enlaces a los campos, mensajes por tipo de error y por `iv:validate`, contador `aria-live="polite"`, límite blando que produce `customError`.

Sin verificar: anuncio real de `aria-activedescendant` en el selector, de `aria-pressed` en el carrusel y del resumen de errores; gestos táctiles en dispositivos físicos; contraste sobre cristal medido por axe solo en las fixtures. Añadir a §6: carrusel (tabular a las pestañas, flechas, pausa), selector (abrir, escribir, elegir, borrar chip), validación (enviar vacío, seguir el enlace del resumen).

## 11. Ciclos v0.4 y v0.5 (2026-09-14): megamenú, efectos, hero, selector de fecha

Verificado por herramienta y por pruebas de navegador en Chromium, Firefox y WebKit:

- **axe-core** sin hallazgos critical/serious en `megamenu/{basic,full}` (también con el panel abierto), `effects/{edges,scan,reveal}`, `hero/{basic,split,cinematic,terminal}` y `datepicker/{basic,locale}`, en claro y oscuro. Hallazgo corregido antes de integrar: `aria-selected` en el botón del día del selector de fecha (`aria-allowed-attr`, crítico) pasa a la celda `gridcell` (ADR-036).
- **Megamenú** (`tests/browser/megamenu.spec.js`): toggles con `aria-expanded`/`aria-controls`, paneles cerrados `inert`, `Escape` con retorno de foco, `← → Home End`, `↓` abre y enfoca el primer enlace, clic fuera y `Tab` cierran, acordeón sin superposición en móvil, sin JS los paneles se muestran por `:focus-within`. La cabecera de la web usa el componente; el hover intencional exige movimiento real del puntero (un puntero que descansa tras una navegación no abre nada).
- **Efectos** (`tests/browser/effects.spec.js`): `Proximity` solo con puntero fino y variables retiradas en `destroy`; `Reveal` con `data-iv-inview` y todo visible sin JS o con movimiento reducido; los efectos no tocan texto legible.
- **Hero**: cuatro fixtures sin desbordamiento a 390 px; scrim con AA verificado por axe; título como `h2` en las fixtures (el `h1` es de la página).
- **Selector de fecha** (`tests/browser/datepicker.spec.js`): diálogo no modal con nombre, rejilla `role="grid"` con una sola parada de tabulación, teclado completo, `Escape` y selección devuelven el foco al botón (corregido: la selección repintaba el día enfocado y el foco caía al `<body>`), `min`/`max` como botones desactivados, nombres por `Intl` en `es-ES` y `en-US`.

Sin verificar: anuncio real del cambio de mes (`aria-live` del título) y de la posición en la rejilla con NVDA/VoiceOver; hover intencional del megamenú con dispositivos de puntero reales; efectos de proximidad con lápiz.

## 12. Ciclo v0.6 (2026-09-14): cabecera de sitio, asistente por pasos, toast declarativo, bloques de contenido

Verificado por herramienta y por pruebas de navegador en Chromium, Firefox y WebKit (`tests/browser/navbar.spec.js`, `stepper.spec.js`, `content.spec.js`, `toast-declarative.spec.js`, más `a11y.spec.js` con las fixtures nuevas):

- **axe-core** sin hallazgos critical/serious en `navbar/{basic,transparent,megamenu,hide}` (cerrado, abierto y condensado), `stepper/{basic,vertical,compact}` (paso avanzado y estado de error), `timeline/{basic,alternate,horizontal}`, `stat/{basic,cards}`, `avatar/{basic,group}`, `toast/declarative` y `progress/sizes`, en claro y oscuro. Hallazgo corregido antes de integrar: el grupo de avatares usaba `ul/li` con `role="img"` en cada ítem (`list`, serious) y pasa a `div/span`.
- **Navbar**: `<header>` con `<nav aria-label>`; toggle con nombre, `aria-expanded` y `aria-controls`; `Escape` cierra y devuelve el foco al toggle; clic fuera cierra; sin JS el panel se sirve visible y apilado; el enlace actual sobre una portada oscura hereda el color claro hasta condensarse (corregido tras la captura: el verde de marca no leía sobre el mesh).
- **Stepper**: `<ol>` numerado con `aria-current="step"`; disparadores como enlaces con nombre (marcador `aria-hidden`); pasos no alcanzables con `aria-disabled` y fuera del orden de tabulación; `← → Home End`; al cambiar, el foco va al panel (`tabindex="-1"`) y `__status` anuncia «Step n of m: label»; la validación usa `Form` si existe y `reportValidity` si no, así que el mensaje de error es el nativo o el del formulario, nunca solo color.
- **Toast declarativo**: el aviso se crea con `textContent`; el disparador es un botón normal; sin JS no hace nada y la documentación lo marca como demo.
- **Contenido**: la línea de tiempo es una lista ordenada con `<time datetime>`; el estado de cada ítem se expresa con texto (`Today`, `Next`) además del marcador; el delta de una cifra lleva flecha por máscara y signo en el texto (`sr-only` opcional para el sentido); los avatares de iniciales llevan `role="img"` con `aria-label` y las imágenes su `alt`; el recuento «+N» de un grupo es texto.

Sin verificar: anuncio real del cambio de paso y del `__status` con NVDA/VoiceOver; `hideOnScroll` con lectores que desplazan el foco fuera del viewport; gestos reales en el panel plegado.
