import type { LevelRecord, UserStats, LeaderboardEntry, LevelReward } from "./types";
import { progressBar, formatXp, formatLevel, rankSuffix } from "./utils";

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  thumbnail?: { url: string };
  timestamp?: string;
}

export function rankCard(stats: UserStats, username: string, avatarUrl?: string): DiscordEmbed {
  const bar = progressBar(stats.xpPercentage, 20);

  return {
    title: `${formatLevel(stats.level, stats.prestige)}`,
    color: 0x5865f2,
    thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
    fields: [
      { name: "XP", value: `${formatXp(stats.xp)} / ${formatXp(stats.xpForNextLevel)}`, inline: true },
      { name: "Rank", value: `#${stats.rank}`, inline: true },
      { name: "Prestige", value: `P${stats.prestige}`, inline: true },
      { name: "Progress", value: `\`${bar}\` ${stats.xpPercentage}%`, inline: false },
      { name: "Messages", value: stats.messages.toLocaleString(), inline: true },
      { name: "Total XP", value: formatXp(stats.totalXp), inline: true },
    ],
    footer: { text: `${username} — zeew.space` },
    timestamp: new Date().toISOString(),
  };
}

export function leaderboardEmbed(
  entries: LeaderboardEntry[],
  guildName: string,
  page: number = 1,
  perPage: number = 10
): DiscordEmbed {
  const start = (page - 1) * perPage;
  const pageEntries = entries.slice(start, start + perPage);
  const totalPages = Math.ceil(entries.length / perPage);

  const description = pageEntries
    .map((e, i) => {
      const rank = start + i + 1;
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
      return `${medal} **${e.user}** — Level ${e.level} (${formatXp(e.xp)} XP)`;
    })
    .join("\n");

  return {
    title: `🏆 Leaderboard — ${guildName}`,
    description: description || "No users found.",
    color: 0xf1c40f,
    footer: { text: `Page ${page}/${totalPages} — zeew.space` },
    timestamp: new Date().toISOString(),
  };
}

export function levelUpMessage(user: string, newLevel: number, rewards: LevelReward[]): DiscordEmbed {
  const rewardText = rewards.length > 0
    ? rewards.map((r) => `• ${r.type === "role" ? `<@&${r.roleId}>` : `+${r.amount} XP`}`).join("\n")
    : "No rewards for this level.";

  return {
    title: `🎉 Level Up!`,
    description: `Congratulations **${user}**! You've reached **Level ${newLevel}**!`,
    color: 0x2ecc71,
    fields: [
      { name: "New Level", value: `${newLevel}`, inline: true },
      { name: "Rewards", value: rewardText, inline: false },
    ],
    footer: { text: "zeew.space" },
    timestamp: new Date().toISOString(),
  };
}

export function prestigeMessage(user: string, newPrestige: number, bonus: number): DiscordEmbed {
  return {
    title: `⭐ Prestige!`,
    description: `**${user}** has reached **Prestige ${newPrestige}**!`,
    color: 0xe74c3c,
    fields: [
      { name: "Prestige", value: `${newPrestige}`, inline: true },
      { name: "XP Bonus", value: `+${Math.round(bonus * 100)}%`, inline: true },
    ],
    footer: { text: "zeew.space" },
    timestamp: new Date().toISOString(),
  };
}

export function statsEmbed(stats: UserStats, username: string): DiscordEmbed {
  return {
    title: `📊 Stats — ${username}`,
    color: 0x9b59b6,
    fields: [
      { name: "Level", value: `${stats.level}`, inline: true },
      { name: "XP", value: `${formatXp(stats.xp)} / ${formatXp(stats.xpForNextLevel)}`, inline: true },
      { name: "Rank", value: `#${stats.rank}`, inline: true },
      { name: "Prestige", value: `P${stats.prestige}`, inline: true },
      { name: "Total XP", value: formatXp(stats.totalXp), inline: true },
      { name: "Messages", value: stats.messages.toLocaleString(), inline: true },
      { name: "Progress", value: `\`${progressBar(stats.xpPercentage)}\` ${stats.xpPercentage}%`, inline: false },
      { name: "Est. Messages to Next Level", value: `${stats.messagesToNextLevel}`, inline: true },
    ],
    footer: { text: "zeew.space" },
    timestamp: new Date().toISOString(),
  };
}
