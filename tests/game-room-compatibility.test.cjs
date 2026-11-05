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

test('a waiting room has empty state, so no board or pieces are required', () => {
  for (const game_type of ['tic-tac-toe', 'connect-four', 'candy-land', 'chutes-and-ladders']) {
    const room = normalizeGameRoom({game_type, status: 'waiting', state: {}});
    // lib/games.ts runs in a separate vm realm, so compare as plain JSON rather than by prototype.
    assert.equal(JSON.stringify(room.board), '[]');
    assert.equal(JSON.stringify(room.pieces), '[]');
    assert.equal(JSON.stringify(room.winning_cells), '[]');
    assert.equal(room.last_move, null);
  }
});
test('strategy boards retain moves and winning cells from state', () => {
  const board = [1,1,1,2,2,0,0,0,0];
  const room = normalizeGameRoom({game_type: 'tic-tac-toe', status: 'finished', state: {board, winning_cells: [0,1,2], last_move: {slot: 2}}});
  assert.equal(room.board, board);
  assert.equal(room.winning_cells.length, 3);
  assert.equal(room.last_move.slot, 2);
});
test('track games expose their pieces and last move', () => {
  const pieces = [{id: 'piece-1', owner: 'host', space: 12}];
  const room = normalizeGameRoom({game_type: 'candy-land', status: 'playing', state: {pieces, last_move: {roll: 3}}});
  assert.equal(room.pieces, pieces);
  assert.equal(room.last_move.roll, 3);
});
test('missing, unknown, and board-less games produce recoverable errors', () => {
  assert.throws(() => normalizeGameRoom({}), /unsupported game/);
  assert.throws(() => normalizeGameRoom({game_type: 'unknown'}), /unsupported game/);
  assert.throws(() => normalizeGameRoom({game_type: 'connect-four', status: 'playing', state: {}}), /migration/);
});
test('a malformed state is treated as empty', () => {
  for (const state of [null, 'x', [], 5]) assert.equal(JSON.stringify(normalizeGameRoom({game_type: 'candy-land', status: 'waiting', state}).state), '{}');
});
