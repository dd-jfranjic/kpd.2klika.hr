/**
 * Export KPD codes to structured text file for Gemini RAG upload
 *
 * Creates a well-formatted document with all KPD codes, their descriptions,
 * and hierarchical relationships for optimal RAG retrieval.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportForRag() {
  console.log('Exporting KPD codes for Gemini RAG...');

  // Fetch all categories
  const categories = await prisma.kpdCategory.findMany({
    orderBy: { id: 'asc' }
  });

  // Fetch all codes with category info
  const codes = await prisma.kpdCode.findMany({
    include: {
      category: true,
      parent: true
    },
    orderBy: [
      { level: 'asc' },
      { codeNumeric: 'asc' }
    ]
  });

  console.log(`Found ${categories.length} categories and ${codes.length} codes`);

  // Build structured document
  let document = `# KPD 2025 - Klasifikacija Proizvoda po Djelatnostima
# Verzija: 2025
# Broj kategorija (sektora): ${categories.length}
# Broj šifara: ${codes.length}
# Datum generiranja: ${new Date().toISOString()}

================================================================================
PREGLED SEKTORA (KATEGORIJA)
================================================================================

`;

  // Add categories overview
  for (const cat of categories) {
    document += `SEKTOR ${cat.id}: ${cat.name}\n`;
  }

  document += `
================================================================================
DETALJNI POPIS KPD ŠIFARA
================================================================================

`;

  // Group codes by category for better organization
  const codesByCategory: Record<string, typeof codes> = {};
  for (const code of codes) {
    if (!codesByCategory[code.categoryId]) {
      codesByCategory[code.categoryId] = [];
    }
    codesByCategory[code.categoryId].push(code);
  }

  // Export by category
  for (const cat of categories) {
    const catCodes = codesByCategory[cat.id] || [];

    document += `
--------------------------------------------------------------------------------
SEKTOR ${cat.id}: ${cat.name}
Broj šifara u sektoru: ${catCodes.length}
--------------------------------------------------------------------------------

`;

    // Group by level for readability
    for (let level = 1; level <= 5; level++) {
      const levelCodes = catCodes.filter(c => c.level === level);
      if (levelCodes.length === 0) continue;

      const levelName = ['', 'Odjeljci', 'Skupine', 'Razredi', 'Podrazredi', 'Detaljne šifre'][level];

      document += `\n### Razina ${level} - ${levelName} (${levelCodes.length})\n\n`;

      for (const code of levelCodes) {
        const parentInfo = code.parent ? ` (roditelj: ${code.parent.id})` : '';
        const finalMark = code.isFinal ? ' [FINALNA]' : '';

        document += `${code.id}: ${code.name}${finalMark}${parentInfo}\n`;

        // Add description if available
        if (code.description) {
          document += `   Opis: ${code.description}\n`;
        }
      }
    }
  }

  // Add index for common searches
  document += `
================================================================================
INDEKS ZA PRETRAŽIVANJE
================================================================================

### Programiranje i IT usluge (sektor J - Informacijske i komunikacijske usluge)
62.01 - Računalno programiranje
62.01.1 - Usluge dizajniranja i razvoja IT
62.01.11 - Izrada aplikativnog softvera
62.01.12 - Izrada sistemskog softvera
62.02 - Savjetovanje u vezi s računalima
63.11 - Obrada podataka, hosting

### Građevinarstvo (sektor F)
41.1 - Organizacija izvedbe građevinskih projekata
41.2 - Radovi na zgradama
42.1 - Ceste i željeznice
43 - Specijalizirani građevinski radovi

### Proizvodnja (sektor C)
10 - Prehrambeni proizvodi
25 - Metalni proizvodi
26 - Računala i elektronički proizvodi
28 - Strojevi i uređaji

### Usluge (sektori G, H, I, M, N)
45-47 - Trgovina
49-53 - Prijevoz i skladištenje
55-56 - Smještaj i hrana
69-75 - Stručne usluge
77-82 - Administrativne usluge

================================================================================
KRAJ DOKUMENTA
================================================================================
`;

  // Write to file
  const outputPath = path.join(__dirname, 'kpd_2025_rag.txt');
  fs.writeFileSync(outputPath, document, 'utf-8');

  console.log(`\nExported to: ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

  // Also create a simpler CSV-like format for alternative RAG
  let simpleCsv = 'KPD_SIFRA\tNAZIV\tSEKTOR\tRAZINA\tFINALNA\n';
  for (const code of codes) {
    simpleCsv += `${code.id}\t${code.name}\t${code.categoryId}\t${code.level}\t${code.isFinal ? 'DA' : 'NE'}\n`;
  }

  const csvPath = path.join(__dirname, 'kpd_2025_simple.tsv');
  fs.writeFileSync(csvPath, simpleCsv, 'utf-8');
  console.log(`Simple TSV: ${csvPath}`);
}

exportForRag()
  .then(() => {
    console.log('\nExport complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Export failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
