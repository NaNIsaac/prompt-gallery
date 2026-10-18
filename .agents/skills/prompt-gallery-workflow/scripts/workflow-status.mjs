import { execFileSync, spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

try {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--workspace', '--expected-branch', '--base-ref'].includes(args[i]) || !args[i + 1] || options[args[i]]) throw new Error('Usage: workflow-status.mjs --workspace PATH --expected-branch BRANCH --base-ref REF');
    options[args[i]] = args[i + 1];
  }
  if (Object.keys(options).length !== 3) throw new Error('workspace, expected-branch and base-ref are required');
  const workspace = realpathSync(resolve(options['--workspace']));
  const git = (...params) => {
    try {
      return execFileSync('git', ['-C', workspace, ...params], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
    } catch (error) {
      throw new Error(`git ${params[0]} failed (exit ${error.status ?? 'unavailable'}): ${String(error.stderr || error.message).trim()}`);
    }
  };
  const top = realpathSync(git('rev-parse', '--show-toplevel'));
  if (top !== workspace) throw new Error('Workspace must be the actual Git worktree root');
  const branch = git('symbolic-ref', '--quiet', '--short', 'HEAD');
  if (branch !== options['--expected-branch']) throw new Error(`Expected branch ${options['--expected-branch']}; actual branch is ${branch}`);
  const baseRef = options['--base-ref'];
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(baseRef)) throw new Error('Use a named base ref or a recorded base commit SHA');
  const baseCommit = git('rev-parse', '--verify', baseRef + '^{commit}');
  const head = git('rev-parse', '--verify', 'HEAD');
  const ancestor = spawnSync('git', ['-C', workspace, 'merge-base', '--is-ancestor', baseCommit, head], { windowsHide: true, encoding: 'utf8' });
  if (ancestor.error || ![0, 1].includes(ancestor.status)) throw new Error(`git merge-base failed (exit ${ancestor.status ?? 'unavailable'}): ${String(ancestor.stderr || ancestor.error?.message || 'Git command did not complete').trim()}`);
  if (ancestor.status === 1) throw new Error('Recorded base commit is not an ancestor of this branch');
  const changes = git('--work-tree=' + workspace, 'status', '--porcelain=v1');
  console.log(JSON.stringify({ workspace, branch, head, baseRef, baseCommit, baseIsAncestor: true, changes: changes ? changes.split(/\r?\n/) : [] }, null, 2));
} catch (error) {
  console.error('Branch verification failed: ' + (error.status ? 'Git command failed; verify the worktree, branch and base ref.' : error.message));
  process.exitCode = 1;
}
