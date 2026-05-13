import { Star, MessageSquare, TrendingUp, Send } from 'lucide-react'
import { Pill } from '@/components/dashboard/ui/Pill'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

/**
 * Reviews — V1 placeholder. NPS-tabel + review-flow komt in een opvolg-
 * fase wanneer de schoon-straatje DB review-data verzamelt. Voor nu een
 * mooi geframede "binnenkort"-pagina zodat de Sidebar-link werkt en de
 * klant de visie ziet.
 */
export default function ReviewsPage() {
  return (
    <>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Reviews</div>
          <div className="dash-section-sub">
            Klanttevredenheid & NPS-tracking
          </div>
        </div>
      </div>

      {/* KPI-grid met placeholders */}
      <div className="dash-kpi-grid" style={{ marginBottom: 20 }}>
        <KpiPlaceholder label="NPS score" suffix="" />
        <KpiPlaceholder label="Gemiddelde score" suffix="/10" />
        <KpiPlaceholder label="Response-rate" suffix="%" />
        <KpiPlaceholder label="Open verzoeken" suffix="" />
      </div>

      {/* Hero — uitleg + CTA */}
      <div className={`dash-card ${styles.heroCard}`}>
        <div className={styles.heroIcon}>
          <Star size={28} />
        </div>
        <h2 className={styles.heroTitle}>Reviews komen binnenkort</h2>
        <p className={styles.heroBody}>
          Surface stuurt na elke afgeronde klus automatisch een korte
          review-vraag via WhatsApp. Je ziet hier straks de scores per
          dienst, kunt opvolgen op lage scores en exporteren naar Google
          Business Profile.
        </p>
        <div className={styles.heroPills}>
          <Pill tone="blue" dot>
            <Send size={11} style={{ marginRight: 2 }} />
            Automatische verzending
          </Pill>
          <Pill tone="green" dot>
            <TrendingUp size={11} style={{ marginRight: 2 }} />
            NPS-tracking
          </Pill>
          <Pill tone="amber" dot>
            <MessageSquare size={11} style={{ marginRight: 2 }} />
            Opvolg-flows
          </Pill>
        </div>
      </div>

      {/* Roadmap-cards */}
      <div className={styles.roadmap}>
        <RoadmapCard
          phase="Fase 1"
          title="Auto-vraag na klus"
          status="In ontwikkeling"
          statusTone="blue"
          desc="Surface stuurt 24u na afronding een 'wat vond je ervan?'-bericht met 1-10 score-keuze."
        />
        <RoadmapCard
          phase="Fase 2"
          title="Score-dashboard"
          status="Q3 2026"
          statusTone="gray"
          desc="Per-dienst NPS, trends over tijd, vergelijking met sector-benchmark."
        />
        <RoadmapCard
          phase="Fase 3"
          title="Auto-publicatie"
          status="Q4 2026"
          statusTone="gray"
          desc="Hoge scores worden met klant-toestemming doorgezet naar Google Business Profile."
        />
      </div>
    </>
  )
}

function KpiPlaceholder({ label, suffix }: { label: string; suffix: string }) {
  return (
    <div className="dash-kpi">
      <div className="dash-kpi-label">{label}</div>
      <div className="dash-kpi-value" style={{ color: 'var(--fg-muted)' }}>
        <span className="dash-tabular">—</span>
        {suffix && <span className="unit">{suffix}</span>}
      </div>
      <div className="dash-kpi-foot">
        <span style={{ fontStyle: 'italic' }}>nog geen data</span>
      </div>
    </div>
  )
}

function RoadmapCard({
  phase,
  title,
  status,
  statusTone,
  desc,
}: {
  phase: string
  title: string
  status: string
  statusTone: 'blue' | 'green' | 'amber' | 'gray'
  desc: string
}) {
  return (
    <div className={`dash-card ${styles.roadmapCard}`}>
      <div className={styles.roadmapHead}>
        <div className={styles.roadmapPhase}>{phase}</div>
        <Pill tone={statusTone}>{status}</Pill>
      </div>
      <div className={styles.roadmapTitle}>{title}</div>
      <p className={styles.roadmapDesc}>{desc}</p>
    </div>
  )
}
