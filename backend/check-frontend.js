import fetch from 'node-fetch';

async function checkFrontendAPI() {
  console.log('🔍 Checking if frontend can access Render backend...');
  
  try {
    // Check if frontend is calling the correct API
    const homeResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/home');
    const homeData = await homeResponse.json();
    
    console.log('📋 Settings from /api/home:');
    console.log('  - Tournament name:', homeData.settings.tournament_name);
    console.log('  - Union logo:', homeData.settings.union_logo);
    console.log('  - Logo URL:', homeData.settings.logo_url);
    console.log('  - Banner URL:', homeData.settings.banner_url);
    console.log('  - Teams count:', homeData.standings.length);
    console.log('  - News count:', homeData.news.length);
    
    // Check if images are accessible
    const logoUrl = homeData.settings.logo_url;
    if (logoUrl) {
      const fullLogoUrl = `https://giai-bong-da-doan-phuong-backend.onrender.com${logoUrl}`;
      console.log(`\n🖼️ Checking logo: ${fullLogoUrl}`);
      const logoResponse = await fetch(fullLogoUrl);
      console.log(`  - Status: ${logoResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkFrontendAPI();
