import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Định nghĩa các Rank và tên tiếng Anh tương ứng để tạo file
const RANKS = {
  1: { name: 'Silver', tiers: [1, 2, 3] }, // Bạc: 3 tiers (III, II, I)
  2: { name: 'Emerald', tiers: [1, 2, 3, 4] }, // Lục bảo: 4 tiers (IV, III, II, I)
  3: { name: 'Elite', tiers: [1, 2, 3, 4, 5] }, // Tinh Anh: 5 tiers
  4: { name: 'Diamond', tiers: [1, 2, 3, 4, 5] }, // Kim Cương: 5 tiers
  5: { name: 'Master', tiers: [1] }, // Cao Thủ: 1 tier
};

const ROMAN_NUMERALS = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V'
};

const targetDir = __dirname;

function createTierFiles() {
  console.log('Bắt đầu tạo các file tier...');
  
  for (const rankId in RANKS) {
    const rank = RANKS[rankId];
    
    rank.tiers.forEach(tier => {
      const roman = ROMAN_NUMERALS[tier];
      const fileName = `tier${rank.name}${roman}.ts`;
      const filePath = path.join(targetDir, fileName);
      
      const content = `export const tier${rank.name}${roman} = [];\n`;

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Đã tạo: ${fileName}`);
      } else {
        console.log(`⏩ Đã bỏ qua: ${fileName} (File đã tồn tại)`);
      }
    });
  }
  
  console.log('Hoàn tất!');
}

createTierFiles();
