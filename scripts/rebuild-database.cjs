const {spawnSync} = require('node:child_process');
const REBUILD_CONFIRMATION = 'REBUILD APPLICATION DATABASE';
function rebuildArguments(eventName, confirmation) {
  if (eventName !== 'workflow_dispatch') throw new Error('Database rebuild is manual-only.');
  if (confirmation !== REBUILD_CONFIRMATION) throw new Error(`Type ${REBUILD_CONFIRMATION} to confirm deletion of existing application database objects/data.`);
  return ['db', 'reset', '--linked', '--no-seed', '--yes'];
}
if (require.main === module) {
  try {
    const args = rebuildArguments(process.env.GITHUB_EVENT_NAME, process.env.REPAIR_CONFIRMATION);
    const result = spawnSync('supabase', args, {stdio: 'inherit', env: process.env});
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
module.exports = {rebuildArguments, REBUILD_CONFIRMATION};
