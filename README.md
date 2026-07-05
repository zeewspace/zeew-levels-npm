<div align="center">

# zeew-levels

**The premium database-agnostic leveling system for Discord bots**

[![npm](https://img.shields.io/npm/v/zeew-levels?style=flat-square&color=blue)](https://www.npmjs.com/package/zeew-levels)
[![license](https://img.shields.io/npm/l/zeew-levels?style=flat-square)](LICENSE)
[![downloads](https://img.shields.io/npm/dt/zeew-levels?style=flat-square&color=green)](https://www.npmjs.com/package/zeew-levels)
[![tests](https://img.shields.io/badge/tests-86%20passing-brightgreen?style=flat-square)](#testing)

**[Documentation](#api)** · **[Discord](https://zeew.space/discord)** · **[Report Bug](https://github.com/zeewspace/zeew-levels-npm/issues)** · **[npm](https://www.npmjs.com/package/zeew-levels)**

---

</div>

## Features

- **6 Database Adapters** — JSON, SQLite, MySQL, MongoDB, Redis, Memory
- **XP Multipliers** — Role-based, boost-based, guild-wide bonuses
- **Anti-Spam Cooldowns** — Configurable per message, voice, commands
- **Level-Up Rewards** — Auto-assign roles at specific levels
- **Prestige System** — Reset levels for permanent XP bonuses
- **LRU Cache** — Lightning-fast reads with automatic TTL expiration
- **XP Curves** — Linear, quadratic, exponential, or custom formulas
- **Discord.js Helpers** — Ready-to-use embeds and rank cards
- **Full TypeScript** — Strict mode, declarations, source maps
- **Dual CJS + ESM** — Works everywhere
- **86 Tests** — Unit + E2E coverage

## Quick Start

```bash
npm install zeew-levels
```

### JSON (zero dependencies)

```typescript
import { ZeewLevels, JsonAdapter } from "zeew-levels";

const levels = new ZeewLevels(new JsonAdapter("./levels.json"));

// In your message event
const result = await levels.processMessage(message.author.id, message.guild.id);

if (result.type === "level_up") {
  message.channel.send(`Level up! You're now level ${result.newLevel}!`);
}
```

### SQLite

```typescript
import { ZeewLevels, SqliteAdapter } from "zeew-levels";

const levels = new ZeewLevels(new SqliteAdapter("./levels.db"));
```

### MySQL

```typescript
import { ZeewLevels, MysqlAdapter } from "zeew-levels";

const adapter = new MysqlAdapter({ host: "localhost", user: "root", password: "pass", database: "bot" });
const levels = new ZeewLevels(adapter);
await levels.init();
```

### MongoDB

```typescript
import { ZeewLevels, MongoAdapter } from "zeew-levels";

const levels = new ZeewLevels(new MongoAdapter("mongodb://localhost:27017", "bot"));
await levels.init();
```

### Redis

```typescript
import { ZeewLevels, RedisAdapter } from "zeew-levels";
import Redis from "ioredis";

const levels = new ZeewLevels(new RedisAdapter(new Redis()));
```

## Premium Features

### XP Multipliers

Give bonus XP to boosters, VIP roles, or custom conditions:

```typescript
// Role-based multiplier (2x XP for "VIP" role)
await levels.addMultiplier("guild-id", {
  id: "vip-role",
  value: 2,
  source: "role",
  roleId: "1234567890",
});

// Boost multiplier (1.5x for server boosters)
await levels.addMultiplier("guild-id", {
  id: "booster",
  value: 1.5,
  source: "boost",
});

// Process messages with user roles
const result = await levels.processMessage(user, guild, userRoles);
```

### Anti-Spam Cooldowns

```typescript
const levels = new ZeewLevels(adapter, {
  cooldown: {
    messageCooldown: 5000,  // 5 seconds between messages
    voiceCooldown: 60000,   // 1 minute between voice XP
    commandCooldown: 3000,  // 3 seconds between commands
  },
});

// Check cooldown manually
const { onCooldown, retryIn } = await levels.cooldowns.isOnCooldown(key, "message");
```

### Level-Up Rewards

```typescript
// Add a role reward at level 10
await levels.addReward("guild-id", {
  level: 10,
  roleId: "1234567890",
  type: "role",
});

// Rewards are automatically processed on level up
const result = await levels.processMessage(user, guild);
if (result.type === "level_up") {
  console.log(result.rewards); // [{ level: 10, roleId: "1234567890", type: "role" }]
  // Assign roles to your Discord member here
}
```

### Prestige System

```typescript
const levels = new ZeewLevels(adapter, {
  prestige: {
    enabled: true,
    requiredLevel: 50,     // Must be level 50 to prestige
    maxPrestige: 10,       // Max 10 prestiges
    resetLevel: 1,         // Reset to level 1
    bonusPerPrestige: 0.1, // +10% XP per prestige
  },
});

// Check if user can prestige
const { can, reason } = await levels.canPrestige(user, guild);

// Prestige!
const result = await levels.doPrestige(user, guild);
if (result.type === "prestige") {
  console.log(`Prestige ${result.newPrestige}! Bonus: +${result.bonus * 100}%`);
}
```

### XP Curves

```typescript
import { createXpCalculator } from "zeew-levels";

// Exponential curve: XP grows faster per level
const levels = new ZeewLevels(adapter, {
  xpCurve: { name: "exponential", base: 100, multiplier: 1.5 },
});

// Custom formula
const levels = new ZeewLevels(adapter, {
  xpCurve: {
    name: "custom",
    custom: (level) => Math.floor(100 * Math.pow(level, 1.8)),
  },
});
```

### Cache

```typescript
const levels = new ZeewLevels(adapter, {
  cache: {
    enabled: true,
    maxSize: 5000,   // Max cached users
    ttl: 300000,     // 5 minute TTL
  },
});
```

### Discord.js Helpers

```typescript
import { rankCard, leaderboardEmbed, levelUpMessage } from "zeew-levels";

// Generate rank embed
const stats = await levels.getUserStats(user, guild);
const embed = rankCard(stats, message.author.username, message.author.displayAvatarURL());
message.reply({ embeds: [embed] });

// Leaderboard
const leaderboard = await levels.getLeaderboard(guild, 20);
const embed = leaderboardEmbed(leaderboard, message.guild.name, 1, 10);
message.reply({ embeds: [embed] });
```

### Hooks

```typescript
levels.onLevelUp = (user, guild, newLevel, rewards) => {
  console.log(`${user} reached level ${newLevel} in ${guild}`);
  // Send notification, assign roles, etc.
};

levels.onXpGain = (user, guild, xp, multiplied) => {
  if (multiplied) console.log(`${user} got ${xp} XP (multiplied!)`);
};

levels.onPrestige = (user, guild, newPrestige) => {
  console.log(`${user} prestiged to ${newPrestige}!`);
};
```

## API

### Core

| Method | Description |
|--------|-------------|
| `processMessage(user, guild, roles?)` | Process a message, grant XP with multipliers & cooldowns |
| `addXp(user, guild, amount)` | Manually add XP |
| `getLevel(user, guild)` | Get user's level |
| `getXp(user, guild)` | Get user's current XP |
| `getUser(user, guild)` | Get full user record |
| `getLeaderboard(guild, limit?)` | Get sorted leaderboard |
| `getUserStats(user, guild)` | Get detailed stats with rank & progress |
| `getGuildStats(guild)` | Get guild-wide statistics |
| `setLevel(user, guild, level)` | Set user's level |
| `setXp(user, guild, xp)` | Set user's XP |
| `deleteUser(user, guild)` | Delete a user |
| `deleteAll(guild)` | Delete all users in guild |

### Prestige

| Method | Description |
|--------|-------------|
| `doPrestige(user, guild)` | Execute prestige |
| `canPrestige(user, guild)` | Check if user can prestige |

### Rewards

| Method | Description |
|--------|-------------|
| `addReward(guild, reward)` | Add a level reward |
| `removeReward(guild, level, roleId)` | Remove a reward |
| `getRewards(guild)` | Get all rewards |

### Multipliers

| Method | Description |
|--------|-------------|
| `addMultiplier(guild, multiplier)` | Add a multiplier |
| `removeMultiplier(guild, id)` | Remove a multiplier |

### Utilities

| Method | Description |
|--------|-------------|
| `xpForLevel(level)` | Calculate XP needed for a level |
| `xpProgress(user, guild)` | Get XP progress (0-1) |
| `messagesToNextLevel(user, guild)` | Estimate messages needed |

## Adapters

| Adapter | Dependency | Best For |
|---------|-----------|----------|
| `MemoryAdapter` | None | Testing, ephemeral |
| `JsonAdapter` | None (fs) | Small bots, prototyping |
| `SqliteAdapter` | `better-sqlite3` | Single-server production |
| `MysqlAdapter` | `mysql2` | Existing MySQL databases |
| `MongoAdapter` | `mongodb` | Large bots, multi-server |
| `RedisAdapter` | `ioredis` | High performance, scalable |

## Migration from v1

```diff
- const zeewLevels = require('zeew-levels');
- zeewLevels.conexion(mysqlConnection);
- zeewLevels.main.options({ limitXP: 1000, maxXP: 5 });
+ import { ZeewLevels, JsonAdapter } from 'zeew-levels';
+ const levels = new ZeewLevels(new JsonAdapter('./levels.json'));

- const result = await zeewLevels.main.newLevel(id, key);
+ const result = await levels.processMessage(user, guild);

- zeewLevels.get.Level(id, key)
+ await levels.getLevel(user, guild)

- zeewLevels.set.XP(id, key, xp)
+ await levels.setXp(user, guild, xp)
```

## Community

- **Discord**: [zeew.space/discord](https://zeew.space/discord)
- **Website**: [zeew.space](https://zeew.space)
- **Email**: team@zeew.space
- **GitHub**: [github.com/zeewspace/zeew-levels-npm](https://github.com/zeewspace/zeew-levels-npm)

## License

[PolyForm Noncommercial License 1.0.0](LICENSE)

---

<div align="center">

**Built with care by [zeew.space](https://zeew.space) — #ZeewDev #ZeewTeam**

</div>
