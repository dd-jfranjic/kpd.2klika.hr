# FAZA 1: FRESH START

**Status**: Ceka
**Preduvjeti**: PHASE_0_PREPARATION.md - sve checkboxevi
**Sljedeca faza**: PHASE_2_AUTH.md

---

## Cilj Faze

Obrisati stari kod i postaviti novu Prisma schemu s pravilnim multi-tenant modelom.

---

## Koraci

### 1. Backup Kriticnih Fajlova

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs

# Backup .env
cp .env .env.backup.$(date +%Y%m%d)

# Backup landing page (ako je custom)
cp -r apps/web/app/page.tsx apps/web/app/page.tsx.backup
cp -r apps/web/app/globals.css apps/web/app/globals.css.backup
```

---

### 2. Obrisati Stari Kod

**STO OBRISATI:**
- `apps/api/src/modules/` - stari moduli
- `apps/web/app/(dashboard)/` - stare dashboard stranice
- `apps/admin/` - stari admin kod
- `packages/database/prisma/schema.prisma` - stara schema

**STO ZADRZATI:**
- `.env` (vec backupiran)
- `docker/` - Docker konfiguracija
- `apps/web/app/page.tsx` - Landing page (ili zadrzati dizajn)
- `apps/web/app/globals.css` - Globalni stilovi

**Komande:**
```bash
# Ocisti stare module (OPREZNO!)
rm -rf apps/api/src/modules/*
rm -rf apps/web/app/\(auth\)/*
rm -rf apps/web/app/\(dashboard\)/*
rm -rf apps/admin/app/*
```

---

### 3. Nova Prisma Schema

Kopirati kompletnu schemu iz: `docs/DATABASE_SCHEMA.md`

**Lokacija:** `packages/database/prisma/schema.prisma`

---

### 4. Pokrenuti Migraciju

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs

# Generirati Prisma client
docker exec kpd-api npx prisma generate

# Kreirati migraciju
docker exec kpd-api npx prisma migrate dev --name init_multi_tenant

# Ako ima problema s existing data:
docker exec kpd-api npx prisma migrate reset --force
```

---

### 5. Seed Database

Kreirati seed file: `packages/database/prisma/seed.ts`

```typescript
import { PrismaClient, PlanType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed PlanConfig
  const plans = [
    {
      plan: PlanType.FREE,
      monthlyPriceEur: 0,
      dailyQueryLimit: 5,
      membersLimit: 1,
      displayName: 'KPD Free',
      description: 'Osnovna pretraga',
      features: JSON.stringify(['Osnovna AI pretraga', 'Do 5 upita dnevno']),
      sortOrder: 0,
    },
    {
      plan: PlanType.BASIC,
      monthlyPriceEur: 9.99,
      dailyQueryLimit: 50,
      membersLimit: 3,
      displayName: 'KPD Basic',
      description: 'Za male poduzetnike',
      features: JSON.stringify(['50 upita dnevno', 'Do 3 clana', 'Query history']),
      sortOrder: 1,
    },
    {
      plan: PlanType.PRO,
      monthlyPriceEur: 19.99,
      dailyQueryLimit: 250,
      membersLimit: 10,
      displayName: 'KPD Pro',
      description: 'Za rastuce timove',
      features: JSON.stringify(['250 upita dnevno', 'Do 10 clanova', 'Batch upload', 'Export']),
      isPopular: true,
      sortOrder: 2,
    },
    {
      plan: PlanType.ENTERPRISE,
      monthlyPriceEur: 49.99,
      dailyQueryLimit: 2000,
      membersLimit: null,
      displayName: 'KPD Enterprise',
      description: 'Za velike organizacije',
      features: JSON.stringify(['2000 upita dnevno', 'Unlimited clanova', 'Priority support']),
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.planConfig.upsert({
      where: { plan: plan.plan },
      update: plan,
      create: plan,
    });
  }

  console.log('PlanConfig seeded');

  // 2. Seed SUPER_ADMIN
  const adminPassword = await bcrypt.hash('admin_secure_password_2025', 12);

  await prisma.user.upsert({
    where: { email: 'admin@2klika.hr' },
    update: {},
    create: {
      email: 'admin@2klika.hr',
      passwordHash: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('SUPER_ADMIN seeded');

  // 3. Seed SystemConfig
  const configs = [
    { key: 'app.name', value: 'KPD 2klika', category: 'general' },
    { key: 'app.description', value: 'AI KPD Klasifikator', category: 'general' },
    { key: 'ai.model', value: 'gemini-2.5-flash', category: 'ai' },
    { key: 'ai.maxTokens', value: '2048', type: 'NUMBER', category: 'ai' },
    { key: 'email.from', value: 'noreply@kpd.2klika.hr', category: 'email' },
    { key: 'invite.expiryDays', value: '7', type: 'NUMBER', category: 'invite' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config as any,
    });
  }

  console.log('SystemConfig seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Pokretanje:**
```bash
docker exec kpd-api npx prisma db seed
```

---

### 6. Verifikacija

```bash
# Provjeri tablice
docker exec kpd-postgres psql -U kpd -d kpd -c "\dt"

# Provjeri PlanConfig
docker exec kpd-postgres psql -U kpd -d kpd -c "SELECT * FROM \"PlanConfig\";"

# Provjeri SUPER_ADMIN
docker exec kpd-postgres psql -U kpd -d kpd -c "SELECT email, role FROM \"User\";"
```

---

## Struktura Foldera Nakon Faze 1

```
apps/
  api/
    src/
      modules/           # Prazno - ceka module
      main.ts
      app.module.ts
  web/
    app/
      page.tsx           # Landing page (zadrzano)
      globals.css        # Stilovi (zadrzano)
      (auth)/            # Prazno - ceka FAZU 2
      (dashboard)/       # Prazno - ceka FAZU 4
  admin/
    app/                 # Prazno - ceka FAZU 6

packages/
  database/
    prisma/
      schema.prisma      # NOVA schema
      seed.ts            # Seed script
      migrations/        # Nova init migracija

docs/
  DATABASE_SCHEMA.md
  DESIGN_RULES.md
  PHASE_*.md
```

---

## Checklist

- [ ] Backup .env napravljen
- [ ] Stari kod obrisan
- [ ] Nova Prisma schema postavljena
- [ ] Migracija uspjesna
- [ ] Seed data uneseni
- [ ] PlanConfig u bazi
- [ ] SUPER_ADMIN u bazi
- [ ] SystemConfig u bazi

---

## Reference

- **Schema detalji**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- **Dizajn**: [DESIGN_RULES.md](./DESIGN_RULES.md)

---

**Sljedeca faza**: [PHASE_2_AUTH.md](./PHASE_2_AUTH.md)
