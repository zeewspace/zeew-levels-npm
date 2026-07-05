import type { LevelsAdapter } from "./adapters/adapter";
import type { UserKey, LevelRecord, UserStats, GuildStats, LeaderboardEntry } from "./types";

export class StatsCalculator {
  private readonly adapter: LevelsAdapter;

  constructor(adapter: LevelsAdapter) {
    this.adapter = adapter;
  }

  async getUserStats(key: UserKey, xpForNextLevel: (level: number) => number): Promise<UserStats | null> {
    const record = await this.adapter.findUser(key);
    if (!record) return null;

    const leaderboard = await this.adapter.getLeaderboard(key.guild, 1000);
    const rank = leaderboard.findIndex(
      (e) => e.user === key.user && e.guild === key.guild
    ) + 1;

    const threshold = xpForNextLevel(record.level);
    const progress = record.xp / threshold;
    const percentage = Math.round(progress * 100);

    return {
      ...record,
      rank: rank || leaderboard.length + 1,
      xpForNextLevel: threshold,
      xpProgress: progress,
      xpPercentage: percentage,
      messagesToNextLevel: Math.ceil((threshold - record.xp) / 3),
    };
  }

  async getGuildStats(guild: string): Promise<GuildStats> {
    const allUsers = await this.adapter.allUsers(guild);
    const totalUsers = allUsers.length;
    const totalXp = allUsers.reduce((sum, u) => sum + u.totalXp, 0);
    const totalMessages = allUsers.reduce((sum, u) => sum + u.messages, 0);
    const averageLevel = totalUsers > 0
      ? allUsers.reduce((sum, u) => sum + u.level, 0) / totalUsers
      : 0;
    const highestLevel = allUsers.reduce((max, u) => Math.max(max, u.level), 0);

    return {
      guild,
      totalUsers,
      totalXp,
      averageLevel: Math.round(averageLevel * 10) / 10,
      highestLevel,
      totalMessages,
    };
  }

  async getTopUsers(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    return this.adapter.getLeaderboard(guild, limit);
  }
}
