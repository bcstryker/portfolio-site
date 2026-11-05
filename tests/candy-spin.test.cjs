const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createPlatformDb, ids} = require('./db-helper.cjs');

test('Candy Land deck and shared spinner are server-authoritative', async (t) => {
  const h = await createPlatformDb();
  const {db, asUser, room, act} = h;
  try {
    async function create(game, third = false) {
      const id = await h.lobby(game, {third});
      await h.start(id);
      return id;
    }
    // Test-only: put known cards in the hidden deck and place the host's piece, host to move.
    async function seed(id, cards, space = 0) {
      await db.exec('reset role');
      await db.query("update public.game_private set data = jsonb_build_object('deck', $2::jsonb) where room_id = $1", [id, JSON.stringify(cards)]);
      await db.query("update public.game_rooms set state = jsonb_set(state, '{pieces,0,space}', to_jsonb($2::integer)), turn_index = 0, turn_ready_at = null where id = $1", [id, space]);
      await asUser(ids.host);
    }
    const hostSpace = (r) => r.state.pieces.find(p => p.owner === ids.host).space;

    await t.test('single/double colors use the next matching spaces; future deck is private', async () => {
      const id = await create('candy-land', true);
      await assert.rejects(db.query('select * from public.game_private'), /permission denied/);
      for (const card of Array.from({length: 12}, (_, i) => i)) {
        await seed(id, [card, 4, 5]);
        const r = await act(id, 'draw');
        assert.equal(hostSpace(r), card % 6 + 1 + (card >= 6 ? 6 : 0));
        assert.equal(r.state.last_move.matches, card >= 6 ? 2 : 1);
        assert.equal(r.state.last_move.color, card % 6);
        assert.equal(r.state.last_move.remaining, 2);
        assert.equal(r.state.last_move.player_id, ids.host);
        assert.equal(r.state.last_move.from_space, 0);
        assert.ok(r.state.last_move.event_id);
        assert.equal(Date.parse(r.state.last_move.ends_at) - Date.parse(r.state.last_move.started_at), 2400);
        assert.ok(!JSON.stringify(r).includes('deck'));
        await asUser(ids.guest);
        await assert.rejects(act(id, 'draw'), /animation to finish/);
        await asUser(ids.host);
      }
    });
    await t.test('draws consume the top card, reshuffle when empty, and reset the deck', async () => {
      const id = await create('candy-land');
      await seed(id, [0]);
      const first = await act(id, 'draw');
      assert.equal(first.state.last_move.remaining, 0);
      await h.clearAnimation(id);
      await asUser(ids.guest);
      const second = await act(id, 'draw');
      assert.equal(second.state.last_move.remaining, 47);
      await db.exec('reset role');
      const deck = (await db.query('select data from public.game_private where room_id = $1', [id])).rows[0].data.deck;
      const drawn = second.state.last_move.color + (second.state.last_move.matches === 2 ? 6 : 0);
      const allCards = [...deck, drawn];
      assert.equal(allCards.filter(c => c < 6).length, 36);
      assert.equal(allCards.filter(c => c >= 6).length, 12);
      for (let color = 0; color < 6; color++) assert.equal(allCards.filter(c => c % 6 === color).length, 8);
      await asUser(ids.host);
      await act(id, 'reset');
      await db.exec('reset role');
      assert.equal((await db.query('select * from public.game_private where room_id = $1', [id])).rows.length, 0);
    });
    await t.test('reaching the end wins and rejects further draws and wrong action types', async () => {
      const id = await create('candy-land');
      await assert.rejects(act(id, 'spin'), /Unknown action/);
      await assert.rejects(act(id, 'play'), /Unknown action/);
      await asUser(ids.guest);
      await assert.rejects(act(id, 'draw'), /not your turn/);
      await seed(id, [0], 60);
      const r = await act(id, 'draw');
      assert.equal(r.status, 'finished'); assert.equal(r.winner_id, ids.host); assert.equal(hostSpace(r), 61);
      await asUser(ids.guest);
      await assert.rejects(act(id, 'draw'), /not in progress/);
    });
    await t.test('spinner publishes a shared reveal, enforces turn/cooldown, and preserves ladders', async () => {
      const id = await create('chutes-and-ladders');
      await assert.rejects(act(id, 'draw'), /Unknown action/);
      await asUser(ids.guest);
      await assert.rejects(act(id, 'spin'), /not your turn/);
      await asUser(ids.host);
      const r = await act(id, 'spin');
      const move = r.state.last_move;
      assert.ok(move.roll >= 1 && move.roll <= 6);
      assert.ok(move.event_id); assert.equal(move.player_id, ids.host);
      assert.equal(move.from_space, 0);
      assert.equal(Date.parse(move.ends_at) - Date.parse(move.started_at), 2400);
      const jumps = {1: 38, 4: 14};
      assert.equal(hostSpace(r), jumps[move.roll] ?? move.roll);
      await asUser(ids.guest);
      await assert.rejects(act(id, 'spin'), /animation to finish/);
    });
    await t.test('spinner honors exact finish and overshoot', async () => {
      const id = await create('chutes-and-ladders');
      await db.exec('reset role');
      await db.query("update public.game_rooms set state = jsonb_set(state, '{pieces,0,space}', '99') where id = $1", [id]);
      await asUser(ids.host);
      // From 99 only a 1 wins; anything else overshoots and stays put.
      for (let tries = 0; tries < 40; tries++) {
        const before = await room(id);
        if (before.status !== 'playing') break;
        await db.exec('reset role');
        await db.query("update public.game_rooms set state = jsonb_set(state, '{pieces,0,space}', '99'), turn_index = 0, turn_ready_at = null where id = $1", [id]);
        await asUser(ids.host);
        const r = await act(id, 'spin');
        if (r.state.last_move.roll === 1) { assert.equal(r.status, 'finished'); assert.equal(r.winner_id, ids.host); assert.equal(hostSpace(r), 100); break; }
        assert.equal(hostSpace(r), 99); assert.equal(r.status, 'playing');
      }
      assert.equal((await room(id)).status, 'finished');
    });
    await t.test('party changes preserve room/key/seats and enforce host, capacity, and game lifecycle', async () => {
      const id = await create('candy-land', true);
      const original = await room(id);
      const change = (game, version) => db.query('select public.change_party_game($1, $2, $3)', [id, game, version]);
      await assert.rejects(change('chutes-and-ladders', original.version), /Return everyone to the lobby/);
      await asUser(ids.guest);
      await assert.rejects(change('chutes-and-ladders', original.version), /Only the host/);
      await asUser(ids.host);
      const waiting = await act(id, 'reset');
      await assert.rejects(change('tic-tac-toe', waiting.version), /only 2 players/);
      await assert.rejects(change('connect-four', waiting.version), /only 2 players/);
      await assert.rejects(change('unknown', waiting.version), /supported game/);
      await change('chutes-and-ladders', waiting.version);
      const switched = await room(id);
      assert.equal(switched.code, original.code); assert.equal(switched.host_id, original.host_id);
      assert.deepEqual(switched.players.map(p => p.id), original.players.map(p => p.id));
      assert.equal(switched.game_type, 'chutes-and-ladders'); assert.equal(switched.status, 'waiting');
      assert.deepEqual(switched.state, {});
      await assert.rejects(change('candy-land', waiting.version), /room changed/);
      await asUser(ids.guest);
      assert.equal((await room(id)).game_type, 'chutes-and-ladders');
    });
    await t.test('party lobby accepts a third guest but cannot start a selected two-player game', async () => {
      const id = await create('tic-tac-toe');
      const waiting = await act(id, 'reset');
      await asUser(ids.third);
      await db.query("select public.join_game($1, 'Third')", [waiting.code]);
      const joined = await room(id);
      assert.equal(joined.players.length, 3);
      await asUser(ids.host);
      await assert.rejects(act(id, 'start'), /needs 2 to 2 players/);
      await db.query('select public.change_party_game($1, $2, $3)', [id, 'candy-land', joined.version]);
      assert.equal((await act(id, 'start')).status, 'playing');
    });
    await t.test('two-person party switches after a finished game and starts a new game together', async () => {
      const id = await create('candy-land');
      const original = await room(id);
      await seed(id, [0], 60);
      const finished = await act(id, 'draw');
      await assert.rejects(db.query('select public.change_party_game($1, $2, $3)', [id, 'tic-tac-toe', finished.version]), /animation to finish/);
      await h.clearAnimation(id);
      await asUser(ids.host);
      await db.query('select public.change_party_game($1, $2, $3)', [id, 'tic-tac-toe', finished.version]);
      const next = await room(id);
      assert.equal(next.code, original.code); assert.equal(next.players.length, 2);
      assert.deepEqual(next.state, {}); assert.equal(next.status, 'waiting');
      assert.equal(next.winner_id, null); assert.equal(next.turn_index, 0);
      await db.exec('reset role');
      assert.equal((await db.query('select * from public.game_private where room_id = $1', [id])).rows.length, 0);
      await asUser(ids.host);
      await act(id, 'start');
      await act(id, 'play', {move: 4});
      await asUser(ids.guest);
      assert.equal((await room(id)).state.board[4], 1);
    });
    await t.test('only host can share/remove Meet link and it survives game changes and resets', async () => {
      const id = await create('candy-land');
      let r = await room(id);
      const link = 'https://meet.google.com/abc-defg-hij';
      const setLink = (url, version) => db.query('select public.set_party_video($1, $2, $3)', [id, url, version]);
      await asUser(ids.guest);
      await assert.rejects(setLink(link, r.version), /Only the host/);
      await asUser(ids.host);
      await assert.rejects(setLink('https://evil.com/abc-defg-hij', r.version), /Enter a Google Meet/);
      await assert.rejects(setLink(link, r.version - 1), /room changed/);
      await setLink(link, r.version);
      await asUser(ids.guest);
      assert.equal((await room(id)).meet_url, link);
      await asUser(ids.host);
      r = await act(id, 'reset');
      assert.equal(r.meet_url, link);
      await db.query('select public.change_party_game($1, $2, $3)', [id, 'tic-tac-toe', r.version]);
      r = await room(id);
      assert.equal(r.meet_url, link);
      await setLink(null, r.version);
      await asUser(ids.guest);
      assert.equal((await room(id)).meet_url, null);
    });
  } finally { await db.close(); }
});
