# Recompensas por Nivel

> Sistema de recompensas automáticas al subir de nivel.

## Descripción

Las recompensas permiten otorgar roles de Discord o XP adicional cuando un usuario alcanza un nivel específico.

## Agregar Recompensa

```typescript
await levels.addReward(guild, {
  level: 10,             // Nivel que desbloquea la recompensa
  roleId: "1234567890",  // ID del rol a asignar
  type: "role",          // Tipo de recompensa
});
```

## Tipos de Recompensa

### Rol (`"role"`)

Asigna un rol de Discord al usuario cuando alcanza el nivel.

```typescript
await levels.addReward(guild, {
  level: 10,
  roleId: "MEMBER_ROLE_ID",
  type: "role",
});
```

### XP (`"xp"`)

Otorga XP adicional al subir de nivel.

```typescript
await levels.addReward(guild, {
  level: 5,
  roleId: "xp-bonus",   // ID único (puede ser cualquier string)
  type: "xp",
  amount: 100,          // 100 XP extra
});
```

### Custom (`"custom"`)

Para lógica personalizada. La recompensa se retorna en el resultado y tú la manejas.

```typescript
await levels.addReward(guild, {
  level: 20,
  roleId: "custom-reward",
  type: "custom",
  amount: 500,          // Datos opcionales
});
```

## Recompensas Automáticas

Cuando un usuario sube de nivel, `processMessage()` retorna las recompensas desbloqueadas:

```typescript
const result = await levels.processMessage(user, guild, userRoles);

if (result.type === "level_up") {
  console.log(`¡Nivel ${result.newLevel}!`);

  // result.rewards contiene las recompensas de este nivel
  for (const reward of result.rewards) {
    if (reward.type === "role") {
      const member = await guild.members.fetch(user);
      await member.roles.add(reward.roleId);
      console.log(`Rol ${reward.roleId} asignado`);
    }

    if (reward.type === "xp") {
      await levels.addXp(user, guild, reward.amount!);
      console.log(`+${reward.amount} XP bonus`);
    }
  }
}
```

## Obtener Recompensas

```typescript
// Todas las recompensas del servidor
const rewards = await levels.getRewards(guild);

// Filtrar por nivel específico
const level10Rewards = rewards.filter(r => r.level === 10);
```

## Eliminar Recompensas

```typescript
// Eliminar recompensa específica
await levels.removeReward(guild, 10, "ROLE_ID");

// Eliminar todas las recompensas
await levels.rewards.clearRewards(guild);
```

## Ejemplo Completo: Bot con Roles por Nivel

```typescript
// Configurar recompensas al iniciar
client.once(Events.ClientReady, async () => {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  // Nivel 5: rol "Miembro"
  await levels.addReward(guild.id, {
    level: 5,
    roleId: "MEMBER_ROLE_ID",
    type: "role",
  });

  // Nivel 10: rol "Miembro Activo"
  await levels.addReward(guild.id, {
    level: 10,
    roleId: "ACTIVE_MEMBER_ROLE_ID",
    type: "role",
  });

  // Nivel 25: rol "Veterano" + 500 XP bonus
  await levels.addReward(guild.id, {
    level: 25,
    roleId: "VETERAN_ROLE_ID",
    type: "role",
  });

  await levels.addReward(guild.id, {
    level: 25,
    roleId: "veteran-xp-bonus",
    type: "xp",
    amount: 500,
  });

  // Nivel 50: rol "Élite"
  await levels.addReward(guild.id, {
    level: 50,
    roleId: "ELITE_ROLE_ID",
    type: "role",
  });
});

// Procesar mensajes
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const result = await levels.processMessage(
    message.author.id,
    message.guild.id,
    message.member.roles.cache.map(r => r.id)
  );

  if (result.type === "level_up") {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(`🎉 ¡${message.author} alcanzó el **Nivel ${result.newLevel}**!`);

    // Asignar roles
    for (const reward of result.rewards) {
      if (reward.type === "role") {
        await message.member.roles.add(reward.roleId);
        embed.addFields({
          name: "Recompensa",
          value: `<@&${reward.roleId}>`,
          inline: true,
        });
      }
    }

    await message.channel.send({ embeds: [embed] });
  }
});
```

## Notas

- Las recompensas se procesan automáticamente en `processMessage()`
- No se procesan en `addXp()` (solo en level ups de `processMessage`)
- Cada servidor tiene sus propias recompensas
- Las recompensas se guardan por `(guild, level, roleId)`
