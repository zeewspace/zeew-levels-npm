# Integración con Discord.js

> Guía paso a paso para integrar zeew-levels con Discord.js v14+.

## Instalación

```bash
npm install zeew-levels discord.js
```

## Setup Básico

```typescript
import { Client, GatewayIntentBits } from "discord.js";
import { ZeewLevels, JsonAdapter } from "zeew-levels";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const adapter = new JsonAdapter("./levels.json");
const levels = new ZeewLevels(adapter);

client.once("ready", () => {
  console.log(`Bot listo como ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const result = await levels.processMessage(
    message.author.id,
    message.guild.id
  );

  if (result.type === "level_up") {
    message.channel.send(
      `🎉 ¡${message.author} subió al nivel **${result.newLevel}**!`
    );
  }
});

client.login(TOKEN);
```

## Setup con Multiplicadores

```typescript
import { Client, GatewayIntentBits } from "discord.js";
import { ZeewLevels, MysqlAdapter } from "zeew-levels";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // Necesario para boosters
  ],
});

const adapter = new MysqlAdapter({
  host: "localhost",
  user: "root",
  password: "pass",
  database: "bot",
});

const levels = new ZeewLevels(adapter, {
  xpPerMessage: { min: 1, max: 5 },
  levelUpThreshold: 1000,
  cache: { enabled: true, maxSize: 5000, ttl: 300000 },
  cooldown: { messageCooldown: 5000 },
});

await levels.init();

client.once("ready", async () => {
  for (const guild of client.guilds.cache.values()) {
    await levels.addMultiplier(guild.id, {
      id: "vip",
      value: 2,
      source: "role",
      roleId: "VIP_ROLE_ID",
    });

    await levels.addMultiplier(guild.id, {
      id: "booster",
      value: 1.5,
      source: "boost",
    });
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const userRoles = message.member?.roles.cache.map((r) => r.id) ?? [];

  const result = await levels.processMessage(
    message.author.id,
    message.guild.id,
    userRoles
  );

  if (result.type === "level_up") {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(
        `🎉 ¡${message.author} alcanzó el **Nivel ${result.newLevel}**!`
      );

    for (const reward of result.rewards) {
      if (reward.type === "role") {
        await message.member?.roles.add(reward.roleId);
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

client.login(TOKEN);
```

## Registrar Comandos

```typescript
import { SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Ver tu rango de nivel"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Ver la tabla de clasificación")
    .addIntegerOption((opt) =>
      opt.setName("page").setDescription("Página").setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Ver estadísticas detalladas"),
];

// Registrar comandos
client.once("ready", async () => {
  const rest = new REST().setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands.map((c) => c.toJSON()),
  });
});
```

## Manejar Comandos

```typescript
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) return;

  const { commandName } = interaction;

  if (commandName === "rank") {
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

    const embed = rankCard(
      stats,
      interaction.user.username,
      interaction.user.displayAvatarURL()
    );

    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === "leaderboard") {
    const page = interaction.options.getInteger("page") ?? 1;
    const leaderboard = await levels.getLeaderboard(interaction.guildId!, 50);
    const embed = leaderboardEmbed(
      leaderboard,
      interaction.guild!.name,
      page
    );

    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === "stats") {
    const stats = await levels.getUserStats(
      interaction.user.id,
      interaction.guildId!
    );

    if (!stats) {
      return interaction.reply({
        content: "❌ Aún no tienes datos",
        ephemeral: true,
      });
    }

    const embed = statsEmbed(stats, interaction.user.username);
    await interaction.reply({ embeds: [embed] });
  }
});
```

## Eventos de Voz (XP por voz)

```typescript
import { GatewayIntentBits, VoiceState } from "discord.js";

// Agregar intent de voz
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Cooldown de voz
const voiceCooldown = new Map<string, number>();

client.on("voiceStateUpdate", async (oldState, newState) => {
  const userId = newState.member?.id;
  const guildId = newState.guild.id;
  if (!userId || !guildId) return;

  // Usuario entró a un canal de voz
  if (!oldState.channel && newState.channel) {
    const cooldownKey = `${userId}:${guildId}`;
    const lastXp = voiceCooldown.get(cooldownKey) ?? 0;

    if (Date.now() - lastXp > 60000) { // 1 minuto de cooldown
      const result = await levels.addXp(userId, guildId, 10);
      voiceCooldown.set(cooldownKey, Date.now());

      if (result.type === "level_up") {
        const channel = newState.guild.channels.cache.get(ANNOUNCEMENT_CHANNEL);
        if (channel?.isTextBased()) {
          channel.send(
            `🎤 ¡${newState.member.user} subió al nivel **${result.newLevel}** por actividad en voz!`
          );
        }
      }
    }
  }
});
```

## Permisos del Bot

Asegúrate de que tu bot tenga estos permisos:
- `Send Messages` — Para enviar mensajes
- `Use Slash Commands` — Para comandos
- `Manage Roles` — Para asignar roles de recompensa
- `Read Message History` — Para processMessage
