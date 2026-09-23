const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Build without touching locked standalone dir
console.log('Building to .tmp_build...');
execSync('npx next build --webpack', { 
  stdio: 'inherit',
  env: { ...process.env, NEXT_DIST_DIR: '.tmp_build' }
});

// Deploy standalone from temp
const tmpBuild = path.resolve('.tmp_build');
const deployTarget = path.resolve('.next/standalone');

console.log('Deploying from', tmpBuild, 'to', deployTarget);

// Remove old if possible
try { fs.rmSync(deployTarget + '_old', { recursive: true, force: true }); } catch {}
try { fs.renameSync(deployTarget, deployTarget + '_old'); } catch { console.log('Could not rename old deploy'); }

// Copy new
fs.cpSync(path.join(tmpBuild, 'standalone'), deployTarget, { recursive: true });

// Add required files
fs.cpSync('.data/mission-control.db', path.join(deployTarget, '.data/mission-control.db'));
fs.writeFileSync(path.join(deployTarget, '.env'), fs.readFileSync('.env'));

console.log('Deploy complete!');
