import type { XpCurve, XpCurveFn } from "./types";

const CURVES: Record<string, (base: number, multiplier: number) => XpCurveFn> = {
  linear: (base, mult) => (level) => Math.floor(base + mult * level),
  quadratic: (base, mult) => (level) => Math.floor(base + mult * level * level),
  exponential: (base, mult) => (level) => Math.floor(base * Math.pow(mult, level)),
};

export function createXpCalculator(curve: XpCurve): XpCurveFn {
  if (curve.name === "custom" && curve.custom) {
    return curve.custom;
  }

  const factory = CURVES[curve.name];
  if (!factory) {
    throw new Error(`Unknown XP curve: ${curve.name}`);
  }

  return factory(curve.base ?? 100, curve.multiplier ?? 1.5);
}

export function xpForLevel(level: number, calculator: XpCurveFn): number {
  return calculator(level);
}

export function xpProgress(currentXp: number, threshold: number): number {
  if (threshold <= 0) return 0;
  return Math.min(currentXp / threshold, 1);
}

export function xpPercentage(currentXp: number, threshold: number): number {
  return Math.round(xpProgress(currentXp, threshold) * 100);
}

export function messagesToNextLevel(currentXp: number, threshold: number, avgXpPerMessage: number): number {
  const needed = threshold - currentXp;
  if (avgXpPerMessage <= 0) return Infinity;
  return Math.ceil(needed / avgXpPerMessage);
}

export function progressBar(percentage: number, length: number = 20, filled: string = "█", empty: string = "░"): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filledCount = Math.round((clamped / 100) * length);
  const emptyCount = length - filledCount;
  return filled.repeat(filledCount) + empty.repeat(emptyCount);
}

export function formatXp(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
  if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K`;
  return xp.toString();
}

export function formatLevel(level: number, prestige: number): string {
  if (prestige > 0) return `[P${prestige}] Level ${level}`;
  return `Level ${level}`;
}

export function rankSuffix(rank: number): string {
  if (rank % 100 >= 11 && rank % 100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1: return `${rank}st`;
    case 2: return `${rank}nd`;
    case 3: return `${rank}rd`;
    default: return `${rank}th`;
  }
}
