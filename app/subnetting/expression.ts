// A small arithmetic grammar, never JavaScript evaluation. Fractions stay exact
// so large IPv6 counts and intermediate divisions cannot lose precision.
type Fraction = { n: bigint; d: bigint };
const limit = 1n << 4096n;

function fraction(n: bigint, d = 1n): Fraction {
  if (d === 0n || n >= limit || n <= -limit || d >= limit || d <= -limit) throw new Error('Out of range');
  if (d < 0n) { n = -n; d = -d; }
  let a = n < 0n ? -n : n, b = d;
  while (b) { [a, b] = [b, a % b]; }
  return { n: n / a, d: d / a };
}

/** Supports decimal numbers, + - * / ^ **, parentheses, and unary signs. */
export function evaluateCount(input: string): bigint | null {
  if (!input.trim() || input.length > 512) return null;
  const source = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const tokens = source.match(/\d+(?:\.\d+)?|\.\d+|\*\*|[()+\-*/^]|\s+|./g)!.filter(t => !/^\s+$/.test(t));
  if (tokens.length > 256) return null;
  let position = 0;
  const take = () => tokens[position++];
  const peek = () => tokens[position];

  function primary(): Fraction {
    if (peek() === '(') {
      take();
      const result = sum();
      if (take() !== ')') throw new Error('Missing parenthesis');
      return result;
    }
    const token = take();
    if (!token || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(token)) throw new Error('Expected number');
    const [whole, decimal = ''] = token.split('.');
    return fraction(BigInt((whole || '0') + decimal), 10n ** BigInt(decimal.length));
  }

  function power(): Fraction {
    const base = primary();
    if (peek() !== '^' && peek() !== '**') return base;
    take();
    const exponent = unary(); // Exponentiation associates right: 2^3^2 = 2^(3^2).
    if (exponent.d !== 1n || exponent.n > 4096n || exponent.n < -4096n) throw new Error('Invalid exponent');
    const e = exponent.n < 0n ? -exponent.n : exponent.n;
    // Bound allocation before exponentiation, including nested powers.
    if (BigInt(base.n.toString(2).length) * e > 8192n || BigInt(base.d.toString(2).length) * e > 8192n) throw new Error('Power too large');
    return exponent.n < 0n ? fraction(base.d ** e, base.n ** e) : fraction(base.n ** e, base.d ** e);
  }

  function unary(): Fraction {
    if (peek() === '+') { take(); return unary(); }
    if (peek() === '-') { take(); const value = unary(); return fraction(-value.n, value.d); }
    return power();
  }

  function product(): Fraction {
    let value = unary();
    while (peek() === '*' || peek() === '/') {
      const op = take(), rhs = unary();
      value = op === '*' ? fraction(value.n * rhs.n, value.d * rhs.d) : fraction(value.n * rhs.d, value.d * rhs.n);
    }
    return value;
  }

  function sum(): Fraction {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const op = take(), rhs = product();
      value = fraction(value.n * rhs.d + (op === '+' ? rhs.n : -rhs.n) * value.d, value.d * rhs.d);
    }
    return value;
  }

  try {
    const value = sum();
    return position === tokens.length && value.d === 1n && value.n >= 0n ? value.n : null;
  } catch {
    return null;
  }
}
