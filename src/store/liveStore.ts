import { create } from 'zustand';
import type { FeedStatus } from '../types/api';

export type WsState = 'connecting' | 'open' | 'closed';

export interface LiveEvent {
  type: string;
  ts: string;
  data: Record<string, unknown>;
}

interface LiveState {
  ws: WsState;
  feed: FeedStatus | null;
  lastMessageAt: number | null;
  recent: LiveEvent[];
  setWs: (s: WsState) => void;
  setFeed: (f: FeedStatus) => void;
  push: (e: LiveEvent) => void;
}

// Client-side cache of pushed updates. Not authoritative: pages re-read persisted state from the API.
export const useLiveStore = create<LiveState>((set) => ({
  ws: 'connecting',
  feed: null,
  lastMessageAt: null,
  recent: [],
  setWs: (ws) => set({ ws }),
  setFeed: (feed) => set({ feed }),
  push: (e) => set((s) => ({ lastMessageAt: Date.now(), recent: [e, ...s.recent].slice(0, 100) })),
}));
