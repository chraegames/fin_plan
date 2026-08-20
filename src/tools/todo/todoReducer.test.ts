import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initialState,
  todoReducer,
  parseTodoState,
  loadTodoState,
  saveTodoState,
  type TodoState,
  type TodoAction,
} from './todoReducer';
import { TODO_KEY } from '../../utils/persistence';

function run(state: TodoState, ...actions: TodoAction[]): TodoState {
  return actions.reduce(todoReducer, state);
}

function seeded(): TodoState {
  return run(
    initialState('inbox'),
    { type: 'addItem', title: 'A', id: 'a', now: 1 },
    { type: 'addItem', title: 'B', id: 'b', now: 2, due: '2026-08-21' },
    { type: 'addItem', title: 'C', id: 'c', now: 3 },
  );
}

describe('initialState', () => {
  it('creates a single Inbox list and selects it', () => {
    const s = initialState('x');
    expect(s.lists).toEqual([{ id: 'x', name: 'Inbox', items: [] }]);
    expect(s.activeListId).toBe('x');
  });
});

describe('lists', () => {
  it('addList appends, trims, and selects the new list', () => {
    const s = todoReducer(initialState('inbox'), { type: 'addList', name: '  Work ', id: 'w' });
    expect(s.lists.map(l => l.name)).toEqual(['Inbox', 'Work']);
    expect(s.activeListId).toBe('w');
  });

  it('addList ignores empty names', () => {
    const base = initialState('inbox');
    expect(todoReducer(base, { type: 'addList', name: '   ', id: 'w' })).toBe(base);
  });

  it('renameList trims and ignores empty names', () => {
    const base = initialState('inbox');
    expect(todoReducer(base, { type: 'renameList', id: 'inbox', name: ' Home ' }).lists[0].name).toBe('Home');
    expect(todoReducer(base, { type: 'renameList', id: 'inbox', name: '' })).toBe(base);
  });

  it('selectList only switches to existing lists', () => {
    const s = todoReducer(initialState('inbox'), { type: 'addList', name: 'W', id: 'w' });
    expect(todoReducer(s, { type: 'selectList', id: 'inbox' }).activeListId).toBe('inbox');
    expect(todoReducer(s, { type: 'selectList', id: 'nope' })).toBe(s);
  });

  it('deleteList of the last list recreates an empty Inbox', () => {
    const s = run(seeded(), { type: 'deleteList', id: 'inbox', newId: 'fresh' });
    expect(s).toEqual(initialState('fresh'));
  });

  it('deleteList of the active list selects the nearest remaining one', () => {
    const three = run(
      initialState('a'),
      { type: 'addList', name: 'B', id: 'b' },
      { type: 'addList', name: 'C', id: 'c' },
      { type: 'selectList', id: 'b' },
    );
    // Deleting the middle one picks the list that slid into its slot.
    expect(todoReducer(three, { type: 'deleteList', id: 'b', newId: 'n' }).activeListId).toBe('c');
    // Deleting the last one picks the new last.
    const lastActive = todoReducer(three, { type: 'selectList', id: 'c' });
    expect(todoReducer(lastActive, { type: 'deleteList', id: 'c', newId: 'n' }).activeListId).toBe('b');
  });

  it('deleteList of an inactive list keeps the selection', () => {
    const s = run(initialState('a'), { type: 'addList', name: 'B', id: 'b' }, { type: 'selectList', id: 'a' });
    const next = todoReducer(s, { type: 'deleteList', id: 'b', newId: 'n' });
    expect(next.activeListId).toBe('a');
    expect(next.lists).toHaveLength(1);
  });

  it('deleteList with an unknown id is a no-op', () => {
    const s = seeded();
    expect(todoReducer(s, { type: 'deleteList', id: 'zzz', newId: 'n' })).toBe(s);
  });
});

describe('items', () => {
  it('addItem trims, stores due, and ignores empty titles', () => {
    const s = seeded();
    const items = s.lists[0].items;
    expect(items.map(i => i.title)).toEqual(['A', 'B', 'C']);
    expect(items[1].due).toBe('2026-08-21');
    expect('due' in items[0]).toBe(false);
    expect(todoReducer(s, { type: 'addItem', title: '  ', id: 'x', now: 9 })).toBe(s);
    const trimmed = todoReducer(s, { type: 'addItem', title: '  D ', id: 'd', now: 9 });
    expect(trimmed.lists[0].items[3]).toEqual({ id: 'd', title: 'D', done: false, createdAt: 9 });
  });

  it('addItem targets the active list only', () => {
    const s = run(seeded(), { type: 'addList', name: 'W', id: 'w' }, { type: 'addItem', title: 'Z', id: 'z', now: 5 });
    expect(s.lists[0].items).toHaveLength(3);
    expect(s.lists[1].items.map(i => i.id)).toEqual(['z']);
  });

  it('toggleItem flips done', () => {
    const s = run(seeded(), { type: 'toggleItem', id: 'b' });
    expect(s.lists[0].items[1].done).toBe(true);
    expect(todoReducer(s, { type: 'toggleItem', id: 'b' }).lists[0].items[1].done).toBe(false);
  });

  it('editItem trims and ignores empty titles', () => {
    const s = seeded();
    expect(todoReducer(s, { type: 'editItem', id: 'a', title: ' AA ' }).lists[0].items[0].title).toBe('AA');
    expect(todoReducer(s, { type: 'editItem', id: 'a', title: '  ' })).toBe(s);
  });

  it('setDue sets and clears the due date', () => {
    const s = todoReducer(seeded(), { type: 'setDue', id: 'a', due: '2026-09-01' });
    expect(s.lists[0].items[0].due).toBe('2026-09-01');
    const cleared = todoReducer(s, { type: 'setDue', id: 'a' });
    expect('due' in cleared.lists[0].items[0]).toBe(false);
  });

  it('deleteItem removes by id', () => {
    const s = todoReducer(seeded(), { type: 'deleteItem', id: 'b' });
    expect(s.lists[0].items.map(i => i.id)).toEqual(['a', 'c']);
  });

  it('moveItem swaps neighbours and clamps at the edges', () => {
    const s = seeded();
    expect(todoReducer(s, { type: 'moveItem', id: 'b', direction: 'up' }).lists[0].items.map(i => i.id)).toEqual(['b', 'a', 'c']);
    expect(todoReducer(s, { type: 'moveItem', id: 'b', direction: 'down' }).lists[0].items.map(i => i.id)).toEqual(['a', 'c', 'b']);
    expect(todoReducer(s, { type: 'moveItem', id: 'a', direction: 'up' }).lists[0].items).toBe(s.lists[0].items);
    expect(todoReducer(s, { type: 'moveItem', id: 'c', direction: 'down' }).lists[0].items).toBe(s.lists[0].items);
    expect(todoReducer(s, { type: 'moveItem', id: 'nope', direction: 'down' }).lists[0].items).toBe(s.lists[0].items);
  });

  it('clearCompleted drops only done items', () => {
    const s = run(seeded(), { type: 'toggleItem', id: 'a' }, { type: 'toggleItem', id: 'c' }, { type: 'clearCompleted' });
    expect(s.lists[0].items.map(i => i.id)).toEqual(['b']);
  });

  it('never mutates the previous state', () => {
    const s = seeded();
    const snapshot = JSON.stringify(s);
    run(
      s,
      { type: 'toggleItem', id: 'a' },
      { type: 'editItem', id: 'a', title: 'X' },
      { type: 'moveItem', id: 'a', direction: 'down' },
      { type: 'deleteItem', id: 'b' },
      { type: 'addList', name: 'N', id: 'n' },
      { type: 'deleteList', id: 'inbox', newId: 'q' },
    );
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('invariant: activeListId always refers to an existing list', () => {
  it('holds across a long random-ish sequence', () => {
    let s = initialState('a');
    const actions: TodoAction[] = [
      { type: 'addList', name: 'B', id: 'b' },
      { type: 'addList', name: 'C', id: 'c' },
      { type: 'deleteList', id: 'a', newId: 'n1' },
      { type: 'selectList', id: 'b' },
      { type: 'deleteList', id: 'b', newId: 'n2' },
      { type: 'deleteList', id: 'c', newId: 'n3' },
      { type: 'deleteList', id: 'n3', newId: 'n4' },
    ];
    for (const a of actions) {
      s = todoReducer(s, a);
      expect(s.lists.some(l => l.id === s.activeListId)).toBe(true);
      expect(s.lists.length).toBeGreaterThan(0);
    }
  });
});

describe('parseTodoState', () => {
  it('drops malformed items and lists, dedupes ids, and repairs activeListId', () => {
    const parsed = parseTodoState({
      lists: [
        { id: 'a', name: 'A', items: [
          { id: '1', title: 'ok', done: true, createdAt: 5, due: '2026-01-01' },
          { id: '2', title: 'bad due', due: '2026-02-30' },
          { id: '', title: 'no id' },
          { id: '3', title: '   ' },
          'string',
          null,
        ] },
        { id: 'a', name: 'dup', items: [] },
        { id: 'b', name: '', items: [] },
        { id: 'c', name: 'C', items: 'nope' },
        42,
      ],
      activeListId: 'zzz',
    });
    expect(parsed).toEqual({
      lists: [
        { id: 'a', name: 'A', items: [
          { id: '1', title: 'ok', done: true, createdAt: 5, due: '2026-01-01' },
          { id: '2', title: 'bad due', done: false, createdAt: 0 },
        ] },
        { id: 'c', name: 'C', items: [] },
      ],
      activeListId: 'a',
    });
  });

  it('returns null for unusable shapes', () => {
    expect(parseTodoState(null)).toBeNull();
    expect(parseTodoState([])).toBeNull();
    expect(parseTodoState({ lists: [] })).toBeNull();
    expect(parseTodoState({ lists: [{ id: 'x' }] })).toBeNull();
  });
});

describe('load / save', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
  });

  it('round-trips a state', () => {
    const s = seeded();
    expect(saveTodoState(s)).toBe(true);
    expect(store[TODO_KEY]).toBeDefined();
    expect(loadTodoState()).toEqual(s);
  });

  it('falls back to initialState when empty, corrupt, or malformed', () => {
    expect(loadTodoState()).toEqual(initialState());
    store[TODO_KEY] = '{not json';
    expect(loadTodoState()).toEqual(initialState());
    store[TODO_KEY] = JSON.stringify({ lists: 'nope' });
    expect(loadTodoState()).toEqual(initialState());
  });

  it('falls back when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(loadTodoState()).toEqual(initialState());
    expect(saveTodoState(seeded())).toBe(false);
  });
});
