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

export class MongoAdapter implements LevelsAdapter {
  private readonly db: any;
  private readonly levels: any;
  private readonly cooldowns: any;
  private readonly rewards: any;
  private readonly prestige: any;
  private readonly guildConfig: any;

  constructor(uriOrDb: any, dbName?: string) {
    let mongodb: any;
    try {
      mongodb = require("mongodb");
    } catch {
      throw new Error("Failed to load mongodb. Install it: npm install mongodb");
    }

    if (uriOrDb?.collection) {
      this.db = uriOrDb;
    } else {
      const client = new mongodb.MongoClient(uriOrDb);
      this.db = client.db(dbName ?? "zeew-levels");
    }

    this.levels = this.db.collection("levels");
    this.cooldowns = this.db.collection("cooldowns");
    this.rewards = this.db.collection("rewards");
    this.prestige = this.db.collection("prestige");
    this.guildConfig = this.db.collection("guild_config");
  }

  async init(): Promise<void> {
    await this.levels.createIndex({ user: 1, guild: 1 }, { unique: true });
    await this.levels.createIndex({ guild: 1, level: -1, xp: -1 });
    await this.cooldowns.createIndex({ user: 1, guild: 1, action: 1 }, { unique: true });
    await this.cooldowns.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await this.rewards.createIndex({ guild: 1, level: 1 });
    await this.prestige.createIndex({ user: 1, guild: 1 }, { unique: true });
    await this.guildConfig.createIndex({ guild: 1 }, { unique: true });
  }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const doc = await this.levels.findOne({ user: key.user, guild: key.guild });
    if (!doc) return null;
    return {
      user: doc.user, guild: doc.guild,
      xp: doc.xp, level: doc.level, totalXp: doc.totalXp,
      prestige: doc.prestige, messages: doc.messages, lastXpAt: doc.lastXpAt,
    };
  }

  async upsertUser(key: UserKey, data: Partial<Pick<LevelRecord, "xp" | "level" | "totalXp" | "prestige" | "messages" | "lastXpAt">>): Promise<void> {
    await this.levels.updateOne(
      { user: key.user, guild: key.guild },
      { $set: data },
      { upsert: true }
    );
  }

  async deleteUser(key: UserKey): Promise<void> {
    await this.levels.deleteOne({ user: key.user, guild: key.guild });
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    const docs = await this.levels.find({ guild }).sort({ level: -1, xp: -1 }).limit(limit).toArray();
    return docs.map((d: any) => ({
      user: d.user, guild: d.guild, xp: d.xp, level: d.level, totalXp: d.totalXp, prestige: d.prestige,
    }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    const docs = await this.levels.find({ guild }).toArray();
    return docs.map((d: any) => ({
      user: d.user, guild: d.guild, xp: d.xp, level: d.level, totalXp: d.totalXp,
      prestige: d.prestige, messages: d.messages, lastXpAt: d.lastXpAt,
    }));
  }

  async deleteAll(guild: string): Promise<void> {
    await this.levels.deleteMany({ guild });
  }

  async getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null> {
    const doc = await this.cooldowns.findOne({ user: key.user, guild: key.guild, action });
    if (!doc) return null;
    return { user: doc.user, guild: doc.guild, action: doc.action, expiresAt: doc.expiresAt };
  }

  async setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void> {
    await this.cooldowns.updateOne(
      { user: key.user, guild: key.guild, action },
      { $set: { expiresAt } },
      { upsert: true }
    );
  }

  async deleteCooldown(key: UserKey, action: string): Promise<void> {
    await this.cooldowns.deleteOne({ user: key.user, guild: key.guild, action });
  }

  async getRewards(guild: string): Promise<LevelReward[]> {
    const docs = await this.rewards.find({ guild }).toArray();
    return docs.map((d: any) => ({ level: d.level, roleId: d.roleId, type: d.type, amount: d.amount }));
  }

  async setRewards(guild: string, rewards: LevelReward[]): Promise<void> {
    await this.rewards.deleteMany({ guild });
    if (rewards.length > 0) {
      await this.rewards.insertMany(rewards.map((r) => ({ ...r, guild })));
    }
  }

  async getPrestige(key: UserKey): Promise<PrestigeEntry | null> {
    const doc = await this.prestige.findOne({ user: key.user, guild: key.guild });
    if (!doc) return null;
    return { user: doc.user, guild: doc.guild, prestige: doc.prestige, totalPrestiges: doc.totalPrestiges };
  }

  async setPrestige(key: UserKey, prestige: number): Promise<void> {
    const existing = await this.getPrestige(key);
    await this.prestige.updateOne(
      { user: key.user, guild: key.guild },
      { $set: { prestige, totalPrestiges: (existing?.totalPrestiges ?? 0) + 1 } },
      { upsert: true }
    );
  }

  async getMultipliers(guild: string): Promise<GuildMultipliers | null> {
    const doc = await this.guildConfig.findOne({ guild });
    return doc?.config ?? null;
  }

  async setMultipliers(guild: string, config: GuildMultipliers): Promise<void> {
    await this.guildConfig.updateOne(
      { guild },
      { $set: { config } },
      { upsert: true }
    );
  }

  async getGuildStats(guild: string): Promise<{ totalUsers: number; totalXp: number; totalMessages: number }> {
    const result = await this.levels.aggregate([
      { $match: { guild } },
      { $group: { _id: null, totalUsers: { $sum: 1 }, totalXp: { $sum: "$totalXp" }, totalMessages: { $sum: "$messages" } } },
    ]).toArray();
    if (result.length === 0) return { totalUsers: 0, totalXp: 0, totalMessages: 0 };
    return { totalUsers: result[0].totalUsers, totalXp: result[0].totalXp, totalMessages: result[0].totalMessages };
  }

  async close(): Promise<void> {
    if (this.db.client) await this.db.client.close();
  }
}
