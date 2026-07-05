# Mejores Prácticas y Performance

> Guía de optimización y patrones recomendados.

## Performance

### 1. Habilita Caché

Para bots con >100 mensajes/minuto:

```typescript
const levels = new ZeewLevels(adapter, {
  cache: {
    enabled: true,
    maxSize: 5000,    // Ajusta según tu base de datos
    ttl: 300000,      // 5 minutos
  },
});
```

**Impacto:** Reduce lecturas a DB en ~80% para usuarios repetidos.

### 2. Usa SQLite o Redis

- **SQLite:** Mejor que JSON para bots con >50 usuarios
- **Redis:** Mejor que MySQL/MongoDB para alto rendimiento
- **JSON:** Solo para prototipos o bots muy pequeños

### 3. Batch Operations

Si necesitas procesar múltiples usuarios, usa `Promise.all`:

```typescript
// Procesar mensajes de múltiples usuarios en paralelo
const results = await Promise.all(
  userIds.map(id => levels.processMessage(id, guild))
);
```

### 4. Configura Cooldowns Apropiados

```typescript
const levels = new ZeewLevels(adapter, {
  cooldown: {
    messageCooldown: 5000,  // 5s previene spam pero no frustra
    voiceCooldown: 60000,   // 1min es estándar para voz
    commandCooldown: 3000,  // 3s para comandos
  },
});
```

### 5. Paginación de Leaderboards

```typescript
// No cargues el leaderboard completo si solo muestras 10
const page = 1;
const perPage = 10;
const allEntries = await levels.getLeaderboard(guild, 100); // Máximo razonable
const pageEntries = allEntries.slice((page - 1) * perPage, page * perPage);
```

## Seguridad

### 1. Nunca Confíes en Input del Usuario

```typescript
// ❌ MAL
const level = parseInt(message.content.split(" ")[1]);

// ✅ BIEN
const level = interaction.options.getInteger("level");
if (level === null || level < 0 || level > 1000) {
  return interaction.reply({ content: "Nivel inválido", ephemeral: true });
}
```

### 2. Valida IDs de Discord

```typescript
// Verificar que el ID sea un Snowflake válido
function isValidSnowflake(id: string): boolean {
  return /^\d{17,20}$/.test(id);
}

if (!isValidSnowflake(targetUser)) {
  return interaction.reply({ content: "ID inválido", ephemeral: true });
}
```

### 3. No Expongas Datos Sensibles

```typescript
// ❌ MAL — Mostrar IP del servidor de DB
console.log(`DB: ${process.env.DB_HOST}`);

// ✅ BIEN — Solo mostrar datos del usuario
const stats = await levels.getUserStats(user, guild);
```

## Arquitectura

### Patrón: Separar Lógica del Bot

```typescript
// ❌ MAL — Todo en un archivo
client.on(Events.MessageCreate, async (message) => {
  // 200 líneas de lógica
});

// ✅ BIEN — Separar responsabilidades
// levels-handler.ts
export async function handleMessage(message: Message, levels: ZeewLevels) {
  const result = await levels.processMessage(/* ... */);
  return result;
}

// commands.ts
export async function handleRank(interaction: ChatInputCommandInteraction, levels: ZeewLevels) {
  const stats = await levels.getUserStats(/* ... */);
  return stats;
}

// index.ts
client.on(Events.MessageCreate, (message) => handleMessage(message, levels));
client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction, levels));
```

### Patrón: Singleton de Levels

```typescript
// levels-instance.ts
import { ZeewLevels, MysqlAdapter } from "zeew-levels";

let instance: ZeewLevels | null = null;

export function getLevels(): ZeewLevels {
  if (!instance) {
    const adapter = new MysqlAdapter({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    instance = new ZeewLevels(adapter, {
      cache: { enabled: true },
      cooldown: { messageCooldown: 5000 },
    });
  }

  return instance;
}
```

### Patrón: Configuración por Guild

```typescript
// Configurar multiplicadores y recompensas al iniciar
client.once(Events.ClientReady, async (readyClient) => {
  for (const guild of readyClient.guilds.cache.values()) {
    // Cargar configuración desde un JSON o DB
    const config = await loadGuildConfig(guild.id);

    if (config.vipRoleId) {
      await levels.addMultiplier(guild.id, {
        id: "vip",
        value: config.vipMultiplier ?? 2,
        source: "role",
        roleId: config.vipRoleId,
      });
    }

    for (const reward of config.rewards ?? []) {
      await levels.addReward(guild.id, reward);
    }
  }
});
```

## Errores Comunes

### 1. Olvidar `await`

```typescript
// ❌ MAL — La promise se pierde
levels.processMessage(user, guild);

// ✅ BIEN
await levels.processMessage(user, guild);
```

### 2. No Verificar `result.type`

```typescript
// ❌ MAL — `newLevel` no existe en XpGainResult
const result = await levels.processMessage(user, guild);
console.log(result.newLevel); // undefined!

// ✅ BIEN
const result = await levels.processMessage(user, guild);
if (result.type === "level_up") {
  console.log(result.newLevel);
}
```

### 3. No Manejar Usuarios Nuevos

```typescript
// ❌ MAL — Puede retornar null
const level = await levels.getLevel(user, guild);
console.log(level.toFixed(1)); // Error si level es null

// ✅ BIEN
const level = await levels.getLevel(user, guild);
if (level !== null) {
  console.log(level);
}
```

### 4. No Inicializar Adaptadores SQL

```typescript
// ❌ MAL — Las tablas no existen
const adapter = new SqliteAdapter("./levels.db");
const levels = new ZeewLevels(adapter);
await levels.processMessage(user, guild); // Error!

// ✅ BIEN
const adapter = new SqliteAdapter("./levels.db");
const levels = new ZeewLevels(adapter);
await levels.init(); // Crea tablas
await levels.processMessage(user, guild); // Funciona
```

## Monitoreo

### Logging

```typescript
const levels = new ZeewLevels(adapter, {
  logger: {
    info: (...args) => console.log("[INFO]", ...args),
    warn: (...args) => console.warn("[WARN]", ...args),
    error: (...args) => console.error("[ERROR]", ...args),
    debug: (...args) => {
      if (process.env.DEBUG) console.log("[DEBUG]", ...args);
    },
  },
});
```

### Métricas

```typescript
// Stats del servidor periódicamente
setInterval(async () => {
  const stats = await levels.getGuildStats(guildId);
  console.log(`Guild: ${stats.totalUsers} users, ${stats.totalXp} total XP`);
}, 300000); // Cada 5 minutos
```

## Checklist de Producción

- [ ] Adaptador apropiado (no JSON para producción)
- [ ] Caché habilitado para bots grandes
- [ ] Cooldowns configurados
- [ ] `init()` llamado al iniciar
- [ ] Roles de recompensa configurados
- [ ] Hooks para notificaciones
- [ ] Logging habilitado
- [ ] Error handling en comandos
- [ ] Validación de input de usuario
- [ ] Permisos del bot verificados
