import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'tournament-export.db');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/restore-database';

// Load both URL mappings
const urlMap1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'url-map.json'), 'utf8'));
const urlMap2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'url-map-v2.json'), 'utf8'));
const urlMap = { ...urlMap1, ...urlMap2 };

async function updateFinalLogosInDatabase() {
  console.log('🔄 Updating all logos in local database...');

  try {
    const db = new DatabaseSync(DB_FILE);

    // Update tournament logos in settings
    const settings = db.prepare('SELECT key, value FROM settings').all();
    
    for (const setting of settings) {
      if (setting.key === 'union_logo' || setting.key === 'logo_url' || setting.key === 'banner_url') {
        const oldLogo = setting.value;
        const filename = path.basename(oldLogo);
        
        if (urlMap[filename]) {
          const newLogo = urlMap[filename];
          db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(newLogo, setting.key);
          console.log(`✅ Setting ${setting.key}: ${oldLogo} → ${newLogo}`);
        }
      }
    }

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

    // Get all players with photos
    const players = db.prepare('SELECT id, photo FROM players WHERE photo IS NOT NULL').all();
    console.log(`Found ${players.length} players with photos`);

    for (const player of players) {
      const oldPhoto = player.photo;
      const filename = path.basename(oldPhoto);
      
      if (urlMap[filename]) {
        const newPhoto = urlMap[filename];
        db.prepare('UPDATE players SET photo = ? WHERE id = ?').run(newPhoto, player.id);
        console.log(`✅ Player ${player.id}: ${oldPhoto} → ${newPhoto}`);
        updated++;
      }
    }

    db.close();
    console.log(`✅ Updated ${updated} total logos/photos`);

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

updateFinalLogosInDatabase();
