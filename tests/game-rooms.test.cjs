const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');

test('room membership, host permissions, turn validation, and stale move protection', async () => {
  const db = new PGlite();
  const host = '00000000-0000-0000-0000-000000000001';
  const guest = '00000000-0000-0000-0000-000000000002';
  const outsider = '00000000-0000-0000-0000-000000000003';
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      insert into auth.users values ('${host}'), ('${guest}'), ('${outsider}');
      create publication supabase_realtime;
    `);
    await db.exec(readFileSync('supabase/migrations/20261105000100_game_rooms.sql', 'utf8'));
    const asUser = async (id) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec('set role authenticated');
    };
    await asUser(host);
    const {rows: [{id}]} = await db.query("select public.host_game('Host') as id");
    const {rows: [room]} = await db.query('select * from public.game_rooms where id = $1', [id]);
    assert.match(room.code, /^[A-F0-9]{8}$/);
    await assert.rejects(db.query("select public.game_action($1, 'start', 0)", [id]), /at least two/);
    await asUser(outsider);
    assert.equal((await db.query('select * from public.game_rooms')).rows.length, 0);
    await assert.rejects(db.query("select public.game_action($1, 'start', 0)", [id]), /not a member/);
    await asUser(guest);
    await db.query("select public.join_game($1, 'Guest')", [room.code.toLowerCase()]);
    await db.query("select public.join_game($1, 'Guest')", [room.code]);
    assert.equal((await db.query('select players from public.game_rooms')).rows[0].players.length, 2);
    await assert.rejects(db.query("update public.game_rooms set status = 'playing'"), /permission denied/);
    await assert.rejects(db.query("select public.game_action($1, 'start', 1)", [id]), /Only the host/);
    await asUser(host);
    await db.query("select public.game_action($1, 'start', 1)", [id]);
    await asUser(guest);
    await assert.rejects(db.query("select public.game_action($1, 'roll', 2)", [id]), /not your turn/);
    await asUser(host);
    await db.query("select public.game_action($1, 'roll', 2)", [id]);
    await assert.rejects(db.query("select public.game_action($1, 'roll', 2)", [id]), /room changed/);
    const state = (await db.query('select * from public.game_rooms')).rows[0];
    assert.equal(state.turn_index, 1);
    assert.equal(state.version, 3);
    assert.ok(state.last_move.roll >= 1 && state.last_move.roll <= 6);
    await db.query("select public.game_action($1, 'reset', 3)", [id]);
    const reset = (await db.query('select * from public.game_rooms')).rows[0];
    assert.equal(reset.status, 'waiting');
    assert.ok(reset.players.every(p => p.position === 0));
  } finally { await db.close(); }
});
