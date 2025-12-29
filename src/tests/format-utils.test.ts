import { describe, it, expect } from "vitest";
import { formatOrderNumber } from "../lib/format-utils";

describe("formatOrderNumber", () => {
  describe("basic formatting", () => {
    it("formats numeric order number with store prefix", () => {
      expect(formatOrderNumber(25771, "bannos")).toBe("#B25771");
      expect(formatOrderNumber(25771, "flourlane")).toBe("#F25771");
    });

    it("formats string order number with store prefix", () => {
      expect(formatOrderNumber("25771", "bannos")).toBe("#B25771");
      expect(formatOrderNumber("25771", "flourlane")).toBe("#F25771");
    });

    it("handles null/undefined orderId", () => {
      expect(formatOrderNumber(null, "bannos")).toBe("#BUNKNOWN");
      expect(formatOrderNumber(undefined, "flourlane")).toBe("#FUNKNOWN");
    });
  });

  describe("already prefixed order numbers", () => {
    it("preserves #B/#F prefix", () => {
      expect(formatOrderNumber("#B25771", "bannos")).toBe("#B25771");
      expect(formatOrderNumber("#F25771", "flourlane")).toBe("#F25771");
    });

    it("adds # to B/F prefix without hash", () => {
      expect(formatOrderNumber("B25771", "bannos")).toBe("#B25771");
      expect(formatOrderNumber("F25771", "flourlane")).toBe("#F25771");
    });
  });

  describe("split order suffix handling", () => {
    it("extracts suffix from id for split orders", () => {
      expect(formatOrderNumber(25771, "bannos", "bannos-25771-A")).toBe("#B25771-A");
      expect(formatOrderNumber(25771, "bannos", "bannos-25771-B")).toBe("#B25771-B");
      expect(formatOrderNumber(25771, "flourlane", "flourlane-25771-A")).toBe("#F25771-A");
    });

    it("does not add suffix for single orders (no suffix in id)", () => {
      expect(formatOrderNumber(25771, "bannos", "bannos-25771")).toBe("#B25771");
    });

    it("preserves existing suffix in orderId", () => {
      expect(formatOrderNumber("#B25771-A", "bannos", "bannos-25771-A")).toBe("#B25771-A");
      expect(formatOrderNumber("B25771-A", "bannos", "bannos-25771-A")).toBe("#B25771-A");
    });

    it("appends suffix to B/F prefixed orderId without #", () => {
      expect(formatOrderNumber("B25771", "bannos", "bannos-25771-A")).toBe("#B25771-A");
      expect(formatOrderNumber("F25771", "flourlane", "flourlane-25771-B")).toBe("#F25771-B");
    });

    it("handles null/undefined id parameter", () => {
      expect(formatOrderNumber(25771, "bannos", null)).toBe("#B25771");
      expect(formatOrderNumber(25771, "bannos", undefined)).toBe("#B25771");
    });
  });

  describe("edge cases", () => {
    it("handles empty string orderId", () => {
      expect(formatOrderNumber("", "bannos")).toBe("#BUNKNOWN");
    });

    it("handles whitespace in orderId", () => {
      expect(formatOrderNumber("  25771  ", "bannos")).toBe("#B25771");
    });

    it("extracts digits from mixed input", () => {
      expect(formatOrderNumber("order-25771", "bannos")).toBe("#B25771");
    });
  });
});
