'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { BGPattern } from '@/components/ui/bg-pattern'
import LeadDemo from '@/components/sections/LeadDemo'
import ProjectModal from '@/components/ui/ProjectModal'
import styles from './Hero.module.css'

export default function Hero() {
  const [phone, setPhone] = useState('')
  const [projectModalOpen, setProjectModalOpen] = useState(false)

  return (
    <section className={styles.hero}>
      <BGPattern variant="grid" mask="fade-edges" fill="rgba(37,99,235,0.15)" size={32} />
      <div className={styles.inner}>
        {/* Text content */}
        <div className={styles.content}>
          <div className={styles.badge}>
            <Badge variant="default" dot>
              Automatische leadopvolging via WhatsApp
            </Badge>
          </div>

          <h1 className={styles.heading}>
            Jij bent aan het werk.
            <br />
            <span className={styles.headingBlue}>Jouw leads worden al opgevolgd.</span>
          </h1>

          <p className={styles.subtext}>
            Binnen 60 seconden reageert ons systeem op elke nieuwe lead via
            WhatsApp, persoonlijk, automatisch en met een kant-en-klare offerte.
          </p>

          <div className={styles.ctas}>
            <Button variant="primary" size="lg" onClick={() => setProjectModalOpen(true)}>
              → Plan een gratis kennismakingsgesprek
            </Button>

            <div className={styles.whatsappBlock}>
            <p className={styles.whatsappLabel}>→ Ontvang de demo op WhatsApp</p>
            <form
              className={styles.phoneForm}
              onSubmit={(e) => {
                e.preventDefault()
                if (phone.trim()) {
                  window.open(
                    `https://wa.me/31612345678?text=${encodeURIComponent(
                      `Demo aanvraag: ${phone}`
                    )}`,
                    '_blank'
                  )
                }
              }}
            >
              <input
                type="tel"
                className={styles.phoneInput}
                placeholder="Vul je nummer in"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button type="submit" className={styles.phoneButton}>
                Ontvang demo
              </button>
            </form>
            </div>
          </div>

          <div className={styles.proofBar}>
            <span className={styles.proofItem}><span className={styles.check}>✓</span> Op maat gebouwd</span>
            <span className={styles.proofItem}><span className={styles.check}>✓</span> Free trial</span>
          </div>
        </div>

        {/* Lead kwalificatie demo */}
        <div className={styles.demoWrapper}>
          <LeadDemo />
        </div>
      </div>
      <ProjectModal isOpen={projectModalOpen} onClose={() => setProjectModalOpen(false)} />
    </section>
  )
}
