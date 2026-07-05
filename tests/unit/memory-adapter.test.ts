import { describe, it, expect, beforeEach } from "vitest";
import { MemoryAdapter } from "../../src/adapters/memory";

describe("MemoryAdapter", () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter();
  });

  describe("findUser", () => {
    it("returns null for non-existent user", async () => {
      const result = await adapter.findUser({ user: "u1", guild: "g1" });
      expect(result).toBeNull();
    });

    it("returns user after upsert", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 10, 2);
      const result = await adapter.findUser({ user: "u1", guild: "g1" });

      expect(result).toEqual({ user: "u1", guild: "g1", xp: 10, level: 2 });
    });

    it("returns a copy, not a reference", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 10, 2);
      const result1 = await adapter.findUser({ user: "u1", guild: "g1" });
      const result2 = await adapter.findUser({ user: "u1", guild: "g1" });

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe("upsertUser", () => {
    it("creates a new user", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 5, 1);
      const user = await adapter.findUser({ user: "u1", guild: "g1" });

      expect(user!.xp).toBe(5);
      expect(user!.level).toBe(1);
    });

    it("updates existing user", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 5, 1);
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 15, 3);

      const user = await adapter.findUser({ user: "u1", guild: "g1" });
      expect(user!.xp).toBe(15);
      expect(user!.level).toBe(3);
    });
  });

  describe("deleteUser", () => {
    it("removes user", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 5, 1);
      await adapter.deleteUser({ user: "u1", guild: "g1" });

      expect(await adapter.findUser({ user: "u1", guild: "g1" })).toBeNull();
    });

    it("does not affect other users", async () => {
      await adapter.upsertUser({ user: "u1", guild: "g1" }, 5, 1);
      await adapter.upsertUser({ user: "u2", guild: "g1" }, 10, 2);
      await adapter.deleteUser({ user: "u1", guild: "g1" });

      expect(await adapter.findUser({ user: "u2", guild: "g1" })).not.toBeNull();
    });
  });

  describe("getLeaderboard", () => {
    it("returns users sorted by level then xp", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, 10, 1);
      await adapter.upsertUser({ user: "b", guild: "g1" }, 50, 3);
      await adapter.upsertUser({ user: "c", guild: "g1" }, 30, 3);

      const lb = await adapter.getLeaderboard("g1", 10);

      expect(lb).toHaveLength(3);
      expect(lb[0].user).toBe("b");
      expect(lb[1].user).toBe("c");
      expect(lb[2].user).toBe("a");
    });

    it("filters by guild", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, 10, 5);
      await adapter.upsertUser({ user: "b", guild: "g2" }, 10, 10);

      const lb = await adapter.getLeaderboard("g1", 10);
      expect(lb).toHaveLength(1);
      expect(lb[0].user).toBe("a");
    });

    it("respects limit", async () => {
      for (let i = 0; i < 20; i++) {
        await adapter.upsertUser({ user: `u${i}`, guild: "g1" }, i, i);
      }

      const lb = await adapter.getLeaderboard("g1", 5);
      expect(lb).toHaveLength(5);
    });
  });

  describe("allUsers", () => {
    it("returns all users in guild", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, 10, 1);
      await adapter.upsertUser({ user: "b", guild: "g1" }, 20, 2);
      await adapter.upsertUser({ user: "c", guild: "g2" }, 30, 3);

      const users = await adapter.allUsers("g1");
      expect(users).toHaveLength(2);
    });
  });

  describe("deleteAll", () => {
    it("removes all users in guild", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, 10, 1);
      await adapter.upsertUser({ user: "b", guild: "g1" }, 20, 2);
      await adapter.upsertUser({ user: "c", guild: "g2" }, 30, 3);

      await adapter.deleteAll("g1");

      expect(await adapter.allUsers("g1")).toHaveLength(0);
      expect(await adapter.findUser({ user: "c", guild: "g2" })).not.toBeNull();
    });
  });

  describe("reset", () => {
    it("clears all data", async () => {
      await adapter.upsertUser({ user: "a", guild: "g1" }, 10, 1);
      await adapter.upsertUser({ user: "b", guild: "g2" }, 20, 2);

      adapter.reset();

      expect(await adapter.findUser({ user: "a", guild: "g1" })).toBeNull();
      expect(await adapter.findUser({ user: "b", guild: "g2" })).toBeNull();
    });
  });
});
