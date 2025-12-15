/**
 * KPD 2025 Import Script
 *
 * Imports all KPD codes from CSV file into PostgreSQL database
 * Uses Prisma client for database operations
 *
 * CSV Format: sifra,naziv,razina
 * - Level 0: Sectors (A, B, C, etc.) → KpdCategory
 * - Level 1-5: Codes → KpdCode
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CsvRow {
  sifra: string;
  naziv: string;
  razina: number;
}

// Sector mapping from letter to full code prefix
const sectorPrefixes: Record<string, string[]> = {
  'A': ['01', '02', '03'],
  'B': ['05', '06', '07', '08', '09'],
  'C': ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33'],
  'D': ['35'],
  'E': ['36', '37', '38', '39'],
  'F': ['41', '42', '43'],
  'G': ['45', '46', '47'],
  'H': ['49', '50', '51', '52', '53'],
  'I': ['55', '56'],
  'J': ['58', '59', '60', '61', '62', '63'],
  'K': ['64', '65', '66'],
  'L': ['68'],
  'M': ['69', '70', '71', '72', '73', '74', '75'],
  'N': ['77', '78', '79', '80', '81', '82'],
  'O': ['84'],
  'P': ['85'],
  'Q': ['86', '87', '88'],
  'R': ['90', '91', '92', '93'],
  'S': ['94', '95', '96'],
  'T': ['97', '98'],
  'U': ['99'],
  'V': ['99'] // Note: V uses same codes as U in some cases
};

function getCategoryForCode(code: string): string {
  const prefix = code.substring(0, 2);

  for (const [sector, prefixes] of Object.entries(sectorPrefixes)) {
    if (prefixes.includes(prefix)) {
      return sector;
    }
  }

  // Fallback - check first two digits
  const numPrefix = parseInt(prefix);
  if (numPrefix >= 1 && numPrefix <= 3) return 'A';
  if (numPrefix >= 5 && numPrefix <= 9) return 'B';
  if (numPrefix >= 10 && numPrefix <= 33) return 'C';
  if (numPrefix === 35) return 'D';
  if (numPrefix >= 36 && numPrefix <= 39) return 'E';
  if (numPrefix >= 41 && numPrefix <= 43) return 'F';
  if (numPrefix >= 45 && numPrefix <= 47) return 'G';
  if (numPrefix >= 49 && numPrefix <= 53) return 'H';
  if (numPrefix >= 55 && numPrefix <= 56) return 'I';
  if (numPrefix >= 58 && numPrefix <= 63) return 'J';
  if (numPrefix >= 64 && numPrefix <= 66) return 'K';
  if (numPrefix === 68) return 'L';
  if (numPrefix >= 69 && numPrefix <= 75) return 'M';
  if (numPrefix >= 77 && numPrefix <= 82) return 'N';
  if (numPrefix === 84) return 'O';
  if (numPrefix === 85) return 'P';
  if (numPrefix >= 86 && numPrefix <= 88) return 'Q';
  if (numPrefix >= 90 && numPrefix <= 93) return 'R';
  if (numPrefix >= 94 && numPrefix <= 96) return 'S';
  if (numPrefix >= 97 && numPrefix <= 98) return 'T';
  if (numPrefix === 99) return 'U';

  console.warn(`Could not determine category for code: ${code}`);
  return 'A'; // Default fallback
}

function getParentId(code: string, level: number): string | null {
  if (level <= 1) return null;

  // Parse the code to get parent
  // 01.11.11 (level 5) → parent is 01.11.1 (level 4)
  // 01.11.1 (level 4) → parent is 01.11 (level 3)
  // 01.11 (level 3) → parent is 01.1 (level 2)
  // 01.1 (level 2) → parent is 01 (level 1)

  const parts = code.split('.');

  if (level === 5) {
    // 01.11.11 → 01.11.1
    const lastPart = parts[2];
    if (lastPart && lastPart.length === 2) {
      return `${parts[0]}.${parts[1]}.${lastPart[0]}`;
    }
  } else if (level === 4) {
    // 01.11.1 → 01.11
    return `${parts[0]}.${parts[1]}`;
  } else if (level === 3) {
    // 01.11 → 01.1
    const secondPart = parts[1];
    if (secondPart && secondPart.length === 2) {
      return `${parts[0]}.${secondPart[0]}`;
    }
  } else if (level === 2) {
    // 01.1 → 01
    return parts[0];
  }

  return null;
}

function codeToNumeric(code: string): number | null {
  // Convert 01.11.11 to 11111
  // Convert 62.01.11 to 620111
  const cleaned = code.replace(/\./g, '');
  const num = parseInt(cleaned);
  return isNaN(num) ? null : num;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split('\n');
  const rows: CsvRow[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV with quoted values
    // Format: sifra,"naziv with commas",razina
    let sifra = '';
    let naziv = '';
    let razina = 0;

    // Simple CSV parsing handling quoted strings
    let inQuote = false;
    let field = 0;
    let current = '';

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        if (field === 0) sifra = current;
        else if (field === 1) naziv = current;
        field++;
        current = '';
      } else {
        current += char;
      }
    }

    // Last field
    if (field === 2) {
      razina = parseInt(current);
    } else if (field === 1) {
      naziv = current;
      razina = 0; // Some rows might not have razina
    }

    if (sifra) {
      rows.push({ sifra, naziv, razina });
    }
  }

  return rows;
}

async function importKpd() {
  console.log('Starting KPD 2025 import...');

  // Read CSV file
  const csvPath = path.join(__dirname, 'kpd_2025.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  console.log(`Parsed ${rows.length} rows from CSV`);

  // Separate categories (level 0) and codes (level 1-5)
  const categories = rows.filter(r => r.razina === 0);
  const codes = rows.filter(r => r.razina > 0);

  console.log(`Found ${categories.length} categories and ${codes.length} codes`);

  // Clear existing data
  console.log('Clearing existing KPD data...');
  await prisma.kpdCode.deleteMany({});
  await prisma.kpdCategory.deleteMany({});

  // Import categories
  console.log('Importing categories...');
  for (const cat of categories) {
    await prisma.kpdCategory.create({
      data: {
        id: cat.sifra,
        name: cat.naziv,
        description: null,
        level: cat.razina,
        parentId: null,
        isActive: true,
        version: '2025'
      }
    });
  }
  console.log(`Imported ${categories.length} categories`);

  // Import codes in batches
  console.log('Importing codes...');
  const batchSize = 100;
  let imported = 0;
  let errors = 0;

  // Sort by level to ensure parents exist before children
  codes.sort((a, b) => a.razina - b.razina);

  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize);

    for (const code of batch) {
      try {
        const categoryId = getCategoryForCode(code.sifra);
        const parentId = getParentId(code.sifra, code.razina);
        const codeNumeric = codeToNumeric(code.sifra);

        // Check if parent exists (for levels > 1)
        if (parentId) {
          const parentExists = await prisma.kpdCode.findUnique({
            where: { id: parentId }
          });
          if (!parentExists) {
            // Skip for now, will be handled in next pass
            continue;
          }
        }

        await prisma.kpdCode.create({
          data: {
            id: code.sifra,
            name: code.naziv,
            description: null,
            categoryId: categoryId,
            level: code.razina,
            parentId: parentId,
            fullPath: code.sifra,
            codeNumeric: codeNumeric,
            isFinal: code.razina === 5,
            version: '2025',
            isActive: true
          }
        });
        imported++;
      } catch (error) {
        // Skip duplicates and continue
        if ((error as any).code !== 'P2002') {
          console.error(`Error importing ${code.sifra}:`, error);
          errors++;
        }
      }
    }

    console.log(`Progress: ${Math.min(i + batchSize, codes.length)}/${codes.length} processed`);
  }

  // Second pass for codes that might have been skipped due to missing parents
  console.log('Second pass for remaining codes...');
  for (const code of codes) {
    try {
      const existing = await prisma.kpdCode.findUnique({
        where: { id: code.sifra }
      });

      if (!existing) {
        const categoryId = getCategoryForCode(code.sifra);
        const parentId = getParentId(code.sifra, code.razina);
        const codeNumeric = codeToNumeric(code.sifra);

        await prisma.kpdCode.create({
          data: {
            id: code.sifra,
            name: code.naziv,
            description: null,
            categoryId: categoryId,
            level: code.razina,
            parentId: parentId,
            fullPath: code.sifra,
            codeNumeric: codeNumeric,
            isFinal: code.razina === 5,
            version: '2025',
            isActive: true
          }
        });
        imported++;
      }
    } catch (error) {
      if ((error as any).code !== 'P2002') {
        errors++;
      }
    }
  }

  // Final stats
  const totalCategories = await prisma.kpdCategory.count();
  const totalCodes = await prisma.kpdCode.count();
  const finalCodes = await prisma.kpdCode.count({ where: { isFinal: true } });

  console.log('\n=== Import Complete ===');
  console.log(`Categories: ${totalCategories}`);
  console.log(`Total codes: ${totalCodes}`);
  console.log(`Final codes (level 5): ${finalCodes}`);
  console.log(`Errors: ${errors}`);
}

// Run import
importKpd()
  .then(() => {
    console.log('Import finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
