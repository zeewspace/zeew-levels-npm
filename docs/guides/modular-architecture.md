# Arquitectura Modular

> Cómo integrar zeew-levels en bots con estructura modular (src/commands, src/events, src/utils, etc).

## Por Qué Modularizar

Los bots grandes se vuelven inmanejables en un solo archivo. La arquitectura modular separa:

- **Comandos** → `src/commands/` (uno por archivo)
- **Eventos** → `src/events/` (uno por archivo)
- **Utilidades** → `src/utils/` (funciones compartidas)
- **Configuración** → `src/config/` (constantes, env)
- **Handlers** → `src/handlers/` (carga automática)

## Estructura

```
my-bot/
├── src/
│   ├── commands/
│   │   ├── rank.ts
│   │   ├── leaderboard.ts
│   │   ├── stats.ts
│   │   ├── prestige.ts
│   │   └── setxp.ts
│   ├── events/
│   │   ├── ready.ts
│   │   ├── messageCreate.ts
│   │   ├── interactionCreate.ts
│   │   └── voiceStateUpdate.ts
│   ├── handlers/
│   │   ├── commandHandler.ts
│   │   └── eventHandler.ts
│   ├── utils/
│   │   ├── levels.ts          ← Instancia de zeew-levels
│   │   ├── embeds.ts          ← Helpers de embeds
│   │   └── permissions.ts     ← Verificación de permisos
│   ├── config/
│   │   ├── constants.ts
│   │   └── env.ts
│   ├── types/
│   │   └── index.ts           ← Tipos personalizados
│   └── index.ts               ← Entry point
├── package.json
└── tsconfig.json
```

## Paso 1: Instancia de zeew-levels (Singleton)

```typescript
// src/utils/levels.ts
import { ZeewLevels, MysqlAdapter } from "zeew-levels";
import { env } from "../config/env";

let instance: ZeewLevels | null = null;

export function getLevels(): ZeewLevels {
  if (!instance) {
    const adapter = new MysqlAdapter({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
    });

    instance = new ZeewLevels(adapter, {
      xpPerMessage: { min: 1, max: 5 },
      levelUpThreshold: 1000,
      maxLevel: 100,
      cache: { enabled: true, maxSize: 5000, ttl: 300000 },
      cooldown: { messageCooldown: 5000 },
      prestige: {
        enabled: true,
        requiredLevel: 50,
        maxPrestige: 10,
        resetLevel: 1,
        bonusPerPrestige: 0.1,
      },
    });
  }

  return instance;
}

// Inicializar DB (llamar en ready)
export async function initLevels(): Promise<void> {
  const levels = getLevels();
  await levels.init();
}
```

## Paso 2: Configuración de Entorno

```typescript
// src/config/env.ts
export const env = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN!,
  CLIENT_ID: process.env.CLIENT_ID!,
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_USER: process.env.DB_USER || "root",
  DB_PASS: process.env.DB_PASS || "",
  DB_NAME: process.env.DB_NAME || "bot_levels",
  GUILD_ID: process.env.GUILD_ID!,          // Guild de prueba
  VIP_ROLE_ID: process.env.VIP_ROLE_ID!,    // Rol VIP
};
```

## Paso 3: Handlers de Carga Automática

### Command Handler

```typescript
// src/handlers/commandHandler.ts
import { Collection, REST, Routes, Client } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { env } from "../config/env";

export interface Command {
  data: any; // SlashCommandBuilder
  execute: (interaction: any) => Promise<void>;
}

export async function loadCommands(client: Client): Promise<void> {
  client.commands = new Collection<string, Command>();

  const commandsPath = join(__dirname, "..", "commands");
  const commandFiles = readdirSync(commandsPath).filter(
    (file) => file.endsWith(".ts") || file.endsWith(".js")
  );

  const commands = [];

  for (const file of commandFiles) {
    const command = await import(join(commandsPath, file));
    const cmd: Command = command.default;
    client.commands.set(cmd.data.name, cmd);
    commands.push(cmd.data.toJSON());
  }

  // Registrar comandos en Discord
  const rest = new REST().setToken(env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(env.CLIENT_ID), {
    body: commands,
  });

  console.log(`📝 ${commands.length} comandos registrados`);
}
```

### Event Handler

```typescript
// src/handlers/eventHandler.ts
import { Client } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";

export async function loadEvents(client: Client): Promise<void> {
  const eventsPath = join(__dirname, "..", "events");
  const eventFiles = readdirSync(eventsPath).filter(
    (file) => file.endsWith(".ts") || file.endsWith(".js")
  );

  for (const file of eventFiles) {
    const event = await import(join(eventsPath, file));
    const { name, once, execute } = event.default;

    if (once) {
      client.once(name, (...args) => execute(...args));
    } else {
      client.on(name, (...args) => execute(...args));
    }

    console.log(`🎯 Evento cargado: ${name}`);
  }
}
```

## Paso 4: Entry Point Limpio

```typescript
// src/index.ts
import { Client, GatewayIntentBits, Collection } from "discord.js";
import { loadCommands, Command } from "./handlers/commandHandler";
import { loadEvents } from "./handlers/eventHandler";
import { initLevels } from "./utils/levels";
import { env } from "./config/env";

// Extender Client con commands
declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

async function start() {
  await loadCommands(client);
  await loadEvents(client);
  await initLevels();

  client.login(env.DISCORD_TOKEN);
}

start();
```

## Paso 5: Eventos Separados

### ready.ts

```typescript
// src/events/ready.ts
import { Client } from "discord.js";
import { getLevels } from "../utils/levels";
import { env } from "../config/env";

export default {
  name: "ready",
  once: true,
  async execute(client: Client) {
    console.log(`✅ Bot listo como ${client.user?.tag}`);

    const levels = getLevels();
    const guild = client.guilds.cache.get(env.GUILD_ID);
    if (!guild) return;

    // Configurar multiplicadores
    await levels.addMultiplier(guild.id, {
      id: "vip",
      value: 2,
      source: "role",
      roleId: env.VIP_ROLE_ID,
    });

    await levels.addMultiplier(guild.id, {
      id: "booster",
      value: 1.5,
      source: "boost",
    });

    // Configurar recompensas
    const rewards = [
      { level: 5, roleId: "ROLE_5", type: "role" as const },
      { level: 10, roleId: "ROLE_10", type: "role" as const },
      { level: 25, roleId: "ROLE_25", type: "role" as const },
      { level: 50, roleId: "ROLE_50", type: "role" as const },
      { level: 100, roleId: "ROLE_100", type: "role" as const },
    ];

    for (const reward of rewards) {
      await levels.addReward(guild.id, reward);
    }

    console.log(`⚙️ Configuración de niveles aplicada a ${guild.name}`);
  },
};
```

### messageCreate.ts

```typescript
// src/events/messageCreate.ts
import { Message } from "discord.js";
import { getLevels } from "../utils/levels";

export default {
  name: "messageCreate",
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
      const { EmbedBuilder } = await import("discord.js");

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(
          `🎉 ¡${message.author} alcanzó el **Nivel ${result.newLevel}**!`
        )
        .setTimestamp();

      // Asignar roles de recompensa
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
// src/events/interactionCreate.ts
import { Interaction } from "discord.js";
import { getLevels } from "../utils/levels";

export default {
  name: "interactionCreate",
  once: false,
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    const client = interaction.client;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      return interaction.reply({
        content: "❌ Comando no encontrado",
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error en ${interaction.commandName}:`, error);
      const reply = {
        content: "❌ Error al ejecutar el comando",
        ephemeral: true,
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

### voiceStateUpdate.ts

```typescript
// src/events/voiceStateUpdate.ts
import { VoiceState } from "discord.js";
import { getLevels } from "../utils/levels";

const voiceCooldown = new Map<string, number>();

export default {
  name: "voiceStateUpdate",
  once: false,
  async execute(oldState: VoiceState, newState: VoiceState) {
    const userId = newState.member?.id;
    const guildId = newState.guild.id;
    if (!userId || !guildId) return;

    // Solo cuando entra a un canal
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

## Paso 6: Comandos Separados

### rank.ts

```typescript
// src/commands/rank.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
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
        ephemeral: true,
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
// src/commands/leaderboard.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
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
// src/commands/prestige.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
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
// src/commands/setxp.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { getLevels } from "../utils/levels";

export default {
  data: new SlashCommandBuilder()
    .setName("setxp")
    .setDescription("Establecer XP de un usuario (admin)")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Usuario").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Cantidad").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has("Administrator")) {
      return interaction.reply({
        content: "❌ Necesitas permisos de administrador",
        ephemeral: true,
      });
    }

    const levels = getLevels();
    const targetUser = interaction.options.getUser("user")!;
    const amount = interaction.options.getInteger("amount")!;

    await levels.setXp(targetUser.id, interaction.guildId!, amount);

    await interaction.reply({
      content: `✅ XP de ${targetUser} establecido a ${amount}`,
      ephemeral: true,
    });
  },
};
```

## Enfoque Alternativo: Carga por Directorios

Si no quieres un event handler manual, puedes usar carga automática:

```typescript
// src/handlers/autoLoader.ts
import { Client } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";

export function autoLoad(client: Client): void {
  // Cargar comandos
  const commandsPath = join(__dirname, "..", "commands");
  for (const file of readdirSync(commandsPath)) {
    if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
    import(join(commandsPath, file)).then((mod) => {
      const cmd = mod.default;
      client.commands.set(cmd.data.name, cmd);
    });
  }

  // Cargar eventos
  const eventsPath = join(__dirname, "..", "events");
  for (const file of readdirSync(eventsPath)) {
    if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
    import(join(eventsPath, file)).then((mod) => {
      const { name, once, execute } = mod.default;
      if (once) {
        client.once(name, (...args) => execute(...args));
      } else {
        client.on(name, (...args) => execute(...args));
      }
    });
  }
}
```

## Resumen de Patrones

| Patrón | Cuándo usarlo |
|--------|---------------|
| `getLevels()` singleton | Cuando necesitas la misma instancia en múltiples archivos |
| `levels` en constructor | Cuando el comando recibe dependencias por DI |
| `levels` como variable global | Nunca — evita esta práctica |
| `levels` por guild | Cuando cada guild tiene configuración diferente |

## Tips

1. **Nunca crees múltiples instancias** de `ZeewLevels` — usa el singleton
2. **Inicializa `init()` una sola vez** en el evento `ready`
3. **Pasa `userRoles`** a `processMessage()` para multiplicadores
4. **Usa `getLevels()`** desde cualquier archivo que necesite acceso
5. **Configura multiplicadores y recompensas** en `ready`, no en cada mensaje
