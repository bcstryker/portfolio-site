const {test} = require('node:test');
const assert = require('node:assert/strict');
const {verifiedVersions, ACKNOWLEDGEMENT} = require('../scripts/record-applied-migrations.cjs');
const files = ['20261105000100_game_rooms.sql', '20261105000200_hosting.sql'];
test('history repair accepts only exact verified local versions, deduplicated and sorted', () => {
  assert.deepEqual(verifiedVersions('20261105000200, 20261105000100\n20261105000200', ACKNOWLEDGEMENT, files), ['20261105000100', '20261105000200']);
});
test('history repair cannot silently mark every migration as applied', () => {
  assert.throws(() => verifiedVersions('', ACKNOWLEDGEMENT, files), /exact migration timestamps/);
  assert.throws(() => verifiedVersions('20261105000100', '', files), /confirmation/);
  assert.throws(() => verifiedVersions('20261105000999', ACKNOWLEDGEMENT, files), /Unknown/);
  assert.throws(() => verifiedVersions('--status=reverted', ACKNOWLEDGEMENT, files), /Unknown/);
});

const {rebuildArguments, REBUILD_CONFIRMATION} = require('../scripts/rebuild-database.cjs');
test('database rebuild requires manual dispatch and explicit acknowledgement', () => {
  assert.throws(() => rebuildArguments('push', REBUILD_CONFIRMATION), /manual-only/);
  assert.throws(() => rebuildArguments('pull_request', REBUILD_CONFIRMATION), /manual-only/);
  assert.throws(() => rebuildArguments('workflow_dispatch', ''), /confirm deletion/);
  assert.deepEqual(rebuildArguments('workflow_dispatch', REBUILD_CONFIRMATION), ['db', 'reset', '--linked', '--no-seed', '--yes']);
});
