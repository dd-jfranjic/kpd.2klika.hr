/**
 * KPD 2klika - Database Seed
 * Version: 2.0 (Fresh Start)
 * Date: 2025-12-13
 *
 * Seeds:
 * 1. PlanConfig - Subscription plans (FREE, BASIC, PRO, ENTERPRISE)
 * 2. SystemConfig - Application configuration
 * 3. User - SUPER_ADMIN user
 */

import { PrismaClient, PlanType, ConfigType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed (v2.0)...');

  // ============================================
  // 1. PLAN CONFIGURATION
  // Matches MASTER_PLAN.md pricing
  // ============================================
  console.log('📦 Seeding plan configurations...');

  const plans = [
    {
      plan: PlanType.FREE,
      displayName: 'Free',
      description: 'Za početnike - isprobajte bez obveza',
      monthlyPriceEur: 0,
      stripePriceId: null, // No Stripe for free plan
      stripeProductId: 'prod_RS15sRuGcX8bec',
      dailyQueryLimit: 5,
      monthlyQueryLimit: null, // Based on daily
      membersLimit: 1,
      features: JSON.stringify([
        'Do 5 AI upita dnevno',
        'Osnovna klasifikacija',
        '1 član',
      ]),
      isPopular: false,
      sortOrder: 1,
    },
    {
      plan: PlanType.BASIC,
      displayName: 'Basic',
      description: 'Za male poduzetnike i obrtnike',
      monthlyPriceEur: 9.99,
      stripePriceId: 'price_1QTdVTEYgmZPHnHXeSYqTDy2',
      stripeProductId: 'prod_RS15bMpsMTWHQc',
      dailyQueryLimit: 50,
      monthlyQueryLimit: null,
      membersLimit: 3,
      features: JSON.stringify([
        'Do 50 AI upita dnevno',
        'Povijest upita',
        'Export rezultata',
        'Do 3 člana',
      ]),
      isPopular: false,
      sortOrder: 2,
    },
    {
      plan: PlanType.PRO,
      displayName: 'Pro',
      description: 'Za rastuće tvrtke',
      monthlyPriceEur: 19.99,
      stripePriceId: 'price_1QTdVjEYgmZPHnHXLMUk2d26',
      stripeProductId: 'prod_RS167CbMKpk5dn',
      dailyQueryLimit: 250,
      monthlyQueryLimit: null,
      membersLimit: 10,
      features: JSON.stringify([
        'Do 250 AI upita dnevno',
        'API pristup',
        'Bulk klasifikacija',
        'Do 10 članova',
        'Priority support',
      ]),
      isPopular: true,
      sortOrder: 3,
    },
    {
      plan: PlanType.ENTERPRISE,
      displayName: 'Enterprise',
      description: 'Za velike organizacije',
      monthlyPriceEur: 49.99,
      stripePriceId: 'price_1QTdW2EYgmZPHnHXDx1dQ94K',
      stripeProductId: 'prod_RS169lAUCE2lfh',
      dailyQueryLimit: 2000,
      monthlyQueryLimit: null,
      membersLimit: null, // Unlimited
      features: JSON.stringify([
        'Do 2000 AI upita dnevno',
        'API pristup',
        'Bulk klasifikacija',
        'Neograničeni članovi',
        'Dedicated support',
        'SLA garancija',
        'Custom integracije',
      ]),
      isPopular: false,
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.planConfig.upsert({
      where: { plan: plan.plan },
      update: plan,
      create: plan,
    });
  }
  console.log(`✅ Created ${plans.length} plan configurations`);

  // ============================================
  // 2. SYSTEM CONFIGURATION
  // All configuration stored in DB!
  // ============================================
  console.log('⚙️ Seeding system configurations...');

  const systemConfigs = [
    // AI Settings (Integrations tab)
    {
      key: 'GEMINI_MODEL',
      value: 'gemini-2.5-flash',
      type: ConfigType.STRING,
      category: 'AI',
      description: 'Google Gemini model za RAG pretragu (RAG kompatibilan)',
      isSecret: false,
    },
    {
      key: 'RAG_STORE_ID',
      value: '',
      type: ConfigType.STRING,
      category: 'AI',
      description: 'Google Gemini File Search Store ID za RAG dokumente',
      isSecret: false,
    },
    {
      key: 'ai.max_tokens',
      value: '2048',
      type: ConfigType.NUMBER,
      category: 'ai',
      description: 'Maksimalni broj tokena za AI odgovor',
      isSecret: false,
    },
    {
      key: 'ai.temperature',
      value: '0.3',
      type: ConfigType.NUMBER,
      category: 'ai',
      description: 'AI temperatura (kreativnost)',
      isSecret: false,
    },
    {
      key: 'ai.system_prompt',
      value: `Ti si stručnjak za klasifikaciju poslovnih djelatnosti prema KPD (Klasifikacija Proizvoda po Djelatnostima) standardu.
Tvoj zadatak je analizirati opis posla ili djelatnosti i predložiti najprikladnije KPD šifre.
Za svaku predloženu šifru navedi:
1. KPD šifru (npr. 62.01.11)
2. Naziv djelatnosti
3. Postotak pouzdanosti (0-100%)
4. Kratko obrazloženje

Odgovori u JSON formatu. Predloži do 5 najprikladnijih šifri, sortirano po pouzdanosti.`,
      type: ConfigType.STRING,
      category: 'ai',
      description: 'System prompt za AI klasifikaciju',
      isSecret: false,
    },

    // Cache Settings
    {
      key: 'cache.ttl.kpd_codes',
      value: '86400',
      type: ConfigType.NUMBER,
      category: 'cache',
      description: 'Cache TTL za KPD šifre (sekunde)',
      isSecret: false,
    },
    {
      key: 'cache.ttl.config',
      value: '3600',
      type: ConfigType.NUMBER,
      category: 'cache',
      description: 'Cache TTL za konfiguraciju (sekunde)',
      isSecret: false,
    },
    {
      key: 'cache.ttl.query_result',
      value: '86400',
      type: ConfigType.NUMBER,
      category: 'cache',
      description: 'Cache TTL za rezultate upita (sekunde)',
      isSecret: false,
    },

    // Rate Limiting
    {
      key: 'rate_limit.window_ms',
      value: '60000',
      type: ConfigType.NUMBER,
      category: 'limits',
      description: 'Rate limit window (ms)',
      isSecret: false,
    },
    {
      key: 'rate_limit.max_requests',
      value: '100',
      type: ConfigType.NUMBER,
      category: 'limits',
      description: 'Maksimalni broj zahtjeva po windowu',
      isSecret: false,
    },

    // Query Limits
    {
      key: 'limit.max_query_length',
      value: '1000',
      type: ConfigType.NUMBER,
      category: 'limits',
      description: 'Maksimalna duljina upita (znakova)',
      isSecret: false,
    },
    {
      key: 'limit.max_results_per_query',
      value: '5',
      type: ConfigType.NUMBER,
      category: 'limits',
      description: 'Maksimalni broj rezultata po upitu',
      isSecret: false,
    },

    // Feature Toggles
    {
      key: 'feature.maintenance_mode',
      value: 'false',
      type: ConfigType.BOOLEAN,
      category: 'feature',
      description: 'Maintenance mode - blokira sve osim admina',
      isSecret: false,
    },
    {
      key: 'feature.ai_enabled',
      value: 'true',
      type: ConfigType.BOOLEAN,
      category: 'feature',
      description: 'AI klasifikacija omogućena',
      isSecret: false,
    },
    {
      key: 'feature.registration_enabled',
      value: 'true',
      type: ConfigType.BOOLEAN,
      category: 'feature',
      description: 'Registracija novih korisnika omogućena',
      isSecret: false,
    },

    // UI Settings
    {
      key: 'ui.default_theme',
      value: 'system',
      type: ConfigType.STRING,
      category: 'ui',
      description: 'Zadana tema (light/dark/system)',
      isSecret: false,
    },
    {
      key: 'ui.default_locale',
      value: 'hr',
      type: ConfigType.STRING,
      category: 'ui',
      description: 'Zadani jezik',
      isSecret: false,
    },

    // App Info
    {
      key: 'app.version',
      value: '2.0.0',
      type: ConfigType.STRING,
      category: 'app',
      description: 'Verzija aplikacije',
      isSecret: false,
    },
    {
      key: 'app.name',
      value: 'KPD 2klika',
      type: ConfigType.STRING,
      category: 'app',
      description: 'Ime aplikacije',
      isSecret: false,
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {
        value: config.value,
        type: config.type,
        category: config.category,
        description: config.description,
        isSecret: config.isSecret,
      },
      create: config,
    });
  }
  console.log(`✅ Created ${systemConfigs.length} system configurations`);

  // ============================================
  // 3. SUPER_ADMIN USER
  // ============================================
  console.log('👤 Creating SUPER_ADMIN user...');

  // Default admin password - CHANGE IN PRODUCTION!
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kpd.2klika.hr' },
    update: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      emailVerified: true,
    },
    create: {
      email: 'admin@kpd.2klika.hr',
      passwordHash,
      firstName: 'Admin',
      lastName: 'KPD',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Created SUPER_ADMIN: ${adminUser.email}`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('Created:');
  console.log(`  - ${plans.length} plan configurations`);
  console.log(`  - ${systemConfigs.length} system configurations`);
  console.log(`  - 1 SUPER_ADMIN user (admin@kpd.2klika.hr)`);
  console.log('');
  console.log('⚠️  Note: KPD codes need to be imported separately!');
  console.log('    See: kpd-popis/kpd_2025.sql');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
