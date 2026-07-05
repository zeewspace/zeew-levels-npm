# Instalación y Primeros Pasos

## Requisitos

- Node.js >= 18.0.0
- npm, yarn o pnpm

## Instalación

```bash
npm install zeew-levels
```

Los adaptadores de base de datos son **peer dependencies opcionales**. Instala solo el que necesites:

```bash
# JSON (ya incluido, sin dependencias extra)
# SQLite
npm install better-sqlite3
# MySQL
npm install mysql2
# MongoDB
npm install mongodb
# Redis
npm install ioredis
```

## Primer Uso

### 1. Importar y crear instancia

```typescript
import { ZeewLevels, JsonAdapter } from "zeew-levels";

const adapter = new JsonAdapter("./levels.json");
const levels = new ZeewLevels(adapter);
```

### 2. Configurar opciones (opcional)

```typescript
const levels = new ZeewLevels(adapter, {
  xpPerMessage: { min: 1, max: 5 },   // XP aleatorio por mensaje
  levelUpThreshold: 1000,               // XP para subir de nivel
  maxLevel: 100,                        // Nivel máximo
  cache: { enabled: true, maxSize: 5000, ttl: 300000 },
  cooldown: { messageCooldown: 5000 },
  prestige: { enabled: true, requiredLevel: 50, maxPrestige: 10 },
  xpCurve: { name: "exponential", base: 100, multiplier: 1.5 },
});
```

### 3. Inicializar (para SQL/Mongo)

```typescript
await levels.init(); // Crea tablas/colecciones si no existen
```

### 4. Usar en tu bot

```typescript
// En el evento messageCreate de Discord.js
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const result = await levels.processMessage(
    message.author.id,
    message.guild.id,
    message.member.roles.cache.map((r) => r.id) // Para multiplicadores
  );

  if (result.type === "level_up") {
    message.channel.send(
      `🎉 ¡${message.author} subió al nivel ${result.newLevel}!`
    );
  }
});
```

## Estructura de Datos

Cada usuario tiene este registro en la base de datos:

```typescript
interface LevelRecord {
  user: string;      // ID del usuario (Discord user ID)
  guild: string;     // ID del servidor (Discord guild ID)
  xp: number;        // XP actual en el nivel actual
  level: number;     // Nivel actual
  totalXp: number;   // XP total acumulado (nunca se resetea)
  prestige: number;  // Nivel de prestigio actual
  messages: number;  // Total de mensajes procesados
  lastXpAt: number;  // Timestamp del último XP ganado
}
```

## Flujo de XP

```
Mensaje recibido
    │
    ▼
¿Está en cooldown? ──Sí──→ Retornar xp: 0
    │
    No
    ▼
Calcular XP base (aleatorio entre min y max)
    │
    ▼
¿Tiene multiplicadores? ──Sí──→ Aplicar multiplicadores
    │
    No
    ▼
¿Tiene prestigio? ──Sí──→ Aplicar bonus de prestigio
    │
    No
    ▼
¿Existe el usuario? ──No──→ Crear con XP inicial
    │
    Sí
    ▼
¿Nivel máx alcanzado? ──Sí──→ Retornar xp: 0
    │
    No
    ▼
XP total ≥ umbral? ──Sí──→ SUBIR NIVEL + recompensas
    │
    No
    ▼
Agregar XP al usuario
```

## Siguientes Pasos

- [Adaptadores](./adapters.md) — Elige tu base de datos
- [API Core](./api/core.md) — Referencia completa de métodos
- [Guía Discord.js](./guides/discordjs.md) — Integración paso a paso
