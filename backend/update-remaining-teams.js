import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'tournament-export.db');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/upload';

let authToken = '';

async function login() {
  console.log('🔑 Logging in...');
  const response = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    }),
  });

  if (response.ok) {
    const data = await response.json();
    authToken = data.token;
    console.log('✅ Login successful');
  } else {
    console.error('❌ Login failed');
    throw new Error('Login failed');
  }
}

async function uploadRemainingTeamLogos() {
  console.log('🔄 Updating remaining team logos...');

  try {
    await login();

    const db = new DatabaseSync(DB_FILE);
    const teams = db.prepare('SELECT id, logo FROM teams WHERE logo IS NOT NULL').all();
    db.close();

    console.log(`Found ${teams.length} teams with logos`);

    let updated = 0;
    for (const team of teams) {
      const oldLogo = team.logo;
      const filename = path.basename(oldLogo);
      const filePath = path.join(UPLOADS_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ File not found: ${filename}`);
        continue;
      }

      // Upload the file
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));

      const uploadResponse = await fetch(API_URL, {
        method: 'POST',
        body: form,
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        const newLogo = uploadResult.url;

        // Update team logo via API with auth
        const updateResponse = await fetch(`https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams/${team.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ 
            name: team.logo, // Will be replaced with actual name from DB
            logo: newLogo 
          }),
        });

        if (updateResponse.ok) {
          console.log(`✅ Team ${team.id}: ${oldLogo} → ${newLogo}`);
          updated++;
        } else {
          console.error(`❌ Team ${team.id} failed to update logo`);
        }
      } else {
        console.error(`❌ Team ${team.id} failed to upload file`);
      }
    }

    console.log(`✅ Updated ${updated} team logos`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

uploadRemainingTeamLogos();
