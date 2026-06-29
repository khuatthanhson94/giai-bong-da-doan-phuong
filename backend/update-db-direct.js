import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'tournament-export.db');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/restore-database';

// All settings from localhost
const allSettings = {
  'num_teams': '12',
  'num_groups': '4',
  'tournament_name': 'Giải Bóng đá Thiếu niên Đoàn phường Tùng Thiện năm 2026',
  'slogan': 'Đoàn kết - Kỷ luật - Sáng tạo - Thành công',
  'banner': '',
  'union_logo': '/uploads/1782178241659-994083583.png',
  'contact_phone': '0965298683',
  'contact_email': 'doanphuongtungthien@gmail.com',
  'contact_address': 'Sân bóng KĐT Tái định cư Trung Hưng',
  'about': 'Giải bóng đá Thanh niên do Đoàn phường Tùng Thiện tổ chức nhằm tạo sân chơi lành mạnh, rèn luyện thể chất và tinh thần đoàn kết cho thanh niên trên địa bàn phường.',
  'livestream_url': '',
  'logo_url': '/uploads/1782178241823-383735380.png',
  'banner_url': '/uploads/1782178242095-963978102.png',
  'union_name': 'Đoàn phường Tùng Thiện',
  'tournament_name_short': 'Giải Bóng đá Thiếu niên',
};

async function updateDatabaseDirectly() {
  console.log('🔄 Updating database directly...');

  try {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(DB_FILE);

    // Delete all existing settings
    db.prepare('DELETE FROM settings').run();
    console.log('✅ Cleared existing settings');

    // Insert new settings
    const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    
    for (const [key, value] of Object.entries(allSettings)) {
      insert.run(key, value);
      console.log(`✅ Inserted ${key}: ${value}`);
    }

    db.close();
    console.log('✅ Settings updated in local database');

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

updateDatabaseDirectly();
