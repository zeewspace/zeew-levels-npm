# Migración de v1 a v2

> Guía completa para migrar de zeew-levels v1 a v2.

## Cambios Principales

| v1 | v2 |
|----|-----|
| Solo MySQL | 6 adaptadores (JSON, SQLite, MySQL, MongoDB, Redis, Memory) |
| `conexion(db)` global | `new ZeewLevels(adapter)` por instancia |
| `main.options({limitXP, maxXP})` | Opciones en constructor |
| `main.newLevel(id, key)` | `processMessage(user, guild, roles?)` |
| `get.Level(id, key)` → `number \| false` | `getLevel(user, guild)` → `number \| null` |
| `get.XP(id, key)` → `number \| false` | `getXp(user, guild)` → `number \| null` |
| `set.Level(id, key, lvl)` | `setLevel(user, guild, level)` |
| `set.XP(id, key, xp)` | `setXp(user, guild, xp)` |
| `delete.user(id, key)` | `deleteUser(user, guild)` |
| `delete.all()` | `deleteAll(guild)` |
| Callbacks (Promise manual) | async/await nativo |
| Sin TypeScript | TypeScript completo con tipos |

## Migración Paso a Paso

### 1. Instalar v2

```bash
npm install zeew-levels@latest
```

Si usas MySQL, instala también:

```bash
npm install mysql2
```

### 2. Cambiar Imports

```diff
- const zeewLevels = require('zeew-levels');
+ import { ZeewLevels, MysqlAdapter } from 'zeew-levels';
```

### 3. Cambiar Inicialización

```diff
- const mysql = require('mysql2');
- const conexion = mysql.createConnection({ host, user, database });
- zeewLevels.conexion(conexion);
+ const adapter = new MysqlAdapter({ host, user, password, database });
+ const levels = new ZeewLevels(adapter);
+ await levels.init();
```

### 4. Cambiar Opciones

```diff
- zeewLevels.main.options({ limitXP: 1000, maxXP: 5 });
+ const levels = new ZeewLevels(adapter, {
+   xpPerMessage: { min: 1, max: 5 },
+   levelUpThreshold: 1000,
+ });
```

### 5. Cambiar processMessage (newLevel)

```diff
- const result = await zeewLevels.main.newLevel(id, key);
+ const result = await levels.processMessage(user, guild, userRoles);
+
+ if (result.type === "level_up") {
+   console.log(`¡Nivel ${result.newLevel}!`);
+ }
```

### 6. Cambiar Getters

```diff
- const level = await zeewLevels.get.Level(id, key);
+ const level = await levels.getLevel(user, guild);

- const xp = await zeewLevels.get.XP(id, key);
+ const xp = await levels.getXp(user, guild);
```

### 7. Cambiar Setters

```diff
- await zeewLevels.set.Level(id, key, 10);
+ await levels.setLevel(user, guild, 10);

- await zeewLevels.set.XP(id, key, 500);
+ await levels.setXp(user, guild, 500);
```

### 8. Cambiar Delete

```diff
- await zeewLevels.delete.user(id, key);
+ await levels.deleteUser(user, guild);

- await zeewLevels.delete.all();
+ await levels.deleteAll(guild);
```

### 9. Cambiar Leaderboard

```diff
- const top = await zeewLevels.get.TOP(key, 10);
+ const top = await levels.getLeaderboard(guild, 10);
```

## Bugs Corregidos en v2

Si usabas v1, estos bugs ya no existen:

1. **SQL injection** — v2 usa queries parametrizadas en todos los adapters
2. **Promesas colgadas** — `newLevel()` nunca resolvía en algunos paths
3. **Resolve incorrecto** — Retornaba `level * 2` en vez de `level + 1`
4. **Case sensitivity** — `levels` vs `Levels` unificado
5. **`delete.all()` global** — Ahora es por servidor
6. **Estado global mutable** — Ahora es por instancia

## Migrar de MySQL a Otro Adapter

Si quieres cambiar de MySQL a otro adaptador:

```diff
- const adapter = new MysqlAdapter({ host, user, password, database });
+ const adapter = new JsonAdapter("./levels.json");
+ // O: new SqliteAdapter("./levels.db");
+ // O: new MongoAdapter(uri, dbName);
+ // O: new RedisAdapter(redis);

const levels = new ZeewLevels(adapter);
```

**Nota:** Los datos no se migran automáticamente. Necesitas exportar de un adapter e importar al otro, o empezar desde cero.

## Compatibilidad

- v2 es **breaking change** completo con v1
- No hay compatibility layer ni deprecation warnings
- Si necesitas mantener v1, usa `zeew-levels@1.x`
