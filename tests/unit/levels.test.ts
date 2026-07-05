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
      cache: { enabled: true, maxSize: 100, ttl: 60000 },
    });
  });

  describe("processMessage", () => {
    it("creates a new user with random xp", async () => {
      const result = await levels.processMessage("user1", "guild1");
      expect(result.type).toBe("xp_gain");
      if (result.type === "xp_gain") {
        expect(result.xp).toBeGreaterThanOrEqual(1);
        expect(result.xp).toBeLessThanOrEqual(5);
      }
    });

    it("increments xp on subsequent messages", async () => {
      await levels.processMessage("user1", "guild1");
      const before = await levels.getUser("user1", "guild1");
      const xpBefore = before!.xp;
      await levels.processMessage("user1", "guild1");
      const after = await levels.getUser("user1", "guild1");
      expect(after!.xp).toBeGreaterThanOrEqual(xpBefore);
    });

    it("levels up when xp exceeds threshold", async () => {
      await adapter.upsertUser({ user: "user1", guild: "guild1" }, { xp: 99, level: 0 });
      const result = await levels.processMessage("user1", "guild1");
      expect(result.type).toBe("level_up");
      if (result.type === "level_up") {
        expect(result.newLevel).toBe(1);
        expect(result.rewards).toBeDefined();
      }
    });

    it("applies multipliers from user roles", async () => {
      await levels.addMultiplier("guild1", {
        id: "vip", value: 2, source: "role", roleId: "role123",
      });
      const result = await levels.processMessage("user1", "guild1", ["role123"]);
      expect(result.type).toBe("xp_gain");
      if (result.type === "xp_gain") {
        expect(result.xp).toBeGreaterThanOrEqual(2);
        expect(result.multiplied).toBe(true);
      }
    });

    it("respects cooldowns", async () => {
      await levels.processMessage("user1", "guild1");
      const result = await levels.processMessage("user1", "guild1");
      expect(result.type).toBe("xp_gain");
      if (result.type === "xp_gain") {
        expect(result.xp).toBe(0);
      }
    });
  });

  describe("addXp", () => {
    it("adds exact xp amount", async () => {
      const result = await levels.addXp("user1", "guild1", 50);
      expect(result.type).toBe("xp_gain");
      if (result.type === "xp_gain") {
        expect(result.xp).toBe(50);
        expect(result.totalXp).toBe(50);
      }
    });

    it("levels up with exact threshold", async () => {
      await adapter.upsertUser({ user: "user1", guild: "guild1" }, { xp: 50, level: 0 });
      const result = await levels.addXp("user1", "guild1", 50);
      expect(result.type).toBe("level_up");
    });

    it("creates user if not exists", async () => {
      await levels.addXp("newuser", "guild1", 25);
      const user = await levels.getUser("newuser", "guild1");
      expect(user).not.toBeNull();
      expect(user!.xp).toBe(25);
    });
  });

  describe("prestige", () => {
    it("cannot prestige below required level", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, { xp: 10, level: 5 });
      const check = await levels.canPrestige("u1", "g1");
      expect(check.can).toBe(false);
    });

    it("can prestige at required level", async () => {
      const levelsWithPrestige = new ZeewLevels(adapter, {
        levelUpThreshold: 100,
        prestige: { enabled: true, requiredLevel: 10, maxPrestige: 5, resetLevel: 1, bonusPerPrestige: 0.1 },
      });
      await adapter.upsertUser({ user: "u1", guild: "g1" }, { xp: 50, level: 10 });
      const check = await levelsWithPrestige.canPrestige("u1", "g1");
      expect(check.can).toBe(true);
    });
  });

  describe("rewards", () => {
    it("adds and retrieves rewards", async () => {
      await levels.addReward("guild1", { level: 5, roleId: "role1", type: "role" });
      const rewards = await levels.getRewards("guild1");
      expect(rewards).toHaveLength(1);
      expect(rewards[0].roleId).toBe("role1");
    });

    it("removes rewards", async () => {
      await levels.addReward("guild1", { level: 5, roleId: "role1", type: "role" });
      await levels.removeReward("guild1", 5, "role1");
      const rewards = await levels.getRewards("guild1");
      expect(rewards).toHaveLength(0);
    });
  });

  describe("multipliers", () => {
    it("adds and removes multipliers", async () => {
      await levels.addMultiplier("guild1", { id: "boost", value: 1.5, source: "boost" });
      const config = await levels.multipliers.getConfig("guild1");
      expect(config.multipliers).toHaveLength(1);
      await levels.removeMultiplier("guild1", "boost");
      const config2 = await levels.multipliers.getConfig("guild1");
      expect(config2.multipliers).toHaveLength(0);
    });
  });

  describe("getLevel / getXp / getUser", () => {
    it("returns null for non-existent user", async () => {
      expect(await levels.getLevel("nobody", "guild1")).toBeNull();
      expect(await levels.getXp("nobody", "guild1")).toBeNull();
      expect(await levels.getUser("nobody", "guild1")).toBeNull();
    });

    it("returns correct values", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, { xp: 42, level: 3, totalXp: 200, prestige: 1 });
      expect(await levels.getLevel("u1", "g1")).toBe(3);
      expect(await levels.getXp("u1", "g1")).toBe(42);
    });
  });

  describe("setLevel / setXp", () => {
    it("sets level preserving xp", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, { xp: 42, level: 3 });
      await levels.setLevel("u1", "g1", 10);
      const user = await levels.getUser("u1", "g1");
      expect(user!.level).toBe(10);
      expect(user!.xp).toBe(42);
    });

    it("sets xp preserving level", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, { xp: 42, level: 3 });
      await levels.setXp("u1", "g1", 99);
      const user = await levels.getUser("u1", "g1");
      expect(user!.xp).toBe(99);
      expect(user!.level).toBe(3);
    });
  });

  describe("getLeaderboard", () => {
    it("returns sorted leaderboard", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, { xp: 10, level: 2 });
      await adapter.upsertUser({ user: "b", guild: "g1" }, { xp: 50, level: 3 });
      await adapter.upsertUser({ user: "c", guild: "g1" }, { xp: 20, level: 1 });
      const lb = await levels.getLeaderboard("g1");
      expect(lb).toHaveLength(3);
      expect(lb[0].user).toBe("b");
    });

    it("respects limit", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, { xp: 10, level: 1 });
      await adapter.upsertUser({ user: "b", guild: "g1" }, { xp: 20, level: 2 });
      await adapter.upsertUser({ user: "c", guild: "g1" }, { xp: 30, level: 3 });
      const lb = await levels.getLeaderboard("g1", 2);
      expect(lb).toHaveLength(2);
    });
  });

  describe("deleteUser / deleteAll", () => {
    it("deletes a single user", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, { xp: 10, level: 1 });
      await levels.deleteUser("u1", "g1");
      expect(await levels.getUser("u1", "g1")).toBeNull();
    });

    it("deletes all users in a guild", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, { xp: 10, level: 1 });
      await adapter.upsertUser({ user: "b", guild: "g1" }, { xp: 20, level: 2 });
      await adapter.upsertUser({ user: "c", guild: "g2" }, { xp: 30, level: 3 });
      await levels.deleteAll("g1");
      expect(await levels.getUser("a", "g1")).toBeNull();
      expect(await levels.getUser("c", "g2")).not.toBeNull();
    });
  });

  describe("hooks", () => {
    it("calls onLevelUp hook", async () => {
      const calls: any[] = [];
      levels.onLevelUp = (user, guild, newLevel, rewards) => {
        calls.push({ user, guild, newLevel, rewards });
      };
      await adapter.upsertUser({ user: "u1", guild: "g1" }, { xp: 99, level: 0 });
      await levels.processMessage("u1", "g1");
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it("calls onXpGain hook", async () => {
      const calls: any[] = [];
      levels.onXpGain = (user, guild, xp, multiplied) => {
        calls.push({ user, guild, xp, multiplied });
      };
      await levels.processMessage("u1", "g1");
      expect(calls).toHaveLength(1);
    });
  });

  describe("xp utilities", () => {
    it("calculates xp for level", () => {
      const xp = levels.xpForLevel(5);
      expect(xp).toBeGreaterThan(0);
    });

    it("calculates xp progress", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, { xp: 50, level: 0 });
      const progress = await levels.xpProgress("u1", "g1");
      expect(progress).not.toBeNull();
      expect(progress!.progress).toBe(0.5);
      expect(progress!.percentage).toBe(50);
    });
  });
});
