// Pure state model for the to-do tool. No React, no DOM — the UI supplies ids
// and timestamps through the action payloads so every transition is
// deterministic and testable.

import { TODO_KEY, safeSetItem } from '../../utils/persistence';
import { isValidISODate } from './dueDate';

export interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  /** YYYY-MM-DD */
  due?: string;
  createdAt: number;
}

export interface TodoList {
  id: string;
  name: string;
  items: TodoItem[];
}

export interface TodoState {
  lists: TodoList[];
  activeListId: string;
}

export type TodoAction =
  | { type: 'addList'; name: string; id: string }
  | { type: 'renameList'; id: string; name: string }
  | { type: 'deleteList'; id: string; newId: string }
  | { type: 'selectList'; id: string }
  | { type: 'addItem'; title: string; due?: string; id: string; now: number }
  | { type: 'toggleItem'; id: string }
  | { type: 'editItem'; id: string; title: string }
  | { type: 'setDue'; id: string; due?: string }
  | { type: 'deleteItem'; id: string }
  | { type: 'moveItem'; id: string; direction: 'up' | 'down' }
  | { type: 'clearCompleted' };

export const DEFAULT_LIST_NAME = 'Inbox';

export function initialState(id = 'inbox'): TodoState {
  return { lists: [{ id, name: DEFAULT_LIST_NAME, items: [] }], activeListId: id };
}

function updateActive(state: TodoState, fn: (list: TodoList) => TodoList): TodoState {
  return {
    ...state,
    lists: state.lists.map(l => (l.id === state.activeListId ? fn(l) : l)),
  };
}

function updateItems(state: TodoState, fn: (items: TodoItem[]) => TodoItem[]): TodoState {
  return updateActive(state, list => ({ ...list, items: fn(list.items) }));
}

export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'addList': {
      const name = action.name.trim();
      if (!name) return state;
      return {
        lists: [...state.lists, { id: action.id, name, items: [] }],
        activeListId: action.id,
      };
    }
    case 'renameList': {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        lists: state.lists.map(l => (l.id === action.id ? { ...l, name } : l)),
      };
    }
    case 'deleteList': {
      const index = state.lists.findIndex(l => l.id === action.id);
      if (index === -1) return state;
      const lists = state.lists.filter(l => l.id !== action.id);
      if (lists.length === 0) return initialState(action.newId);
      if (state.activeListId !== action.id) return { ...state, lists };
      const nearest = lists[Math.min(index, lists.length - 1)];
      return { lists, activeListId: nearest.id };
    }
    case 'selectList':
      if (!state.lists.some(l => l.id === action.id)) return state;
      return { ...state, activeListId: action.id };
    case 'addItem': {
      const title = action.title.trim();
      if (!title) return state;
      const item: TodoItem = { id: action.id, title, done: false, createdAt: action.now };
      if (action.due) item.due = action.due;
      return updateItems(state, items => [...items, item]);
    }
    case 'toggleItem':
      return updateItems(state, items =>
        items.map(i => (i.id === action.id ? { ...i, done: !i.done } : i)),
      );
    case 'editItem': {
      const title = action.title.trim();
      if (!title) return state;
      return updateItems(state, items =>
        items.map(i => (i.id === action.id ? { ...i, title } : i)),
      );
    }
    case 'setDue':
      return updateItems(state, items =>
        items.map(i => {
          if (i.id !== action.id) return i;
          const next: TodoItem = { ...i, due: action.due };
          if (!action.due) delete next.due;
          return next;
        }),
      );
    case 'deleteItem':
      return updateItems(state, items => items.filter(i => i.id !== action.id));
    case 'moveItem':
      return updateItems(state, items => {
        const from = items.findIndex(i => i.id === action.id);
        if (from === -1) return items;
        const to = action.direction === 'up' ? from - 1 : from + 1;
        if (to < 0 || to >= items.length) return items;
        const next = [...items];
        [next[from], next[to]] = [next[to], next[from]];
        return next;
      });
    case 'clearCompleted':
      return updateItems(state, items => items.filter(i => !i.done));
  }
}

// ─── Persistence ────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseItem(raw: unknown): TodoItem | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.title !== 'string' || !raw.title.trim()) return null;
  const item: TodoItem = {
    id: raw.id,
    title: raw.title,
    done: raw.done === true,
    createdAt: typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
  };
  if (isValidISODate(raw.due)) item.due = raw.due;
  return item;
}

function parseList(raw: unknown): TodoList | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null;
  const items = Array.isArray(raw.items)
    ? raw.items.map(parseItem).filter((i): i is TodoItem => i !== null)
    : [];
  return { id: raw.id, name: raw.name, items };
}

/** Validates an arbitrary parsed JSON value into a TodoState, or null if unusable. */
export function parseTodoState(raw: unknown): TodoState | null {
  if (!isRecord(raw) || !Array.isArray(raw.lists)) return null;
  const seen = new Set<string>();
  const lists: TodoList[] = [];
  for (const entry of raw.lists) {
    const list = parseList(entry);
    if (!list || seen.has(list.id)) continue;
    seen.add(list.id);
    lists.push(list);
  }
  if (lists.length === 0) return null;
  const activeListId =
    typeof raw.activeListId === 'string' && seen.has(raw.activeListId)
      ? raw.activeListId
      : lists[0].id;
  return { lists, activeListId };
}

export function loadTodoState(): TodoState {
  try {
    const raw = localStorage.getItem(TODO_KEY);
    if (!raw) return initialState();
    return parseTodoState(JSON.parse(raw)) ?? initialState();
  } catch {
    return initialState();
  }
}

export function saveTodoState(state: TodoState): boolean {
  return safeSetItem(TODO_KEY, JSON.stringify(state));
}
