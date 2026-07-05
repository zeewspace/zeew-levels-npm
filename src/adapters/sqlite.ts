import type { LevelsAdapter } from "./adapter";
import type { UserKey, LevelRecord, LeaderboardEntry } from "../types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require("better-sqlite3");

export class SqliteAdapter implements LevelsAdapter {
  private readonly db: any;
  private readonly stmts: {
    findUser: any;
    upsertUser: any;
    deleteUser: any;
    leaderboard: any;
    allUsers: any;
    deleteAll: any;
  };

  constructor(dbPath?: string) {
    try {
      this.db = new Database(dbPath ?? "./zeew-levels.db");
    } catch (err: any) {
      throw new Error(
        `Failed to load better-sqlite3. Install it: npm install better-sqlite3\n${err.message}`
      );
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS levels (
        user_id  TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        xp       INTEGER NOT NULL DEFAULT 0,
        level    INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
      )
    `);

    this.stmts = {
      findUser: this.db.prepare(
        "SELECT xp, level FROM levels WHERE user_id = ? AND guild_id = ?"
      ),
      upsertUser: this.db.prepare(`
        INSERT INTO levels (user_id, guild_id, xp, level) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, guild_id) DO UPDATE SET xp = excluded.xp, level = excluded.level
      `),
      deleteUser: this.db.prepare(
        "DELETE FROM levels WHERE user_id = ? AND guild_id = ?"
      ),
      leaderboard: this.db.prepare(
        "SELECT user_id, guild_id, xp, level FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?"
      ),
      allUsers: this.db.prepare(
        "SELECT user_id, guild_id, xp, level FROM levels WHERE guild_id = ?"
      ),
      deleteAll: this.db.prepare("DELETE FROM levels WHERE guild_id = ?"),
    };
  }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const row = this.stmts.findUser.get(key.user, key.guild);
    if (!row) return null;
    return { user: row.user_id, guild: row.guild_id, xp: row.xp, level: row.level };
  }

  async upsertUser(key: UserKey, xp: number, level: number): Promise<void> {
    this.stmts.upsertUser.run(key.user, key.guild, xp, level);
  }

  async deleteUser(key: UserKey): Promise<void> {
    this.stmts.deleteUser.run(key.user, key.guild);
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    const rows = this.stmts.leaderboard.all(guild, limit);
    return rows.map((r: any) => ({
      user: r.user_id,
      guild: r.guild_id,
      xp: r.xp,
      level: r.level,
    }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    const rows = this.stmts.allUsers.all(guild);
    return rows.map((r: any) => ({
      user: r.user_id,
      guild: r.guild_id,
      xp: r.xp,
      level: r.level,
    }));
  }

  async deleteAll(guild: string): Promise<void> {
    this.stmts.deleteAll.run(guild);
  }

  close(): void {
    this.db.close();
  }
}
