import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import styles from './Hero.module.css'

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        {/* Text content */}
        <div className={styles.content}>
          <div className={styles.badge}>
            <Badge variant="default" dot>
              AI-gedreven leadkwalificatie
            </Badge>
          </div>

          <h1 className={styles.heading}>
            Meer leads sluiten,{' '}
            <span className={styles.headingGreen}>zonder extra</span>
            <br />
            <span className={styles.headingGreen}>moeite.</span>
          </h1>

          <p className={styles.subtext}>
            Frontlix kwalificeert jouw leads automatisch via WhatsApp AI — van
            eerste contact tot ondertekende offerte, volledig op autopiloot.
          </p>

          <div className={styles.ctas}>
            <Button href="/contact" variant="primary" size="lg">
              Bekijk de demo
            </Button>
            <Button href="/contact" variant="secondary" size="lg">
              Plan een gesprek
            </Button>
          </div>

          <p className={styles.socialProof}>
            Vertrouwd door <strong>50+ bedrijven</strong> · Gemiddeld{' '}
            <strong>+127% meer conversie</strong>
          </p>
        </div>

        {/* WhatsApp dashboard mockup */}
        <div className={styles.mockupWrapper}>
          <div className={styles.browserWindow}>
            {/* Browser bar */}
            <div className={styles.browserBar}>
              <span className={`${styles.dot} ${styles.dotRed}`} />
              <span className={`${styles.dot} ${styles.dotYellow}`} />
              <span className={`${styles.dot} ${styles.dotGreen}`} />
              <span className={styles.browserUrl}>app.frontlix.nl/dashboard</span>
              <span className={styles.liveTag}>● LIVE</span>
            </div>

            {/* Dashboard body */}
            <div className={styles.dashBody}>
              {/* Left panel: pipeline */}
              <div className={styles.leftPanel}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelTitle}>Automatisering pipeline</span>
                  <span className={styles.statusActive}>Actief</span>
                </div>

                <div className={styles.statsRow}>
                  <div className={styles.statBox}>
                    <span className={styles.statNum}>24</span>
                    <span className={styles.statLabel}>Leads vandaag</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statNum}>60%</span>
                    <span className={styles.statLabel}>Gekwalificeerd</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statNum}>&lt;10s</span>
                    <span className={styles.statLabel}>Reactietijd</span>
                  </div>
                </div>

                <div className={styles.pipelineList}>
                  <div className={styles.pipelineItem}>
                    <span className={styles.pipelineDot} style={{ background: '#39D353' }} />
                    <span className={styles.pipelineText}>Lead binnenkomst via website</span>
                    <span className={styles.pipelineBadge}>✓</span>
                  </div>
                  <div className={styles.pipelineItem}>
                    <span className={styles.pipelineDot} style={{ background: '#39D353' }} />
                    <span className={styles.pipelineText}>WhatsApp AI-bericht verstuurd</span>
                    <span className={styles.pipelineBadge}>✓</span>
                  </div>
                  <div className={styles.pipelineItem}>
                    <span className={styles.pipelineDot} style={{ background: '#39D353' }} />
                    <span className={styles.pipelineText}>Kwalificatie voltooid</span>
                    <span className={styles.pipelineBadge}>✓</span>
                  </div>
                  <div className={styles.pipelineItem}>
                    <span className={styles.pipelineDot} style={{ background: '#F59E0B' }} />
                    <span className={styles.pipelineText}>Offerte automatisch aangemaakt</span>
                    <span className={styles.pipelineBadgeWaiting}>...</span>
                  </div>
                </div>
              </div>

              {/* Right panel: WhatsApp */}
              <div className={styles.rightPanel}>
                <div className={styles.waHeader}>
                  <div className={styles.waAvatar}>A</div>
                  <div className={styles.waContact}>
                    <span className={styles.waName}>Afraz Giaan</span>
                    <span className={styles.waStatus}>Online</span>
                  </div>
                </div>
                <div className={styles.waMessages}>
                  <div className={styles.waMsg}>
                    Hallo, ik ben geïnteresseerd in jullie diensten. Kan ik meer informatie krijgen?
                  </div>
                  <div className={`${styles.waMsg} ${styles.waMsgBot}`}>
                    Hoi Afraz! Super dat je contact opneemt 👋 Ik ben de digitale assistent van Frontlix. Waarvoor kan ik je helpen?
                  </div>
                  <div className={styles.waMsg}>
                    Ik zoek een nieuwe website voor mijn bedrijf.
                  </div>
                  <div className={`${styles.waMsg} ${styles.waMsgBot}`}>
                    Top! Om je een passend voorstel te sturen — wat is je budget en wanneer wil je live gaan?
                  </div>
                </div>
                <div className={styles.waInput}>
                  <span className={styles.waInputText}>Typ een bericht…</span>
                  <span className={styles.waSend}>➤</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
