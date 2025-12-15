import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface KpdItem {
  sifra: string;
  naziv: string;
  razina: number;
  podkategorije: KpdItem[];
}

// Division to Section mapping (KPD 2025 standard)
const divisionToSection: Record<string, string> = {
  '01': 'A', '02': 'A', '03': 'A',
  '05': 'B', '06': 'B', '07': 'B', '08': 'B', '09': 'B',
  '10': 'C', '11': 'C', '12': 'C', '13': 'C', '14': 'C', '15': 'C', '16': 'C', '17': 'C', '18': 'C', '19': 'C',
  '20': 'C', '21': 'C', '22': 'C', '23': 'C', '24': 'C', '25': 'C', '26': 'C', '27': 'C', '28': 'C', '29': 'C',
  '30': 'C', '31': 'C', '32': 'C', '33': 'C',
  '35': 'D',
  '36': 'E', '37': 'E', '38': 'E', '39': 'E',
  '41': 'F', '42': 'F', '43': 'F',
  '45': 'G', '46': 'G', '47': 'G',
  '49': 'H', '50': 'H', '51': 'H', '52': 'H', '53': 'H',
  '55': 'I', '56': 'I',
  '58': 'J', '59': 'J', '60': 'J', '61': 'J', '62': 'J', '63': 'J',
  '64': 'K', '65': 'K', '66': 'K',
  '68': 'L',
  '69': 'M', '70': 'M', '71': 'M', '72': 'M', '73': 'M', '74': 'M', '75': 'M',
  '77': 'N', '78': 'N', '79': 'N', '80': 'N', '81': 'N', '82': 'N',
  '84': 'O',
  '85': 'P',
  '86': 'Q', '87': 'Q', '88': 'Q',
  '90': 'R', '91': 'R', '92': 'R', '93': 'R',
  '94': 'S', '95': 'S', '96': 'S',
  '97': 'T', '98': 'T',
  '99': 'U',
};

// KPD 2025 uses different section letters
const kpd2025SectionMapping: Record<string, string> = {
  'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'H': 'H',
  'I': 'I', 'J': 'J', 'K': 'K', 'L': 'L', 'M': 'M', 'N': 'N', 'O': 'O', 'P': 'P',
  'Q': 'Q', 'R': 'R', 'S': 'S', 'T': 'T', 'U': 'U', 'V': 'V'
};

// Determine parent code from code structure
function getParentCode(code: string): string | null {
  // Section letters (A-V) have no parent
  if (/^[A-V]$/.test(code)) {
    return null;
  }

  // Two digits (division) - parent is the section letter
  if (/^\d{2}$/.test(code)) {
    return divisionToSection[code] || null;
  }

  // XX.X (group) -> parent is XX (division)
  if (/^\d{2}\.\d$/.test(code)) {
    return code.slice(0, 2);
  }

  // XX.XX (class) -> parent is XX.X (group)
  if (/^\d{2}\.\d{2}$/.test(code)) {
    return code.slice(0, 4);
  }

  // XX.XX.X (category) -> parent is XX.XX (class)
  if (/^\d{2}\.\d{2}\.\d$/.test(code)) {
    return code.slice(0, 5);
  }

  // XX.XX.XX (subcategory) -> parent is XX.XX.X (category)
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(code)) {
    return code.slice(0, 7);
  }

  return null;
}

// Flatten the nested structure with correct parent codes
function flattenKpd(items: KpdItem[]): Array<{
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
}> {
  const result: Array<{
    code: string;
    name: string;
    level: number;
    parentCode: string | null;
  }> = [];

  for (const item of items) {
    result.push({
      code: item.sifra,
      name: item.naziv,
      level: item.razina + 1, // Convert from 0-based to 1-based
      parentCode: getParentCode(item.sifra),
    });

    if (item.podkategorije && item.podkategorije.length > 0) {
      result.push(...flattenKpd(item.podkategorije));
    }
  }

  return result;
}

async function main() {
  console.log('🚀 Starting KPD 2025 full data import...');

  // Read the hierarchy JSON file (full data)
  const dataPath = path.resolve(__dirname, '../../../apps/api/data/kpd_2025_hierarchy.json');
  console.log(`📂 Reading data from: ${dataPath}`);

  if (!fs.existsSync(dataPath)) {
    console.error('❌ Data file not found!');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const kpdHierarchy: KpdItem[] = JSON.parse(rawData);

  console.log(`📊 Found ${kpdHierarchy.length} top-level items`);

  // Flatten the hierarchy with correct parent codes
  const flattenedData = flattenKpd(kpdHierarchy);
  console.log(`📋 Total items to import: ${flattenedData.length}`);

  // Remove duplicates (keep first occurrence)
  const seen = new Set<string>();
  const uniqueData = flattenedData.filter(item => {
    if (seen.has(item.code)) {
      return false;
    }
    seen.add(item.code);
    return true;
  });
  console.log(`📋 Unique items: ${uniqueData.length}`);

  // Clear existing KPD codes
  console.log('🗑️ Clearing existing KPD codes...');
  await prisma.kpdCode.deleteMany({});

  // Insert in batches
  const batchSize = 100;
  let inserted = 0;

  console.log('💾 Inserting KPD codes...');

  for (let i = 0; i < uniqueData.length; i += batchSize) {
    const batch = uniqueData.slice(i, i + batchSize);

    await prisma.kpdCode.createMany({
      data: batch.map(item => ({
        code: item.code,
        name: item.name,
        level: item.level,
        parentCode: item.parentCode,
        keywords: [],
      })),
      skipDuplicates: true,
    });

    inserted += batch.length;
    if (inserted % 500 === 0 || inserted === uniqueData.length) {
      console.log(`   Progress: ${inserted}/${uniqueData.length}`);
    }
  }

  // Verify
  const count = await prisma.kpdCode.count();
  console.log(`\n✅ Import complete! Total KPD codes in database: ${count}`);

  // Verify parent relationships
  const withParents = await prisma.kpdCode.count({
    where: { parentCode: { not: null } }
  });
  console.log(`📊 Codes with parent: ${withParents}`);
  console.log(`📊 Codes without parent (sections): ${count - withParents}`);

  // Show sections
  const sections = await prisma.kpdCode.findMany({
    where: { level: 1 },
    orderBy: { code: 'asc' },
  });
  console.log(`\n📑 Sections (level 1): ${sections.length}`);
  sections.forEach(s => console.log(`   ${s.code}: ${s.name.slice(0, 50)}${s.name.length > 50 ? '...' : ''}`));

  // Test hierarchy
  console.log(`\n🔗 Testing hierarchy (A -> 01 -> 01.1 -> 01.11 -> 01.11.1 -> 01.11.11):`);
  const testCodes = ['A', '01', '01.1', '01.11', '01.11.1', '01.11.11'];
  for (const code of testCodes) {
    const item = await prisma.kpdCode.findUnique({
      where: { code },
      select: { code: true, name: true, parentCode: true, level: true }
    });
    if (item) {
      console.log(`   ${item.code.padEnd(10)} (L${item.level}): parent=${(item.parentCode || 'null').padEnd(8)} "${item.name.slice(0, 40)}..."`);
    }
  }

  // Count children for section A
  const childrenOfA = await prisma.kpdCode.count({ where: { parentCode: 'A' } });
  console.log(`\n📊 Children of section A: ${childrenOfA}`);
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
