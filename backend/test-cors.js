import fetch from 'node-fetch';

async function testCORS() {
  console.log('🔍 Testing CORS from browser-like request...');
  
  try {
    // Test with origin header (simulating browser)
    const response = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/home', {
      headers: {
        'Origin': 'https://giai-bong-da-doan-phuong-tung-thien.vercel.app',
        'Referer': 'https://giai-bong-da-doan-phuong-tung-thien.vercel.app/',
      },
    });

    console.log('Status:', response.status);
    console.log('CORS headers:');
    console.log('  - Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
    console.log('  - Access-Control-Allow-Credentials:', response.headers.get('access-control-allow-credentials'));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Data received:', data.settings.tournament_name);
    } else {
      console.log('❌ Request failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCORS();
