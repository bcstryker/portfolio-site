const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, readdirSync} = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');

test('two-player games enforce room limits, legal moves, wins, draws, and rematches', async (t) => {
  const db = new PGlite();
  const host = '00000000-0000-0000-0000-000000000001';
  const guest = '00000000-0000-0000-0000-000000000002';
  const outsider = '00000000-0000-0000-0000-000000000003';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      insert into auth.users values ('${host}'), ('${guest}'), ('${outsider}');
      create publication supabase_realtime;`);
    for (const file of readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) {
      await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    }
    async function asUser(id) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec('set role authenticated');
    }
    async function state(id) {return (await db.query('select * from public.game_rooms where id = $1', [id])).rows[0];}
    async function create(game) {
      await db.exec('reset role; delete from public.game_rooms; set role service_role');
      const {rows: [{id}]} = await db.query("select public.host_game('Host', $1, $2) as id", [host, game]);
      await asUser(host);
      const room = await state(id);
      await assert.rejects(db.query("select public.game_action($1, 'start', 0)", [id]), /at least two/);
      await asUser(guest);
      await db.query("select public.join_game($1, 'Guest')", [room.code]);
      await asUser(host);
      await db.query("select public.game_action($1, 'start', 1)", [id]);
      await asUser(outsider);
      await assert.rejects(db.query("select public.join_game($1, 'Third')", [room.code]), /already started/);
      await asUser(host);
      return id;
    }
    async function play(id, move) {
      const room = await state(id);
      await asUser(room.players[room.turn_index].id);
      await db.query("select public.game_action($1, 'play', $2, $3)", [id, room.version, move]);
      return state(id);
    }
    await t.test('Tic Tac Toe validates turns, squares, stale moves, and reset', async () => {
      const id = await create('tic-tac-toe');
      await asUser(guest);
      await assert.rejects(db.query("select public.game_action($1, 'play', 2, 0)", [id]), /not your turn/);
      await asUser(host);
      await assert.rejects(db.query("select public.game_action($1, 'play', 2, 9)", [id]), /Choose a square/);
      await assert.rejects(db.query("select public.game_action($1, 'roll', 2)", [id]), /board move/);
      await play(id, 0);
      await assert.rejects(db.query("select public.game_action($1, 'play', 2, 1)", [id]), /room changed/);
      await asUser(guest);
      await assert.rejects(db.query("select public.game_action($1, 'play', 3, 0)", [id]), /already taken/);
      await asUser(host);
      await db.query("select public.game_action($1, 'reset', 3)", [id]);
      const room = await state(id);
      assert.equal(room.status, 'waiting'); assert.deepEqual(room.board, Array(9).fill(0));
      assert.deepEqual(room.winning_cells, []); assert.equal(room.turn_index, 0);
    });
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const line of wins) await t.test(`Tic Tac Toe winning line ${line}`, async () => {
      const id = await create('tic-tac-toe');
      const other = Array.from({length:9}, (_, i) => i).filter(i => !line.includes(i));
      for (const move of [line[0],other[0],line[1],other[1],line[2]]) await play(id, move);
      const room = await state(id);
      assert.equal(room.status, 'finished'); assert.equal(room.winner_id, host);
      assert.deepEqual([...room.winning_cells].sort(), [...line].sort());
      await assert.rejects(db.query("select public.game_action($1, 'play', $2, 8)", [id, room.version]), /not in progress/);
    });
    await t.test('Tic Tac Toe draw', async () => {
      const id = await create('tic-tac-toe');
      for (const move of [0,1,2,4,3,5,7,6,8]) await play(id, move);
      const room = await state(id);
      assert.equal(room.status, 'finished'); assert.equal(room.winner_id, null); assert.deepEqual(room.winning_cells, []);
    });
    await t.test('Connect Four gravity, full columns, and horizontal victory', async () => {
      const id = await create('connect-four');
      for (const move of [0,0,0,0,0,0]) await play(id, move);
      assert.deepEqual((await state(id)).board.filter((_, i) => i % 7 === 0), [2,1,2,1,2,1]);
      await asUser(host);
      await assert.rejects(db.query("select public.game_action($1, 'play', 8, 0)", [id]), /column is full/);
      await assert.rejects(db.query("select public.game_action($1, 'play', 8, 7)", [id]), /Choose a column/);
      for (const move of [1,6,2,6,3]) await play(id, move);
      const room = await state(id);
      assert.equal(room.winner_id, host); assert.equal(room.status, 'finished');
      assert.deepEqual(room.winning_cells, [35,36,37,38]);
    });
    await t.test('Connect Four vertical victory for second player', async () => {
      const id = await create('connect-four');
      for (const move of [0,1,0,1,2,1,2,1]) await play(id, move);
      const room = await state(id); assert.equal(room.winner_id, guest); assert.equal(room.status, 'finished');
      assert.deepEqual(room.winning_cells, [15,22,29,36]);
    });
    await t.test('Connect Four full-board draw and rematch', async () => {
      const id = await create('connect-four');
      for (const move of [4,3,2,1,2,2,3,3,5,6,3,1,1,3,4,2,1,1,6,1,6,0,3,4,2,2,0,0,0,0,4,6,6,4,0,5,6,4,5,5,5,5]) await play(id, move);
      const room = await state(id);
      assert.equal(room.status, 'finished'); assert.equal(room.winner_id, null); assert.ok(!room.board.includes(0));
      await asUser(host);
      await db.query("select public.game_action($1, 'reset', $2)", [id, room.version]);
      const reset = await state(id);
      assert.deepEqual(reset.board, Array(42).fill(0)); assert.equal(reset.winner_id, null); assert.deepEqual(reset.winning_cells, []);
    });
    for (const mirror of [false,true]) await t.test(`Connect Four diagonal victory (${mirror ? 'left' : 'right'})`, async () => {
      const id = await create('connect-four');
      // Build a diagonal with normal legal drops; both slopes use the same mirrored sequence.
      for (const column of [0,1,1,2,4,2,2,3,4,3,5,3,3]) await play(id, mirror ? 6-column : column);
      const room = await state(id); assert.equal(room.winner_id, host); assert.equal(room.status, 'finished');
      assert.equal(room.winning_cells.length, 4);
    });
  } finally {await db.close();}
});
