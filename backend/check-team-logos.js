import fetch from 'node-fetch';

async function checkTeamLogos() {
  console.log('🔍 Checking team logos from Render backend...');
  
  try {
    const teamsResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams');
    const teams = await teamsResponse.json();
    
    console.log(`Found ${teams.length} teams`);
    
    let success = 0;
    let failed = 0;
    
    for (const team of teams) {
      if (!team.logo) {
        console.log(`⚠️ Team ${team.id} (${team.name}): No logo`);
        continue;
      }
      
      const url = `https://giai-bong-da-doan-phuong-backend.onrender.com${team.logo}`;
      const res = await fetch(url);
      
      if (res.ok) {
        console.log(`✅ Team ${team.id} (${team.name}): ${res.status}`);
        success++;
      } else {
        console.log(`❌ Team ${team.id} (${team.name}): ${res.status}`);
        failed++;
      }
    }
    
    console.log(`\n📊 Summary: ${success} OK, ${failed} failed`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTeamLogos();
