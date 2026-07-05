export class LruCache<K, V> {
  private readonly map = new Map<K, { value: V; expiresAt: number }>();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize: number = 1000, ttlMs: number = 60_000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Delete oldest (first entry)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttl });
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  has(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  prune(): number {
    let pruned = 0;
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
        pruned++;
      }
    }
    return pruned;
  }
}

export function userKey(user: string, guild: string): string {
  return `${guild}:${user}`;
}
