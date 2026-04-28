const TOKEN_KEY = 'mini_lms_token';
const USER_KEY = 'mini_lms_user';

export const storage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      
    }
  },
  getUser<T = unknown>(): T | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  setUser(user: unknown): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      
    }
  },
};
