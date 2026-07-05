import * as fs from "fs";
import * as path from "path";
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

interface JsonDB {
  users: LevelRecord[];
  cooldowns: CooldownEntry[];
  rewards: Record<string, LevelReward[]>;
  prestige: Record<string, PrestigeEntry>;
  multipliers: Record<string, GuildMultipliers>;
}

export class JsonAdapter implements LevelsAdapter {
  private readonly filePath: string;
  private db: JsonDB;

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.resolve(process.cwd(), "zeew-levels.json");
    this.db = this.load();
  }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const found = this.db.users.find(
      (u) => u.user === key.user && u.guild === key.guild
    );
    return found ? { ...found } : null;
  }

  async upsertUser(key: UserKey, data: Partial<Pick<LevelRecord, "xp" | "level" | "totalXp" | "prestige" | "messages" | "lastXpAt">>): Promise<void> {
    const idx = this.db.users.findIndex(
      (u) => u.user === key.user && u.guild === key.guild
    );
    if (idx >= 0) {
      this.db.users[idx] = { ...this.db.users[idx], ...data };
    } else {
      this.db.users.push({
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
    this.flush();
  }

  async deleteUser(key: UserKey): Promise<void> {
    this.db.users = this.db.users.filter(
      (u) => !(u.user === key.user && u.guild === key.guild)
    );
    this.flush();
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    return this.db.users
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
    return this.db.users
      .filter((u) => u.guild === guild)
      .map((u) => ({ ...u }));
  }

  async deleteAll(guild: string): Promise<void> {
    this.db.users = this.db.users.filter((u) => u.guild !== guild);
    this.flush();
  }

  async getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null> {
    const found = this.db.cooldowns.find(
      (c) => c.user === key.user && c.guild === key.guild && c.action === action
    );
    return found ? { ...found } : null;
  }

  async setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void> {
    await this.deleteCooldown(key, action);
    this.db.cooldowns.push({ ...key, action, expiresAt });
    this.flush();
  }

  async deleteCooldown(key: UserKey, action: string): Promise<void> {
    this.db.cooldowns = this.db.cooldowns.filter(
      (c) => !(c.user === key.user && c.guild === key.guild && c.action === action)
    );
    this.flush();
  }

  async getRewards(guild: string): Promise<LevelReward[]> {
    return this.db.rewards[guild] ?? [];
  }

  async setRewards(guild: string, rewards: LevelReward[]): Promise<void> {
    this.db.rewards[guild] = rewards;
    this.flush();
  }

  async getPrestige(key: UserKey): Promise<PrestigeEntry | null> {
    const k = `${key.guild}:${key.user}`;
    return this.db.prestige[k] ?? null;
  }

  async setPrestige(key: UserKey, prestige: number): Promise<void> {
    const k = `${key.guild}:${key.user}`;
    const existing = this.db.prestige[k];
    this.db.prestige[k] = {
      ...key,
      prestige,
      totalPrestiges: (existing?.totalPrestiges ?? 0) + 1,
    };
    this.flush();
  }

  async getMultipliers(guild: string): Promise<GuildMultipliers | null> {
    return this.db.multipliers[guild] ?? null;
  }

  async setMultipliers(guild: string, config: GuildMultipliers): Promise<void> {
    this.db.multipliers[guild] = config;
    this.flush();
  }

  async getGuildStats(guild: string): Promise<{
    totalUsers: number;
    totalXp: number;
    totalMessages: number;
  }> {
    const guildUsers = this.db.users.filter((u) => u.guild === guild);
    return {
      totalUsers: guildUsers.length,
      totalXp: guildUsers.reduce((sum, u) => sum + u.totalXp, 0),
      totalMessages: guildUsers.reduce((sum, u) => sum + u.messages, 0),
    };
  }

  private load(): JsonDB {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<JsonDB>;
      return {
        users: parsed.users ?? [],
        cooldowns: parsed.cooldowns ?? [],
        rewards: parsed.rewards ?? {},
        prestige: parsed.prestige ?? {},
        multipliers: parsed.multipliers ?? {},
      };
    } catch {
      return { users: [], cooldowns: [], rewards: {}, prestige: {}, multipliers: {} };
    }
  }

  private flush(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.db, null, 2), "utf-8");
  }
}
