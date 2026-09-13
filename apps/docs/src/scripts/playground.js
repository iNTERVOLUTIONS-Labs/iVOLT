// Playground: a bounded snippet generator, not an editor.
//
// Safety rules that this file keeps on purpose:
//   - every node is created with document.createElement and filled with textContent;
//   - class names only ever come from the tables below (an allow-list), never from input;
//   - there is no innerHTML, no eval, no new Function, no user-supplied strings in markup;
//   - the sample text is picked from a closed list, so nothing arbitrary reaches the DOM.
// The code block is serialised by walking the very node we built, so it can only ever
// contain markup this file produced.

const TEXTS = [
  {
    value: "save",
    short: "Save changes",
    title: "Settings saved",
    body: "Your notification preferences now apply to every project in this workspace.",
  },
  {
    value: "publish",
    short: "Publish",
    title: "Published",
    body: "The page is live. You can roll it back from the history panel at any time.",
  },
  {
    value: "delete",
    short: "Delete project",
    title: "Project deleted",
    body: "The project and its builds were removed. This action cannot be undone.",
  },
  {
    value: "review",
    short: "Needs review",
    title: "Needs review",
    body: "Two files changed since the last approval. Review them before the release.",
  },
  {
    value: "docs",
    short: "Read the docs",
    title: "Editorial catalogue",
    body: "Cards, filters and a detail page built from the same primitives.",
  },
];

const NONE = [];

function make(tag, classes) {
  const node = document.createElement(tag);
  if (classes && classes.length) node.className = classes.join(" ");
  return node;
}

function para(classes, text) {
  const p = make("p", classes);
  p.textContent = text;
  return p;
}

const COMPONENTS = {
  button: {
    label: "Button",
    doc: "/components/button",
    docLabel: "Button component",
    variants: [
      { value: "primary", label: "Primary", classes: ["iv-button--primary"] },
      { value: "secondary", label: "Secondary", classes: ["iv-button--secondary"] },
      { value: "ghost", label: "Ghost", classes: ["iv-button--ghost"] },
      { value: "danger", label: "Danger", classes: ["iv-button--danger"] },
      { value: "neutral", label: "Neutral (no modifier)", classes: NONE },
    ],
    sizes: [
      { value: "sm", label: "Small", classes: ["iv-button--sm"] },
      { value: "md", label: "Default", classes: NONE },
      { value: "lg", label: "Large", classes: ["iv-button--lg"] },
    ],
    build(variant, size, text) {
      const el = make("button", ["iv-button", ...variant.classes, ...size.classes]);
      el.setAttribute("type", "button");
      el.textContent = text.short;
      return el;
    },
  },

  badge: {
    label: "Badge",
    doc: "/components/badge",
    docLabel: "Badge component",
    variants: [
      { value: "neutral", label: "Neutral (no modifier)", classes: NONE },
      { value: "primary", label: "Primary", classes: ["iv-badge--primary"] },
      { value: "success", label: "Success", classes: ["iv-badge--success"] },
      { value: "warning", label: "Warning", classes: ["iv-badge--warning"] },
      { value: "danger", label: "Danger", classes: ["iv-badge--danger"] },
      { value: "info", label: "Info", classes: ["iv-badge--info"] },
      { value: "solid-primary", label: "Primary, solid", classes: ["iv-badge--solid", "iv-badge--primary"] },
      { value: "solid-success", label: "Success, solid", classes: ["iv-badge--solid", "iv-badge--success"] },
      { value: "solid-danger", label: "Danger, solid", classes: ["iv-badge--solid", "iv-badge--danger"] },
    ],
    sizes: null,
    build(variant, _size, text) {
      const el = make("span", ["iv-badge", ...variant.classes]);
      el.textContent = text.short;
      return el;
    },
  },

  alert: {
    label: "Alert",
    doc: "/components/alert",
    docLabel: "Alert component",
    variants: [
      { value: "info", label: "Info", classes: ["iv-alert--info"], role: "status" },
      { value: "success", label: "Success", classes: ["iv-alert--success"], role: "status" },
      { value: "warning", label: "Warning", classes: ["iv-alert--warning"], role: "status" },
      { value: "danger", label: "Danger", classes: ["iv-alert--danger"], role: "alert" },
      { value: "neutral", label: "Neutral (no modifier)", classes: NONE, role: "status" },
    ],
    sizes: null,
    build(variant, _size, text) {
      const el = make("div", ["iv-alert", ...variant.classes]);
      el.setAttribute("role", variant.role);
      el.appendChild(para(["iv-alert__title"], text.title));
      const body = make("div", ["iv-alert__body"]);
      body.appendChild(para(NONE, text.body));
      el.appendChild(body);
      return el;
    },
  },

  card: {
    label: "Card",
    doc: "/components/card",
    docLabel: "Card component",
    variants: [
      { value: "basic", label: "Body only", classes: NONE, footer: false, media: false },
      { value: "footer", label: "With footer actions", classes: NONE, footer: true, media: false },
      { value: "media", label: "With media", classes: NONE, footer: false, media: true },
      { value: "flat", label: "Flat", classes: ["iv-card--flat"], footer: false, media: false },
    ],
    sizes: null,
    build(variant, _size, text) {
      const el = make("article", ["iv-card", ...variant.classes]);
      if (variant.media) {
        const media = make("div", ["iv-card__media"]);
        media.setAttribute("aria-hidden", "true");
        el.appendChild(media);
      }
      const body = make("div", ["iv-card__body"]);
      const title = make("h3", ["iv-card__title"]);
      title.textContent = text.title;
      body.appendChild(title);
      body.appendChild(para(["iv-u-m-0"], text.body));
      el.appendChild(body);
      if (variant.footer) {
        const footer = make("div", ["iv-card__footer"]);
        const action = make("a", ["iv-button", "iv-button--primary", "iv-button--sm"]);
        action.setAttribute("href", "#");
        action.textContent = text.short;
        footer.appendChild(action);
        el.appendChild(footer);
      }
      return el;
    },
  },
};

const THEMES = ["light", "dark", "system"];

/* ---- serialisation: walks the node we just built, nothing else ---- */

function escapeText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function serialize(node, depth) {
  const pad = "  ".repeat(depth);
  if (node.nodeType === Node.TEXT_NODE) return pad + escapeText(node.nodeValue);
  const tag = node.tagName.toLowerCase();
  let attrs = "";
  for (const attr of node.attributes) attrs += ` ${attr.name}="${escapeAttribute(attr.value)}"`;
  const open = `<${tag}${attrs}>`;
  const kids = Array.from(node.childNodes);
  if (kids.length === 0) return `${pad}${open}</${tag}>`;
  if (kids.length === 1 && kids[0].nodeType === Node.TEXT_NODE) {
    return `${pad}${open}${escapeText(kids[0].nodeValue)}</${tag}>`;
  }
  const inner = kids.map((kid) => serialize(kid, depth + 1)).join("\n");
  return `${pad}${open}\n${inner}\n${pad}</${tag}>`;
}

/* ---- wiring ---- */

const form = document.getElementById("pg-form");
if (form) {
  const componentSelect = document.getElementById("pg-component");
  const variantSelect = document.getElementById("pg-variant");
  const sizeSelect = document.getElementById("pg-size");
  const sizeField = document.getElementById("pg-size-field");
  const textSelect = document.getElementById("pg-text");
  const preview = document.getElementById("pg-preview");
  const code = document.getElementById("pg-code");
  const docLink = document.getElementById("pg-doc-link");

  function fill(select, options) {
    select.replaceChildren();
    for (const option of options) {
      const node = document.createElement("option");
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    }
  }

  function pick(options, value) {
    return options.find((option) => option.value === value) || options[0];
  }

  // `hidden` alone is not enough: .iv-field sets `display: grid` and the reset lives in a
  // layer, so the utility class does the hiding and the attribute keeps it out of the
  // accessibility tree.
  function showSize(on) {
    sizeField.hidden = !on;
    sizeField.classList.toggle("iv-u-hidden", !on);
    sizeSelect.disabled = !on;
  }

  function currentTheme() {
    const checked = form.querySelector('input[name="pg-theme"]:checked');
    const value = checked ? checked.value : "light";
    return THEMES.includes(value) ? value : "light";
  }

  function render() {
    const spec = COMPONENTS[componentSelect.value] || COMPONENTS.button;
    const variant = pick(spec.variants, variantSelect.value);
    const size = spec.sizes ? pick(spec.sizes, sizeSelect.value) : { value: "md", classes: NONE };
    const text = pick(TEXTS, textSelect.value);

    const node = spec.build(variant, size, text);
    preview.replaceChildren(node);
    preview.setAttribute("data-iv-theme", currentTheme());
    code.textContent = serialize(node, 0);
    docLink.setAttribute("href", spec.doc);
    docLink.textContent = `Open the ${spec.docLabel} page`;
  }

  function loadComponent(keepValues) {
    const spec = COMPONENTS[componentSelect.value] || COMPONENTS.button;
    const previousVariant = variantSelect.value;
    fill(variantSelect, spec.variants);
    if (keepValues && spec.variants.some((v) => v.value === previousVariant)) {
      variantSelect.value = previousVariant;
    }
    if (spec.sizes) {
      const previousSize = sizeSelect.value;
      fill(sizeSelect, spec.sizes);
      sizeSelect.value = spec.sizes.some((s) => s.value === previousSize) ? previousSize : "md";
      showSize(true);
    } else {
      showSize(false);
    }
    render();
  }

  fill(componentSelect, Object.entries(COMPONENTS).map(([value, spec]) => ({ value, label: spec.label })));
  fill(textSelect, TEXTS.map((text) => ({ value: text.value, label: text.short })));
  componentSelect.value = "button";
  textSelect.value = "save";
  loadComponent(false);
  variantSelect.value = "primary";
  render();

  componentSelect.addEventListener("change", () => loadComponent(true));
  form.addEventListener("change", (event) => {
    if (event.target !== componentSelect) render();
  });
  form.addEventListener("submit", (event) => event.preventDefault());
}
