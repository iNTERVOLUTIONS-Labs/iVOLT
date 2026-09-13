// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  IvError,
  getInstance,
  getInstances,
  setInstance,
  deleteInstance,
  hasInstances,
} from "../../packages/ivolt/src/js/core/registry.js";

describe("registry", () => {
  it("stores and reads instances per element and name", () => {
    const el = document.createElement("div");
    const inst = { id: 1 };
    expect(getInstance(el, "dialog")).toBeUndefined();
    expect(hasInstances(el)).toBe(false);
    setInstance(el, "dialog", inst);
    expect(getInstance(el, "dialog")).toBe(inst);
    expect(hasInstances(el)).toBe(true);
    expect(getInstance(el, "tabs")).toBeUndefined();
  });

  it("keeps several components on the same element", () => {
    const el = document.createElement("div");
    setInstance(el, "dialog", { a: 1 });
    setInstance(el, "drawer", { b: 2 });
    expect(getInstances(el)?.size).toBe(2);
  });

  it("throws IvError with code instance-exists on duplicates", () => {
    const el = document.createElement("div");
    setInstance(el, "dialog", {});
    let error = null;
    try {
      setInstance(el, "dialog", {});
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(IvError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("instance-exists");
    expect(error.name).toBe("IvError");
  });

  it("deletes instances and cleans the element entry", () => {
    const el = document.createElement("div");
    setInstance(el, "dialog", {});
    expect(deleteInstance(el, "dialog")).toBe(true);
    expect(deleteInstance(el, "dialog")).toBe(false);
    expect(hasInstances(el)).toBe(false);
    expect(getInstances(el)).toBeUndefined();
  });

  it("does not leak between elements (WeakMap keyed by element)", () => {
    const a = document.createElement("div");
    const b = document.createElement("div");
    setInstance(a, "dialog", { which: "a" });
    expect(getInstance(b, "dialog")).toBeUndefined();
  });
});
