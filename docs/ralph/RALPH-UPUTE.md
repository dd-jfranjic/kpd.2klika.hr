# SHARP RALPH - Upute za Korištenje

## Što je Sharp Ralph?

Sharp Ralph je alat za **autonomni razvoj** koji pokreće Claude u novim sesijama za svaku iteraciju.
To znači da Claude uvijek radi s "čistom glavom" - bez usporavanja koje se događa kad kontekst naraste.

---

## VAŽNO: Claude Code vs Terminal

**Ralph se NE MOŽE pokrenuti iz Claude Code sesije!**

```
┌─────────────────────────────────────────────────────────────┐
│  CLAUDE CODE SESIJA                                          │
│                                                              │
│  Ti: "Kreiraj PRD za feature X"                              │
│  Claude: Kreiram docs/ralph/FEATURE-X.md ✅                  │
│                                                              │
│  Ti: "Pokreni Ralpha"                                        │
│  Claude: NE MOGU! ❌                                         │
│          Ralph pokreće NOVE Claude sesije.                   │
│          Claude ne može pokrenuti Claudea.                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Ispravan Workflow

```
KORAK 1: U Claude Code sesiji
─────────────────────────────────────────
Ti: "Trebam auth sistem. Koristi Ralpha."

Claude:
  1. Čita CLAUDE.md projekta
  2. Planira taskove
  3. Kreira docs/ralph/PHASE-01-auth.md
  4. Kaže: "PRD spreman! Pokreni iz terminala:"

     ralph --prd /var/www/vhosts/PROJEKT/httpdocs/docs/ralph/PHASE-01-auth.md


KORAK 2: Izlaziš iz Claude Coda
─────────────────────────────────────────
Ctrl+C ili /exit


KORAK 3: U terminalu pokrećeš Ralpha
─────────────────────────────────────────
root@server:~# ralph --prd /var/www/vhosts/PROJEKT/.../PHASE-01-auth.md

(Ralph radi autonomno - možeš otići na kavu ☕)


KORAK 4: Vratiš se pregledati rezultat
─────────────────────────────────────────
root@server:~# claude

Ti: "Što je Ralph napravio?"

Claude: Čita .ralph/progress.txt i PRD, pokazuje što je DONE
```

### Tko Što Radi

| Radnja | Gdje? |
|--------|-------|
| Planiranje, kreiranje PRD-a | ✅ Claude Code (interaktivno) |
| Pokretanje Ralpha | ❌ TERMINAL (izvan Claude Coda) |
| Pregled rezultata | ✅ Claude Code (interaktivno) |

**Ralph = autonoman proces koji radi sam. Claude ti samo pripremi PRD i da komandu.**

---

## Dva Načina Korištenja

### NAČIN 1: Direct Mode (Jedan Task)

Kad imaš jedan konkretan zadatak:

```bash
ralph "Opis zadatka" --max-iterations 10
```

**Primjeri:**
```bash
ralph "Popravi bug u login formi"
ralph "Dodaj dark mode" --max-iterations 15
ralph "Refaktoriraj API sloj" --verbose
```

---

### NAČIN 2: PRD Mode (Više Taskova)

Kad imaš više povezanih taskova, koristi PRD (Product Requirements Document):

```bash
ralph --prd docs/ralph/PHASE-01-auth.md
```

**PRD fajl** sadrži listu taskova koje Ralph izvršava redom.

---

## Kako Pokrenuti Ralpha

### Scenarij A: Iz /root (Apsolutni Path)

```
┌─────────────────────────────────────────────────────────┐
│  root@server:~#                                          │
│                                                          │
│  ralph --prd /var/www/vhosts/PROJEKT/httpdocs/docs/     │
│              ralph/PHASE-01.md                           │
│                                                          │
│  Ralph AUTOMATSKI:                                       │
│  1. Prepoznaje virtualhost iz patha                      │
│  2. Prebacuje se u taj direktorij                        │
│  3. Izvršava taskove                                     │
└─────────────────────────────────────────────────────────┘
```

### Scenarij B: Iz Projekt Direktorija (Relativni Path)

```
┌─────────────────────────────────────────────────────────┐
│  root@server:~# cd /var/www/vhosts/PROJEKT/httpdocs     │
│  root@server:httpdocs#                                   │
│                                                          │
│  ralph --prd docs/ralph/PHASE-01.md                      │
│                                                          │
│  Ralph koristi relativni path jer si već u projektu      │
└─────────────────────────────────────────────────────────┘
```

---

## Kako Kreirati PRD Fajl

### Korak 1: Kreiraj Folder

```bash
mkdir -p docs/ralph
```

### Korak 2: Kopiraj Template

```bash
cp /opt/sharp-ralph/templates/PRD-TEMPLATE.md docs/ralph/FEATURE-naziv.md
```

### Korak 3: Uredi PRD

Svaki task mora imati ovaj format:

```markdown
### [TODO] TASK-01: Naslov taska

> KRITIČNO: Pročitaj CLAUDE.md projekta i drži se smjernica!

**Priority**: HIGH / MEDIUM / LOW

**Description**:
Opis što treba napraviti.

**Acceptance Criteria**:
- [ ] Kriterij 1
- [ ] Kriterij 2
```

### Korak 4: Pokreni Ralpha

```bash
ralph --prd docs/ralph/FEATURE-naziv.md
```

---

## Konvencija Imenovanja PRD Fajlova

```
docs/ralph/
├── PHASE-01-setup.md      ← Faza razvoja (više povezanih taskova)
├── PHASE-02-auth.md
├── FEATURE-dark-mode.md   ← Pojedinačna funkcionalnost
├── HOTFIX-001-login.md    ← Hitni bugfix
└── REFACTOR-api.md        ← Refactoring
```

| Prefiks | Korištenje |
|---------|------------|
| `PHASE-XX-` | Razvojne faze |
| `FEATURE-` | Nove funkcionalnosti |
| `HOTFIX-XXX-` | Hitni popravci |
| `REFACTOR-` | Refactoring |

---

## Što Se Događa Kad Ralph Radi?

```
┌─────────────────────────────────────────────────────────┐
│                    RALPH LOOP                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ITERACIJA 1 (nova Claude sesija):                       │
│  → Claude čita CLAUDE.md                                 │
│  → Claude radi na tasku                                  │
│  → Ralph sprema progress                                 │
│                                                          │
│  ITERACIJA 2 (nova Claude sesija):                       │
│  → Claude čita progress od iteracije 1                   │
│  → Claude nastavlja rad                                  │
│  → Ralph sprema progress                                 │
│                                                          │
│  ... (ponavlja dok task nije gotov)                      │
│                                                          │
│  ZAVRŠETAK:                                              │
│  → Ralph mijenja [TODO] → [DONE] u PRD fajlu             │
│  → Prelazi na sljedeći task                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Progress i Logovi

Ralph automatski kreira `.ralph/` folder:

```
.ralph/
├── progress.txt     ← Čitljiv log (što je napravljeno)
├── state.json       ← JSON stanje
└── logs/
    ├── iteration-001-prompt.txt
    ├── iteration-001-output.txt
    └── ...
```

---

## Sve Opcije

```bash
ralph --help                     # Pomoć
ralph "task" --max-iterations 10 # Max broj iteracija
ralph "task" --verbose           # Detaljan output
ralph "task" --dry-run           # Samo pokaži što bi radio
ralph --prd FILE.md              # PRD mode
ralph --prd FILE.md --dry-run    # Pokaži taskove iz PRD-a
```

---

## Kada Koristiti Ralpha?

| Situacija | Ralph? | Razlog |
|-----------|--------|--------|
| Fix od 2 linije | NE | Preoverkill |
| Srednji task (30 min) | DA | Vrijedi |
| Kompleksna faza | DA | PRD mode |
| Noćni development | DA | Idealno |

---

## Brzi Start

```bash
# 1. Kreiraj PRD
mkdir -p docs/ralph
cp /opt/sharp-ralph/templates/PRD-TEMPLATE.md docs/ralph/FEATURE-xyz.md

# 2. Uredi PRD (dodaj taskove)
nano docs/ralph/FEATURE-xyz.md

# 3. Pokreni
ralph --prd docs/ralph/FEATURE-xyz.md

# Ili iz /root:
ralph --prd /var/www/vhosts/PROJEKT/httpdocs/docs/ralph/FEATURE-xyz.md
```

---

**Lokacija instalacije**: `/opt/sharp-ralph/`
**Template**: `/opt/sharp-ralph/templates/PRD-TEMPLATE.md`
**Dostupno svima**: `/usr/local/bin/ralph`
