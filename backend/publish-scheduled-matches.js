import fetch from 'node-fetch';

const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/matches';

async function publishScheduledMatches() {
  console.log('🔄 Publishing scheduled matches...');

  try {
    const response = await fetch(API_URL);
    const matches = await response.json();

    const scheduledMatches = matches.filter(m => m.status === 'scheduled');
    console.log(`Found ${scheduledMatches.length} scheduled matches`);

    // Note: This would require admin authentication to actually update
    // For now, we'll just list them
    scheduledMatches.forEach(m => {
      console.log(`- ${m.round}: ${m.team_a?.name} vs ${m.team_b?.name} (${m.match_date})`);
    });

    console.log('\n⚠️ To publish these matches, you need to:');
    console.log('1. Login to admin panel');
    console.log('2. Go to matches page');
    console.log('3. Click publish on each scheduled match');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

publishScheduledMatches();
