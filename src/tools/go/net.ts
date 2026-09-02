// Go — transport layer. The session state machine (match.ts) never touches
// the network; it emits effects that the App runs through one of these.
//
// - `trysteroTransport`: real games. Trystero introduces the two browsers
//   through public Nostr relays and then opens a direct WebRTC data channel;
//   nothing of ours runs on a server. Loaded lazily so the page's initial
//   bundle stays small.
// - `localTransport`: `?local=1` on localhost. Two tabs in the same browser
//   talk over a BroadcastChannel, so the whole flow can be exercised offline.

import type { Msg } from './match';

export interface Transport {
  readonly selfId: string;
  /** Join a room, leaving the current one first. */
  join(room: string): void;
  leave(): void;
  send(msg: Msg, to: string): void;
  onPeerJoin: (peerId: string) => void;
  onPeerLeave: (peerId: string) => void;
  onMessage: (msg: Msg, from: string) => void;
}

export const APP_ID = 'chrae-lab-go';

export function wantsLocalTransport(search: string): boolean {
  return new URLSearchParams(search).get('local') === '1';
}

export async function createTransport(local: boolean): Promise<Transport> {
  return local ? localTransport() : trysteroTransport();
}

function randomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Trystero (Nostr signalling → WebRTC) ────────────────────────────────

async function trysteroTransport(): Promise<Transport> {
  const { joinRoom, selfId } = await import('trystero');
  type Room = ReturnType<typeof joinRoom>;
  let room: Room | null = null;
  let send: ((msg: Msg, to: string) => void) | null = null;
  /** Sends still in flight; a room is only left once they have settled (or 1s passed). */
  let pending: Promise<unknown>[] = [];

  const settle = () => {
    const wait = Promise.allSettled(pending);
    pending = [];
    return Promise.race([wait, new Promise(res => setTimeout(res, 1000))]);
  };

  const t: Transport = {
    selfId,
    onPeerJoin: () => {},
    onPeerLeave: () => {},
    onMessage: () => {},
    join(roomId) {
      t.leave();
      const r = joinRoom({ appId: APP_ID }, roomId);
      room = r;
      const action = r.makeAction<Msg>('go');
      // Guard every callback so a room we already left cannot feed stale events.
      r.onPeerJoin = id => {
        if (room === r) t.onPeerJoin(id);
      };
      r.onPeerLeave = id => {
        if (room === r) t.onPeerLeave(id);
      };
      action.onMessage = (data, { peerId }) => {
        if (room === r) t.onMessage(data, peerId);
      };
      send = (msg, to) => {
        pending.push(action.send(msg, { target: to }).catch(() => {}));
      };
    },
    leave() {
      const r = room;
      room = null;
      send = null;
      if (r) void settle().then(() => r.leave().catch(() => {}));
    },
    send(msg, to) {
      send?.(msg, to);
    },
  };
  return t;
}

// ─── BroadcastChannel (same browser, dev only) ───────────────────────────

type Wire =
  | { k: 'hello'; from: string }
  | { k: 'hi'; from: string; to: string }
  | { k: 'bye'; from: string }
  | { k: 'msg'; from: string; to: string; msg: Msg };

function localTransport(): Transport {
  const selfId = randomId();
  let channel: BroadcastChannel | null = null;

  const post = (w: Wire) => channel?.postMessage(w);
  const bye = () => post({ k: 'bye', from: selfId });

  const t: Transport = {
    selfId,
    onPeerJoin: () => {},
    onPeerLeave: () => {},
    onMessage: () => {},
    join(roomId) {
      t.leave();
      const c = new BroadcastChannel(`${APP_ID}:${roomId}`);
      channel = c;
      c.onmessage = (ev: MessageEvent<Wire>) => {
        if (channel !== c) return;
        const w = ev.data;
        switch (w.k) {
          case 'hello':
            post({ k: 'hi', from: selfId, to: w.from });
            t.onPeerJoin(w.from);
            break;
          case 'hi':
            if (w.to === selfId) t.onPeerJoin(w.from);
            break;
          case 'bye':
            t.onPeerLeave(w.from);
            break;
          case 'msg':
            if (w.to === selfId) t.onMessage(w.msg, w.from);
            break;
        }
      };
      window.addEventListener('pagehide', bye);
      post({ k: 'hello', from: selfId });
    },
    leave() {
      if (!channel) return;
      bye();
      window.removeEventListener('pagehide', bye);
      channel.close();
      channel = null;
    },
    send(msg, to) {
      post({ k: 'msg', from: selfId, to, msg });
    },
  };
  return t;
}
