# API Core — Clase ZeewLevels

> Referencia completa de la clase principal `ZeewLevels`.

## Importación

```typescript
import { ZeewLevels } from "zeew-levels";
```

## Constructor

```typescript
new ZeewLevels(adapter: LevelsAdapter, options?: LevelsOptions)
```

### Parámetros

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `adapter` | `LevelsAdapter` | Sí | Instancia de adaptador de base de datos |
| `options` | `LevelsOptions` | No | Configuración opcional |

### Opciones (LevelsOptions)

```typescript
interface LevelsOptions {
  xpPerMessage?: { min: number; max: number };  // Default: { min: 1, max: 5 }
  levelUpThreshold?: number;                     // Default: 1000
  maxLevel?: number;                             // Default: 100
  logger?: Logger;                               // Logger personalizado
  cache?: CacheOptions;                          // Configuración de caché
  cooldown?: CooldownConfig;                     // Configuración de cooldowns
  prestige?: PrestigeConfig;                     // Configuración de prestigio
  xpCurve?: XpCurve;                             // Curva de cálculo de XP
}
```

### Ejemplo

```typescript
const levels = new ZeewLevels(adapter, {
  xpPerMessage: { min: 1, max: 5 },
  levelUpThreshold: 1000,
  maxLevel: 100,
  cache: { enabled: true, maxSize: 5000, ttl: 300000 },
  cooldown: { messageCooldown: 5000, voiceCooldown: 60000, commandCooldown: 3000 },
  prestige: { enabled: true, requiredLevel: 50, maxPrestige: 10, resetLevel: 1, bonusPerPrestige: 0.1 },
  xpCurve: { name: "exponential", base: 100, multiplier: 1.5 },
  logger: console,
});
```

---

## Propiedades Públicas

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `multipliers` | `MultiplierManager` | Gestor de multiplicadores |
| `cooldowns` | `CooldownManager` | Gestor de cooldowns |
| `rewards` | `RewardManager` | Gestor de recompensas |
| `prestige` | `PrestigeManager` | Gestor de prestigio |
| `stats` | `StatsCalculator` | Calculadora de estadísticas |
| `onLevelUp` | `Hook` | Callback al subir de nivel |
| `onXpGain` | `Hook` | Callback al ganar XP |
| `onPrestige` | `Hook` | Callback al prestigiar |
| `onCooldown` | `Hook` | Callback al estar en cooldown |

---

## Métodos

### init()

```typescript
async init(): Promise<void>
```

Inicializa el adaptador. Crea tablas/colecciones/índices si es necesario.

**Cuándo usarlo:** Obligatorio para SQLite, MySQL y MongoDB. No necesario para JSON, Memory o Redis.

```typescript
await levels.init();
```

---

### processMessage()

```typescript
async processMessage(
  user: string,
  guild: string,
  userRoles?: string[]
): Promise<ProcessResult>
```

Método principal. Procesa un mensaje y otorga XP. Aplica cooldowns, multiplicadores, prestige bonus, y maneja level ups.

**Parámetros:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `user` | `string` | ID del usuario |
| `guild` | `string` | ID del servidor |
| `userRoles` | `string[]` | Array de IDs de roles del usuario (para multiplicadores) |

**Retorna:** `ProcessResult` — Unión discriminada:

```typescript
// Si el usuario subió de nivel:
{
  type: "level_up";
  newLevel: number;    // Nuevo nivel alcanzado
  xp: number;          // XP sobrante después del level up
  rewards: LevelReward[]; // Recompensas desbloqueadas
}

// Si solo ganó XP:
{
  type: "xp_gain";
  xp: number;          // XP ganado en este mensaje
  totalXp: number;     // XP total actual
  multiplied: boolean; // Si se aplicaron multiplicadores
}
```

**Ejemplo:**

```typescript
const result = await levels.processMessage(
  message.author.id,
  message.guild.id,
  message.member.roles.cache.map(r => r.id)
);

if (result.type === "level_up") {
  console.log(`¡Nivel ${result.newLevel}!`);
  console.log(`Recompensas: ${result.rewards.length}`);

  // Asignar roles de recompensa
  for (const reward of result.rewards) {
    if (reward.type === "role") {
      await message.member.roles.add(reward.roleId);
    }
  }
} else {
  console.log(`+${result.xp} XP (total: ${result.totalXp})`);
}
```

---

### addXp()

```typescript
async addXp(user: string, guild: string, amount: number): Promise<ProcessResult>
```

Agrega XP manualmente. No aplica cooldowns ni multiplicadores.

**Uso:** Recompensas por comandos, trivia, eventos, etc.

```typescript
// Recompensa por completar trivia
const result = await levels.addXp(user, guild, 50);
if (result.type === "level_up") {
  // ...
}
```

---

### getLevel()

```typescript
async getLevel(user: string, guild: string): Promise<number | null>
```

Obtiene el nivel actual del usuario. Retorna `null` si el usuario no existe.

```typescript
const level = await levels.getLevel(user, guild);
if (level !== null) {
  console.log(`Nivel: ${level}`);
}
```

---

### getXp()

```typescript
async getXp(user: string, guild: string): Promise<number | null>
```

Obtiene el XP actual del usuario (dentro del nivel actual). Retorna `null` si no existe.

```typescript
const xp = await levels.getXp(user, guild);
```

---

### getUser()

```typescript
async getUser(user: string, guild: string): Promise<LevelRecord | null>
```

Obtiene el registro completo del usuario.

```typescript
const user = await levels.getUser(user, guild);
if (user) {
  console.log(`Nivel: ${user.level}`);
  console.log(`XP: ${user.xp}`);
  console.log(`Total XP: ${user.totalXp}`);
  console.log(`Prestigio: ${user.prestige}`);
  console.log(`Mensajes: ${user.messages}`);
}
```

---

### getLeaderboard()

```typescript
async getLeaderboard(guild: string, limit?: number): Promise<LeaderboardEntry[]>
```

Obtiene la tabla de clasificación ordenada por nivel y XP.

**Parámetros:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `guild` | `string` | — | ID del servidor |
| `limit` | `number` | `10` | Cantidad máxima de entradas |

```typescript
const leaderboard = await levels.getLeaderboard(guild, 20);

leaderboard.forEach((entry, index) => {
  console.log(`#${index + 1} ${entry.user} — Nivel ${entry.level} (${entry.xp} XP)`);
});
```

---

### getUserStats()

```typescript
async getUserStats(user: string, guild: string): Promise<UserStats | null>
```

Obtiene estadísticas detalladas del usuario incluyendo rank, progreso y estimaciones.

```typescript
const stats = await levels.getUserStats(user, guild);
if (stats) {
  console.log(`Rank: #${stats.rank}`);
  console.log(`Nivel: ${stats.level}`);
  console.log(`Progreso: ${stats.xpPercentage}%`);
  console.log(`XP para siguiente: ${stats.xpForNextLevel}`);
  console.log(`Mensajes estimados: ${stats.messagesToNextLevel}`);
}
```

**Retorna (UserStats):**

```typescript
interface UserStats extends LevelRecord {
  rank: number;                // Posición en el leaderboard
  xpForNextLevel: number;     // XP necesario para el siguiente nivel
  xpProgress: number;         // Progreso 0-1
  xpPercentage: number;       // Progreso 0-100
  messagesToNextLevel: number; // Estimación de mensajes necesarios
}
```

---

### getGuildStats()

```typescript
async getGuildStats(guild: string): Promise<GuildStats>
```

Obtiene estadísticas del servidor.

```typescript
const stats = await levels.getGuildStats(guild);
console.log(`Usuarios: ${stats.totalUsers}`);
console.log(`XP total: ${stats.totalXp}`);
console.log(`Nivel promedio: ${stats.averageLevel}`);
console.log(`Nivel más alto: ${stats.highestLevel}`);
console.log(`Mensajes totales: ${stats.totalMessages}`);
```

---

### setLevel()

```typescript
async setLevel(user: string, guild: string, level: number): Promise<void>
```

Establece el nivel del usuario. Preserva el XP actual.

```typescript
await levels.setLevel(user, guild, 10);
```

---

### setXp()

```typescript
async setXp(user: string, guild: string, xp: number): Promise<void>
```

Establece el XP del usuario. Preserva el nivel actual.

```typescript
await levels.setXp(user, guild, 500);
```

---

### deleteUser()

```typescript
async deleteUser(user: string, guild: string): Promise<void>
```

Elimina un usuario del sistema.

```typescript
await levels.deleteUser(user, guild);
```

---

### deleteAll()

```typescript
async deleteAll(guild: string): Promise<void>
```

Elimina todos los usuarios de un servidor.

```typescript
await levels.deleteAll(guild);
```

---

### addReward()

```typescript
async addReward(guild: string, reward: LevelReward): Promise<void>
```

Agrega una recompensa de nivel.

```typescript
await levels.addReward(guild, {
  level: 10,
  roleId: "1234567890",
  type: "role",
});
```

---

### removeReward()

```typescript
async removeReward(guild: string, level: number, roleId: string): Promise<void>
```

Elimina una recompensa específica.

```typescript
await levels.removeReward(guild, 10, "1234567890");
```

---

### getRewards()

```typescript
async getRewards(guild: string): Promise<LevelReward[]>
```

Obtiene todas las recompensas de un servidor.

```typescript
const rewards = await levels.getRewards(guild);
```

---

### addMultiplier()

```typescript
async addMultiplier(guild: string, multiplier: Multiplier): Promise<void>
```

Agrega un multiplicador de XP.

```typescript
await levels.addMultiplier(guild, {
  id: "vip-role",
  value: 2,
  source: "role",
  roleId: "1234567890",
});
```

---

### removeMultiplier()

```typescript
async removeMultiplier(guild: string, multiplierId: string): Promise<void>
```

Elimina un multiplicador.

```typescript
await levels.removeMultiplier(guild, "vip-role");
```

---

### xpForLevel()

```typescript
xpForLevel(level: number): number
```

Calcula el XP necesario para alcanzar un nivel específico.

```typescript
const xpForLevel10 = levels.xpForLevel(10);
const xpForLevel50 = levels.xpForLevel(50);
```

---

### xpProgress()

```typescript
async xpProgress(
  user: string,
  guild: string
): Promise<{ progress: number; percentage: number } | null>
```

Obtiene el progreso de XP del usuario.

```typescript
const progress = await levels.xpProgress(user, guild);
if (progress) {
  console.log(`Progreso: ${progress.percentage}%`);
  console.log(`Barra: ${"█".repeat(Math.round(progress.progress * 20))}`);
}
```

---

### messagesToNextLevel()

```typescript
async messagesToNextLevel(
  user: string,
  guild: string,
  avgXp?: number
): Promise<number | null>
```

Estima cuántos mensajes faltan para el siguiente nivel.

```typescript
const messages = await levels.messagesToNextLevel(user, guild, 3);
console.log(`Faltan ~${messages} mensajes para el siguiente nivel`);
```

---

## Hooks

### onLevelUp

```typescript
levels.onLevelUp = (user, guild, newLevel, rewards) => {
  console.log(`${user} alcanzó el nivel ${newLevel} en ${guild}`);
  console.log(`Recompensas: ${rewards.length}`);
};
```

### onXpGain

```typescript
levels.onXpGain = (user, guild, xp, multiplied) => {
  if (multiplied) {
    console.log(`${user} ganó ${xp} XP (¡con multiplicador!)`);
  }
};
```

### onPrestige

```typescript
levels.onPrestige = (user, guild, newPrestige) => {
  console.log(`${user} prestigió a ${newPrestige}`);
};
```

### onCooldown

```typescript
levels.onCooldown = (user, guild, action, retryIn) => {
  console.log(`${user} en cooldown por ${action}. Reintentar en ${retryIn}ms`);
};
```
