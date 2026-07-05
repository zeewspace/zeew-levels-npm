# Integración con Discord.js

> Guía paso a paso para integrar zeew-levels con Discord.js v14.26+.
> Patrones verificados con la documentación oficial actualizada.

## Instalación

```bash
npm install zeew-levels discord.js
```

## Setup Básico

```typescript
import { Client, Events, GatewayIntentBits, EmbedBuilder } from "discord.js";
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

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Bot listo como ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
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
        `🎉 ¡${message.author} subió al nivel **${result.newLevel}**!`
      );

    await message.channel.send({ embeds: [embed] });
  }
});

client.login(TOKEN);
```

## Setup con Multiplicadores

```typescript
import { Client, Events, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { ZeewLevels, MysqlAdapter } from "zeew-levels";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // Para boosters
    GatewayIntentBits.GuildVoiceStates, // Para XP de voz
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

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Bot listo como ${readyClient.user.tag}`);

  // Configurar multiplicadores por guild
  for (const guild of readyClient.guilds.cache.values()) {
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

client.on(Events.MessageCreate, async (message) => {
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

## Registrar Comandos (Script Separado)

Los comandos se registran en un script separado, **no dentro del bot**. Esto es el patrón oficial de discord.js.

### deploy-commands.ts

```typescript
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;
const GUILD_ID = process.env.GUILD_ID!; // Opcional: para comandos de guild específica

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
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function deploy() {
  try {
    console.log(`🔄 Registrando ${commands.length} comandos...`);

    // Comandos globales (tardan ~1 hora en propagarse)
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands.map((c) => c.toJSON()),
    });

    // O: Comandos de guild específica (instantáneo, para testing)
    // await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    //   body: commands.map((c) => c.toJSON()),
    // });

    console.log(`✅ ${commands.length} comandos registrados`);
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
  }
}

deploy();
```

### Ejecutar deploy

```bash
npx ts-node deploy-commands.ts
```

### package.json scripts

```json
{
  "scripts": {
    "deploy": "ts-node deploy-commands.ts",
    "start": "node --loader ts-node/esm src/index.ts",
    "dev": "nodemon --exec ts-node src/index.ts"
  }
}
```

## Manejar Comandos

```typescript
import {
  Client,
  Events,
  GatewayIntentBits,
  Collection,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";

// Extender Client con commands Collection
declare module "discord.js" {
  interface Client {
    commands: Collection<string, {
      data: any;
      execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    }>;
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// Cargar comandos dinámicamente
import { readdirSync } from "fs";
import { join } from "path";

const commandsPath = join(__dirname, "commands");
const commandFiles = readdirSync(commandsPath).filter(
  (f) => f.endsWith(".ts") || f.endsWith(".js")
);

for (const file of commandFiles) {
  const command = await import(join(commandsPath, file));
  const cmd = command.default;
  client.commands.set(cmd.data.name, cmd);
}

// Manejar interacciones
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error en ${interaction.commandName}:`, error);

    const reply = {
      content: "❌ Error al ejecutar el comando",
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.login(TOKEN);
```

## Comandos Individuales

### rank.ts

```typescript
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getLevels } from "../utils/levels";
import { rankCard } from "zeew-levels";

export default {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Ver tu rango de nivel"),

  async execute(interaction: ChatInputCommandInteraction) {
    const levels = getLevels();

    const stats = await levels.getUserStats(
      interaction.user.id,
      interaction.guildId!
    );

    if (!stats) {
      return interaction.reply({
        content: "❌ Aún no tienes datos de nivel",
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = rankCard(
      stats,
      interaction.user.username,
      interaction.user.displayAvatarURL()
    );

    await interaction.reply({ embeds: [embed] });
  },
};
```

### leaderboard.ts

```typescript
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { getLevels } from "../utils/levels";
import { leaderboardEmbed } from "zeew-levels";

export default {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Ver la tabla de clasificación")
    .addIntegerOption((opt) =>
      opt.setName("page").setDescription("Página").setMinValue(1)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const levels = getLevels();
    const page = interaction.options.getInteger("page") ?? 1;

    const leaderboard = await levels.getLeaderboard(interaction.guildId!, 50);
    const embed = leaderboardEmbed(
      leaderboard,
      interaction.guild!.name,
      page
    );

    await interaction.reply({ embeds: [embed] });
  },
};
```

### prestige.ts

```typescript
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { getLevels } from "../utils/levels";
import { prestigeMessage } from "zeew-levels";

export default {
  data: new SlashCommandBuilder()
    .setName("prestige")
    .setDescription("Prestigiar (resetear nivel por bonus)"),

  async execute(interaction: ChatInputCommandInteraction) {
    const levels = getLevels();

    const { can, reason } = await levels.canPrestige(
      interaction.user.id,
      interaction.guildId!
    );

    if (!can) {
      return interaction.reply({
        content: `❌ No puedes prestigiar: ${reason}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = await levels.getUser(interaction.user.id, interaction.guildId!);
    const nextPrestige = (user?.prestige ?? 0) + 1;
    const bonus = nextPrestige * 10;

    const confirmEmbed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("⭐ Confirmar Prestigio")
      .setDescription(
        `¿Estás seguro?\n\n` +
        `• Nivel se reseteará a **1**\n` +
        `• XP se pondrá a **0**\n` +
        `• Prestigio será **${nextPrestige}**\n` +
        `• XP bonus: **+${bonus}%**`
      );

    const reply = await interaction.reply({
      embeds: [confirmEmbed],
      fetchReply: true,
    });

    await reply.react("✅");
    await reply.react("❌");

    const filter = (reaction: any, user: any) =>
      ["✅", "❌"].includes(reaction.emoji.name) &&
      user.id === interaction.user.id;

    const collector = reply.createReactionCollector({
      filter,
      time: 30000,
    });

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
        await interaction.editReply({
          content: "Prestigio cancelado",
          embeds: [],
        });
      }
    });
  },
};
```

### setxp.ts (Admin)

```typescript
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { getLevels } from "../utils/levels";

export default {
  data: new SlashCommandBuilder()
    .setName("setxp")
    .setDescription("Establecer XP de un usuario (admin)")
    .setDefaultMemberPermissions(
      1 << 3 // Administrator permission bit
    )
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Usuario").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Cantidad").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const levels = getLevels();
    const targetUser = interaction.options.getUser("user")!;
    const amount = interaction.options.getInteger("amount")!;

    await levels.setXp(targetUser.id, interaction.guildId!, amount);

    await interaction.reply({
      content: `✅ XP de ${targetUser} establecido a ${amount}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
```

## Eventos de Voz (XP por voz)

```typescript
import { Events, VoiceState } from "discord.js";
import { getLevels } from "../utils/levels";

const voiceCooldown = new Map<string, number>();

export default {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState: VoiceState, newState: VoiceState) {
    const userId = newState.member?.id;
    const guildId = newState.guild.id;
    if (!userId || !guildId) return;

    // Usuario entró a un canal de voz
    if (!oldState.channel && newState.channel) {
      const cooldownKey = `${userId}:${guildId}`;
      const lastXp = voiceCooldown.get(cooldownKey) ?? 0;

      if (Date.now() - lastXp > 60000) {
        const levels = getLevels();
        const result = await levels.addXp(userId, guildId, 10);
        voiceCooldown.set(cooldownKey, Date.now());

        if (result.type === "level_up") {
          const channel = newState.guild.channels.cache.find(
            (c) => c.name === "niveles"
          );

          if (channel?.isTextBased()) {
            const { EmbedBuilder } = await import("discord.js");
            const embed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setDescription(
                `🎤 ¡${newState.member.user} alcanzó el **Nivel ${result.newLevel}** por actividad en voz!`
              );
            channel.send({ embeds: [embed] });
          }
        }
      }
    }
  },
};
```

## Eventos Separados

### ready.ts

```typescript
import { Events, Client } from "discord.js";
import { getLevels } from "../utils/levels";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    console.log(`✅ Bot listo como ${client.user?.tag}`);

    const levels = getLevels();
    await levels.init();

    // Configurar multiplicadores
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

    console.log(`⚙️ Configuración de niveles aplicada`);
  },
};
```

### messageCreate.ts

```typescript
import { Events, Message, EmbedBuilder } from "discord.js";
import { getLevels } from "../utils/levels";

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const levels = getLevels();

    const result = await levels.processMessage(
      message.author.id,
      message.guild.id,
      message.member?.roles.cache.map((r) => r.id) ?? []
    );

    if (result.type === "level_up") {
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(
          `🎉 ¡${message.author} alcanzó el **Nivel ${result.newLevel}**!`
        );

      for (const reward of result.rewards) {
        if (reward.type === "role" && message.member) {
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
  },
};
```

### interactionCreate.ts

```typescript
import { Events, Interaction } from "discord.js";

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    const client = interaction.client;
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error en ${interaction.commandName}:`, error);

      const reply = {
        content: "❌ Error al ejecutar el comando",
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};
```

## Permisos del Bot

Asegúrate de que tu bot tenga estos permisos en el Developer Portal:
- `Send Messages` — Para enviar mensajes
- `Use Slash Commands` — Para comandos
- `Manage Roles` — Para asignar roles de recompensa
- `Read Message History` — Para processMessage
- `View Channels` — Para acceder a canales

## Notas de discord.js v14.26

- **`Events.ClientReady`** — Se usa `ClientReady` en vez de solo `ready` para mejor tipado
- **`Events.MessageCreate`** — Constante enum en vez de string `"messageCreate"`
- **`Events.InteractionCreate`** — Constante enum en vez de string `"interactionCreate"`
- **`MessageFlags.Ephemeral`** — Para respuestas efímeras (en vez de `{ ephemeral: true }`)
- **`REST({ version: "10" })`** — Versión explícita de la API REST
- **`setDefaultMemberPermissions()`** — Para comandos de admin (en vez de `Permissions`)
- **Deploy separado** — Los comandos se registran en un script independiente, no en el bot
