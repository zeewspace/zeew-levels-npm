# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2026-07-05

### Added
- **LRU Cache** with configurable max size and TTL for lightning-fast reads
- **XP Multiplier system** — role-based, boost-based, guild-wide, and custom multipliers
- **Anti-Spam Cooldowns** — configurable per message, voice, and command actions
- **Level-Up Rewards** — auto-assign roles or grant XP at specific levels
- **Prestige System** — reset levels for permanent XP bonuses with configurable max prestige
- **XP Curves** — linear, quadratic, exponential, or custom formulas
- **Stats Calculator** — user stats with rank, progress, messages-to-next-level estimates
- **Discord.js Helpers** — ready-to-use embeds: rankCard, leaderboardEmbed, levelUpMessage, prestigeMessage, statsEmbed
- **Formatters** — progressBar, formatXp (K/M suffixes), formatLevel, rankSuffix
- `onPrestige` and `onCooldown` event hooks
- `processMessage()` now accepts optional `userRoles` array for multiplier calculation
- `getUserStats()` and `getGuildStats()` methods
- `xpForLevel()`, `xpProgress()`, `messagesToNextLevel()` utility methods
- `LevelRecord` now includes `totalXp`, `prestige`, `messages`, `lastXpAt`
- 52 new tests (86 total)

### Changed
- `upsertUser()` now takes a partial object instead of separate parameters
- `LevelsAdapter` interface expanded from 7 to 22 methods
- All adapters updated with cooldown, reward, prestige, multiplier, and stats support
- Package size: 15.1 kB → 42.0 kB (premium features)
- Tests: 34 → 86

## [2.0.0] - 2026-07-05

### Added
- Full TypeScript rewrite with `strict: true` and declaration maps
- Database-agnostic adapter pattern (6 adapters: Memory, JSON, SQLite, MySQL, MongoDB, Redis)
- `ZeewLevels` class with constructor injection (replaces global `conexion()` call)
- `processMessage()` method returning typed `MessageResult` discriminated union
- `addXp()` method for manual XP grants
- `getUser()` method returning full `LevelRecord`
- `onLevelUp` and `onXpGain` event hooks
- `LevelsAdapter` interface for custom adapter implementations
- Dual CJS + ESM publish with `exports` field
- 34 tests (unit + E2E) with vitest
- Migration guide from v1 to v2

### Changed
- `getLevel()` and `getXp()` now return `null` instead of `false` for non-existent users
- `getLeaderboard()` is scoped per guild, not global
- XP gain is now always applied (removed 80% skip chance from v1)
- Level-up threshold and XP range are configurable via constructor options

### Fixed
- SQL injection vulnerabilities in Sets.js and getTop()
- Promises that hung forever in newLevel() for most code paths
- `resolve(res[0].lvl + res[0].lvl)` returning doubled level instead of new level
- `module.exports` overwrite bug in Main.js
- Missing `return` after `resolve(false)` in Gets.js causing TypeError
- Case sensitivity mismatch between `levels` and `Levels` table names
- `delete.all()` dropping entire table globally instead of per guild

### Removed
- MySQL-only architecture (replaced with pluggable adapters)
- Global mutable state (`conexionMYSQL`, `limit`, `max`)
- Callback-based database queries (replaced with async/await)

## [1.0.0] - 2024-01-01

### Added
- Initial release with MySQL support
- `conexion()`, `main.newLevel()`, `get.Level()`, `get.XP()`, `get.TOP()`
- `set.Level()`, `set.XP()`, `delete.user()`, `delete.all()`

[Unreleased]: https://github.com/zeewspace/zeew-levels-npm/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/zeewspace/zeew-levels-npm/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/zeewspace/zeew-levels-npm/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/zeewspace/zeew-levels-npm/releases/tag/v1.0.0
