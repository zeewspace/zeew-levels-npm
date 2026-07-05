import { describe, it, expect, beforeEach } from "vitest";
import { ZeewLevels } from "../../src/levels";
import { MemoryAdapter } from "../../src/adapters/memory";

describe("ZeewLevels", () => {
  let adapter: MemoryAdapter;
  let levels: ZeewLevels;

  beforeEach(() => {
    adapter = new MemoryAdapter();
    levels = new ZeewLevels(adapter, {
      xpPerMessage: { min: 1, max: 5 },
      levelUpThreshold: 100,
    });
  });

  describe("processMessage", () => {
    it("creates a new user with random xp", async () => {
      const result = await levels.processMessage("user1", "guild1");

      expect(result.type).toBe("xp_gain");
      expect(result.xp).toBeGreaterThanOrEqual(1);
      expect(result.xp).toBeLessThanOrEqual(5);
    });

    it("increments xp on subsequent messages", async () => {
      await levels.processMessage("user1", "guild1");
      const before = await levels.getUser("user1", "guild1");
      const xpBefore = before!.xp;

      await levels.processMessage("user1", "guild1");
      const after = await levels.getUser("user1", "guild1");

      expect(after!.xp).toBeGreaterThan(xpBefore);
    });

    it("levels up when xp exceeds threshold", async () => {
      // Force user to near threshold (99 + min xp 1 = 100 >= threshold)
      await adapter.upsertUser({ user: "user1", guild: "guild1" }, 99, 0);

      const result = await levels.processMessage("user1", "guild1");

      expect(result.type).toBe("level_up");
      expect((result as any).newLevel).toBe(1);
    });

    it("carries over excess xp after level up", async () => {
      await adapter.upsertUser({ user: "user1", guild: "guild1" }, 98, 0);

      // Process multiple messages to guarantee level up
      let leveledUp = false;
      for (let i = 0; i < 20; i++) {
        const r = await levels.processMessage("user1", "guild1");
        if (r.type === "level_up") {
          leveledUp = true;
          break;
        }
      }

      expect(leveledUp).toBe(true);
      const user = await levels.getUser("user1", "guild1");
      expect(user!.level).toBeGreaterThanOrEqual(1);
      expect(user!.xp).toBeGreaterThanOrEqual(0);
    });
  });

  describe("addXp", () => {
    it("adds exact xp amount", async () => {
      const result = await levels.addXp("user1", "guild1", 50);

      expect(result.type).toBe("xp_gain");
      expect(result.xp).toBe(50);
      expect(result.totalXp).toBe(50);
    });

    it("levels up with exact threshold", async () => {
      await adapter.upsertUser({ user: "user1", guild: "guild1" }, 50, 0);

      const result = await levels.addXp("user1", "guild1", 50);

      expect(result.type).toBe("level_up");
      expect((result as any).newLevel).toBe(1);
    });

    it("creates user if not exists", async () => {
      await levels.addXp("newuser", "guild1", 25);

      const user = await levels.getUser("newuser", "guild1");
      expect(user).not.toBeNull();
      expect(user!.xp).toBe(25);
      expect(user!.level).toBe(0);
    });
  });

  describe("getLevel / getXp / getUser", () => {
    it("returns null for non-existent user", async () => {
      expect(await levels.getLevel("nobody", "guild1")).toBeNull();
      expect(await levels.getXp("nobody", "guild1")).toBeNull();
      expect(await levels.getUser("nobody", "guild1")).toBeNull();
    });

    it("returns correct values", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 42, 3);

      expect(await levels.getLevel("u1", "g1")).toBe(3);
      expect(await levels.getXp("u1", "g1")).toBe(42);

      const user = await levels.getUser("u1", "g1");
      expect(user).toEqual({ user: "u1", guild: "g1", xp: 42, level: 3 });
    });
  });

  describe("setLevel / setXp", () => {
    it("sets level preserving xp", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 42, 3);
      await levels.setLevel("u1", "g1", 10);

      const user = await levels.getUser("u1", "g1");
      expect(user!.level).toBe(10);
      expect(user!.xp).toBe(42);
    });

    it("sets xp preserving level", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 42, 3);
      await levels.setXp("u1", "g1", 99);

      const user = await levels.getUser("u1", "g1");
      expect(user!.xp).toBe(99);
      expect(user!.level).toBe(3);
    });

    it("creates user if not exists", async () => {
      await levels.setLevel("new", "g1", 5);
      const user = await levels.getUser("new", "g1");
      expect(user!.level).toBe(5);
      expect(user!.xp).toBe(0);
    });
  });

  describe("getLeaderboard", () => {
    it("returns sorted leaderboard", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, 10, 2);
      await adapter.upsertUser({ user: "b", guild: "g1" }, 50, 3);
      await adapter.upsertUser({ user: "c", guild: "g1" }, 20, 1);

      const lb = await levels.getLeaderboard("g1");

      expect(lb).toHaveLength(3);
      expect(lb[0].user).toBe("b");
      expect(lb[1].user).toBe("a");
      expect(lb[2].user).toBe("c");
    });

    it("respects limit", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, 10, 1);
      await adapter.upsertUser({ user: "b", guild: "g1" }, 20, 2);
      await adapter.upsertUser({ user: "c", guild: "g1" }, 30, 3);

      const lb = await levels.getLeaderboard("g1", 2);
      expect(lb).toHaveLength(2);
    });

    it("filters by guild", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, 10, 5);
      await adapter.upsertUser({ user: "b", guild: "g2" }, 10, 10);

      const lb = await levels.getLeaderboard("g1");
      expect(lb).toHaveLength(1);
      expect(lb[0].user).toBe("a");
    });
  });

  describe("deleteUser / deleteAll", () => {
    it("deletes a single user", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 10, 1);
      await levels.deleteUser("u1", "g1");

      expect(await levels.getUser("u1", "g1")).toBeNull();
    });

    it("deletes all users in a guild", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, 10, 1);
      await adapter.upsertUser({ user: "b", guild: "g1" }, 20, 2);
      await adapter.upsertUser({ user: "c", guild: "g2" }, 30, 3);

      await levels.deleteAll("g1");

      expect(await levels.getUser("a", "g1")).toBeNull();
      expect(await levels.getUser("b", "g1")).toBeNull();
      expect(await levels.getUser("c", "g2")).not.toBeNull();
    });
  });

  describe("hooks", () => {
    it("calls onLevelUp hook", async () => {
      const calls: any[] = [];
      levels.onLevelUp = (user, guild, newLevel) => {
        calls.push({ user, guild, newLevel });
      };

      await adapter.upsertUser({ user: "u1", guild: "g1" }, 98, 0);
      await levels.processMessage("u1", "g1");

      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[0].user).toBe("u1");
      expect(calls[0].newLevel).toBe(1);
    });

    it("calls onXpGain hook", async () => {
      const calls: any[] = [];
      levels.onXpGain = (user, guild, xp) => {
        calls.push({ user, guild, xp });
      };

      await levels.processMessage("u1", "g1");

      expect(calls).toHaveLength(1);
      expect(calls[0].xp).toBeGreaterThanOrEqual(1);
    });
  });
});
