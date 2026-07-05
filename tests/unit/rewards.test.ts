import { describe, it, expect, beforeEach } from "vitest";
import { MemoryAdapter } from "../../src/adapters/memory";
import { RewardManager } from "../../src/rewards";

describe("RewardManager", () => {
  let adapter: MemoryAdapter;
  let rewards: RewardManager;

  beforeEach(() => {
    adapter = new MemoryAdapter();
    rewards = new RewardManager(adapter);
  });

  it("adds and retrieves rewards", async () => {
    await rewards.addReward("g1", { level: 5, roleId: "r1", type: "role" });
    const list = await rewards.getRewards("g1");
    expect(list).toHaveLength(1);
    expect(list[0].roleId).toBe("r1");
  });

  it("removes rewards", async () => {
    await rewards.addReward("g1", { level: 5, roleId: "r1", type: "role" });
    await rewards.removeReward("g1", 5, "r1");
    const list = await rewards.getRewards("g1");
    expect(list).toHaveLength(0);
  });

  it("clears all rewards", async () => {
    await rewards.addReward("g1", { level: 5, roleId: "r1", type: "role" });
    await rewards.addReward("g1", { level: 10, roleId: "r2", type: "role" });
    await rewards.clearRewards("g1");
    const list = await rewards.getRewards("g1");
    expect(list).toHaveLength(0);
  });

  it("gets rewards for specific level", async () => {
    await rewards.addReward("g1", { level: 5, roleId: "r1", type: "role" });
    await rewards.addReward("g1", { level: 10, roleId: "r2", type: "role" });
    const list = await rewards.getRewards("g1");
    const level5 = rewards.getRewardsForLevel(list, 5);
    expect(level5).toHaveLength(1);
    expect(level5[0].roleId).toBe("r1");
  });

  it("processes level up rewards", async () => {
    await rewards.addReward("g1", { level: 5, roleId: "r1", type: "role" });
    const earned = await rewards.processLevelUpRewards("g1", 5);
    expect(earned).toHaveLength(1);
    expect(earned[0].roleId).toBe("r1");
  });
});
