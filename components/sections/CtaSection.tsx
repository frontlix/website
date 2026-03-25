'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import ProjectModal from '@/components/ui/ProjectModal'
import styles from './CtaSection.module.css'

export default function CtaSection() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>
          Jij verdient een digitale aanwezigheid die past bij jouw ambities
        </h2>
        <p className={styles.subtext}>
          Je stelt jezelf al de juiste vragen. Nu is het tijd om ze samen te
          beantwoorden.
        </p>
        <Button variant="primary" size="lg" onClick={() => setModalOpen(true)}>
          Plan een gratis gesprek →
        </Button>
        <p className={styles.disclaimer}>
          Geen verplichtingen — alleen een eerlijk gesprek over jouw doelen
        </p>
      </div>
      <ProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  )
}
