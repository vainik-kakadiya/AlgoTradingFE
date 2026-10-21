import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLiveStore } from '../store/liveStore';
import type { FeedStatus } from '../types/api';

// Which cached queries to refresh for each pushed message type.
const INVALIDATIONS: Record<string, string[][]> = {
  order: [['paper'], ['dashboard']],
  position: [['paper'], ['dashboard']],
  trade: [['paper'], ['dashboard'], ['trades'], ['analytics']],
  signal: [['paper'], ['dashboard']],
  session: [['paper'], ['dashboard']],
  strategy_candle: [['candles']],
  backtest: [['backtests']],
  event: [['events'], ['dashboard']],
};

function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws/dashboard`;
}

/** Keeps a WebSocket to the backend open and refreshes affected queries when updates arrive. */
export function useLiveUpdates(): void {
  const queryClient = useQueryClient();
  const { setWs, setFeed, push } = useLiveStore.getState();

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    const pending = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      flushTimer = undefined;
      for (const key of pending) queryClient.invalidateQueries({ queryKey: JSON.parse(key) });
      pending.clear();
    };

    const connect = () => {
      setWs('connecting');
      socket = new WebSocket(wsUrl());
      socket.onopen = () => {
        retry = 0;
        setWs('open');
      };
      socket.onmessage = (msg) => {
        let parsed: { type: string; ts: string; data: Record<string, unknown> };
        try {
          parsed = JSON.parse(msg.data);
        } catch {
          return;
        }
        if (parsed.type === 'feed') setFeed(parsed.data as unknown as FeedStatus);
        if (parsed.type !== 'feed' && parsed.type !== 'hello') push(parsed);
        for (const key of INVALIDATIONS[parsed.type] ?? []) pending.add(JSON.stringify(key));
        // Batch invalidations so bursts of fills/ticks don't trigger a refetch storm.
        if (pending.size && !flushTimer) flushTimer = setTimeout(flush, 750);
      };
      socket.onclose = () => {
        setWs('closed');
        if (closed) return;
        retry = Math.min(retry + 1, 6);
        timer = setTimeout(connect, 500 * 2 ** retry);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      if (flushTimer) clearTimeout(flushTimer);
      socket?.close();
    };
  }, [queryClient, setWs, setFeed, push]);
}
