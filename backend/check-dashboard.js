import fetch from 'node-fetch';

async function checkDashboard() {
  console.log('🔍 Checking dashboard endpoint...');
  
  try {
    // Login first
    const loginResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/auth/login', {
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

    const { token } = await loginResponse.json();
    
    // Test /api/dashboard
    console.log('\n📊 Testing /api/dashboard...');
    const dashboardResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    console.log('Status:', dashboardResponse.status);
    const contentType = dashboardResponse.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (contentType?.includes('application/json')) {
      const data = await dashboardResponse.json();
      console.log('✅ Dashboard data:', data);
    } else {
      const text = await dashboardResponse.text();
      console.log('❌ Response is not JSON:', text.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDashboard();
