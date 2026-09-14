/**
 * Data table: column sorting and row filtering on top of a served
 * `<table class="iv-table">`.
 *
 * The served HTML is a plain table: without JavaScript it reads and scrolls
 * exactly as it does today, and the filter block stays hidden by CSS so there
 * is never a control that does nothing. `init` wraps the content of every
 * `th[data-iv-sort]` in a real `<button>`, adds the announced row count and the
 * "no rows match" row, and wires the filter input; `destroy` puts the served
 * markup back, row order included.
 *
 * Rows are never cloned: sorting moves the existing `<tr>` elements with
 * `append`, so event listeners, form state and focus inside the cells survive.
 * Nothing is ever parsed from a string: every node is built with
 * `createElement` and `textContent`.
 *
 * @module components/datatable
 */

import { IvComponent, isElement } from "../core/component.js";
import { IvError, getInstance } from "../core/registry.js";
import { emit } from "../core/events.js";

/**
 * @typedef {object} DataTableOptions
 * @property {number} filterDelay Milliseconds waited after typing before the filter runs.
 * @property {string} emptyText Text of the row shown when nothing matches.
 * @property {string} statusText Announced row count; `{visible}` and `{total}` are replaced.
 * @property {string|null} locale BCP 47 tag for text sorting; `null` falls back to the `lang` of the document.
 */

/** @typedef {"ascending"|"descending"} SortDirection */

/** @typedef {"text"|"number"|"date"} ColumnType */

/**
 * A sortable column: the header cell, the button `init` put inside it and the
 * child nodes that button borrowed.
 *
 * @typedef {object} SortableColumn
 * @property {HTMLTableCellElement} th Header cell.
 * @property {HTMLButtonElement} button Generated sort button.
 * @property {number} index Index of the cell inside its header row.
 * @property {ColumnType} type How the values of the column are compared.
 * @property {ChildNode[]} content Original child nodes of the header cell.
 */

/**
 * A `<tbody>` and the children it had before `init` touched it.
 *
 * @typedef {object} TableBody
 * @property {HTMLTableSectionElement} tbody The section.
 * @property {HTMLTableRowElement[]} rows Its rows, in served order.
 * @property {ChildNode[]} nodes Every child node, in served order.
 */

/**
 * One row decorated with the comparable value of the sorted column.
 *
 * @typedef {object} SortEntry
 * @property {HTMLTableRowElement} row The row.
 * @property {number} index Position in the served order, used to break ties.
 * @property {string} text Raw cell value, for text comparison.
 * @property {number} value Numeric or time value, for the other types.
 * @property {boolean} valid Whether the cell holds a value of the column type.
 */

const ROOT_SELECTOR = '[data-iv-component="datatable"]';
const SORT_CLASS = "iv-datatable__sort";
const EMPTY_CLASS = "iv-datatable__empty";
const STATUS_CLASS = "iv-datatable__status";
const FILTER_SELECTOR = "input[data-iv-datatable-filter]";
const DIACRITICS = /[\u0300-\u036f]/g;
const NOT_NUMBER = /[^\d.-]/g;

/**
 * Folds case and diacritics so that "Cordoba" matches "Córdoba".
 *
 * @param {string} text Raw text.
 * @returns {string} Normalized text.
 */
function normalize(text) {
  return text.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

/**
 * Tells whether a descendant belongs to this instance and not to a nested one.
 *
 * @param {Element} root Host element.
 * @param {Element} el Candidate descendant.
 * @returns {boolean} `true` when the element is not owned by a nested data table.
 */
function owns(root, el) {
  const owner = el.closest(ROOT_SELECTOR);
  return owner === null || owner === root;
}

/**
 * Finds the table of a data table, skipping tables of nested instances.
 *
 * @param {Element} root Host element.
 * @returns {HTMLTableElement|null} The table, or `null` when there is none.
 */
function findTable(root) {
  for (const node of root.querySelectorAll("table")) {
    const el = /** @type {HTMLTableElement} */ (node);
    if (owns(root, el)) return el;
  }
  return null;
}

/**
 * Finds the filter input of a data table, skipping nested instances.
 *
 * @param {Element} root Host element.
 * @returns {HTMLInputElement|null} The input, or `null` when there is none.
 */
function findFilter(root) {
  for (const node of root.querySelectorAll(FILTER_SELECTOR)) {
    const el = /** @type {HTMLInputElement} */ (node);
    if (owns(root, el)) return el;
  }
  return null;
}

/**
 * Reads the declared type of a sortable column. An empty or unknown value is
 * text, the type that works for any content.
 *
 * @param {Element} th Header cell.
 * @returns {ColumnType} The column type.
 */
function columnType(th) {
  const raw = (th.getAttribute("data-iv-sort") ?? "").trim().toLowerCase();
  if (raw === "number" || raw === "date") return raw;
  return "text";
}

/**
 * Value of a cell: `data-iv-value` wins, then the machine-readable `datetime`
 * of a `<time>` inside it, then the visible text.
 *
 * @param {HTMLTableCellElement|undefined} cell The cell, when the row has one.
 * @returns {string} The raw value, trimmed.
 */
function cellValue(cell) {
  if (!cell) return "";
  const explicit = cell.getAttribute("data-iv-value");
  if (explicit !== null) return explicit.trim();
  const time = cell.querySelector("time[datetime]");
  if (time) return (time.getAttribute("datetime") ?? "").trim();
  return (cell.textContent ?? "").trim();
}

/**
 * Puts the attributes of an element back into their original order.
 *
 * Removing an attribute and setting it again appends it at the end of the
 * attribute list, so restoring one alone would change how the element
 * serializes. Only runs when the order actually changed.
 *
 * @param {Element} el Element to normalize.
 * @param {string[]} names Attribute names in their original order.
 * @returns {void}
 */
function restoreAttributeOrder(el, names) {
  const current = Array.from(el.attributes).map((attribute) => attribute.name);
  const expected = names.filter((name) => current.includes(name));
  const actual = current.filter((name) => names.includes(name));
  if (
    expected.length === actual.length &&
    expected.every((name, index) => name === actual[index])
  ) {
    return;
  }
  /** @type {Map<string, string>} */
  const values = new Map();
  for (const name of expected) values.set(name, el.getAttribute(name) ?? "");
  for (const name of expected) el.removeAttribute(name);
  for (const name of expected) el.setAttribute(name, values.get(name) ?? "");
}

/**
 * Data table component.
 *
 * @augments IvComponent
 */
export class DataTable extends IvComponent {
  /** @type {string} */
  static componentName = "datatable";

  /** @type {Readonly<DataTableOptions>} */
  static defaults = Object.freeze({
    filterDelay: 150,
    emptyText: "No rows match",
    statusText: "{visible} of {total} rows",
    locale: null,
  });

  /**
   * Returns the data table instance attached to `el`, if any.
   *
   * @param {Element} el Host element.
   * @returns {DataTable|undefined} The instance or `undefined`.
   */
  static get(el) {
    const inst = getInstance(el, "datatable");
    return inst instanceof DataTable ? inst : undefined;
  }

  /**
   * Returns the existing instance or creates one.
   *
   * @param {Element} el Host element.
   * @param {Partial<DataTableOptions>} [options] Options passed in JavaScript.
   * @returns {DataTable} The instance.
   */
  static getOrCreate(el, options) {
    return this.get(el) ?? new DataTable(el, options);
  }

  /**
   * Instantiates every `[data-iv-component="datatable"]` inside `root`.
   *
   * @param {ParentNode} [root] Subtree to scan.
   * @returns {DataTable[]} Newly created instances.
   */
  static initAll(root = document) {
    return /** @type {DataTable[]} */ (super.initAll(root));
  }

  /**
   * @param {Element} el A `<div class="iv-datatable">` element.
   * @param {Partial<DataTableOptions>} [options] Options passed in JavaScript.
   * @throws {IvError} `invalid-element` when there is no table to enhance.
   */
  constructor(el, options) {
    if (!isElement(el)) {
      throw new IvError("invalid-element", "DataTable requires an element.");
    }
    const table = findTable(el);
    if (!table) {
      throw new IvError("invalid-element", "DataTable requires a <table> element.");
    }
    super(el, /** @type {Record<string, unknown>} */ (options));
    // `_setup` already ran inside `super`; these assignments only declare the
    // types of the fields it created, they never discard its values.
    /** @type {HTMLTableElement} The enhanced table. */
    this._table = this._table ?? table;
    /** @type {TableBody[]} Sections and their served children. */
    this._bodies = this._bodies ?? [];
    /** @type {HTMLTableRowElement[]} Every body row, in served order. */
    this._rows = this._rows ?? [];
    /** @type {SortableColumn[]} Sortable columns, in header order. */
    this._columns = this._columns ?? [];
    /** @type {HTMLTableRowElement} The "no rows match" row. */
    this._empty = this._empty ?? el.ownerDocument.createElement("tr");
    /** @type {HTMLElement} The announced row count. */
    this._status = this._status ?? el.ownerDocument.createElement("p");
    /** @type {HTMLInputElement|null} The filter input, when the author served one. */
    this._input = this._input ?? null;
    /** @type {Map<Element, Map<string, string|null>>} Attributes to restore. */
    this._saved = this._saved ?? new Map();
    /** @type {Map<Element, string[]>} Attribute order to restore. */
    this._order = this._order ?? new Map();
    /** @type {number} Index of the sorted column, or `-1`. */
    this._column = this._column ?? -1;
    /** @type {SortDirection|null} Direction of the current sort. */
    this._direction = this._direction ?? null;
    /** @type {string} Applied filter query. */
    this._query = this._query ?? "";
    /** @type {ReturnType<typeof setTimeout>|null} Pending debounced filter. */
    this._timer = this._timer ?? null;
  }

  /**
   * Resolved options.
   *
   * @returns {Readonly<DataTableOptions>} The options.
   */
  get options() {
    return /** @type {Readonly<DataTableOptions>} */ (
      /** @type {unknown} */ (this._options)
    );
  }

  /**
   * Index of the sorted column inside its header row.
   *
   * @returns {number} The index, or `-1` when the table is in served order.
   */
  get sortColumn() {
    return this._column;
  }

  /**
   * Direction of the current sort.
   *
   * @returns {SortDirection|null} The direction, or `null` when unsorted.
   */
  get sortDirection() {
    return this._direction;
  }

  /**
   * Body rows in served order. The array is a copy; the rows are the live ones.
   *
   * @returns {HTMLTableRowElement[]} The rows.
   */
  get rows() {
    return this._rows.slice();
  }

  /**
   * How many rows pass the current filter.
   *
   * @returns {number} The count.
   */
  get visibleRows() {
    return this._countVisible();
  }

  /**
   * The query the rows are currently filtered by.
   *
   * @returns {string} The query, or an empty string.
   */
  get query() {
    return this._query;
  }

  /** @returns {void} */
  _setup() {
    const root = this._element;
    const doc = root.ownerDocument;
    const table = findTable(root);
    // The constructor already rejected this case; this keeps the types simple.
    if (!table) return;

    this._table = table;
    this._bodies = [];
    this._rows = [];
    this._columns = [];
    this._saved = new Map();
    this._order = new Map();
    this._column = -1;
    this._direction = null;
    this._query = "";
    this._timer = null;

    for (const tbody of Array.from(table.tBodies)) {
      const rows = Array.from(tbody.rows);
      this._bodies.push({ tbody, rows, nodes: Array.from(tbody.childNodes) });
      this._rows.push(...rows);
    }

    const headRows = table.tHead ? Array.from(table.tHead.rows) : [];
    for (const headRow of headRows) {
      for (const th of Array.from(headRow.cells)) {
        if (!th.hasAttribute("data-iv-sort")) continue;
        const button = doc.createElement("button");
        button.setAttribute("type", "button");
        button.className = SORT_CLASS;
        // The accessible name of the button is the text of the header: the
        // children move into it and the direction is shown by CSS only.
        const content = Array.from(th.childNodes);
        button.append(...content);
        th.append(button);
        this._columns.push({
          th,
          button,
          index: th.cellIndex,
          type: columnType(th),
          content,
        });
        this._listen(button, "click", () => this.sort(th));
      }
    }

    const empty = doc.createElement("tr");
    empty.className = EMPTY_CLASS;
    empty.hidden = true;
    const emptyCell = doc.createElement("td");
    emptyCell.setAttribute("colspan", String(this._columnCount()));
    emptyCell.textContent = this.options.emptyText;
    empty.append(emptyCell);
    const [first] = this._bodies;
    if (first) first.tbody.append(empty);
    this._empty = empty;

    const status = doc.createElement("p");
    status.className = STATUS_CLASS;
    status.setAttribute("role", "status");
    root.append(status);
    this._status = status;

    const input = findFilter(root);
    this._input = input;
    if (input) this._listen(input, "input", () => this._onFilterInput());

    const initial = this._columns.find((column) =>
      column.th.hasAttribute("data-iv-sorted")
    );
    if (initial) {
      const raw = (initial.th.getAttribute("data-iv-sorted") ?? "")
        .trim()
        .toLowerCase();
      /** @type {SortDirection} */
      const direction = raw.startsWith("desc") ? "descending" : "ascending";
      this._applySort(initial, direction);
      // A sort the author asked for in the markup is not a user action: only
      // the past-tense event is emitted, never the cancelable one.
      emit(root, "sorted", {
        instance: this,
        column: initial.index,
        direction,
        previousColumn: -1,
        previousDirection: null,
      });
    }

    this._updateStatus(this._countVisible());
  }

  /** @returns {void} */
  _teardown() {
    this._clearTimer();
    this._empty.remove();
    this._status.remove();
    // Appending the served child nodes in order restores the rows *and* the
    // whitespace between them, so the markup serializes exactly as before.
    for (const body of this._bodies) body.tbody.append(...body.nodes);
    for (const column of this._columns) {
      column.th.append(...column.content);
      column.button.remove();
    }
    for (const [el, attributes] of this._saved) {
      for (const [name, value] of attributes) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    }
    for (const [el, names] of this._order) restoreAttributeOrder(el, names);
    this._saved.clear();
    this._order.clear();
    this._bodies = [];
    this._rows = [];
    this._columns = [];
    this._input = null;
    this._column = -1;
    this._direction = null;
    this._query = "";
  }

  /**
   * Remembers the current value of an attribute, once per element.
   *
   * @param {Element} el Element to remember.
   * @param {string} name Attribute name.
   * @returns {void}
   */
  _remember(el, name) {
    let attributes = this._saved.get(el);
    if (!attributes) {
      attributes = new Map();
      this._saved.set(el, attributes);
    }
    if (attributes.has(name)) return;
    const value = el.getAttribute(name);
    attributes.set(name, value);
    // Only an attribute that has to be put back can end up out of order.
    if (value !== null && !this._order.has(el)) {
      this._order.set(
        el,
        Array.from(el.attributes).map((attribute) => attribute.name)
      );
    }
  }

  /**
   * Sets a managed attribute, remembering its previous value.
   *
   * @param {Element} el Target element.
   * @param {string} name Attribute name.
   * @param {string} value Attribute value.
   * @returns {void}
   */
  _set(el, name, value) {
    this._remember(el, name);
    el.setAttribute(name, value);
  }

  /**
   * Removes a managed attribute, remembering its previous value.
   *
   * @param {Element} el Target element.
   * @param {string} name Attribute name.
   * @returns {void}
   */
  _unset(el, name) {
    this._remember(el, name);
    el.removeAttribute(name);
  }

  /**
   * Cancels a pending debounced filter.
   *
   * @returns {void}
   */
  _clearTimer() {
    if (this._timer === null) return;
    clearTimeout(this._timer);
    this._timer = null;
  }

  /**
   * How many columns the table has, so the empty row can span all of them.
   *
   * @returns {number} The column count, at least `1`.
   */
  _columnCount() {
    let count = 0;
    const head = this._table.tHead;
    const row = head && head.rows.length > 0 ? head.rows[head.rows.length - 1] : null;
    if (row) {
      for (const cell of Array.from(row.cells)) count += cell.colSpan || 1;
    }
    if (count === 0) {
      for (const body of this._bodies) {
        for (const bodyRow of body.rows) {
          count = Math.max(count, bodyRow.cells.length);
        }
      }
    }
    return count > 0 ? count : 1;
  }

  /**
   * Locale used for text comparison: the option, else the `lang` of the
   * document, else the default of the runtime.
   *
   * @returns {string|undefined} The locale tag, or `undefined`.
   */
  _locale() {
    const option = this.options.locale;
    if (typeof option === "string" && option !== "") return option;
    const lang = this._element.ownerDocument.documentElement.getAttribute("lang");
    return lang ? lang : undefined;
  }

  /**
   * How many rows are not hidden by the filter.
   *
   * @returns {number} The count.
   */
  _countVisible() {
    let visible = 0;
    for (const row of this._rows) if (!row.hidden) visible += 1;
    return visible;
  }

  /**
   * Writes the announced row count.
   *
   * @param {number} visible Rows passing the filter.
   * @returns {void}
   */
  _updateStatus(visible) {
    this._status.textContent = this.options.statusText
      .replace(/\{visible\}/g, String(visible))
      .replace(/\{total\}/g, String(this._rows.length));
  }

  /**
   * Resolves the argument of `sort` into a sortable column.
   *
   * @param {number|Element} target A column index or a header cell.
   * @returns {SortableColumn|null} The column, or `null` when it cannot sort.
   */
  _resolveColumn(target) {
    if (isElement(target)) {
      return (
        this._columns.find(
          (column) => column.th === target || column.th.contains(target)
        ) ?? null
      );
    }
    if (typeof target !== "number") return null;
    return this._columns.find((column) => column.index === target) ?? null;
  }

  /**
   * Moves the rows of every section into the requested order and marks the
   * header. Rows whose cell holds no value of the column type go last in both
   * directions; ties keep the served order, so the sort is stable.
   *
   * @param {SortableColumn} column Column to sort by.
   * @param {SortDirection} direction Direction to sort in.
   * @returns {void}
   */
  _applySort(column, direction) {
    const locale = this._locale();
    const factor = direction === "descending" ? -1 : 1;
    /** @type {Map<HTMLTableRowElement, number>} */
    const served = new Map();
    this._rows.forEach((row, index) => served.set(row, index));

    for (const body of this._bodies) {
      /** @type {SortEntry[]} */
      const entries = body.rows.map((row) => {
        const raw = cellValue(row.cells[column.index]);
        let value = Number.NaN;
        let valid = raw !== "";
        if (column.type === "number") {
          value = Number.parseFloat(raw.replace(NOT_NUMBER, ""));
          valid = !Number.isNaN(value);
        } else if (column.type === "date") {
          value = Date.parse(raw);
          valid = !Number.isNaN(value);
        }
        return { row, index: served.get(row) ?? 0, text: raw, value, valid };
      });

      entries.sort((a, b) => {
        if (a.valid !== b.valid) return a.valid ? -1 : 1;
        if (!a.valid) return a.index - b.index;
        const result =
          column.type === "text"
            ? a.text.localeCompare(b.text, locale, {
                numeric: true,
                sensitivity: "base",
              })
            : a.value - b.value;
        if (result !== 0) return result * factor;
        return a.index - b.index;
      });

      for (const entry of entries) body.tbody.append(entry.row);
    }

    // The empty row always stays at the end of its section.
    const parent = this._empty.parentNode;
    if (parent) parent.append(this._empty);
    this._markSort(column.index, direction);
  }

  /**
   * Puts the rows back in served order and drops the sort state.
   *
   * @returns {void}
   */
  _restoreOrder() {
    for (const body of this._bodies) body.tbody.append(...body.nodes);
    const parent = this._empty.parentNode;
    if (parent) parent.append(this._empty);
    this._markSort(-1, null);
  }

  /**
   * Writes `aria-sort` on the sorted header and removes it from the others.
   *
   * @param {number} index Index of the sorted column, or `-1`.
   * @param {SortDirection|null} direction Direction, or `null`.
   * @returns {void}
   */
  _markSort(index, direction) {
    for (const column of this._columns) {
      if (column.index === index && direction !== null) {
        this._set(column.th, "aria-sort", direction);
      } else {
        this._unset(column.th, "aria-sort");
      }
    }
    this._column = direction === null ? -1 : index;
    this._direction = direction;
  }

  /**
   * Hides the rows that do not match and updates the empty row and the count.
   *
   * @param {string} query Query to apply.
   * @returns {number} How many rows remain visible.
   */
  _applyQuery(query) {
    const needle = normalize(query.trim());
    let visible = 0;
    for (const row of this._rows) {
      const source = row.getAttribute("data-iv-filter-text") ?? row.textContent ?? "";
      const match = needle === "" || normalize(source).includes(needle);
      if (match) {
        this._unset(row, "hidden");
        visible += 1;
      } else {
        this._set(row, "hidden", "");
      }
    }
    this._empty.hidden = visible > 0;
    this._updateStatus(visible);
    return visible;
  }

  /**
   * Runs a filter: `iv:filter` (cancelable) → rows → `iv:filtered`.
   *
   * @param {string} query Query to apply.
   * @param {boolean} sync Whether the input must show the query.
   * @returns {void}
   */
  _filterTo(query, sync) {
    const previousQuery = this._query;
    const allowed = emit(
      this._element,
      "filter",
      { instance: this, query, previousQuery },
      { cancelable: true }
    );
    if (!allowed) return;
    this._query = query;
    if (sync && this._input) this._input.value = query;
    const visible = this._applyQuery(query);
    emit(this._element, "filtered", {
      instance: this,
      query,
      visible,
      total: this._rows.length,
    });
  }

  /**
   * Debounces typing in the filter input.
   *
   * @returns {void}
   */
  _onFilterInput() {
    const input = this._input;
    if (!input) return;
    this._clearTimer();
    const query = input.value;
    const delay = this.options.filterDelay;
    if (!(delay > 0)) {
      this._filterTo(query, false);
      return;
    }
    this._timer = setTimeout(() => {
      this._timer = null;
      this._filterTo(query, false);
    }, delay);
  }

  /**
   * Sorts by a column. Without a direction the click order applies:
   * ascending → descending → ascending.
   *
   * @param {number|Element} target Column index or header cell.
   * @param {SortDirection} [direction] Direction to sort in.
   * @returns {void}
   */
  sort(target, direction) {
    const column = this._resolveColumn(target);
    if (!column) return;
    /** @type {SortDirection} */
    let next;
    if (direction === "ascending" || direction === "descending") {
      next = direction;
    } else {
      next =
        this._column === column.index && this._direction === "ascending"
          ? "descending"
          : "ascending";
    }
    const previousColumn = this._column;
    const previousDirection = this._direction;
    const detail = {
      instance: this,
      column: column.index,
      direction: next,
      previousColumn,
      previousDirection,
    };
    if (!emit(this._element, "sort", detail, { cancelable: true })) return;
    this._applySort(column, next);
    emit(this._element, "sorted", detail);
  }

  /**
   * Filters the rows immediately, skipping the `filterDelay` of typing.
   *
   * @param {string} query Text to look for.
   * @returns {void}
   */
  filter(query) {
    this._clearTimer();
    this._filterTo(typeof query === "string" ? query : "", true);
  }

  /**
   * Clears the filter and shows every row.
   *
   * @returns {void}
   */
  clearFilter() {
    this.filter("");
  }

  /**
   * Restores the served row order and clears the filter. Both steps are an
   * explicit API restore, so only the past-tense events are emitted.
   *
   * @returns {void}
   */
  reset() {
    this._clearTimer();
    const previousColumn = this._column;
    const previousDirection = this._direction;
    this._restoreOrder();
    emit(this._element, "sorted", {
      instance: this,
      column: -1,
      direction: null,
      previousColumn,
      previousDirection,
    });
    this._query = "";
    if (this._input) this._input.value = "";
    const visible = this._applyQuery("");
    emit(this._element, "filtered", {
      instance: this,
      query: "",
      visible,
      total: this._rows.length,
    });
  }
}
