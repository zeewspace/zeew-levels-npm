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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require("better-sqlite3");

export class SqliteAdapter implements LevelsAdapter {
  private readonly db: any;

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
        total_xp INTEGER NOT NULL DEFAULT 0,
        prestige INTEGER NOT NULL DEFAULT 0,
        messages INTEGER NOT NULL DEFAULT 0,
        last_xp_at INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
      );
      CREATE TABLE IF NOT EXISTS cooldowns (
        user_id   TEXT NOT NULL,
        guild_id  TEXT NOT NULL,
        action    TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, guild_id, action)
      );
      CREATE TABLE IF NOT EXISTS rewards (
        guild_id TEXT NOT NULL,
        level    INTEGER NOT NULL,
        role_id  TEXT NOT NULL,
        type     TEXT NOT NULL DEFAULT 'role',
        amount   INTEGER,
        PRIMARY KEY (guild_id, level, role_id)
      );
      CREATE TABLE IF NOT EXISTS prestige (
        user_id        TEXT NOT NULL,
        guild_id       TEXT NOT NULL,
        prestige       INTEGER NOT NULL DEFAULT 0,
        total_prestiges INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
      );
      CREATE TABLE IF NOT EXISTS guild_config (
        guild_id   TEXT NOT NULL PRIMARY KEY,
        config     TEXT NOT NULL
      );
    `);
  }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const row = this.db.prepare(
      "SELECT * FROM levels WHERE user_id = ? AND guild_id = ?"
    ).get(key.user, key.guild);
    if (!row) return null;
    return {
      user: row.user_id,
      guild: row.guild_id,
      xp: row.xp,
      level: row.level,
      totalXp: row.total_xp,
      prestige: row.prestige,
      messages: row.messages,
      lastXpAt: row.last_xp_at,
    };
  }

  async upsertUser(key: UserKey, data: Partial<Pick<LevelRecord, "xp" | "level" | "totalXp" | "prestige" | "messages" | "lastXpAt">>): Promise<void> {
    const existing = await this.findUser(key);
    const merged = { ...existing, ...data, user: key.user, guild: key.guild };

    this.db.prepare(`
      INSERT INTO levels (user_id, guild_id, xp, level, total_xp, prestige, messages, last_xp_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, guild_id) DO UPDATE SET
        xp = excluded.xp, level = excluded.level, total_xp = excluded.total_xp,
        prestige = excluded.prestige, messages = excluded.messages, last_xp_at = excluded.last_xp_at
    `).run(
      key.user, key.guild,
      merged.xp ?? 0, merged.level ?? 0, merged.totalXp ?? 0,
      merged.prestige ?? 0, merged.messages ?? 0, merged.lastXpAt ?? 0
    );
  }

  async deleteUser(key: UserKey): Promise<void> {
    this.db.prepare("DELETE FROM levels WHERE user_id = ? AND guild_id = ?").run(key.user, key.guild);
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    const rows = this.db.prepare(
      "SELECT * FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?"
    ).all(guild, limit);
    return rows.map((r: any) => ({
      user: r.user_id,
      guild: r.guild_id,
      xp: r.xp,
      level: r.level,
      totalXp: r.total_xp,
      prestige: r.prestige,
    }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    const rows = this.db.prepare("SELECT * FROM levels WHERE guild_id = ?").all(guild);
    return rows.map((r: any) => ({
      user: r.user_id,
      guild: r.guild_id,
      xp: r.xp,
      level: r.level,
      totalXp: r.total_xp,
      prestige: r.prestige,
      messages: r.messages,
      lastXpAt: r.last_xp_at,
    }));
  }

  async deleteAll(guild: string): Promise<void> {
    this.db.prepare("DELETE FROM levels WHERE guild_id = ?").run(guild);
  }

  async getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null> {
    const row = this.db.prepare(
      "SELECT * FROM cooldowns WHERE user_id = ? AND guild_id = ? AND action = ?"
    ).get(key.user, key.guild, action);
    if (!row) return null;
    return { user: row.user_id, guild: row.guild_id, action: row.action, expiresAt: row.expires_at };
  }

  async setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void> {
    this.db.prepare(`
      INSERT INTO cooldowns (user_id, guild_id, action, expires_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, guild_id, action) DO UPDATE SET expires_at = excluded.expires_at
    `).run(key.user, key.guild, action, expiresAt);
  }

  async deleteCooldown(key: UserKey, action: string): Promise<void> {
    this.db.prepare("DELETE FROM cooldowns WHERE user_id = ? AND guild_id = ? AND action = ?").run(key.user, key.guild, action);
  }

  async getRewards(guild: string): Promise<LevelReward[]> {
    const rows = this.db.prepare("SELECT * FROM rewards WHERE guild_id = ?").all(guild);
    return rows.map((r: any) => ({
      level: r.level,
      roleId: r.role_id,
      type: r.type,
      amount: r.amount,
    }));
  }

  async setRewards(guild: string, rewards: LevelReward[]): Promise<void> {
    this.db.prepare("DELETE FROM rewards WHERE guild_id = ?").run(guild);
    const stmt = this.db.prepare("INSERT INTO rewards (guild_id, level, role_id, type, amount) VALUES (?, ?, ?, ?, ?)");
    for (const r of rewards) {
      stmt.run(guild, r.level, r.roleId, r.type, r.amount ?? null);
    }
  }

  async getPrestige(key: UserKey): Promise<PrestigeEntry | null> {
    const row = this.db.prepare(
      "SELECT * FROM prestige WHERE user_id = ? AND guild_id = ?"
    ).get(key.user, key.guild);
    if (!row) return null;
    return { user: row.user_id, guild: row.guild_id, prestige: row.prestige, totalPrestiges: row.total_prestiges };
  }

  async setPrestige(key: UserKey, prestige: number): Promise<void> {
    const existing = await this.getPrestige(key);
    this.db.prepare(`
      INSERT INTO prestige (user_id, guild_id, prestige, total_prestiges) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, guild_id) DO UPDATE SET prestige = excluded.prestige, total_prestiges = excluded.total_prestiges
    `).run(key.user, key.guild, prestige, (existing?.totalPrestiges ?? 0) + 1);
  }

  async getMultipliers(guild: string): Promise<GuildMultipliers | null> {
    const row = this.db.prepare("SELECT * FROM guild_config WHERE guild_id = ?").get(guild);
    if (!row) return null;
    return JSON.parse(row.config);
  }

  async setMultipliers(guild: string, config: GuildMultipliers): Promise<void> {
    this.db.prepare(`
      INSERT INTO guild_config (guild_id, config) VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET config = excluded.config
    `).run(guild, JSON.stringify(config));
  }

  async getGuildStats(guild: string): Promise<{
    totalUsers: number;
    totalXp: number;
    totalMessages: number;
  }> {
    const row = this.db.prepare(
      "SELECT COUNT(*) as total, COALESCE(SUM(total_xp), 0) as totalXp, COALESCE(SUM(messages), 0) as totalMessages FROM levels WHERE guild_id = ?"
    ).get(guild);
    return {
      totalUsers: row.total,
      totalXp: row.totalXp,
      totalMessages: row.totalMessages,
    };
  }

  close(): void {
    this.db.close();
  }
}
