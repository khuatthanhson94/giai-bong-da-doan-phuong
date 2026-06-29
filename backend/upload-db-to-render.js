import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const DB_FILE = './tournament-export.db';
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/restore-database';

async function uploadDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ Database file not found:', DB_FILE);
    process.exit(1);
  }

  console.log('📤 Uploading database to Render...');

  const form = new FormData();
  form.append('database', fs.createReadStream(DB_FILE));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: form,
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Database restored successfully!');
      console.log('📊 Result:', result);
    } else {
      console.error('❌ Failed to restore database:', result);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error uploading database:', error.message);
    process.exit(1);
  }
}

uploadDatabase();
