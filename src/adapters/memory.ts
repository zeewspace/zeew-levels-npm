import type { LevelsAdapter } from "./adapter";
import type {
  UserKey,
  LevelRecord,
  LeaderboardEntry,
  CooldownEntry,
  LevelReward,
  PrestigeEntry,
  GuildMultipliers,
} from "../types";

export class MemoryAdapter implements LevelsAdapter {
  private users: LevelRecord[] = [];
  private cooldowns: CooldownEntry[] = [];
  private rewards = new Map<string, LevelReward[]>();
  private prestige = new Map<string, PrestigeEntry>();
  private multipliers = new Map<string, GuildMultipliers>();

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const found = this.users.find(
      (u) => u.user === key.user && u.guild === key.guild
    );
    return found ? { ...found } : null;
  }

  async upsertUser(key: UserKey, data: Partial<Pick<LevelRecord, "xp" | "level" | "totalXp" | "prestige" | "messages" | "lastXpAt">>): Promise<void> {
    const idx = this.users.findIndex(
      (u) => u.user === key.user && u.guild === key.guild
    );
    if (idx >= 0) {
      this.users[idx] = { ...this.users[idx], ...data };
    } else {
      this.users.push({
        user: key.user,
        guild: key.guild,
        xp: data.xp ?? 0,
        level: data.level ?? 0,
        totalXp: data.totalXp ?? 0,
        prestige: data.prestige ?? 0,
        messages: data.messages ?? 0,
        lastXpAt: data.lastXpAt ?? 0,
      });
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
      .map((u) => ({
        user: u.user,
        guild: u.guild,
        xp: u.xp,
        level: u.level,
        totalXp: u.totalXp,
        prestige: u.prestige,
      }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    return this.users
      .filter((u) => u.guild === guild)
      .map((u) => ({ ...u }));
  }

  async deleteAll(guild: string): Promise<void> {
    this.users = this.users.filter((u) => u.guild !== guild);
  }

  // ─── Cooldowns ─────────────────────────────────────

  async getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null> {
    const found = this.cooldowns.find(
      (c) => c.user === key.user && c.guild === key.guild && c.action === action
    );
    return found ? { ...found } : null;
  }

  async setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void> {
    await this.deleteCooldown(key, action);
    this.cooldowns.push({ ...key, action, expiresAt });
  }

  async deleteCooldown(key: UserKey, action: string): Promise<void> {
    this.cooldowns = this.cooldowns.filter(
      (c) => !(c.user === key.user && c.guild === key.guild && c.action === action)
    );
  }

  // ─── Rewards ───────────────────────────────────────

  async getRewards(guild: string): Promise<LevelReward[]> {
    return this.rewards.get(guild) ?? [];
  }

  async setRewards(guild: string, rewards: LevelReward[]): Promise<void> {
    this.rewards.set(guild, rewards);
  }

  // ─── Prestige ──────────────────────────────────────

  async getPrestige(key: UserKey): Promise<PrestigeEntry | null> {
    const k = `${key.guild}:${key.user}`;
    return this.prestige.get(k) ?? null;
  }

  async setPrestige(key: UserKey, prestige: number): Promise<void> {
    const k = `${key.guild}:${key.user}`;
    const existing = this.prestige.get(k);
    this.prestige.set(k, {
      ...key,
      prestige,
      totalPrestiges: (existing?.totalPrestiges ?? 0) + 1,
    });
  }

  // ─── Multipliers ───────────────────────────────────

  async getMultipliers(guild: string): Promise<GuildMultipliers | null> {
    return this.multipliers.get(guild) ?? null;
  }

  async setMultipliers(guild: string, config: GuildMultipliers): Promise<void> {
    this.multipliers.set(guild, config);
  }

  // ─── Stats ─────────────────────────────────────────

  async getGuildStats(guild: string): Promise<{
    totalUsers: number;
    totalXp: number;
    totalMessages: number;
  }> {
    const guildUsers = this.users.filter((u) => u.guild === guild);
    return {
      totalUsers: guildUsers.length,
      totalXp: guildUsers.reduce((sum, u) => sum + u.totalXp, 0),
      totalMessages: guildUsers.reduce((sum, u) => sum + u.messages, 0),
    };
  }

  reset(): void {
    this.users = [];
    this.cooldowns = [];
    this.rewards.clear();
    this.prestige.clear();
    this.multipliers.clear();
  }
}
