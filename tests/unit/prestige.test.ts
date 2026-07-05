import { describe, it, expect, beforeEach } from "vitest";
import { MemoryAdapter } from "../../src/adapters/memory";
import { PrestigeManager } from "../../src/prestige";

describe("PrestigeManager", () => {
  let adapter: MemoryAdapter;
  let prestige: PrestigeManager;

  beforeEach(() => {
    adapter = new MemoryAdapter();
    prestige = new PrestigeManager(adapter, {
      enabled: true,
      maxPrestige: 5,
      requiredLevel: 10,
      resetLevel: 1,
      bonusPerPrestige: 0.1,
    });
  });

  it("is enabled", () => {
    expect(prestige.isEnabled()).toBe(true);
  });

  it("cannot prestige below required level", async () => {
    const check = await prestige.canPrestige({ user: "u1", guild: "g1" }, 5);
    expect(check.can).toBe(false);
    expect(check.reason).toContain("10");
  });

  it("can prestige at required level", async () => {
    const check = await prestige.canPrestige({ user: "u1", guild: "g1" }, 10);
    expect(check.can).toBe(true);
  });

  it("does prestige and resets level", async () => {
    const result = await prestige.doPrestige({ user: "u1", guild: "g1" }, 15);
    expect(result.success).toBe(true);
    expect(result.newPrestige).toBe(1);
    expect(result.bonus).toBe(0.1);
  });

  it("cannot exceed max prestige", async () => {
    for (let i = 0; i < 5; i++) {
      await prestige.doPrestige({ user: "u1", guild: "g1" }, 100);
    }
    const check = await prestige.canPrestige({ user: "u1", guild: "g1" }, 100);
    expect(check.can).toBe(false);
    expect(check.reason).toContain("Maximum");
  });

  it("calculates prestige bonus", () => {
    expect(prestige.getPrestigeBonus(0)).toBe(0);
    expect(prestige.getPrestigeBonus(1)).toBe(0.1);
    expect(prestige.getPrestigeBonus(5)).toBe(0.5);
  });
});
