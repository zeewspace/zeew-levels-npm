import * as fs from "fs";
import * as path from "path";
import type { LevelsAdapter } from "./adapter";
import type { UserKey, LevelRecord, LeaderboardEntry } from "../types";

interface JsonDB {
  users: LevelRecord[];
}

export class JsonAdapter implements LevelsAdapter {
  private readonly filePath: string;
  private db: JsonDB;

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.resolve(process.cwd(), "zeew-levels.json");
    this.db = this.load();
  }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const found = this.db.users.find(
      (u) => u.user === key.user && u.guild === key.guild
    );
    return found ? { ...found } : null;
  }

  async upsertUser(key: UserKey, xp: number, level: number): Promise<void> {
    const idx = this.db.users.findIndex(
      (u) => u.user === key.user && u.guild === key.guild
    );
    const record: LevelRecord = { ...key, xp, level };
    if (idx >= 0) {
      this.db.users[idx] = record;
    } else {
      this.db.users.push(record);
    }
    this.flush();
  }

  async deleteUser(key: UserKey): Promise<void> {
    this.db.users = this.db.users.filter(
      (u) => !(u.user === key.user && u.guild === key.guild)
    );
    this.flush();
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    return this.db.users
      .filter((u) => u.guild === guild)
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, limit)
      .map((u) => ({ user: u.user, guild: u.guild, xp: u.xp, level: u.level }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    return this.db.users
      .filter((u) => u.guild === guild)
      .map((u) => ({ ...u }));
  }

  async deleteAll(guild: string): Promise<void> {
    this.db.users = this.db.users.filter((u) => u.guild !== guild);
    this.flush();
  }

  private load(): JsonDB {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<JsonDB>;
      return { users: parsed.users ?? [] };
    } catch {
      return { users: [] };
    }
  }

  private flush(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.db, null, 2), "utf-8");
  }
}
