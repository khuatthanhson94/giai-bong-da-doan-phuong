import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/upload';

// Files that need to be uploaded (tournament logos and banners)
const filesToUpload = [
  '1782013492081-415729777.png', // union_logo
  '1782013652963-761787693.png', // logo_url
  '1781680349761-80235696.png', // banner_url
];

async function uploadLogos() {
  console.log('📤 Uploading tournament logos and banners...');

  let success = 0;
  let failed = 0;

  for (const file of filesToUpload) {
    const filePath = path.join(UPLOADS_DIR, file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${file}`);
      failed++;
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

uploadLogos();
