import fetch from 'node-fetch';

async function verifyFrontendData() {
  console.log('🔍 Verifying all data that frontend needs...');
  
  try {
    // Check /api/home - main endpoint for homepage
    console.log('\n📋 Checking /api/home...');
    const homeResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/home');
    const home = await homeResponse.json();
    
    console.log('✅ Settings:');
    console.log('  - Tournament name:', home.settings.tournament_name);
    console.log('  - Union logo:', home.settings.union_logo ? '✓' : '✗');
    console.log('  - Logo URL:', home.settings.logo_url ? '✓' : '✗');
    console.log('  - Banner URL:', home.settings.banner_url ? '✓' : '✗');
    console.log('  - Union name:', home.settings.union_name);
    
    console.log('\n✅ Data counts:');
    console.log('  - Latest match:', home.latestMatch ? '✓' : '✗');
    console.log('  - Upcoming matches:', home.upcomingMatches.length);
    console.log('  - News:', home.news.length);
    console.log('  - Standings:', home.standings.length);
    console.log('  - Top scorers:', home.topScorers.length);
    
    // Check if images are accessible
    console.log('\n🖼️ Checking image accessibility...');
    const imagesToCheck = [
      home.settings.union_logo,
      home.settings.logo_url,
      home.settings.banner_url,
    ];
    
    for (const img of imagesToCheck) {
      if (!img) continue;
      const url = `https://giai-bong-da-doan-phuong-backend.onrender.com${img}`;
      const res = await fetch(url);
      console.log(`  - ${img}: ${res.status === 200 ? '✓' : '✗'}`);
    }
    
    // Check team logos in standings
    console.log('\n👥 Checking team logos in standings...');
    for (const team of home.standings.slice(0, 5)) {
      if (!team.logo) continue;
      const url = `https://giai-bong-da-doan-phuong-backend.onrender.com${team.logo}`;
      const res = await fetch(url);
      console.log(`  - ${team.name}: ${res.status === 200 ? '✓' : '✗'}`);
    }
    
    console.log('\n✅ All checks completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyFrontendData();
