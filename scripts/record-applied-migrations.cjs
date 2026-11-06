// This changes migration HISTORY only. Never infer applied versions from table existence.
const {readdirSync} = require('node:fs');
const {spawnSync} = require('node:child_process');
const ACKNOWLEDGEMENT = 'I VERIFIED THESE MIGRATIONS ARE ALREADY APPLIED';

function verifiedVersions(input, confirmation, filenames) {
  if (confirmation !== ACKNOWLEDGEMENT) throw new Error(`History repair requires this confirmation: ${ACKNOWLEDGEMENT}`);
  const versions = [...new Set((input ?? '').split(/[\s,]+/).filter(Boolean))].sort();
  if (!versions.length) throw new Error('Provide the exact migration timestamps already applied to this project.');
  const known = new Set(filenames.filter(name => /^\d{14}_.+\.sql$/.test(name)).map(name => name.slice(0, 14)));
  for (const version of versions) {
    if (!/^\d{14}$/.test(version) || !known.has(version)) throw new Error(`Unknown migration version: ${version}`);
  }
  return versions;
}

if (require.main === module) {
  try {
    const versions = verifiedVersions(process.env.APPLIED_VERSIONS, process.env.REPAIR_CONFIRMATION, readdirSync('supabase/migrations'));
    console.log(`Recording verified migration history only: ${versions.join(', ')}`);
    const result = spawnSync('supabase', ['migration', 'repair', ...versions, '--status', 'applied', '--linked'], {stdio: 'inherit', env: process.env});
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = {verifiedVersions, ACKNOWLEDGEMENT};
