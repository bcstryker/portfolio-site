const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/connect-four-input.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, {exports: exportsObject});
const {keyboardColumn} = exportsObject;

test('number keys 1–7 match the visible column numbering', () => {
  for (let key = 1; key <= 7; key++) assert.equal(keyboardColumn({key: String(key)}, false), key - 1);
});
test('typing, held keys, IME input, and browser shortcuts do not make moves', () => {
  assert.equal(keyboardColumn({key: '1'}, true), null);
  for (const flag of ['repeat', 'altKey', 'ctrlKey', 'metaKey', 'isComposing']) assert.equal(keyboardColumn({key: '1', [flag]: true}, false), null);
});
test('other keys cannot select columns', () => {
  for (const key of ['0','8','9','a','ArrowDown','Enter','F1','']) assert.equal(keyboardColumn({key}, false), null);
});
