import fetch from 'node-fetch';

let authToken = '';

async function login() {
  console.log('🔑 Logging in...');
  const response = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    }),
  });

  if (response.ok) {
    const data = await response.json();
    authToken = data.token;
    console.log('✅ Login successful');
  } else {
    console.error('❌ Login failed');
    throw new Error('Login failed');
  }
}

async function fixTeamNamesViaAPI() {
  console.log('🔧 Fixing corrupted team names via API...');

  try {
    await login();

    // Get all teams
    const teamsResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    
    const teams = await teamsResponse.json();
    console.log(`Found ${teams.length} teams`);

    // Check for corrupted names (names that look like file paths)
    let fixed = 0;
    for (const team of teams) {
      if (team.name && (team.name.startsWith('/uploads/') || team.name.includes('.png'))) {
        console.log(`⚠️ Team ${team.id} has corrupted name: ${team.name}`);
        
        // Try to find the correct name from the logo field
        if (team.logo && team.logo.startsWith('/uploads/')) {
          // Swap name and logo
          const tempName = team.logo;
          const tempLogo = team.name;
          
          const updateResponse = await fetch(`https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams/${team.id}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
              name: tempName,
              logo: tempLogo,
              jersey_color: team.jersey_color,
              description: team.description,
              image: team.image
            }),
          });

          if (updateResponse.ok) {
            console.log(`✅ Fixed team ${team.id}: name=${tempName}, logo=${tempLogo}`);
            fixed++;
          } else {
            console.error(`❌ Failed to fix team ${team.id}`);
          }
        }
      }
    }

    console.log(`✅ Fixed ${fixed} team names`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixTeamNamesViaAPI();
