import fetch from 'node-fetch';

async function checkFrontendAPI() {
  console.log('🔍 Checking frontend API endpoints...');
  
  try {
    // Check /api/home
    console.log('\n📋 Checking /api/home...');
    const homeResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/home');
    console.log('Status:', homeResponse.status);
    if (homeResponse.ok) {
      const home = await homeResponse.json();
      console.log('✅ /api/home works');
      console.log('  - Settings:', home.settings.tournament_name);
      console.log('  - Standings:', home.standings.length);
      console.log('  - News:', home.news.length);
      console.log('  - Upcoming matches:', home.upcomingMatches.length);
    } else {
      console.log('❌ /api/home failed');
    }

    // Check /api/settings
    console.log('\n⚙️ Checking /api/settings...');
    const settingsResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/settings');
    console.log('Status:', settingsResponse.status);
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('✅ /api/settings works');
      console.log('  - Tournament name:', settings.tournament_name);
      console.log('  - Union logo:', settings.union_logo ? '✓' : '✗');
      console.log('  - Logo URL:', settings.logo_url ? '✓' : '✗');
      console.log('  - Banner URL:', settings.banner_url ? '✓' : '✗');
    } else {
      console.log('❌ /api/settings failed');
    }

    // Check /api/standings
    console.log('\n📊 Checking /api/standings...');
    const standingsResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/standings');
    console.log('Status:', standingsResponse.status);
    if (standingsResponse.ok) {
      const standings = await standingsResponse.json();
      console.log('✅ /api/standings works');
      console.log('  - Count:', standings.length);
    } else {
      console.log('❌ /api/standings failed');
    }

    // Check /api/matches
    console.log('\n⚽ Checking /api/matches...');
    const matchesResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/matches');
    console.log('Status:', matchesResponse.status);
    if (matchesResponse.ok) {
      const matches = await matchesResponse.json();
      console.log('✅ /api/matches works');
      console.log('  - Count:', matches.length);
    } else {
      console.log('❌ /api/matches failed');
    }

    // Check /api/news
    console.log('\n📰 Checking /api/news...');
    const newsResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/news');
    console.log('Status:', newsResponse.status);
    if (newsResponse.ok) {
      const news = await newsResponse.json();
      console.log('✅ /api/news works');
      console.log('  - Count:', news.length);
    } else {
      console.log('❌ /api/news failed');
    }

    console.log('\n✅ All frontend API checks completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkFrontendAPI();
