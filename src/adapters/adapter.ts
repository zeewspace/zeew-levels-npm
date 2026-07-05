import type { UserKey, LevelRecord, LeaderboardEntry } from "../types";

export interface LevelsAdapter {
  findUser(key: UserKey): Promise<LevelRecord | null>;
  upsertUser(key: UserKey, xp: number, level: number): Promise<void>;
  deleteUser(key: UserKey): Promise<void>;
  getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]>;
  allUsers(guild: string): Promise<LevelRecord[]>;
  deleteAll(guild: string): Promise<void>;
  init?(): Promise<void>;
}
