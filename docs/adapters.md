# Adaptadores de Base de Datos

zeew-levels es **agnóstico a la base de datos**. Puedes cambiar de JSON a MongoDB cambiando una línea de código.

## Adaptadores Disponibles

| Adaptador | Dependencia | Archivo | Ideal Para |
|-----------|-------------|---------|------------|
| `MemoryAdapter` | Ninguna | Solo memoria | Testing, uso efímero |
| `JsonAdapter` | Ninguna (usa `fs`) | `.json` en disco | Bots pequeños, prototipos |
| `SqliteAdapter` | `better-sqlite3` | `.db` en disco | Producción single-server |
| `MysqlAdapter` | `mysql2` | Servidor MySQL | Bases MySQL existentes |
| `MongoAdapter` | `mongodb` | MongoDB Atlas/local | Bots grandes, multi-servidor |
| `RedisAdapter` | `ioredis` | Redis server | Alto rendimiento, escalable |

## Uso por Adaptador

### MemoryAdapter

Para testing y uso temporal. Los datos se pierden al cerrar el proceso.

```typescript
import { ZeewLevels, MemoryAdapter } from "zeew-levels";

const adapter = new MemoryAdapter();
const levels = new ZeewLevels(adapter);

// Útil para tests
adapter.reset(); // Limpiar todos los datos
```

### JsonAdapter

Almacena todo en un archivo JSON. Ideal para bots pequeños o prototipos.

```typescript
import { ZeewLevels, JsonAdapter } from "zeew-levels";

const adapter = new JsonAdapter("./levels.json");
const levels = new ZeewLevels(adapter);
```

**Características:**
- Auto-crea el archivo si no existe
- Auto-crea directorios si no existen
- Escribe en disco en cada operación (write-through)
- Sin dependencias externas

### SqliteAdapter

Base de datos SQLite local. Ideal para bots en producción en un solo servidor.

```typescript
import { ZeewLevels, SqliteAdapter } from "zeew-levels";

const adapter = new SqliteAdapter("./levels.db");
const levels = new ZeewLevels(adapter);
await levels.init(); // Crea tablas si no existen
```

**Características:**
- Queries parametrizadas (sin SQL injection)
- UPSERT con `ON CONFLICT`
- Statements preparados (precompilados)
- Índices automáticos para leaderboard
- Método `close()` para cerrar conexión

**Esquema de tablas creadas:**

```sql
-- Tabla principal de usuarios
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

-- Cooldowns
CREATE TABLE cooldowns (
  user_id   TEXT NOT NULL,
  guild_id  TEXT NOT NULL,
  action    TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, guild_id, action)
);

-- Recompensas por nivel
CREATE TABLE rewards (
  guild_id TEXT NOT NULL,
  level    INTEGER NOT NULL,
  role_id  TEXT NOT NULL,
  type     TEXT NOT NULL DEFAULT 'role',
  amount   INTEGER,
  PRIMARY KEY (guild_id, level, role_id)
);

-- Prestigio
CREATE TABLE prestige (
  user_id        TEXT NOT NULL,
  guild_id       TEXT NOT NULL,
  prestige       INTEGER NOT NULL DEFAULT 0,
  total_prestiges INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, guild_id)
);

-- Configuración del servidor
CREATE TABLE guild_config (
  guild_id TEXT NOT NULL PRIMARY KEY,
  config   TEXT NOT NULL
);
```

### MysqlAdapter

Conexión a MySQL/MariaDB. Usa `mysql2/promise` para queries async.

```typescript
import { ZeewLevels, MysqlAdapter } from "zeew-levels";

// Opción 1: Con pool de conexión existente
const adapter = new MysqlAdapter(existingPool);

// Opción 2: Con configuración (crea pool automáticamente)
const adapter = new MysqlAdapter({
  host: "localhost",
  user: "root",
  password: "password",
  database: "mybot",
});

const levels = new ZeewLevels(adapter);
await levels.init(); // Crea tablas si no existen
```

**Características:**
- Acepta pool de conexión existente o config para crear uno nuevo
- Queries parametrizadas
- UPSERT con `ON DUPLICATE KEY UPDATE`
- Índices automáticos

**Esquema de tablas:** Similar a SQLite pero con tipos MySQL (`VARCHAR`, `INT`, `BIGINT`, `JSON`).

### MongoAdapter

Conexión a MongoDB. Usa el driver oficial de MongoDB.

```typescript
import { ZeewLevels, MongoAdapter } from "zeew-levels";

// Opción 1: Con URI de conexión
const adapter = new MongoAdapter("mongodb://localhost:27017", "mybot");

// Opción 2: Con instancia Db existente
const adapter = new MongoAdapter(existingDb);

const levels = new ZeewLevels(adapter);
await levels.init(); // Crea índices si no existen
```

**Características:**
- Acepta URI o instancia `Db` existente
- Índices únicos compuestos en `(user, guild)`
- TTL automático en cooldowns
- Aggregation pipeline para estadísticas
- Upserts con `$set` y `{ upsert: true }`

**Colecciones creadas:**

| Colección | Propósito |
|-----------|-----------|
| `levels` | Usuarios y niveles |
| `cooldowns` | Cooldowns activos |
| `rewards` | Recompensas por nivel |
| `prestige` | Datos de prestigio |
| `guild_config` | Configuración por servidor |

### RedisAdapter

Almacenamiento en Redis. Ideal para alto rendimiento y escalabilidad.

```typescript
import { ZeewLevels, RedisAdapter } from "zeew-levels";
import Redis from "ioredis";

const redis = new Redis();
const adapter = new RedisAdapter(redis);
const levels = new ZeewLevels(adapter);
```

**Características:**
- Keys con prefijo configurable: `zeew:levels:{guild}:{user}`
- Sorted sets para leaderboard (orden O(log N))
- Pipelines para operaciones batch
- TTL automático en cooldowns (expiran solos)
- Sin necesidad de `init()`

**Esquema de keys:**

```
zeew:levels:{guild}:{user}     → Hash (xp, level, totalXp, prestige, messages, lastXpAt)
zeew:levels:lb:{guild}         → Sorted Set (level como score)
zeew:levels:guild:{guild}      → Set de miembros
zeew:levels:cd:{guild}:{user}:{action} → String (timestamp, con TTL)
zeew:levels:rw:{guild}         → String (JSON de recompensas)
zeew:levels:pr:{guild}:{user}  → Hash (prestige, totalPrestiges)
zeew:levels:gc:{guild}         → String (JSON de configuración)
```

## Crear Adaptador Personalizado

Implementa la interfaz `LevelsAdapter`:

```typescript
import type { LevelsAdapter, UserKey, LevelRecord, LeaderboardEntry,
  CooldownEntry, LevelReward, PrestigeEntry, GuildMultipliers } from "zeew-levels";

class MyCustomAdapter implements LevelsAdapter {
  async findUser(key: UserKey): Promise<LevelRecord | null> { /* ... */ }
  async upsertUser(key: UserKey, data: Partial<Pick<LevelRecord,
    "xp" | "level" | "totalXp" | "prestige" | "messages" | "lastXpAt">>): Promise<void> { /* ... */ }
  async deleteUser(key: UserKey): Promise<void> { /* ... */ }
  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> { /* ... */ }
  async allUsers(guild: string): Promise<LevelRecord[]> { /* ... */ }
  async deleteAll(guild: string): Promise<void> { /* ... */ }
  async getCooldown(key: UserKey, action: string): Promise<CooldownEntry | null> { /* ... */ }
  async setCooldown(key: UserKey, action: string, expiresAt: number): Promise<void> { /* ... */ }
  async deleteCooldown(key: UserKey, action: string): Promise<void> { /* ... */ }
  async getRewards(guild: string): Promise<LevelReward[]> { /* ... */ }
  async setRewards(guild: string, rewards: LevelReward[]): Promise<void> { /* ... */ }
  async getPrestige(key: UserKey): Promise<PrestigeEntry | null> { /* ... */ }
  async setPrestige(key: UserKey, prestige: number): Promise<void> { /* ... */ }
  async getMultipliers(guild: string): Promise<GuildMultipliers | null> { /* ... */ }
  async setMultipliers(guild: string, config: GuildMultipliers): Promise<void> { /* ... */ }
  async getGuildStats(guild: string): Promise<{ totalUsers: number; totalXp: number; totalMessages: number }> { /* ... */ }
}
```

Ver [Crear Adaptador Personalizado](./guides/custom-adapter.md) para una guía completa.

## Comparativa de Rendimiento

| Operación | JSON | SQLite | MySQL | MongoDB | Redis |
|-----------|------|--------|-------|---------|-------|
| findUser | O(n) | O(1)* | O(1)* | O(1)* | O(1) |
| upsertUser | O(n) | O(1)* | O(1)* | O(1)* | O(1) |
| getLeaderboard | O(n log n) | O(1)* | O(1)* | O(1)* | O(log N) |
| Cooldown check | O(n) | O(1)* | O(1)* | O(1)* | O(1) |
| Persistencia | Disco | Disco | Servidor | Servidor | Servidor |

*Con índices apropiados (creados automáticamente por `init()`)
