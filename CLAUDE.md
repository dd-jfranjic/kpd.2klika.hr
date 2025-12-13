# CLAUDE.md - KPD 2klika

**Domain**: kpd.2klika.hr
**Path**: `/var/www/vhosts/kpd.2klika.hr/httpdocs/`
**System User**: `kpd.2klika.hr_cjfmg3wnf4u`
**GitHub**: https://github.com/dd-jfranjic/kpd.2klika.hr.git
**Status**: 🔄 FRESH START - Multi-tenant SaaS rebuild u tijeku

---

## 🚨 ZLATNA PRAVILA - OBAVEZNO SLIJEDI!

### 1. ZERO HARDCODING
- **NIKADA** ne hardkodiraj vrijednosti u kod
- **SVE** konfiguracije idu u bazu (`SystemConfig`, `PlanConfig`, `TenantConfig`)
- API ključevi, limiti, poruke, cijene - SVE U BAZI
- Jedini izuzetak: `.env` za Docker secrets

### 2. MODULARNOST
- Svaka komponenta mora biti neovisna i zamjenjiva
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple, Stupid)
- Preferiraj composition over inheritance

### 3. SIGURNOST NA NAJVIŠOJ RAZINI
- Zod validacija za SVE inpute
- Rate limiting na SVE API endpoints
- Encrypted secrets (AES-256-GCM)
- OWASP Top 10 compliance
- SQL injection, XSS prevention

### 4. PREMIUM KVALITETA
- Enterprise-grade kod
- Proper error handling
- Logging (Pino)
- Audit trail za admin akcije

### 5. DOCKER CLEANUP OBAVEZAN
Nakon SVAKOG `docker compose up -d --build`:
```bash
docker image prune -f
docker builder prune -f
docker system df  # Verificiraj
```

---

## 📚 KRITIČNI DOKUMENTI

| Dokument | Svrha | Prioritet |
|----------|-------|-----------|
| **MASTER_PLAN.md** | 🎯 GLAVNI plan - arhitektura, faze, schema | #1 |
| **AS_IMPLEMENTED.md** | Progress implementacije, deployment status | #2 |
| **RAZVOJNI_PLAN.md** | Stara vizija (legacy reference) | #3 |

---

## 🚀 QUICK STATUS

- **Landing**: https://kpd.2klika.hr/ ✅ HTTP 200
- **API**: http://localhost:13621 ✅ Healthy
- **Admin**: http://localhost:13624 ✅ Running
- **Database**: PostgreSQL ✅ 17+ tablica
- **Redis**: ✅ Healthy

### ✅ Konfigurirani API Servisi
- **Auth**: ✅ JWT-based email/password authentication (NestJS + bcrypt + Passport)
- **Stripe (billing)**: ✅ MCP CONNECTED (`mcp__stripe-kpd__*`)
- **Gemini (AI)**: ⏳ Čeka API key - https://aistudio.google.com/app/apikey

### ⚠️ UKLONJEN CLERK (2025-12-13)
Clerk autentifikacija je u potpunosti uklonjena i zamijenjena klasičnim email/password JWT sustavom:
- Login: `/login`
- Register: `/register`
- Auth context: `useAuth()` hook
- Backend: NestJS AuthModule s JwtStrategy i LocalStrategy

---

## 🛠️ QUICK COMMANDS

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs

# Status
docker compose -f docker/docker-compose.prod.yml ps

# Logs
docker logs kpd-web --tail 50
docker logs kpd-api --tail 50

# Rebuild after .env changes
docker compose -f docker/docker-compose.prod.yml up -d --build web admin
```

---

## PREMIUM STANDARD - Work Philosophy

**Pristup svakom zadatku mora biti:**
- **Profesionalno** - kao da radiš za enterprise klijenta
- **Metodično** - korak po korak, ništa ne preskači
- **Studiozno** - istraži prije nego što implementiraš
- **Logički** - svaka odluka ima razlog
- **Premium razina** - kvaliteta iznad svega

### Obavezni Alati:
- **Jina MCP** - UVIJEK koristi za svježe informacije s weba
- **frontend-design plugin** - za sve UI/dizajn zadatke (`Skill: frontend-design`)

---

## MASTER WORKFLOW - Follow This Every Time!

### Step 0: Read Guidelines First
- **READ THIS FILE** (`CLAUDE.md`) before any work
- Check reference files for project context
- Understand existing architecture before making changes

### Step 1: Understand the Prompt
- Tell the user what you understood from their request
- Summarize the task in your own words
- Identify the core requirements

### Step 2: Clarify If Needed
- If anything is unclear, **ASK** before proceeding
- Suggest improvements to the prompt if it's ambiguous
- Better to ask than to assume wrong

### Step 3: Identify Files to Check
- List which files you should review before making changes
- Understand dependencies and impacts
- Check existing implementations for patterns

### Step 4: Make Changes (KISS & DRY)
- **KISS**: Keep It Simple, Stupid - simplest solution that works
- **DRY**: Don't Repeat Yourself - reuse existing code/components
- **NO hardcoding** - everything configurable or in database
- **NO mock data** - always use real database storage

### Step 5: Git Workflow
- **Every big feature = its own branch**
- Test thoroughly before merging
- Merge to `main` only when tests pass
- Clean commit messages

### Step 6: Report Changes
- List every file you modified
- Explain what changed in each file
- Document any new dependencies or configs

---

## Context Management - CRITICAL!

### Use Subagents to Preserve Context
**You have 200K context window - use it to ORCHESTRATE other 200K agents!**

- **EVERY coding task** → delegate to a subagent
- Main context = orchestration & decision making
- Subagents = implementation & exploration
- This preserves your main context for the big picture

### Available Subagent Types:
- `@explorer` - Research, find files, understand codebase (Haiku - fast)
- `@planner` - Design architecture, create implementation plans (Sonnet)
- `general-purpose` - Complex multi-step coding tasks

---

## MCP Tools - USE THEM!

You have powerful MCP tools at your disposal. **USE THEM** to be better:

### Browser Testing
- **Chrome DevTools MCP**: `mcp__chrome-devtools__*`
- **IMPORTANT**: Close older browser instances before opening new ones!

### Research & Documentation
- **Jina Reader**: For fetching web pages and documentation
- **Jina Search**: For finding resources
- Always look for `llms.txt` when implementing third-party services

### Research Protocol (Jina)
```bash
# Read a webpage
curl "https://r.jina.ai/https://www.example.com" \
  -H "Authorization: Bearer jina_db539c74a0c046b9bd7307c38a042809H-c8gFGa6pNMBfg43XKn6C4sHWc"

# Search for resources
curl "https://s.jina.ai/?q=Your+Search+Query" \
  -H "Authorization: Bearer jina_db539c74a0c046b9bd7307c38a042809H-c8gFGa6pNMBfg43XKn6C4sHWc" \
  -H "X-Respond-With: no-content"
```

### Third-Party Integration Protocol
When implementing services (Stripe, etc.):
1. Find their `llms.txt` (e.g., `https://docs.stripe.com/llms.txt`)
2. Use Jina to read relevant documentation pages
3. Look for implementation specific to YOUR tech stack
4. If not specific, ask user and advise on best approach
5. Don't use internal web fetch for specific research - use Jina!

### UI Components
- **shadcn-ui**: `mcp__shadcn-ui__get_component`
- **TweakCN Themes**: `mcp__tweakcn-themes__list_themes`

---

## 💳 STRIPE MCP (Direktan Pristup!)

**Dodano**: 2025-12-12
**Ažurirano**: 2025-12-13 (Uklonjen Clerk - koristimo vlastiti JWT auth)

Claude Code ima **direktan pristup** Stripe dashboardu za ovaj projekt!

### Stripe MCP (`mcp__stripe-kpd__*`)
| Alat | Opis |
|------|------|
| `retrieve_balance` | Balance (trenutno: 0.00 EUR, test mode) |
| `list_customers` | Lista kupaca |
| `create_customer` | Kreiraj kupca |
| `list_products` | Lista produkata |
| `create_product` | Kreiraj produkt |
| `list_prices` | Lista cijena |
| `create_price` | Kreiraj cijenu |
| `list_subscriptions` | Lista pretplata |
| `create_payment_link` | Kreiraj payment link |
| `search_stripe_documentation` | Pretraži Stripe docs |

### Primjeri korištenja:
```
# Provjeri Stripe balance
mcp__stripe-kpd__retrieve_balance

# Kreiraj produkt u Stripeu
mcp__stripe-kpd__create_product(name="KPD Pro Plan", description="...")
```

---

## Docker Protocol

### All Projects Run in Docker!
- Use `docker logs` for debugging
- After any rebuild, **ALWAYS clean up leftovers**

### Cleanup Commands
```bash
# Check for dangling images
docker images -f "dangling=true"

# Remove dangling images (safe)
docker image prune -f

# Check build cache
docker builder prune --dry-run

# Clean build cache (careful!)
docker builder prune -f

# Check disk usage
docker system df
```

### After Every Rebuild:
1. Check for leftover images: `docker images -f "dangling=true"`
2. If any exist, remove them: `docker image prune -f`
3. **BE CAREFUL**: Don't delete images that are in use!
4. Verify with: `docker system df`

---

## Project Overview

**AI-powered KPD Classification SaaS** za hrvatske poduzetnike.
- 3.300+ KPD šifri
- Gemini 2.5 Flash RAG
- JWT-based authentication (email/password)
- Stripe billing

### Kritični Dokumenti
1. **RAZVOJNI_PLAN.md** - Vizija, pricing, arhitektura
2. **AI_IMPLEMENTATION_PLAN.md** - Fazni plan za AI agente (57 taskova)

### Implementacijski Principi
- **MODULARNOST** - Svaka komponenta neovisna i zamjenjiva
- **ZERO HARDCODING** - SVE konfiguracije u bazi (SystemConfig/TenantConfig)
- **SIGURNOST** - OWASP Top 10, RLS, Zod validacija
- **PERFORMANCE** - Redis caching, PgBouncer, lazy loading

---

## Tech Stack

*To be defined*

---

## Important Files

*To be documented*

---

## Commands

*To be documented*

---

## File Permissions Protocol

### Standard Plesk Permissions
After ANY file operation, ensure correct permissions:

```bash
# Fix ownership (run as root)
chown -R kpd.2klika.hr_cjfmg3wnf4u:psacln /var/www/vhosts/kpd.2klika.hr/httpdocs/

# Fix directory permissions (755)
find /var/www/vhosts/kpd.2klika.hr/httpdocs/ -type d -exec chmod 755 {} \;

# Fix file permissions (644)
find /var/www/vhosts/kpd.2klika.hr/httpdocs/ -type f -exec chmod 644 {} \;

# Make scripts executable if needed
chmod +x /var/www/vhosts/kpd.2klika.hr/httpdocs/*.sh
```

### SSH Directory Permissions
```bash
# SSH directory must be 700
chmod 700 /var/www/vhosts/kpd.2klika.hr/.ssh

# Private key must be 600
chmod 600 /var/www/vhosts/kpd.2klika.hr/.ssh/id_rsa
chmod 600 /var/www/vhosts/kpd.2klika.hr/.ssh/authorized_keys

# Public key can be 644
chmod 644 /var/www/vhosts/kpd.2klika.hr/.ssh/id_rsa.pub
```

### Quick Fix Command
```bash
# All-in-one permission fix
chown -R kpd.2klika.hr_cjfmg3wnf4u:psacln /var/www/vhosts/kpd.2klika.hr/httpdocs/ && \
chmod -R 755 /var/www/vhosts/kpd.2klika.hr/httpdocs/ && \
find /var/www/vhosts/kpd.2klika.hr/httpdocs/ -type f -exec chmod 644 {} \;
```

---

## Notes

- Virtual host created: 2025-12-11
- SSH access configured with keys from malaodlavande.com
- Added to sshd AllowUsers
- SSH key `42n3ss-laptop` included in authorized_keys

---

**Last Updated**: 2025-12-13
**Version**: 1.2 (Replaced Clerk with JWT email/password auth)
**Maintained by**: Claude Code
