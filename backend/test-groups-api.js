import fetch from 'node-fetch';

async function testGroupsAPI() {
  console.log('🔍 Testing /api/groups endpoint...');
  
  try {
    const response = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/groups');
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Groups data:', data);
    } else {
      console.log('❌ Request failed');
      const text = await response.text();
      console.log('Response:', text.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGroupsAPI();
