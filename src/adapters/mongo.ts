import type { LevelsAdapter } from "./adapter";
import type { UserKey, LevelRecord, LeaderboardEntry } from "../types";

export class MongoAdapter implements LevelsAdapter {
  private readonly db: any;
  private readonly collection: any;

  constructor(uriOrDb: any, dbName?: string) {
    let mongodb: any;
    try {
      mongodb = require("mongodb");
    } catch {
      throw new Error(
        "Failed to load mongodb. Install it: npm install mongodb"
      );
    }

    if (uriOrDb?.collection) {
      this.db = uriOrDb;
    } else {
      const client = new mongodb.MongoClient(uriOrDb);
      this.db = client.db(dbName ?? "zeew-levels");
    }

    this.collection = this.db.collection("levels");
  }

  async init(): Promise<void> {
    await this.collection.createIndex(
      { user: 1, guild: 1 },
      { unique: true }
    );
    await this.collection.createIndex({ guild: 1, level: -1, xp: -1 });
  }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const doc = await this.collection.findOne({ user: key.user, guild: key.guild });
    if (!doc) return null;
    return { user: doc.user, guild: doc.guild, xp: doc.xp, level: doc.level };
  }

  async upsertUser(key: UserKey, xp: number, level: number): Promise<void> {
    await this.collection.updateOne(
      { user: key.user, guild: key.guild },
      { $set: { xp, level } },
      { upsert: true }
    );
  }

  async deleteUser(key: UserKey): Promise<void> {
    await this.collection.deleteOne({ user: key.user, guild: key.guild });
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    const docs = await this.collection
      .find({ guild })
      .sort({ level: -1, xp: -1 })
      .limit(limit)
      .toArray();

    return docs.map((d: any) => ({
      user: d.user,
      guild: d.guild,
      xp: d.xp,
      level: d.level,
    }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    const docs = await this.collection.find({ guild }).toArray();
    return docs.map((d: any) => ({
      user: d.user,
      guild: d.guild,
      xp: d.xp,
      level: d.level,
    }));
  }

  async deleteAll(guild: string): Promise<void> {
    await this.collection.deleteMany({ guild });
  }

  async close(): Promise<void> {
    if (this.db.client) {
      await this.db.client.close();
    }
  }
}
