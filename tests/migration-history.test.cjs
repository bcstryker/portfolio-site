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

const {BASELINE, LEGACY, parseRemoteVersions, baselineRepairVersions, adoptBaseline} = require('../scripts/adopt-migration-baseline.cjs');
const history = versions => '  Local | Remote | Time (UTC)\n -------|--------|-----------\n' +
  versions.map(version => ` ${version === BASELINE ? version : ''} | ${version} | 2026-11-05 00:16:00`).join('\n');
test('baseline adoption recognizes only the complete original history and leaves fresh/adopted projects alone', () => {
  assert.deepEqual(baselineRepairVersions([...LEGACY, BASELINE]), LEGACY);
  assert.deepEqual(baselineRepairVersions([]), []);
  assert.deepEqual(baselineRepairVersions([BASELINE, '20261106000100']), []);
  assert.throws(() => baselineRepairVersions(LEGACY), /incomplete/);
  assert.throws(() => baselineRepairVersions([LEGACY[0], BASELINE]), /incomplete/);
  assert.throws(() => baselineRepairVersions(['20261104000100', BASELINE]), /Unknown/);
});
test('history parsing rejects unrecognized output instead of guessing', () => {
  assert.deepEqual(parseRemoteVersions(history([...LEGACY, BASELINE])), [...LEGACY, BASELINE]);
  assert.deepEqual(parseRemoteVersions(history([])), []);
  assert.throws(() => parseRemoteVersions('network failure'), /Unrecognized/);
  assert.throws(() => parseRemoteVersions('Local | Remote | Time\n bad | history | row'), /Unrecognized/);
});
test('baseline bridge only removes superseded history; it never applies SQL or resets data', () => {
  const commands = [];
  let repaired = false;
  assert.equal(adoptBaseline(args => {
    commands.push(args);
    if (args[1] === 'repair') {repaired = true; return '';}
    return history(repaired ? [BASELINE] : [...LEGACY, BASELINE]);
  }), true);
  assert.deepEqual(commands, [
    ['migration', 'list', '--linked'],
    ['migration', 'repair', ...LEGACY, '--status', 'reverted', '--linked'],
    ['migration', 'list', '--linked'],
  ]);
  assert.equal(adoptBaseline(() => history([BASELINE])), false);
  assert.throws(() => adoptBaseline(() => history([...LEGACY, BASELINE])), /did not finish/);
});
