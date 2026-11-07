// Preservation audit: reads only explicitly listed non-secret project files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const expected = {
  'CONTEXT.md': 'ff688c26746b4a789ff7567129bb7480b0a0e9bc50359df066269295036b5e37',
  'docs/adr/0002-socratic-advisor-first-ai-pedagogy.md': 'c286b2088ac6e3652ae04d040370af3df974bea2bef28ebd44b674a7c72592ed',
  'docs/specs/personalized-discovery-and-def01.md': '0e9a985fbabb385fd1aa632519e51cac5fc7b3aab7f48d0de3c4f1678af2bfe0',
  'docs/mockups/interactive-prototype.html': '44c573e4926c4ab3dc5382ad974bd98327b16435918156d6ccee39c0732d8c91',
  'REVIEW.md': '387653b158f17b41aabffd33b5de4d7fef8e5663d71484b5b9a19a5ba49d3d9d',
  'package.json': 'c7523ab94e199ecf6a12fb3d48ba18a31b5f83ff1b81a3f97db064e29d4134a3',
  'package-lock.json': '68967a151d4c25df26e083a8d30a67e356f06ee659e375209b0311b6678aa801',
};
const files = Object.entries(expected).map(([path, before]) => {
  const after = crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
  assert.equal(after, before, path + ' changed unexpectedly');
  return { path, before, after, preserved: after === before };
});
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
assert.equal(head, '880e3a30a62e5fd61791bb3e7bab4025afdc2a30');
assert.equal(git('diff', '--name-only', '--', 'src', 'tests'), '');
assert.equal(git('ls-files', '--others', '--exclude-standard', '--', 'src', 'tests'), '');
assert.equal(git('diff', '--cached', '--name-only'), '');
assert.equal(fs.existsSync('docs/verification/personalized-discovery/.chromium-profile'), false);
const result = { head, noNewCommit: true, indexEmpty: true, sourceAndTestsUnmodified: true, disposableBrowserProfileRemoved: true, files };
fs.writeFileSync('docs/verification/personalized-discovery/preservation.json', JSON.stringify(result, null, 2));
console.log('PASS: HEAD unchanged, index empty, src/tests untouched, task-owned browser profile removed, all 7 pinned project/document hashes preserved.');
