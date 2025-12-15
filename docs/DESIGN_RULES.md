# DESIGN RULES - KPD 2klika

**Verzija**: 1.0
**Referencirano iz**: MASTER_PLAN.md, sve PHASE_*.md datoteke

---

## ZLATNO PRAVILO: NO INLINE STYLES!

```
ZABRANJENO:
<div style={{ color: 'green', padding: '10px' }}>

ISPRAVNO:
<div className={styles.container}>
// ili
<div className="container">
```

**Svi stilovi idu u CSS fajlove:**
- `globals.css` - globalni stilovi, tema, boje
- `[component].module.css` - komponenta-specificni stilovi
- Tailwind klase - OK za utility

---

## UI/UX PRINCIPI

```
 Decentno, pregledno, cisto
 Dobar kontrast - sve mora biti citljivo
 Minimalisticno - manje je vise
 Konzistentno - isti stilovi kroz cijelu app

 NE smije izgledati "AI generirano"
 NE previse boja, gradijenata, sjena
 NE Comic Sans ili fancy fontovi
```

---

## BOJE (FiskalAI Tema)

```css
:root {
  /* Primary */
  --color-primary: #10B981;        /* Zelena */
  --color-primary-dark: #059669;
  --color-primary-light: #D1FAE5;

  /* Backgrounds */
  --color-background: #F9FAFB;
  --color-surface: #FFFFFF;

  /* Text */
  --color-text: #111827;
  --color-text-muted: #6B7280;
  --color-text-light: #9CA3AF;

  /* Borders */
  --color-border: #E5E7EB;
  --color-border-dark: #D1D5DB;

  /* States */
  --color-success: #10B981;
  --color-error: #EF4444;
  --color-warning: #F59E0B;
  --color-info: #3B82F6;
}
```

---

## RESPONZIVNOST - OBAVEZNO!

### Mobile-First Pristup

```css
/* Base = mobile */
.container {
  padding: 1rem;
}

/* Tablet i vece */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 3rem;
    max-width: 1200px;
  }
}
```

### Breakpoints (Tailwind):

| Breakpoint | Min Width | Primjer |
|------------|-----------|---------|
| `sm` | 640px | Telefoni landscape |
| `md` | 768px | Tableti |
| `lg` | 1024px | Laptopi |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Veliki monitori |

### Testiranje:
- UVIJEK testirati na mobitelima prije pusha
- Chrome DevTools > Toggle device toolbar
- Testirati na: iPhone SE, iPhone 14, iPad, Desktop

---

## TIPOGRAFIJA

### Font Stack:

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
```

### Font Sizes:

| Klasa | Size | Upotreba |
|-------|------|----------|
| `text-xs` | 12px | Labels, hints |
| `text-sm` | 14px | Secondary text |
| `text-base` | 16px | Body text |
| `text-lg` | 18px | Subheadings |
| `text-xl` | 20px | Section titles |
| `text-2xl` | 24px | Page titles |
| `text-3xl` | 30px | Hero headings |

---

## SPACING

Koristiti Tailwind spacing scale:

| Klasa | Value | Upotreba |
|-------|-------|----------|
| `p-1` | 4px | Minimum |
| `p-2` | 8px | Tight |
| `p-3` | 12px | Compact |
| `p-4` | 16px | Normal |
| `p-6` | 24px | Comfortable |
| `p-8` | 32px | Spacious |

---

## KOMPONENTE - Kopirati iz FiskalAI

### KPD Tool Struktura:

```
+----------------------------------------------------------+
|  AI PRETRAGA                                              |
|  +------------------------------------------------------+ |
|  | Unesite naziv djelatnosti ili opis...               | |
|  +------------------------------------------------------+ |
|  [Pretrazi]                                              |
|                                                          |
|  AI Prijedlozi:                                          |
|  +------------------------------------------------------+|
|  | 62.01.11 - Programiranje (92% match)           [+]  ||
|  | 62.01.12 - Izrada web stranica (78%)           [+]  ||
|  | 62.02 - Savjetovanje (65%)                     [+]  ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
|  KPD SIFRARNIK (Tree View)                               |
|  +------------------------------------------------------+|
|  | > A - Poljoprivreda                                  ||
|  | > B - Rudarstvo                                      ||
|  | v J - Informacije i komunikacije                     ||
|  |   > 62 - Racunalno programiranje                     ||
|  |     > 62.01 - Programiranje                          ||
|  |       * 62.01.11 - Izrada softvera                  ||
|  |       * 62.01.12 - Web development                   ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

### Komponente za kopirati:

```
FiskalAI Putanja                           -> KPD Putanja
-----------------------------------------------------------------
/components/kpd/KpdLookupTool.tsx          -> Glavni tool wrapper
/components/kpd/KpdSearchInput.tsx         -> AI search input
/components/kpd/KpdSuggestions.tsx         -> AI prijedlozi lista
/components/kpd/KpdTreeView.tsx            -> Tree browser
/components/kpd/KpdCodeItem.tsx            -> Pojedinacna sifra
/styles/kpd.module.css                     -> Svi KPD stilovi
```

---

## AUTH STRANICE (Login/Register)

### Vizualno: 1:1 kopija FiskalAI dizajna

**Layout:**
```
+----------------------------------------------------------+
|                                                          |
|              [LOGO KPD 2klika]                           |
|                                                          |
|         +--------------------------------+                |
|         |                                |                |
|         |   Prijavite se u KPD 2klika   |                |
|         |                                |                |
|         |   Email:                       |                |
|         |   [________________________]   |                |
|         |                                |                |
|         |   Lozinka:                     |                |
|         |   [________________________]   |                |
|         |                                |                |
|         |   [     Prijavi se     ]       |                |
|         |                                |                |
|         |   Nemate racun? Registrirajte se|               |
|         |                                |                |
|         +--------------------------------+                |
|                                                          |
+----------------------------------------------------------+
```

**Tekst zamjene:**

| FiskalAI | KPD |
|----------|-----|
| "FiskalAI" | "KPD 2klika" |
| "Fiskalizacija" | "KPD Klasifikacija" |
| "Prijavite se u FiskalAI" | "Prijavite se u KPD 2klika" |
| "Kreirajte FiskalAI racun" | "Kreirajte KPD racun" |

---

## BUTTONS

### Primary Button:

```css
.btn-primary {
  background-color: #10B981;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #059669;
}
```

### Secondary Button:

```css
.btn-secondary {
  background-color: transparent;
  color: #10B981;
  border: 1px solid #10B981;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
}
```

---

## INPUTS

```css
.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #E5E7EB;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input:focus {
  outline: none;
  border-color: #10B981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.input-error {
  border-color: #EF4444;
}
```

---

## CARDS

```css
.card {
  background-color: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.card-header {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #111827;
}
```

---

## ALAT ZA DIZAJN

Koristiti `frontend-design` skill za UI/UX pomoc:

```
Skill: frontend-design
```

Ovaj skill automatski primjenjuje:
- Responsive dizajn
- Pristupacnost (a11y)
- Moderne UI prakse
- Konzistentne stilove

---

## CHECKLIST PRIJE SVAKE KOMPONENTE

- [ ] Svi stilovi u CSS fajlu (ne inline)
- [ ] Responzivan layout (mobile-first)
- [ ] Koristene CSS varijable za boje
- [ ] Dobar kontrast teksta
- [ ] Hover states na interaktivnim elementima
- [ ] Focus states za a11y
- [ ] Testirano na mobilnom viewportu

---

**Veza s fazama:**
- Koristi se u: PHASE_4_KPD_TOOL.md, PHASE_5_DASHBOARD.md
- Referencirano iz: svih frontend zadataka
