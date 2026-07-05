# Helpers para Discord.js

> Embeds y utilidades listas para usar en bots de Discord.js.

## Importación

```typescript
import {
  rankCard,
  leaderboardEmbed,
  levelUpMessage,
  prestigeMessage,
  statsEmbed,
} from "zeew-levels";
```

Todos los helpers retornan objetos `DiscordEmbed` compatibles con `EmbedBuilder` de discord.js v14+.

## rankCard()

Genera un embed de perfil de rank con barra de progreso.

```typescript
const embed = rankCard(stats, username, avatarUrl?);
```

**Parámetros:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `stats` | `UserStats` | Estadísticas del usuario |
| `username` | `string` | Nombre del usuario |
| `avatarUrl` | `string?` | URL del avatar (opcional) |

**Ejemplo:**

```typescript
const stats = await levels.getUserStats(user, guild);
const embed = rankCard(
  stats,
  message.author.username,
  message.author.displayAvatarURL()
);
message.reply({ embeds: [embed] });
```

**Resultado:**

```
┌─────────────────────────────┐
│      Level 15 [P2]          │
│                             │
│  XP: 450 / 850    Rank: #5  │
│  Prestige: 2     Messages:  │
│                             │
│  ████████████░░░░░░░░ 53%   │
│                             │
│  Total XP: 12.5K            │
│  zeew.space                 │
└─────────────────────────────┘
```

## leaderboardEmbed()

Genera un embed de tabla de clasificación paginada.

```typescript
const embed = leaderboardEmbed(entries, guildName, page?, perPage?);
```

**Parámetros:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `entries` | `LeaderboardEntry[]` | — | Lista del leaderboard |
| `guildName` | `string` | — | Nombre del servidor |
| `page` | `number` | `1` | Página actual |
| `perPage` | `number` | `10` | Entradas por página |

**Ejemplo:**

```typescript
const leaderboard = await levels.getLeaderboard(guild, 50);
const embed = leaderboardEmbed(
  leaderboard,
  message.guild.name,
  1,  // página
  10  // por página
);
message.reply({ embeds: [embed] });
```

**Resultado:**

```
┌─────────────────────────────┐
│   🏆 Leaderboard — MyGuild  │
│                             │
│  🥇 User1 — Level 10 (1K)  │
│  🥈 User2 — Level 8 (800)  │
│  🥉 User3 — Level 7 (700)  │
│  #4 User4 — Level 5 (500)  │
│  #5 User5 — Level 3 (300)  │
│                             │
│  Page 1/5 — zeew.space      │
└─────────────────────────────┘
```

## levelUpMessage()

Genera un embed de celebración al subir de nivel.

```typescript
const embed = levelUpMessage(user, newLevel, rewards);
```

**Ejemplo:**

```typescript
if (result.type === "level_up") {
  const embed = levelUpMessage(
    message.author.toString(),
    result.newLevel,
    result.rewards
  );
  message.channel.send({ embeds: [embed] });
}
```

**Resultado:**

```
┌─────────────────────────────┐
│     🎉 Level Up!            │
│                             │
│  ¡User1 alcanzó el          │
│  Nivel 10!                  │
│                             │
│  New Level: 10              │
│  Rewards: <@&ROLE_ID>       │
│                             │
│  zeew.space                 │
└─────────────────────────────┘
```

## prestigeMessage()

Genera un embed de celebración al prestigiar.

```typescript
const embed = prestigeMessage(user, newPrestige, bonus);
```

**Ejemplo:**

```typescript
if (result.type === "prestige" && result.newPrestige > 0) {
  const embed = prestigeMessage(
    message.author.toString(),
    result.newPrestige,
    result.newPrestige * 0.1
  );
  message.channel.send({ embeds: [embed] });
}
```

## statsEmbed()

Genera un embed detallado de estadísticas.

```typescript
const embed = statsEmbed(stats, username);
```

**Ejemplo:**

```typescript
const stats = await levels.getUserStats(user, guild);
const embed = statsEmbed(stats, message.author.username);
message.reply({ embeds: [embed] });
```

## Interfaz DiscordEmbed

Todos los helpers retornan objetos con esta estructura:

```typescript
interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  thumbnail?: { url: string };
  timestamp?: string;
}
```

Compatible con:
- `EmbedBuilder` de discord.js v14+
- `MessageEmbed` de discord.js v13
- Cualquier librería que acepte embeds en formato JSON

## Ejemplo: Bot Completo con Todos los Helpers

```typescript
import {
  ZeewLevels, JsonAdapter,
  rankCard, leaderboardEmbed, levelUpMessage, prestigeMessage, statsEmbed,
} from "zeew-levels";

const adapter = new JsonAdapter("./levels.json");
const levels = new ZeewLevels(adapter, {
  cache: { enabled: true },
  cooldown: { messageCooldown: 5000 },
});

// Evento de mensaje
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const result = await levels.processMessage(
    message.author.id,
    message.guild.id,
    message.member.roles.cache.map(r => r.id)
  );

  // Level up
  if (result.type === "level_up") {
    const embed = levelUpMessage(
      message.author.toString(),
      result.newLevel,
      result.rewards
    );
    message.channel.send({ embeds: [embed] });

    // Asignar roles de recompensa
    for (const reward of result.rewards) {
      if (reward.type === "role") {
        await message.member.roles.add(reward.roleId);
      }
    }
  }
});

// Comando /rank
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "rank") {
    const stats = await levels.getUserStats(interaction.user.id, interaction.guildId!);
    if (!stats) return interaction.reply({ content: "Sin datos", ephemeral: true });

    const embed = rankCard(stats, interaction.user.username,
      interaction.user.displayAvatarURL());
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "leaderboard") {
    const lb = await levels.getLeaderboard(interaction.guildId!, 50);
    const embed = leaderboardEmbed(lb, interaction.guild!.name);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "stats") {
    const stats = await levels.getUserStats(interaction.user.id, interaction.guildId!);
    if (!stats) return interaction.reply({ content: "Sin datos", ephemeral: true });

    const embed = statsEmbed(stats, interaction.user.username);
    await interaction.reply({ embeds: [embed] });
  }
});
```
