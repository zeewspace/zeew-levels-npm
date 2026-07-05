// ─── Core ───────────────────────────────────────────────
export { ZeewLevels } from "./levels";
export type { LevelsAdapter } from "./adapters/adapter";

// ─── Adapters ───────────────────────────────────────────
export { MemoryAdapter } from "./adapters/memory";
export { JsonAdapter } from "./adapters/json";
export { SqliteAdapter } from "./adapters/sqlite";
export { MysqlAdapter } from "./adapters/mysql";
export { MongoAdapter } from "./adapters/mongo";
export { RedisAdapter } from "./adapters/redis";

// ─── Features ───────────────────────────────────────────
export { MultiplierManager } from "./multipliers";
export { CooldownManager } from "./cooldowns";
export { RewardManager } from "./rewards";
export { PrestigeManager } from "./prestige";
export { StatsCalculator } from "./stats";
export { LruCache, userKey } from "./cache";

// ─── Utilities ──────────────────────────────────────────
export {
  createXpCalculator,
  xpForLevel,
  xpProgress,
  xpPercentage,
  messagesToNextLevel,
  progressBar,
  formatXp,
  formatLevel,
  rankSuffix,
} from "./utils";

// ─── Discord.js Helpers ─────────────────────────────────
export {
  rankCard,
  leaderboardEmbed,
  levelUpMessage,
  prestigeMessage,
  statsEmbed,
} from "./discord";
export type { DiscordEmbed } from "./discord";

// ─── Types ──────────────────────────────────────────────
export type {
  UserKey,
  LevelRecord,
  LeaderboardEntry,
  LevelUpResult,
  XpGainResult,
  PrestigeResult,
  ProcessResult,
  Multiplier,
  GuildMultipliers,
  CooldownConfig,
  CooldownEntry,
  LevelReward,
  GuildRewards,
  PrestigeConfig,
  PrestigeEntry,
  XpCurve,
  XpCurveFn,
  UserStats,
  GuildStats,
  XpRange,
  LevelsOptions,
  CacheOptions,
  Logger,
  LevelsHooks,
} from "./types";
