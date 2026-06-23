import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api';

// Map old filenames to new filenames from upload response
const fileMapping = {
  '1781592383385-621116224.png': '1782175980861-56746462.png',
  '1781680347038-786449976.png': '1782175981073-733374992.png',
  '1781680349761-80235696.png': '1782175981504-892876425.png',
  '1781682046935-843479376.png': '1782175982151-471267361.png',
  '1781682049334-552418013.png': '1782175982570-58826277.png',
  '1781682173319-723270319.png': '1782175982656-17679149.png',
  '1781682366962-105993763.png': '1782175982735-591050340.png',
  '1781683941535-419085239.png': '1782175982823-754985252.png',
  '1781683949188-504623525.png': '1782175982908-668502210.png',
  '1781850744930-151477054': '1782175982989-84853232',
  '1781850751818-985945685': '1782175983059-839892079',
  '1781850758303-257682062': '1782175983132-298297472',
  '1781850765115-165377211': '1782175983216-34940192',
  '1781850772125-60716795': '1782175983292-370455158',
  '1781850779058-890904994': '1782175983370-277522572',
  '1781852152544-442820025.webp': '1782175983458-922631736.webp',
  '1782013492081-415729777.png': '1782175983555-560649174.png',
  '1782013652963-761787693.png': '1782175983708-754846172.png',
};

async function updateImageUrls() {
  console.log('🔄 Updating image URLs in database...');

  try {
    // Get all teams
    const teamsResponse = await fetch(`${API_URL}/teams`);
    const teams = await teamsResponse.json();

    let updated = 0;

    for (const team of teams) {
      if (team.logo) {
        const oldFilename = path.basename(team.logo);
        const newFilename = fileMapping[oldFilename];

        if (newFilename) {
          const newLogoUrl = `/uploads/${newFilename}`;
          
          // Update team logo
          await fetch(`${API_URL}/teams/${team.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logo: newLogoUrl }),
          });

          console.log(`✅ Updated ${team.name}: ${oldFilename} → ${newFilename}`);
          updated++;
        }
      }
    }

    console.log(`\n📊 Updated ${updated} team logos`);
  } catch (error) {
    console.error('❌ Error updating image URLs:', error.message);
    process.exit(1);
  }
}

updateImageUrls();
