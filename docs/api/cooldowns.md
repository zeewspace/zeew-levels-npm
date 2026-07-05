# Cooldowns Anti-Spam

> Sistema de enfriamiento para evitar spam de mensajes, voz y comandos.

## Descripción

Los cooldowns previenen que los usuarios ganen XP demasiado rápido. Puedes configurar tiempos diferentes para mensajes, voz y comandos.

## Configuración

```typescript
const levels = new ZeewLevels(adapter, {
  cooldown: {
    messageCooldown: 5000,  // 5 segundos entre mensajes (default: 5000)
    voiceCooldown: 60000,   // 1 minuto entre XP de voz (default: 60000)
    commandCooldown: 3000,  // 3 segundos entre comandos (default: 3000)
  },
});
```

## Cómo Funciona

1. Cuando un usuario envía un mensaje, `processMessage()` verifica si está en cooldown
2. Si está en cooldown, retorna `xp: 0` y ejecuta el hook `onCooldown`
3. Si no está en cooldown, procesa el XP y establece el cooldown

```
Mensaje → ¿En cooldown? → Sí → xp: 0 + hook onCooldown
                ↓
               No → Procesar XP → Set cooldown
```

## Verificar Cooldown Manualmente

```typescript
const { onCooldown, retryIn } = await levels.cooldowns.isOnCooldown(
  { user: userId, guild: guildId },
  "message"
);

if (onCooldown) {
  console.log(`Espera ${retryIn}ms más`);
}
```

## Acciones Disponibles

| Acción | Default | Descripción |
|--------|---------|-------------|
| `"message"` | 5000ms | Cooldown entre mensajes |
| `"voice"` | 60000ms | Cooldown entre XP de voz |
| `"command"` | 3000ms | Cooldown entre comandos |

## Limpiar Cooldowns

```typescript
// Limpiar cooldown específico
await levels.cooldowns.clearCooldown({ user, guild }, "message");

// Limpiar todos los cooldowns de un usuario
await levels.cooldowns.clearAllCooldowns({ user, guild });
```

## Hook onCooldown

Se ejecuta cuando un usuario intenta ganar XP mientras está en cooldown:

```typescript
levels.onCooldown = (user, guild, action, retryIn) => {
  console.log(`${user} en cooldown por ${action}`);
  console.log(`Reintentar en ${retryIn}ms`);

  // Podrías enviar un embed indicando el tiempo restante
};
```

## Ejemplo: Embed de Cooldown

```typescript
levels.onCooldown = async (user, guild, action, retryIn) => {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel?.isTextBased()) return;

  const seconds = Math.ceil(retryIn / 1000);

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setDescription(`⏳ Espera **${seconds} segundos** antes de volver a enviar mensajes`);

  await channel.send({ embeds: [embed], ephemeral: true });
};
```

## Sin Cooldowns

Si no quieres cooldowns, simplemente no los configures:

```typescript
const levels = new ZeewLevels(adapter); // Sin cooldowns
```

O configúralos en 0:

```typescript
const levels = new ZeewLevels(adapter, {
  cooldown: {
    messageCooldown: 0,
    voiceCooldown: 0,
    commandCooldown: 0,
  },
});
```

## Persistencia

Los cooldowns se guardan en la base de datos:
- **SQLite/MySQL:** Tabla `cooldowns` con expiración
- **MongoDB:** Colección `cooldowns` con TTL index
- **Redis:** Keys con TTL automático de Redis
- **JSON:** Archivo JSON (no expiran automáticamente)
- **Memory:** Memoria (se pierden al cerrar)
