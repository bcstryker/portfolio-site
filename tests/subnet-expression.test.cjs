const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
// Compile the standalone parser in memory using the project's TypeScript dependency.
const compiled = ts.transpileModule(fs.readFileSync(require.resolve('../app/subnetting/expression.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const parser = { exports: {} };
new Function('exports', compiled)(parser.exports);
const { evaluateCount } = parser.exports;

test('accepts equivalent /69 counts without floating-point rounding', () => {
  for (const input of ['2^59', '2^(128-69)', '2**(128 - 69)', '576460752303423488', '2^60 / 2', '2^58 + 2^58', '(1/3)*3*2^59', '0.5 * 2^60', '2^(128−69)', '2^60 × .5', '2^60 ÷ 2', '2^-1 * 2^60']) {
    assert.equal(evaluateCount(input), 576460752303423488n, input);
  }
  assert.notEqual(evaluateCount('576460752303423489'), 576460752303423488n);
});

test('honors precedence, associativity, signs, and exact fractions', () => {
  for (const [input, expected] of [['2^3^2',512n], ['-2^2+5',1n], ['(-2)^2',4n], ['1/3+2/3',1n], ['2+3*4',14n], ['8/4/2',1n], ['.1+.2+.7',1n], ['2^(6/2)',8n]]) assert.equal(evaluateCount(input), expected, input);
  for (let prefix = 1; prefix < 128; prefix++) assert.equal(evaluateCount(`2^(128-${prefix})`), 1n << BigInt(128-prefix));
});

test('rejects invalid, unsafe, fractional, and excessive expressions', () => {
  for (const input of ['', '2^', '2^(128-', '1/0', '0^-1', '2^0.5', '1.5', '-2', '2(3)', '2 3', '2+3junk', 'Math.pow(2,59)', 'alert(1)', '2^999999999', '2^2^100', '('.repeat(600), '1'.repeat(513)]) assert.equal(evaluateCount(input), null, input);
});
