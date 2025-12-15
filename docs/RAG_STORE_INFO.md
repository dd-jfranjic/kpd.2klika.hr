# Gemini RAG Store - KPD 2025

**Status**: KREIRAN - ČEKA NOVI API KEY
**Datum**: 2025-12-13

---

## Store Informacije

| Polje | Vrijednost |
|-------|------------|
| **Store Name** | `kpd-2025` |
| **Store ID** | `fileSearchStores/kpd-2025-klasifikacija-6g9v4clu15pc` |
| **Display Name** | KPD 2025 Klasifikacija |
| **Uploaded File** | kpd_2025_rag.txt (519 KB) |
| **Total Codes** | 5,701 |
| **Categories** | 22 sektora (A-V) |

---

## Potrebne akcije

### 1. Generiraj novi Gemini API Key

Stari key (`AIzaSyBUw_...`) je označen kao kompromitiran.

1. Idi na: https://aistudio.google.com/apikey
2. Kreiraj novi API key
3. Ažuriraj u `/var/www/vhosts/kpd.2klika.hr/httpdocs/.env`:
   ```
   GEMINI_API_KEY=novi_key_ovdje
   ```
4. Restart Docker:
   ```bash
   cd /var/www/vhosts/kpd.2klika.hr/httpdocs
   docker compose -f docker/docker-compose.prod.yml down
   docker compose -f docker/docker-compose.prod.yml up -d
   ```

### 2. Test RAG query

```bash
GEMINI_API_KEY=NOVI_KEY python3 /root/tools/gemini-rag/gemini_rag.py query kpd-2025 "Koja je KPD šifra za izradu mobilnih aplikacija?" --verbose
```

---

## Korištenje u kodu

### Backend RAG Service

```typescript
// RAG Store ID za korištenje u kodu
const RAG_STORE_ID = 'fileSearchStores/kpd-2025-klasifikacija-6g9v4clu15pc';

// Ili iz SystemConfig tablice
const ragStoreId = await systemConfigService.get('RAG_STORE_ID');
```

### Admin Panel

RAG Store ID treba dodati u SystemConfig tablicu za upravljanje iz admin panela:
- Key: `RAG_STORE_ID`
- Value: `fileSearchStores/kpd-2025-klasifikacija-6g9v4clu15pc`

---

## Database Status

```sql
-- Provjera importiranih kodova
SELECT level, COUNT(*) FROM "KpdCode" GROUP BY level ORDER BY level;

-- Rezultat:
-- level | count
-- ------+-------
--     1 |    87
--     2 |   284
--     3 |   644
--     4 |  1421
--     5 |  3265
```

---

**Sljedeći koraci**: Implementirati backend KPD modul koji koristi ovaj RAG store za AI klasifikaciju.
