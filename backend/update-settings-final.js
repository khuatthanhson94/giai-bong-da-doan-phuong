import fetch from 'node-fetch';

const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/update-settings';

// New URLs for tournament logos and banners
const newUrls = {
  'union_logo': '/uploads/1782178241659-994083583.png',
  'logo_url': '/uploads/1782178241823-383735380.png',
  'banner_url': '/uploads/1782178242095-963978102.png',
};

async function updateSettings() {
  console.log('🔄 Updating settings with new image URLs...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUrls),
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
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateSettings();
