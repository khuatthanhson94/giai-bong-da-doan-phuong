import fetch from 'node-fetch';

async function checkAdminAccess() {
  console.log('🔍 Checking admin panel access...');
  
  try {
    // Test login
    console.log('\n🔑 Testing login...');
    const loginResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
    });

    console.log('Login status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (loginResponse.ok && loginData.token) {
      const token = loginData.token;
      
      // Test /auth/me endpoint
      console.log('\n👤 Testing /auth/me...');
      const meResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('/auth/me status:', meResponse.status);
      const meData = await meResponse.json();
      console.log('/auth/me response:', meData);
      
      // Test admin endpoint
      console.log('\n📊 Testing admin data endpoint...');
      const adminResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('/admin/dashboard status:', adminResponse.status);
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        console.log('/admin/dashboard response:', adminData);
      } else {
        const error = await adminResponse.json();
        console.log('/admin/dashboard error:', error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminAccess();
