const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/guest-session.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, {exports: exportsObject});
const {ensureGuestSession} = exportsObject;
const cached = {access_token: 'old', user: {id: 'same-guest'}};
const renewed = {access_token: 'new', user: {id: 'same-guest'}};
const fresh = {access_token: 'fresh', user: {id: 'new-guest'}};
const invalid = {code: 'session_not_found'};
function fixture(overrides = {}) {
  const calls = [];
  const auth = {
    getSession: async () => ({data: {session: cached}, error: null}),
    getUser: async () => ({data: {user: cached.user}, error: null}),
    refreshSession: async () => {calls.push('refresh'); return {data: {session: renewed}, error: null};},
    signOut: async options => {calls.push(`signOut:${options.scope}`); return {error: null};},
    signInAnonymously: async () => {calls.push('create'); return {data: {session: fresh}, error: null};},
    ...overrides,
  };
  return {client: {auth}, calls};
}
test('valid cached guest keeps their seat and does not create another identity', async () => {
  const {client, calls} = fixture(); assert.equal(await ensureGuestSession(client), cached); assert.deepEqual(calls, []);
});
test('expired token refreshes while preserving the guest identity', async () => {
  const {client, calls} = fixture({getUser: async token => token === 'old' ? {data:{user:null},error:invalid} : {data:{user:renewed.user},error:null}});
  assert.equal(await ensureGuestSession(client), renewed); assert.deepEqual(calls, ['refresh']);
});
test('invalid server-side session is cleared locally and replaced with a guest session', async () => {
  const {client, calls} = fixture({getUser: async () => ({data:{user:null},error:invalid}), refreshSession: async () => ({data:{session:null},error:{code:'refresh_token_not_found'}})});
  assert.equal(await ensureGuestSession(client), fresh); assert.deepEqual(calls, ['signOut:local','create']);
});
test('temporary Auth errors do not discard a guest or their seat', async () => {
  const outage = {name: 'AuthRetryableFetchError', status: 503};
  const {client, calls} = fixture({getUser: async () => ({data:{user:null},error:outage})});
  await assert.rejects(ensureGuestSession(client), error => error === outage); assert.deepEqual(calls, []);
});
test('simultaneous callers share session recovery instead of creating multiple guests', async () => {
  const {client, calls} = fixture({getSession: async () => ({data:{session:null},error:null})});
  const results = await Promise.all([ensureGuestSession(client), ensureGuestSession(client)]);
  assert.equal(results[0], results[1]); assert.deepEqual(calls, ['create']);
});
