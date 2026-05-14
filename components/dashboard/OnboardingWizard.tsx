'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, X, Check, Sparkles, Building2, Euro, MessageCircle, Bot, FlaskConical, PartyPopper } from 'lucide-react'
import { completeOnboardingAction } from '@/lib/dashboard/onboarding-actions'
import styles from './OnboardingWizard.module.css'

const STEPS = [
  { Icon: Sparkles,    title: 'Welkom bij Frontlix', body: 'In een paar minuten leid ik je rond. Geen lange formulieren — je kunt alles later nog aanpassen.' },
  { Icon: Building2,   title: 'Bedrijfsgegevens',    body: 'Vul je bedrijfsnaam en adres in. Surface gebruikt deze om offertes en mailtjes te ondertekenen.' },
  { Icon: Euro,        title: 'Diensten + prijzen',  body: 'Welke diensten verkoop je? Stel je tarieven per m² of per uur in. Surface gebruikt deze om automatische offertes te maken.' },
  { Icon: MessageCircle, title: 'WhatsApp-koppeling', body: 'Koppel je WhatsApp-nummer aan Surface. Klanten chatten direct met de bot — jij krijgt elk gesprek terug in de inbox.' },
  { Icon: Bot,         title: 'Bot-persona',          body: 'Bepaal toon en taalgebruik. Vriendelijk-formeel, los, of strak-zakelijk. Je kunt dit later nog tweaken.' },
  { Icon: FlaskConical, title: 'Stuur een test-lead', body: 'Stuur jezelf een proef-aanvraag via WhatsApp. Je ziet realtime hoe Surface vragen stelt en een offerte uitwerkt.' },
  { Icon: PartyPopper, title: 'Klaar!',              body: 'Je dashboard staat live. Eerste lead binnen? Klik op "Inbox" om mee te lezen — Surface neemt het over.' },
]

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [pending, startTransition] = useTransition()
  const total = STEPS.length
  const current = STEPS[step]

  const finish = () => {
    startTransition(async () => {
      await completeOnboardingAction()
      router.refresh()
    })
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <button type="button" onClick={finish} className={styles.skipBtn} aria-label="Sla over">
          <X size={16} /> Sla over
        </button>

        <div className={styles.progress}>
          <div className={styles.progressFill} style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <div className={styles.stepCounter}>
          Stap {step + 1} van {total}
        </div>

        <div className={styles.icon}>
          <current.Icon size={28} />
        </div>
        <h2 className={styles.title}>{current.title}</h2>
        <p className={styles.body}>{current.body}</p>

        <div className={styles.actions}>
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className={styles.btnSecondary}>
              <ChevronLeft size={14} /> Vorige
            </button>
          ) : <span />}

          {step < total - 1 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className={styles.btnPrimary}>
              Volgende <ChevronRight size={14} />
            </button>
          ) : (
            <button type="button" onClick={finish} disabled={pending} className={styles.btnPrimary}>
              <Check size={14} /> {pending ? 'Bezig…' : 'Start met Frontlix'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
