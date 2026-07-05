import type { LevelsAdapter } from "./adapter";
import type { UserKey, LevelRecord, LeaderboardEntry } from "../types";

export class MysqlAdapter implements LevelsAdapter {
  private readonly pool: any;

  constructor(poolOrConfig: any) {
    let mysql2: any;
    try {
      mysql2 = require("mysql2/promise");
    } catch {
      throw new Error(
        "Failed to load mysql2. Install it: npm install mysql2"
      );
    }

    if (poolOrConfig?.execute) {
      this.pool = poolOrConfig;
    } else {
      this.pool = mysql2.createPool(poolOrConfig);
    }
  }

  async init(): Promise<void> {
    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS levels (
        user_id  VARCHAR(25) NOT NULL,
        guild_id VARCHAR(25) NOT NULL,
        xp       INT NOT NULL DEFAULT 0,
        lvl      INT NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, guild_id),
        INDEX idx_guild (guild_id),
        INDEX idx_leaderboard (guild_id, lvl, xp)
      )
    `);
  }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const [rows] = await this.pool.execute(
      "SELECT user_id, guild_id, xp, lvl FROM levels WHERE user_id = ? AND guild_id = ?",
      [key.user, key.guild]
    );
    const row = (rows as any[])[0];
    if (!row) return null;
    return { user: row.user_id, guild: row.guild_id, xp: row.xp, level: row.lvl };
  }

  async upsertUser(key: UserKey, xp: number, level: number): Promise<void> {
    await this.pool.execute(
      `INSERT INTO levels (user_id, guild_id, xp, lvl) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE xp = VALUES(xp), lvl = VALUES(lvl)`,
      [key.user, key.guild, xp, level]
    );
  }

  async deleteUser(key: UserKey): Promise<void> {
    await this.pool.execute(
      "DELETE FROM levels WHERE user_id = ? AND guild_id = ?",
      [key.user, key.guild]
    );
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    const [rows] = await this.pool.execute(
      "SELECT user_id, guild_id, xp, lvl FROM levels WHERE guild_id = ? ORDER BY lvl DESC, xp DESC LIMIT ?",
      [guild, limit]
    );
    return (rows as any[]).map((r) => ({
      user: r.user_id,
      guild: r.guild_id,
      xp: r.xp,
      level: r.lvl,
    }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    const [rows] = await this.pool.execute(
      "SELECT user_id, guild_id, xp, lvl FROM levels WHERE guild_id = ?",
      [guild]
    );
    return (rows as any[]).map((r) => ({
      user: r.user_id,
      guild: r.guild_id,
      xp: r.xp,
      level: r.lvl,
    }));
  }

  async deleteAll(guild: string): Promise<void> {
    await this.pool.execute("DELETE FROM levels WHERE guild_id = ?", [guild]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
