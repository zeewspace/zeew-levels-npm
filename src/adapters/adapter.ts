import type {
  UserKey,
  LevelRecord,
  LeaderboardEntry,
  CooldownEntry,
  LevelReward,
  PrestigeEntry,
  GuildMultipliers,
} from "../types";

export interface LevelsAdapter {
  // ─── Core ───────────────────────────────────────────
  findUser(key: UserKey): Promise<LevelRecord | null>;
  upsertUser(key: UserKey, data: Partial<Pick<LevelRecord, "xp" | "level" | "totalXp" | "prestige" | "messages" | "lastXpAt">>): Promise<void>;
  deleteUser(key: UserKey): Promise<void>;
  getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]>;
  allUsers(guild: string): Promise<LevelRecord[]>;
  deleteAll(guild: string): Promise<void>;
  init?(): Promise<void>;

  // ─── Cooldowns ─────────────────────────────────────
  getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null>;
  setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void>;
  deleteCooldown(key: UserKey, action: string): Promise<void>;

  // ─── Rewards ───────────────────────────────────────
  getRewards(guild: string): Promise<LevelReward[]>;
  setRewards(guild: string, rewards: LevelReward[]): Promise<void>;

  // ─── Prestige ──────────────────────────────────────
  getPrestige(key: UserKey): Promise<PrestigeEntry | null>;
  setPrestige(key: UserKey, prestige: number): Promise<void>;

  // ─── Multipliers ───────────────────────────────────
  getMultipliers(guild: string): Promise<GuildMultipliers | null>;
  setMultipliers(guild: string, config: GuildMultipliers): Promise<void>;

  // ─── Stats ─────────────────────────────────────────
  getGuildStats(guild: string): Promise<{
    totalUsers: number;
    totalXp: number;
    totalMessages: number;
  }>;
}
