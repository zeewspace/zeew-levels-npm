import type { LevelsAdapter } from "./adapters/adapter";
import type { Multiplier, GuildMultipliers, XpRange } from "./types";

export class MultiplierManager {
  private readonly adapter: LevelsAdapter;
  private readonly guildConfigs = new Map<string, GuildMultipliers>();

  constructor(adapter: LevelsAdapter) {
    this.adapter = adapter;
  }

  async getConfig(guild: string): Promise<GuildMultipliers> {
    const cached = this.guildConfigs.get(guild);
    if (cached) return cached;

    const config = await this.adapter.getMultipliers(guild);
    if (config) {
      this.guildConfigs.set(guild, config);
      return config;
    }

    const defaultConfig: GuildMultipliers = {
      guild,
      multipliers: [],
      baseXp: { min: 1, max: 5 },
      levelUpThreshold: 1000,
      maxLevel: 100,
    };
    this.guildConfigs.set(guild, defaultConfig);
    return defaultConfig;
  }

  async addMultiplier(guild: string, multiplier: Multiplier): Promise<void> {
    const config = await this.getConfig(guild);
    const existing = config.multipliers.findIndex((m) => m.id === multiplier.id);
    if (existing >= 0) {
      config.multipliers[existing] = multiplier;
    } else {
      config.multipliers.push(multiplier);
    }
    this.guildConfigs.set(guild, config);
    await this.adapter.setMultipliers(guild, config);
  }

  async removeMultiplier(guild: string, multiplierId: string): Promise<void> {
    const config = await this.getConfig(guild);
    config.multipliers = config.multipliers.filter((m) => m.id !== multiplierId);
    this.guildConfigs.set(guild, config);
    await this.adapter.setMultipliers(guild, config);
  }

  calculateMultiplier(baseXp: number, multipliers: Multiplier[]): number {
    let total = 1;
    for (const m of multipliers) {
      total *= m.value;
    }
    return Math.floor(baseXp * total);
  }

  getMultipliersForUser(userRoles: string[], guildMultipliers: Multiplier[]): Multiplier[] {
    return guildMultipliers.filter((m) => {
      if (m.source === "role" && m.roleId) {
        return userRoles.includes(m.roleId);
      }
      return m.source === "guild" || m.source === "boost" || m.source === "custom";
    });
  }

  async updateBaseXp(guild: string, baseXp: XpRange): Promise<void> {
    const config = await this.getConfig(guild);
    config.baseXp = baseXp;
    this.guildConfigs.set(guild, config);
    await this.adapter.setMultipliers(guild, config);
  }

  async updateThreshold(guild: string, threshold: number): Promise<void> {
    const config = await this.getConfig(guild);
    config.levelUpThreshold = threshold;
    this.guildConfigs.set(guild, config);
    await this.adapter.setMultipliers(guild, config);
  }

  async updateMaxLevel(guild: string, maxLevel: number): Promise<void> {
    const config = await this.getConfig(guild);
    config.maxLevel = maxLevel;
    this.guildConfigs.set(guild, config);
    await this.adapter.setMultipliers(guild, config);
  }

  invalidateCache(guild: string): void {
    this.guildConfigs.delete(guild);
  }
}
