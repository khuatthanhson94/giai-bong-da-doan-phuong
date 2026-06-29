import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'tournament-export.db');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/update-settings';

// Load URL mapping
const urlMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'url-map-complete.json'), 'utf8'));

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

async function updateAllViaAPI() {
  console.log('🔄 Updating all image URLs via API...');

  try {
    await login();

    const db = new DatabaseSync(DB_FILE);

    // Get current settings
    const settings = db.prepare('SELECT key, value FROM settings').all();
    const settingsToUpdate = {};
    
    for (const setting of settings) {
      if (setting.key === 'union_logo' || setting.key === 'logo_url' || setting.key === 'banner_url') {
        const oldLogo = setting.value;
        const filename = path.basename(oldLogo);
        
        if (urlMap[filename]) {
          const newLogo = urlMap[filename];
          settingsToUpdate[setting.key] = newLogo;
          console.log(`✅ Setting ${setting.key}: ${oldLogo} → ${newLogo}`);
        }
      }
    }

    // Update settings via API
    if (Object.keys(settingsToUpdate).length > 0) {
      console.log('📤 Updating settings via API...');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToUpdate),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Settings updated successfully!');
        console.log('📊 Result:', result);
      } else {
        console.error('❌ Failed to update settings');
        const error = await response.json();
        console.error('Error:', error);
      }
    }

    // Get all teams with logos
    const teams = db.prepare('SELECT id, logo FROM teams WHERE logo IS NOT NULL').all();
    console.log(`\nFound ${teams.length} teams with logos`);

    let updated = 0;
    for (const team of teams) {
      const oldLogo = team.logo;
      const filename = path.basename(oldLogo);
      
      if (urlMap[filename]) {
        const newLogo = urlMap[filename];
        // Update team logo via API with auth
        const updateResponse = await fetch(`https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams/${team.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ 
            name: db.prepare('SELECT name FROM teams WHERE id = ?').get(team.id).name,
            logo: newLogo 
          }),
        });

        if (updateResponse.ok) {
          console.log(`✅ Team ${team.id}: ${oldLogo} → ${newLogo}`);
          updated++;
        } else {
          console.error(`❌ Team ${team.id} failed to update`);
          const error = await updateResponse.json();
          console.error('Error:', error);
        }
      }
    }

    console.log(`✅ Updated ${updated} team logos`);

    db.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateAllViaAPI();
