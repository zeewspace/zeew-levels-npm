// ─── Base Keys ───────────────────────────────────────────

export interface UserKey {
  user: string;
  guild: string;
}

// ─── Core Records ────────────────────────────────────────

export interface LevelRecord extends UserKey {
  xp: number;
  level: number;
}

export interface LeaderboardEntry {
  user: string;
  guild: string;
  xp: number;
  level: number;
}

// ─── Result Types ────────────────────────────────────────

export interface LevelUpResult {
  type: "level_up";
  newLevel: number;
  xp: number;
}

export interface XpGainResult {
  type: "xp_gain";
  xp: number;
  totalXp: number;
}

export type MessageResult = LevelUpResult | XpGainResult;

// ─── Options ─────────────────────────────────────────────

export interface XpRange {
  min: number;
  max: number;
}

export interface LevelsOptions {
  xpPerMessage?: XpRange;
  levelUpThreshold?: number;
  logger?: Logger;
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
  onLevelUp?: (user: string, guild: string, newLevel: number) => void;
  onXpGain?: (user: string, guild: string, xp: number) => void;
}
