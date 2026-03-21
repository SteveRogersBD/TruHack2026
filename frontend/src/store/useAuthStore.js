/**
 * Zustand auth store.
 * Persists token and user to localStorage on login, clears on logout.
 * @module useAuthStore
 */

import { create } from 'zustand';

const TOKEN_KEY = 'scholar_token';
const USER_KEY = 'scholar_user';

/**
 * Reads persisted auth state from localStorage.
 * @returns {{ token: string|null, user: object|null }}
 */
function loadPersistedAuth() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

const { token: initialToken, user: initialUser } = loadPersistedAuth();

const useAuthStore = create((set) => ({
  /** @type {string|null} */
  token: initialToken,

  /** @type {{ id: string, email: string, role: string, created_at: string }|null} */
  user: initialUser,

  /**
   * Saves token and user to state and localStorage.
   * @param {string} token
   * @param {{ id: string, email: string, role: string, created_at: string }} user
   */
  login: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  /**
   * Clears auth state and localStorage.
   */
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
}));

export default useAuthStore;
