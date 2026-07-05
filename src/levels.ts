import type { LevelsAdapter } from "./adapters/adapter";
import type {
  UserKey,
  LevelRecord,
  LeaderboardEntry,
  LevelsOptions,
  LevelsHooks,
  ProcessResult,
  LevelUpResult,
  XpGainResult,
  PrestigeResult,
  LevelReward,
  UserStats,
  GuildStats,
  Multiplier,
} from "./types";
import { LruCache, userKey as cacheKey } from "./cache";
import { createXpCalculator, xpProgress, xpPercentage, messagesToNextLevel } from "./utils";
import { MultiplierManager } from "./multipliers";
import { CooldownManager } from "./cooldowns";
import { RewardManager } from "./rewards";
import { PrestigeManager } from "./prestige";
import { StatsCalculator } from "./stats";

export class ZeewLevels {
  private readonly adapter: LevelsAdapter;
  private readonly xpMin: number;
  private readonly xpMax: number;
  private readonly threshold: number;
  private readonly maxLevel: number;
  private readonly logger?: LevelsOptions["logger"];
  private readonly cache: LruCache<string, LevelRecord> | null;
  private readonly calcXpForLevel: (level: number) => number;

  readonly multipliers: MultiplierManager;
  readonly cooldowns: CooldownManager;
  readonly rewards: RewardManager;
  readonly prestige: PrestigeManager;
  readonly stats: StatsCalculator;

  onLevelUp?: LevelsHooks["onLevelUp"];
  onXpGain?: LevelsHooks["onXpGain"];
  onPrestige?: LevelsHooks["onPrestige"];
  onCooldown?: LevelsHooks["onCooldown"];

  constructor(adapter: LevelsAdapter, options?: LevelsOptions) {
    this.adapter = adapter;
    this.xpMin = options?.xpPerMessage?.min ?? 1;
    this.xpMax = options?.xpPerMessage?.max ?? 5;
    this.threshold = options?.levelUpThreshold ?? 1000;
    this.maxLevel = options?.maxLevel ?? 100;
    this.logger = options?.logger;

    // Cache
    if (options?.cache?.enabled) {
      this.cache = new LruCache(options.cache.maxSize ?? 1000, options.cache.ttl ?? 60_000);
    } else {
      this.cache = null;
    }

    // XP curve
    this.calcXpForLevel = options?.xpCurve
      ? createXpCalculator(options.xpCurve)
      : (level) => Math.floor(this.threshold + level * 50);

    // Sub-systems
    this.multipliers = new MultiplierManager(adapter);
    this.cooldowns = new CooldownManager(adapter, options?.cooldown);
    this.rewards = new RewardManager(adapter);
    this.prestige = new PrestigeManager(adapter, options?.prestige);
    this.stats = new StatsCalculator(adapter);
  }

  async init(): Promise<void> {
    if (this.adapter.init) {
      await this.adapter.init();
    }
  }

  // ─── Core Methods ───────────────────────────────────

  async processMessage(
    user: string,
    guild: string,
    userRoles?: string[]
  ): Promise<ProcessResult> {
    const key: UserKey = { user, guild };

    // Cooldown check
    const cooldown = await this.cooldowns.isOnCooldown(key, "message");
    if (cooldown.onCooldown) {
      this.onCooldown?.(user, guild, "message", cooldown.retryIn);
      return { type: "xp_gain", xp: 0, totalXp: 0, multiplied: false };
    }

    // Set cooldown
    await this.cooldowns.setCooldown(key, "message");

    // Get guild config for multipliers
    const guildConfig = await this.multipliers.getConfig(guild);
    const baseXp = this.randomXp(guildConfig.baseXp.min, guildConfig.baseXp.max);

    // Apply multipliers
    let finalXp = baseXp;
    let multiplied = false;
    if (userRoles && guildConfig.multipliers.length > 0) {
      const activeMultipliers = this.multipliers.getMultipliersForUser(userRoles, guildConfig.multipliers);
      if (activeMultipliers.length > 0) {
        finalXp = this.multipliers.calculateMultiplier(baseXp, activeMultipliers);
        multiplied = true;
      }
    }

    // Prestige bonus
    const prestigeEntry = await this.prestige.getPrestige(key);
    if (prestigeEntry.prestige > 0) {
      const bonus = this.prestige.getPrestigeBonus(prestigeEntry.prestige);
      finalXp = Math.floor(finalXp * (1 + bonus));
    }

    // Get or create user
    let record = this.cache?.get(cacheKey(user, guild)) ?? await this.adapter.findUser(key);

    if (!record) {
      record = {
        user,
        guild,
        xp: finalXp,
        level: 0,
        totalXp: finalXp,
        prestige: prestigeEntry.prestige,
        messages: 1,
        lastXpAt: Date.now(),
      };
      await this.adapter.upsertUser(key, record);
      this.cache?.set(cacheKey(user, guild), record);
      this.onXpGain?.(user, guild, finalXp, multiplied);
      return { type: "xp_gain", xp: finalXp, totalXp: finalXp, multiplied };
    }

    // Check max level
    if (record.level >= this.maxLevel) {
      this.onXpGain?.(user, guild, 0, false);
      return { type: "xp_gain", xp: 0, totalXp: record.xp, multiplied: false };
    }

    // Level up logic
    const threshold = this.calcXpForLevel(record.level);
    const newTotalXp = record.xp + finalXp;

    if (newTotalXp >= threshold) {
      const newLevel = Math.min(record.level + 1, this.maxLevel);
      const leftoverXp = newTotalXp - threshold;

      // Process rewards
      const rewards = await this.rewards.processLevelUpRewards(guild, newLevel);

      await this.adapter.upsertUser(key, {
        xp: leftoverXp,
        level: newLevel,
        totalXp: record.totalXp + finalXp,
        messages: record.messages + 1,
        lastXpAt: Date.now(),
      });

      this.cache?.set(cacheKey(user, guild), {
        ...record,
        xp: leftoverXp,
        level: newLevel,
        totalXp: record.totalXp + finalXp,
        messages: record.messages + 1,
        lastXpAt: Date.now(),
      });

      this.onLevelUp?.(user, guild, newLevel, rewards);
      this.onXpGain?.(user, guild, finalXp, multiplied);

      return { type: "level_up", newLevel, xp: leftoverXp, rewards };
    }

    // Normal XP gain
    await this.adapter.upsertUser(key, {
      xp: newTotalXp,
      totalXp: record.totalXp + finalXp,
      messages: record.messages + 1,
      lastXpAt: Date.now(),
    });

    this.cache?.set(cacheKey(user, guild), {
      ...record,
      xp: newTotalXp,
      totalXp: record.totalXp + finalXp,
      messages: record.messages + 1,
      lastXpAt: Date.now(),
    });

    this.onXpGain?.(user, guild, finalXp, multiplied);
    return { type: "xp_gain", xp: finalXp, totalXp: newTotalXp, multiplied };
  }

  async addXp(user: string, guild: string, amount: number): Promise<ProcessResult> {
    const key: UserKey = { user, guild };
    let record = this.cache?.get(cacheKey(user, guild)) ?? await this.adapter.findUser(key);

    if (!record) {
      await this.adapter.upsertUser(key, { xp: amount, level: 0, totalXp: amount, messages: 0, lastXpAt: Date.now() });
      const result: XpGainResult = { type: "xp_gain", xp: amount, totalXp: amount, multiplied: false };
      this.onXpGain?.(user, guild, amount, false);
      return result;
    }

    const threshold = this.calcXpForLevel(record.level);
    const newTotalXp = record.xp + amount;

    if (newTotalXp >= threshold) {
      const newLevel = Math.min(record.level + 1, this.maxLevel);
      const leftoverXp = newTotalXp - threshold;
      const rewards = await this.rewards.processLevelUpRewards(guild, newLevel);

      await this.adapter.upsertUser(key, {
        xp: leftoverXp,
        level: newLevel,
        totalXp: record.totalXp + amount,
      });

      this.cache?.delete(cacheKey(user, guild));
      this.onLevelUp?.(user, guild, newLevel, rewards);
      this.onXpGain?.(user, guild, amount, false);

      return { type: "level_up", newLevel, xp: leftoverXp, rewards };
    }

    await this.adapter.upsertUser(key, {
      xp: newTotalXp,
      totalXp: record.totalXp + amount,
    });

    this.cache?.delete(cacheKey(user, guild));
    this.onXpGain?.(user, guild, amount, false);

    return { type: "xp_gain", xp: amount, totalXp: newTotalXp, multiplied: false };
  }

  // ─── Prestige ──────────────────────────────────────

  async doPrestige(user: string, guild: string): Promise<PrestigeResult> {
    const key: UserKey = { user, guild };
    const record = await this.adapter.findUser(key);
    if (!record) {
      return { type: "prestige", newPrestige: 0, level: 0, xp: 0 };
    }

    const result = await this.prestige.doPrestige(key, record.level);
    if (!result.success) {
      return { type: "prestige", newPrestige: 0, level: record.level, xp: record.xp };
    }

    this.cache?.delete(cacheKey(user, guild));
    this.onPrestige?.(user, guild, result.newPrestige);

    return {
      type: "prestige",
      newPrestige: result.newPrestige,
      level: this.prestige.getResetLevel(),
      xp: 0,
    };
  }

  async canPrestige(user: string, guild: string): Promise<{ can: boolean; reason?: string }> {
    const key: UserKey = { user, guild };
    const record = await this.adapter.findUser(key);
    if (!record) return { can: false, reason: "User not found" };
    return this.prestige.canPrestige(key, record.level);
  }

  // ─── Getters ───────────────────────────────────────

  async getLevel(user: string, guild: string): Promise<number | null> {
    const cached = this.cache?.get(cacheKey(user, guild));
    if (cached) return cached.level;
    const record = await this.adapter.findUser({ user, guild });
    return record?.level ?? null;
  }

  async getXp(user: string, guild: string): Promise<number | null> {
    const cached = this.cache?.get(cacheKey(user, guild));
    if (cached) return cached.xp;
    const record = await this.adapter.findUser({ user, guild });
    return record?.xp ?? null;
  }

  async getUser(user: string, guild: string): Promise<LevelRecord | null> {
    const cached = this.cache?.get(cacheKey(user, guild));
    if (cached) return cached;
    const record = await this.adapter.findUser({ user, guild });
    if (record && this.cache) {
      this.cache.set(cacheKey(user, guild), record);
    }
    return record;
  }

  async getLeaderboard(guild: string, limit?: number): Promise<LeaderboardEntry[]> {
    return this.adapter.getLeaderboard(guild, limit ?? 10);
  }

  async getUserStats(user: string, guild: string): Promise<UserStats | null> {
    return this.stats.getUserStats({ user, guild }, this.calcXpForLevel);
  }

  async getGuildStats(guild: string): Promise<GuildStats> {
    return this.stats.getGuildStats(guild);
  }

  // ─── Setters ───────────────────────────────────────

  async setLevel(user: string, guild: string, level: number): Promise<void> {
    const key: UserKey = { user, guild };
    const record = await this.adapter.findUser(key);
    await this.adapter.upsertUser(key, { xp: record?.xp ?? 0, level });
    this.cache?.delete(cacheKey(user, guild));
  }

  async setXp(user: string, guild: string, xp: number): Promise<void> {
    const key: UserKey = { user, guild };
    const record = await this.adapter.findUser(key);
    await this.adapter.upsertUser(key, { xp, level: record?.level ?? 0 });
    this.cache?.delete(cacheKey(user, guild));
  }

  // ─── Delete ────────────────────────────────────────

  async deleteUser(user: string, guild: string): Promise<void> {
    await this.adapter.deleteUser({ user, guild });
    this.cache?.delete(cacheKey(user, guild));
  }

  async deleteAll(guild: string): Promise<void> {
    await this.adapter.deleteAll(guild);
    this.cache?.clear();
  }

  // ─── Rewards ───────────────────────────────────────

  async addReward(guild: string, reward: LevelReward): Promise<void> {
    await this.rewards.addReward(guild, reward);
  }

  async removeReward(guild: string, level: number, roleId: string): Promise<void> {
    await this.rewards.removeReward(guild, level, roleId);
  }

  async getRewards(guild: string): Promise<LevelReward[]> {
    return this.rewards.getRewards(guild);
  }

  // ─── Multipliers ───────────────────────────────────

  async addMultiplier(guild: string, multiplier: Multiplier): Promise<void> {
    await this.multipliers.addMultiplier(guild, multiplier);
  }

  async removeMultiplier(guild: string, multiplierId: string): Promise<void> {
    await this.multipliers.removeMultiplier(guild, multiplierId);
  }

  // ─── Utilities ─────────────────────────────────────

  xpForLevel(level: number): number {
    return this.calcXpForLevel(level);
  }

  xpProgress(user: string, guild: string): Promise<{ progress: number; percentage: number } | null> {
    return this.getUser(user, guild).then((record) => {
      if (!record) return null;
      const threshold = this.calcXpForLevel(record.level);
      return {
        progress: xpProgress(record.xp, threshold),
        percentage: xpPercentage(record.xp, threshold),
      };
    });
  }

  messagesToNextLevel(user: string, guild: string, avgXp: number = 3): Promise<number | null> {
    return this.getUser(user, guild).then((record) => {
      if (!record) return null;
      const threshold = this.calcXpForLevel(record.level);
      return messagesToNextLevel(record.xp, threshold, avgXp);
    });
  }

  // ─── Private ───────────────────────────────────────

  private randomXp(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
