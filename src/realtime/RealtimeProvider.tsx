import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { API_BASE_URL } from '../api/config';
import { useAuth } from '../auth/AuthProvider';

/**
 * The server events a driver's socket can receive.
 *
 * A driver joins exactly one room — their own — so these are only ever about
 * their own deliveries. Nothing branch-facing reaches this app.
 */
export type RealtimeEvent = 'delivery.assigned' | 'delivery.unassigned';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

type Handler = (payload: unknown) => void;

interface RealtimeContextValue {
  status: ConnectionStatus;
  /** Subscribe to one server event. Returns an unsubscribe function. */
  subscribe: (event: RealtimeEvent, handler: Handler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/** The API base is `<origin>/api/v1`; the socket lives at `<origin>` path `/realtime`. */
function socketOrigin(): string {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
}

/**
 * One authenticated socket for the signed-in driver.
 *
 * **This exists because a job arriving is the one moment latency is felt in
 * this app.** Until now a driver learned about an assignment from the Home
 * screen's eight-second poll and nothing else — and only while that screen was
 * open and the driver was marked online. So "the counter assigned it" and "the
 * driver knows" were up to eight seconds and a screen-state apart, with the
 * food already on the pass. The backend now emits `delivery.assigned` into a
 * per-driver room at the moment of assignment (`ROOMS.driver`), and this is the
 * client for it.
 *
 * **The poll stays.** This is an accelerator, not a replacement — the same call
 * the POS board makes. A courier's phone moves between cells, loses signal in a
 * basement car park and sleeps in a pocket; a job must not depend on a socket
 * having stayed up. `useRealtimeReload` also fires once on every (re)connect,
 * so whatever arrived while the socket was down is picked up as soon as it
 * returns.
 *
 * Emission is one-directional: this app only listens. Every state change — went
 * online, picked up, delivered — still goes through the REST endpoints.
 *
 * Kept deliberately close to `kitchen-pos/src/realtime/RealtimeProvider.tsx` so
 * the three clients behave the same. The one real difference is the token: this
 * app keeps its tokens in `expo-secure-store` rather than `localStorage`, so it
 * reads them through `useAuth().getAccessToken()` instead of a storage key.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  // Read through a ref so a changed identity of the getter cannot tear the
  // socket down and reconnect it mid-shift.
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    const socket = io(socketOrigin(), {
      path: '/realtime',
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: tokenRef.current() ?? '' }),
    });
    socketRef.current = socket;

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));
    // The server disconnects an unauthorised socket after emitting this.
    socket.on('unauthorized', () => setStatus('disconnected'));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      status,
      subscribe: (event, handler) => {
        const socket = socketRef.current;
        if (!socket) return () => undefined;
        socket.on(event, handler);
        return () => {
          socket.off(event, handler);
        };
      },
    }),
    // `status` is in the deps so a subscribe made before connect re-binds once
    // the socket exists.
    [status],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/**
 * The socket, or a dead stand-in when there is no provider above.
 *
 * Deliberately does **not** throw. A screen with no realtime still works — it
 * polls, which is the floor this layer sits on top of — and the alternative is
 * a missing provider turning into a blank view on a phone a driver is holding
 * at a door. The screen tests mount screens without the provider for the same
 * reason.
 */
export function useRealtime(): RealtimeContextValue {
  return (
    useContext(RealtimeContext) ?? { status: 'disconnected', subscribe: () => () => undefined }
  );
}

/**
 * Runs `onEvent` when any of `events` fires, and once on every (re)connect.
 *
 * The reconnect half is the important one: a socket that dropped for a minute
 * missed whatever arrived in it. Intended to drive a screen's existing reload.
 */
export function useRealtimeReload(events: RealtimeEvent[], onEvent: () => void): ConnectionStatus {
  const { status, subscribe } = useRealtime();
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    const offs = events.map((e) => subscribe(e, () => cb.current()));
    return () => offs.forEach((off) => off());
    // `events` is expected to be a module-scoped constant; a new array each
    // render would re-bind every listener on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, ...events]);

  useEffect(() => {
    if (status === 'connected') {
      cb.current();
    }
  }, [status]);

  return status;
}
