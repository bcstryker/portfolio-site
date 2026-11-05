const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function endpoint(env, validSession = true) {
  const calls = [];
  const module = {exports: {}};
  const js = ts.transpileModule(readFileSync('app/api/games/host/route.ts', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText;
  vm.runInNewContext(js, {module, exports: module.exports, Response, process: {env}, require: (id) => {
    if (id === '@/lib/games') {
      const gamesModule = {exports: {}};
      vm.runInNewContext(ts.transpileModule(readFileSync('lib/games.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, {exports: gamesModule.exports});
      return gamesModule.exports;
    }
    if (id !== '@supabase/supabase-js') return require(id);
    return {createClient: () => ({
      auth: {getUser: async (token) => ({data: {user: validSession && token === 'guest-token' ? {id: 'verified-guest'} : null}, error: null})},
      rpc: async (name, args) => {calls.push({name, args}); return {data: 'room-id', error: null};},
    })};
  }});
  return {post: module.exports.POST, calls};
}
const env = {'HOST_PW': 'test-password', NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public', SUPABASE_SECRET_KEY: 'server-only'};
function request(password, token = 'guest-token', gameType) {
  return new Request('https://example.com/api/games/host', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`}, body: JSON.stringify({password, displayName: ' Host ', userId: 'spoofed', gameType})});
}
test('host password rejects wrong or missing passwords without creating a room', async () => {
  const {post, calls} = endpoint(env);
  assert.equal((await post(request('wrong'))).status, 403);
  assert.equal((await post(request(undefined))).status, 400);
  assert.equal(calls.length, 0);
});
test('hosting fails closed when password or service key is not configured', async () => {
  for (const key of ['HOST_PW', 'SUPABASE_SECRET_KEY']) {
    const config = {...env}; delete config[key];
    const {post, calls} = endpoint(config);
    assert.equal((await post(request('test-password'))).status, 503);
    assert.equal(calls.length, 0);
  }
});
test('valid password still requires a verified guest session', async () => {
  const {post, calls} = endpoint(env, false);
  assert.equal((await post(request('test-password'))).status, 401);
  assert.equal(calls.length, 0);
});
test('host is assigned from the verified session and password is not returned', async () => {
  const {post, calls} = endpoint(env);
  const response = await post(request('test-password'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {roomId: 'room-id'});
  assert.equal(calls[0].name, 'host_game');
  assert.equal(calls[0].args.host_user_id, 'verified-guest');
  assert.equal(calls[0].args.display_name, 'Host');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('selected game is validated and forwarded to room creation', async () => {
  const {post, calls} = endpoint(env);
  assert.equal((await post(request('test-password', 'guest-token', 'unsupported'))).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await post(request('test-password', 'guest-token', 'connect-four'))).status, 200);
  assert.equal(calls[0].args.selected_game, 'connect-four');
});
