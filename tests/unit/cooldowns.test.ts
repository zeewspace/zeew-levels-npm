import { describe, it, expect, beforeEach } from "vitest";
import { MemoryAdapter } from "../../src/adapters/memory";
import { CooldownManager } from "../../src/cooldowns";

describe("CooldownManager", () => {
  let adapter: MemoryAdapter;
  let cooldowns: CooldownManager;

  beforeEach(() => {
    adapter = new MemoryAdapter();
    cooldowns = new CooldownManager(adapter, { messageCooldown: 5000 });
  });

  it("is not on cooldown initially", async () => {
    const result = await cooldowns.isOnCooldown({ user: "u1", guild: "g1" }, "message");
    expect(result.onCooldown).toBe(false);
  });

  it("sets and checks cooldown", async () => {
    const key = { user: "u1", guild: "g1" };
    await cooldowns.setCooldown(key, "message");
    const result = await cooldowns.isOnCooldown(key, "message");
    expect(result.onCooldown).toBe(true);
    expect(result.retryIn).toBeGreaterThan(0);
  });

  it("clears cooldown", async () => {
    const key = { user: "u1", guild: "g1" };
    await cooldowns.setCooldown(key, "message");
    await cooldowns.clearCooldown(key, "message");
    const result = await cooldowns.isOnCooldown(key, "message");
    expect(result.onCooldown).toBe(false);
  });

  it("returns correct duration for action", () => {
    expect(cooldowns.getDuration("message")).toBe(5000);
    expect(cooldowns.getDuration("voice")).toBe(60000);
    expect(cooldowns.getDuration("command")).toBe(3000);
  });
});
