# Patrones de Testing

> Cómo testear tu bot con zeew-levels usando diferentes estrategias.

## Testing con MemoryAdapter

El `MemoryAdapter` es ideal para tests unitarios. No necesita base de datos.

### Setup

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { ZeewLevels, MemoryAdapter } from "zeew-levels";

describe("Sistema de Niveles", () => {
  let adapter: MemoryAdapter;
  let levels: ZeewLevels;

  beforeEach(() => {
    adapter = new MemoryAdapter();
    levels = new ZeewLevels(adapter, {
      xpPerMessage: { min: 1, max: 5 },
      levelUpThreshold: 100,
      cooldown: { messageCooldown: 0 }, // Sin cooldowns en tests
    });
  });
});
```

### Test: Procesar Mensaje

```typescript
it("crea un usuario nuevo con XP", async () => {
  const result = await levels.processMessage("user1", "guild1");

  expect(result.type).toBe("xp_gain");
  if (result.type === "xp_gain") {
    expect(result.xp).toBeGreaterThanOrEqual(1);
    expect(result.xp).toBeLessThanOrEqual(5);
  }
});

it("sube de nivel cuando XP supera umbral", async () => {
  // Forzar usuario cerca del umbral
  await adapter.upsertUser(
    { user: "user1", guild: "guild1" },
    { xp: 99, level: 0 }
  );

  const result = await levels.processMessage("user1", "guild1");

  expect(result.type).toBe("level_up");
  if (result.type === "level_up") {
    expect(result.newLevel).toBe(1);
  }
});
```

### Test: AddXp Manual

```typescript
it("agrega XP exacto", async () => {
  const result = await levels.addXp("user1", "guild1", 50);

  expect(result.type).toBe("xp_gain");
  if (result.type === "xp_gain") {
    expect(result.xp).toBe(50);
    expect(result.totalXp).toBe(50);
  }
});

it("crea usuario si no existe", async () => {
  await levels.addXp("newuser", "guild1", 25);

  const user = await levels.getUser("newuser", "guild1");
  expect(user).not.toBeNull();
  expect(user!.xp).toBe(25);
});
```

### Test: Getters y Setters

```typescript
it("obtiene nivel correcto", async () => {
  await adapter.upsertUser(
    { user: "u1", guild: "g1" },
    { xp: 42, level: 5, totalXp: 500 }
  );

  expect(await levels.getLevel("u1", "g1")).toBe(5);
  expect(await levels.getXp("u1", "g1")).toBe(42);
});

it("retorna null para usuario inexistente", async () => {
  expect(await levels.getLevel("nobody", "g1")).toBeNull();
  expect(await levels.getXp("nobody", "g1")).toBeNull();
  expect(await levels.getUser("nobody", "g1")).toBeNull();
});
```

### Test: Leaderboard

```typescript
it("retorna leaderboard ordenado", async () => {
  await adapter.upsertUser({ user: "a", guild: "g1" }, { xp: 10, level: 2 });
  await adapter.upsertUser({ user: "b", guild: "g1" }, { xp: 50, level: 5 });
  await adapter.upsertUser({ user: "c", guild: "g1" }, { xp: 20, level: 1 });

  const lb = await levels.getLeaderboard("g1");

  expect(lb).toHaveLength(3);
  expect(lb[0].user).toBe("b"); // Nivel 5
  expect(lb[1].user).toBe("a"); // Nivel 2
  expect(lb[2].user).toBe("c"); // Nivel 1
});

it("respeta el límite", async () => {
  await adapter.upsertUser({ user: "a", guild: "g1" }, { xp: 10, level: 1 });
  await adapter.upsertUser({ user: "b", guild: "g1" }, { xp: 20, level: 2 });
  await adapter.upsertUser({ user: "c", guild: "g1" }, { xp: 30, level: 3 });

  const lb = await levels.getLeaderboard("g1", 2);
  expect(lb).toHaveLength(2);
});
```

### Test: Cooldowns

```typescript
it("respeta cooldowns", async () => {
  const levelsWithCooldown = new ZeewLevels(adapter, {
    cooldown: { messageCooldown: 5000 },
  });

  // Primer mensaje
  const result1 = await levelsWithCooldown.processMessage("u1", "g1");
  expect(result1.type).toBe("xp_gain");

  // Segundo mensaje (en cooldown)
  const result2 = await levelsWithCooldown.processMessage("u1", "g1");
  expect(result2.type).toBe("xp_gain");
  if (result2.type === "xp_gain") {
    expect(result2.xp).toBe(0);
  }
});
```

### Test: Multiplicadores

```typescript
it("aplica multiplicadores por rol", async () => {
  await levels.addMultiplier("guild1", {
    id: "vip",
    value: 2,
    source: "role",
    roleId: "role123",
  });

  const result = await levels.processMessage("user1", "guild1", ["role123"]);

  expect(result.type).toBe("xp_gain");
  if (result.type === "xp_gain") {
    expect(result.xp).toBeGreaterThanOrEqual(2);
    expect(result.multiplied).toBe(true);
  }
});
```

### Test: Hooks

```typescript
it("ejecuta hook onLevelUp", async () => {
  const calls: any[] = [];
  levels.onLevelUp = (user, guild, newLevel, rewards) => {
    calls.push({ user, guild, newLevel, rewards });
  };

  await adapter.upsertUser(
    { user: "u1", guild: "g1" },
    { xp: 99, level: 0 }
  );
  await levels.processMessage("u1", "g1");

  expect(calls.length).toBeGreaterThanOrEqual(1);
  expect(calls[0].newLevel).toBe(1);
});
```

## Testing con JsonAdapter

Para tests de integración que verifican persistencia.

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import { ZeewLevels, JsonAdapter } from "zeew-levels";

const TEST_FILE = "./test-levels.json";

describe("JsonAdapter E2E", () => {
  let adapter: JsonAdapter;
  let levels: ZeewLevels;

  beforeEach(() => {
    try { fs.unlinkSync(TEST_FILE); } catch {}
    adapter = new JsonAdapter(TEST_FILE);
    levels = new ZeewLevels(adapter, {
      levelUpThreshold: 100,
      cooldown: { messageCooldown: 0 },
    });
  });

  afterEach(() => {
    try { fs.unlinkSync(TEST_FILE); } catch {}
  });

  it("persiste datos entre instancias", async () => {
    await adapter.upsertUser(
      { user: "u1", guild: "g1" },
      { xp: 42, level: 3 }
    );

    // Crear nueva instancia (lee del archivo)
    const adapter2 = new JsonAdapter(TEST_FILE);
    const user = await adapter2.findUser({ user: "u1", guild: "g1" });

    expect(user).toEqual(
      expect.objectContaining({ xp: 42, level: 3 })
    );
  });

  it("ciclo completo de vida", async () => {
    // Procesar mensajes
    for (let i = 0; i < 30; i++) {
      await levels.processMessage("user1", "guild1");
    }

    // Verificar usuario
    const user = await levels.getUser("user1", "guild1");
    expect(user).not.toBeNull();

    // Leaderboard
    const lb = await levels.getLeaderboard("guild1");
    expect(lb.length).toBeGreaterThanOrEqual(1);

    // Eliminar
    await levels.deleteUser("user1", "guild1");
    expect(await levels.getUser("user1", "guild1")).toBeNull();
  });
});
```

## Mock de Adaptador

Para tests donde necesitas control total sobre los datos:

```typescript
import type { LevelsAdapter, UserKey, LevelRecord, LeaderboardEntry,
  CooldownEntry, LevelReward, PrestigeEntry, GuildMultipliers } from "zeew-levels";

export class MockAdapter implements LevelsAdapter {
  private users = new Map<string, LevelRecord>();
  private cooldowns = new Map<string, CooldownEntry>();

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    return this.users.get(`${key.guild}:${key.user}`) ?? null;
  }

  async upsertUser(key: UserKey, data: Partial<LevelRecord>): Promise<void> {
    const existing = this.users.get(`${key.guild}:${key.user}`);
    this.users.set(`${key.guild}:${key.user}`, { ...existing, ...data, ...key } as LevelRecord);
  }

  async deleteUser(key: UserKey): Promise<void> {
    this.users.delete(`${key.guild}:${key.user}`);
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    return Array.from(this.users.values())
      .filter(u => u.guild === guild)
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, limit)
      .map(u => ({ user: u.user, guild: u.guild, xp: u.xp, level: u.level, totalXp: u.totalXp, prestige: u.prestige }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    return Array.from(this.users.values()).filter(u => u.guild === guild);
  }

  async deleteAll(guild: string): Promise<void> {
    for (const [key] of this.users) {
      if (key.startsWith(guild)) this.users.delete(key);
    }
  }

  async getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null> {
    return this.cooldowns.get(`${key.guild}:${key.user}:${action}`) ?? null;
  }

  async setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void> {
    this.cooldowns.set(`${key.guild}:${key.user}:${action}`, { ...key, action, expiresAt });
  }

  async deleteCooldown(key: UserKey, action: string): Promise<void> {
    this.cooldowns.delete(`${key.guild}:${key.user}:${action}`);
  }

  async getRewards(): Promise<LevelReward[]> { return []; }
  async setRewards(): Promise<void> {}
  async getPrestige(): Promise<PrestigeEntry | null> { return null; }
  async setPrestige(): Promise<void> {}
  async getMultipliers(): Promise<GuildMultipliers | null> { return null; }
  async setMultipliers(): Promise<void> {}
  async getGuildStats() { return { totalUsers: 0, totalXp: 0, totalMessages: 0 }; }
}
```

## Comandos de Test

```bash
# Vitest
npx vitest run

# Con coverage
npx vitest run --coverage

# Watch mode
npx vitest

# Un solo archivo
npx vitest run tests/unit/levels.test.ts
```
