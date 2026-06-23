import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Copy database file to current directory for easy access
const sourceDb = path.join(__dirname, 'data', 'tournament.db');
const destDb = path.join(__dirname, 'tournament-export.db');

if (fs.existsSync(sourceDb)) {
  fs.copyFileSync(sourceDb, destDb);
  console.log('✅ Database exported to:', destDb);
  console.log('📁 Upload this file to Render or use it to restore data');
} else {
  console.error('❌ Database file not found at:', sourceDb);
  process.exit(1);
}
