import fetch from 'node-fetch';

async function checkRenderTeams() {
  console.log('🔍 Checking Render database teams...');
  
  try {
    const teamsResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams');
    const teams = await teamsResponse.json();

    console.log(`Found ${teams.length} teams`);
    for (const team of teams) {
      console.log(`  Team ${team.id}: name="${team.name}", logo="${team.logo}"`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRenderTeams();
