/**
 * Catalogue recipe: category filters, price sorting and a live count.
 *
 * Everything runs in this page over the nine cards already present in the HTML;
 * there is no request, no data source and no server. The iVOLT components on
 * the page (tabs) are initialised by `auto.js`, so nothing is imported here.
 */

const form = document.getElementById("catalog-filters");
const grid = document.getElementById("catalog-grid");
const status = document.getElementById("catalog-status");
const sort = document.getElementById("catalog-sort");

if (form && grid && status && sort) {
  /** Cards in the order they were served, used by the "Featured" option. */
  const cards = [...grid.children];
  const total = cards.length;

  /** @returns {string[]} Values of the ticked category checkboxes. */
  const selectedCategories = () =>
    [...form.querySelectorAll('input[name="category"]:checked')].map((input) => input.value);

  /** @param {Element} card @returns {number} The card price. */
  const priceOf = (card) => Number(card.getAttribute("data-price")) || 0;

  /** Applies the current filters and reports the visible count. */
  function apply() {
    const categories = selectedCategories();
    let shown = 0;
    for (const card of cards) {
      const visible = categories.includes(card.getAttribute("data-category") || "");
      card.hidden = !visible;
      if (visible) shown += 1;
    }
    status.textContent = `${shown} of ${total} shown`;
  }

  /** Reorders the nodes in place according to the select. */
  function reorder() {
    const order = [...cards];
    if (sort.value === "price-asc") order.sort((a, b) => priceOf(a) - priceOf(b));
    else if (sort.value === "price-desc") order.sort((a, b) => priceOf(b) - priceOf(a));
    for (const card of order) grid.append(card);
  }

  form.addEventListener("submit", (event) => {
    // Demo page: the filters are already applied live and nothing is sent.
    event.preventDefault();
  });

  form.addEventListener("change", (event) => {
    if (event.target === sort) reorder();
    else apply();
  });

  form.addEventListener("reset", () => {
    // The reset happens after this event, so read the controls on the next tick.
    requestAnimationFrame(() => {
      reorder();
      apply();
    });
  });

  apply();
}
