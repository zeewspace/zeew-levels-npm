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
    await adapter.upsertUser({ user: "u1", guild: "g1" }, 42, 3);

    const adapter2 = new JsonAdapter(TEST_FILE);
    const user = await adapter2.findUser({ user: "u1", guild: "g1" });

    expect(user).toEqual({ user: "u1", guild: "g1", xp: 42, level: 3 });
  });

  it("full lifecycle with ZeewLevels", async () => {
    const levels = new ZeewLevels(adapter, {
      xpPerMessage: { min: 1, max: 5 },
      levelUpThreshold: 100,
    });

    // Process messages
    for (let i = 0; i < 30; i++) {
      await levels.processMessage("user1", "guild1");
    }

    // Verify user exists
    const user = await levels.getUser("user1", "guild1");
    expect(user).not.toBeNull();
    expect(user!.level).toBeGreaterThanOrEqual(0);
    expect(user!.xp).toBeGreaterThanOrEqual(0);

    // Leaderboard
    const lb = await levels.getLeaderboard("guild1");
    expect(lb.length).toBeGreaterThanOrEqual(1);
    expect(lb[0].user).toBe("user1");

    // Delete user
    await levels.deleteUser("user1", "guild1");
    expect(await levels.getUser("user1", "guild1")).toBeNull();

    // Delete all
    await adapter.upsertUser({ user: "a", guild: "g1" }, 10, 1);
    await adapter.upsertUser({ user: "b", guild: "g1" }, 20, 2);
    await levels.deleteAll("guild1");
    expect(await adapter.allUsers("guild1")).toHaveLength(0);
  });
});
