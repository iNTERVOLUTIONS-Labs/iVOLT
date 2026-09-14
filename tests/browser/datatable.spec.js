import { test, expect } from "@playwright/test";

// Reads the sort key of every visible body row for one column, as the component would.
async function columnValues(page, index) {
  return page.evaluate((i) => {
    const rows = [...document.querySelectorAll(".iv-datatable tbody tr:not([hidden]):not(.iv-datatable__empty)")];
    return rows.map((tr) => {
      const cell = tr.children[i];
      if (!cell) return "";
      const time = cell.querySelector("time[datetime]");
      return cell.dataset.ivValue ?? (time ? time.getAttribute("datetime") : cell.textContent.trim());
    });
  }, index);
}

function isSorted(values, type, direction) {
  const parse = (v) => {
    if (type === "number") return Number.parseFloat(String(v).replace(/[^0-9.-]/g, ""));
    if (type === "date") return Date.parse(v);
    return v;
  };
  const valid = values.map(parse).filter((v) => (typeof v === "number" ? Number.isFinite(v) : v !== ""));
  for (let i = 1; i < valid.length; i += 1) {
    const cmp = typeof valid[i] === "number" ? valid[i] - valid[i - 1] : String(valid[i]).localeCompare(String(valid[i - 1]), undefined, { numeric: true, sensitivity: "base" });
    if (direction === "ascending" ? cmp < 0 : cmp > 0) return false;
  }
  return true;
}

test.describe("Data table", () => {
  test("promotion, sorting in both directions, aria-sort, events", async ({ page }) => {
    await page.goto("/fixture/datatable/basic");
    await expect(page.locator("html")).toHaveAttribute("data-iv-js", "");
    const root = page.locator(".iv-datatable");
    const headers = root.locator("th[data-iv-sort]");
    expect(await headers.count()).toBeGreaterThanOrEqual(3);
    const buttons = root.locator("th[data-iv-sort] .iv-datatable__sort");
    expect(await buttons.count()).toBe(await headers.count());
    await expect(root.locator(".iv-datatable__status")).toHaveText(/\d+ of \d+ rows/);

    const events = [];
    await page.exposeFunction("recordEvent", (type, detail) => events.push({ type, detail }));
    await page.evaluate(() => {
      const el = document.querySelector(".iv-datatable");
      for (const type of ["iv:sort", "iv:sorted", "iv:filter", "iv:filtered"]) {
        el.addEventListener(type, (e) => window.recordEvent(type, { column: e.detail.column, direction: e.detail.direction, visible: e.detail.visible, total: e.detail.total }));
      }
    });

    const allHeaders = await root.locator("thead th").all();
    for (let i = 0; i < allHeaders.length; i += 1) {
      const type = await allHeaders[i].getAttribute("data-iv-sort");
      if (type === null) continue;
      const button = allHeaders[i].locator(".iv-datatable__sort");
      const name = (await button.textContent()).trim();
      expect(name.length).toBeGreaterThan(0);
      await button.click();
      await expect(allHeaders[i]).toHaveAttribute("aria-sort", "ascending");
      expect(await root.locator("th[aria-sort]").count()).toBe(1);
      expect(isSorted(await columnValues(page, i), type || "text", "ascending")).toBe(true);
      await button.click();
      await expect(allHeaders[i]).toHaveAttribute("aria-sort", "descending");
      expect(isSorted(await columnValues(page, i), type || "text", "descending")).toBe(true);
      // The accessible name stays the header text: the indicator is CSS only.
      expect((await button.textContent()).trim()).toBe(name);
    }
    expect(events.filter((e) => e.type === "iv:sort").length).toBeGreaterThan(0);
    expect(events.filter((e) => e.type === "iv:sorted").length).toBe(events.filter((e) => e.type === "iv:sort").length);
    await expect(root.locator("thead th").first()).toBeVisible();
  });

  test("filter hides rows, announces the count, shows the empty row and clears", async ({ page }) => {
    await page.goto("/fixture/datatable/basic");
    const root = page.locator(".iv-datatable");
    const filter = root.locator("input[data-iv-datatable-filter]");
    await expect(filter).toBeVisible();
    const total = await root.locator("tbody tr:not(.iv-datatable__empty)").count();
    const firstCell = (await root.locator("tbody tr").first().locator("td, th").first().textContent()).trim();
    const word = firstCell.split(/\s+/)[0];
    await filter.fill(word);
    await expect(root.locator(".iv-datatable__status")).not.toHaveText(`${total} of ${total} rows`);
    const visible = await root.locator("tbody tr:not([hidden]):not(.iv-datatable__empty)").count();
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThanOrEqual(total);
    await expect(root.locator("tbody tr").first()).toBeVisible();
    await expect(root.locator(".iv-datatable__status")).toHaveText(`${visible} of ${total} rows`);

    await filter.fill("zzqqxx-no-such-row");
    await expect(root.locator(".iv-datatable__empty")).toBeVisible();
    await expect(root.locator(".iv-datatable__status")).toHaveText(`0 of ${total} rows`);
    expect(await root.locator("tbody tr:not([hidden]):not(.iv-datatable__empty)").count()).toBe(0);

    await filter.fill("");
    await expect(root.locator(".iv-datatable__empty")).toBeHidden();
    await expect(root.locator(".iv-datatable__status")).toHaveText(`${total} of ${total} rows`);
    expect(await root.locator("tbody tr:not([hidden]):not(.iv-datatable__empty)").count()).toBe(total);

    // Focus stays where it was while filtering and sorting.
    await filter.fill("a");
    await expect(filter).toBeFocused();
  });

  test("initial sort from data-iv-sorted, invalid cells last, destroy restores order", async ({ page }) => {
    await page.goto("/fixture/datatable/sorted");
    const root = page.locator(".iv-datatable");
    const sorted = root.locator("th[aria-sort]");
    await expect(sorted).toHaveCount(1);
    await expect(sorted).toHaveAttribute("aria-sort", "descending");
    const index = await sorted.evaluate((th) => [...th.parentElement.children].indexOf(th));
    const type = (await sorted.getAttribute("data-iv-sort")) || "text";
    const values = await columnValues(page, index);
    expect(isSorted(values, type, "descending")).toBe(true);
    const parse = (v) => (type === "number" ? Number.parseFloat(String(v).replace(/[^0-9.-]/g, "")) : type === "date" ? Date.parse(v) : v);
    const invalidIndex = values.findIndex((v) => (typeof parse(v) === "number" ? !Number.isFinite(parse(v)) : v === ""));
    if (invalidIndex !== -1) expect(values.slice(invalidIndex).every((v) => (typeof parse(v) === "number" ? !Number.isFinite(parse(v)) : v === ""))).toBe(true);

    // The served markup is what the same fixture shows without JavaScript.
    const servedPage = await page.context().newPage();
    await servedPage.goto("/fixture/datatable/sorted?nojs=1");
    const served = await servedPage.locator(".iv-datatable").evaluate((el) => el.innerHTML);
    await servedPage.close();
    const restored = await page.evaluate(async () => {
      const mod = await import("/packages/ivolt/dist/js/components/datatable.js");
      const el = document.querySelector(".iv-datatable");
      const before = el.innerHTML;
      mod.DataTable.get(el).destroy();
      return { after: el.innerHTML, before, hasButtons: !!el.querySelector(".iv-datatable__sort"), hasSort: !!el.querySelector("[aria-sort]"), hasStatus: !!el.querySelector(".iv-datatable__status") };
    });
    expect(restored.hasButtons).toBe(false);
    expect(restored.hasSort).toBe(false);
    expect(restored.hasStatus).toBe(false);
    expect(restored.after).not.toBe(restored.before);
    expect(restored.after).toBe(served);
  });

  test("without JS the table is plain and the filter block is not displayed", async ({ page }) => {
    await page.goto("/fixture/datatable/basic?nojs=1");
    await expect(page.locator("html")).not.toHaveAttribute("data-iv-js", "");
    await expect(page.locator(".iv-datatable__sort")).toHaveCount(0);
    await expect(page.locator("th[aria-sort]")).toHaveCount(0);
    await expect(page.locator(".iv-datatable__filter")).toBeHidden();
    expect(await page.locator(".iv-datatable table.iv-table tbody tr").count()).toBeGreaterThan(3);
  });
});
