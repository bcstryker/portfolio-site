const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/meet-link.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, {exports: exportsObject, URL});
const {normalizeMeetLink} = exportsObject;
test('normalizes pasted Meet URLs and removes account-specific query parameters', () => {
  assert.equal(normalizeMeetLink(' https://meet.google.com/abc-defg-hij/?authuser=1#test '), 'https://meet.google.com/abc-defg-hij');
});
test('rejects scripts, other hosts, credentials, ports, and invalid meeting paths', () => {
  for (const value of ['javascript:alert(1)', 'http://meet.google.com/abc-defg-hij', 'https://meet.google.com.evil.com/abc-defg-hij', 'https://evil.com/abc-defg-hij', 'https://user:pass@meet.google.com/abc-defg-hij', 'https://meet.google.com:8443/abc-defg-hij', 'https://meet.google.com/new', 'https://meet.google.com/abc-defg-hij/extra', '']) assert.equal(normalizeMeetLink(value), null);
});
