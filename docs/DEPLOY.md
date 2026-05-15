# Deploy — Frontlix productie

Dit document beschrijft de complete deploy-flow naar de Hostinger VPS. Lees 'm voordat je iets pushed dat in productie moet landen.

---

## TL;DR — de happy path

```bash
# 1. Lokale build check (vangt TS-fouten af voor push)
cd "/Users/christiaantromp/Desktop/Frontlix website"
npm run build

# 2. Commit + push naar GitHub
git add <files>
git commit -m "..."
git push origin main

# 3. VPS deploy via SSH (één commando-keten)
ssh root@72.61.23.186 "cd /var/www/frontlix && git pull origin main && npm run build && pm2 restart frontlix"

# 4. Health check
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://app.frontlix.com/dashboard/login
```

**Health-check codes**: `307` of `200` = gezond · `502` = nog aan't booten of crash · `500` = kapot.

---

## VPS-toegang

- **Host**: `72.61.23.186` (Hostinger VPS, Ubuntu)
- **User**: `root`
- **SSH-key**: `~/.ssh/id_ed25519` (zonder passphrase — default key, dus geen `-i` flag nodig)
- **Host-fingerprint**: staat in `~/.ssh/known_hosts` op de eigenaars-Mac. Op een schone machine 1× accepteren via interactieve SSH.

---

## Belangrijke paden op de VPS

| Wat | Pad |
| --- | --- |
| Dashboard-app (deze repo) | `/var/www/frontlix` |
| Dashboard env-vars | `/var/www/frontlix/.env.local` |
| Bot-app | `/var/www/schoon-straatje-assistent` |
| Bot env-vars | `/var/www/schoon-straatje-assistent/.env` |
| Nginx vhosts | `/etc/nginx/sites-available/` |

---

## PM2-processen

| Proces | Wat |
| --- | --- |
| `frontlix` | Next.js dashboard + marketing-site (poort 3000) |
| `schoon-straatje` | bot (poort 3002 voor dashboard-api) |
| `lead-automation` | Python FastAPI lead-automation service |
| `coprivat-*` | andere klanten / projecten |

Status: `pm2 list` · logs: `pm2 logs frontlix --lines 50`.

---

## Domeinen

- `https://app.frontlix.com` → dashboard (via `frontlix` proces)
- `https://frontlix.com` → marketing-site (zelfde proces)
- `https://schoonstraatje.frontlix.com` → bot (via `schoon-straatje` proces)
- `https://schoonstraatje.nl` → bot (oude domein, ook actief)

---

## Wat agents wel/niet mogen

**Wel mogen**:
- Lokale `npm run build` draaien
- Commit + push naar `main` na een geslaagde build
- De SSH-deploy-keten runnen (`git pull && npm run build && pm2 restart frontlix`)
- Health-checks via `curl`
- Env-vars in `/var/www/frontlix/.env.local` aanvullen via SSH (append-only, met backup — zie sectie [Env-vars](#env-vars))

**NIET mogen**:
- ❌ Database-migraties direct draaien op productie. Migraties (`supabase/migrations-frontlix/*.sql`) draait de eigenaar zelf via Supabase Studio.
- ❌ Bestaande env-var-waarden in `.env.local` stilletjes overschrijven (alleen na expliciete bevestiging van de eigenaar)
- ❌ Secret-waarden uit `.env.local` in chat-output of logs teruggeven (lezen voor transport mag, weergeven niet)
- ❌ `--no-verify` op git-commits gebruiken (skipt pre-commit hooks)
- ❌ `node_modules/` of `.next/` committen
- ❌ Force-push naar `main` (`git push --force`) zonder expliciete toestemming

**Push pas naar `main` na een geslaagde lokale `npm run build`** — dit voorkomt dat TypeScript-fouten op de VPS belanden. CLAUDE.md-regel; geldt zonder uitzondering.

---

## Env-vars

Hele lijst van env-var-namen staat in [CLAUDE.md](../CLAUDE.md#environment-variables). Productie-`.env.local` zit op de VPS op `/var/www/frontlix/.env.local`.

**Agents mogen ontbrekende env-vars aanvullen via SSH**, mits volgens deze regels:

1. **Backup vóór elke edit** — altijd eerst kopiëren naar timestamped bestand:
   ```bash
   cp /var/www/frontlix/.env.local /var/www/frontlix/.env.local.bak.$(date +%Y%m%d-%H%M%S)
   ```
2. **Append-only voor nieuwe vars** — checken of de var al bestaat vóór appenden:
   ```bash
   grep -E "^VAR_NAAM=" /var/www/frontlix/.env.local && echo "EXISTS - stop" || echo "OK - append"
   ```
3. **Bestaande waarden wijzigen vereist expliciete user-bevestiging** — nooit stilletjes overschrijven.
4. **Nooit secret-values in chat outputten** — agents lezen de waarde lokaal en transporteren via SSH, maar tonen 'm niet in respons.
5. **Verifieer na de edit** — exact één regel per var:
   ```bash
   grep -c "^VAR_NAAM=" /var/www/frontlix/.env.local   # → moet 1 zijn
   ```

**`NEXT_PUBLIC_*` vars worden in de JS-bundle gebakken bij `npm run build`** — een `pm2 restart` zonder rebuild laadt nieuwe `NEXT_PUBLIC_` waarden niet. Altijd builden na het wijzigen van zo'n var.

---

## Troubleshooting

**HTTP 502 na deploy**:
- App boot nog (15-30s). Check `pm2 logs frontlix --lines 30` voor errors.
- TypeScript/build failure op VPS terwijl 't lokaal werkte → check Node-versie (`node --version` op VPS vs lokaal).

**HTTP 500**:
- Runtime crash. `pm2 logs frontlix --err --lines 50`. Vaak een ontbrekende env-var of een DB-connectie-fout.

**HTTP 307 op `/dashboard/login` is normaal** — die route redirect anonieme bezoekers naar de signin-flow.

**Productie ziet andere data dan lokaal**:
- Lokale `.env.local` wijst naar `NEXT_PUBLIC_SUPABASE_URL_DASHBOARD` (Schoon Straatje-project), productie ook. Beide moeten in sync.
- Migraties die lokaal zijn gedraaid (en het schema veranderen) moeten óók via Supabase Studio op productie worden toegepast.
