import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/upload';

// Get all PNG files from uploads directory
const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.endsWith('.png'));

async function uploadTeamLogos() {
  console.log('📤 Uploading team logos...');
  console.log(`Found ${files.length} files`);

  let success = 0;
  let failed = 0;
  const urlMap = {};

  for (const file of files) {
    const filePath = path.join(UPLOADS_DIR, file);
    
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));

      const response = await fetch(API_URL, {
        method: 'POST',
        body: form,
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${file} → ${result.url}`);
        urlMap[file] = result.url;
        success++;
      } else {
        console.error(`❌ ${file} failed to upload`);
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${file} error:`, error.message);
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${success} uploaded, ${failed} failed`);
  
  // Save URL mapping for later use
  fs.writeFileSync(
    path.join(__dirname, 'url-map.json'),
    JSON.stringify(urlMap, null, 2)
  );
  console.log('📁 URL mapping saved to url-map.json');
}

uploadTeamLogos();
