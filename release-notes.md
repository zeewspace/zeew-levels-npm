## zeew-levels v2.1.1 — Documentation Update

### What's New

- **Modular Architecture Guide** — Patterns for bots with `src/commands/`, `src/events/`, `src/utils/` structure
- **16 Documentation Files** — API reference, guides, and examples optimized for RAG indexing
- **Singleton Pattern** — `getLevels()` for sharing instances across modular files
- **Command/Event Handler** — Dynamic loading patterns from filesystem

### Improved

- All docs updated to **discord.js v14.26** patterns:
  - `Events.*` constants instead of string literals
  - `REST({ version: "10" })` with explicit API version
  - `MessageFlags.Ephemeral` for ephemeral replies
  - Deploy commands as separate script
- **Bilingual README** — Spanish first, English second

### Documentation Structure

```
docs/
├── README.md                 ← Index
├── getting-started.md        ← Quick start
├── adapters.md               ← 6 adapters
├── api/                      ← 9 API reference files
├── guides/                   ← 5 guides
└── examples/                 ← 3 complete examples
```

### Upgrade

```bash
npm install zeew-levels@latest
```

No code changes — documentation only.

---

Built by [zeew.space](https://zeew.space) — #ZeewDev #ZeewTeam
