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

// Correct team names based on local database
const correctNames = {
  21: 'CLB Thể thao 26/3a',
  79: 'Thanh niên Phường A',
  80: 'Liên chi ĐH Kinh tế',
  85: 'Thanh niên Phường A',
  86: 'Liên chi ĐH Kinh tế',
  93: 'CLB Thể thao 26/3',
  95: 'FC Thanh Xuân',
};

async function fixCorruptedTeams() {
  console.log('🔧 Fixing corrupted team names via API...');

  try {
    await login();

    // Get all teams
    const teamsResponse = await fetch('https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    
    const teams = await teamsResponse.json();
    console.log(`Found ${teams.length} teams`);

    // Fix teams with corrupted names
    let fixed = 0;
    for (const team of teams) {
      if (correctNames[team.id] && team.name !== correctNames[team.id]) {
        console.log(`⚠️ Team ${team.id}: name="${team.name}" should be "${correctNames[team.id]}"`);
        
        const updateResponse = await fetch(`https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams/${team.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ 
            name: correctNames[team.id],
            logo: team.logo,
            jersey_color: team.jersey_color,
            description: team.description,
            image: team.image
          }),
        });

        if (updateResponse.ok) {
          console.log(`✅ Fixed team ${team.id}: name="${correctNames[team.id]}"`);
          fixed++;
        } else {
          console.error(`❌ Failed to fix team ${team.id}`);
          const error = await updateResponse.json();
          console.error('Error:', error);
        }
      }
    }

    console.log(`✅ Fixed ${fixed} team names`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixCorruptedTeams();
