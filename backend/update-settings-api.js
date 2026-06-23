import fetch from 'node-fetch';

const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/settings';
const LOGIN_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/auth/login';

// New URLs for tournament logos and banners
const newUrls = {
  'union_logo': '/uploads/1782178241659-994083583.png',
  'logo_url': '/uploads/1782178241823-383735380.png',
  'banner_url': '/uploads/1782178242095-963978102.png',
};

async function updateSettingsViaAPI() {
  console.log('🔄 Logging in to get auth token...');

  try {
    // Login to get token
    const loginResponse = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Update settings
    console.log('🔄 Updating settings...');
    const updateResponse = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(newUrls),
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('✅ Settings updated successfully!');
      console.log('📊 Result:', result);
    } else {
      console.error('❌ Failed to update settings');
      const error = await updateResponse.json();
      console.error('Error:', error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateSettingsViaAPI();
