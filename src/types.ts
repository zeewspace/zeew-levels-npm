// ─── Base Keys ───────────────────────────────────────────

export interface UserKey {
  user: string;
  guild: string;
}

// ─── Core Records ────────────────────────────────────────

export interface LevelRecord extends UserKey {
  xp: number;
  level: number;
  totalXp: number;
  prestige: number;
  messages: number;
  lastXpAt: number;
}

export interface LeaderboardEntry {
  user: string;
  guild: string;
  xp: number;
  level: number;
  totalXp: number;
  prestige: number;
}

// ─── Result Types ────────────────────────────────────────

export interface LevelUpResult {
  type: "level_up";
  newLevel: number;
  xp: number;
  rewards: LevelReward[];
}

export interface XpGainResult {
  type: "xp_gain";
  xp: number;
  totalXp: number;
  multiplied: boolean;
}

export interface PrestigeResult {
  type: "prestige";
  newPrestige: number;
  level: number;
  xp: number;
}

export type ProcessResult = LevelUpResult | XpGainResult;

// ─── Multipliers ─────────────────────────────────────────

export interface Multiplier {
  id: string;
  value: number;
  source: "role" | "boost" | "guild" | "custom";
  roleId?: string;
}

export interface GuildMultipliers {
  guild: string;
  multipliers: Multiplier[];
  baseXp: XpRange;
  levelUpThreshold: number;
  maxLevel: number;
}

// ─── Cooldowns ───────────────────────────────────────────

export interface CooldownConfig {
  messageCooldown: number;
  voiceCooldown: number;
  commandCooldown: number;
}

export interface CooldownEntry extends UserKey {
  action: string;
  expiresAt: number;
}

// ─── Level Rewards ───────────────────────────────────────

export interface LevelReward {
  level: number;
  roleId: string;
  type: "role" | "xp" | "custom";
  amount?: number;
}

export interface GuildRewards {
  guild: string;
  rewards: LevelReward[];
}

// ─── Prestige ────────────────────────────────────────────

export interface PrestigeConfig {
  enabled: boolean;
  maxPrestige: number;
  resetLevel: number;
  bonusPerPrestige: number;
  requiredLevel: number;
}

export interface PrestigeEntry extends UserKey {
  prestige: number;
  totalPrestiges: number;
}

// ─── XP Curve ────────────────────────────────────────────

export type XpCurveFn = (level: number) => number;

export interface XpCurve {
  name: "linear" | "quadratic" | "exponential" | "custom";
  base?: number;
  multiplier?: number;
  custom?: XpCurveFn;
}

// ─── Stats ───────────────────────────────────────────────

export interface UserStats extends LevelRecord {
  rank: number;
  xpForNextLevel: number;
  xpProgress: number;
  xpPercentage: number;
  messagesToNextLevel: number;
}

export interface GuildStats {
  guild: string;
  totalUsers: number;
  totalXp: number;
  averageLevel: number;
  highestLevel: number;
  totalMessages: number;
}

// ─── Options ─────────────────────────────────────────────

export interface XpRange {
  min: number;
  max: number;
}

export interface LevelsOptions {
  xpPerMessage?: XpRange;
  levelUpThreshold?: number;
  maxLevel?: number;
  logger?: Logger;
  cache?: CacheOptions;
  cooldown?: CooldownConfig;
  prestige?: PrestigeConfig;
  xpCurve?: XpCurve;
}

export interface CacheOptions {
  enabled: boolean;
  maxSize?: number;
  ttl?: number;
}

// ─── Logger ──────────────────────────────────────────────

export interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

// ─── Hooks ───────────────────────────────────────────────

export interface LevelsHooks {
  onLevelUp?: (user: string, guild: string, newLevel: number, rewards: LevelReward[]) => void;
  onXpGain?: (user: string, guild: string, xp: number, multiplied: boolean) => void;
  onPrestige?: (user: string, guild: string, newPrestige: number) => void;
  onCooldown?: (user: string, guild: string, action: string, retryIn: number) => void;
}
