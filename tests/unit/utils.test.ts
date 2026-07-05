import { describe, it, expect } from "vitest";
import {
  createXpCalculator,
  xpForLevel,
  xpProgress,
  xpPercentage,
  messagesToNextLevel,
  progressBar,
  formatXp,
  formatLevel,
  rankSuffix,
} from "../../src/utils";

describe("utils", () => {
  describe("createXpCalculator", () => {
    it("creates linear curve", () => {
      const calc = createXpCalculator({ name: "linear", base: 100, multiplier: 50 });
      expect(calc(0)).toBe(100);
      expect(calc(5)).toBe(350);
    });

    it("creates quadratic curve", () => {
      const calc = createXpCalculator({ name: "quadratic", base: 100, multiplier: 10 });
      expect(calc(0)).toBe(100);
      expect(calc(3)).toBe(190);
    });

    it("creates exponential curve", () => {
      const calc = createXpCalculator({ name: "exponential", base: 100, multiplier: 1.5 });
      expect(calc(0)).toBe(100);
      expect(calc(2)).toBe(225);
    });

    it("creates custom curve", () => {
      const calc = createXpCalculator({ name: "custom", custom: (l) => l * l * 100 });
      expect(calc(3)).toBe(900);
    });
  });

  describe("xpProgress / xpPercentage", () => {
    it("calculates progress", () => {
      expect(xpProgress(50, 100)).toBe(0.5);
      expect(xpProgress(100, 100)).toBe(1);
      expect(xpProgress(0, 100)).toBe(0);
    });

    it("calculates percentage", () => {
      expect(xpPercentage(50, 100)).toBe(50);
      expect(xpPercentage(33, 100)).toBe(33);
    });
  });

  describe("messagesToNextLevel", () => {
    it("estimates messages needed", () => {
      expect(messagesToNextLevel(50, 100, 5)).toBe(10);
      expect(messagesToNextLevel(90, 100, 5)).toBe(2);
    });
  });

  describe("progressBar", () => {
    it("renders bar", () => {
      const bar = progressBar(50, 10);
      expect(bar).toBe("█████░░░░░");
    });

    it("renders full bar", () => {
      const bar = progressBar(100, 10);
      expect(bar).toBe("██████████");
    });

    it("renders empty bar", () => {
      const bar = progressBar(0, 10);
      expect(bar).toBe("░░░░░░░░░░");
    });
  });

  describe("formatXp", () => {
    it("formats small numbers", () => {
      expect(formatXp(42)).toBe("42");
    });

    it("formats thousands", () => {
      expect(formatXp(1500)).toBe("1.5K");
    });

    it("formats millions", () => {
      expect(formatXp(2500000)).toBe("2.5M");
    });
  });

  describe("formatLevel", () => {
    it("formats without prestige", () => {
      expect(formatLevel(5, 0)).toBe("Level 5");
    });

    it("formats with prestige", () => {
      expect(formatLevel(5, 2)).toBe("[P2] Level 5");
    });
  });

  describe("rankSuffix", () => {
    it("returns correct suffixes", () => {
      expect(rankSuffix(1)).toBe("1st");
      expect(rankSuffix(2)).toBe("2nd");
      expect(rankSuffix(3)).toBe("3rd");
      expect(rankSuffix(4)).toBe("4th");
      expect(rankSuffix(11)).toBe("11th");
      expect(rankSuffix(12)).toBe("12th");
      expect(rankSuffix(21)).toBe("21st");
      expect(rankSuffix(22)).toBe("22nd");
      expect(rankSuffix(23)).toBe("23rd");
    });
  });
});
