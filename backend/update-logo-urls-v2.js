import fetch from 'node-fetch';

const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/update-settings';

// New URLs from upload response
const newUrls = {
  'union_logo': '/uploads/1782180672133-118239909.png',
  'logo_url': '/uploads/1782180672319-616181058.png',
  'banner_url': '/uploads/1782180672572-845418496.png',
};

async function updateLogoUrls() {
  console.log('🔄 Updating logo and banner URLs...');

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

updateLogoUrls();
