# CLAUDE.md - KPD 2klika

**Domain**: kpd.2klika.hr
**Path**: `/var/www/vhosts/kpd.2klika.hr/httpdocs/`
**System User**: `kpd.2klika.hr_cjfmg3wnf4u`
**GitHub**: https://github.com/dd-jfranjic/kpd.2klika.hr.git
**Status**: Multi-tenant SaaS rebuild u tijeku

---

## 🗄️ DATABASE SAFETY - KRITIČNO!

**⚠️ OVO PRAVILO IMA NAJVIŠI PRIORITET - ČITAJ SVAKU SESIJU!**

### APSOLUTNO ZABRANJENO:
- ❌ **NIKADA ne briši podatke** iz baze bez eksplicitne dozvole korisnika
- ❌ **NIKADA ne pokreći `docker-compose down -v`** (briše volumene s podacima!)
- ❌ **NIKADA ne pokreći `docker volume rm`** bez prethodne provjere sadržaja
- ❌ **NIKADA ne pokreći `prisma migrate reset`** u produkciji
- ❌ **NIKADA ne koristi `--force-reset` flagove** koji mogu obrisati podatke

### PRIJE bilo kakve operacije koja MOŽE utjecati na bazu:
1. **PROVJERI** postoji li backup (`backups/` folder)
2. **NAPRAVI BACKUP** ako ne postoji:
   ```bash
   docker exec kpd_postgres pg_dump -U kpd_user kpd_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql
   ```
3. **PITAJ KORISNIKA** za potvrdu prije destruktivnih operacija

### DESTRUKTIVNE OPERACIJE (zahtijevaju backup + potvrdu):
- `docker-compose down` (može utjecati na volumene)
- `docker volume prune/rm`
- `prisma db push --force-reset`
- `prisma migrate reset`
- `DROP TABLE/DATABASE` SQL naredbe
- Bilo kakva migracija koja briše stupce/tablice

### SIGURNE OPERACIJE (ne zahtijevaju posebnu potvrdu):
- `docker-compose restart`
- `prisma db push` (dodaje nove tablice/stupce, NE briše)
- `prisma generate`
- SELECT upiti

---

## PROJEKTNA DOKUMENTACIJA

### Glavni Dokumenti (OBAVEZNO CITAJ!)

| Dokument | Svrha | Prioritet |
|----------|-------|-----------|
| **[MASTER_PLAN.md](./MASTER_PLAN.md)** | Index svih faza, arhitektura, subscription paketi | #1 |
| **[AS_IMPLEMENTED.md](./AS_IMPLEMENTED.md)** | Progress tracking - sto je napravljeno, status | #2 |
| **[docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** | Kompletna Prisma schema s seed podacima | #3 |
| **[docs/DESIGN_RULES.md](./docs/DESIGN_RULES.md)** | UI/UX pravila, boje, NO INLINE CSS! | #4 |

### Faze Razvoja

| Faza | Dokument | Status |
|------|----------|--------|
| 0 | [docs/PHASE_0_PREPARATION.md](./docs/PHASE_0_PREPARATION.md) | **ZAVRSENO** |
| 1 | [docs/PHASE_1_FRESH_START.md](./docs/PHASE_1_FRESH_START.md) | **ZAVRSENO** |
| 2 | [docs/PHASE_2_AUTH.md](./docs/PHASE_2_AUTH.md) | **ZAVRSENO** |
| 3 | [docs/PHASE_3_BILLING.md](./docs/PHASE_3_BILLING.md) | **ZAVRSENO** |
| 4 | [docs/PHASE_4_KPD_TOOL.md](./docs/PHASE_4_KPD_TOOL.md) | **ZAVRSENO** |
| 5 | [docs/PHASE_5_DASHBOARD.md](./docs/PHASE_5_DASHBOARD.md) | **ZAVRSENO** |
| 6 | [docs/PHASE_6_ADMIN.md](./docs/PHASE_6_ADMIN.md) | **ZAVRSENO** |
| 7 | [docs/PHASE_7_POLISH.md](./docs/PHASE_7_POLISH.md) | **U TIJEKU** (~80%) |

---

## TECH STACK S DOKUMENTACIJOM

### Frontend

| Tehnologija | Verzija | Dokumentacija |
|-------------|---------|---------------|
| **Next.js** | 15.x | https://nextjs.org/docs |
| **React** | 19.x | https://react.dev/reference/react |
| **TypeScript** | 5.x | https://www.typescriptlang.org/docs/ |
| **Tailwind CSS** | 4.x | https://tailwindcss.com/docs |
| **shadcn/ui** | latest | https://ui.shadcn.com/docs |
| **React Hook Form** | 7.x | https://react-hook-form.com/docs |
| **Zod** | 3.x | https://zod.dev/ |

### Backend

| Tehnologija | Verzija | Dokumentacija |
|-------------|---------|---------------|
| **NestJS** | 11.x | https://docs.nestjs.com/ |
| **Prisma** | 6.x | https://www.prisma.io/docs |
| **PostgreSQL** | 17.x | https://www.postgresql.org/docs/17/ |
| **Redis** | 7.x | https://redis.io/docs/ |
| **Passport JWT** | latest | http://www.passportjs.org/packages/passport-jwt/ |
| **bcrypt** | latest | https://www.npmjs.com/package/bcrypt |

### Payments

| Tehnologija | Dokumentacija |
|-------------|---------------|
| **Stripe Billing** | https://docs.stripe.com/billing |
| **Stripe Subscriptions** | https://docs.stripe.com/billing/subscriptions/build-subscriptions |
| **Stripe Webhooks** | https://docs.stripe.com/webhooks |
| **Stripe Customer Portal** | https://docs.stripe.com/customer-management/integrate-customer-portal |

### AI/RAG

| Tehnologija | Dokumentacija |
|-------------|---------------|
| **Google Gemini API** | https://ai.google.dev/gemini-api/docs |
| **Gemini File Search (RAG)** | https://ai.google.dev/gemini-api/docs/file-search |
| **@google/genai SDK** | https://www.npmjs.com/package/@google/genai |
| **Gemini Models** | https://ai.google.dev/gemini-api/docs/models |

### Email

| Tehnologija | Dokumentacija |
|-------------|---------------|
| **Nodemailer** | https://nodemailer.com/about/ |
| **React Email** | https://react.email/docs/introduction |

### Deployment

| Tehnologija | Dokumentacija |
|-------------|---------------|
| **Docker** | https://docs.docker.com/ |
| **Docker Compose** | https://docs.docker.com/compose/ |
| **Nginx** | https://nginx.org/en/docs/ |

---

## KPD REFERENTNA IMPLEMENTACIJA (FiskalAI)

**KRITICNO**: KPD alat kopirati iz FiskalAI projekta!

### Lokacija FiskalAI KPD Komponenti

**Backend** (`/var/www/vhosts/fiskalai.2klika.hr/httpdocs/backend/src/modules/`):
```
kpd/
├── kpd.controller.ts         # JWT-protected API endpoints
├── kpd-public.controller.ts  # PIN-protected public API
├── kpd.service.ts            # Business logic (735 redaka)
├── kpd.module.ts             # NestJS module
└── guards/tool-pin.guard.ts  # PIN autentifikacija

ai/
├── kpd-suggestion.controller.ts    # AI prijedlozi endpoint
├── services/
│   ├── kpd-suggestion.service.ts   # Gemini RAG queries (289 redaka)
│   ├── rag.service.ts              # FileSearchStore management (406 redaka)
│   └── ai-settings.service.ts      # AI konfiguracija (317 redaka)
└── dto/kpd-suggestion.dto.ts       # DTO validacija
```

**Frontend** (`/var/www/vhosts/fiskalai.2klika.hr/httpdocs/frontend/`):
```
app/tools/kpd-lookup/
├── page.tsx                        # PIN gate + tool
├── layout.tsx                      # Metadata
└── components/
    ├── KpdLookupTool.tsx          # Glavni container
    ├── PinGate.tsx                # PIN input (6-digit)
    ├── AiSuggestionPanel.tsx      # AI suggestions UI
    └── KpdBrowserPublic.tsx       # Tree browser

components/kpd/
└── kpd-search.tsx                 # Reusable search (385 redaka)

hooks/
└── use-kpd-ai-suggestions.ts      # AI hook (124 redaka)
```

### KPD Podaci (RAW FILES)

**Lokacija**: `/var/www/vhosts/fiskalai.2klika.hr/httpdocs/kpd-popis/`

| Datoteka | Velicina | Format |
|----------|----------|--------|
| `KPD2025_NOVO.txt` | 1.95 MB | TXT (KLASUS izvor) |
| `kpd_2025.csv` | 409 KB | CSV |
| `kpd_2025.sql` | 452 KB | SQL insert |
| `kpd_2025_flat.json` | 720 KB | JSON flat |
| `kpd_2025_hierarchy.json` | 1.1 MB | JSON hijerarhija |
| `kpd_scraper_final.py` | 9.6 KB | Parser script |

### KPD Sync Workflow

**VAZNO**: Kada dodes do KPD importa/sync dijela, JAVI KORISNIKU!

KPD kodovi se periodicno azuriraju od strane KLASUS-a. Sync workflow dokumentiran u FiskalAI:
- `KpdSyncLog` model za audit trail
- `KpdSyncService` za download, parse, diff, apply
- Admin panel UI na `/admin/kpd-sync/`
- Scheduled job za automatski sync

---

## ZLATNA PRAVILA

### 1. ZERO HARDCODING
- **NIKADA** ne hardkodiraj vrijednosti u kod
- **SVE** konfiguracije idu u bazu (`SystemConfig`, `PlanConfig`)
- API kljucevi, limiti, poruke, cijene - SVE U BAZI
- Jedini izuzetak: `.env` za Docker secrets

### 2. NO INLINE CSS
```tsx
// ZABRANJENO:
<div style={{ color: 'green' }}>

// ISPRAVNO:
<div className={styles.container}>
```

### 3. SIGURNOST
- Zod validacija za SVE inpute
- Rate limiting na SVE API endpoints
- Encrypted secrets (AES-256-GCM)
- OWASP Top 10 compliance

### 4. DOCKER CLEANUP OBAVEZAN
Nakon SVAKOG `docker compose up -d --build`:
```bash
docker image prune -f
docker builder prune -f
docker system df  # Verificiraj
```

---

## QUICK COMMANDS

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs

# Status
docker compose -f docker/docker-compose.prod.yml ps

# Logs
docker logs kpd-web --tail 50
docker logs kpd-api --tail 50

# Rebuild
docker compose -f docker/docker-compose.prod.yml up -d --build

# Cleanup (OBAVEZNO!)
docker image prune -f && docker builder prune -f
```

---

## 🚀 ZERO-DOWNTIME DEPLOYMENT (Blue-Green)

**KRITIČNO**: Slijedi ovu proceduru za SVAKI deployment!
**Detaljno**: [docs/DEPLOYMENT_PROCEDURE.md](./docs/DEPLOYMENT_PROCEDURE.md)

### Arhitektura

```
kpd.2klika.hr → Apache → BLUE (active) ili GREEN (standby)
                              ↓
                    Shared: PostgreSQL, Redis, PgBouncer
```

| Environment | Web Port | API Port | Compose File |
|-------------|----------|----------|--------------|
| **BLUE** | 13620 | 13621 | `docker/docker-compose.prod.yml` |
| **GREEN** | 13630 | 13631 | `docker/docker-compose.green.yml` |

### ⚠️ VAŽNO: Apache Routing za Next.js API

**Problem**: Apache routing šalje SVE `/api/` zahtjeve na NestJS backend, ali `/api/kpd/search` je Next.js API ruta koja proxira na backend s extended timeout-om (120s za Gemini RAG).

**Rješenje**: `switch.sh` automatski generira Apache config s izuzetkom:
```apache
# Next.js API routes (must be BEFORE NestJS catch-all!)
ProxyPass /api/kpd/ http://127.0.0.1:$web_port/api/kpd/
ProxyPassReverse /api/kpd/ http://127.0.0.1:$web_port/api/kpd/

# API routes go to NestJS backend
ProxyPass /api/ http://127.0.0.1:$api_port/api/
ProxyPassReverse /api/ http://127.0.0.1:$api_port/api/
```

**Ako AI upiti vrate 404**: Provjeri `/var/www/vhosts/system/kpd.2klika.hr/conf/vhost_ssl.conf` - mora imati `/api/kpd/` izuzetak PRIJE općeg `/api/` pravila!

### WORKFLOW ZA BUG FIX / FEATURE

**Kad korisnik kaže "Popravi X" ili "Dodaj Y", CLAUDE MORA:**

#### 1. ANALIZA (prije kodiranja!)

```
□ Je li potrebna promjena baze (Prisma schema)?
  → DA: Migracija MORA biti backward-compatible!
        - Nova kolona? MORA biti nullable (?) ili @default()
        - Brisanje? NIKAD dok stari kod radi!
  → NE: Samo promjena koda - jednostavnije

□ Koje datoteke treba mijenjati?
□ Treba li novi API endpoint?
□ Treba li UI promjena?
```

#### 2. IMPLEMENTACIJA

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs

# Ako treba migracija:
cd packages/database
npx prisma migrate deploy
cd ../..
```

#### 3. DEPLOY (jedna komanda!)

```bash
./deploy/deploy.sh
```

Skripta automatski:
- ✅ Detektira aktivan environment (BLUE/GREEN)
- ✅ Builda STANDBY dok ACTIVE još radi
- ✅ Čeka health check
- ✅ Docker cleanup (KRITIČNO!)
- ✅ Fix permissions
- ✅ Pita za switch

#### 4. POST-DEPLOY CHECKLIST

```bash
# Provjeri zdravlje
curl -s https://kpd.2klika.hr/api/health | jq

# Provjeri logove (greške?)
docker logs kpd-web --tail 50
docker logs kpd-api --tail 50

# Disk space (MORA biti <85%)
df -h /
```

### ROLLBACK (1 sekunda!)

```bash
./deploy/rollback.sh
```

### Deploy Komande

| Akcija | Komanda |
|--------|---------|
| **Deploy** (automatski) | `./deploy/deploy.sh` |
| **Status** | `./deploy/switch.sh status` |
| **Rollback** | `./deploy/rollback.sh` |
| Switch BLUE | `./deploy/switch.sh blue` |
| Switch GREEN | `./deploy/switch.sh green` |

### ⚠️ OBAVEZNO NAKON SVAKOG DEPLOYA:

```bash
# 1. Docker cleanup
docker image prune -f && docker builder prune -f

# 2. Provjeri disk
df -h /

# 3. Fix permissions (ako treba)
chown -R kpd.2klika.hr_cjfmg3wnf4u:psacln /var/www/vhosts/kpd.2klika.hr/httpdocs/
chmod +x deploy/*.sh
```

---

## MCP TOOLS

### Stripe MCP (`mcp__stripe-kpd__*`)

Direktan pristup Stripe dashboardu:

| Alat | Opis |
|------|------|
| `retrieve_balance` | Provjeri balance |
| `list_customers` | Lista kupaca |
| `create_customer` | Kreiraj kupca |
| `list_products` | Lista produkata |
| `create_product` | Kreiraj produkt |
| `list_prices` | Lista cijena |
| `create_price` | Kreiraj cijenu (recurring!) |
| `list_subscriptions` | Lista pretplata |
| `create_payment_link` | Kreiraj payment link |
| `search_stripe_documentation` | Pretrazi Stripe docs |

### shadcn/ui MCP

```
mcp__shadcn-ui__get_component      # Dohvati komponentu
mcp__shadcn-ui__get_component_demo # Primjeri koristenja
mcp__shadcn-ui__list_components    # Lista svih komponenti
```

### Browser Testing

```
mcp__chrome-devtools__*  # Chrome DevTools kontrola
```

---

## SUBSCRIPTION PAKETI (Azurirano 2025-12-14)

| Plan | DisplayName | Cijena/mj | Upiti/mj | Clanovi |
|------|-------------|-----------|----------|---------|
| **FREE** | KPD Starter | 0 EUR | 3 | 1 |
| **PLUS** | KPD Plus | 6.99 EUR | 10 | 2 |
| **PRO** | KPD Pro | 11.99 EUR | 20 | 5 |
| **BUSINESS** | KPD Business | 30.99 EUR | 50 | 10 |
| **ENTERPRISE** | KPD Enterprise | 199 EUR | 2500 | Unlimited |

**Stripe produkti**: Kreirani (test mode), recurring prices aktivne
**Stripe Price IDs**:
- PLUS: `price_1SeIevKFcGpdxTuIQF3ZyDFQ`
- PRO: `price_1SeIevKFcGpdxTuI2FmI1GFs`
- BUSINESS: `price_1SeIewKFcGpdxTuInfJyipWm`
- ENTERPRISE: `price_1SeIewKFcGpdxTuIQNscv0j9`

---

## FILE PERMISSIONS

```bash
# Fix ownership
chown -R kpd.2klika.hr_cjfmg3wnf4u:psacln /var/www/vhosts/kpd.2klika.hr/httpdocs/

# Fix permissions
find /var/www/vhosts/kpd.2klika.hr/httpdocs/ -type d -exec chmod 755 {} \;
find /var/www/vhosts/kpd.2klika.hr/httpdocs/ -type f -exec chmod 644 {} \;
```

---

## WORKFLOW

### Svaki Task:

1. **Procitaj MASTER_PLAN.md** za kontekst
2. **Procitaj relevantnu PHASE_X.md** za detalje
3. **Procitaj DESIGN_RULES.md** za UI/UX
4. **Implementiraj** prema dokumentaciji
5. **Testiraj** prije commita
6. **Cleanup Docker** nakon rebuilda

### Delegiraj Subagentima:

- `@explorer` - Istrazivanje koda (Haiku)
- `@planner` - Planiranje arhitekture (Sonnet)
- `general-purpose` - Kompleksni taskovi

---

## GEMINI RAG TOOL

**Lokacija**: `/root/tools/gemini-rag/gemini_rag.py`

```bash
cd /root/tools/gemini-rag

# Kreiraj store
python3 gemini_rag.py create-store kpd-codes --display-name "KPD 2025"

# Upload dokument
python3 gemini_rag.py upload kpd-codes "/path/to/kpd.pdf"

# Query
python3 gemini_rag.py query kpd-codes "programiranje softvera" --verbose

# Lista store-ova
python3 gemini_rag.py list-stores
```

---

## NAPOMENE

- Auth: JWT email/password (Clerk uklonjen 2025-12-13)
- Stripe: Test mode aktivan, recurring prices kreirane
- Gemini: RAG aktivan (`gemini-2.5-flash` + File Search)
- RAG Store: `fileSearchStores/kpd-2025-klasifikacija-6g9v4clu15pc`
- KPD Import: 5,701 kodova importirano (2025-12-13)
- Usage: Mjesečni limiti, neuspješni upiti se NE broje

---

**Last Updated**: 2025-12-17
**Version**: 2.3 (Apache routing za Next.js API dokumentirano)
**Maintained by**: Claude Code
