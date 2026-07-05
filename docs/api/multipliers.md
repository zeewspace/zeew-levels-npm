# Multiplicadores de XP

> Sistema de bonificaciones de XP por rol, boost, servidor o personalizado.

## Descripción

Los multiplicadores permiten dar XP extra a ciertos usuarios. Puedes configurar multiplicadores por rol, por boost del servidor, o personalizados.

## Agregar Multiplicador

```typescript
await levels.addMultiplier(guild, {
  id: "unique-id",         // Identificador único
  value: 2,                // Multiplicador (2 = 2x XP)
  source: "role",          // Tipo de fuente
  roleId: "1234567890",    // ID del rol (requerido para "role")
});
```

## Fuentes Disponibles

### Rol (`"role"`)

Activo cuando el usuario tiene el rol especificado.

```typescript
await levels.addMultiplier(guild, {
  id: "vip-role",
  value: 2,
  source: "role",
  roleId: "1234567890", // ID del rol VIP
});

// El usuario necesita pasar sus roles en processMessage
const result = await levels.processMessage(user, guild, userRoles);
```

### Boost (`"boost"`)

Activo para usuarios que boosteen el servidor.

```typescript
await levels.addMultiplier(guild, {
  id: "server-boost",
  value: 1.5,
  source: "boost",
});
```

### Servidor (`"guild"`)

Activo para todos los usuarios del servidor.

```typescript
await levels.addMultiplier(guild, {
  id: "weekend-event",
  value: 2,
  source: "guild",
});
```

### Custom (`"custom"`)

Para lógica personalizada. Se activa siempre que el usuario pase sus roles.

```typescript
await levels.addMultiplier(guild, {
  id: "patreon-supporter",
  value: 1.25,
  source: "custom",
});
```

## Cómo se Calculan

Los multiplicadores se **multiplican** entre sí:

```
XP final = XP base × multiplicador1 × multiplicador2 × ...
```

**Ejemplo:**
- XP base: 5
- Multiplicador rol VIP: 2x
- Multiplicador boost: 1.5x
- **XP final: 5 × 2 × 1.5 = 15**

## Eliminar Multiplicador

```typescript
await levels.removeMultiplier(guild, "vip-role");
```

## Configuración por Servidor

Cada servidor tiene su propia configuración de multiplicadores, XP base y umbral:

```typescript
// La configuración se guarda automáticamente al agregar multiplicadores
await levels.addMultiplier("guild-1", { id: "vip", value: 2, source: "role", roleId: "r1" });
await levels.addMultiplier("guild-2", { id: "boost", value: 1.5, source: "boost" });

// guild-1 y guild-2 tienen configuraciones independientes
```

## Ejemplo Completo con Discord.js

```typescript
// Configurar multiplicadores al iniciar el bot
client.on("ready", async () => {
  for (const guild of client.guilds.cache.values()) {
    // 2x XP para rol VIP
    await levels.addMultiplier(guild.id, {
      id: "vip",
      value: 2,
      source: "role",
      roleId: "VIP_ROLE_ID",
    });

    // 1.5x XP para boosters
    await levels.addMultiplier(guild.id, {
      id: "booster",
      value: 1.5,
      source: "boost",
    });
  }
});

// En messageCreate, pasar los roles del usuario
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const userRoles = message.member.roles.cache.map(r => r.id);
  const result = await levels.processMessage(
    message.author.id,
    message.guild.id,
    userRoles // ← Los multiplicadores usan esto
  );
});
```

## Notas

- Si no pasas `userRoles` a `processMessage()`, no se aplican multiplicadores de rol
- Los multiplicadores de tipo `"guild"` y `"boost"` no requieren `userRoles`
- Los multiplicadores se guardan por servidor en la base de datos
- El cache de configuración por servidor se invalida al modificar multiplicadores
