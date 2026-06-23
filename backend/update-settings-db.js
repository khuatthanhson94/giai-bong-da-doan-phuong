import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'tournament-export.db');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/restore-database';

// New URLs for tournament logos and banners
const newUrls = {
  'union_logo': '/uploads/1782178241659-994083583.png',
  'logo_url': '/uploads/1782178241823-383735380.png',
  'banner_url': '/uploads/1782178242095-963978102.png',
};

async function updateSettingsInDatabase() {
  console.log('🔄 Updating settings in local database...');

  try {
    // Read the database file
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(DB_FILE);

    // Update settings
    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    
    for (const [key, value] of Object.entries(newUrls)) {
      update.run(key, value);
      console.log(`✅ Updated ${key}: ${value}`);
    }

    db.close();
    console.log('✅ Settings updated in local database');

    // Re-export and upload to Render
    console.log('📤 Uploading updated database to Render...');
    
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

updateSettingsInDatabase();
