# KPD Deployment Procedure - Zero Downtime

**KRITIČNO**: Ovaj dokument opisuje proceduru za sve deployment operacije.
Claude MORA slijediti ovu proceduru za svaki bug fix ili feature deployment.

---

## ARHITEKTURA

```
                    kpd.2klika.hr
                         │
                    ┌────┴────┐
                    │  Apache │ (Plesk managed)
                    └────┬────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
   ┌─────────────┐              ┌─────────────┐
   │    BLUE     │              │    GREEN    │
   │             │              │             │
   │ kpd-web     │              │ kpd-web-g   │
   │ port:13620  │              │ port:13630  │
   │             │              │             │
   │ kpd-api     │              │ kpd-api-g   │
   │ port:13621  │              │ port:13631  │
   └──────┬──────┘              └──────┬──────┘
          │                            │
          └────────────┬───────────────┘
                       │
          ┌────────────┴────────────┐
          │    SHARED (JEDNA!)      │
          │                         │
          │  kpd-postgres  :5432    │
          │  kpd-pgbouncer :13622   │
          │  kpd-redis     :13623   │
          └─────────────────────────┘
```

---

## FAZE DEPLOYMENT PROCEDURE

### FAZA 1: ANALIZA PROMJENE

**CLAUDE MORA PROVJERITI:**

| Pitanje | Ako DA |
|---------|--------|
| Treba li promjena baze (nova kolona, tablica)? | → Idi na FAZA 2A |
| Samo promjena koda (bez baze)? | → Idi na FAZA 2B |
| Treba li migracija postojećih podataka? | → OPREZ! Backward compatible! |

#### Kako prepoznati potrebu za migracijom:

```
✅ SAMO KOD (brzo):
   - Bug fix u logici
   - UI promjena
   - API endpoint promjena (bez nove kolone)
   - Styling/CSS

⚠️ TREBA MIGRACIJA:
   - Dodavanje nove kolone u Prisma schema
   - Nova tablica
   - Novi enum value
   - Promjena tipa podatka
```

---

### FAZA 2A: DEPLOYMENT S MIGRACIJOM

**PRAVILO**: Migracije MORAJU biti backward-compatible!

```bash
# 1. PROVJERA - Što se mijenja?
cd /var/www/vhosts/kpd.2klika.hr/httpdocs
git diff packages/database/prisma/schema.prisma

# 2. SIGURNOSNA PROVJERA
#    - Je li nova kolona NULLABLE (?) ili ima @default()?
#    - NIKAD required kolona bez default!

# 3. PRIMIJENI MIGRACIJU (dok BLUE još radi!)
cd packages/database
npx prisma migrate deploy

# 4. NASTAVI S FAZA 3
```

#### Primjer SAFE migracije:
```prisma
// SAFE - nullable
phoneNumber String?

// SAFE - default value
isActive Boolean @default(true)

// SAFE - nova tablica
model NewFeature {
  id String @id
}
```

#### Primjer OPASNE migracije (NE RADI OVAKO!):
```prisma
// OPASNO - sruši BLUE!
phoneNumber String  // Required bez default!

// OPASNO - rename
// oldName -> newName (BLUE još koristi oldName!)
```

---

### FAZA 2B: DEPLOYMENT SAMO KODA

Preskoči migraciju, idi direktno na FAZA 3.

---

### FAZA 3: BUILD & DEPLOY

```bash
cd /var/www/vhosts/kpd.2klika.hr/httpdocs

# JEDNA KOMANDA - SVE RADI AUTOMATSKI:
./deploy/deploy.sh

# Skripta automatski:
# 1. Detektira koji je environment aktivan (BLUE/GREEN)
# 2. Builda STANDBY environment
# 3. Čeka health check
# 4. Čisti Docker (KRITIČNO za disk!)
# 5. Popravlja permissions
# 6. Pita za switch
```

#### Ručni koraci (ako treba):

```bash
# Provjeri status
./deploy/switch.sh status

# Build GREEN ručno
docker compose -f docker/docker-compose.green.yml up -d --build

# Testiraj GREEN
curl http://localhost:13630/api/health
curl http://localhost:13631/api/v1/health/ready

# Switch na GREEN
./deploy/switch.sh green

# Ako nešto ne radi - ROLLBACK (1 sekunda!)
./deploy/rollback.sh
```

---

### FAZA 4: POST-DEPLOY CHECKLIST

```bash
# 1. PROVJERI ZDRAVLJE
docker ps | grep kpd
curl -s https://kpd.2klika.hr/api/health | jq

# 2. PROVJERI LOGOVE (greške?)
docker logs kpd-web --tail 50
docker logs kpd-api --tail 50
# ili za GREEN:
docker logs kpd-web-g --tail 50
docker logs kpd-api-g --tail 50

# 3. DISK SPACE (KRITIČNO!)
df -h /
# Ako >85% - odmah čisti!

# 4. DOCKER CLEANUP (OBAVEZNO NAKON SVAKOG DEPLOYA!)
docker image prune -f
docker builder prune -f
docker system df

# 5. FIX PERMISSIONS
chown -R kpd.2klika.hr_cjfmg3wnf4u:psacln /var/www/vhosts/kpd.2klika.hr/httpdocs/
find /var/www/vhosts/kpd.2klika.hr/httpdocs/ -type d -exec chmod 755 {} \;
find /var/www/vhosts/kpd.2klika.hr/httpdocs/ -type f -exec chmod 644 {} \;
chmod +x /var/www/vhosts/kpd.2klika.hr/httpdocs/deploy/*.sh
```

---

## QUICK REFERENCE

### Komande

| Akcija | Komanda |
|--------|---------|
| Deploy (automatski) | `./deploy/deploy.sh` |
| Status | `./deploy/switch.sh status` |
| Switch na BLUE | `./deploy/switch.sh blue` |
| Switch na GREEN | `./deploy/switch.sh green` |
| Rollback | `./deploy/rollback.sh` |
| Logs BLUE web | `docker logs kpd-web --tail 100` |
| Logs GREEN web | `docker logs kpd-web-g --tail 100` |
| Logs BLUE api | `docker logs kpd-api --tail 100` |
| Logs GREEN api | `docker logs kpd-api-g --tail 100` |

### Portovi

| Service | BLUE | GREEN |
|---------|------|-------|
| Web | 13620 | 13630 |
| API | 13621 | 13631 |
| PostgreSQL | 5432 (internal) | shared |
| PgBouncer | 13622 | shared |
| Redis | 13623 | shared |

### Docker Compose Files

| Environment | File |
|-------------|------|
| BLUE (production) | `docker/docker-compose.prod.yml` |
| GREEN (standby) | `docker/docker-compose.green.yml` |

---

## TROUBLESHOOTING

### Problem: Health check timeout

```bash
# Provjeri koji container ne radi
docker ps -a | grep kpd

# Provjeri logove
docker logs kpd-api-g --tail 100

# Čest problem: Prisma client nije generiran
docker exec -it kpd-api-g npx prisma generate
```

### Problem: Apache reload failed

```bash
# Test config
apachectl configtest

# Provjeri syntax greške u vhost.conf
cat /var/www/vhosts/system/kpd.2klika.hr/conf/vhost_ssl.conf
```

### Problem: Disk space full

```bash
# Provjeri što jede prostor
du -sh /var/lib/docker/*

# Agresivni cleanup
docker system prune -a -f
docker volume prune -f

# Provjeri Plesk backupe
du -sh /var/lib/psa/dumps/*
```

### Problem: GREEN ne može spojiti na bazu

```bash
# Provjeri je li GREEN na istoj mreži
docker network inspect kpd-internal

# Provjeri PostgreSQL health
docker logs kpd-postgres --tail 20
```

---

## ROLLBACK SCENARIJI

### Scenarij 1: Bug nakon switcha (kod)

```bash
# Instant rollback - 1 sekunda!
./deploy/rollback.sh

# Svi korisnici odmah na staroj verziji
# Analiziraj bug, fixaj, redeploy
```

### Scenarij 2: Bug nakon migracije (baza)

```
⚠️ SLOŽENIJE - migracija se ne može jednostavno rollback!

Opcije:
1. Fix forward - napravi novu migraciju koja ispravlja problem
2. Manual rollback - ručno SQL ako je kritično
3. Restore from backup - zadnja opcija
```

### Scenarij 3: Potpuni haos

```bash
# 1. Vrati sve na BLUE (sigurno radi)
./deploy/switch.sh blue

# 2. Ugasi GREEN
docker compose -f docker/docker-compose.green.yml down

# 3. Analiziraj što je pošlo po zlu
docker logs kpd-web --tail 200
docker logs kpd-api --tail 200

# 4. Fiksaj i pokušaj ponovno
```

---

## VAŽNE NAPOMENE

### ⚠️ NIKAD NE ZABORAVI:

1. **Docker cleanup NAKON SVAKOG DEPLOYA!**
   ```bash
   docker image prune -f && docker builder prune -f
   ```

2. **Provjeri disk PRIJE deploya!**
   ```bash
   df -h /  # Mora biti <85%
   ```

3. **Backward compatible migracije!**
   - Nova kolona? Mora biti `?` ili `@default()`
   - Briši kolonu tek kad stari kod više ne radi

4. **Fix permissions!**
   - System user: `kpd.2klika.hr_cjfmg3wnf4u`
   - Group: `psacln`

5. **Testiraj PRIJE switcha!**
   ```bash
   curl http://localhost:13630/  # GREEN web
   curl http://localhost:13631/api/v1/health  # GREEN api
   ```

---

**Last Updated**: 2025-12-17
**Maintained by**: Claude Code
