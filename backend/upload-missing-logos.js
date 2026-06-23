import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/upload';
const DB_FILE = path.join(__dirname, 'tournament-export.db');

async function uploadMissingLogos() {
  console.log('📤 Uploading missing team logos...');

  try {
    const db = new DatabaseSync(DB_FILE);
    const teams = db.prepare('SELECT id, logo FROM teams WHERE logo IS NOT NULL').all();
    db.close();

    let success = 0;
    let failed = 0;
    const urlMap = {};

    for (const team of teams) {
      const logoPath = team.logo;
      const filename = path.basename(logoPath);
      const filePath = path.join(UPLOADS_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ File not found: ${filename}`);
        continue;
      }

      try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        const response = await fetch(API_URL, {
          method: 'POST',
          body: form,
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Team ${team.id} (${filename}) → ${result.url}`);
          urlMap[filename] = result.url;
          success++;
        } else {
          console.error(`❌ Team ${team.id} (${filename}) failed to upload`);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Team ${team.id} (${filename}) error:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Summary: ${success} uploaded, ${failed} failed`);
    
    // Save URL mapping
    fs.writeFileSync(
      path.join(__dirname, 'url-map-v2.json'),
      JSON.stringify(urlMap, null, 2)
    );
    console.log('📁 URL mapping saved to url-map-v2.json');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

uploadMissingLogos();
