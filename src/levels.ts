import type { LevelsAdapter } from "./adapters/adapter";
import type {
  UserKey,
  LevelRecord,
  LeaderboardEntry,
  LevelsOptions,
  LevelsHooks,
  MessageResult,
  LevelUpResult,
  XpGainResult,
} from "./types";

export class ZeewLevels {
  private readonly adapter: LevelsAdapter;
  private readonly xpMin: number;
  private readonly xpMax: number;
  private readonly threshold: number;
  private readonly logger?: LevelsOptions["logger"];

  onLevelUp?: LevelsHooks["onLevelUp"];
  onXpGain?: LevelsHooks["onXpGain"];

  constructor(adapter: LevelsAdapter, options?: LevelsOptions) {
    this.adapter = adapter;
    this.xpMin = options?.xpPerMessage?.min ?? 1;
    this.xpMax = options?.xpPerMessage?.max ?? 5;
    this.threshold = options?.levelUpThreshold ?? 1000;
    this.logger = options?.logger;
  }

  async init(): Promise<void> {
    if (this.adapter.init) {
      await this.adapter.init();
    }
  }

  async processMessage(user: string, guild: string): Promise<MessageResult> {
    const key: UserKey = { user, guild };
    const randomXp = this.randomXp();
    const record = await this.adapter.findUser(key);

    if (!record) {
      await this.adapter.upsertUser(key, randomXp, 0);
      this.logger?.debug(`[zeew-levels] New user ${user} in ${guild} with ${randomXp} xp`);
      const result: XpGainResult = { type: "xp_gain", xp: randomXp, totalXp: randomXp };
      this.onXpGain?.(user, guild, randomXp);
      return result;
    }

    const newTotalXp = record.xp + randomXp;

    if (newTotalXp >= this.threshold) {
      const newLevel = record.level + 1;
      const leftoverXp = newTotalXp - this.threshold;
      await this.adapter.upsertUser(key, leftoverXp, newLevel);
      this.logger?.debug(`[zeew-levels] ${user} leveled up to ${newLevel} in ${guild}`);
      const result: LevelUpResult = { type: "level_up", newLevel, xp: leftoverXp };
      this.onLevelUp?.(user, guild, newLevel);
      this.onXpGain?.(user, guild, randomXp);
      return result;
    }

    await this.adapter.upsertUser(key, newTotalXp, record.level);
    this.logger?.debug(`[zeew-levels] ${user} gained ${randomXp} xp in ${guild} (total: ${newTotalXp})`);
    const result: XpGainResult = { type: "xp_gain", xp: randomXp, totalXp: newTotalXp };
    this.onXpGain?.(user, guild, randomXp);
    return result;
  }

  async addXp(user: string, guild: string, amount: number): Promise<MessageResult> {
    const key: UserKey = { user, guild };
    const record = await this.adapter.findUser(key);

    if (!record) {
      await this.adapter.upsertUser(key, amount, 0);
      const result: XpGainResult = { type: "xp_gain", xp: amount, totalXp: amount };
      this.onXpGain?.(user, guild, amount);
      return result;
    }

    const newTotalXp = record.xp + amount;

    if (newTotalXp >= this.threshold) {
      const newLevel = record.level + 1;
      const leftoverXp = newTotalXp - this.threshold;
      await this.adapter.upsertUser(key, leftoverXp, newLevel);
      const result: LevelUpResult = { type: "level_up", newLevel, xp: leftoverXp };
      this.onLevelUp?.(user, guild, newLevel);
      this.onXpGain?.(user, guild, amount);
      return result;
    }

    await this.adapter.upsertUser(key, newTotalXp, record.level);
    const result: XpGainResult = { type: "xp_gain", xp: amount, totalXp: newTotalXp };
    this.onXpGain?.(user, guild, amount);
    return result;
  }

  async getLevel(user: string, guild: string): Promise<number | null> {
    const record = await this.adapter.findUser({ user, guild });
    return record?.level ?? null;
  }

  async getXp(user: string, guild: string): Promise<number | null> {
    const record = await this.adapter.findUser({ user, guild });
    return record?.xp ?? null;
  }

  async getUser(user: string, guild: string): Promise<LevelRecord | null> {
    return this.adapter.findUser({ user, guild });
  }

  async getLeaderboard(guild: string, limit?: number): Promise<LeaderboardEntry[]> {
    return this.adapter.getLeaderboard(guild, limit ?? 10);
  }

  async setLevel(user: string, guild: string, level: number): Promise<void> {
    const key: UserKey = { user, guild };
    const record = await this.adapter.findUser(key);
    const xp = record?.xp ?? 0;
    await this.adapter.upsertUser(key, xp, level);
  }

  async setXp(user: string, guild: string, xp: number): Promise<void> {
    const key: UserKey = { user, guild };
    const record = await this.adapter.findUser(key);
    const level = record?.level ?? 0;
    await this.adapter.upsertUser(key, xp, level);
  }

  async deleteUser(user: string, guild: string): Promise<void> {
    await this.adapter.deleteUser({ user, guild });
  }

  async deleteAll(guild: string): Promise<void> {
    await this.adapter.deleteAll(guild);
  }

  private randomXp(): number {
    return Math.floor(Math.random() * (this.xpMax - this.xpMin + 1)) + this.xpMin;
  }
}
