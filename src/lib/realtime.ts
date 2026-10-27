import { io, type Socket } from "socket.io-client";
import { apiConfig } from "@/config/api";
import type { OrderDto } from "@/types/backend";

/**
 * Socket.IO realtime client — single shared connection.
 *
 * One lazily-created socket per auth mode (anonymous for the customer order
 * page, admin-JWT for the backoffice). The connection is app-scoped: it is
 * never torn down when a component unmounts (React StrictMode double-mount
 * and route changes would otherwise thrash the handshake); listeners are
 * attached/detached per component instead.
 *
 * Events mirror the backend contract (`src/realtime/realtime.ts`):
 *   server → client: "order:new" / "order:updated" (OrderDto payload)
 *   client → server: "order:subscribe" (orderId, sessionToken?) /
 *                    "order:unsubscribe" (orderId)
 *   client → server: "session:subscribe" / "session:unsubscribe" (sessionToken)
 */

interface ServerToClientEvents {
  "order:new": (order: OrderDto) => void;
  "order:updated": (order: OrderDto) => void;
}

interface ClientToServerEvents {
  "order:subscribe": (
    orderId: string,
    sessionToken?: string,
    ack?: (result: { joined: boolean }) => void,
  ) => void;
  "order:unsubscribe": (orderId: string) => void;
  "session:subscribe": (sessionToken: string, ack?: (result: { joined: boolean }) => void) => void;
  "session:unsubscribe": (sessionToken: string) => void;
}

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let anonymousSocket: RealtimeSocket | null = null;
let adminSocket: RealtimeSocket | null = null;
let adminSocketToken: string | null = null;

function createSocket(authToken?: string): RealtimeSocket {
  return io(apiConfig.baseUrl, {
    path: "/socket.io",
    auth: authToken ? { token: authToken } : {},
    // Auto-reconnect with backoff forever; consumers resync over REST on
    // "connect" to catch events missed while disconnected.
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    timeout: 5_000,
  });
}

/** Shared anonymous socket (customer-facing pages). */
export function getRealtimeSocket(): RealtimeSocket {
  if (!anonymousSocket) anonymousSocket = createSocket();
  return anonymousSocket;
}

/**
 * Admin socket authenticated with the backoffice JWT. A token change
 * (re-login) tears down the previous connection so the old identity can
 * never keep receiving events.
 */
export function getAdminRealtimeSocket(token: string): RealtimeSocket {
  if (adminSocket && adminSocketToken === token) return adminSocket;
  if (adminSocket) {
    adminSocket.removeAllListeners();
    adminSocket.disconnect();
  }
  adminSocketToken = token;
  adminSocket = createSocket(token);
  return adminSocket;
}
