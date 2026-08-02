import { execSync } from 'child_process';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const commits = [
  'cd90928', '17cc3ff', '8a954b5', '243f1cc', 'ca06664', 'c09c75e', 
  '4e851b1', '08f0e68', '2911880', '28b00d6', 'e8a2dee', 'd1c0e46',
  '395f633', 'ec27db9', '5d10c01', '6b403b2', '1a8bb77', '411bc5b',
  '818d147', 'e17387e', 'afe7fdb'
];

for (const commit of commits) {
  try {
    const showCmd = `git show ${commit}:data/tournament.db`;
    const buf = execSync(showCmd, { maxBuffer: 10 * 1024 * 1024 });
    const tmpFile = `./data/tmp_commit_${commit}.db`;
    fs.writeFileSync(tmpFile, buf);
    const db = new DatabaseSync(tmpFile);
    const teams = db.prepare('SELECT count(*) as c FROM teams').get().c;
    const matches = db.prepare('SELECT count(*) as c FROM matches').get().c;
    const finished = db.prepare("SELECT count(*) as c FROM matches WHERE status = 'finished'").get().c;
    console.log(`Commit ${commit}: Teams=${teams}, Matches=${matches}, Finished=${finished}`);
    if (teams >= 10 || teams === 12) {
      const teamList = db.prepare('SELECT name FROM teams').all().map(t => t.name);
      console.log(`   --> FOUND COMMIT WITH ${teams} TEAMS:`, teamList);
    }
  } catch (e) {
    // DB might not exist in that commit
  }
}
