# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/zeewspace/zeew-levels-npm/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/zeewspace/zeew-levels-npm/releases/tag/v2.0.0
[1.0.0]: https://github.com/zeewspace/zeew-levels-npm/releases/tag/v1.0.0
