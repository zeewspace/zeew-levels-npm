# Crear Adaptador Personalizado

> Cómo implementar tu propio adaptador de base de datos.

## La Interfaz LevelsAdapter

Todo adaptador debe implementar esta interfaz con 22 métodos:

```typescript
import type {
  LevelsAdapter,
  UserKey,
  LevelRecord,
  LeaderboardEntry,
  CooldownEntry,
  LevelReward,
  PrestigeEntry,
  GuildMultipliers,
} from "zeew-levels";
```

## Métodos Requeridos

### Core (7 métodos)

```typescript
// Buscar usuario
findUser(key: UserKey): Promise<LevelRecord | null>;

// Crear o actualizar usuario
upsertUser(
  key: UserKey,
  data: Partial<Pick<LevelRecord,
    "xp" | "level" | "totalXp" | "prestige" | "messages" | "lastXpAt"
  >>
): Promise<void>;

// Eliminar usuario
deleteUser(key: UserKey): Promise<void>;

// Leaderboard
getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]>;

// Todos los usuarios de un guild
allUsers(guild: string): Promise<LevelRecord[]>;

// Eliminar todos los usuarios de un guild
deleteAll(guild: string): Promise<void>;

// Inicializar (opcional)
init?(): Promise<void>;
```

### Cooldowns (3 métodos)

```typescript
getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null>;
setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void>;
deleteCooldown(key: UserKey, action: string): Promise<void>;
```

### Rewards (2 métodos)

```typescript
getRewards(guild: string): Promise<LevelReward[]>;
setRewards(guild: string, rewards: LevelReward[]): Promise<void>;
```

### Prestige (2 métodos)

```typescript
getPrestige(key: UserKey): Promise<PrestigeEntry | null>;
setPrestige(key: UserKey, prestige: number): Promise<void>;
```

### Multipliers (2 métodos)

```typescript
getMultipliers(guild: string): Promise<GuildMultipliers | null>;
setMultipliers(guild: string, config: GuildMultipliers): Promise<void>;
```

### Stats (1 método)

```typescript
getGuildStats(guild: string): Promise<{
  totalUsers: number;
  totalXp: number;
  totalMessages: number;
}>;
```

## Ejemplo: Adaptador para Supabase

```typescript
import type {
  LevelsAdapter, UserKey, LevelRecord, LeaderboardEntry,
  CooldownEntry, LevelReward, PrestigeEntry, GuildMultipliers,
} from "zeew-levels";

export class SupabaseAdapter implements LevelsAdapter {
  private readonly client: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    const { createClient } = require("@supabase/supabase-js");
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async findUser(key: UserKey): Promise<LevelRecord | null> {
    const { data, error } = await this.client
      .from("levels")
      .select("*")
      .eq("user_id", key.user)
      .eq("guild_id", key.guild)
      .single();

    if (error || !data) return null;

    return {
      user: data.user_id,
      guild: data.guild_id,
      xp: data.xp,
      level: data.level,
      totalXp: data.total_xp,
      prestige: data.prestige,
      messages: data.messages,
      lastXpAt: data.last_xp_at,
    };
  }

  async upsertUser(key: UserKey, data: Partial<Pick<LevelRecord,
    "xp" | "level" | "totalXp" | "prestige" | "messages" | "lastXpAt"
  >>): Promise<void> {
    const { error } = await this.client
      .from("levels")
      .upsert({
        user_id: key.user,
        guild_id: key.guild,
        xp: data.xp ?? 0,
        level: data.level ?? 0,
        total_xp: data.totalXp ?? 0,
        prestige: data.prestige ?? 0,
        messages: data.messages ?? 0,
        last_xp_at: data.lastXpAt ?? 0,
      }, { onConflict: "user_id,guild_id" });

    if (error) throw error;
  }

  async deleteUser(key: UserKey): Promise<void> {
    const { error } = await this.client
      .from("levels")
      .delete()
      .eq("user_id", key.user)
      .eq("guild_id", key.guild);

    if (error) throw error;
  }

  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .from("levels")
      .select("user_id, guild_id, xp, level, total_xp, prestige")
      .eq("guild_id", guild)
      .order("level", { ascending: false })
      .order("xp", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((r: any) => ({
      user: r.user_id,
      guild: r.guild_id,
      xp: r.xp,
      level: r.level,
      totalXp: r.total_xp,
      prestige: r.prestige,
    }));
  }

  async allUsers(guild: string): Promise<LevelRecord[]> {
    const { data, error } = await this.client
      .from("levels")
      .select("*")
      .eq("guild_id", guild);

    if (error || !data) return [];

    return data.map((r: any) => ({
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
    const { error } = await this.client
      .from("levels")
      .delete()
      .eq("guild_id", guild);

    if (error) throw error;
  }

  async getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null> {
    const { data, error } = await this.client
      .from("cooldowns")
      .select("*")
      .eq("user_id", key.user)
      .eq("guild_id", key.guild)
      .eq("action", action)
      .single();

    if (error || !data) return null;

    return {
      user: data.user_id,
      guild: data.guild_id,
      action: data.action,
      expiresAt: data.expires_at,
    };
  }

  async setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void> {
    const { error } = await this.client
      .from("cooldowns")
      .upsert({
        user_id: key.user,
        guild_id: key.guild,
        action,
        expires_at: expiresAt,
      }, { onConflict: "user_id,guild_id,action" });

    if (error) throw error;
  }

  async deleteCooldown(key: UserKey, action: string): Promise<void> {
    const { error } = await this.client
      .from("cooldowns")
      .delete()
      .eq("user_id", key.user)
      .eq("guild_id", key.guild)
      .eq("action", action);

    if (error) throw error;
  }

  async getRewards(guild: string): Promise<LevelReward[]> {
    const { data, error } = await this.client
      .from("rewards")
      .select("*")
      .eq("guild_id", guild);

    if (error || !data) return [];

    return data.map((r: any) => ({
      level: r.level,
      roleId: r.role_id,
      type: r.type,
      amount: r.amount,
    }));
  }

  async setRewards(guild: string, rewards: LevelReward[]): Promise<void> {
    await this.client.from("rewards").delete().eq("guild_id", guild);

    if (rewards.length > 0) {
      const { error } = await this.client
        .from("rewards")
        .insert(rewards.map((r) => ({
          guild_id: guild,
          level: r.level,
          role_id: r.roleId,
          type: r.type,
          amount: r.amount,
        })));

      if (error) throw error;
    }
  }

  async getPrestige(key: UserKey): Promise<PrestigeEntry | null> {
    const { data, error } = await this.client
      .from("prestige")
      .select("*")
      .eq("user_id", key.user)
      .eq("guild_id", key.guild)
      .single();

    if (error || !data) return null;

    return {
      user: data.user_id,
      guild: data.guild_id,
      prestige: data.prestige,
      totalPrestiges: data.total_prestiges,
    };
  }

  async setPrestige(key: UserKey, prestige: number): Promise<void> {
    const existing = await this.getPrestige(key);

    const { error } = await this.client
      .from("prestige")
      .upsert({
        user_id: key.user,
        guild_id: key.guild,
        prestige,
        total_prestiges: (existing?.totalPrestiges ?? 0) + 1,
      }, { onConflict: "user_id,guild_id" });

    if (error) throw error;
  }

  async getMultipliers(guild: string): Promise<GuildMultipliers | null> {
    const { data, error } = await this.client
      .from("guild_config")
      .select("config")
      .eq("guild_id", guild)
      .single();

    if (error || !data) return null;

    return typeof data.config === "string"
      ? JSON.parse(data.config)
      : data.config;
  }

  async setMultipliers(guild: string, config: GuildMultipliers): Promise<void> {
    const { error } = await this.client
      .from("guild_config")
      .upsert({
        guild_id: guild,
        config: JSON.stringify(config),
      }, { onConflict: "guild_id" });

    if (error) throw error;
  }

  async getGuildStats(guild: string): Promise<{
    totalUsers: number;
    totalXp: number;
    totalMessages: number;
  }> {
    const { data, error } = await this.client
      .from("levels")
      .select("total_xp, messages")
      .eq("guild_id", guild);

    if (error || !data) return { totalUsers: 0, totalXp: 0, totalMessages: 0 };

    return {
      totalUsers: data.length,
      totalXp: data.reduce((sum: number, r: any) => sum + (r.total_xp ?? 0), 0),
      totalMessages: data.reduce((sum: number, r: any) => sum + (r.messages ?? 0), 0),
    };
  }
}
```

## Usar tu Adaptador

```typescript
import { ZeewLevels } from "zeew-levels";

const adapter = new SupabaseAdapter(SUPABASE_URL, SUPABASE_KEY);
const levels = new ZeewLevels(adapter);
await levels.init();

// Funciona igual que con cualquier adapter
const result = await levels.processMessage(user, guild);
```

## Esquema SQL para Supabase

```sql
CREATE TABLE levels (
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

CREATE TABLE cooldowns (
  user_id   TEXT NOT NULL,
  guild_id  TEXT NOT NULL,
  action    TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, guild_id, action)
);

CREATE TABLE rewards (
  guild_id TEXT NOT NULL,
  level    INTEGER NOT NULL,
  role_id  TEXT NOT NULL,
  type     TEXT NOT NULL DEFAULT 'role',
  amount   INTEGER,
  PRIMARY KEY (guild_id, level, role_id)
);

CREATE TABLE prestige (
  user_id        TEXT NOT NULL,
  guild_id       TEXT NOT NULL,
  prestige       INTEGER NOT NULL DEFAULT 0,
  total_prestiges INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, guild_id)
);

CREATE TABLE guild_config (
  guild_id TEXT NOT NULL PRIMARY KEY,
  config   JSONB NOT NULL
);
```

## Tips

1. **Todos los métodos son async** — Retornan `Promise<T>`
2. **`upsertUser` recibe un objeto parcial** — Solo los campos que cambian
3. **`init()` es opcional** — Solo necesitas crear tablas/índices
4. **Los errores deben lanzarse** — `throw new Error(...)` o `throw error`
5. **Usa queries parametrizadas** — Nunca uses interpolación de strings
