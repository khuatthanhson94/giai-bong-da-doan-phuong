import fetch from 'node-fetch';

async function checkAll() {
  console.log('🔍 Checking all data from Render backend...');
  
  try {
    // Check home API
    const homeResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/home');
    const home = await homeResponse.json();
    
    console.log('📋 Settings:');
    console.log('  - Tournament name:', home.settings.tournament_name);
    console.log('  - Union logo:', home.settings.union_logo);
    console.log('  - Logo URL:', home.settings.logo_url);
    console.log('  - Banner URL:', home.settings.banner_url);
    console.log('  - Union name:', home.settings.union_name);
    
    console.log('\n📊 Data counts:');
    console.log('  - Standings:', home.standings.length);
    console.log('  - News:', home.news.length);
    console.log('  - Top scorers:', home.topScorers.length);
    
    console.log('\n🖼️ Checking images...');
    const images = [
      home.settings.union_logo,
      home.settings.logo_url,
      home.settings.banner_url,
      ...home.standings.slice(0, 3).map(t => t.logo).filter(Boolean),
    ];
    
    for (const img of images) {
      if (!img) continue;
      const url = `https://giai-bong-da-doan-phuong-backend.onrender.com${img}`;
      const res = await fetch(url);
      console.log(`  - ${img}: ${res.status}`);
    }
    
    console.log('\n✅ All checks completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAll();
