## zeew-levels v2.0.0

Database-agnostic leveling system for Discord bots — completely rewritten in TypeScript.

### What's New

- **6 database adapters**: JSON (default, zero deps), SQLite, MySQL, MongoDB, Redis
- **Full TypeScript**: strict mode, declarations, source maps, IntelliSense
- **Dual publish**: CommonJS + ES Modules
- **Event hooks**: `onLevelUp` and `onXpGain` callbacks
- **New methods**: `addXp()`, `getUser()`, typed `processMessage()`
- **34 tests** passing (unit + E2E)

### Migration from v1

```diff
- const zeewLevels = require('zeew-levels');
- zeewLevels.conexion(mysqlConnection);
- zeewLevels.main.options({ limitXP: 1000, maxXP: 5 });
+ import { ZeewLevels, JsonAdapter } from 'zeew-levels';
+ const levels = new ZeewLevels(new JsonAdapter('./levels.json'));

- const result = await zeewLevels.main.newLevel(id, key);
+ const result = await levels.processMessage(user, guild);
```

### Why the rewrite?

v1 had critical issues: SQL injection, hanging promises, and was locked to MySQL. v2 fixes all bugs, supports any database, and adds proper TypeScript types.

### Credits

Built by [kamerr ezz](https://zeew.dev) — #ZeewDev #ZeewTeam
