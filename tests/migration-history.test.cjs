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
