const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createPlatformDb, ids} = require('./db-helper.cjs');

test('two-player games enforce room limits, legal moves, wins, draws, and rematches', async (t) => {
  const h = await createPlatformDb();
  const {db, asUser, room, act} = h;
  try {
    // A started two-player game: lobby, a third player is refused, host starts.
    async function create(game) {
      const id = await h.lobby(game);
      const waiting = await room(id);
      await asUser(ids.outsider);
      await db.query("select public.join_game($1, 'Third')", [waiting.code]);
      await asUser(ids.host);
      await assert.rejects(act(id, 'start'), /needs 2 to 2 players/);
      await act(id, 'kick', {player_id: ids.outsider});
      await h.start(id);
      await asUser(ids.outsider);
      await assert.rejects(db.query("select public.join_game($1, 'Third')", [waiting.code]), /cannot join/);
      await asUser(ids.host);
      return id;
    }
    const play = (id, move) => h.move(id, {move});

    await t.test('Tic Tac Toe validates turns, squares, stale moves, and reset', async () => {
      const id = await create('tic-tac-toe');
      const started = await room(id);
      assert.deepEqual(started.state.board, Array(9).fill(0));
      await asUser(ids.guest);
      await assert.rejects(act(id, 'play', {move: 0}), /not your turn/);
      await asUser(ids.host);
      for (const bad of [9, -1, 1.5, '1', null, undefined]) await assert.rejects(act(id, 'play', {move: bad}), /Choose a square/);
      await assert.rejects(act(id, 'play', {}), /Choose a square/);
      await assert.rejects(act(id, 'roll'), /Unknown action/);
      const first = await play(id, 0);
      await assert.rejects(act(id, 'play', {move: 1}, started.version), /room changed/);
      await asUser(ids.guest);
      await assert.rejects(act(id, 'play', {move: 0}), /already taken/);
      assert.equal(first.state.board[0], 1);
      await asUser(ids.host);
      const reset = await act(id, 'reset');
      assert.equal(reset.status, 'waiting');
      assert.deepEqual(reset.state, {});
      assert.equal(reset.turn_index, 0);
    });
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const line of wins) await t.test(`Tic Tac Toe winning line ${line}`, async () => {
      const id = await create('tic-tac-toe');
      const other = Array.from({length: 9}, (_, i) => i).filter(i => !line.includes(i));
      for (const move of [line[0], other[0], line[1], other[1], line[2]]) await play(id, move);
      const finished = await room(id);
      assert.equal(finished.status, 'finished'); assert.equal(finished.winner_id, ids.host);
      assert.deepEqual([...finished.state.winning_cells].sort(), [...line].sort());
      await assert.rejects(act(id, 'play', {move: 8}), /not in progress/);
    });
    await t.test('Tic Tac Toe draw', async () => {
      const id = await create('tic-tac-toe');
      for (const move of [0,1,2,4,3,5,7,6,8]) await play(id, move);
      const finished = await room(id);
      assert.equal(finished.status, 'finished'); assert.equal(finished.winner_id, null);
      assert.deepEqual(finished.state.winning_cells, []);
    });
    await t.test('Connect Four gravity, full columns, and horizontal victory', async () => {
      const id = await create('connect-four');
      for (let i = 0; i < 6; i++) await play(id, 0);
      assert.deepEqual((await room(id)).state.board.filter((_, i) => i % 7 === 0), [2,1,2,1,2,1]);
      await asUser(ids.host);
      await assert.rejects(act(id, 'play', {move: 0}), /column is full/);
      await assert.rejects(act(id, 'play', {move: 7}), /Choose a column/);
      for (const move of [1,6,2,6,3]) await play(id, move);
      const finished = await room(id);
      assert.equal(finished.winner_id, ids.host); assert.equal(finished.status, 'finished');
      assert.deepEqual(finished.state.winning_cells, [35,36,37,38]);
    });
    await t.test('Connect Four vertical victory for second player', async () => {
      const id = await create('connect-four');
      for (const move of [0,1,0,1,2,1,2,1]) await play(id, move);
      const finished = await room(id);
      assert.equal(finished.winner_id, ids.guest); assert.equal(finished.status, 'finished');
      assert.deepEqual(finished.state.winning_cells, [15,22,29,36]);
    });
    await t.test('Connect Four full-board draw and rematch', async () => {
      const id = await create('connect-four');
      for (const move of [4,3,2,1,2,2,3,3,5,6,3,1,1,3,4,2,1,1,6,1,6,0,3,4,2,2,0,0,0,0,4,6,6,4,0,5,6,4,5,5,5,5]) await play(id, move);
      const finished = await room(id);
      assert.equal(finished.status, 'finished'); assert.equal(finished.winner_id, null);
      assert.ok(!finished.state.board.includes(0));
      await asUser(ids.host);
      const reset = await act(id, 'reset');
      assert.deepEqual(reset.state, {}); assert.equal(reset.winner_id, null);
      const again = await h.start(id);
      assert.deepEqual(again.state.board, Array(42).fill(0));
    });
    for (const mirror of [false, true]) await t.test(`Connect Four diagonal victory (${mirror ? 'left' : 'right'})`, async () => {
      const id = await create('connect-four');
      // Build a diagonal with normal legal drops; both slopes use the same mirrored sequence.
      for (const column of [0,1,1,2,4,2,2,3,4,3,5,3,3]) await play(id, mirror ? 6 - column : column);
      const finished = await room(id);
      assert.equal(finished.winner_id, ids.host); assert.equal(finished.status, 'finished');
      assert.equal(finished.state.winning_cells.length, 4);
    });
  } finally { await db.close(); }
});
