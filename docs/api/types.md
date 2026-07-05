# Tipos TypeScript

> Referencia completa de todos los tipos exportados por zeew-levels.

## Base Keys

```typescript
interface UserKey {
  user: string;   // ID del usuario
  guild: string;  // ID del servidor
}
```

Usado como clave compuesta para identificar usuarios de forma única por servidor.

---

## Core Records

### LevelRecord

```typescript
interface LevelRecord extends UserKey {
  xp: number;        // XP actual en el nivel actual
  level: number;     // Nivel actual
  totalXp: number;   // XP total acumulado (nunca se resetea)
  prestige: number;  // Nivel de prestigio actual
  messages: number;  // Total de mensajes procesados
  lastXpAt: number;  // Timestamp del último XP ganado (Date.now())
}
```

Registro principal de un usuario en el sistema de niveles.

### LeaderboardEntry

```typescript
interface LeaderboardEntry {
  user: string;
  guild: string;
  xp: number;
  level: number;
  totalXp: number;
  prestige: number;
}
```

Entrada en la tabla de clasificación. No incluye `messages` ni `lastXpAt` para reducir payload.

---

## Result Types

### LevelUpResult

```typescript
interface LevelUpResult {
  type: "level_up";
  newLevel: number;       // Nuevo nivel alcanzado
  xp: number;             // XP sobrante después del level up
  rewards: LevelReward[]; // Recompensas desbloqueadas en este nivel
}
```

Retornado cuando el usuario sube de nivel.

### XpGainResult

```typescript
interface XpGainResult {
  type: "xp_gain";
  xp: number;          // XP ganado en esta operación
  totalXp: number;     // XP total actual del usuario
  multiplied: boolean; // true si se aplicaron multiplicadores
}
```

Retornado cuando el usuario gana XP sin subir de nivel.

### PrestigeResult

```typescript
interface PrestigeResult {
  type: "prestige";
  newPrestige: number; // Nuevo nivel de prestigio
  level: number;       // Nivel al que se resetea
  xp: number;          // XP después del reset (0)
}
```

Retornado al ejecutar un prestigio.

### ProcessResult

```typescript
type ProcessResult = LevelUpResult | XpGainResult;
```

Unión discriminada de los resultados de `processMessage()` y `addXp()`. Se distingue por el campo `type`.

**Patrón de uso:**

```typescript
const result = await levels.processMessage(user, guild);

switch (result.type) {
  case "level_up":
    // result es LevelUpResult
    console.log(result.newLevel);
    console.log(result.rewards);
    break;
  case "xp_gain":
    // result es XpGainResult
    console.log(result.xp);
    console.log(result.multiplied);
    break;
}
```

---

## Multipliers

### Multiplier

```typescript
interface Multiplier {
  id: string;                    // Identificador único del multiplicador
  value: number;                 // Valor del multiplicador (1.5 = 1.5x XP)
  source: "role" | "boost" | "guild" | "custom"; // Tipo de multiplicador
  roleId?: string;               // ID del rol (requerido si source es "role")
}
```

**Fuentes:**

| Source | Descripción | Requiere `roleId` |
|--------|-------------|-------------------|
| `"role"` | Activo cuando el usuario tiene el rol especificado | Sí |
| `"boost"` | Activo para boosters del servidor | No |
| `"guild"` | Activo para todos los usuarios del servidor | No |
| `"custom"` | Lógica personalizada | No |

### GuildMultipliers

```typescript
interface GuildMultipliers {
  guild: string;              // ID del servidor
  multipliers: Multiplier[];  // Lista de multiplicadores activos
  baseXp: XpRange;           // Rango de XP base por mensaje
  levelUpThreshold: number;   // XP necesaria para subir de nivel
  maxLevel: number;           // Nivel máximo permitido
}
```

Configuración de multiplicadores y XP por servidor.

---

## Cooldowns

### CooldownConfig

```typescript
interface CooldownConfig {
  messageCooldown: number;  // Milisegundos entre mensajes (default: 5000)
  voiceCooldown: number;    // Milisegundos entre XP de voz (default: 60000)
  commandCooldown: number;  // Milisegundos entre comandos (default: 3000)
}
```

### CooldownEntry

```typescript
interface CooldownEntry extends UserKey {
  action: string;    // Tipo de acción ("message", "voice", "command")
  expiresAt: number; // Timestamp de expiración (Date.now() + duration)
}
```

---

## Level Rewards

### LevelReward

```typescript
interface LevelReward {
  level: number;              // Nivel que desbloquea la recompensa
  roleId: string;             // ID del rol de Discord a asignar
  type: "role" | "xp" | "custom"; // Tipo de recompensa
  amount?: number;            // Cantidad de XP (si type es "xp")
}
```

**Tipos de recompensa:**

| Type | Descripción | Usa `amount` |
|------|-------------|--------------|
| `"role"` | Asigna un rol de Discord | No |
| `"xp"` | Otorga XP adicional | Sí |
| `"custom"` | Lógica personalizada (manejar en hook) | Opcional |

---

## Prestige

### PrestigeConfig

```typescript
interface PrestigeConfig {
  enabled: boolean;           // Habilitar sistema de prestigio
  maxPrestige: number;        // Número máximo de prestigios
  resetLevel: number;         // Nivel al que se resetea al prestigiar
  bonusPerPrestige: number;   // Bonus de XP por prestigio (0.1 = +10%)
  requiredLevel: number;      // Nivel mínimo para poder prestigiar
}
```

### PrestigeEntry

```typescript
interface PrestigeEntry extends UserKey {
  prestige: number;        // Nivel de prestigio actual
  totalPrestiges: number;  // Total de veces que ha prestigiado
}
```

---

## XP Curve

### XpCurveFn

```typescript
type XpCurveFn = (level: number) => number;
```

Función que calcula el XP necesario para alcanzar un nivel.

### XpCurve

```typescript
interface XpCurve {
  name: "linear" | "quadratic" | "exponential" | "custom";
  base?: number;       // Valor base (default: 100)
  multiplier?: number; // Multiplicador (default: 1.5)
  custom?: XpCurveFn;  // Función personalizada (requerido si name es "custom")
}
```

**Fórmulas:**

| Name | Fórmula | Ejemplo (base=100, mult=1.5) |
|------|---------|------------------------------|
| `linear` | `base + mult * level` | Nivel 5: 107 |
| `quadratic` | `base + mult * level²` | Nivel 5: 137 |
| `exponential` | `base * mult^level` | Nivel 5: 759 |
| `custom` | Tu función | Variable |

---

## Stats

### UserStats

```typescript
interface UserStats extends LevelRecord {
  rank: number;                // Posición en el leaderboard (1-indexed)
  xpForNextLevel: number;     // XP necesario para el siguiente nivel
  xpProgress: number;         // Progreso actual (0.0 - 1.0)
  xpPercentage: number;       // Progreso actual (0 - 100)
  messagesToNextLevel: number; // Estimación de mensajes para siguiente nivel
}
```

### GuildStats

```typescript
interface GuildStats {
  guild: string;          // ID del servidor
  totalUsers: number;     // Total de usuarios con datos
  totalXp: number;        // Suma de XP total de todos los usuarios
  averageLevel: number;   // Nivel promedio
  highestLevel: number;   // Nivel más alto alcanzado
  totalMessages: number;  // Total de mensajes procesados
}
```

---

## Options

### LevelsOptions

```typescript
interface LevelsOptions {
  xpPerMessage?: XpRange;           // Rango de XP por mensaje
  levelUpThreshold?: number;         // XP para subir de nivel
  maxLevel?: number;                 // Nivel máximo
  logger?: Logger;                   // Logger personalizado
  cache?: CacheOptions;              // Configuración de caché
  cooldown?: CooldownConfig;         // Configuración de cooldowns
  prestige?: PrestigeConfig;         // Configuración de prestigio
  xpCurve?: XpCurve;                 // Curva de cálculo de XP
}
```

### XpRange

```typescript
interface XpRange {
  min: number; // Mínimo XP por mensaje (default: 1)
  max: number; // Máximo XP por mensaje (default: 5)
}
```

### CacheOptions

```typescript
interface CacheOptions {
  enabled: boolean;  // Habilitar caché (default: false)
  maxSize?: number;  // Máximo de entradas (default: 1000)
  ttl?: number;      // Time-to-live en ms (default: 60000)
}
```

---

## Logger

```typescript
interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}
```

Interfaz para logging. Acepta cualquier objeto con estos 4 métodos. `console` cumple esta interfaz.

---

## Hooks

### LevelsHooks

```typescript
interface LevelsHooks {
  onLevelUp?: (user: string, guild: string, newLevel: number, rewards: LevelReward[]) => void;
  onXpGain?: (user: string, guild: string, xp: number, multiplied: boolean) => void;
  onPrestige?: (user: string, guild: string, newPrestige: number) => void;
  onCooldown?: (user: string, guild: string, action: string, retryIn: number) => void;
}
```

Callbacks que se ejecutan en eventos del sistema. Se asignan directamente a la instancia:

```typescript
levels.onLevelUp = (user, guild, newLevel, rewards) => { /* ... */ };
levels.onXpGain = (user, guild, xp, multiplied) => { /* ... */ };
levels.onPrestige = (user, guild, newPrestige) => { /* ... */ };
levels.onCooldown = (user, guild, action, retryIn) => { /* ... */ };
```
