const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, readdirSync} = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');

test('Candy Land deck and shared spinner are server-authoritative', async (t) => {
  const db = new PGlite();
  const host = '00000000-0000-0000-0000-000000000001';
  const guest = '00000000-0000-0000-0000-000000000002';
  const third = '00000000-0000-0000-0000-000000000003';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      insert into auth.users values ('${host}'), ('${guest}'), ('${third}');
      create publication supabase_realtime;`);
    for (const file of readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    async function asUser(id) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec('set role authenticated');
    }
    async function state(id) { return (await db.query('select * from public.game_rooms where id = $1', [id])).rows[0]; }
    async function create(game, includeThird = false) {
      await db.exec('reset role; set role service_role');
      const {rows: [{id}]} = await db.query("select public.host_game('Host', $1, $2) as id", [host, game]);
      await asUser(host); const room = await state(id);
      await asUser(guest); await db.query("select public.join_game($1, 'Guest')", [room.code]);
      if (includeThird) {await asUser(third); await db.query("select public.join_game($1, 'Third')", [room.code]);}
      await asUser(host); await db.query("select public.game_action($1, 'start', $2)", [id, includeThird ? 2 : 1]);
      return id;
    }
    async function act(id, action) {
      const room = await state(id);
      await db.query('select public.game_action($1, $2, $3)', [id, action, room.version]);
      return state(id);
    }
    async function seed(id, cards, position = 0) {
      await db.exec('reset role');
      await db.query("insert into public.game_decks values ($1, $2) on conflict (game_room_id) do update set cards = excluded.cards", [id, cards]);
      await db.query("update public.game_rooms set players = jsonb_set(players, '{0,position}', to_jsonb($2::integer)), turn_index = 0, turn_ready_at = null where id = $1", [id, position]);
      await asUser(host);
    }
    await t.test('single/double colors use the next matching spaces; future deck is private', async () => {
      const id = await create('candy-land', true);
      await assert.rejects(db.query('select * from public.game_decks'), /permission denied/);
      for (const card of Array.from({length:12}, (_,i) => i)) {
        await seed(id, [card, 4, 5]);
        const room = await act(id, 'draw');
        assert.equal(room.players[0].position, card % 6 + 1 + (card >= 6 ? 6 : 0));
        assert.equal(room.last_move.matches, card >= 6 ? 2 : 1);
        assert.equal(room.last_move.remaining, 2);
        assert.equal(room.last_move.player_id, host);
        assert.equal(room.last_move.from_position, 0);
        assert.ok(room.last_move.event_id);
        assert.equal(Date.parse(room.last_move.ends_at) - Date.parse(room.last_move.started_at), 2400);
        await asUser(guest);
        await assert.rejects(act(id, 'draw'), /animation to finish/);
        await asUser(host);
      }
    });
    await t.test('draws consume the top card, reshuffle when empty, and reset the deck', async () => {
      const id = await create('candy-land');
      await seed(id, [0]);
      const first = await act(id, 'draw'); assert.equal(first.last_move.remaining, 0);
      await db.exec('reset role');
      await db.query('update public.game_rooms set turn_ready_at = null where id = $1', [id]);
      await asUser(guest);
      const second = await act(id, 'draw'); assert.equal(second.last_move.remaining, 47);
      await db.exec('reset role');
      const deck = (await db.query('select cards from public.game_decks where game_room_id = $1', [id])).rows[0].cards;
      const drawn = second.last_move.color + (second.last_move.matches === 2 ? 6 : 0);
      const allCards = [...deck, drawn];
      assert.equal(allCards.filter(c => c < 6).length, 36);
      assert.equal(allCards.filter(c => c >= 6).length, 12);
      for (let color = 0; color < 6; color++) assert.equal(allCards.filter(c => c % 6 === color).length, 8);
      await asUser(host); await act(id, 'reset');
      await db.exec('reset role');
      assert.equal((await db.query('select * from public.game_decks where game_room_id = $1', [id])).rows.length, 0);
    });
    await t.test('reaching the end wins and rejects further draws and wrong action types', async () => {
      const id = await create('candy-land');
      await assert.rejects(act(id, 'spin'), /board move/);
      await assert.rejects(act(id, 'play'), /spinner or card deck/);
      await asUser(guest); await assert.rejects(act(id, 'draw'), /not your turn/);
      await seed(id, [0], 60);
      const room = await act(id, 'draw');
      assert.equal(room.status, 'finished'); assert.equal(room.winner_id, host); assert.equal(room.players[0].position, 61);
      await asUser(guest); await assert.rejects(act(id, 'draw'), /not in progress/);
    });
    await t.test('spinner publishes a shared reveal, enforces turn/cooldown, and preserves ladders', async () => {
      const id = await create('chutes-and-ladders');
      await assert.rejects(act(id, 'draw'), /does not use cards/);
      await asUser(guest); await assert.rejects(act(id, 'spin'), /not your turn/);
      await asUser(host); const room = await act(id, 'spin');
      assert.ok(room.last_move.roll >= 1 && room.last_move.roll <= 6);
      assert.ok(room.last_move.event_id); assert.equal(room.last_move.player_id, host);
      assert.equal(room.last_move.from_position, 0);
      assert.equal(Date.parse(room.last_move.ends_at) - Date.parse(room.last_move.started_at), 2400);
      const jumps = {1:38, 4:14};
      assert.equal(room.players[0].position, jumps[room.last_move.roll] ?? room.last_move.roll);
      await asUser(guest); await assert.rejects(act(id, 'spin'), /animation to finish/);
    });
    await t.test('party changes preserve room/key/seats and enforce host, capacity, and game lifecycle', async () => {
      const id = await create('candy-land', true);
      const original = await state(id);
      const change = (game, version) => db.query('select public.change_party_game($1, $2, $3)', [id, game, version]);
      await assert.rejects(change('chutes-and-ladders', original.version), /Return everyone to the lobby/);
      await asUser(guest);
      await assert.rejects(change('chutes-and-ladders', original.version), /Only the host/);
      await asUser(host);
      const waiting = await act(id, 'reset');
      await assert.rejects(change('tic-tac-toe', waiting.version), /only 2 players/);
      await assert.rejects(change('connect-four', waiting.version), /only 2 players/);
      await assert.rejects(change('unknown', waiting.version), /supported game/);
      await change('chutes-and-ladders', waiting.version);
      const switched = await state(id);
      assert.equal(switched.code, original.code); assert.equal(switched.host_id, original.host_id);
      assert.deepEqual(switched.players.map(p => p.id), original.players.map(p => p.id));
      assert.equal(switched.game_type, 'chutes-and-ladders'); assert.equal(switched.status, 'waiting');
      await assert.rejects(change('candy-land', waiting.version), /room changed/);
      await asUser(guest); assert.equal((await state(id)).game_type, 'chutes-and-ladders');
    });
    await t.test('party lobby accepts a third guest but cannot start a selected two-player game', async () => {
      const id = await create('tic-tac-toe');
      const waiting = await act(id, 'reset');
      await asUser(third);
      await db.query("select public.join_game($1, 'Third')", [waiting.code]);
      const joined = await state(id); assert.equal(joined.players.length, 3);
      await asUser(host);
      await assert.rejects(act(id, 'start'), /exactly two players/);
      await db.query('select public.change_party_game($1, $2, $3)', [id, 'candy-land', joined.version]);
      assert.equal((await act(id, 'start')).status, 'playing');
    });
    await t.test('two-person party switches after a finished game and starts a new game together', async () => {
      const id = await create('candy-land');
      const original = await state(id);
      await seed(id, [0], 60); const finished = await act(id, 'draw');
      await assert.rejects(db.query('select public.change_party_game($1, $2, $3)', [id, 'tic-tac-toe', finished.version]), /animation to finish/);
      await db.exec('reset role');
      await db.query('update public.game_rooms set turn_ready_at = null where id = $1', [id]);
      await asUser(host);
      await db.query('select public.change_party_game($1, $2, $3)', [id, 'tic-tac-toe', finished.version]);
      const next = await state(id);
      assert.equal(next.code, original.code); assert.equal(next.players.length, 2);
      assert.ok(next.players.every(p => p.position === 0)); assert.deepEqual(next.board, Array(9).fill(0));
      assert.equal(next.winner_id, null); assert.equal(next.last_move, null); assert.equal(next.turn_index, 0);
      await act(id, 'start');
      await db.query("select public.game_action($1, 'play', $2, 4)", [id, next.version + 1]);
      await asUser(guest); assert.equal((await state(id)).board[4], 1);
    });
    await t.test('only host can share/remove Meet link and it survives game changes and resets', async () => {
      const id = await create('candy-land');
      let room = await state(id);
      const link = 'https://meet.google.com/abc-defg-hij';
      const setLink = (url, version) => db.query('select public.set_party_video($1, $2, $3)', [id, url, version]);
      await asUser(guest);
      await assert.rejects(setLink(link, room.version), /Only the host/);
      await asUser(host);
      await assert.rejects(setLink('https://evil.com/abc-defg-hij', room.version), /Enter a Google Meet/);
      await assert.rejects(setLink(link, room.version - 1), /room changed/);
      await setLink(link, room.version);
      await asUser(guest); assert.equal((await state(id)).meet_url, link);
      await asUser(host); room = await act(id, 'reset');
      assert.equal(room.meet_url, link);
      await db.query('select public.change_party_game($1, $2, $3)', [id, 'tic-tac-toe', room.version]);
      room = await state(id); assert.equal(room.meet_url, link);
      await setLink(null, room.version);
      await asUser(guest); assert.equal((await state(id)).meet_url, null);
    });
  } finally {await db.close();}
});
