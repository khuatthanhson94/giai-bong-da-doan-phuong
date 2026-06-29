import fetch from 'node-fetch';

const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/settings';

// Map old filenames to new filenames from upload response
const urlMapping = {
  'union_logo': '/uploads/1782178241659-994083583.png',
  'logo_url': '/uploads/1782178241823-383735380.png',
  'banner_url': '/uploads/1782178242095-963978102.png',
};

async function updateSettingsUrls() {
  console.log('🔄 Updating settings image URLs...');

  try {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(urlMapping),
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
    console.error('❌ Error updating settings:', error.message);
  }
}

updateSettingsUrls();
