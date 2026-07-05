# Estadísticas y Utilidades

> Estadísticas de usuario/servidor, cálculo de XP y formateo.

## Estadísticas de Usuario

```typescript
const stats = await levels.getUserStats(user, guild);
```

**Retorna (UserStats):**

```typescript
{
  user: "1234567890",
  guild: "0987654321",
  xp: 450,
  level: 15,
  totalXp: 12500,
  prestige: 2,
  messages: 340,
  lastXpAt: 1688000000000,

  // Campos calculados
  rank: 5,                    // Posición en el leaderboard
  xpForNextLevel: 850,       // XP necesario para nivel 16
  xpProgress: 0.529,         // Progreso 0.0 - 1.0
  xpPercentage: 53,          // Progreso 0 - 100
  messagesToNextLevel: 133,  // Mensajes estimados para siguiente nivel
}
```

## Estadísticas del Servidor

```typescript
const stats = await levels.getGuildStats(guild);
```

**Retorna (GuildStats):**

```typescript
{
  guild: "0987654321",
  totalUsers: 150,
  totalXp: 2500000,
  averageLevel: 22.5,
  highestLevel: 87,
  totalMessages: 45000,
}
```

## XP para Nivel

Calcula cuánto XP se necesita para alcanzar un nivel:

```typescript
const xp = levels.xpForLevel(10);  // XP para nivel 10
const xp2 = levels.xpForLevel(50); // XP para nivel 50
```

Depende de la curva de XP configurada.

## Progreso de XP

```typescript
const progress = await levels.xpProgress(user, guild);

if (progress) {
  console.log(`Progreso: ${progress.percentage}%`);
  console.log(`Decimal: ${progress.progress}`);

  // Barra de progreso visual
  const bar = "█".repeat(Math.round(progress.progress * 20));
  const empty = "░".repeat(20 - Math.round(progress.progress * 20));
  console.log(`[${bar}${empty}] ${progress.percentage}%`);
}
```

**Salida:**
```
[████████████░░░░░░░░░] 60%
```

## Mensajes para Siguiente Nivel

```typescript
const messages = await levels.messagesToNextLevel(user, guild, 3);
// El tercer parámetro es el XP promedio por mensaje (default: 3)

if (messages !== null) {
  console.log(`Faltan ~${messages} mensajes para el siguiente nivel`);
}
```

## Utilidades de Formateo

### formatXp()

```typescript
import { formatXp } from "zeew-levels";

formatXp(42);      // "42"
formatXp(1500);    // "1.5K"
formatXp(2500000); // "2.5M"
```

### formatLevel()

```typescript
import { formatLevel } from "zeew-levels";

formatLevel(5, 0);  // "Level 5"
formatLevel(5, 2);  // "[P2] Level 5"
```

### progressBar()

```typescript
import { progressBar } from "zeew-levels";

progressBar(50, 20);    // "██████████░░░░░░░░░░"
progressBar(100, 10);   // "██████████"
progressBar(0, 10);     // "░░░░░░░░░░"
progressBar(75, 20, "▓", "░"); // "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░"
```

### rankSuffix()

```typescript
import { rankSuffix } from "zeew-levels";

rankSuffix(1);   // "1st"
rankSuffix(2);   // "2nd"
rankSuffix(3);   // "3rd"
rankSuffix(4);   // "4th"
rankSuffix(11);  // "11th"
rankSuffix(21);  // "21st"
```

## Ejemplo: Comando /rank

```typescript
import { rankCard, formatXp, progressBar } from "zeew-levels";

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "rank") return;

  const stats = await levels.getUserStats(
    interaction.user.id,
    interaction.guildId!
  );

  if (!stats) {
    return interaction.reply({
      content: "❌ Aún no tienes datos de nivel",
      ephemeral: true,
    });
  }

  // Opción 1: Usar helper de Discord.js
  const embed = rankCard(stats, interaction.user.username,
    interaction.user.displayAvatarURL()
  );

  // Opción 2: Crear embed manualmente
  const bar = progressBar(stats.xpPercentage);
  const embed2 = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Rank de ${interaction.user.username}`)
    .addFields(
      { name: "Nivel", value: `${stats.level}`, inline: true },
      { name: "Rank", value: `#${stats.rank}`, inline: true },
      { name: "Prestigio", value: `P${stats.prestige}`, inline: true },
      { name: "XP", value: `${formatXp(stats.xp)} / ${formatXp(stats.xpForNextLevel)}`, inline: true },
      { name: "Progreso", value: `\`${bar}\` ${stats.xpPercentage}%`, inline: false }
    )
    .setFooter({ text: "zeew.space" });

  await interaction.reply({ embeds: [embed] });
});
```

## Ejemplo: Comando /leaderboard

```typescript
import { leaderboardEmbed } from "zeew-levels";

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "leaderboard") return;

  const page = interaction.options.getInteger("page") ?? 1;
  const leaderboard = await levels.getLeaderboard(interaction.guildId!, 50);

  const embed = leaderboardEmbed(
    leaderboard,
    interaction.guild!.name,
    page,
    10
  );

  await interaction.reply({ embeds: [embed] });
});
```
