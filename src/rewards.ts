import type { LevelsAdapter } from "./adapters/adapter";
import type { LevelReward } from "./types";

export class RewardManager {
  private readonly adapter: LevelsAdapter;

  constructor(adapter: LevelsAdapter) {
    this.adapter = adapter;
  }

  async getRewards(guild: string): Promise<LevelReward[]> {
    return this.adapter.getRewards(guild);
  }

  async addReward(guild: string, reward: LevelReward): Promise<void> {
    const rewards = await this.getRewards(guild);
    const existing = rewards.findIndex((r) => r.level === reward.level && r.roleId === reward.roleId);
    if (existing >= 0) {
      rewards[existing] = reward;
    } else {
      rewards.push(reward);
    }
    await this.adapter.setRewards(guild, rewards);
  }

  async removeReward(guild: string, level: number, roleId: string): Promise<void> {
    const rewards = await this.getRewards(guild);
    const filtered = rewards.filter(
      (r) => !(r.level === level && r.roleId === roleId)
    );
    await this.adapter.setRewards(guild, filtered);
  }

  async clearRewards(guild: string): Promise<void> {
    await this.adapter.setRewards(guild, []);
  }

  getRewardsForLevel(rewards: LevelReward[], level: number): LevelReward[] {
    return rewards.filter((r) => r.level === level);
  }

  async processLevelUpRewards(guild: string, newLevel: number): Promise<LevelReward[]> {
    const allRewards = await this.getRewards(guild);
    return this.getRewardsForLevel(allRewards, newLevel);
  }
}
