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

export class RedisAdapter implements LevelsAdapter {
  private readonly redis: any;
  private readonly prefix: string;

  constructor(redisClient: any, prefix?: string) {
    this.redis = redisClient;
    this.prefix = prefix ?? "zeew:levels:";
  }

  private k(user: string, guild: string): string { return `${this.prefix}${guild}:${user}`; }
  private lbKey(guild: string): string { return `${this.prefix}lb:${guild}`; }
  private guildKey(guild: string): string { return `${this.prefix}guild:${guild}`; }
  private cdKey(user: string, guild: string, action: string): string { return `${this.prefix}cd:${guild}:${user}:${action}`; }
  private rwKey(guild: string): string { return `${this.prefix}rw:${guild}`; }
  private prKey(user: string, guild: string): string { return `${this.prefix}pr:${guild}:${user}`; }
  private gcKey(guild: string): string { return `${this.prefix}gc:${guild}`; }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const data = await this.redis.hgetall(this.k(key.user, key.guild));
    if (!data || Object.keys(data).length === 0) return null;
    return {
      user: key.user, guild: key.guild,
      xp: parseInt(data.xp ?? "0"), level: parseInt(data.level ?? "0"),
      totalXp: parseInt(data.totalXp ?? "0"), prestige: parseInt(data.prestige ?? "0"),
      messages: parseInt(data.messages ?? "0"), lastXpAt: parseInt(data.lastXpAt ?? "0"),
    };
  }

  async upsertUser(key: UserKey, data: Partial<Pick<LevelRecord, "xp" | "level" | "totalXp" | "prestige" | "messages" | "lastXpAt">>): Promise<void> {
    const existing = await this.findUser(key);
    const merged = { ...existing, ...data, user: key.user, guild: key.guild };
    const k = this.k(key.user, key.guild);
    const pipeline = this.redis.pipeline();
    pipeline.hset(k, {
      xp: String(merged.xp ?? 0), level: String(merged.level ?? 0),
      totalXp: String(merged.totalXp ?? 0), prestige: String(merged.prestige ?? 0),
      messages: String(merged.messages ?? 0), lastXpAt: String(merged.lastXpAt ?? 0),
    });
    pipeline.zadd(this.lbKey(key.guild), merged.level ?? 0, `${key.user}:${key.guild}`);
    pipeline.sadd(this.guildKey(key.guild), `${key.user}:${key.guild}`);
    await pipeline.exec();
  }

  async deleteUser(key: UserKey): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(this.k(key.user, key.guild));
    pipeline.zrem(this.lbKey(key.guild), `${key.user}:${key.guild}`);
    pipeline.srem(this.guildKey(key.guild), `${key.user}:${key.guild}`);
    await pipeline.exec();
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    const entries = await this.redis.zrevrange(this.lbKey(guild), 0, limit - 1, "WITHSCORES");
    const result: LeaderboardEntry[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      const [user, guildId] = entries[i].split(":");
      const data = await this.redis.hgetall(this.k(user, guildId));
      result.push({
        user, guild: guildId,
        xp: parseInt(data?.xp ?? "0"), level: parseInt(entries[i + 1]),
        totalXp: parseInt(data?.totalXp ?? "0"), prestige: parseInt(data?.prestige ?? "0"),
      });
    }
    return result;
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    const members = await this.redis.smembers(this.guildKey(guild));
    const result: LevelRecord[] = [];
    for (const member of members) {
      const [user, guildId] = member.split(":");
      const data = await this.redis.hgetall(this.k(user, guildId));
      if (data && Object.keys(data).length > 0) {
        result.push({
          user, guild: guildId,
          xp: parseInt(data.xp ?? "0"), level: parseInt(data.level ?? "0"),
          totalXp: parseInt(data.totalXp ?? "0"), prestige: parseInt(data.prestige ?? "0"),
          messages: parseInt(data.messages ?? "0"), lastXpAt: parseInt(data.lastXpAt ?? "0"),
        });
      }
    }
    return result;
  }

  async deleteAll(guild: string): Promise<void> {
    const members = await this.redis.smembers(this.guildKey(guild));
    const pipeline = this.redis.pipeline();
    for (const member of members) {
      const [user, guildId] = member.split(":");
      pipeline.del(this.k(user, guildId));
    }
    pipeline.del(this.lbKey(guild));
    pipeline.del(this.guildKey(guild));
    await pipeline.exec();
  }

  async getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null> {
    const val = await this.redis.get(this.cdKey(key.user, key.guild, action));
    if (!val) return null;
    return { user: key.user, guild: key.guild, action, expiresAt: parseInt(val) };
  }

  async setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void> {
    const ttl = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    await this.redis.setex(this.cdKey(key.user, key.guild, action), ttl, String(expiresAt));
  }

  async deleteCooldown(key: UserKey, action: string): Promise<void> {
    await this.redis.del(this.cdKey(key.user, key.guild, action));
  }

  async getRewards(guild: string): Promise<LevelReward[]> {
    const data = await this.redis.get(this.rwKey(guild));
    return data ? JSON.parse(data) : [];
  }

  async setRewards(guild: string, rewards: LevelReward[]): Promise<void> {
    await this.redis.set(this.rwKey(guild), JSON.stringify(rewards));
  }

  async getPrestige(key: UserKey): Promise<PrestigeEntry | null> {
    const data = await this.redis.hgetall(this.prKey(key.user, key.guild));
    if (!data || Object.keys(data).length === 0) return null;
    return { user: key.user, guild: key.guild, prestige: parseInt(data.prestige ?? "0"), totalPrestiges: parseInt(data.totalPrestiges ?? "0") };
  }

  async setPrestige(key: UserKey, prestige: number): Promise<void> {
    const existing = await this.getPrestige(key);
    await this.redis.hset(this.prKey(key.user, key.guild), {
      prestige: String(prestige), totalPrestiges: String((existing?.totalPrestiges ?? 0) + 1),
    });
  }

  async getMultipliers(guild: string): Promise<GuildMultipliers | null> {
    const data = await this.redis.get(this.gcKey(guild));
    return data ? JSON.parse(data) : null;
  }

  async setMultipliers(guild: string, config: GuildMultipliers): Promise<void> {
    await this.redis.set(this.gcKey(guild), JSON.stringify(config));
  }

  async getGuildStats(guild: string): Promise<{ totalUsers: number; totalXp: number; totalMessages: number }> {
    const members = await this.redis.smembers(this.guildKey(guild));
    let totalXp = 0;
    let totalMessages = 0;
    for (const member of members) {
      const [user, guildId] = member.split(":");
      const data = await this.redis.hgetall(this.k(user, guildId));
      if (data) {
        totalXp += parseInt(data.totalXp ?? "0");
        totalMessages += parseInt(data.messages ?? "0");
      }
    }
    return { totalUsers: members.length, totalXp, totalMessages };
  }
}
