import type { LevelsAdapter } from "./adapter";
import type { UserKey, LevelRecord, LeaderboardEntry } from "../types";

export class RedisAdapter implements LevelsAdapter {
  private readonly redis: any;
  private readonly prefix: string;

  constructor(redisClient: any, prefix?: string) {
    this.redis = redisClient;
    this.prefix = prefix ?? "zeew:levels:";
  }

  private key(user: string, guild: string): string {
    return `${this.prefix}${guild}:${user}`;
  }

  private leaderboardKey(guild: string): string {
    return `${this.prefix}lb:${guild}`;
  }

  private guildUsersKey(guild: string): string {
    return `${this.prefix}guild:${guild}`;
  }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const data = await this.redis.hgetall(this.key(key.user, key.guild));
    if (!data || Object.keys(data).length === 0) return null;
    return {
      user: key.user,
      guild: key.guild,
      xp: parseInt(data.xp, 10),
      level: parseInt(data.level, 10),
    };
  }

  async upsertUser(key: UserKey, xp: number, level: number): Promise<void> {
    const k = this.key(key.user, key.guild);
    const pipeline = this.redis.pipeline();
    pipeline.hset(k, { xp: String(xp), level: String(level) });
    pipeline.zadd(this.leaderboardKey(key.guild), level, `${key.user}:${key.guild}`);
    pipeline.sadd(this.guildUsersKey(key.guild), `${key.user}:${key.guild}`);
    await pipeline.exec();
  }

  async deleteUser(key: UserKey): Promise<void> {
    const k = this.key(key.user, key.guild);
    const pipeline = this.redis.pipeline();
    pipeline.del(k);
    pipeline.zrem(this.leaderboardKey(key.guild), `${key.user}:${key.guild}`);
    pipeline.srem(this.guildUsersKey(key.guild), `${key.user}:${key.guild}`);
    await pipeline.exec();
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    const entries = await this.redis.zrevrange(
      this.leaderboardKey(guild),
      0,
      limit - 1,
      "WITHSCORES"
    );

    const result: LeaderboardEntry[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      const [user, guildId] = entries[i].split(":");
      result.push({
        user,
        guild: guildId,
        xp: 0,
        level: parseInt(entries[i + 1], 10),
      });
    }

    // Fetch xp for each entry
    for (const entry of result) {
      const data = await this.redis.hget(this.key(entry.user, entry.guild), "xp");
      entry.xp = data ? parseInt(data, 10) : 0;
    }

    return result;
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    const members = await this.redis.smembers(this.guildUsersKey(guild));
    const result: LevelRecord[] = [];

    for (const member of members) {
      const [user, guildId] = member.split(":");
      const data = await this.redis.hgetall(this.key(user, guildId));
      if (data && Object.keys(data).length > 0) {
        result.push({
          user,
          guild: guildId,
          xp: parseInt(data.xp, 10),
          level: parseInt(data.level, 10),
        });
      }
    }

    return result;
  }

  async deleteAll(guild: string): Promise<void> {
    const members = await this.redis.smembers(this.guildUsersKey(guild));
    const pipeline = this.redis.pipeline();

    for (const member of members) {
      const [user, guildId] = member.split(":");
      pipeline.del(this.key(user, guildId));
    }
    pipeline.del(this.leaderboardKey(guild));
    pipeline.del(this.guildUsersKey(guild));

    await pipeline.exec();
  }
}
