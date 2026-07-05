import type { LevelsAdapter } from "./adapter";
import type {
  UserKey,
  LevelRecord,
  LeaderboardEntry,
  CooldownEntry,
  LevelReward,
  PrestigeEntry,
  GuildMultipliers,
} from "../types";

export class MysqlAdapter implements LevelsAdapter {
  private readonly pool: any;

  constructor(poolOrConfig: any) {
    let mysql2: any;
    try {
      mysql2 = require("mysql2/promise");
    } catch {
      throw new Error("Failed to load mysql2. Install it: npm install mysql2");
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
        user_id    VARCHAR(25) NOT NULL,
        guild_id   VARCHAR(25) NOT NULL,
        xp         INT NOT NULL DEFAULT 0,
        level      INT NOT NULL DEFAULT 0,
        total_xp   INT NOT NULL DEFAULT 0,
        prestige   INT NOT NULL DEFAULT 0,
        messages   INT NOT NULL DEFAULT 0,
        last_xp_at BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, guild_id),
        INDEX idx_guild (guild_id),
        INDEX idx_leaderboard (guild_id, level, xp)
      );
      CREATE TABLE IF NOT EXISTS cooldowns (
        user_id    VARCHAR(25) NOT NULL,
        guild_id   VARCHAR(25) NOT NULL,
        action     VARCHAR(25) NOT NULL,
        expires_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, guild_id, action)
      );
      CREATE TABLE IF NOT EXISTS rewards (
        guild_id VARCHAR(25) NOT NULL,
        level    INT NOT NULL,
        role_id  VARCHAR(25) NOT NULL,
        type     VARCHAR(10) NOT NULL DEFAULT 'role',
        amount   INT,
        PRIMARY KEY (guild_id, level, role_id)
      );
      CREATE TABLE IF NOT EXISTS prestige (
        user_id         VARCHAR(25) NOT NULL,
        guild_id        VARCHAR(25) NOT NULL,
        prestige        INT NOT NULL DEFAULT 0,
        total_prestiges INT NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
      );
      CREATE TABLE IF NOT EXISTS guild_config (
        guild_id VARCHAR(25) NOT NULL PRIMARY KEY,
        config   JSON NOT NULL
      );
    `);
  }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const [rows] = await this.pool.execute(
      "SELECT * FROM levels WHERE user_id = ? AND guild_id = ?",
      [key.user, key.guild]
    );
    const row = (rows as any[])[0];
    if (!row) return null;
    return {
      user: row.user_id, guild: row.guild_id,
      xp: row.xp, level: row.level, totalXp: row.total_xp,
      prestige: row.prestige, messages: row.messages, lastXpAt: row.last_xp_at,
    };
  }

  async upsertUser(key: UserKey, data: Partial<Pick<LevelRecord, "xp" | "level" | "totalXp" | "prestige" | "messages" | "lastXpAt">>): Promise<void> {
    const existing = await this.findUser(key);
    const m = { ...existing, ...data, user: key.user, guild: key.guild };
    await this.pool.execute(
      `INSERT INTO levels (user_id, guild_id, xp, level, total_xp, prestige, messages, last_xp_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE xp=VALUES(xp), level=VALUES(level), total_xp=VALUES(total_xp),
         prestige=VALUES(prestige), messages=VALUES(messages), last_xp_at=VALUES(last_xp_at)`,
      [key.user, key.guild, m.xp??0, m.level??0, m.totalXp??0, m.prestige??0, m.messages??0, m.lastXpAt??0]
    );
  }

  async deleteUser(key: UserKey): Promise<void> {
    await this.pool.execute("DELETE FROM levels WHERE user_id = ? AND guild_id = ?", [key.user, key.guild]);
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    const [rows] = await this.pool.execute(
      "SELECT * FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?",
      [guild, limit]
    );
    return (rows as any[]).map((r) => ({
      user: r.user_id, guild: r.guild_id, xp: r.xp, level: r.level, totalXp: r.total_xp, prestige: r.prestige,
    }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    const [rows] = await this.pool.execute("SELECT * FROM levels WHERE guild_id = ?", [guild]);
    return (rows as any[]).map((r) => ({
      user: r.user_id, guild: r.guild_id, xp: r.xp, level: r.level, totalXp: r.total_xp,
      prestige: r.prestige, messages: r.messages, lastXpAt: r.last_xp_at,
    }));
  }

  async deleteAll(guild: string): Promise<void> {
    await this.pool.execute("DELETE FROM levels WHERE guild_id = ?", [guild]);
  }

  async getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null> {
    const [rows] = await this.pool.execute(
      "SELECT * FROM cooldowns WHERE user_id = ? AND guild_id = ? AND action = ?",
      [key.user, key.guild, action]
    );
    const row = (rows as any[])[0];
    if (!row) return null;
    return { user: row.user_id, guild: row.guild_id, action: row.action, expiresAt: row.expires_at };
  }

  async setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void> {
    await this.pool.execute(
      `INSERT INTO cooldowns (user_id, guild_id, action, expires_at) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)`,
      [key.user, key.guild, action, expiresAt]
    );
  }

  async deleteCooldown(key: UserKey, action: string): Promise<void> {
    await this.pool.execute("DELETE FROM cooldowns WHERE user_id = ? AND guild_id = ? AND action = ?", [key.user, key.guild, action]);
  }

  async getRewards(guild: string): Promise<LevelReward[]> {
    const [rows] = await this.pool.execute("SELECT * FROM rewards WHERE guild_id = ?", [guild]);
    return (rows as any[]).map((r) => ({ level: r.level, roleId: r.role_id, type: r.type, amount: r.amount }));
  }

  async setRewards(guild: string, rewards: LevelReward[]): Promise<void> {
    await this.pool.execute("DELETE FROM rewards WHERE guild_id = ?", [guild]);
    for (const r of rewards) {
      await this.pool.execute(
        "INSERT INTO rewards (guild_id, level, role_id, type, amount) VALUES (?, ?, ?, ?, ?)",
        [guild, r.level, r.roleId, r.type, r.amount ?? null]
      );
    }
  }

  async getPrestige(key: UserKey): Promise<PrestigeEntry | null> {
    const [rows] = await this.pool.execute("SELECT * FROM prestige WHERE user_id = ? AND guild_id = ?", [key.user, key.guild]);
    const row = (rows as any[])[0];
    if (!row) return null;
    return { user: row.user_id, guild: row.guild_id, prestige: row.prestige, totalPrestiges: row.total_prestiges };
  }

  async setPrestige(key: UserKey, prestige: number): Promise<void> {
    const existing = await this.getPrestige(key);
    await this.pool.execute(
      `INSERT INTO prestige (user_id, guild_id, prestige, total_prestiges) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE prestige = VALUES(prestige), total_prestiges = VALUES(total_prestiges)`,
      [key.user, key.guild, prestige, (existing?.totalPrestiges ?? 0) + 1]
    );
  }

  async getMultipliers(guild: string): Promise<GuildMultipliers | null> {
    const [rows] = await this.pool.execute("SELECT * FROM guild_config WHERE guild_id = ?", [guild]);
    const row = (rows as any[])[0];
    if (!row) return null;
    return typeof row.config === "string" ? JSON.parse(row.config) : row.config;
  }

  async setMultipliers(guild: string, config: GuildMultipliers): Promise<void> {
    await this.pool.execute(
      `INSERT INTO guild_config (guild_id, config) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE config = VALUES(config)`,
      [guild, JSON.stringify(config)]
    );
  }

  async getGuildStats(guild: string): Promise<{ totalUsers: number; totalXp: number; totalMessages: number }> {
    const [rows] = await this.pool.execute(
      "SELECT COUNT(*) as total, COALESCE(SUM(total_xp), 0) as totalXp, COALESCE(SUM(messages), 0) as totalMsg FROM levels WHERE guild_id = ?",
      [guild]
    );
    const row = (rows as any[])[0];
    return { totalUsers: row.total, totalXp: row.totalXp, totalMessages: row.totalMsg };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
