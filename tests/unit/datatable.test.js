// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DataTable } from "../../packages/ivolt/src/js/components/datatable.js";
import { IvError } from "../../packages/ivolt/src/js/core/registry.js";

const MARKUP = `
  <div id="dt" class="iv-datatable" data-iv-component="datatable">
    <div class="iv-datatable__filter">
      <label class="iv-label" for="dt-q">Filter rows</label>
      <input class="iv-input" id="dt-q" type="search" autocomplete="off" data-iv-datatable-filter>
    </div>
    <div class="iv-table-wrap" role="region" aria-labelledby="dt-cap" tabindex="0">
      <table class="iv-table">
        <caption id="dt-cap">Made-up rows, for the tests only</caption>
        <thead>
          <tr>
            <th scope="col" data-iv-sort>Name</th>
            <th scope="col" data-iv-sort="number">Size</th>
            <th scope="col" data-iv-sort="date">Date</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr id="r1"><th scope="row">Córdoba</th><td>12</td><td><time datetime="2026-02-01">Feb</time></td><td>alpha</td></tr>
          <tr id="r2"><th scope="row">alava</th><td>3</td><td><time datetime="2026-01-05">Jan</time></td><td>beta</td></tr>
          <tr id="r3"><th scope="row">Bilbao</th><td>1,200.5</td><td></td><td>gamma</td></tr>
          <tr id="r4"><th scope="row">Bilbao</th><td>—</td><td><time datetime="2026-03-09">Mar</time></td><td>delta</td></tr>
          <tr id="r5" data-iv-filter-text="needle only"><th scope="row">Zamora</th><td data-iv-value="7">seven</td><td><time datetime="2025-12-31">Dec</time></td><td>epsilon</td></tr>
        </tbody>
      </table>
    </div>
  </div>
`;

const PRESORTED = `
  <div id="dt2" class="iv-datatable" data-iv-component="datatable">
    <table class="iv-table">
      <thead>
        <tr>
          <th scope="col" data-iv-sort>Job</th>
          <th scope="col" data-iv-sort="number" data-iv-sorted="desc">Duration</th>
        </tr>
      </thead>
      <tbody>
        <tr id="p1"><th scope="row">one</th><td data-iv-value="10">10 s</td></tr>
        <tr id="p2"><th scope="row">two</th><td data-iv-value="30">30 s</td></tr>
        <tr id="p3"><th scope="row">three</th><td data-iv-value="20">20 s</td></tr>
      </tbody>
    </table>
  </div>
`;

/**
 * @param {string} id Element id.
 * @returns {HTMLElement} The element.
 */
function byId(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/**
 * @param {Partial<Record<string, unknown>>} [options] Options passed in JavaScript.
 * @returns {{ dt: DataTable, el: HTMLElement, input: HTMLInputElement }} The fixture.
 */
function setup(options) {
  const el = byId("dt");
  const dt = new DataTable(el, options);
  return { dt, el, input: /** @type {HTMLInputElement} */ (byId("dt-q")) };
}

/**
 * Ids of the body rows, in document order.
 *
 * @param {DataTable} dt The instance.
 * @returns {string[]} The ids.
 */
function order(dt) {
  const tbody = /** @type {HTMLElement} */ (
    dt.element.querySelector("tbody")
  );
  return Array.from(tbody.querySelectorAll("tr[id]")).map((row) => row.id);
}

/**
 * Ids of the rows the filter left visible.
 *
 * @param {DataTable} dt The instance.
 * @returns {string[]} The ids.
 */
function shown(dt) {
  return dt.rows.filter((row) => !row.hidden).map((row) => row.id);
}

/**
 * @param {DataTable} dt The instance.
 * @param {number} index Column index.
 * @returns {HTMLButtonElement} The sort button of that column.
 */
function button(dt, index) {
  const th = /** @type {HTMLElement} */ (
    dt.element.querySelectorAll("thead th")[index]
  );
  return /** @type {HTMLButtonElement} */ (
    th.querySelector(".iv-datatable__sort")
  );
}

/**
 * @param {DataTable} dt The instance.
 * @returns {string[]} `aria-sort` values present in the header.
 */
function ariaSort(dt) {
  return Array.from(dt.element.querySelectorAll("thead th"))
    .map((th) => th.getAttribute("aria-sort"))
    .filter((value) => value !== null);
}

/**
 * @param {DataTable} dt The instance.
 * @returns {string} Text of the status region.
 */
function status(dt) {
  const el = /** @type {HTMLElement} */ (
    dt.element.querySelector(".iv-datatable__status")
  );
  return el.textContent ?? "";
}

/**
 * @param {DataTable} dt The instance.
 * @returns {HTMLTableRowElement} The "no rows match" row.
 */
function emptyRow(dt) {
  return /** @type {HTMLTableRowElement} */ (
    dt.element.querySelector(".iv-datatable__empty")
  );
}

/**
 * Types into the filter input the way a user does.
 *
 * @param {HTMLInputElement} input The input.
 * @param {string} text New value.
 * @returns {void}
 */
function type(input, text) {
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("DataTable", () => {
  beforeEach(() => {
    document.body.innerHTML = MARKUP;
  });

  describe("promotion and teardown", () => {
    it("promotes the headers, adds the status and the empty row", () => {
      const { dt, el } = setup();

      const buttons = el.querySelectorAll(".iv-datatable__sort");
      expect(buttons).toHaveLength(3);
      expect(button(dt, 0).getAttribute("type")).toBe("button");
      // The accessible name is the text of the header, never a direction.
      expect(button(dt, 0).textContent).toBe("Name");
      expect(button(dt, 1).textContent).toBe("Size");
      expect(el.querySelectorAll("thead th")[3].querySelector("button")).toBe(null);

      const empty = emptyRow(dt);
      expect(empty.hidden).toBe(true);
      expect(empty.parentElement?.tagName).toBe("TBODY");
      expect(empty.parentElement?.lastElementChild).toBe(empty);
      const cell = /** @type {HTMLElement} */ (empty.firstElementChild);
      expect(cell.getAttribute("colspan")).toBe("4");
      expect(cell.textContent).toBe("No rows match");

      const statusEl = /** @type {HTMLElement} */ (el.lastElementChild);
      expect(statusEl.className).toBe("iv-datatable__status");
      expect(statusEl.getAttribute("role")).toBe("status");
      expect(statusEl.textContent).toBe("5 of 5 rows");

      expect(dt.sortColumn).toBe(-1);
      expect(dt.sortDirection).toBe(null);
      expect(dt.query).toBe("");
      expect(dt.visibleRows).toBe(5);
      expect(dt.rows.map((row) => row.id)).toEqual(["r1", "r2", "r3", "r4", "r5"]);
      expect(ariaSort(dt)).toEqual([]);
    });

    it("marks the document with data-iv-js", () => {
      setup();
      expect(document.documentElement.hasAttribute("data-iv-js")).toBe(true);
    });

    it("restores the markup exactly on destroy", () => {
      const before = document.body.innerHTML;
      const { dt, input } = setup();
      dt.sort(1);
      dt.sort(1);
      dt.sort(0);
      dt.filter("bil");
      dt.destroy();
      input.value = "";
      expect(document.body.innerHTML).toBe(before);
    });

    it("restores the served order and the author attributes on destroy", () => {
      const { dt } = setup();
      dt.sort(2, "descending");
      expect(order(dt)).not.toEqual(["r1", "r2", "r3", "r4", "r5"]);
      dt.destroy();
      const ids = Array.from(document.querySelectorAll("tbody tr")).map((r) => r.id);
      expect(ids).toEqual(["r1", "r2", "r3", "r4", "r5"]);
      expect(document.querySelectorAll(".iv-datatable__sort")).toHaveLength(0);
      expect(document.querySelector(".iv-datatable__status")).toBe(null);
      expect(document.querySelector(".iv-datatable__empty")).toBe(null);
      const th = /** @type {HTMLElement} */ (document.querySelector("thead th"));
      expect(th.hasAttribute("aria-sort")).toBe(false);
      expect(th.getAttribute("data-iv-sort")).toBe("");
      expect(th.getAttribute("scope")).toBe("col");
    });

    it("throws invalid-element without a table", () => {
      document.body.innerHTML = `<div id="dt" data-iv-component="datatable"></div>`;
      expect(() => setup()).toThrow(IvError);
      try {
        setup();
        expect.unreachable();
      } catch (error) {
        expect(/** @type {IvError} */ (error).code).toBe("invalid-element");
      }
    });
  });

  describe("sorting", () => {
    it("sorts text with the locale rules and keeps ties in served order", () => {
      const { dt } = setup();
      dt.sort(0);
      expect(dt.sortDirection).toBe("ascending");
      expect(order(dt)).toEqual(["r2", "r3", "r4", "r1", "r5"]);
      dt.sort(0);
      expect(dt.sortDirection).toBe("descending");
      expect(order(dt)).toEqual(["r5", "r1", "r3", "r4", "r2"]);
      dt.sort(0);
      expect(dt.sortDirection).toBe("ascending");
    });

    it("sorts numbers and sends cells without a number to the end", () => {
      const { dt } = setup();
      dt.sort(1, "ascending");
      expect(order(dt)).toEqual(["r2", "r5", "r1", "r3", "r4"]);
      dt.sort(1, "descending");
      expect(order(dt)).toEqual(["r3", "r1", "r5", "r2", "r4"]);
    });

    it("sorts dates and sends cells without a date to the end", () => {
      const { dt } = setup();
      dt.sort(2, "ascending");
      expect(order(dt)).toEqual(["r5", "r2", "r1", "r4", "r3"]);
      dt.sort(2, "descending");
      expect(order(dt)).toEqual(["r4", "r1", "r2", "r5", "r3"]);
    });

    it("sorts from a click on the header button", () => {
      const { dt } = setup();
      button(dt, 1).dispatchEvent(new Event("click", { bubbles: true }));
      expect(dt.sortColumn).toBe(1);
      expect(dt.sortDirection).toBe("ascending");
      button(dt, 1).dispatchEvent(new Event("click", { bubbles: true }));
      expect(dt.sortDirection).toBe("descending");
    });

    it("keeps aria-sort on the sorted column only", () => {
      const { dt } = setup();
      dt.sort(0, "ascending");
      expect(ariaSort(dt)).toEqual(["ascending"]);
      const th = /** @type {HTMLElement} */ (
        dt.element.querySelectorAll("thead th")[0]
      );
      expect(th.getAttribute("aria-sort")).toBe("ascending");
      dt.sort(1, "descending");
      expect(ariaSort(dt)).toEqual(["descending"]);
      expect(th.hasAttribute("aria-sort")).toBe(false);
    });

    it("ignores columns that are not sortable", () => {
      const { dt } = setup();
      dt.sort(3);
      expect(dt.sortColumn).toBe(-1);
      expect(order(dt)).toEqual(["r1", "r2", "r3", "r4", "r5"]);
    });

    it("keeps the empty row at the end after sorting", () => {
      const { dt } = setup();
      dt.sort(1, "descending");
      const tbody = /** @type {HTMLElement} */ (dt.element.querySelector("tbody"));
      expect(tbody.lastElementChild).toBe(emptyRow(dt));
    });

    it("emits iv:sort and then iv:sorted", () => {
      const { dt, el } = setup();
      /** @type {CustomEvent[]} */
      const seen = [];
      el.addEventListener("iv:sort", (e) => seen.push(/** @type {CustomEvent} */ (e)));
      el.addEventListener("iv:sorted", (e) => seen.push(/** @type {CustomEvent} */ (e)));
      dt.sort(1, "descending");
      expect(seen.map((e) => e.type)).toEqual(["iv:sort", "iv:sorted"]);
      expect(seen[0].cancelable).toBe(true);
      expect(seen[1].cancelable).toBe(false);
      expect(seen[0].detail.column).toBe(1);
      expect(seen[0].detail.direction).toBe("descending");
      expect(seen[0].detail.previousColumn).toBe(-1);
      expect(seen[0].detail.previousDirection).toBe(null);
      expect(seen[0].detail.instance).toBe(dt);
    });

    it("aborts the sort when iv:sort is cancelled", () => {
      const { dt, el } = setup();
      const after = vi.fn();
      el.addEventListener("iv:sort", (e) => e.preventDefault());
      el.addEventListener("iv:sorted", after);
      dt.sort(1, "descending");
      expect(after).not.toHaveBeenCalled();
      expect(order(dt)).toEqual(["r1", "r2", "r3", "r4", "r5"]);
      expect(dt.sortColumn).toBe(-1);
      expect(ariaSort(dt)).toEqual([]);
    });

    it("applies data-iv-sorted on init and emits only iv:sorted", () => {
      document.body.innerHTML = PRESORTED;
      /** @type {string[]} */
      const seen = [];
      document.addEventListener("iv:sort", () => seen.push("iv:sort"));
      document.addEventListener("iv:sorted", () => seen.push("iv:sorted"));
      const dt = new DataTable(byId("dt2"));
      expect(seen).toEqual(["iv:sorted"]);
      expect(dt.sortColumn).toBe(1);
      expect(dt.sortDirection).toBe("descending");
      expect(order(dt)).toEqual(["p2", "p3", "p1"]);
      expect(ariaSort(dt)).toEqual(["descending"]);
      dt.destroy();
    });
  });

  describe("filtering", () => {
    it("matches anywhere, ignoring case and diacritics", () => {
      const { dt } = setup();
      dt.filter("cordoba");
      expect(shown(dt)).toEqual(["r1"]);
      expect(dt.query).toBe("cordoba");
      expect(dt.visibleRows).toBe(1);
      dt.filter("BILBAO");
      expect(shown(dt)).toEqual(["r3", "r4"]);
    });

    it("prefers data-iv-filter-text over the text of the row", () => {
      const { dt } = setup();
      dt.filter("needle");
      expect(shown(dt)).toEqual(["r5"]);
      dt.filter("epsilon");
      expect(shown(dt)).toEqual([]);
    });

    it("shows the empty row and the count when nothing matches", () => {
      const { dt } = setup();
      dt.filter("zzz");
      expect(emptyRow(dt).hidden).toBe(false);
      expect(status(dt)).toBe("0 of 5 rows");
      dt.filter("a");
      expect(emptyRow(dt).hidden).toBe(true);
    });

    it("hides the rows that do not match with the hidden attribute", () => {
      const { dt } = setup();
      dt.filter("cordoba");
      expect(byId("r2").hasAttribute("hidden")).toBe(true);
      expect(byId("r1").hasAttribute("hidden")).toBe(false);
      dt.clearFilter();
      expect(byId("r2").hasAttribute("hidden")).toBe(false);
      expect(dt.query).toBe("");
      expect(status(dt)).toBe("5 of 5 rows");
    });

    it("writes the query into the input when it comes from the API", () => {
      const { dt, input } = setup();
      dt.filter("bil");
      expect(input.value).toBe("bil");
      dt.clearFilter();
      expect(input.value).toBe("");
    });

    it("emits iv:filter and then iv:filtered", () => {
      const { dt, el } = setup();
      /** @type {CustomEvent[]} */
      const seen = [];
      el.addEventListener("iv:filter", (e) => seen.push(/** @type {CustomEvent} */ (e)));
      el.addEventListener("iv:filtered", (e) => seen.push(/** @type {CustomEvent} */ (e)));
      dt.filter("bil");
      expect(seen.map((e) => e.type)).toEqual(["iv:filter", "iv:filtered"]);
      expect(seen[0].cancelable).toBe(true);
      expect(seen[0].detail.query).toBe("bil");
      expect(seen[0].detail.previousQuery).toBe("");
      expect(seen[1].cancelable).toBe(false);
      expect(seen[1].detail).toEqual({
        instance: dt,
        query: "bil",
        visible: 2,
        total: 5,
      });
    });

    it("aborts the filter when iv:filter is cancelled", () => {
      const { dt, el, input } = setup();
      const after = vi.fn();
      el.addEventListener("iv:filter", (e) => e.preventDefault());
      el.addEventListener("iv:filtered", after);
      dt.filter("bil");
      expect(after).not.toHaveBeenCalled();
      expect(shown(dt)).toEqual(["r1", "r2", "r3", "r4", "r5"]);
      expect(dt.query).toBe("");
      expect(input.value).toBe("");
    });
  });

  describe("filter delay", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("waits for filterDelay before filtering what was typed", () => {
      const { dt, input } = setup();
      type(input, "bil");
      expect(dt.query).toBe("");
      vi.advanceTimersByTime(149);
      expect(dt.query).toBe("");
      vi.advanceTimersByTime(1);
      expect(dt.query).toBe("bil");
      expect(shown(dt)).toEqual(["r3", "r4"]);
    });

    it("keeps only the last keystroke", () => {
      const { dt, input } = setup();
      type(input, "b");
      vi.advanceTimersByTime(100);
      type(input, "bil");
      vi.advanceTimersByTime(100);
      expect(dt.query).toBe("");
      vi.advanceTimersByTime(50);
      expect(dt.query).toBe("bil");
    });

    it("honours data-iv-filter-delay", () => {
      byId("dt").setAttribute("data-iv-filter-delay", "500");
      const { dt, input } = setup();
      expect(dt.options.filterDelay).toBe(500);
      type(input, "bil");
      vi.advanceTimersByTime(499);
      expect(dt.query).toBe("");
      vi.advanceTimersByTime(1);
      expect(dt.query).toBe("bil");
    });

    it("filters immediately from the API and drops the pending timer", () => {
      const { dt, input } = setup();
      type(input, "bil");
      dt.filter("cordoba");
      expect(dt.query).toBe("cordoba");
      vi.advanceTimersByTime(1000);
      expect(dt.query).toBe("cordoba");
      expect(shown(dt)).toEqual(["r1"]);
    });

    it("clears the pending timer on destroy", () => {
      const { dt, input } = setup();
      type(input, "bil");
      dt.destroy();
      vi.advanceTimersByTime(1000);
      expect(byId("r1").hasAttribute("hidden")).toBe(false);
      expect(byId("r3").hasAttribute("hidden")).toBe(false);
    });
  });

  describe("reset", () => {
    it("restores the served order and clears the filter", () => {
      const { dt, input } = setup();
      dt.sort(1, "descending");
      dt.filter("bil");
      dt.reset();
      expect(order(dt)).toEqual(["r1", "r2", "r3", "r4", "r5"]);
      expect(dt.sortColumn).toBe(-1);
      expect(dt.sortDirection).toBe(null);
      expect(ariaSort(dt)).toEqual([]);
      expect(dt.query).toBe("");
      expect(input.value).toBe("");
      expect(shown(dt)).toEqual(["r1", "r2", "r3", "r4", "r5"]);
      expect(status(dt)).toBe("5 of 5 rows");
      expect(emptyRow(dt).hidden).toBe(true);
    });

    it("keeps the empty row at the end and emits the past-tense events", () => {
      const { dt, el } = setup();
      /** @type {string[]} */
      const seen = [];
      for (const name of ["iv:sort", "iv:sorted", "iv:filter", "iv:filtered"]) {
        el.addEventListener(name, () => seen.push(name));
      }
      dt.sort(1, "descending");
      seen.length = 0;
      dt.reset();
      expect(seen).toEqual(["iv:sorted", "iv:filtered"]);
      const tbody = /** @type {HTMLElement} */ (dt.element.querySelector("tbody"));
      expect(tbody.lastElementChild).toBe(emptyRow(dt));
    });
  });

  describe("options", () => {
    it("reads the texts from attributes", () => {
      const el = byId("dt");
      el.setAttribute("data-iv-empty-text", "Nothing here");
      el.setAttribute("data-iv-status-text", "{visible}/{total}");
      const { dt } = setup();
      expect(status(dt)).toBe("5/5");
      expect(emptyRow(dt).textContent).toBe("Nothing here");
      dt.filter("zzz");
      expect(status(dt)).toBe("0/5");
    });

    it("lets JavaScript options win over attributes", () => {
      byId("dt").setAttribute("data-iv-status-text", "{visible}/{total}");
      const { dt } = setup({ statusText: "{total} rows, {visible} shown", locale: "es" });
      expect(status(dt)).toBe("5 rows, 5 shown");
      expect(dt.options.locale).toBe("es");
      dt.sort(0, "ascending");
      expect(order(dt)).toEqual(["r2", "r3", "r4", "r1", "r5"]);
    });
  });
});
