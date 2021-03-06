const { GitProcess } = require('dugite');
const fs = require('fs');
const path = require('path');

const ELECTRON_DIR = path.resolve(__dirname, '..', '..');
const SRC_DIR = path.resolve(ELECTRON_DIR, '..');

require('colors');
const pass = '✓'.green;
const fail = '✗'.red;

function getElectronExec () {
  const OUT_DIR = getOutDir();
  switch (process.platform) {
    case 'darwin':
      return `out/${OUT_DIR}/Electron.app/Contents/MacOS/Electron`;
    case 'win32':
      return `out/${OUT_DIR}/electron.exe`;
    case 'linux':
      return `out/${OUT_DIR}/electron`;
    default:
      throw new Error('Unknown platform');
  }
}

function getOutDir (shouldLog) {
  if (process.env.ELECTRON_OUT_DIR) {
    return process.env.ELECTRON_OUT_DIR;
  } else {
    for (const buildType of ['Testing', 'Release', 'Default']) {
      const outPath = path.resolve(SRC_DIR, 'out', buildType);
      if (fs.existsSync(outPath)) {
        if (shouldLog) console.log(`OUT_DIR is: ${buildType}`);
        return buildType;
      }
    }
  }
}

function getAbsoluteElectronExec () {
  return path.resolve(SRC_DIR, getElectronExec());
}

async function handleGitCall (args, gitDir) {
  const details = await GitProcess.exec(args, gitDir);
  if (details.exitCode === 0) {
    return details.stdout.replace(/^\*|\s+|\s+$/, '');
  } else {
    const error = GitProcess.parseError(details.stderr);
    console.log(`${fail} couldn't parse git process call: `, error);
    process.exit(1);
  }
}

async function getCurrentBranch (gitDir) {
  let branch = await handleGitCall(['rev-parse', '--abbrev-ref', 'HEAD'], gitDir);
  if (branch !== 'master' && !branch.match(/[0-9]+-[0-9]+-x$/) && !branch.match(/[0-9]+-x-y$/)) {
    const lastCommit = await handleGitCall(['rev-parse', 'HEAD'], gitDir);
    const branches = (await handleGitCall([
      'branch',
      '--contains',
      lastCommit,
      '--remote'
    ], gitDir)).split('\n');

    branch = branches.filter(b => b.trim() === 'master' || b.trim().match(/[0-9]+-[0-9]+-x$/) || b.trim().match(/[0-9]+-x-y$/))[0];
    if (!branch) {
      console.log(`${fail} no release branch exists for this ref`);
      process.exit(1);
    }
    if (branch.startsWith('origin/')) branch = branch.substr('origin/'.length);
  }
  return branch.trim();
}

module.exports = {
  getCurrentBranch,
  getElectronExec,
  getOutDir,
  getAbsoluteElectronExec,
  ELECTRON_DIR,
  SRC_DIR
};
