import type { LevelsAdapter } from "./adapters/adapter";
import type { UserKey, PrestigeConfig, PrestigeEntry } from "./types";

const DEFAULT_CONFIG: PrestigeConfig = {
  enabled: false,
  maxPrestige: 10,
  resetLevel: 100,
  bonusPerPrestige: 0.1,
  requiredLevel: 50,
};

export class PrestigeManager {
  private readonly adapter: LevelsAdapter;
  private readonly config: PrestigeConfig;

  constructor(adapter: LevelsAdapter, config?: Partial<PrestigeConfig>) {
    this.adapter = adapter;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  async getPrestige(key: UserKey): Promise<PrestigeEntry> {
    const entry = await this.adapter.getPrestige(key);
    return entry ?? { ...key, prestige: 0, totalPrestiges: 0 };
  }

  async canPrestige(key: UserKey, currentLevel: number): Promise<{ can: boolean; reason?: string }> {
    if (!this.config.enabled) {
      return { can: false, reason: "Prestige system is disabled" };
    }

    const prestige = await this.getPrestige(key);

    if (prestige.prestige >= this.config.maxPrestige) {
      return { can: false, reason: `Maximum prestige (${this.config.maxPrestige}) reached` };
    }

    if (currentLevel < this.config.requiredLevel) {
      return {
        can: false,
        reason: `Requires level ${this.config.requiredLevel} (current: ${currentLevel})`,
      };
    }

    return { can: true };
  }

  async doPrestige(key: UserKey, currentLevel: number): Promise<{ success: boolean; newPrestige: number; bonus: number; reason?: string }> {
    const check = await this.canPrestige(key, currentLevel);
    if (!check.can) {
      return { success: false, newPrestige: 0, bonus: 0, reason: check.reason };
    }

    const prestige = await this.getPrestige(key);
    const newPrestige = prestige.prestige + 1;
    const bonus = this.config.bonusPerPrestige * newPrestige;

    await this.adapter.setPrestige(key, newPrestige);
    await this.adapter.upsertUser(key, {
      xp: 0,
      level: this.config.resetLevel,
    });

    return { success: true, newPrestige, bonus };
  }

  getPrestigeBonus(prestige: number): number {
    return this.config.bonusPerPrestige * prestige;
  }

  getMaxPrestige(): number {
    return this.config.maxPrestige;
  }

  getRequiredLevel(): number {
    return this.config.requiredLevel;
  }

  getResetLevel(): number {
    return this.config.resetLevel;
  }
}
