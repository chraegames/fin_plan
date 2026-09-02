import { describe, expect, it } from 'vitest';
import { BLACK, WHITE, toIndex } from './go';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  filterCodeInput,
  initialSession,
  makeRoomCode,
  normalizeCode,
  statusText,
  step,
  type Ctx,
  type Effect,
  type Msg,
  type Session,
} from './match';

function ctxFor(selfId: string, coin = BLACK): Ctx {
  return { selfId, newId: () => 'g1', coin: () => coin };
}

function sends(effects: Effect[]): Msg[] {
  return effects.filter(e => e.kind === 'send').map(e => (e as { msg: Msg }).msg);
}

/** Two sessions wired back to back: every `send` from one becomes a `message` on the other. */
class Pair {
  a: Session;
  b: Session;
  ca: Ctx;
  cb: Ctx;
  constructor(ca: Ctx, cb: Ctx, size: 9 | 13 | 19 = 9) {
    this.ca = ca;
    this.cb = cb;
    this.a = initialSession(size);
    this.b = initialSession(size);
  }
  /** Feed an event to one side and deliver all resulting sends to the other; returns non-send effects. */
  run(side: 'a' | 'b', event: Parameters<typeof step>[1]): Effect[] {
    const other = side === 'a' ? 'b' : 'a';
    const ctx = side === 'a' ? this.ca : this.cb;
    const r = step(this[side], event, ctx);
    this[side] = r.session;
    const rest: Effect[] = [];
    for (const eff of r.effects) {
      if (eff.kind === 'send') rest.push(...this.run(other, { type: 'message', from: ctx.selfId, msg: eff.msg }));
      else rest.push(eff);
    }
    return rest;
  }
}

describe('room codes', () => {
  it('builds codes from the unambiguous alphabet', () => {
    const code = makeRoomCode(() => 0);
    expect(code).toBe('AAAA');
    expect(makeRoomCode(n => n - 1)).toBe('9999');
    expect(CODE_ALPHABET).not.toMatch(/[IO01]/);
    expect(CODE_ALPHABET.length).toBe(32);
  });

  it('normalises typed codes and rejects bad ones', () => {
    expect(normalizeCode(' ab-cd ')).toBe('ABCD');
    expect(normalizeCode('abc')).toBeNull();
    expect(normalizeCode('ABCI')).toBeNull();
    expect(normalizeCode('AB01')).toBeNull();
    expect(filterCodeInput('a1b2cdefg')).toBe('AB2C');
    expect(filterCodeInput('').length).toBeLessThanOrEqual(CODE_LENGTH);
  });
});

describe('quick match', () => {
  it('lower id invites, higher id accepts, both join the game room and the host sends ready', () => {
    const p = new Pair(ctxFor('aaa', WHITE), ctxFor('zzz'));
    expect(p.run('a', { type: 'search', size: 9 })).toEqual([{ kind: 'join', room: 'lobby-9' }]);
    expect(p.run('b', { type: 'search', size: 9 })).toEqual([{ kind: 'join', room: 'lobby-9' }]);

    // The higher id sees the peer first: it must wait.
    expect(p.run('b', { type: 'peerJoin', peerId: 'aaa' })).toEqual([]);
    expect(p.b.phase).toBe('searching');

    // The lower id invites; the invitee accepts and joins; the inviter joins on accept.
    const effects = p.run('a', { type: 'peerJoin', peerId: 'zzz' });
    expect(effects).toEqual([
      { kind: 'join', room: 'game-g1' },
      { kind: 'join', room: 'game-g1' },
    ]);
    expect(p.a.phase).toBe('connecting');
    expect(p.a.isHost).toBe(true);
    expect(p.a.me).toBe(WHITE);
    expect(p.b.phase).toBe('connecting');
    expect(p.b.isHost).toBe(false);
    expect(p.b.me).toBe(BLACK);

    // In the game room the host sees the guest and starts the game.
    const started = p.run('a', { type: 'peerJoin', peerId: 'zzz' });
    expect(started).toEqual([
      { kind: 'matched', mode: 'quick', size: 9 },
      { kind: 'matched', mode: 'quick', size: 9 },
    ]);
    expect(p.a.phase).toBe('playing');
    expect(p.b.phase).toBe('playing');
    expect(p.a.game?.size).toBe(9);
    expect(p.b.game?.size).toBe(9);
    expect(p.b.opponent).toBe('aaa');
  });

  it('a third peer is told busy and an unknown peer joining is ignored', () => {
    const a = ctxFor('aaa');
    let s = step(initialSession(9), { type: 'search', size: 9 }, a).session;
    s = step(s, { type: 'peerJoin', peerId: 'bbb' }, a).session;
    expect(s.phase).toBe('inviting');
    // Another invite arriving while we are inviting gets a busy reply.
    const r = step(s, { type: 'message', from: 'ccc', msg: { t: 'invite', gameId: 'x', size: 9, yourColor: BLACK } }, a);
    expect(sends(r.effects)).toEqual([{ t: 'busy' }]);
    expect(r.session.phase).toBe('inviting');
    // A stray accept from someone else is ignored.
    expect(step(s, { type: 'message', from: 'ccc', msg: { t: 'accept', gameId: 'g1' } }, a).session).toBe(s);
  });

  it('busy sends the inviter back to searching', () => {
    const a = ctxFor('aaa');
    let s = step(initialSession(9), { type: 'search', size: 9 }, a).session;
    s = step(s, { type: 'peerJoin', peerId: 'bbb' }, a).session;
    s = step(s, { type: 'message', from: 'bbb', msg: { t: 'busy' } }, a).session;
    expect(s.phase).toBe('searching');
    expect(s.opponent).toBeNull();
  });
});

describe('room code match', () => {
  it('host waits in the game room, first guest in gets ready and both play', () => {
    const p = new Pair(ctxFor('host', WHITE), ctxFor('guest'), 13);
    expect(p.run('a', { type: 'host', size: 13, code: 'ABCD' })).toEqual([{ kind: 'join', room: 'game-ABCD' }]);
    expect(p.run('b', { type: 'join', code: 'ABCD' })).toEqual([{ kind: 'join', room: 'game-ABCD' }]);
    expect(p.run('b', { type: 'peerJoin', peerId: 'host' })).toEqual([]);
    expect(p.run('a', { type: 'peerJoin', peerId: 'guest' })).toEqual([
      { kind: 'matched', mode: 'join', size: 13 },
      { kind: 'matched', mode: 'host', size: 13 },
    ]);
    expect(p.a.me).toBe(WHITE);
    expect(p.b.me).toBe(BLACK);
    expect(p.b.size).toBe(13);
    // A second guest is ignored by the host.
    expect(p.run('a', { type: 'peerJoin', peerId: 'late' })).toEqual([]);
    expect(p.a.opponent).toBe('guest');
  });
});

function playingPair(): Pair {
  const p = new Pair(ctxFor('host', BLACK), ctxFor('guest'), 9);
  p.run('a', { type: 'host', size: 9, code: 'ABCD' });
  p.run('b', { type: 'join', code: 'ABCD' });
  p.run('a', { type: 'peerJoin', peerId: 'guest' });
  return p;
}

describe('play', () => {
  it('moves and passes are mirrored; out-of-turn and stale moves are ignored', () => {
    const p = playingPair();
    // Guest (white) may not move first.
    expect(p.run('b', { type: 'play', idx: 0 })).toEqual([]);
    expect(p.b.game?.moveNumber).toBe(0);

    p.run('a', { type: 'play', idx: toIndex(2, 2, 9) });
    expect(p.a.game?.board[toIndex(2, 2, 9)]).toBe(BLACK);
    expect(p.b.game?.board[toIndex(2, 2, 9)]).toBe(BLACK);
    expect(p.b.game?.turn).toBe(WHITE);

    // A replayed message with an old move number changes nothing.
    const before = p.b.game;
    step(p.b, { type: 'message', from: 'host', msg: { t: 'move', n: 0, idx: 5 } }, p.cb);
    expect(p.b.game).toBe(before);

    p.run('b', { type: 'pass' });
    expect(p.a.game?.consecutivePasses).toBe(1);
    expect(p.a.game?.turn).toBe(BLACK);

    // Two passes end the game on both sides with the same result.
    const fin = p.run('a', { type: 'pass' });
    expect(fin.map(e => e.kind)).toEqual(['finished', 'finished']);
    expect(p.a.phase).toBe('ended');
    expect(p.b.phase).toBe('ended');
    expect(p.a.game?.result).toEqual(p.b.game?.result);
    expect(statusText(p.a)).toMatch(/wins by/);
  });

  it('resign ends the game for both with the other colour winning', () => {
    const p = playingPair();
    p.run('b', { type: 'resign' });
    expect(p.a.phase).toBe('ended');
    expect(p.a.game?.result).toEqual({ kind: 'resign', winner: BLACK });
    expect(p.b.game?.result).toEqual({ kind: 'resign', winner: BLACK });
  });

  it('an illegal incoming move ends the session as out of sync', () => {
    const p = playingPair();
    p.run('a', { type: 'play', idx: 0 });
    const r = step(p.a, { type: 'message', from: 'guest', msg: { t: 'move', n: 1, idx: 0 } }, p.ca);
    expect(r.session.phase).toBe('ended');
    expect(r.session.endReason).toMatch(/out of sync/);
  });

  it('opponent leaving mid-game awards the win; a stranger leaving is ignored', () => {
    const p = playingPair();
    expect(p.run('a', { type: 'peerLeave', peerId: 'nobody' })).toEqual([]);
    const fin = p.run('a', { type: 'peerLeave', peerId: 'guest' });
    expect(fin).toEqual([{ kind: 'finished', size: 9, result: 'abandon' }]);
    expect(p.a.game?.result).toEqual({ kind: 'abandon', winner: BLACK });
    expect(statusText(p.a)).toBe('Black wins — opponent left');
  });

  it('cancel and reset return to setup and leave the room, keeping the size', () => {
    const p = playingPair();
    expect(p.run('a', { type: 'reset' })).toEqual([{ kind: 'leave' }]);
    expect(p.a.phase).toBe('setup');
    expect(p.a.size).toBe(9);
    expect(p.a.game).toBeNull();
    expect(step(p.a, { type: 'cancel' }, p.ca).effects).toEqual([]);
  });
});
