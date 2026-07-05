# Sistema de Prestigio

> Resetear niveles por beneficios permanentes de XP.

## Descripción

El sistema de prestigio permite a los usuarios resetear su nivel a cambio de un bonus permanente de XP. Similar al sistema de prestigio de Call of Duty.

## Configuración

```typescript
const levels = new ZeewLevels(adapter, {
  prestige: {
    enabled: true,           // Habilitar prestigio
    requiredLevel: 50,       // Nivel mínimo para prestigiar
    maxPrestige: 10,         // Máximo de prestigios
    resetLevel: 1,           // Nivel al que se resetea
    bonusPerPrestige: 0.1,   // +10% de XP por cada prestigio
  },
});
```

## Cómo Funciona

1. El usuario alcanza el nivel requerido (ej: nivel 50)
2. Ejecuta `doPrestige(user, guild)`
3. Su nivel se resetea al `resetLevel` (ej: nivel 1)
4. Su XP se pone a 0
5. Su prestige incrementa en 1
6. Recibe un bonus permanente de `bonusPerPrestige × prestige`

**Ejemplo:**
- Prestigio 1: +10% XP
- Prestigio 2: +20% XP
- Prestigio 5: +50% XP
- Prestigio 10: +100% XP (doble de XP)

## Verificar si Puede Prestigiar

```typescript
const { can, reason } = await levels.canPrestige(user, guild);

if (!can) {
  console.log(`No puede prestigiar: ${reason}`);
  // "Requires level 50 (current: 30)"
  // "Maximum prestige (10) reached"
  // "Prestige system is disabled"
}
```

## Ejecutar Prestigio

```typescript
const result = await levels.doPrestige(user, guild);

if (result.type === "prestige") {
  if (result.newPrestige > 0) {
    console.log(`¡Prestigio ${result.newPrestige}!`);
    console.log(`Nivel reseteado a ${result.level}`);
    console.log(`XP bonus: +${result.newPrestige * 10}%`);
  } else {
    console.log(`No pudo prestigiar`);
  }
}
```

## Cómo se Aplica el Bonus

El bonus de prestigio se aplica automáticamente en `processMessage()`:

```
XP final = XP base × multiplicadores × (1 + bonusPrestige)
```

**Ejemplo:**
- XP base: 5
- Multiplicador VIP: 2x
- Prestigio 3: +30%
- **XP final: 5 × 2 × 1.3 = 13**

## Hook onPrestige

```typescript
levels.onPrestige = (user, guild, newPrestige) => {
  console.log(`${user} prestigió a ${newPrestige} en ${guild}`);

  // Enviar notificación al canal
  const channel = client.channels.cache.get(ANNOUNCEMENT_CHANNEL);
  channel?.send(`⭐ ¡${user} alcanzó el **Prestigio ${newPrestige}**!`);
};
```

## Ejemplo Completo: Comando /prestige

```typescript
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "prestige") return;

  const { can, reason } = await levels.canPrestige(
    interaction.user.id,
    interaction.guildId!
  );

  if (!can) {
    return interaction.reply({
      content: `❌ No puedes prestigiar: ${reason}`,
      ephemeral: true,
    });
  }

  const user = await levels.getUser(interaction.user.id, interaction.guildId!);
  const nextPrestige = (user?.prestige ?? 0) + 1;
  const bonus = nextPrestige * 10;

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("⭐ Confirmar Prestigio")
    .setDescription(
      `¿Estás seguro de que quieres prestigiar?\n\n` +
      `• Tu nivel se reseteará a **1**\n` +
      `• Tu XP se pondrá a **0**\n` +
      `• Tu prestigio será **${nextPrestige}**\n` +
      `• XP bonus permanente: **+${bonus}%**`
    );

  // Aquí podrías agregar botones de confirmación
  await interaction.reply({ embeds: [embed] });
});
```

## Deshabilitar Prestigio

```typescript
const levels = new ZeewLevels(adapter, {
  prestige: { enabled: false }, // Deshabilitado
});
```

## Notas

- El prestigio es permanente y no se puede deshacer
- El bonus de prestigio se aplica después de los multiplicadores de rol
- El `totalPrestiges` registra cuántas veces ha prestigiado (nunca se resetea)
- Cada servidor tiene su propia configuración de prestigio
