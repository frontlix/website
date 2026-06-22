"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { updatePricingRulesBatch } from "@/lib/dashboard/pricing-actions";
import { computeRevenueDelta } from "@/lib/dashboard/pricing-impact";
import type { PricingImpactBaseline } from "@/lib/dashboard/pricing-impact-queries";
import type { PricingRuleRow } from "../instellingen-mappers";
import styles from "./PrijzenPanel.module.css";

/** Save-handle die PrijzenPanel bij de parent registreert, zodat de globale
 *  "Opslaan"-knop van de paneelheader de pending prijswijzigingen wegschrijft. */
export type PricingSaveHandle = () => Promise<void> | void;

export interface PrijzenPanelProps {
  /** Alle prijsregels (pricing_rules), gesorteerd op sort_order. */
  rules: PricingRuleRow[];
  /** Wat-als-baseline (laatste 30 leads) voor de omzet-simulator. */
  baseline: PricingImpactBaseline | null;
  /**
   * Registreert een save-functie bij de parent (InstellingenClient). De globale
   * Opslaan-knop roept die aan voor de sectie 'Prijzen'. null = deregistreren
   * bij unmount.
   */
  onRegisterSave?: (handle: PricingSaveHandle | null) => void;
  /**
   * Meldt de parent of er nog niet-opgeslagen prijswijzigingen openstaan, zodat
   * de globale Opslaan-knop bij prijswijzigingen om bevestiging kan vragen.
   */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Categorie-buckets voor de tab-strip. Volgorde hier = volgorde van de tabs.
 * "overig" vangt alles op dat niet matcht, moet altijd laatst staan.
 * Geport uit v1 PrijzenEditor.
 */
const CATEGORIES = [
  { key: "reiniging", label: "Reiniging" },
  { key: "invegen", label: "Invegen en voegzand" },
  { key: "onkruid", label: "Onkruidbeheersing" },
  { key: "reiskosten", label: "Reiskosten" },
  { key: "overig", label: "Overig" },
] as const;
type CategoryKey = (typeof CATEGORIES)[number]["key"];

/**
 * Substring-heuristiek op rule_key. Werkt onafhankelijk van tenant-eigen
 * namen omdat we op semantische delen matchen (reinigen, voegzand, ...).
 * Onbekend valt naar 'overig' zodat we nooit een regel verbergen.
 */
function categorize(ruleKey: string): CategoryKey {
  const k = ruleKey.toLowerCase();
  if (k.startsWith("reinigen") || k.startsWith("reiniging")) return "reiniging";
  // Invegen/voegzand vóór onkruid: de "onkruidwerend"-varianten van invegen en
  // voegzand horen bij invegen, niet bij onkruidbeheersing.
  if (k.includes("voegzand") || k.includes("invegen")) return "invegen";
  if (
    k.startsWith("onkruid") || // onkruid_per_m2_4/8/12_weken + _langer
    k.includes("preventief_onkruid") ||
    k.includes("preventieve_onkruid") ||
    k.startsWith("beschermlaag") || // beschermlaag_per_m2
    k.startsWith("plant") // planten_afschermen_folie_per_rol
  )
    return "onkruid";
  if (k.startsWith("reiskosten")) return "reiskosten";
  return "overig";
}

/** Lege baseline voor de demo-fallback (geen sessie) zodat de math niet crasht. */
const EMPTY_BASELINE: PricingImpactBaseline = {
  leadCount: 0,
  periodStart: null,
  periodEnd: new Date(0).toISOString(),
  baselineRevenue: 0,
  baselineConversion: 0,
  volumes: {},
};

/**
 * v2 Prijzen-editor. Geport uit v1 PrijzenEditor + PricingRuleEditor naar de
 * v2-look (CSS Modules + var(--rb-*)).
 *
 * Model:
 *  - Lokaal verzamelen we wijzigingen in `pending` (rule_key naar nieuwe waarde).
 *  - Opslaan loopt via de globale "Opslaan"-knop van de paneelheader: PrijzenPanel
 *    registreert een save-handle bij de parent (onRegisterSave), die de batch
 *    naar de server stuurt (updatePricingRulesBatch). De sticky omzet-effect-balk
 *    toont vooraf de real-time impact op de laatste N leads.
 *
 * Server-actions worden EXACT hergebruikt; geen nieuwe DB-logica.
 */
export function PrijzenPanel({ rules, baseline, onRegisterSave, onDirtyChange }: PrijzenPanelProps) {
  const router = useRouter();
  const safeBaseline = baseline ?? EMPTY_BASELINE;

  const [pending, setPending] = useState<Record<string, number>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Groepeer regels per categorie zodat we per tab kunnen filteren en weten
  // welke tabs zichtbaar moeten zijn (geen lege tabs tonen).
  const grouped = useMemo(() => {
    const out: Record<CategoryKey, PricingRuleRow[]> = {
      reiniging: [],
      invegen: [],
      onkruid: [],
      reiskosten: [],
      overig: [],
    };
    for (const r of rules) out[categorize(r.rule_key)].push(r);
    return out;
  }, [rules]);

  const visibleTabs = useMemo(
    () => CATEGORIES.filter((c) => grouped[c.key].length > 0),
    [grouped],
  );
  const [activeTab, setActiveTab] = useState<CategoryKey>(
    visibleTabs[0]?.key ?? "reiniging",
  );
  // Als de zichtbare tabs veranderen (data-refresh) en de actieve tab valt weg,
  // spring terug naar de eerste zichtbare.
  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((t) => t.key === activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  const visibleRules = grouped[activeTab] ?? [];

  // Huidige prijzen voor delta-berekening.
  const currentPrices = useMemo<Record<string, number>>(
    () => Object.fromEntries(rules.map((r) => [r.rule_key, r.waarde])),
    [rules],
  );

  // Verwijder pending entries die gelijk zijn aan de huidige waarde (cleanup).
  const cleanPending = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(pending)) {
      if (Math.abs(v - (currentPrices[k] ?? 0)) > 1e-9) out[k] = v;
    }
    return out;
  }, [pending, currentPrices]);

  const pendingCount = Object.keys(cleanPending).length;
  const hasPending = pendingCount > 0;

  const revenueDelta = useMemo(
    () => computeRevenueDelta(safeBaseline.volumes, currentPrices, cleanPending),
    [safeBaseline.volumes, currentPrices, cleanPending],
  );
  const newRevenue = safeBaseline.baselineRevenue + revenueDelta;

  // Meld openstaande prijswijzigingen aan de parent (voor de bevestig-vangrail).
  useEffect(() => {
    onDirtyChange?.(hasPending);
  }, [hasPending, onDirtyChange]);

  // Saved-flash verbergt zich na 2s.
  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 2000);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const handleSetPending = (ruleKey: string, value: number) => {
    setPending((prev) => ({ ...prev, [ruleKey]: value }));
    setSaveError(null);
  };
  const handleClearPending = (ruleKey: string) => {
    setPending((prev) => {
      const { [ruleKey]: _omit, ...rest } = prev;
      void _omit;
      return rest;
    });
    setSaveError(null);
  };

  // De batch-save wordt door de globale Opslaan-knop (paneelheader) getriggerd.
  // We houden cleanPending in een ref zodat de geregistreerde save-handle altijd
  // de actuele wijzigingen ziet, zonder bij elke pending-change opnieuw te
  // (de)registreren.
  const cleanPendingRef = useRef(cleanPending);
  cleanPendingRef.current = cleanPending;

  const saveAll = useCallback(async () => {
    const changes = Object.entries(cleanPendingRef.current).map(
      ([rule_key, waarde]) => ({ rule_key, waarde }),
    );
    if (changes.length === 0) return;
    setSaveError(null);
    const res = await updatePricingRulesBatch(changes);
    if (res.ok) {
      setPending({});
      setSavedFlash(true);
      router.refresh();
    } else {
      setSaveError(res.error);
    }
  }, [router]);

  // Registreer de save-handle bij de parent (en deregistreer bij unmount). De
  // batch draait binnen de transition van de globale Opslaan-knop
  // (InstellingenClient), dus PrijzenPanel heeft geen eigen useTransition meer.
  useEffect(() => {
    onRegisterSave?.(saveAll);
    return () => onRegisterSave?.(null);
  }, [onRegisterSave, saveAll]);

  return (
    <div className={styles.wrap}>
      {(hasPending || saveError || savedFlash) && (
        <div className={styles.headerActions}>
          {hasPending && (
            <span className={styles.pendingCount}>
              {pendingCount} wijziging{pendingCount === 1 ? "" : "en"} niet
              opgeslagen
            </span>
          )}
          {saveError && (
            <span className={styles.saveError}>
              <AlertCircle size={12} /> {saveError}
            </span>
          )}
          {savedFlash && !hasPending && (
            <span className={styles.savedFlash}>
              <Check size={12} strokeWidth={2.5} /> Opgeslagen
            </span>
          )}
        </div>
      )}

      {visibleTabs.length > 1 && (
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Prijscategorieen"
        >
          {visibleTabs.map((tab) => {
            const inThisTab = grouped[tab.key];
            const pendingHere = inThisTab.filter(
              (r) => cleanPending[r.rule_key] !== undefined,
            ).length;
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                <span className={styles.tabCount}>{inThisTab.length}</span>
                {pendingHere > 0 && !isActive && (
                  <span
                    className={styles.tabDot}
                    aria-label={`${pendingHere} wijziging${pendingHere === 1 ? "" : "en"}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.pricingList}>
        {visibleRules.map((rule) => {
          const pendingValue = cleanPending[rule.rule_key];
          const isChanged = pendingValue !== undefined;
          const displayedValue = isChanged ? pendingValue : rule.waarde;
          const pct =
            isChanged && rule.waarde > 0
              ? ((pendingValue - rule.waarde) / rule.waarde) * 100
              : 0;
          return (
            <div key={rule.rule_key} className={styles.row}>
              <div className={styles.rowLabel}>
                <div className={styles.label}>{rule.label}</div>
              </div>
              <div className={styles.rowEditor}>
                <RuleInput
                  ruleKey={rule.rule_key}
                  originalValue={rule.waarde}
                  currentValue={displayedValue}
                  eenheid={rule.eenheid}
                  isChanged={isChanged}
                  onSetPending={handleSetPending}
                  onClearPending={handleClearPending}
                />
                {isChanged && (
                  <span className={pct >= 0 ? styles.pctPillUp : styles.pctPillDown}>
                    {pct >= 0 ? "+" : ""}
                    {pct.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {rules.length === 0 && (
          <div className={styles.empty}>Geen prijsregels gevonden.</div>
        )}
        {rules.length > 0 && visibleRules.length === 0 && (
          <div className={styles.empty}>Geen regels in deze categorie.</div>
        )}
      </div>

      {hasPending && (
        <ImpactBar
          revenueDelta={revenueDelta}
          baselineRevenue={safeBaseline.baselineRevenue}
          newRevenue={newRevenue}
          baselineConversion={safeBaseline.baselineConversion}
          leadCount={safeBaseline.leadCount}
          periodStart={safeBaseline.periodStart}
        />
      )}
    </div>
  );
}

/* ── Per-rule input (controlled, live pending) ──────────────────────── */

function RuleInput({
  ruleKey,
  originalValue,
  currentValue,
  eenheid,
  isChanged,
  onSetPending,
  onClearPending,
}: {
  ruleKey: string;
  originalValue: number;
  currentValue: number;
  eenheid: string | null;
  isChanged: boolean;
  onSetPending: (key: string, value: number) => void;
  onClearPending: (key: string) => void;
}) {
  const [text, setText] = useState<string>(formatValue(currentValue));
  const [invalid, setInvalid] = useState(false);
  // Tijdens actief typen onderdrukken we het sync-effect, anders wordt een
  // tussenstap als "4," meteen teruggeformatteerd naar "4".
  const userTyping = useRef(false);

  // Sync extern (bv. na succesvolle save-reset of Escape). Alleen wanneer de
  // gebruiker niet actief in het veld zit te typen.
  useEffect(() => {
    if (userTyping.current) return;
    setText(formatValue(currentValue));
  }, [currentValue]);

  const handleBlur = () => {
    userTyping.current = false;
    const parsed = parseValue(text);
    if (parsed === null) {
      setInvalid(true);
      setText(formatValue(currentValue));
      return;
    }
    setInvalid(false);
    if (Math.abs(parsed - originalValue) < 1e-9) {
      setText(formatValue(originalValue));
    } else {
      setText(formatValue(parsed));
    }
  };

  const handleChange = (next: string) => {
    userTyping.current = true;
    setText(next);
    if (invalid) setInvalid(false);
    // Live update: parse direct en propageer naar de parent zodat de sticky
    // impact-bar tijdens het typen meebeweegt. Bij ongeldige input laten we
    // de laatste geldige pending-waarde staan.
    const parsed = parseValue(next);
    if (parsed === null) return;
    if (Math.abs(parsed - originalValue) < 1e-9) {
      onClearPending(ruleKey);
    } else {
      onSetPending(ruleKey, parsed);
    }
  };

  const wrapClass = `${styles.inputWrap} ${isChanged ? styles.inputWrapChanged : ""} ${invalid ? styles.inputWrapInvalid : ""}`;

  return (
    <div className={wrapClass}>
      <input
        type="text"
        inputMode="decimal"
        className={styles.input}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            userTyping.current = false;
            setText(formatValue(originalValue));
            onClearPending(ruleKey);
            setInvalid(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={`Waarde voor ${ruleKey}`}
      />
      {eenheid && <span className={styles.eenheid}>{eenheid}</span>}
    </div>
  );
}

/* ── Sticky omzet-effect-balk ───────────────────────────────────────── */

function ImpactBar({
  revenueDelta,
  baselineRevenue,
  newRevenue,
  baselineConversion,
  leadCount,
  periodStart,
}: {
  revenueDelta: number;
  baselineRevenue: number;
  newRevenue: number;
  baselineConversion: number;
  leadCount: number;
  periodStart: string | null;
}) {
  const periodLabel = formatPeriod(periodStart);
  const isUp = revenueDelta > 0;
  const isDown = revenueDelta < 0;

  // Heuristiek "Beste actie", puur op basis van %-verandering t.o.v. de omzet.
  const pctOfRevenue =
    baselineRevenue > 0 ? (revenueDelta / baselineRevenue) * 100 : 0;
  const absPct = Math.abs(pctOfRevenue);
  const bestActie =
    absPct < 1.5
      ? { label: "Marginaal", sub: "Kleine impact verwacht" }
      : absPct < 5
        ? { label: "Substantieel", sub: "Merkbare impact op omzet" }
        : { label: "Aanzienlijk", sub: "Grote impact, overweeg testen" };

  return (
    <div className={styles.impactBar}>
      <div className={styles.impactHeader}>
        <div className={styles.impactHeaderIcon}>
          <Sparkles size={16} />
        </div>
        <div>
          <div className={styles.impactTitle}>Wat-als simulator</div>
          <div className={styles.impactSub}>
            Op basis van je laatste{" "}
            <strong>
              {leadCount} {leadCount === 1 ? "lead" : "leads"}
            </strong>{" "}
            {periodLabel && <span>({periodLabel})</span>}
          </div>
        </div>
      </div>

      <div className={styles.impactGrid}>
        <ImpactTile
          label={`Omzet-effect (${leadCount} leads)`}
          value={
            <span
              className={isUp ? styles.valueUp : isDown ? styles.valueDown : ""}
            >
              {isUp ? "+" : isDown ? "min " : ""}€{" "}
              {Math.abs(revenueDelta).toLocaleString("nl-NL", {
                maximumFractionDigits: 0,
              })}
            </span>
          }
          sub={
            <>
              van €
              {baselineRevenue.toLocaleString("nl-NL", {
                maximumFractionDigits: 0,
              })}{" "}
              naar €
              {newRevenue.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
            </>
          }
          icon={
            isUp ? (
              <TrendingUp size={12} />
            ) : isDown ? (
              <TrendingDown size={12} />
            ) : null
          }
        />
        <ImpactTile
          label="Geschatte conversie"
          value={`${Math.round(baselineConversion * 100)}%`}
          sub={`huidige conversie op deze ${leadCount} leads`}
        />
        <ImpactTile label="Beste actie" value={bestActie.label} sub={bestActie.sub} />
      </div>
    </div>
  );
}

function ImpactTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>{label}</div>
      <div className={styles.tileValue}>
        {icon && <span className={styles.tileIcon}>{icon}</span>}
        {value}
      </div>
      <div className={styles.tileSub}>{sub}</div>
    </div>
  );
}

/* ── Helpers (nl-formaat, geport uit v1) ────────────────────────────── */

function parseValue(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatValue(n: number): string {
  return n.toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatPeriod(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const start = d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  return `${start} tot nu`;
}
