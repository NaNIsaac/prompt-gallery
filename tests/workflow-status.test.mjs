import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gate = fileURLToPath(new URL('../.agents/skills/prompt-gallery-workflow/scripts/workflow-status.mjs', import.meta.url));
function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), 'prompt-gallery-workflow-'));
  const git = (...args) => execFileSync('git', ['-C', directory, '-c', 'core.hooksPath=' + join(directory, 'empty-hooks'), ...args], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git('init', '-b', 'main');
    writeFileSync(join(directory, 'base.txt'), 'base\n');
    git('add', 'base.txt');
    git('-c', 'user.name=Workflow Test', '-c', 'user.email=workflow-test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'Fixture base');
    const base = git('rev-parse', 'HEAD');
    git('switch', '-c', 'codex/topic');
    return run({ directory, git, base });
  } finally {
    const target = realpathSync(directory);
    assert.equal(dirname(target), realpathSync(tmpdir()));
    assert(basename(target).startsWith('prompt-gallery-workflow-'));
    rmSync(target, { recursive: true });
  }
}
const invoke = (workspace, branch = 'codex/topic') => spawnSync(process.execPath, [gate, '--workspace', workspace, '--expected-branch', branch, '--base-ref', 'main'], { encoding: 'utf8', windowsHide: true });

test('workflow evidence reports the actual branch, root and base without discarding work', () => fixture(({ directory, git, base }) => {
  writeFileSync(join(directory, 'unfinished.txt'), 'keep me\n');
  const before = git('status', '--porcelain');
  const result = invoke(directory);
  assert.equal(result.status, 0, result.stderr);
  const snapshot = JSON.parse(result.stdout);
  assert.equal(resolve(snapshot.workspace), realpathSync(directory));
  assert.equal(snapshot.branch, 'codex/topic');
  assert.equal(snapshot.head, base);
  assert.equal(snapshot.baseCommit, base);
  assert.equal(snapshot.baseIsAncestor, true);
  assert(snapshot.changes.some(line => line.includes('unfinished.txt')));
  assert.equal(git('status', '--porcelain'), before);
}));

test('workflow evidence rejects the wrong branch without switching branches', () => fixture(({ directory, git }) => {
  const result = invoke(directory, 'codex/another-task');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected branch/);
  assert.equal(result.stdout, '');
  assert.equal(git('branch', '--show-current'), 'codex/topic');
}));

test('workflow evidence rejects a nested folder posing as a separate worktree', () => fixture(({ directory, git }) => {
  const nested = join(directory, 'nested');
  mkdirSync(nested);
  const result = invoke(nested);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /actual Git worktree root/);
  assert.equal(result.stdout, '');
  assert.equal(git('branch', '--show-current'), 'codex/topic');
}));

test('workflow evidence rejects a base commit absent from the actual work branch', () => fixture(({ directory, git }) => {
  git('switch', 'main');
  writeFileSync(join(directory, 'new-base.txt'), 'new base\n');
  git('add', 'new-base.txt');
  git('-c', 'user.name=Workflow Test', '-c', 'user.email=workflow-test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'New base');
  git('switch', 'codex/topic');
  const result = invoke(directory);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not an ancestor/);
  assert.equal(result.stdout, '');
  assert.equal(git('branch', '--show-current'), 'codex/topic');
}));

test('workflow evidence reports which local Git check failed for a detached HEAD', () => fixture(({ directory, git }) => {
  git('switch', '--detach', 'HEAD');
  const result = invoke(directory);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /git symbolic-ref failed/);
  assert.equal(result.stdout, '');
  assert.equal(git('rev-parse', '--abbrev-ref', 'HEAD'), 'HEAD');
}));
