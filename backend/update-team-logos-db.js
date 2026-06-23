import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'tournament-export.db');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/restore-database';

// Load URL mapping
const urlMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'url-map.json'), 'utf8'));

async function updateTeamLogosInDatabase() {
  console.log('🔄 Updating team logos in local database...');

  try {
    const db = new DatabaseSync(DB_FILE);

    // Get all teams with logos
    const teams = db.prepare('SELECT id, logo FROM teams WHERE logo IS NOT NULL').all();
    console.log(`Found ${teams.length} teams with logos`);

    let updated = 0;
    for (const team of teams) {
      const oldLogo = team.logo;
      const filename = path.basename(oldLogo);
      
      if (urlMap[filename]) {
        const newLogo = urlMap[filename];
        db.prepare('UPDATE teams SET logo = ? WHERE id = ?').run(newLogo, team.id);
        console.log(`✅ Team ${team.id}: ${oldLogo} → ${newLogo}`);
        updated++;
      }
    }

    db.close();
    console.log(`✅ Updated ${updated} team logos`);

    // Upload to Render
    console.log('📤 Uploading database to Render...');
    
    const form = new FormData();
    form.append('database', fs.createReadStream(DB_FILE));

    const response = await fetch(API_URL, {
      method: 'POST',
      body: form,
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Database restored successfully!');
      console.log('📊 Result:', result);
    } else {
      console.error('❌ Failed to restore database');
      const error = await response.json();
      console.error('Error:', error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateTeamLogosInDatabase();
