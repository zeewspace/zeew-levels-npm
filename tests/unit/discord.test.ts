import { describe, it, expect } from "vitest";
import {
  rankCard,
  leaderboardEmbed,
  levelUpMessage,
  prestigeMessage,
  statsEmbed,
} from "../../src/discord";

describe("discord helpers", () => {
  const mockStats = {
    user: "u1", guild: "g1", xp: 50, level: 5, totalXp: 500,
    prestige: 1, messages: 100, lastXpAt: Date.now(),
    rank: 3, xpForNextLevel: 100, xpProgress: 0.5,
    xpPercentage: 50, messagesToNextLevel: 17,
  };

  const mockLeaderboard = [
    { user: "a", guild: "g1", xp: 100, level: 10, totalXp: 1000, prestige: 2 },
    { user: "b", guild: "g1", xp: 50, level: 5, totalXp: 500, prestige: 0 },
  ];

  describe("rankCard", () => {
    it("creates embed with user stats", () => {
      const embed = rankCard(mockStats, "TestUser");
      expect(embed.title).toContain("Level");
      expect(embed.fields).toBeDefined();
      expect(embed.fields!.length).toBeGreaterThan(0);
      expect(embed.color).toBe(0x5865f2);
    });
  });

  describe("leaderboardEmbed", () => {
    it("creates leaderboard embed", () => {
      const embed = leaderboardEmbed(mockLeaderboard, "TestGuild");
      expect(embed.title).toContain("Leaderboard");
      expect(embed.description).toContain("a");
      expect(embed.description).toContain("b");
    });

    it("returns empty message for no entries", () => {
      const embed = leaderboardEmbed([], "TestGuild");
      expect(embed.description).toBe("No users found.");
    });
  });

  describe("levelUpMessage", () => {
    it("creates level up embed", () => {
      const embed = levelUpMessage("TestUser", 10, [{ level: 10, roleId: "r1", type: "role" }]);
      expect(embed.title).toContain("Level Up");
      expect(embed.description).toContain("TestUser");
      expect(embed.description).toContain("10");
    });
  });

  describe("prestigeMessage", () => {
    it("creates prestige embed", () => {
      const embed = prestigeMessage("TestUser", 3, 0.3);
      expect(embed.title).toContain("Prestige");
      expect(embed.description).toContain("TestUser");
      expect(embed.description).toContain("3");
    });
  });

  describe("statsEmbed", () => {
    it("creates stats embed", () => {
      const embed = statsEmbed(mockStats, "TestUser");
      expect(embed.title).toContain("Stats");
      expect(embed.fields).toBeDefined();
      expect(embed.fields!.length).toBeGreaterThan(0);
    });
  });
});
