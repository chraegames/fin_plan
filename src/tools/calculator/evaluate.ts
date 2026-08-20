// Expression evaluator for the calculator: a tokenizer plus a recursive-descent
// parser that evaluates as it parses. No eval/Function — the grammar is small
// enough to hand-roll and this keeps the tool CSP-friendly.
//
//   expr    := term (('+'|'-') term)*
//   term    := unary (('*'|'/'|'%') unary)*      // % is modulo
//   unary   := '-' unary | power
//   power   := postfix ('^' unary)?               // right-assoc; -2^2 = -4
//   postfix := primary ('!')*
//   primary := NUMBER | 'pi' | 'e' | 'ans' | FUNC '(' expr ')' | '(' expr ')'

export type AngleMode = 'deg' | 'rad';

export interface EvaluateOptions {
  angle: AngleMode;
  ans: number;
}

export type EvaluateResult =
  | { ok: true; value: number }
  | { ok: false; message: string; pos: number };

type Token =
  | { kind: 'num'; value: number; pos: number }
  | { kind: 'ident'; name: string; pos: number }
  | { kind: 'op'; op: string; pos: number }
  | { kind: 'end'; pos: number };

const GLYPHS: Record<string, string> = { '×': '*', '÷': '/', '−': '-' };

const FUNCS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'abs', 'exp',
]);

class EvalError extends Error {
  pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.pos = pos;
  }
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m || m[0] === '.') throw new EvalError('Invalid number', i);
      tokens.push({ kind: 'num', value: Number(m[0]), pos: i });
      i += m[0].length;
      continue;
    }
    if (/[a-z]/i.test(ch)) {
      const m = /^[a-z]+/i.exec(src.slice(i))!;
      tokens.push({ kind: 'ident', name: m[0].toLowerCase(), pos: i });
      i += m[0].length;
      continue;
    }
    const op = GLYPHS[ch] ?? ch;
    if ('+-*/%^!()'.includes(op)) {
      tokens.push({ kind: 'op', op, pos: i });
      i++;
      continue;
    }
    throw new EvalError(`Unexpected character "${ch}"`, i);
  }
  tokens.push({ kind: 'end', pos: src.length });
  return tokens;
}

function factorial(n: number, pos: number): number {
  if (n < 0 || n > 170 || !Number.isInteger(n)) throw new EvalError('Math error', pos);
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

class Parser {
  private i = 0;
  private tokens: Token[];
  private opts: EvaluateOptions;
  constructor(tokens: Token[], opts: EvaluateOptions) {
    this.tokens = tokens;
    this.opts = opts;
  }

  private peek(): Token {
    return this.tokens[this.i];
  }

  private isOp(op: string): boolean {
    const t = this.peek();
    return t.kind === 'op' && t.op === op;
  }

  private expectOp(op: string, message: string): void {
    const t = this.peek();
    if (t.kind !== 'op' || t.op !== op) throw new EvalError(message, t.pos);
    this.i++;
  }

  parse(): number {
    if (this.peek().kind === 'end') throw new EvalError('Enter an expression', 0);
    const v = this.expr();
    const t = this.peek();
    if (t.kind !== 'end') {
      if (t.kind === 'op' && t.op === ')') throw new EvalError('Unbalanced parentheses', t.pos);
      throw new EvalError('Unexpected token', t.pos);
    }
    return v;
  }

  private expr(): number {
    let v = this.term();
    while (this.isOp('+') || this.isOp('-')) {
      const op = (this.peek() as { op: string }).op;
      this.i++;
      const r = this.term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  private term(): number {
    let v = this.unary();
    while (this.isOp('*') || this.isOp('/') || this.isOp('%')) {
      const t = this.peek() as { op: string; pos: number };
      this.i++;
      const r = this.unary();
      if (t.op === '*') v = v * r;
      else {
        if (r === 0) throw new EvalError('Division by zero', t.pos);
        v = t.op === '/' ? v / r : v % r;
      }
    }
    return v;
  }

  private unary(): number {
    if (this.isOp('-')) {
      this.i++;
      return -this.unary();
    }
    return this.power();
  }

  private power(): number {
    const base = this.postfix();
    if (this.isOp('^')) {
      this.i++;
      const exp = this.unary();
      return Math.pow(base, exp);
    }
    return base;
  }

  private postfix(): number {
    let v = this.primary();
    while (this.isOp('!')) {
      const pos = this.peek().pos;
      this.i++;
      v = factorial(v, pos);
    }
    return v;
  }

  private primary(): number {
    const t = this.peek();
    if (t.kind === 'num') {
      this.i++;
      return t.value;
    }
    if (t.kind === 'ident') {
      this.i++;
      if (t.name === 'pi') return Math.PI;
      if (t.name === 'e') return Math.E;
      if (t.name === 'ans') return this.opts.ans;
      if (FUNCS.has(t.name)) {
        this.expectOp('(', `Expected "(" after ${t.name}`);
        const arg = this.expr();
        this.expectOp(')', 'Unbalanced parentheses');
        return this.applyFunc(t.name, arg, t.pos);
      }
      throw new EvalError(`Unknown identifier "${t.name}"`, t.pos);
    }
    if (t.kind === 'op' && t.op === '(') {
      this.i++;
      const v = this.expr();
      this.expectOp(')', 'Unbalanced parentheses');
      return v;
    }
    if (t.kind === 'end') throw new EvalError('Unexpected end of expression', t.pos);
    throw new EvalError('Unexpected token', t.pos);
  }

  private applyFunc(name: string, x: number, pos: number): number {
    const deg = this.opts.angle === 'deg';
    const toRad = (d: number) => (deg ? (d * Math.PI) / 180 : d);
    const fromRad = (r: number) => (deg ? (r * 180) / Math.PI : r);
    switch (name) {
      case 'sin': return Math.sin(toRad(x));
      case 'cos': return Math.cos(toRad(x));
      case 'tan': return Math.tan(toRad(x));
      case 'asin': return fromRad(Math.asin(x));
      case 'acos': return fromRad(Math.acos(x));
      case 'atan': return fromRad(Math.atan(x));
      case 'ln': return Math.log(x);
      case 'log': return Math.log10(x);
      case 'sqrt': return Math.sqrt(x);
      case 'abs': return Math.abs(x);
      case 'exp': return Math.exp(x);
      default: throw new EvalError(`Unknown identifier "${name}"`, pos);
    }
  }
}

export function evaluate(src: string, opts: EvaluateOptions): EvaluateResult {
  try {
    const value = new Parser(tokenize(src), opts).parse();
    if (!Number.isFinite(value)) return { ok: false, message: 'Math error', pos: Infinity };
    // Snap near-integer float noise (e.g. sin(pi) in deg mode) to a clean value.
    const rounded = Number(value.toPrecision(15));
    return { ok: true, value: rounded };
  } catch (err) {
    if (err instanceof EvalError) return { ok: false, message: err.message, pos: err.pos };
    return { ok: false, message: 'Math error', pos: Infinity };
  }
}

/** Formats a result for display: trims float noise, uses exponent for extremes. */
export function formatResult(value: number): string {
  if (Object.is(value, -0)) return '0';
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return value.toExponential(10).replace(/\.?0+e/, 'e');
  return String(Number(value.toPrecision(12)));
}
