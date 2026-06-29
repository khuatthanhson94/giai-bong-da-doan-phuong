import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'tournament-export.db');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/restore-database';

async function fixTeamNames() {
  console.log('🔧 Fixing corrupted team names in local database...');

  try {
    const db = new DatabaseSync(DB_FILE);

    // Get all teams
    const teams = db.prepare('SELECT id, name, logo FROM teams').all();
    console.log(`Found ${teams.length} teams`);

    // Check for corrupted names (names that look like file paths)
    let fixed = 0;
    for (const team of teams) {
      if (team.name && (team.name.startsWith('/uploads/') || team.name.includes('.png'))) {
        console.log(`⚠️ Team ${team.id} has corrupted name: ${team.name}`);
        
        // Try to find the correct name from the logo field
        if (team.logo && team.logo.startsWith('/uploads/')) {
          // Swap name and logo
          const tempName = team.logo;
          const tempLogo = team.name;
          
          db.prepare('UPDATE teams SET name = ?, logo = ? WHERE id = ?').run(
            tempName, tempLogo, team.id
          );
          console.log(`✅ Fixed team ${team.id}: name=${tempName}, logo=${tempLogo}`);
          fixed++;
        }
      }
    }

    db.close();
    console.log(`✅ Fixed ${fixed} team names`);

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

fixTeamNames();
