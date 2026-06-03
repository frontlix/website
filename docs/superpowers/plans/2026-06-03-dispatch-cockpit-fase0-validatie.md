# Dispatch Cockpit — Fase 0: Validatie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Let op:** dit is een VALIDATIEplan (systeemtests op de echte Mac), geen productie-code — TDD is hier niet van toepassing. Stappen gemarkeerd met **[EIGENAAR]** vereisen fysieke actie van de eigenaar (telefoon, sudo, dichtklappen); de uitvoerende agent vraagt daarom en wacht.

**Goal:** Bewijzen dat alle bouwstenen van het Dispatch Cockpit werken op de echte MacBook Air M4 vóór 15 juni 2026, met een gedocumenteerde go/no-go per onderdeel.

**Architecture:** Zes onafhankelijke validatietests (0a-0f uit de spec §7) die elk een aanname uit `docs/superpowers/specs/2026-06-03-dispatch-cockpit-design.md` toetsen. Resultaten worden in dit document gelogd (sectie "Resultatenlog"); Task 8 werkt de spec bij en velt het eindoordeel.

**Tech Stack:** Claude Code 2.1.161 (geverifieerd aanwezig), Terminal.app (geverifieerd: enige terminal), Tailscale (te installeren), pmset/powermetrics, Slack incoming webhook, bash.

**Vooraf geverifieerde feiten (2026-06-03):**
- `claude --version` → 2.1.161 ✅ (vereist: ≥2.1.51 remote control, ≥2.1.110 push)
- Geen iTerm2/Ghostty/Warp in /Applications → Terminal.app is de terminal (spec §8.3 beslist)
- `pmset -g`: `powernap 1`, `disablesleep` niet gezet, `displaysleep 0` → moet aangepast (Task 4)
- Tailscale + Hammerspoon niet geïnstalleerd
- Hardware: MacBook Air M4, 16 GB — **fanless**, dus Task 5 (thermiek) is kritiek

---

### Task 1: Werkmap + resultatenlog + baseline

**Files:**
- Create: `dispatch-cockpit/fase0/README.md`
- Create: `dispatch-cockpit/fase0/baseline-pmset.txt`

- [ ] **Step 1: Maak de fase 0-werkmap met README**

```bash
mkdir -p "dispatch-cockpit/fase0"
cat > "dispatch-cockpit/fase0/README.md" <<'EOF'
# Fase 0 — validatie-artefacten Dispatch Cockpit

Wegwerp-scripts en meetlogs voor de fase 0-validatie.
Zie docs/superpowers/plans/2026-06-03-dispatch-cockpit-fase0-validatie.md
voor het plan en docs/superpowers/specs/2026-06-03-dispatch-cockpit-design.md voor de spec.
Logbestanden (*.log) worden niet gecommit.
EOF
```

- [ ] **Step 2: Leg de pmset-baseline vast (om later te kunnen herstellen)**

```bash
pmset -g > "dispatch-cockpit/fase0/baseline-pmset.txt" && cat "dispatch-cockpit/fase0/baseline-pmset.txt"
```

Expected: bestand met o.a. `powernap 1` en zonder `SleepDisabled 1`.

- [ ] **Step 3: Voeg logbestanden toe aan .gitignore**

Voeg toe aan `.gitignore` (onderaan):

```
dispatch-cockpit/fase0/*.log
```

- [ ] **Step 4: Commit**

```bash
git add dispatch-cockpit/fase0/README.md dispatch-cockpit/fase0/baseline-pmset.txt .gitignore
git commit -m "chore(dispatch): fase 0 werkmap + pmset-baseline"
```

---

### Task 2 (test 0a): Remote Control + Claude-app op de telefoon

**Files:**
- Create: `~/dispatch-test/` (test-git-repo BUITEN deze website-repo, wegwerp)

- [ ] **Step 1: Verifieer de actuele remote-control vlag-syntax (research preview — kan afwijken van de docs)**

```bash
claude remote-control --help
```

Expected: helptekst met `--spawn` en `--capacity` (of equivalente vlaggen). Wijkt de syntax af → noteer de werkelijke vlaggen in het Resultatenlog en gebruik die in de volgende stappen.

- [ ] **Step 2: Maak een wegwerp-test-repo (NIET de website-repo — eerst veilig testen)**

```bash
mkdir -p ~/dispatch-test && cd ~/dispatch-test && git init -b main \
  && echo "# Dispatch test" > README.md \
  && git add README.md && git commit -m "init"
```

Expected: `Initial commit` aangemaakt.

- [ ] **Step 3: [EIGENAAR] Start de remote-control server in een eigen Terminal-venster**

Eigenaar typt in een NIEUW Terminal-venster (blijft open staan):

```bash
cd ~/dispatch-test && claude remote-control --spawn=worktree --capacity=3
```

Expected: server start, toont QR-code (zo niet: spatiebalk voor QR).

- [ ] **Step 4: [EIGENAAR] Koppel de iPhone**

Eigenaar: Claude-app op iPhone openen → QR-code scannen → de Mac verschijnt als beschikbare machine.

- [ ] **Step 5: [EIGENAAR] Stuur een testtaak vanaf de telefoon**

Eigenaar stuurt vanaf de iPhone de taak: *"Maak een bestand hello.txt met de tekst 'dispatch werkt' en commit het."*

- [ ] **Step 6: Verifieer worktree-isolatie en resultaat op de Mac**

```bash
cd ~/dispatch-test && git worktree list && ls -la
```

Expected: minstens één extra worktree aangemaakt door de sessie; `hello.txt` bestaat in die worktree (niet per se in de hoofdmap).

- [ ] **Step 7: [EIGENAAR] Verifieer de push-notificatie**

Eigenaar: kreeg de iPhone een push-notificatie van de Claude-app toen de taak klaar was (evt. eerst in Claude-app instellingen push aanzetten)? Noteer ja/nee.

- [ ] **Step 8: Log resultaat 0a in het Resultatenlog (onderaan dit document) en commit**

```bash
git add docs/superpowers/plans/2026-06-03-dispatch-cockpit-fase0-validatie.md
git commit -m "docs(dispatch): resultaat validatie 0a remote control"
```

---

### Task 3 (test 0f): Taak-injectie — hoe krijgt de runner straks een taak in een sessie?

Doel: minstens één van de twee mechanismen aantoonbaar werkend krijgen. Dit beslist de runner-architectuur van fase 1.

**Files:**
- Create: `dispatch-cockpit/fase0/spawn-session.sh`

- [ ] **Step 1: Mechanisme A — scriptbaar Terminal-venster met unieke titel + startprompt**

```bash
cat > "dispatch-cockpit/fase0/spawn-session.sh" <<'EOF'
#!/bin/bash
# Spawnt een Terminal.app-venster met unieke titel dat een Claude-sessie start met een startprompt.
# Gebruik: ./spawn-session.sh "CLAUDE-1" "Vat de README van deze repo samen" ~/dispatch-test
TITLE="$1"; PROMPT="$2"; WORKDIR="$3"
osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  set newTab to do script "cd '$WORKDIR' && printf '\\\\033]0;$TITLE\\\\007' && claude \"$PROMPT\""
  set custom title of front window to "$TITLE"
end tell
APPLESCRIPT
EOF
chmod +x "dispatch-cockpit/fase0/spawn-session.sh"
```

- [ ] **Step 2: Test mechanisme A**

```bash
"dispatch-cockpit/fase0/spawn-session.sh" "CLAUDE-TEST-1" "Zeg alleen: injectie werkt" ~/dispatch-test
```

Expected: nieuw Terminal-venster opent met titel `CLAUDE-TEST-1`, Claude start interactief met de prompt al ingevoerd. (Eerste keer kan macOS om Automation-permissie vragen — **[EIGENAAR]** keurt goed.)

- [ ] **Step 3: Controleer de venstertitel programmatisch (nodig voor Hammerspoon in fase 1)**

```bash
osascript -e 'tell application "Terminal" to get custom title of front window'
```

Expected: `CLAUDE-TEST-1`.

- [ ] **Step 4: Mechanisme B — Channels (webhook): verifieer beschikbaarheid en syntax**

```bash
claude --help 2>&1 | grep -iA2 channel; claude channels --help 2>&1 | head -30
```

Expected: documentatie van de channels-vlag/subcommand (v2.1.80+; research preview — syntax kan afwijken). Noteer wat er werkelijk is.

- [ ] **Step 5: Test mechanisme B alleen als Step 4 een webhook-receiver toont**

Indien beschikbaar: start een sessie met webhook-channel volgens de help-output, stuur met `curl` een test-event naar de lokale receiver en kijk of het event in de sessie verschijnt. Indien niet beschikbaar/te instabiel: noteer "B niet beschikbaar in 2.1.161" — mechanisme A volstaat voor go.

- [ ] **Step 6: Log resultaat 0f (welk mechanisme wint en waarom) en commit**

```bash
git add dispatch-cockpit/fase0/spawn-session.sh docs/superpowers/plans/2026-06-03-dispatch-cockpit-fase0-validatie.md
git commit -m "docs(dispatch): resultaat validatie 0f taak-injectie"
```

---

### Task 4 (test 0b): Clamshell-nachttest

**Files:**
- Create: `dispatch-cockpit/fase0/wake-logger.sh`

- [ ] **Step 1: [EIGENAAR] Zet de slaapinstellingen (sudo vereist — eigenaar typt `! sudo ...` of geeft per stap akkoord)**

```bash
sudo pmset -a disablesleep 1 && sudo pmset -a powernap 0 && pmset -g | grep -E "SleepDisabled|powernap"
```

Expected: `SleepDisabled 1` en `powernap 0`.

- [ ] **Step 2: Maak en start de wake-logger**

```bash
cat > "dispatch-cockpit/fase0/wake-logger.sh" <<'EOF'
#!/bin/bash
# Logt elke 60 s epoch + leesbare timestamp. Gaten in het log = de Mac heeft geslapen.
while true; do date "+%s %Y-%m-%d %H:%M:%S" >> "$(dirname "$0")/wake.log"; sleep 60; done
EOF
chmod +x "dispatch-cockpit/fase0/wake-logger.sh"
nohup "dispatch-cockpit/fase0/wake-logger.sh" >/dev/null 2>&1 &
echo "logger gestart, pid $!"
```

- [ ] **Step 3: [EIGENAAR] Avond: klap de MacBook dicht**

Schermen + voeding aangesloten LATEN. Niets afsluiten. Slaap lekker.

- [ ] **Step 4: Ochtend: analyseer het log op gaten**

```bash
awk 'NR>1 && $1-p>90 { print "GAT: " prev " -> " $0 } { p=$1; prev=$0 }' "dispatch-cockpit/fase0/wake.log"; echo "---"; wc -l "dispatch-cockpit/fase0/wake.log"
```

Expected (GO): geen `GAT`-regels gedurende de nacht. Elke gap >90 s = de Mac heeft geslapen → FAIL, oorzaak zoeken (voeding? scherm uitgevallen?).

- [ ] **Step 5: Stop de logger, log resultaat 0b en commit**

```bash
pkill -f wake-logger.sh
git add dispatch-cockpit/fase0/wake-logger.sh docs/superpowers/plans/2026-06-03-dispatch-cockpit-fase0-validatie.md
git commit -m "docs(dispatch): resultaat validatie 0b clamshell-nachttest"
```

---

### Task 5 (test 0c): Thermiek — 3 agents parallel op een fanless Air

**Files:**
- Create: `dispatch-cockpit/fase0/thermal-watch.sh`

- [ ] **Step 1: Maak het meetscript**

```bash
cat > "dispatch-cockpit/fase0/thermal-watch.sh" <<'EOF'
#!/bin/bash
# Logt elke 30 s de thermal pressure en CPU speed limit. Stop met Ctrl-C.
LOG="$(dirname "$0")/thermal.log"
while true; do
  TS=$(date "+%H:%M:%S")
  THERM=$(pmset -g therm | tr '\n' ' ')
  echo "$TS $THERM" >> "$LOG"
  sleep 30
done
EOF
chmod +x "dispatch-cockpit/fase0/thermal-watch.sh"
```

- [ ] **Step 2: Start de meting**

```bash
nohup "dispatch-cockpit/fase0/thermal-watch.sh" >/dev/null 2>&1 & echo "meting gestart, pid $!"
```

- [ ] **Step 3: [EIGENAAR] Start 3 parallelle sessies met realistisch zwaar werk**

Vanaf de iPhone (via de remote-control-koppeling uit Task 2) of via 3× `spawn-session.sh`, drie taken tegelijk, bijv.:
1. *"Analyseer de hele codebase van deze repo en schrijf een architectuurrapport"* (in `~/dispatch-test` met een gekloonde kopie van de website-repo)
2. *"Draai npm install en npm run build en analyseer de output"*
3. *"Zoek alle TODO's en schrijf per stuk een aanpak"*

Laat ze 20-30 minuten draaien.

- [ ] **Step 4: Analyseer het thermische log**

```bash
grep -oE "CPU_Speed_Limit\s*=\s*[0-9]+" "dispatch-cockpit/fase0/thermal.log" | sort | uniq -c
```

Expected (GO): `CPU_Speed_Limit = 100` domineert; korte dips naar ≥80 acceptabel. Langdurig <80 op een fanless Air = noteer als beperking → advies max 2 parallelle agents bij bouw-taken.

- [ ] **Step 5: Stop de meting, log resultaat 0c en commit**

```bash
pkill -f thermal-watch.sh
git add dispatch-cockpit/fase0/thermal-watch.sh docs/superpowers/plans/2026-06-03-dispatch-cockpit-fase0-validatie.md
git commit -m "docs(dispatch): resultaat validatie 0c thermiek"
```

---

### Task 6 (test 0d): Tailscale + streaming op 4G

**Files:**
- Create: `dispatch-cockpit/fase0/sse-test-server.mjs`

- [ ] **Step 1: Installeer Tailscale op de Mac**

```bash
brew install --cask tailscale && open -a Tailscale
```

Expected: Tailscale-menubalk-icoon verschijnt. **[EIGENAAR]** logt in (Google, frontlixx@gmail.com).

- [ ] **Step 2: [EIGENAAR] Installeer Tailscale op de iPhone**

App Store → Tailscale → inloggen met hetzelfde account → VPN-profiel goedkeuren.

- [ ] **Step 3: Maak een SSE-teststream (simuleert live agent-output)**

```bash
cat > "dispatch-cockpit/fase0/sse-test-server.mjs" <<'EOF'
// Minimale SSE-server: stuurt elke seconde een genummerd event.
// Test: blijft de stream lopen op 4G met het scherm even uit?
import { createServer } from 'node:http';
createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  let n = 0;
  const t = setInterval(() => res.write(`data: tick ${++n} ${new Date().toISOString()}\n\n`), 1000);
  req.on('close', () => clearInterval(t));
}).listen(8080, () => console.log('SSE op :8080'));
EOF
node "dispatch-cockpit/fase0/sse-test-server.mjs" &
```

Expected: `SSE op :8080`.

- [ ] **Step 4: Serveer binnen het tailnet (HTTPS, géén publiek endpoint)**

```bash
tailscale serve --bg 8080 && tailscale serve status
```

Expected: status toont een `https://<machinenaam>.<tailnet>.ts.net` URL die naar localhost:8080 proxyt. (Syntax gewijzigd? Check `tailscale serve --help` en noteer.)

- [ ] **Step 5: [EIGENAAR] Test op 4G**

iPhone: wifi UIT (echt 4G/5G), Tailscale-VPN aan → open de ts.net-URL in Safari. Verwacht: elke seconde een nieuwe `tick`-regel. Dan: scherm 30 s uit → weer aan: loopt/herstelt de stream? Daarna: Safari naar achtergrond, 2 min wachten, terug: herstelt hij? Noteer per scenario.

- [ ] **Step 6: Stop testservers, log resultaat 0d en commit**

```bash
tailscale serve --https=443 off 2>/dev/null; pkill -f sse-test-server
git add dispatch-cockpit/fase0/sse-test-server.mjs docs/superpowers/plans/2026-06-03-dispatch-cockpit-fase0-validatie.md
git commit -m "docs(dispatch): resultaat validatie 0d tailscale 4G"
```

---

### Task 7 (test 0e): Slack-push naar de iPhone

- [ ] **Step 1: [EIGENAAR] Maak een incoming webhook voor een nieuw kanaal #frontlix-dispatch**

In Slack: kanaal `#frontlix-dispatch` aanmaken → api.slack.com/apps → bestaande Frontlix-app → Incoming Webhooks → Add New Webhook → kanaal kiezen. Webhook-URL NIET in de chat plakken en NIET in git — eigenaar zet hem zelf in `~/.frontlix-dispatch-webhook` (via nano, conform secret-beleid):

```bash
nano ~/.frontlix-dispatch-webhook   # plak de URL, sla op
chmod 600 ~/.frontlix-dispatch-webhook
```

- [ ] **Step 2: Stuur een testmelding**

```bash
curl -s -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚀 Dispatch Cockpit validatie 0e: als je dit als push op je iPhone ziet, is dit kanaal GO."}' \
  "$(cat ~/.frontlix-dispatch-webhook)"
```

Expected: `ok` als response.

- [ ] **Step 3: [EIGENAAR] Verifieer de push op de iPhone**

Slack-app: kwam de melding binnen als push (vergrendeld scherm)? Zo nee: kanaal-notificaties op "All messages" zetten en herhalen. Noteer ja/nee.

- [ ] **Step 4: Log resultaat 0e en commit**

```bash
git add docs/superpowers/plans/2026-06-03-dispatch-cockpit-fase0-validatie.md
git commit -m "docs(dispatch): resultaat validatie 0e slack-push"
```

---

### Task 8: Go/no-go-rapport + spec bijwerken

- [ ] **Step 1: Vul het Resultatenlog hieronder volledig in** (elke test GO/NO-GO + bevindingen)

- [ ] **Step 2: Werk de spec bij**

In `docs/superpowers/specs/2026-06-03-dispatch-cockpit-design.md` §8 (Open punten):
- §8.2 runner→sessie-injectie: vervang door het gekozen mechanisme (uitkomst Task 3)
- §8.3 terminal-keuze: al beslist → Terminal.app (noteer)
- §8.4/§8.5: uitkomsten Tailscale-4G-test en thermiek-test verwerken; bij thermische beperking het parallel-plafond in §6 aanpassen

- [ ] **Step 3: Eindoordeel formuleren**

GO voor fase 1 als: 0a werkt, 0f heeft één werkend mechanisme, 0b geen slaap-gaten, 0e Slack-push komt aan. 0c/0d-beperkingen zijn geen blockers maar ontwerp-input (minder parallel / reconnect-UX).

- [ ] **Step 4: Commit + push branch**

```bash
git add -A docs/ dispatch-cockpit/
git commit -m "docs(dispatch): fase 0 afgerond — go/no-go-rapport + spec-update"
```

---

## Resultatenlog

| Test | Datum | Resultaat | Bevindingen |
|---|---|---|---|
| 0a Remote Control + app | | | |
| 0f Taak-injectie (A: terminal-spawn / B: channels) | | | |
| 0b Clamshell-nacht | | | |
| 0c Thermiek 3 agents | | | |
| 0d Tailscale 4G + SSE | | | |
| 0e Slack-push | | | |

**Eindoordeel fase 0:** _(in te vullen)_

**Vlag-syntax-afwijkingen t.o.v. docs:** _(in te vullen indien gevonden)_
