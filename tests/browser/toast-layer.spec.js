import { test, expect } from "@playwright/test";

// ADR-034: a toast region enters the top layer as a manual popover, so a critical toast paints above a modal dialog.
// Interaction stays blocked by the modal (the browser keeps everything else inert) until it closes; visibility is the goal.
test("a toast shown while a modal dialog is open is painted above it and survives the dialog", async ({ page }) => {
  await page.goto("/fixture/dialog/basic");
  await page.locator("[data-iv-open=signup]").click();
  await expect(page.locator("#signup")).toHaveAttribute("open", "");
  const result = await page.evaluate(async () => {
    const mod = await import("/packages/ivolt/dist/js/components/toast.js");
    const region = document.createElement("div");
    region.className = "iv-toast-region";
    region.setAttribute("aria-label", "Notifications");
    document.body.append(region);
    const toast = new mod.Toast(region);
    const item = toast.show({ message: "Connection lost", variant: "danger", timeout: 0 });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = item.element.getBoundingClientRect();
    let open = false;
    try { open = region.matches(":popover-open"); } catch {}
    return { popover: region.getAttribute("popover"), supported: typeof region.showPopover === "function", open, x: r.left, y: r.top, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight };
  });
  if (!result.supported) test.skip(true, "popover attribute not supported in this engine");
  expect(result.popover).toBe("manual");
  expect(result.open).toBe(true);
  expect(result.w).toBeGreaterThan(0);
  expect(result.x + result.w).toBeLessThanOrEqual(result.vw);
  expect(result.y + result.h).toBeLessThanOrEqual(result.vh);
  // Closing the dialog leaves the toast in place and dismissible; the region leaves the top layer when empty.
  await page.keyboard.press("Escape");
  await expect(page.locator("#signup")).not.toHaveAttribute("open", "");
  await page.locator(".iv-toast button").first().click();
  await expect(page.locator(".iv-toast")).toHaveCount(0);
  const closed = await page.evaluate(() => { try { return document.querySelector(".iv-toast-region").matches(":popover-open"); } catch { return null; } });
  expect(closed).toBe(false);
});
