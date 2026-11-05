const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createPlatformDb, ids} = require('./db-helper.cjs');

test('room membership, host permissions, turn validation, and stale move protection', async () => {
  const t = await createPlatformDb();
  const {db, asUser, room, act} = t;
  try {
    await asUser(ids.host);
    await assert.rejects(db.query("select public.host_game('Host', $1)", [ids.host]), /permission denied/);
    await assert.rejects(db.query("select public.host_game('Host')"), /does not exist/);
    const id = await t.host('chutes-and-ladders');
    await asUser(ids.host);
    const created = await room(id);
    assert.match(created.code, /^[A-F0-9]{8}$/);
    assert.deepEqual(created.state, {});
    assert.equal(created.status, 'waiting');
    await assert.rejects(act(id, 'start'), /needs 2 to 8 players/);

    await asUser(ids.outsider);
    assert.equal((await db.query('select * from public.game_rooms')).rows.length, 0);
    await assert.rejects(db.query("select public.game_action($1, 'start', 0)", [id]), /not a member/);

    await asUser(ids.guest);
    await db.query("select public.join_game($1, 'Guest')", [created.code.toLowerCase()]);
    await db.query("select public.join_game($1, 'Guest')", [created.code]);
    const joined = (await db.query('select players from public.game_rooms')).rows[0].players;
    assert.deepEqual(joined.map(p => Object.keys(p).sort()), [['id', 'name'], ['id', 'name']]);
    await assert.rejects(db.query("update public.game_rooms set status = 'playing'"), /permission denied/);
    await assert.rejects(db.query('select * from public.game_private'), /permission denied/);
    await assert.rejects(act(id, 'start'), /Only the host/);

    await asUser(ids.host);
    const started = await act(id, 'start');
    assert.equal(started.status, 'playing');
    assert.equal(started.state.pieces.length, 2);
    assert.deepEqual(started.state.pieces.map(p => p.owner), [ids.host, ids.guest]);
    assert.ok(started.state.pieces.every(p => p.space === 0));

    await asUser(ids.guest);
    await assert.rejects(act(id, 'spin'), /not your turn/);
    await asUser(ids.host);
    const spun = await act(id, 'spin');
    await assert.rejects(act(id, 'spin', {}, started.version), /room changed/);
    assert.equal(spun.turn_index, 1);
    assert.equal(spun.version, started.version + 1);
    assert.ok(spun.state.last_move.roll >= 1 && spun.state.last_move.roll <= 6);
    await assert.rejects(act(id, 'spin', {}, spun.version), /not your turn/);
    await assert.rejects(act(id, 'spin', 'not an object'), /Invalid request/);

    await asUser(ids.guest);
    await assert.rejects(act(id, 'reset'), /Only the host/);
    await asUser(ids.host);
    const reset = await act(id, 'reset');
    assert.equal(reset.status, 'waiting');
    assert.deepEqual(reset.state, {});
    assert.equal(reset.turn_index, 0);
    assert.equal(reset.winner_id, null);
  } finally { await db.close(); }
});

test('host can remove players from the lobby and removed players cannot rejoin', async () => {
  const t = await createPlatformDb();
  const {db, asUser, room, act} = t;
  try {
    const id = await t.lobby('candy-land', {third: true});
    const waiting = await room(id);
    assert.equal(waiting.players.length, 3);
    const kick = (who) => act(id, 'kick', {player_id: who});

    await asUser(ids.guest);
    await assert.rejects(kick(ids.third), /Only the host/);
    await asUser(ids.host);
    await assert.rejects(kick(ids.host), /host cannot be removed/);
    await assert.rejects(kick(ids.outsider), /not in this room/);
    await assert.rejects(act(id, 'kick', {}), /Choose a player/);
    await assert.rejects(act(id, 'kick', {player_id: 'nonsense'}), /Choose a player/);

    const after = await kick(ids.third);
    assert.deepEqual(after.players.map(p => p.id), [ids.host, ids.guest]);
    assert.deepEqual(after.banned, [ids.third]);
    await asUser(ids.third);
    assert.equal((await db.query('select * from public.game_rooms')).rows.length, 0);
    await assert.rejects(db.query('select public.join_game($1, $2)', [waiting.code, 'Third']), /cannot join/);

    await asUser(ids.host);
    await act(id, 'start');
    await assert.rejects(kick(ids.guest), /only be removed from the lobby/);
  } finally { await db.close(); }
});

test('hosting validates the game and options, and limits room creation per guest', async () => {
  const t = await createPlatformDb();
  const {db} = t;
  try {
    await db.exec('reset role; set role service_role');
    await assert.rejects(db.query("select public.host_game('Host', $1, 'unknown')", [ids.host]), /supported game/);
    await assert.rejects(db.query("select public.host_game('Host', $1, 'tic-tac-toe', '[]'::jsonb)", [ids.host]), /Invalid game options/);
    await assert.rejects(db.query("select public.host_game('', $1, 'tic-tac-toe')", [ids.host]), /between 1 and 24/);
    await assert.rejects(db.query("select public.host_game('Host', null, 'tic-tac-toe')"), /Sign in/);
    for (let i = 0; i < 10; i++) await t.host('tic-tac-toe', {keepRooms: true});
    await assert.rejects(t.host('tic-tac-toe', {keepRooms: true}), /Too many rooms/);
  } finally { await db.close(); }
});

test('a party holds up to eight players and rejects a ninth', async () => {
  const t = await createPlatformDb();
  const {db, asUser} = t;
  try {
    const id = await t.host('candy-land');
    await db.exec('reset role');
    const extra = [];
    for (let i = 0; i < 5; i++) {
      const {rows: [{id: user}]} = await db.query('insert into auth.users values (gen_random_uuid()) returning id');
      extra.push(user);
    }
    const {code} = await t.room(id);
    for (const [i, user] of [ids.guest, ids.third, ...extra].entries()) {
      await asUser(user);
      await db.query('select public.join_game($1, $2)', [code, `P${i}`]);
    }
    assert.equal((await t.room(id)).players.length, 8);
    await asUser(ids.outsider);
    await assert.rejects(db.query('select public.join_game($1, $2)', [code, 'Ninth']), /full/);
  } finally { await db.close(); }
});
