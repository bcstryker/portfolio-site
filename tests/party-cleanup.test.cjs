const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, readdirSync} = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');

test('hosting cleans up only inactive parties and their decks, preserving active rooms and accounts', async () => {
  const db = new PGlite();
  const host = '00000000-0000-0000-0000-000000000001';
  const outsider = '00000000-0000-0000-0000-000000000002';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      insert into auth.users values ('${host}'), ('${outsider}'); create publication supabase_realtime;`);
    for (const file of readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    async function create() {
      await db.exec('reset role; set role service_role');
      const result = await db.query("select public.host_game('Host', $1, 'candy-land') as id", [host]);
      await db.exec('reset role');
      return result.rows[0].id;
    }
    async function asUser(id) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec('set role authenticated');
    }
    const expired = await create(); const active = await create(); const heartbeatRoom = await create(); const fresh = await create();
    await db.query('insert into public.game_decks values ($1, ARRAY[1,2,3])', [expired]);
    // Backdate fixtures without allowing the activity trigger to replace the dates.
    await db.exec('alter table public.game_rooms disable trigger game_room_activity');
    await db.query("update public.game_rooms set created_at = now() - interval '2 days', last_active_at = now() - interval '2 hours' where id = any($1::uuid[])", [[expired, heartbeatRoom]]);
    await db.query("update public.game_rooms set created_at = now() - interval '2 days', last_active_at = now() - interval '20 minutes' where id = $1", [active]);
    await db.exec('alter table public.game_rooms enable trigger game_room_activity');
    await asUser(outsider);
    await assert.rejects(db.query('select public.touch_game_room($1)', [expired]), /no longer available/);
    await assert.rejects(db.query("select public.host_game('Bypass', $1)", [outsider]), /permission denied/);
    await asUser(host);
    await db.query('select public.touch_game_room($1)', [heartbeatRoom]);
    const alive = (await db.query('select * from public.game_rooms where id = $1', [heartbeatRoom])).rows[0];
    assert.equal(alive.version, 0);
    assert.ok(Date.now() - Date.parse(alive.last_active_at) < 10000);
    // Invalid creation must not clean anything up.
    await db.exec('reset role; set role service_role');
    await assert.rejects(db.query("select public.host_game('', $1)", [host]), /Choose a name/);
    await db.exec('reset role');
    assert.equal((await db.query('select id from public.game_rooms where id = $1', [expired])).rows.length, 1);
    const newRoom = await create();
    const ids = (await db.query('select id from public.game_rooms')).rows.map(r => r.id);
    assert.ok(!ids.includes(expired));
    for (const id of [active, heartbeatRoom, fresh, newRoom]) assert.ok(ids.includes(id));
    assert.equal((await db.query('select * from public.game_decks')).rows.length, 0);
    assert.equal((await db.query('select * from auth.users')).rows.length, 2);
    await asUser(host);
    await assert.rejects(db.query('select public.touch_game_room($1)', [expired]), /no longer available/);
    // Explicit purge includes fresh/other-host rooms, but cannot be invoked by a guest.
    await db.exec('reset role; set role service_role');
    const otherHostRoom = (await db.query("select public.host_game('Other host', $1)", [outsider])).rows[0].host_game;
    await db.exec('reset role');
    await db.query('insert into public.game_decks values ($1, ARRAY[1,2])', [otherHostRoom]);
    await asUser(outsider);
    await assert.rejects(db.query('select public.delete_other_parties($1)', [newRoom]), /Only the host/);
    await assert.rejects(db.query('select public.delete_other_parties(null)'), /Only the host/);
    await asUser(host);
    const before = (await db.query('select * from public.game_rooms where id = $1', [newRoom])).rows[0];
    const removed = (await db.query('select public.delete_other_parties($1) as count', [newRoom])).rows[0].count;
    assert.equal(removed, 4);
    const after = (await db.query('select * from public.game_rooms where id = $1', [newRoom])).rows[0];
    assert.deepEqual(after, before);
    assert.equal((await db.query('select public.delete_other_parties($1) as count', [newRoom])).rows[0].count, 0);
    await db.exec('reset role');
    assert.deepEqual((await db.query('select id from public.game_rooms')).rows.map(r => r.id), [newRoom]);
    assert.equal((await db.query('select * from public.game_decks')).rows.length, 0);
    assert.equal((await db.query('select * from auth.users')).rows.length, 2);
  } finally {await db.close();}
});
