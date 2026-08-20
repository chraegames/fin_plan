import { describe, expect, it } from 'vitest';
import { pushHistory, type HistoryItem } from './history';

const item = (n: number): HistoryItem => ({ expr: `${n}+0`, result: String(n), at: n });

describe('pushHistory', () => {
  it('prepends newest first', () => {
    const list = pushHistory(pushHistory([], item(1)), item(2));
    expect(list.map(i => i.result)).toEqual(['2', '1']);
  });
  it('truncates at max', () => {
    let list: HistoryItem[] = [];
    for (let n = 0; n < 5; n++) list = pushHistory(list, item(n), 3);
    expect(list.map(i => i.result)).toEqual(['4', '3', '2']);
  });
  it('does not mutate the input', () => {
    const original = [item(1)];
    pushHistory(original, item(2));
    expect(original).toHaveLength(1);
  });
});
