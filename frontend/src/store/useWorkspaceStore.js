/**
 * Zustand workspace store.
 * Manages sessions, messages, structured AI responses and loading states.
 * @module useWorkspaceStore
 */

import { create } from 'zustand';

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} user_id
 * @property {string} title
 * @property {'general'|'youtube'|'webpage'|'math'|'coding'} mode
 * @property {string} learning_goal
 * @property {string} current_code
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} session_id
 * @property {'user'|'assistant'} role
 * @property {string} content
 * @property {object} meta
 * @property {string} created_at
 */

/**
 * @typedef {Object} StructuredTutorResponse
 * @property {string} speech
 * @property {'explaining'|'thinking'|'encouraging'|'correcting'|'idle'} emotion
 * @property {'whiteboard'|'split'|'code'} canvas_mode
 * @property {Array<{type: string, content: string, language?: string, step?: number, narration?: string}>} canvas_actions
 * @property {string[]} follow_up_suggestions
 */

const useWorkspaceStore = create((set, get) => ({
  appMode: 'normal',
  setAppMode: (appMode) => set({ appMode }),

  /** @type {Session[]} */
  sessions: [],

  /** @type {Session|null} */
  currentSession: null,

  /** @type {Message[]} */
  messages: [],

  /** @type {StructuredTutorResponse|null} */
  structured: null,

  /** @type {boolean} */
  isLoading: false,

  /** @type {boolean} */
  isSending: false,

  /** @type {boolean} */
  isExecuting: false,

  /**
   * Replaces the full sessions list.
   * @param {Session[]} sessions
   */
  setSessions: (sessions) => set({ sessions }),

  /**
   * Sets the currently active session.
   * @param {Session|null} session
   */
  setCurrentSession: (session) => set({ currentSession: session }),

  /**
   * Replaces the full messages list for the current session.
   * @param {Message[]} messages
   */
  setMessages: (messages) => set({ messages }),

  /**
   * Appends a single message to the messages list.
   * @param {Message} message
   */
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  /**
   * Sets the latest structured tutor response.
   * @param {StructuredTutorResponse|null} structured
   */
  setStructured: (structured) => set({ structured }),

  /**
   * Sets the global loading flag (used for session/messages fetch).
   * @param {boolean} value
   */
  setLoading: (value) => set({ isLoading: value }),

  /**
   * Sets the sending flag (chat message in flight).
   * @param {boolean} value
   */
  setSending: (value) => set({ isSending: value }),

  /**
   * Sets the executing flag (code execution in flight).
   * @param {boolean} value
   */
  setExecuting: (value) => set({ isExecuting: value }),

  /**
   * Resets transient UI flags that should not leak between sessions.
   */
  resetTransientState: () =>
    set({
      isSending: false,
      isExecuting: false,
    }),

  /**
   * Updates a session in the sessions list by id. If it is the current session,
   * also updates currentSession.
   * @param {Session} updatedSession
   */
  updateSessionInList: (updatedSession) =>
    set((state) => {
      const sessions = state.sessions.map((s) =>
        s.id === updatedSession.id ? updatedSession : s
      );
      const currentSession =
        state.currentSession?.id === updatedSession.id
          ? updatedSession
          : state.currentSession;
      return { sessions, currentSession };
    }),

  /**
   * Updates the current session/list mode by session id.
   * @param {string} sessionId
   * @param {'general'|'youtube'|'webpage'|'math'|'coding'} mode
   */
  setSessionMode: (sessionId, mode) =>
    set((state) => {
      const sessions = state.sessions.map((session) =>
        session.id === sessionId ? { ...session, mode } : session
      );
      const currentSession =
        state.currentSession?.id === sessionId
          ? { ...state.currentSession, mode }
          : state.currentSession;
      return { sessions, currentSession };
    }),

  /**
   * Updates the current session/list code by session id.
   * @param {string} sessionId
   * @param {string} currentCode
   */
  setSessionCode: (sessionId, currentCode) =>
    set((state) => {
      const sessions = state.sessions.map((session) =>
        session.id === sessionId ? { ...session, current_code: currentCode } : session
      );
      const currentSession =
        state.currentSession?.id === sessionId
          ? { ...state.currentSession, current_code: currentCode }
          : state.currentSession;
      return { sessions, currentSession };
    }),
}));

export default useWorkspaceStore;
