import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve('backend/tournament-export.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database file not found:', DB_PATH);
  process.exit(1);
}

const fileMapping = {
  '1781592383385-621116224.png': '1782752558543-114959599.png',
  '1781680347038-786449976.png': '1782752558695-511251620.png',
  '1781680349761-80235696.png': '1782752558900-376117706.png',
  '1781682046935-843479376.png': '1782752559214-495009348.png',
  '1781682049334-552418013.png': '1782752559485-441837721.png',
  '1781682173319-723270319.png': '1782752559593-196230559.png',
  '1781682366962-105993763.png': '1782752559699-605798464.png',
  '1781683941535-419085239.png': '1782752559804-70790974.png',
  '1781683949188-504623525.png': '1782752559908-720792197.png',
  '1781850744930-151477054': '1782752560013-146611400',
  '1781850751818-985945685': '1782752560112-641989019',
  '1781850758303-257682062': '1782752560207-751290590',
  '1781850765115-165377211': '1782752560303-946570228',
  '1781850772125-60716795': '1782752560417-750206345',
  '1781850779058-890904994': '1782752560516-133361705',
  '1781852152544-442820025.webp': '1782752560614-250223712.webp',
  '1782013492081-415729777.png': '1782752560714-695583798.png',
  '1782013652963-761787693.png': '1782752560896-640027800.png',
};

console.log('🔄 Opening database:', DB_PATH);
const db = new DatabaseSync(DB_PATH);

// Helper function to update path in table columns
function updateColumn(table, column) {
  const rows = db.prepare(`SELECT id, ${column} FROM ${table} WHERE ${column} IS NOT NULL`).all();
  let updated = 0;
  
  const stmt = db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`);
  
  for (const row of rows) {
    let value = row[column];
    let changed = false;
    
    for (const [oldName, newName] of Object.entries(fileMapping)) {
      if (value.includes(oldName)) {
        value = value.replace(oldName, newName);
        changed = true;
      }
    }
    
    if (changed) {
      stmt.run(value, row.id);
      updated++;
    }
  }
  
  if (updated > 0) {
    console.log(`✅ Updated ${updated} rows in ${table}.${column}`);
  }
}

// Special update function for settings table (uses key instead of id)
function updateSettings() {
  const rows = db.prepare(`SELECT key, value FROM settings WHERE value IS NOT NULL`).all();
  let updated = 0;
  
  const stmt = db.prepare(`UPDATE settings SET value = ? WHERE key = ?`);
  
  for (const row of rows) {
    let value = row.value;
    let changed = false;
    
    for (const [oldName, newName] of Object.entries(fileMapping)) {
      if (value.includes(oldName)) {
        value = value.replace(oldName, newName);
        changed = true;
      }
    }
    
    if (changed) {
      stmt.run(value, row.key);
      updated++;
    }
  }
  
  if (updated > 0) {
    console.log(`✅ Updated ${updated} rows in settings`);
  }
}

try {
  db.exec('BEGIN TRANSACTION');
  updateColumn('teams', 'logo');
  updateColumn('players', 'photo');
  updateColumn('news', 'image');
  updateColumn('gallery', 'image_url');
  updateSettings();
  db.exec('COMMIT');
  console.log('🎉 Database paths updated successfully!');
} catch (e) {
  db.exec('ROLLBACK');
  console.error('❌ Failed to update database paths:', e);
  process.exit(1);
}
