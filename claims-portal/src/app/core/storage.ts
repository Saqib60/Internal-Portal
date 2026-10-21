/** Small wrapper around Web Storage that never throws (private mode, blocked storage, SSR). */
export const storage = {
  get<T>(key: string, fallback: T, area: 'local' | 'session' = 'local'): T {
    try {
      const raw = (area === 'local' ? localStorage : sessionStorage).getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown, area: 'local' | 'session' = 'local'): void {
    try {
      (area === 'local' ? localStorage : sessionStorage).setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
