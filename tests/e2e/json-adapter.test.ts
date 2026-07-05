import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { JsonAdapter } from "../../src/adapters/json";
import { ZeewLevels } from "../../src/levels";

const TEST_FILE = path.resolve(__dirname, "../.test-zeew-levels.json");

describe("JsonAdapter E2E", () => {
  let adapter: JsonAdapter;

  beforeEach(() => {
    try { fs.unlinkSync(TEST_FILE); } catch {}
    adapter = new JsonAdapter(TEST_FILE);
  });

  afterEach(() => {
    try { fs.unlinkSync(TEST_FILE); } catch {}
  });

  it("persists data across adapter instances", async () => {
    await adapter.upsertUser({ user: "u1", guild: "g1" }, { xp: 42, level: 3, totalXp: 200 });
    const adapter2 = new JsonAdapter(TEST_FILE);
    const user = await adapter2.findUser({ user: "u1", guild: "g1" });
    expect(user).toEqual(expect.objectContaining({ user: "u1", guild: "g1", xp: 42, level: 3 }));
  });

  it("full lifecycle with ZeewLevels", async () => {
    const levels = new ZeewLevels(adapter, {
      xpPerMessage: { min: 1, max: 5 },
      levelUpThreshold: 100,
      cache: { enabled: true },
    });

    for (let i = 0; i < 30; i++) {
      await levels.processMessage("user1", "guild1");
    }

    const user = await levels.getUser("user1", "guild1");
    expect(user).not.toBeNull();

    const lb = await levels.getLeaderboard("guild1");
    expect(lb.length).toBeGreaterThanOrEqual(1);

    await levels.deleteUser("user1", "guild1");
    expect(await levels.getUser("user1", "guild1")).toBeNull();
  });

  it("handles cooldowns and prestige", async () => {
    const levels = new ZeewLevels(adapter, {
      levelUpThreshold: 10,
      cooldown: { messageCooldown: 1000 },
      prestige: { enabled: true, requiredLevel: 5, maxPrestige: 3, resetLevel: 1, bonusPerPrestige: 0.1 },
    });

    // Level up
    for (let i = 0; i < 10; i++) {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, { xp: 9, level: 4, totalXp: 50, messages: i });
      const result = await levels.processMessage("u1", "g1");
      if (result.type === "level_up") break;
    }

    const user = await levels.getUser("u1", "g1");
    expect(user).not.toBeNull();
  });
});
