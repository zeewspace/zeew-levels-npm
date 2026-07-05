import type { LevelsAdapter } from "./adapter";
import type { UserKey, LevelRecord, LeaderboardEntry } from "../types";

export class MemoryAdapter implements LevelsAdapter {
  private users: LevelRecord[] = [];

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const found = this.users.find(
      (u) => u.user === key.user && u.guild === key.guild
    );
    return found ? { ...found } : null;
  }

  async upsertUser(key: UserKey, xp: number, level: number): Promise<void> {
    const idx = this.users.findIndex(
      (u) => u.user === key.user && u.guild === key.guild
    );
    const record: LevelRecord = { ...key, xp, level };
    if (idx >= 0) {
      this.users[idx] = record;
    } else {
      this.users.push(record);
    }
  }

  async deleteUser(key: UserKey): Promise<void> {
    this.users = this.users.filter(
      (u) => !(u.user === key.user && u.guild === key.guild)
    );
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    return this.users
      .filter((u) => u.guild === guild)
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, limit)
      .map((u) => ({ user: u.user, guild: u.guild, xp: u.xp, level: u.level }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    return this.users
      .filter((u) => u.guild === guild)
      .map((u) => ({ ...u }));
  }

  async deleteAll(guild: string): Promise<void> {
    this.users = this.users.filter((u) => u.guild !== guild);
  }

  reset(): void {
    this.users = [];
  }
}
