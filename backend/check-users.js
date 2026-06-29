import fetch from 'node-fetch';

async function checkUsers() {
  console.log('🔍 Checking users in database...');
  
  try {
    // Try to access a public endpoint first
    const healthResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/health');
    console.log('✅ Health check:', await healthResponse.json());
    
    // Try to access teams endpoint
    const teamsResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams');
    const teams = await teamsResponse.json();
    console.log(`✅ Teams count: ${teams.length}`);
    
    // Try to access auth endpoint with POST
    const loginResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
    });
    
    console.log('🔑 Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('🔑 Login response:', loginData);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();
