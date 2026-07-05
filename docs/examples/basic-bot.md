# Bot Básico con zeew-levels

> Bot mínimo funcional con sistema de niveles.

## Código Completo

```typescript
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { ZeewLevels, JsonAdapter } from "zeew-levels";

// ─── Configuración ─────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN!;

// ─── Cliente Discord ───────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── zeew-levels ───────────────────────────────────────
const adapter = new JsonAdapter("./levels.json");
const levels = new ZeewLevels(adapter, {
  xpPerMessage: { min: 1, max: 5 },
  levelUpThreshold: 1000,
});

// ─── Eventos ───────────────────────────────────────────
client.once("ready", () => {
  console.log(`✅ Bot listo como ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const result = await levels.processMessage(
    message.author.id,
    message.guild.id
  );

  if (result.type === "level_up") {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(
        `🎉 ¡${message.author} alcanzó el **Nivel ${result.newLevel}**!`
      )
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) return;

  if (interaction.commandName === "rank") {
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

    const bar = "█".repeat(Math.round(stats.xpPercentage / 5));
    const empty = "░".repeat(20 - Math.round(stats.xpPercentage / 5));

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Rank de ${interaction.user.username}`)
      .addFields(
        { name: "Nivel", value: `${stats.level}`, inline: true },
        { name: "Rank", value: `#${stats.rank}`, inline: true },
        { name: "XP", value: `${stats.xp} / ${stats.xpForNextLevel}`, inline: true },
        { name: "Progreso", value: `\`${bar}${empty}\` ${stats.xpPercentage}%` }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: "zeew.space" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "leaderboard") {
    const leaderboard = await levels.getLeaderboard(interaction.guildId!, 10);

    const description = leaderboard
      .map((entry, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
        return `${medal} <@${entry.user}> — Nivel ${entry.level} (${entry.xp} XP)`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`🏆 Leaderboard — ${interaction.guild!.name}`)
      .setDescription(description || "No hay usuarios aún")
      .setFooter({ text: "zeew.space" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
});

// ─── Login ─────────────────────────────────────────────
client.login(TOKEN);
```

## Comandos a Registrar

```typescript
import { SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Ver tu rango de nivel"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Ver la tabla de clasificación"),
];
```

## package.json

```json
{
  "name": "my-levels-bot",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node --loader ts-node/esm src/index.ts"
  },
  "dependencies": {
    "discord.js": "^14.14.0",
    "zeew-levels": "^2.1.0"
  },
  "devDependencies": {
    "ts-node": "^10.9.0",
    "typescript": "^5.3.0"
  }
}
```

## Estructura

```
my-bot/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```
