// Shared setup for database tests: an in-process Postgres (PGlite) with a minimal Supabase stub,
// every migration applied in order, and small helpers for acting as different players.
const {readFileSync, readdirSync} = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');

const ids = {
  host: '00000000-0000-0000-0000-000000000001',
  guest: '00000000-0000-0000-0000-000000000002',
  third: '00000000-0000-0000-0000-000000000003',
  outsider: '00000000-0000-0000-0000-000000000004',
};

async function createPlatformDb() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    insert into auth.users values ${Object.values(ids).map(id => `('${id}')`).join(', ')};
    create publication supabase_realtime;`);
  for (const file of readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  }

  async function asUser(id) {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    await db.exec('set role authenticated');
  }
  async function room(id) {
    return (await db.query('select * from public.game_rooms where id = $1', [id])).rows[0];
  }
  // Calls game_action as whoever is currently set, using the room's current version unless one is given.
  async function act(id, action, payload = {}, version) {
    const v = version ?? (await room(id)).version;
    await db.query('select public.game_action($1, $2, $3, $4::jsonb)', [id, action, v, JSON.stringify(payload)]);
    return room(id);
  }
  // Creates a waiting room as the host. Clears older rooms first so the hourly creation limit never interferes.
  async function host(game, {options = {}, keepRooms = false} = {}) {
    await db.exec(keepRooms ? 'reset role; set role service_role' : 'reset role; delete from public.game_rooms; set role service_role');
    const {rows: [{id}]} = await db.query("select public.host_game('Host', $1, $2, $3::jsonb) as id", [ids.host, game, JSON.stringify(options)]);
    return id;
  }
  async function join(id, userId, name) {
    const {code} = await asAdminRoom(id);
    await asUser(userId);
    await db.query('select public.join_game($1, $2)', [code, name]);
  }
  async function asAdminRoom(id) {
    await db.exec('reset role');
    return room(id);
  }
  // Waiting room with the host, a guest, and optionally a third player.
  async function lobby(game, {third = false, options} = {}) {
    const id = await host(game, {options});
    await join(id, ids.guest, 'Guest');
    if (third) await join(id, ids.third, 'Third');
    await asUser(ids.host);
    return id;
  }
  async function start(id) {
    await asUser(ids.host);
    return act(id, 'start');
  }
  // Plays as whoever's turn it is.
  async function move(id, payload, action = 'play') {
    const current = await room(id);
    await asUser(current.players[current.turn_index].id);
    return act(id, action, payload);
  }
  // Test-only shortcut: let the animation lock expire.
  async function clearAnimation(id) {
    await db.exec('reset role');
    await db.query('update public.game_rooms set turn_ready_at = null where id = $1', [id]);
  }
  return {db, ids, asUser, room, act, host, join, lobby, start, move, clearAnimation};
}

module.exports = {createPlatformDb, ids};
