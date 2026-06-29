import fetch from 'node-fetch';

const API_URL = 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/admin/update-settings';

// All settings from localhost
const allSettings = {
  'num_teams': '12',
  'num_groups': '4',
  'tournament_name': 'Giải Bóng đá Thiếu niên Đoàn phường Tùng Thiện năm 2026',
  'slogan': 'Đoàn kết - Kỷ luật - Sáng tạo - Thành công',
  'banner': '',
  'union_logo': '/uploads/1782178241659-994083583.png',
  'contact_phone': '0965298683',
  'contact_email': 'doanphuongtungthien@gmail.com',
  'contact_address': 'Sân bóng KĐT Tái định cư Trung Hưng',
  'about': 'Giải bóng đá Thanh niên do Đoàn phường Tùng Thiện tổ chức nhằm tạo sân chơi lành mạnh, rèn luyện thể chất và tinh thần đoàn kết cho thanh niên trên địa bàn phường.',
  'livestream_url': '',
  'logo_url': '/uploads/1782178241823-383735380.png',
  'banner_url': '/uploads/1782178242095-963978102.png',
  'union_name': 'Đoàn phường Tùng Thiện',
  'tournament_name_short': 'Giải Bóng đá Thiếu niên',
};

async function updateAllSettings() {
  console.log('🔄 Updating all settings...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allSettings),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Settings updated successfully!');
      console.log('📊 Result:', result);
    } else {
      console.error('❌ Failed to update settings');
      const error = await response.json();
      console.error('Error:', error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateAllSettings();
