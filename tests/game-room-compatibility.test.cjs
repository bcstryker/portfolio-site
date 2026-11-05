const {test} = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const vm = require('node:vm');
const {readFileSync} = require('node:fs');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/games.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, {exports: exportsObject});
const {normalizeGameRoom} = exportsObject;

test('restoring a legacy room defaults to Chutes and Ladders without missing board fields', () => {
  const room = normalizeGameRoom({id: 'saved-room', players: [{id: 'host', position: 12}]});
  assert.equal(room.game_type, 'chutes-and-ladders');
  assert.equal(room.board.length, 0);
  assert.equal(room.winning_cells.length, 0);
  assert.equal(room.players[0].position, 12);
});
test('strategy boards retain moves and winning cells', () => {
  const board = [1,1,1,2,2,0,0,0,0];
  const room = normalizeGameRoom({game_type: 'tic-tac-toe', board, winning_cells: [0,1,2]});
  assert.equal(room.board, board);
  assert.equal(room.winning_cells.length, 3);
});
test('unknown games and missing strategy boards produce recoverable errors', () => {
  assert.throws(() => normalizeGameRoom({game_type: 'unknown'}), /unsupported game/);
  assert.throws(() => normalizeGameRoom({game_type: 'connect-four'}), /migration/);
});
