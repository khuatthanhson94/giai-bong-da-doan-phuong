import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/upload';

async function uploadImages() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error('❌ Uploads directory not found:', UPLOADS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter(f => f !== '.gitkeep');
  
  if (files.length === 0) {
    console.log('⚠️ No files to upload');
    return;
  }

  console.log(`📤 Found ${files.length} files to upload...`);

  let success = 0;
  let failed = 0;

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
}

uploadImages();
