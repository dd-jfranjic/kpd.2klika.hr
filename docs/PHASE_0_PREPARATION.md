# FAZA 0: PRIPREMA

**Status**: U tijeku
**Preduvjeti**: Nema
**Sljedeca faza**: PHASE_1_FRESH_START.md

---

## Cilj Faze

Osigurati sve potrebne resurse, API kljuceve i konfiguracije prije brisanja starog koda.

---

## Checklist

### 1. API Kljucevi (SACUVATI!)

```env
# Database - LOKALNO, ne mijenjati!
POSTGRES_USER=kpd
POSTGRES_PASSWORD=kpd_secure_2025_prod
POSTGRES_DB=kpd
DATABASE_URL=postgresql://kpd:kpd_secure_2025_prod@postgres:5432/kpd?schema=public

# Redis
REDIS_URL=redis://redis:6379

# Gemini AI - KRITICAN!
GEMINI_API_KEY=AIzaSyBUw_zi1Z1foSzKOkyEPhSv_ZE5lHQXeAU

# JWT Secret - KRITICAN!
JWT_SECRET=vFFW3bk36ijLzmZfw8eCTDj++q9+OL7l3xVjeFkKNDSllrAe0xEGOOreqYzqzX5x

# Security
API_KEY_SALT=0248ba755c1a8449a8a42bba3d41bbcd
SESSION_SECRET=e669240f11a8a30882b6971c472c0c568932c4bcb96f9482f250eecad409c6ba

# Ports
WEB_PORT=13620
API_PORT=13621
ADMIN_PORT=13624
PGBOUNCER_PORT=13622
```

**Status**: Sacuvano

---

### 2. SMTP Konfiguracija

```env
SMTP_HOST=mail.2klika.hr
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=kpd@2klika.hr
SMTP_PASS=******** (u .env)
SMTP_FROM=noreply@kpd.2klika.hr
```

**Status**: GOTOVO - Email account kreiran

---

### 3. Stripe Produkti

**Stari produkti (OBRISATI):**

| Produkt | Product ID | Status |
|---------|------------|--------|
| KPD Basic | prod_TaqTTQSKzmLsTn | Za brisanje |
| KPD Pro | prod_TaqTiCcWnV9xGp | Za brisanje |
| KPD Enterprise | prod_TaqTFFIba5LAja | Za brisanje |

**Novi produkti (KREIRATI u Stripe Dashboard):**

| Plan | Tip | Cijena | Stripe Price |
|------|-----|--------|--------------|
| KPD Free | - | 0 EUR/mj | - |
| KPD Basic | recurring | 9.99 EUR/mj | Ceka kreiranje |
| KPD Pro | recurring | 19.99 EUR/mj | Ceka kreiranje |
| KPD Enterprise | recurring | 49.99 EUR/mj | Ceka kreiranje |

**Akcije:**
1. Otici u Stripe Dashboard
2. Products > Delete stare produkte
3. Products > Add new product (recurring)
4. Kopirati price_id u .env

**Status**: CEKA AKCIJU

---

### 4. Google RAG FileSearchStore

**Kreirati novi store za KPD podatke:**

```bash
cd /root/tools/gemini-rag

# 1. Kreiraj store
python3 gemini_rag.py create-store kpd-codes \
  --display-name "KPD Sifrarnik 2025"

# 2. Provjeri da je kreiran
python3 gemini_rag.py list-stores
```

**Kasnije (FAZA 4):**
- Export KPD kodova iz baze u TXT format
- Upload u RAG store
- Test query

**Status**: CEKA - nakon FAZE 1

---

### 5. Landing Page

**Odluka**: Zadrzati postojeci landing page

**Izmjene potrebne:**
- Dodati pricing CTA gumb
- Azurirati tekst za subscription model

**Status**: OK - izmjene u FAZI 7

---

## BITNE REFERENCE

| Dokument | Svrha |
|----------|-------|
| DATABASE_SCHEMA.md | Prisma schema za FAZU 1 |
| DESIGN_RULES.md | Dizajn smjernice za sve faze |
| CLAUDE.md | Projektne upute |

---

## Prije Prelaska na FAZU 1

- [x] Svi API kljucevi dokumentirani
- [x] SMTP konfiguriran
- [ ] Stripe produkti kreirani (recurring)
- [ ] Backup .env napravljen

**Komanda za backup:**
```bash
cp /var/www/vhosts/kpd.2klika.hr/httpdocs/.env /var/www/vhosts/kpd.2klika.hr/httpdocs/.env.backup.$(date +%Y%m%d)
```

---

**Sljedeca faza**: [PHASE_1_FRESH_START.md](./PHASE_1_FRESH_START.md)
