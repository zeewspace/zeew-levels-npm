import type { LevelsAdapter } from "./adapters/adapter";
import type { UserKey, CooldownConfig, CooldownEntry } from "./types";

export class CooldownManager {
  private readonly adapter: LevelsAdapter;
  private readonly config: CooldownConfig;

  constructor(adapter: LevelsAdapter, config?: Partial<CooldownConfig>) {
    this.adapter = adapter;
    this.config = {
      messageCooldown: config?.messageCooldown ?? 5000,
      voiceCooldown: config?.voiceCooldown ?? 60000,
      commandCooldown: config?.commandCooldown ?? 3000,
    };
  }

  async isOnCooldown(key: UserKey, action: string): Promise<{ onCooldown: boolean; retryIn: number }> {
    const entry = await this.adapter.getCooldown(key, action);
    if (!entry) return { onCooldown: false, retryIn: 0 };

    const now = Date.now();
    if (now >= entry.expiresAt) {
      await this.adapter.deleteCooldown(key, action);
      return { onCooldown: false, retryIn: 0 };
    }

    return { onCooldown: true, retryIn: entry.expiresAt - now };
  }

  async setCooldown(key: UserKey, action: string): Promise<void> {
    const duration = this.getDuration(action);
    const expiresAt = Date.now() + duration;
    await this.adapter.setCooldown(key, action, expiresAt);
  }

  async clearCooldown(key: UserKey, action: string): Promise<void> {
    await this.adapter.deleteCooldown(key, action);
  }

  async clearAllCooldowns(key: UserKey): Promise<void> {
    for (const action of ["message", "voice", "command"]) {
      await this.adapter.deleteCooldown(key, action);
    }
  }

  getDuration(action: string): number {
    switch (action) {
      case "message": return this.config.messageCooldown;
      case "voice": return this.config.voiceCooldown;
      case "command": return this.config.commandCooldown;
      default: return this.config.messageCooldown;
    }
  }

  getMessageCooldown(): number {
    return this.config.messageCooldown;
  }
}
