import fetch from 'node-fetch';

async function checkDatabase() {
  console.log('🔍 Checking database contents...');
  
  try {
    // Check settings
    const settingsResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/settings');
    const settings = await settingsResponse.json();
    console.log('📋 Settings:', JSON.stringify(settings, null, 2));
    
    // Check teams
    const teamsResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams');
    const teams = await teamsResponse.json();
    console.log(`👥 Teams count: ${teams.length}`);
    
    // Check matches
    const matchesResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/matches');
    const matches = await matchesResponse.json();
    console.log(`⚽ Matches count: ${matches.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();
