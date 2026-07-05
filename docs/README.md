# zeew-levels — Documentación Completa

> Sistema de niveles premium multi-base de datos para bots de Discord.
> Diseñado para ser indexado por RAG (Retrieval-Augmented Generation).

## Navegación

### Inicio

- [Instalación y Primeros Pasos](./getting-started.md)
- [Adaptadores de Base de Datos](./adapters.md)

### Referencia de API

- [Clase Principal ZeewLevels](./api/core.md)
- [Tipos TypeScript](./api/types.md)
- [Caché LRU](./api/cache.md)
- [Multiplicadores de XP](./api/multipliers.md)
- [Cooldowns Anti-Spam](./api/cooldowns.md)
- [Recompensas por Nivel](./api/rewards.md)
- [Sistema de Prestigio](./api/prestige.md)
- [Estadísticas y Utilidades](./api/stats.md)
- [Helpers para Discord.js](./api/discord.md)

### Guías

- [Migración de v1 a v2](./guides/migration-v1.md)
- [Integración con Discord.js](./guides/discordjs.md)
- [Crear Adaptador Personalizado](./guides/custom-adapter.md)
- [Mejores Prácticas y Performance](./guides/best-practices.md)

### Ejemplos

- [Bot Básico](./examples/basic-bot.md)
- [Bot Premium Completo](./examples/premium-bot.md)
- [Patrones de Testing](./examples/testing.md)

## Resumen Rápido

```typescript
import { ZeewLevels, JsonAdapter } from "zeew-levels";

const levels = new ZeewLevels(new JsonAdapter("./levels.json"));

// En tu evento de mensaje
const result = await levels.processMessage(user, guild, userRoles);

if (result.type === "level_up") {
  // Asignar roles, enviar embed, etc.
}
```

## Arquitectura

```
ZeewLevels (clase principal)
├── adapter (LevelsAdapter)        ← Capa de persistencia
├── multipliers (MultiplierManager) ← XP por rol/boost/guild
├── cooldowns (CooldownManager)     ← Anti-spam
├── rewards (RewardManager)         ← Recompensas por nivel
├── prestige (PrestigeManager)      ← Sistema de prestigio
├── stats (StatsCalculator)         ← Estadísticas
├── cache (LruCache)                ← Performance
└── utils                           ← Formateo, cálculos
```

## Contacto

- **Discord**: [zeew.space/discord](https://zeew.space/discord)
- **Sitio Web**: [zeew.space](https://zeew.space)
- **Email**: team@zeew.space
- **GitHub**: [github.com/zeewspace/zeew-levels-npm](https://github.com/zeewspace/zeew-levels-npm)
