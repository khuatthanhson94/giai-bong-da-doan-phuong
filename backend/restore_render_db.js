import fetch from 'node-fetch';

async function main() {
  const loginRes = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  console.log('Login result:', loginData);

  if (loginData.token) {
    const restoreRes = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/restore-database', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    const restoreData = await restoreRes.json();
    console.log('Restore result:', restoreData);
  }
}

main().catch(console.error);
