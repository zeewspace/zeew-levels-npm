import { describe, it, expect, beforeEach } from "vitest";
import { LruCache } from "../../src/cache";

describe("LruCache", () => {
  let cache: LruCache<string, number>;

  beforeEach(() => {
    cache = new LruCache(3, 60000);
  });

  it("stores and retrieves values", () => {
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts oldest entry when full", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4); // evicts "a"
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("d")).toBe(4);
  });

  it("moves accessed entry to end (LRU)", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.get("a"); // access "a", now "b" is oldest
    cache.set("d", 4); // should evict "b"
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
  });

  it("deletes entries", () => {
    cache.set("a", 1);
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
  });

  it("checks existence", () => {
    cache.set("a", 1);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
  });

  it("clears all entries", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("prunes expired entries", async () => {
    const shortCache = new LruCache(10, 10); // 10ms TTL
    shortCache.set("a", 1);
    // Wait for expiry
    await new Promise((r) => setTimeout(r, 20));
    const pruned = shortCache.prune();
    expect(pruned).toBe(1);
    expect(shortCache.get("a")).toBeUndefined();
  });
});
