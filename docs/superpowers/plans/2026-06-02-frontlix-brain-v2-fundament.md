# Frontlix Brain v2 — Stap 0: Git-fundament op de VPS (deploy-key)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Dit is een ops-runbook (geen TDD-code); elke stap heeft exacte commando's + verwachte output. Eén stap (Task 2) is een handmatige GitHub-actie voor Chris.

**Goal:** De VPS-kopie van `frontlix-brein` van een rsync-spiegel naar een echte git-clone met read+write-toegang brengen, zodat `git pull` de handmatige rsync vervangt (vault blijft vers) en de latere check-in (C3) kan `git push`en.

**Architecture:** Genereer een ed25519 **deploy-key** op de VPS; registreer de publieke helft als **write-enabled deploy key** op de privé-repo `frontlix/frontlix-brein`; wijs de VPS-remote naar de SSH-URL via een dedicated host-alias; verifieer pull + push.

**Tech Stack:** SSH, git, GitHub deploy keys. VPS = `root@72.61.23.186`, repo op `/var/www/frontlix-brein`.

**Context:** De VPS-repo is nu via rsync neergezet (mét `.git`, remote = `https://github.com/frontlix/frontlix-brein.git`, géén push/pull-auth). `.env` + `node_modules` staan er (gitignored). Spec: `docs/superpowers/specs/2026-06-02-frontlix-brain-v2-design.md` §3.

---

## Task 1: Deploy-key genereren op de VPS

**Vereist:** SSH-toestemming (per afspraak vraag ik vóór de SSH-actie).

- [ ] **Step 1: Genereer de sleutel + toon de publieke helft**

```bash
ssh root@72.61.23.186 '
  ssh-keygen -t ed25519 -f ~/.ssh/frontlix_brein_deploy -N "" -C "frontlix-brein-vps" <<< y >/dev/null 2>&1
  echo "=== PUBLIEKE sleutel (veilig te tonen — plak deze op GitHub) ==="
  cat ~/.ssh/frontlix_brein_deploy.pub
'
```
Expected: één regel `ssh-ed25519 AAAA... frontlix-brein-vps`. (De privé-sleutel blijft op de VPS; nooit tonen.)

---

## Task 2: Deploy-key op GitHub toevoegen — HANDMATIG (Chris)

**Files:** geen. GitHub-UI-actie.

- [ ] **Step 1:** Ga naar `https://github.com/frontlix/frontlix-brein/settings/keys` → **Add deploy key**.
- [ ] **Step 2:** Title: `vps-frontlix-brein`. Key: plak de publieke sleutel uit Task 1. **Vink "Allow write access" AAN** (nodig voor de check-in-push later).
- [ ] **Step 3:** Add key. Laat Claude weten dat het gedaan is.

---

## Task 3: VPS-git op de deploy-key + remote omzetten, dan verifiëren

**Files:** `~/.ssh/config` op de VPS; remote-config van `/var/www/frontlix-brein`.

- [ ] **Step 1: SSH-host-alias instellen** (zodat deze repo exact deze sleutel gebruikt, los van andere keys)

```bash
ssh root@72.61.23.186 '
  grep -q "Host github-brein" ~/.ssh/config 2>/dev/null || printf "\nHost github-brein\n  HostName github.com\n  User git\n  IdentityFile ~/.ssh/frontlix_brein_deploy\n  IdentitiesOnly yes\n" >> ~/.ssh/config
  echo "config:"; tail -6 ~/.ssh/config
'
```
Expected: het `Host github-brein`-blok staat in `~/.ssh/config`.

- [ ] **Step 2: Remote omzetten naar SSH (via de alias) + read-auth testen**

```bash
ssh root@72.61.23.186 '
  cd /var/www/frontlix-brein
  git remote set-url origin git@github-brein:frontlix/frontlix-brein.git
  echo "=== read-auth test (ls-remote) ==="; GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new" git ls-remote origin -h 2>&1 | head -3
'
```
Expected: de remote refs verschijnen (bv. een regel met `refs/heads/main`). Géén "Permission denied".

- [ ] **Step 3: Pull (moet up-to-date zijn) + write-auth verifiëren met een lege commit**

```bash
ssh root@72.61.23.186 '
  cd /var/www/frontlix-brein
  git pull --rebase origin main 2>&1 | tail -2
  git commit --allow-empty -m "chore(vps): verifieer deploy-key write-access" 2>&1 | tail -1
  git push origin main 2>&1 | tail -2
'
```
Expected: `pull` zegt "up to date" (of rebaset schoon); `push` slaagt (`main -> main`). Dit bewijst read+write.

---

## Task 4: Update-workflow documenteren (rsync → git pull)

**Files:** Create `05-ops/vps-brein-deploy.md` in de vault (lokaal: `~/Desktop/Frontlix hulp/frontlix-brain/05-ops/vps-brein-deploy.md`).

- [ ] **Step 1: Schrijf de notitie**

```markdown
---
name: vps-brein-deploy
type: ops
status: live
updated: 2026-06-02
---

# VPS-deploy van de brain (frontlix-brein)

De VPS-kopie staat op `/var/www/frontlix-brein` als git-clone met een **deploy-key**
(`~/.ssh/frontlix_brein_deploy`, host-alias `github-brein`, write-access).

**Updaten (vervangt de oude rsync):**
\`\`\`bash
ssh root@72.61.23.186 'cd /var/www/frontlix-brein && git pull --rebase origin main && npm install --omit=dev'
\`\`\`

- De dagbrief-cron draait `0 7 * * *` (`TZ=Europe/Amsterdam`), log `/var/log/frontlix-brief.log`.
- `.env` (secrets) en `node_modules` staan lokaal op de VPS, niet in git.
- De check-in-cron (C3) committet hier ook naartoe → daarom write-access op de deploy-key.
```

- [ ] **Step 2: Commit + push (lokaal, gaat via de gewone GitHub-push)**

```bash
cd "$HOME/Desktop/Frontlix hulp/frontlix-brain"
git add 05-ops/vps-brein-deploy.md
git commit -m "docs(ops): VPS-brein-deploy via git pull (deploy-key) i.p.v. rsync"
git push
```

- [ ] **Step 3: VPS bijwerken via de nieuwe weg (rookproef van de hele loop)**

```bash
ssh root@72.61.23.186 'cd /var/www/frontlix-brein && git pull --rebase origin main 2>&1 | tail -2 && ls 05-ops/vps-brein-deploy.md'
```
Expected: de pull haalt de nieuwe notitie op; het bestand bestaat op de VPS. Bevestigt dat `git pull` nu werkt als update-mechanisme.

---

## Self-Review (uitgevoerd)

**Spec-dekking (§3):** deploy-key genereren → Task 1 · write-access op GitHub → Task 2 · remote naar SSH + key-config → Task 3 · pull/push verifiëren → Task 3 Step 3 · rsync vervangen door git pull → Task 4. **Gedekt.**

**Placeholders:** geen TBD/TODO. Task 2 is een bewuste, gemarkeerde handmatige GitHub-actie.

**Consistentie:** host-alias `github-brein` + keypad `~/.ssh/frontlix_brein_deploy` identiek in Task 1/3/4. De empty-commit-test (Task 3 Step 3) is de schoonste write-verificatie zonder de repo te vervuilen.
