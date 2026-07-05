# Bot Premium Completo

> Bot con todas las features: multiplicadores, cooldowns, recompensas, prestigio, cache.

## Código Completo

```typescript
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
} from "discord.js";
import {
  ZeewLevels,
  MysqlAdapter,
  rankCard,
  leaderboardEmbed,
  levelUpMessage,
  prestigeMessage,
  formatXp,
} from "zeew-levels";

// ─── Configuración ─────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "";
const DB_NAME = process.env.DB_NAME || "bot_levels";

// ─── Cliente Discord ───────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ─── zeew-levels ───────────────────────────────────────
const adapter = new MysqlAdapter({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
});

const levels = new ZeewLevels(adapter, {
  xpPerMessage: { min: 1, max: 5 },
  levelUpThreshold: 1000,
  maxLevel: 100,
  cache: { enabled: true, maxSize: 5000, ttl: 300000 },
  cooldown: {
    messageCooldown: 5000,
    voiceCooldown: 60000,
    commandCooldown: 3000,
  },
  prestige: {
    enabled: true,
    requiredLevel: 50,
    maxPrestige: 10,
    resetLevel: 1,
    bonusPerPrestige: 0.1,
  },
  xpCurve: { name: "exponential", base: 100, multiplier: 1.5 },
  logger: console,
});

// ─── Inicializar ───────────────────────────────────────
client.once("ready", async () => {
  console.log(`✅ Bot listo como ${client.user?.tag}`);

  // Init DB
  await levels.init();

  // Configurar multiplicadores por guild
  for (const guild of client.guilds.cache.values()) {
    // 2x XP para VIP
    await levels.addMultiplier(guild.id, {
      id: "vip",
      value: 2,
      source: "role",
      roleId: "VIP_ROLE_ID", // Cambiar por tu rol VIP
    });

    // 1.5x XP para boosters
    await levels.addMultiplier(guild.id, {
      id: "booster",
      value: 1.5,
      source: "boost",
    });

    // 2x XP los fines de semana (guild-wide)
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      await levels.addMultiplier(guild.id, {
        id: "weekend",
        value: 2,
        source: "guild",
      });
    }

    // Configurar recompensas
    await levels.addReward(guild.id, { level: 5, roleId: "ROLE_ID_5", type: "role" });
    await levels.addReward(guild.id, { level: 10, roleId: "ROLE_ID_10", type: "role" });
    await levels.addReward(guild.id, { level: 25, roleId: "ROLE_ID_25", type: "role" });
    await levels.addReward(guild.id, { level: 50, roleId: "ROLE_ID_50", type: "role" });
    await levels.addReward(guild.id, { level: 100, roleId: "ROLE_ID_100", type: "role" });
  }

  // Registrar comandos
  await registerCommands();
});

// ─── Registro de Comandos ──────────────────────────────
async function registerCommands() {
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

    new SlashCommandBuilder()
      .setName("prestige")
      .setDescription("Prestigiar (resetear nivel por bonus)"),

    new SlashCommandBuilder()
      .setName("setxp")
      .setDescription("Establecer XP de un usuario (admin)")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Usuario").setRequired(true)
      )
      .addIntegerOption((opt) =>
        opt.setName("amount").setDescription("Cantidad de XP").setRequired(true)
      ),
  ];

  const rest = new REST().setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands.map((c) => c.toJSON()),
  });

  console.log("📝 Comandos registrados");
}

// ─── Evento de Mensaje ─────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const userRoles = message.member?.roles.cache.map((r) => r.id) ?? [];

  const result = await levels.processMessage(
    message.author.id,
    message.guild.id,
    userRoles
  );

  if (result.type === "level_up") {
    const embed = levelUpMessage(
      message.author.toString(),
      result.newLevel,
      result.rewards
    );

    // Asignar roles de recompensa
    for (const reward of result.rewards) {
      if (reward.type === "role" && message.member) {
        await message.member.roles.add(reward.roleId);
      }
    }

    await message.channel.send({ embeds: [embed] });
  }
});

// ─── Evento de Interacción ─────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) return;

  const { commandName } = interaction;

  // ── /rank ────────────────────────────────────────────
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

  // ── /leaderboard ─────────────────────────────────────
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

  // ── /stats ───────────────────────────────────────────
  if (commandName === "stats") {
    const userStats = await levels.getUserStats(
      interaction.user.id,
      interaction.guildId!
    );

    const guildStats = await levels.getGuildStats(interaction.guildId!);

    if (!userStats) {
      return interaction.reply({
        content: "❌ Aún no tienes datos",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`📊 Estadísticas — ${interaction.user.username}`)
      .addFields(
        { name: "Nivel", value: `${userStats.level}`, inline: true },
        { name: "XP", value: `${formatXp(userStats.xp)} / ${formatXp(userStats.xpForNextLevel)}`, inline: true },
        { name: "Rank", value: `#${userStats.rank}`, inline: true },
        { name: "Prestigio", value: `P${userStats.prestige}`, inline: true },
        { name: "Total XP", value: formatXp(userStats.totalXp), inline: true },
        { name: "Mensajes", value: userStats.messages.toLocaleString(), inline: true },
        { name: "─── Servidor ───", value: "\u200b", inline: false },
        { name: "Usuarios", value: `${guildStats.totalUsers}`, inline: true },
        { name: "Nivel Promedio", value: `${guildStats.averageLevel}`, inline: true },
        { name: "Nivel Más Alto", value: `${guildStats.highestLevel}`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: "zeew.space" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // ── /prestige ────────────────────────────────────────
  if (commandName === "prestige") {
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

    const confirmEmbed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("⭐ Confirmar Prestigio")
      .setDescription(
        `¿Estás seguro de que quieres prestigiar?\n\n` +
        `• Tu nivel se reseteará a **1**\n` +
        `• Tu XP se pondrá a **0**\n` +
        `• Tu prestigio será **${nextPrestige}**\n` +
        `• XP bonus permanente: **+${bonus}%**`
      )
      .setFooter({ text: "Acción irreversible" });

    const reply = await interaction.reply({
      embeds: [confirmEmbed],
      fetchReply: true,
    });

    // Agregar reacciones para confirmar
    await reply.react("✅");
    await reply.react("❌");

    const filter = (reaction: any, user: any) =>
      ["✅", "❌"].includes(reaction.emoji.name) &&
      user.id === interaction.user.id;

    const collector = reply.createReactionCollector({ filter, time: 30000 });

    collector.on("collect", async (reaction) => {
      if (reaction.emoji.name === "✅") {
        const result = await levels.doPrestige(
          interaction.user.id,
          interaction.guildId!
        );

        if (result.type === "prestige" && result.newPrestige > 0) {
          const embed = prestigeMessage(
            interaction.user.toString(),
            result.newPrestige,
            result.newPrestige * 0.1
          );
          await interaction.editReply({ embeds: [embed] });
        }
      } else {
        await interaction.editReply({ content: "Prestigio cancelado", embeds: [] });
      }
    });
  }

  // ── /setxp (admin) ──────────────────────────────────
  if (commandName === "setxp") {
    if (!interaction.memberPermissions?.has("Administrator")) {
      return interaction.reply({
        content: "❌ Necesitas permisos de administrador",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("user")!;
    const amount = interaction.options.getInteger("amount")!;

    await levels.setXp(targetUser.id, interaction.guildId!, amount);

    await interaction.reply({
      content: `✅ XP de ${targetUser} establecido a ${amount}`,
      ephemeral: true,
    });
  }
});

// ─── Voz (XP por actividad) ────────────────────────────
const voiceCooldown = new Map<string, number>();

client.on("voiceStateUpdate", async (oldState, newState) => {
  const userId = newState.member?.id;
  const guildId = newState.guild.id;
  if (!userId || !guildId) return;

  // Solo cuando entra a un canal (no cuando se mueve)
  if (!oldState.channel && newState.channel) {
    const cooldownKey = `${userId}:${guildId}`;
    const lastXp = voiceCooldown.get(cooldownKey) ?? 0;

    if (Date.now() - lastXp > 60000) {
      const result = await levels.addXp(userId, guildId, 10);
      voiceCooldown.set(cooldownKey, Date.now());

      if (result.type === "level_up") {
        const channel = newState.guild.channels.cache.find(
          (c) => c.name === "niveles"
        );

        if (channel?.isTextBased()) {
          const embed = levelUpMessage(
            newState.member.user.toString(),
            result.newLevel,
            result.rewards
          );
          channel.send({ embeds: [embed] });
        }
      }
    }
  }
});

// ─── Hooks ─────────────────────────────────────────────
levels.onPrestige = (user, guild, newPrestige) => {
  console.log(`⭐ ${user} prestigió a P${newPrestige} en ${guild}`);
};

levels.onCooldown = (user, guild, action, retryIn) => {
  console.log(`⏳ ${user} en cooldown por ${action} (${retryIn}ms)`);
};

// ─── Login ─────────────────────────────────────────────
client.login(TOKEN);
```

## Variables de Entorno (.env)

```env
DISCORD_TOKEN=tu_token_aqui
CLIENT_ID=tu_client_id
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=bot_levels
```

## Estructura

```
my-premium-bot/
├── src/
│   └── index.ts
├── .env
├── package.json
└── tsconfig.json
```
