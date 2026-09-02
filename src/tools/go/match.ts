// Go — matchmaking + session state machine (pure, no network, no React).
//
// `step(session, event, ctx)` returns the next session plus a list of effects
// (join a room, send a message, leave). The App owns a Transport (net.ts) and
// executes the effects; every network callback is fed back in as an event.
//
// Pairing: "quick" players sit in a lobby room per board size. When two peers
// see each other, the one with the lower id sends an `invite` naming a fresh
// game room; the other replies `accept` and both move to that room. Once
// there, the host (the inviter, or the creator of a room code) sends `ready`
// which tells the guest the board size and its colour. Moves carry the move
// number they apply to; anything out of sequence is ignored.

import {
  BLACK,
  abandon,
  describeResult,
  newGame,
  opponent,
  pass as passMove,
  playMove,
  resign as resignMove,
  type BoardSize,
  type Color,
  type GameState,
} from './go';

export type Mode = 'quick' | 'host' | 'join';
export type Phase = 'setup' | 'searching' | 'inviting' | 'connecting' | 'playing' | 'ended';

export type Msg =
  | { t: 'invite'; gameId: string; size: BoardSize; yourColor: Color }
  | { t: 'accept'; gameId: string }
  | { t: 'busy' }
  | { t: 'ready'; size: BoardSize; yourColor: Color }
  | { t: 'move'; n: number; idx: number }
  | { t: 'pass'; n: number }
  | { t: 'resign' };

export interface Session {
  phase: Phase;
  mode: Mode | null;
  size: BoardSize;
  /** Room code for host/join modes. */
  code: string | null;
  /** Transport room currently joined (null in setup). */
  room: string | null;
  /** Game room id agreed on in the lobby (quick mode). */
  gameId: string | null;
  opponent: string | null;
  /** The host sends `ready`; the guest waits for it. */
  isHost: boolean;
  me: Color | null;
  game: GameState | null;
  /** Why the session ended when the game itself has no result (e.g. disconnect). */
  endReason: string | null;
}

export type Event =
  | { type: 'search'; size: BoardSize }
  | { type: 'host'; size: BoardSize; code: string }
  | { type: 'join'; code: string }
  | { type: 'peerJoin'; peerId: string }
  | { type: 'peerLeave'; peerId: string }
  | { type: 'message'; from: string; msg: Msg }
  | { type: 'play'; idx: number }
  | { type: 'pass' }
  | { type: 'resign' }
  | { type: 'cancel' }
  | { type: 'reset' };

export type Effect =
  | { kind: 'join'; room: string }
  | { kind: 'leave' }
  | { kind: 'send'; to: string; msg: Msg }
  | { kind: 'matched'; mode: Mode; size: BoardSize }
  | { kind: 'finished'; size: BoardSize; result: string };

export interface Ctx {
  selfId: string;
  /** Fresh random id for a game room. */
  newId: () => string;
  /** Random colour for the host. */
  coin: () => Color;
}

export interface Step {
  session: Session;
  effects: Effect[];
}

export function initialSession(size: BoardSize): Session {
  return {
    phase: 'setup',
    mode: null,
    size,
    code: null,
    room: null,
    gameId: null,
    opponent: null,
    isHost: false,
    me: null,
    game: null,
    endReason: null,
  };
}

export function lobbyRoom(size: BoardSize): string {
  return `lobby-${size}`;
}

export function gameRoom(id: string): string {
  return `game-${id}`;
}

// ─── Room codes ─────────────────────────────────────────────────────────

/** Unambiguous alphabet: no I, O, 0 or 1. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;

/** `random(maxExclusive)` must return a uniform integer in [0, maxExclusive). */
export function makeRoomCode(random: (maxExclusive: number) => number): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return out;
}

/** Uppercases and strips a typed code; null unless it is exactly a valid code. */
export function normalizeCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== CODE_LENGTH) return null;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null;
  return code;
}

/** Only these characters can ever appear in a valid code, so the input can filter as you type. */
export function filterCodeInput(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter(ch => CODE_ALPHABET.includes(ch))
    .slice(0, CODE_LENGTH)
    .join('');
}

// ─── State machine ──────────────────────────────────────────────────────

function startGame(s: Session, size: BoardSize, me: Color, opp: string, host: boolean): Session {
  return { ...s, phase: 'playing', size, me, opponent: opp, isHost: host, game: newGame(size), endReason: null };
}

function finished(s: Session): Effect[] {
  const result = s.game?.result;
  return result ? [{ kind: 'finished', size: s.size, result: result.kind }] : [];
}

export function step(s: Session, e: Event, ctx: Ctx): Step {
  switch (e.type) {
    case 'search': {
      const room = lobbyRoom(e.size);
      return {
        session: { ...initialSession(e.size), phase: 'searching', mode: 'quick', room },
        effects: [{ kind: 'join', room }],
      };
    }

    case 'host': {
      const room = gameRoom(e.code);
      return {
        session: { ...initialSession(e.size), phase: 'searching', mode: 'host', code: e.code, room, isHost: true },
        effects: [{ kind: 'join', room }],
      };
    }

    case 'join': {
      const room = gameRoom(e.code);
      return {
        session: { ...initialSession(s.size), phase: 'searching', mode: 'join', code: e.code, room },
        effects: [{ kind: 'join', room }],
      };
    }

    case 'peerJoin': {
      // Lobby: the lower id proposes a game to the newcomer.
      if (s.phase === 'searching' && s.mode === 'quick') {
        if (ctx.selfId < e.peerId) {
          const gameId = ctx.newId();
          const me = ctx.coin();
          return {
            session: { ...s, phase: 'inviting', gameId, opponent: e.peerId, me, isHost: true },
            effects: [{ kind: 'send', to: e.peerId, msg: { t: 'invite', gameId, size: s.size, yourColor: opponent(me) } }],
          };
        }
        return { session: s, effects: [] };
      }
      // Game room, host side: first peer in (room code) or the agreed opponent (quick) starts the game.
      if (s.isHost && ((s.phase === 'searching' && s.mode === 'host') || s.phase === 'connecting')) {
        if (s.opponent && s.opponent !== e.peerId) return { session: s, effects: [] };
        const me = s.me ?? ctx.coin();
        const next = startGame(s, s.size, me, e.peerId, true);
        return {
          session: next,
          effects: [
            { kind: 'send', to: e.peerId, msg: { t: 'ready', size: s.size, yourColor: opponent(me) } },
            { kind: 'matched', mode: s.mode ?? 'quick', size: s.size },
          ],
        };
      }
      return { session: s, effects: [] };
    }

    case 'message':
      return onMessage(s, e.from, e.msg);

    case 'peerLeave': {
      if (e.peerId !== s.opponent) return { session: s, effects: [] };
      if (s.phase === 'playing' && s.game && s.me) {
        const game = abandon(s.game, opponent(s.me));
        const next: Session = { ...s, phase: 'ended', game };
        return { session: next, effects: finished(next) };
      }
      // While inviting we are still in the lobby: the invitee leaving it is
      // the normal move to the game room, not a disconnect.
      if (s.phase === 'connecting') {
        return { session: { ...s, phase: 'ended', endReason: 'The other player disconnected before the game started.' }, effects: [] };
      }
      return { session: s, effects: [] };
    }

    case 'play': {
      if (s.phase !== 'playing' || !s.game || !s.me || !s.opponent || s.game.turn !== s.me) return { session: s, effects: [] };
      const n = s.game.moveNumber;
      const r = playMove(s.game, e.idx);
      if (!r.ok) return { session: s, effects: [] };
      return { session: { ...s, game: r.state }, effects: [{ kind: 'send', to: s.opponent, msg: { t: 'move', n, idx: e.idx } }] };
    }

    case 'pass': {
      if (s.phase !== 'playing' || !s.game || !s.me || !s.opponent || s.game.turn !== s.me) return { session: s, effects: [] };
      const n = s.game.moveNumber;
      const game = passMove(s.game);
      const next: Session = { ...s, game, phase: game.status === 'ended' ? 'ended' : 'playing' };
      return { session: next, effects: [{ kind: 'send', to: s.opponent, msg: { t: 'pass', n } }, ...finished(next)] };
    }

    case 'resign': {
      if (s.phase !== 'playing' || !s.game || !s.me || !s.opponent) return { session: s, effects: [] };
      const next: Session = { ...s, game: resignMove(s.game, s.me), phase: 'ended' };
      return { session: next, effects: [{ kind: 'send', to: s.opponent, msg: { t: 'resign' } }, ...finished(next)] };
    }

    case 'cancel':
    case 'reset':
      return { session: initialSession(s.size), effects: s.room ? [{ kind: 'leave' }] : [] };
  }
}

function onMessage(s: Session, from: string, m: Msg): Step {
  switch (m.t) {
    case 'invite': {
      if (s.phase === 'searching' && s.mode === 'quick') {
        const room = gameRoom(m.gameId);
        return {
          session: { ...s, phase: 'connecting', gameId: m.gameId, size: m.size, me: m.yourColor, opponent: from, isHost: false, room },
          effects: [
            { kind: 'send', to: from, msg: { t: 'accept', gameId: m.gameId } },
            { kind: 'join', room },
          ],
        };
      }
      return { session: s, effects: [{ kind: 'send', to: from, msg: { t: 'busy' } }] };
    }

    case 'accept': {
      if (s.phase !== 'inviting' || from !== s.opponent || m.gameId !== s.gameId) return { session: s, effects: [] };
      const room = gameRoom(m.gameId);
      return { session: { ...s, phase: 'connecting', room }, effects: [{ kind: 'join', room }] };
    }

    case 'busy': {
      if (s.phase !== 'inviting' || from !== s.opponent) return { session: s, effects: [] };
      return { session: { ...s, phase: 'searching', gameId: null, opponent: null, me: null, isHost: false }, effects: [] };
    }

    case 'ready': {
      const waiting = (s.phase === 'searching' && s.mode === 'join') || s.phase === 'connecting';
      if (s.isHost || !waiting || (s.opponent && s.opponent !== from)) return { session: s, effects: [] };
      return {
        session: startGame(s, m.size, m.yourColor, from, false),
        effects: [{ kind: 'matched', mode: s.mode ?? 'quick', size: m.size }],
      };
    }

    case 'move': {
      if (!inGameFrom(s, from)) return { session: s, effects: [] };
      const game = s.game!;
      if (m.n !== game.moveNumber || game.turn === s.me) return { session: s, effects: [] };
      const r = playMove(game, m.idx);
      if (!r.ok) {
        return { session: { ...s, phase: 'ended', endReason: `Received an illegal move (${r.reason}) — the game is out of sync.` }, effects: [] };
      }
      return { session: { ...s, game: r.state }, effects: [] };
    }

    case 'pass': {
      if (!inGameFrom(s, from)) return { session: s, effects: [] };
      const game = s.game!;
      if (m.n !== game.moveNumber || game.turn === s.me) return { session: s, effects: [] };
      const next = passMove(game);
      const session: Session = { ...s, game: next, phase: next.status === 'ended' ? 'ended' : 'playing' };
      return { session, effects: finished(session) };
    }

    case 'resign': {
      if (!inGameFrom(s, from) || !s.me) return { session: s, effects: [] };
      const session: Session = { ...s, phase: 'ended', game: resignMove(s.game!, opponent(s.me)) };
      return { session, effects: finished(session) };
    }
  }
}

function inGameFrom(s: Session, from: string): boolean {
  return s.phase === 'playing' && !!s.game && from === s.opponent && s.me != null;
}

/** One-line status for the current phase. */
export function statusText(s: Session): string {
  switch (s.phase) {
    case 'setup':
      return '';
    case 'searching':
      if (s.mode === 'host') return `Waiting for a friend to join room ${s.code}…`;
      if (s.mode === 'join') return `Joining room ${s.code}…`;
      return `Looking for an opponent on ${s.size}×${s.size}…`;
    case 'inviting':
    case 'connecting':
      return 'Found someone — connecting…';
    case 'playing': {
      const g = s.game!;
      return g.turn === s.me ? 'Your move' : `${g.turn === BLACK ? 'Black' : 'White'} is thinking…`;
    }
    case 'ended':
      if (s.game?.result) return describeResult(s.game.result);
      return s.endReason ?? 'Game over';
  }
}

