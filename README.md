# zeew-levels

> Database-agnostic leveling system for Discord bots — JSON, SQLite, MySQL, MongoDB, Redis

[![npm](https://img.shields.io/npm/v/zeew-levels)](https://www.npmjs.com/package/zeew-levels)
[![license](https://img.shields.io/npm/l/zeew-levels)](LICENSE)

---

## Instalación

```bash
npm install zeew-levels
```

Los adaptadores de base de datos son **peer dependencies opcionales**. Instala solo el que necesites:

```bash
# JSON (sin dependencias extra — ya incluido)
# SQLite
npm install better-sqlite3
# MySQL
npm install mysql2
# MongoDB
npm install mongodb
# Redis
npm install ioredis
```

---

## Inicio rápido

### JSON (archivo en disco)

```typescript
import { ZeewLevels, JsonAdapter } from "zeew-levels";

const adapter = new JsonAdapter("./levels.json");
const levels = new ZeewLevels(adapter);

// En tu evento de mensaje
const result = await levels.processMessage(message.author.id, message.guild.id);

if (result.type === "level_up") {
  message.channel.send(`¡${message.author} subió al nivel ${result.newLevel}!`);
}
```

### SQLite

```typescript
import { ZeewLevels, SqliteAdapter } from "zeew-levels";

const adapter = new SqliteAdapter("./levels.db");
const levels = new ZeewLevels(adapter);

const result = await levels.processMessage(message.author.id, message.guild.id);
```

### MySQL

```typescript
import { ZeewLevels, MysqlAdapter } from "zeew-levels";

const adapter = new MysqlAdapter({
  host: "localhost",
  user: "root",
  password: "password",
  database: "mybot",
});

const levels = new ZeewLevels(adapter);
await levels.init(); // Crea la tabla si no existe
```

### MongoDB

```typescript
import { ZeewLevels, MongoAdapter } from "zeew-levels";

const adapter = new MongoAdapter("mongodb://localhost:27017", "mybot");
const levels = new ZeewLevels(adapter);
await levels.init();
```

### Redis

```typescript
import { ZeewLevels, RedisAdapter } from "zeew-levels";
import Redis from "ioredis";

const redis = new Redis();
const adapter = new RedisAdapter(redis);
const levels = new ZeewLevels(adapter);
```

---

## Configuración

```typescript
const levels = new ZeewLevels(adapter, {
  xpPerMessage: { min: 1, max: 5 },  // XP aleatorio por mensaje (default: 1-5)
  levelUpThreshold: 1000,             // XP necesaria para subir de nivel (default: 1000)
  logger: console,                    // Logger opcional
});
```

---

## API

### Procesar mensajes

```typescript
const result = await levels.processMessage(user, guild);
// result.type === "xp_gain"   → { type: "xp_gain", xp: number, totalXp: number }
// result.type === "level_up"  → { type: "level_up", newLevel: number, xp: number }
```

### Agregar XP manual

```typescript
const result = await levels.addXp(user, guild, 50);
```

### Obtener datos

```typescript
const level = await levels.getLevel(user, guild);   // number | null
const xp = await levels.getXp(user, guild);         // number | null
const user = await levels.getUser(user, guild);     // LevelRecord | null
const leaderboard = await levels.getLeaderboard(guild, 10); // LeaderboardEntry[]
```

### Establecer datos

```typescript
await levels.setLevel(user, guild, 5);
await levels.setXp(user, guild, 250);
```

### Eliminar

```typescript
await levels.deleteUser(user, guild);
await levels.deleteAll(guild);
```

### Hooks de eventos

```typescript
levels.onLevelUp = (user, guild, newLevel) => {
  console.log(`${user} reached level ${newLevel} in ${guild}`);
};

levels.onXpGain = (user, guild, xp) => {
  console.log(`${user} gained ${xp} xp in ${guild}`);
};
```

---

## Adaptadores

| Adapter | Dependencia | Uso ideal |
|---------|-------------|-----------|
| `MemoryAdapter` | Ninguna | Testing, uso efímero |
| `JsonAdapter` | Ninguna (fs) | Bots pequeños, prototipos |
| `SqliteAdapter` | `better-sqlite3` | Producción single-server |
| `MysqlAdapter` | `mysql2` | Producción, bases MySQL existentes |
| `MongoAdapter` | `mongodb` | Bots grandes, multi-servidor |
| `RedisAdapter` | `ioredis` | Alto rendimiento, escalable |

### Crear tu propio adaptador

Implementa la interfaz `LevelsAdapter`:

```typescript
import type { LevelsAdapter, UserKey, LevelRecord, LeaderboardEntry } from "zeew-levels";

class MyAdapter implements LevelsAdapter {
  async findUser(key: UserKey): Promise<LevelRecord | null> { /* ... */ }
  async upsertUser(key: UserKey, xp: number, level: number): Promise<void> { /* ... */ }
  async deleteUser(key: UserKey): Promise<void> { /* ... */ }
  async getLeaderboard(guild: string, limit: number): Promise<LeaderboardEntry[]> { /* ... */ }
  async allUsers(guild: string): Promise<LevelRecord[]> { /* ... */ }
  async deleteAll(guild: string): Promise<void> { /* ... */ }
}
```

---

## Migración de v1 → v2

| v1 | v2 |
|----|-----|
| `zeewLevels.conexion(db)` | `new ZeewLevels(new JsonAdapter(...))` |
| `zeewLevels.main.options({limitXP, maxXP})` | `new ZeewLevels(adapter, { levelUpThreshold, xpPerMessage })` |
| `zeewLevels.main.newLevel(id, key)` | `await levels.processMessage(user, guild)` |
| `zeewLevels.get.Level(id, key)` | `await levels.getLevel(user, guild)` |
| `zeewLevels.get.XP(id, key)` | `await levels.getXp(user, guild)` |
| `zeewLevels.set.Level(id, key, lvl)` | `await levels.setLevel(user, guild, level)` |
| `zeewLevels.set.XP(id, key, xp)` | `await levels.setXp(user, guild, xp)` |
| `zeewLevels.delete.user(id, key)` | `await levels.deleteUser(user, guild)` |
| `zeewLevels.delete.all()` | `await levels.deleteAll(guild)` |

**Cambios importantes:**
- Ya no se necesita `mysql2` — el adaptador por defecto es JSON
- `processMessage()` retorna un resultado tipado en vez de `undefined`
- `getLevel()` y `getXp()` retornan `null` en vez de `false`
- `getLeaderboard()` se llama por guild, no por key global
- Eliminados los bugs de SQL injection y promesas colgadas de v1

---

## Licencia

[PolyForm Noncommercial License 1.0.0](LICENSE)

#ZeewDev #ZeewTeam
