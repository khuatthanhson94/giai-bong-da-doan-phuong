import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Searching all git commits for all SQLite db files...');

try {
  const commits = execSync('git log --format="%H %s"').toString().split('\n').filter(Boolean);
  console.log(`Found ${commits.length} commits in history.`);

  for (const c of commits.slice(0, 30)) {
    const [hash, ...msgParts] = c.split(' ');
    const msg = msgParts.join(' ');

    const files = execSync(`git ls-tree -r ${hash} --name-only`).toString().split('\n');
    const dbFiles = files.filter(f => f.endsWith('.db'));

    if (dbFiles.length > 0) {
      console.log(`\n📌 Commit ${hash.slice(0, 7)}: "${msg}"`);
      for (const f of dbFiles) {
        try {
          const outPath = `./data/git_${hash.slice(0, 7)}_${path.basename(f)}`;
          execSync(`git show ${hash}:${f} > ${outPath}`);
          const stat = fs.statSync(outPath);
          console.log(`  - File: ${f} (${stat.size} bytes) -> saved to ${outPath}`);
        } catch (e) {}
      }
    }
  }
} catch (e) {
  console.error(e);
}
