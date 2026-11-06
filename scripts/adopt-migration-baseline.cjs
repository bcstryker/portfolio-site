// History-only bridge from the complete original chain to its equivalent baseline.
// Keep until every deployed environment has adopted the baseline.
const {spawnSync} = require('node:child_process');
const BASELINE = '20261105001600';
const LEGACY = Array.from({length: 15}, (_, i) => `20261105${String(i + 1).padStart(4, '0')}00`);

function parseRemoteVersions(output) {
  const clean = output.replace(/\x1b\[[0-9;]*m/g, '');
  if (!/Local\s*\|\s*Remote\s*\|/i.test(clean)) throw new Error('Unrecognized migration history output; refusing history changes.');
  const versions = [];
  for (const line of clean.split('\n')) {
    if (!line.includes('|') || /Local\s*\|/i.test(line) || /^[\s|+-]+$/.test(line)) continue;
    const columns = line.split('|').map(value => value.trim().replaceAll('`', ''));
    if (columns.length !== 3 || !/^\d{14}$|^$/.test(columns[0]) || !/^\d{14}$|^$/.test(columns[1])) {
      throw new Error('Unrecognized migration history row; refusing history changes.');
    }
    if (columns[1]) versions.push(columns[1]);
  }
  return versions;
}
function baselineRepairVersions(remote) {
  if (remote.some(version => !/^\d{14}$/.test(version) || (version < BASELINE && !LEGACY.includes(version)))) {
    throw new Error('Unknown pre-baseline history; refusing baseline adoption.');
  }
  const old = remote.filter(version => LEGACY.includes(version));
  if (!old.length) return []; // Fresh database, or baseline already adopted. Normal db push handles later migrations.
  if (!remote.includes(BASELINE) || old.length !== LEGACY.length) {
    throw new Error('The original 16-migration chain is incomplete. Refusing baseline adoption; inspect migration history.');
  }
  return LEGACY;
}
function adoptBaseline(run) {
  const versions = baselineRepairVersions(parseRemoteVersions(run(['migration', 'list', '--linked'])));
  if (!versions.length) return false;
  console.log('Adopting the equivalent baseline: removing 15 superseded history entries only. No application SQL or data changes.');
  run(['migration', 'repair', ...versions, '--status', 'reverted', '--linked']);
  if (baselineRepairVersions(parseRemoteVersions(run(['migration', 'list', '--linked']))).length) {
    throw new Error('Baseline adoption did not finish; refusing deployment.');
  }
  return true;
}
if (require.main === module) {
  try {
    adoptBaseline(args => {
      const result = spawnSync('supabase', args, {encoding: 'utf8', env: {...process.env, NO_COLOR: '1'}});
      if (result.stderr) process.stderr.write(result.stderr);
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`Supabase ${args[0]} ${args[1]} failed; refusing deployment.`);
      process.stdout.write(result.stdout);
      return result.stdout;
    });
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
module.exports = {BASELINE, LEGACY, parseRemoteVersions, baselineRepairVersions, adoptBaseline};
